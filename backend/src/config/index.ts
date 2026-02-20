import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.BACKEND_PORT || '52001', 10),

  database: {
    host: process.env.DATABASE_HOST || 'db',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    name: process.env.DATABASE_NAME || 'llamaudit',
    user: process.env.DATABASE_USER || 'llamaudit',
    password: process.env.DATABASE_PASSWORD || 'llamaudit_secret',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:52000').split(','),
  },

  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    apiUrl: process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1',
    chatModels: (process.env.OPENROUTER_CHAT_MODELS || 'qwen/qwen3-8b').split(',').map(m => m.trim()),
  },

  ollama: {
    endpoint: process.env.OLLAMA_ENDPOINT || 'http://host.docker.internal:11434',
    models: (process.env.OLLAMA_MODELS || '').split(',').map(m => m.trim()).filter(Boolean),
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:52000',
};
