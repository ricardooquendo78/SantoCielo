import app from './api/index.ts';
import { createServer as createViteServer } from 'vite';

const PORT = process.env.PORT || 3000;

async function startLocalServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  app.use(vite.middlewares);

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Local development server running on http://localhost:${PORT}`);
  });
}

startLocalServer().catch(err => {
  console.error('Failed to start local server:', err);
});
