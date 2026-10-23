import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  analyzeJobController,
  getHistoryController,
  clearHistoryController,
  getHealthController,
} from './src/server/controllers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(cors());
  app.use(express.json());

  // API Routes (Mounted under /api and root aliases for backwards compatibility)
  app.post('/api/analyze', analyzeJobController);
  app.post('/analyze', analyzeJobController);

  app.get('/api/history', getHistoryController);
  app.get('/history', getHistoryController);
  app.delete('/api/history', clearHistoryController);

  app.get('/api/health', getHealthController);

  // Vite middleware in development vs static serving in production
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JobSentry] Full-Stack server running at http://0.0.0.0:${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[JobSentry] Failed to start server:', err);
  process.exit(1);
});
