import { GoogleGenerativeAI } from '@google/generative-ai';
import { openRouterService } from './openRouterService.js';
import { apiKeyValidator } from '../utils/apiKeyValidator.js';

const assistantSystemMessage =
  "You are a helpful Gemini-style assistant. Answer conversationally and helpfully. " +
  "When the user asks for Python code, provide only the code inside a fenced code block. " +
  "Do not include extra comments or explanatory text inside the code block itself. " +
  "You may include a brief sample input/output block after the code block, but the copied code should contain only the raw code.";

let genAI = null;
let chatSession = null;

/**
 * Initialize the AI service based on available API keys
 */
const initializeAI = () => {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('No API key found. Set OPENROUTER_API_KEY or GEMINI_API_KEY in .env');
  }

  const isOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const isValidKey = apiKeyValidator.validate(apiKey, isOpenRouter);

  if (!isValidKey) {
    throw new Error('Invalid API key format');
  }

  if (isOpenRouter) {
    return 'openrouter';
  } else {
    genAI = new GoogleGenerativeAI(apiKey);
    return 'gemini';
  }
};

export const chatService = {
  /**
   * Generate a response to a user message
   */
  generateResponse: async (userMessage, conversationHistory = []) => {
    try {
      const provider = initializeAI();

      if (provider === 'openrouter') {
        return await openRouterService.sendMessage(userMessage, conversationHistory);
      } else {
        // Use Gemini
        if (!chatSession) {
          const model = genAI.getGenerativeModel({
            model: 'gemini-pro',
            systemInstruction: assistantSystemMessage,
          });
          chatSession = model.startChat({
            history: conversationHistory.map((msg) => ({
              role: msg.sender === 'user' ? 'user' : 'model',
              parts: [{ text: msg.text }],
            })),
          });
        }

        const result = await chatSession.sendMessage(userMessage);
        return result.response.text();
      }
    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  },

  /**
   * Stream a response (for real-time updates)
   */
  streamResponse: async (userMessage, conversationHistory = [], res) => {
    try {
      const provider = initializeAI();

      if (provider === 'openrouter') {
        await openRouterService.streamMessage(userMessage, conversationHistory, res);
      } else {
        // Stream with Gemini
        if (!chatSession) {
          const model = genAI.getGenerativeModel({
            model: 'gemini-pro',
            systemInstruction: assistantSystemMessage,
          });
          chatSession = model.startChat({
            history: conversationHistory.map((msg) => ({
              role: msg.sender === 'user' ? 'user' : 'model',
              parts: [{ text: msg.text }],
            })),
          });
        }

        const result = await chatSession.sendMessageStream(userMessage);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
      }
    } catch (error) {
      console.error('Error streaming response:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  },

  /**
   * Reset the chat session (for starting a new conversation)
   */
  resetSession: () => {
    chatSession = null;
  },
};
