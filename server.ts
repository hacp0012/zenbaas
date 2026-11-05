/**
 * Fastify Server Entry Point for ZenBaaS
 * Mounts API routes at /api and integrates Vite SPA middlewares on Port 3000
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import middie from '@fastify/middie';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { apiRoutes } from './src/server/routes';

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const fastify = Fastify({
    logger: false,
    disableRequestLogging: true,
  });

  // Enable CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // Enable Connect/Express middleware support via middie
  await fastify.register(middie);

  // Register all BaaS API routes under /api
  await fastify.register(apiRoutes, { prefix: '/api' });

  // In development, mount Vite dev server with SPA fallback
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    // Forward non-API requests to Vite middlewares
    fastify.use((req, res, next) => {
      if (req.url && req.url.startsWith('/api')) {
        return next();
      }
      vite.middlewares(req, res, next);
    });
  } else {
    // In production, serve static assets from dist
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      fastify.setNotFoundHandler(async (req, reply) => {
        if (req.raw.url && req.raw.url.startsWith('/api')) {
          return reply.status(404).send({ error: 'Endpoint API introuvable' });
        }
        const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
        return reply.type('text/html').send(indexHtml);
      });
    }
  }

  try {
    const address = await fastify.listen({ port: PORT, host: HOST });
    console.log(`[Fastify ZenBaaS] Server listening on ${address}`);
    console.log(`[SQLite Database] Initialized and connected with WAL mode`);
    console.log(`[REST Engine] Public endpoint active at /api/v1/:appSlug/:collectionName`);
  } catch (err) {
    console.error('[Fastify ZenBaaS] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
