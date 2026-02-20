import express from 'express';
import cors from 'cors';
import { config } from './config';
import { initDatabase } from './config/database';
import routes from './routes';

const app = express();

// Middleware
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'LLaMa Audit API',
    version: '1.0.0',
    description: 'AI text detection analysis API',
  });
});

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await initDatabase();

    app.listen(config.port, '0.0.0.0', () => {
      console.log(`LLaMa Audit API running on port ${config.port}`);
      if (config.openRouter.apiKey) {
        console.log('OpenRouter API configured');
      } else {
        console.log('No OpenRouter API key in env - configure via settings');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

export { app };

if (process.env.NODE_ENV !== 'test') {
  start();
}
