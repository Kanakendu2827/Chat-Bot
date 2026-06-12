import express from 'express';
import { chatController } from '../controllers/chatController.js';

const router = express.Router();

// POST /api/chat/message - Send a message and get a response
router.post('/message', chatController.sendMessage);

// POST /api/chat/stream - Stream a response (for real-time chat)
router.post('/stream', chatController.streamMessage);

export default router;
