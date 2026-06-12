import { chatService } from '../services/chatService.js';

export const chatController = {
  /**
   * Send a single message and get a response
   */
  sendMessage: async (req, res, next) => {
    try {
      const { message, conversationHistory } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required and must be a string' });
      }

      const response = await chatService.generateResponse(message, conversationHistory || []);

      res.json({
        success: true,
        message: message,
        response: response,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Stream a response for real-time chat
   */
  streamMessage: async (req, res, next) => {
    try {
      const { message, conversationHistory } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required and must be a string' });
      }

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      await chatService.streamResponse(message, conversationHistory || [], res);
    } catch (error) {
      next(error);
    }
  },
};
