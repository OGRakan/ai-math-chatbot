import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsMiddleware } from './middleware/cors';
import { rateLimiter } from './middleware/rate-limiter';
import { ErrorHandlerMiddleware, notFoundHandler } from './middleware/error';
import settings from './env';

// Import routes
import chatRouter from './routes/chat';
import uploadRouter from './routes/upload';
import speechRouter from './routes/speech';
import streamingRouter from './routes/streaming';

// Set up logging
console.log('AI Math Chatbot Node.js Server');
console.log('Checking database connection...');

const app = express();

// Basic security and logging middleware
app.use(helmet());
app.use(morgan('combined'));

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting middleware
app.use(rateLimiter);

// CORS middleware
app.use(corsMiddleware);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the AI Math Chatbot API',
  });
});

// Mount routers
app.use('/chats', chatRouter);
app.use('/chats', streamingRouter); // Mount streaming routes under /chats
app.use('/files', uploadRouter);
app.use('', speechRouter); // Mount /stt directly

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(ErrorHandlerMiddleware.handler());

const PORT = settings.port;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at: http://localhost:${PORT}`);
  console.log(`CORS origins: ${settings.allowedOrigins}`);
});

export default app;