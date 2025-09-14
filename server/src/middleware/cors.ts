import cors from 'cors';
import settings from '../env';

const allowedOrigins = settings.allowedOrigins === '*' 
  ? [] 
  : settings.allowedOrigins.split(',').map(origin => origin.trim());

export const corsMiddleware = cors({
  origin: settings.allowedOrigins === '*' ? true : allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
});

console.log(`CORS allowed origins: ${settings.allowedOrigins}`);