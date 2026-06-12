# Backend Structure Documentation

## Directory Layout

```
server.js                          # Main entry point
server/
├── routes/
│   └── chat.js                   # Chat API routes
├── controllers/
│   └── chatController.js         # Request handlers and business logic
├── services/
│   ├── chatService.js            # Core chat service with Gemini integration
│   └── openRouterService.js      # OpenRouter API integration
├── middleware/
│   ├── errorHandler.js           # Global error handling
│   └── requestLogger.js          # Request logging
└── utils/
    └── apiKeyValidator.js        # API key validation utilities
```

## Architecture Overview

### Separation of Concerns

1. **server.js** - Application entry point
   - Express app setup
   - Middleware configuration
   - Route registration
   - Server startup

2. **Routes** (`server/routes/chat.js`)
   - Define API endpoints
   - Map HTTP methods to controllers
   - Handle route-specific validation

3. **Controllers** (`server/controllers/chatController.js`)
   - Handle HTTP request/response logic
   - Validate request data
   - Call services and return responses

4. **Services** (`server/services/`)
   - Core business logic
   - API integrations (Gemini, OpenRouter)
   - Chat session management
   - Data transformations

5. **Middleware** (`server/middleware/`)
   - Cross-cutting concerns
   - Error handling
   - Request logging
   - CORS configuration

6. **Utils** (`server/utils/`)
   - Helper functions
   - Validators
   - Shared utilities

## API Endpoints

### POST `/api/chat/message`
Send a single message and receive a response.

**Request Body:**
```json
{
  "message": "Hello, how are you?",
  "conversationHistory": [
    { "sender": "user", "text": "Hi" },
    { "sender": "bot", "text": "Hello!" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Hello, how are you?",
  "response": "I'm doing great, thanks for asking!",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### POST `/api/chat/stream`
Stream a response in real-time using Server-Sent Events (SSE).

**Request Body:**
```json
{
  "message": "Tell me a story",
  "conversationHistory": []
}
```

**Response:** SSE stream with chunks
```
data: {"chunk": "Once "}
data: {"chunk": "upon "}
data: {"chunk": "a "}
data: [DONE]
```

### GET `/api/health`
Check server health status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Environment Variables

```bash
# Server Configuration
PORT=3001                          # Server port (default: 3001)
NODE_ENV=development              # Environment (development/production)

# API Keys (choose one)
GEMINI_API_KEY=your_key           # Google Gemini API key
OPENROUTER_API_KEY=sk-or-xxx      # OpenRouter API key
```

## Running the Backend

### Development (Frontend + Backend)
```bash
npm install                 # Install dependencies
npm run dev:all            # Run frontend and backend concurrently
```

### Backend Only
```bash
npm run dev:backend        # Run backend server on port 3001
```

### Production
```bash
npm run build              # Build React app
npm start                  # Start server (serves built React app)
```

## Key Features

### Error Handling
- Global error handler middleware catches all errors
- Structured error responses with status codes
- Request logging for debugging
- Environment-aware error messages

### API Key Management
- Support for both Gemini and OpenRouter APIs
- Automatic API key validation
- Prevents using OAuth tokens or service account keys
- Fallback to environment-based configuration

### Session Management
- Maintains chat session state
- Supports conversation history
- Session reset capability for new conversations

### Streaming Support
- Real-time response streaming via SSE
- Chunk-based message delivery
- Proper error handling during streams

## Frontend Integration

Update your frontend to call the backend endpoints:

```javascript
// Instead of calling Gemini directly:
const response = await fetch('/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userInput,
    conversationHistory: messages
  })
});

const data = await response.json();
const botResponse = data.response;
```

## Security Considerations

1. **API Keys**: Kept on backend, never exposed to frontend
2. **CORS**: Configured to allow frontend communication
3. **Input Validation**: All inputs validated before processing
4. **Error Messages**: Production errors don't expose sensitive info
5. **HTTPS**: Use HTTPS in production

## Future Enhancements

- [ ] Database for message persistence
- [ ] User authentication
- [ ] Rate limiting
- [ ] Request caching
- [ ] Conversation history storage
- [ ] Admin dashboard
- [ ] Analytics and logging
