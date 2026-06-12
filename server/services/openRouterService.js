import fetch from 'node-fetch';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const openRouterService = {
  /**
   * Send a message to OpenRouter API
   */
  sendMessage: async (userMessage, conversationHistory = []) => {
    try {
      const apiKey = process.env.OPENROUTER_API_KEY;

      if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY not set');
      }

      const messages = [
        ...conversationHistory.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
        })),
        { role: 'user', content: userMessage },
      ];

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3001',
          'X-Title': 'Chat Bot',
        },
        body: JSON.stringify({
          model: 'openrouter/auto',
          messages: messages,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenRouter:', error);
      throw error;
    }
  },

  /**
   * Stream a response from OpenRouter API
   */
  streamMessage: async (userMessage, conversationHistory = [], res) => {
    try {
      const apiKey = process.env.OPENROUTER_API_KEY;

      if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY not set');
      }

      const messages = [
        ...conversationHistory.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
        })),
        { role: 'user', content: userMessage },
      ];

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3001',
          'X-Title': 'Chat Bot',
        },
        body: JSON.stringify({
          model: 'openrouter/auto',
          messages: messages,
          temperature: 0.7,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      for await (const line of response.body) {
        const text = line.toString();
        if (text.startsWith('data: ')) {
          const data = JSON.parse(text.slice(6));
          if (data.choices[0].delta.content) {
            res.write(`data: ${JSON.stringify({ chunk: data.choices[0].delta.content })}\n\n`);
          }
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error('Error streaming from OpenRouter:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  },
};
