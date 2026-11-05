/**
 * Fastify API Route Definitions for ZenBaaS
 * Admin supervision, Developer workspaces, Collections & Documents, and Public REST BaaS Engine
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  initDatabase,
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getAllApps,
  getAppById,
  getAppBySlug,
  createApp,
  updateApp,
  toggleAppStatus,
  deleteApp,
  regenerateAppKeys,
  getCollections,
  getCollectionById,
  getCollectionByName,
  createCollection,
  deleteCollection,
  getDocuments,
  getDocumentById,
  createDocument,
  deleteDocument,
  getLogs,
  createLog,
  getGlobalStats,
} from './db';
import { UserRole } from '../types/baas';

export const apiRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Ensure tables and seed data exist
  initDatabase();

  // -------------------------------------------------------------
  // HEALTH & ENGINE SPECS
  // -------------------------------------------------------------
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      engine: 'Fastify v5.12.8',
      database: 'SQLite 3 (better-sqlite3 WAL mode)',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  });

  fastify.get('/engine/stats', async () => {
    return getGlobalStats();
  });

  // -------------------------------------------------------------
  // SUPER ADMIN ROUTES
  // -------------------------------------------------------------
  fastify.get('/admin/stats', async () => {
    return getGlobalStats();
  });

  fastify.get('/admin/users', async () => {
    const users = getAllUsers();
    return { users, count: users.length };
  });

  fastify.post('/admin/users', async (request, reply) => {
    const body = request.body as any;
    if (!body || !body.name || !body.email || !body.role) {
      return reply.status(400).send({ error: 'Champs obligatoires manquants (name, email, role)' });
    }

    const existing = getUserByEmail(body.email);
    if (existing) {
      return reply.status(409).send({ error: 'Un utilisateur existe déjà avec cet email.' });
    }

    const newUser = createUser({
      name: body.name,
      email: body.email,
      role: body.role as UserRole,
      status: body.status || 'active',
    });

    return reply.status(201).send({ user: newUser });
  });

  fastify.patch('/admin/users/:id/role', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { role } = request.body as { role: UserRole };
    if (!role) {
      return reply.status(400).send({ error: 'Nouveau rôle manquant' });
    }

    const success = updateUserRole(id, role);
    if (!success) {
      return reply.status(404).send({ error: 'Utilisateur introuvable' });
    }
    return { success: true, user: getUserById(id) };
  });

  fastify.patch('/admin/users/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = toggleUserStatus(id);
    if (!updated) {
      return reply.status(404).send({ error: 'Utilisateur introuvable' });
    }
    return { success: true, user: updated };
  });

  fastify.delete('/admin/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = deleteUser(id);
    if (!success) {
      return reply.status(404).send({ error: 'Utilisateur introuvable' });
    }
    return { success: true, message: 'Utilisateur supprimé avec succès' };
  });

  fastify.get('/admin/apps', async () => {
    const apps = getAllApps();
    return { apps, count: apps.length };
  });

  fastify.patch('/admin/apps/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = toggleAppStatus(id);
    if (!updated) {
      return reply.status(404).send({ error: 'Application introuvable' });
    }
    return { success: true, app: updated };
  });

  fastify.delete('/admin/apps/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = deleteApp(id);
    if (!success) {
      return reply.status(404).send({ error: 'Application introuvable' });
    }
    return { success: true, message: 'Application supprimée' };
  });

  // -------------------------------------------------------------
  // DEVELOPER / CLIENT ROUTES
  // -------------------------------------------------------------
  fastify.get('/apps', async (request) => {
    const query = request.query as { ownerEmail?: string };
    const apps = getAllApps(query.ownerEmail);
    return { apps, count: apps.length };
  });

  fastify.get('/apps/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const app = getAppById(id);
    if (!app) {
      return reply.status(404).send({ error: 'Application introuvable' });
    }
    const collections = getCollections(app.id);
    const logs = getLogs(app.id, 20);
    return { app, collections, logs };
  });

  fastify.post('/apps', async (request, reply) => {
    const body = request.body as any;
    if (!body || !body.name) {
      return reply.status(400).send({ error: 'Le nom de l\'application est obligatoire' });
    }

    const templateType = body.templateType || 'empty';
    const newApp = createApp(body, templateType);
    return reply.status(201).send({ app: newApp });
  });

  fastify.put('/apps/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as any;
    const updated = updateApp(id, updates);
    if (!updated) {
      return reply.status(404).send({ error: 'Application introuvable' });
    }
    return { success: true, app: updated };
  });

  fastify.delete('/apps/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = deleteApp(id);
    if (!success) {
      return reply.status(404).send({ error: 'Application introuvable' });
    }
    return { success: true, message: 'Application supprimée' };
  });

  fastify.post('/apps/:id/regenerate-keys', async (request, reply) => {
    const { id } = request.params as { id: string };
    const keys = regenerateAppKeys(id);
    if (!keys) {
      return reply.status(404).send({ error: 'Application introuvable' });
    }
    return { success: true, ...keys };
  });

  // -------------------------------------------------------------
  // COLLECTIONS & DOCUMENTS
  // -------------------------------------------------------------
  fastify.get('/apps/:id/collections', async (request, reply) => {
    const { id } = request.params as { id: string };
    const app = getAppById(id);
    if (!app) {
      return reply.status(404).send({ error: 'Application introuvable' });
    }
    const collections = getCollections(id);
    return { collections, count: collections.length };
  });

  fastify.post('/apps/:id/collections', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    if (!body || !body.name) {
      return reply.status(400).send({ error: 'Nom de collection requis' });
    }

    const col = createCollection({
      appId: id,
      name: body.name,
      description: body.description,
      fields: body.fields,
    });

    return reply.status(201).send({ collection: col });
  });

  fastify.delete('/apps/:id/collections/:colId', async (request, reply) => {
    const { colId } = request.params as { id: string; colId: string };
    const success = deleteCollection(colId);
    if (!success) {
      return reply.status(404).send({ error: 'Collection introuvable' });
    }
    return { success: true, message: 'Collection supprimée' };
  });

  fastify.get('/apps/:id/collections/:colId/documents', async (request, reply) => {
    const { colId } = request.params as { id: string; colId: string };
    const documents = getDocuments(colId);
    return { documents, count: documents.length };
  });

  fastify.post('/apps/:id/collections/:colId/documents', async (request, reply) => {
    const { id, colId } = request.params as { id: string; colId: string };
    const body = request.body as any;

    const doc = createDocument(colId, id, body || {});

    // Create log for write
    const app = getAppById(id);
    const col = getCollectionById(colId);
    if (app && col) {
      createLog({
        appId: app.id,
        appName: app.name,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        method: 'POST',
        endpoint: `/api/apps/${app.slug}/collections/${col.name}`,
        statusCode: 201,
        latencyMs: 14,
        ipAddress: request.ip || '127.0.0.1',
        userAgent: request.headers['user-agent'] || 'Fastify-Client',
        requestBody: body,
        responseBody: { id: doc.id, success: true },
      });
    }

    return reply.status(201).send({ document: doc });
  });

  fastify.delete('/apps/:id/documents/:docId', async (request, reply) => {
    const { docId } = request.params as { id: string; docId: string };
    const success = deleteDocument(docId);
    if (!success) {
      return reply.status(404).send({ error: 'Document introuvable' });
    }
    return { success: true, message: 'Document supprimé' };
  });

  fastify.get('/apps/:id/logs', async (request, reply) => {
    const { id } = request.params as { id: string };
    const logs = getLogs(id, 50);
    return { logs, count: logs.length };
  });

  // -------------------------------------------------------------
  // PUBLIC BAAS REST ENGINE (Direct API calls via apiKey)
  // E.g.: GET /api/v1/:appSlug/:collectionName
  // Headers: x-api-key: zbaas_anon_... OR Authorization: Bearer zbaas_...
  // -------------------------------------------------------------
  fastify.get('/v1/:appSlug/:collectionName', async (request, reply) => {
    const start = Date.now();
    const { appSlug, collectionName } = request.params as { appSlug: string; collectionName: string };

    const apiKey =
      (request.headers['x-api-key'] as string) ||
      (request.headers.authorization ? request.headers.authorization.replace('Bearer ', '') : '');

    const app = getAppBySlug(appSlug);
    if (!app) {
      return reply.status(404).send({
        error: `Application introuvable pour le slug "${appSlug}"`,
      });
    }

    if (app.status !== 'active') {
      return reply.status(403).send({
        error: 'Cette application est actuellement en pause.',
      });
    }

    // Verify key
    if (apiKey && apiKey !== app.publicKey && apiKey !== app.secretKey) {
      return reply.status(401).send({
        error: 'Clé d\'API invalide pour cette application.',
      });
    }

    const col = getCollectionByName(app.id, collectionName);
    if (!col) {
      return reply.status(404).send({
        error: `Collection "${collectionName}" introuvable dans cette application.`,
      });
    }

    const docs = getDocuments(col.id);
    const latency = Date.now() - start;

    // Log the read request
    createLog({
      appId: app.id,
      appName: app.name,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      method: 'GET',
      endpoint: `/api/v1/${appSlug}/${collectionName}`,
      statusCode: 200,
      latencyMs: Math.max(1, latency),
      ipAddress: request.ip || '127.0.0.1',
      userAgent: request.headers['user-agent'] || 'BaaS-Client',
      responseBody: { count: docs.length },
    });

    return reply
      .header('x-fastify-engine', 'Fastify-SQLite-v5')
      .header('x-response-time-ms', latency)
      .send({
        data: docs.map((d) => ({ id: d.id, ...d.data, _createdAt: d.createdAt })),
        count: docs.length,
        collection: col.name,
        app: app.slug,
        latencyMs: latency,
      });
  });

  fastify.post('/v1/:appSlug/:collectionName', async (request, reply) => {
    const start = Date.now();
    const { appSlug, collectionName } = request.params as { appSlug: string; collectionName: string };
    const body = (request.body as any) || {};

    const apiKey =
      (request.headers['x-api-key'] as string) ||
      (request.headers.authorization ? request.headers.authorization.replace('Bearer ', '') : '');

    const app = getAppBySlug(appSlug);
    if (!app) {
      return reply.status(404).send({
        error: `Application introuvable pour le slug "${appSlug}"`,
      });
    }

    if (app.status !== 'active') {
      return reply.status(403).send({
        error: 'Cette application est actuellement en pause.',
      });
    }

    // Verify key
    if (apiKey && apiKey !== app.publicKey && apiKey !== app.secretKey) {
      return reply.status(401).send({
        error: 'Clé d\'API invalide pour cette application.',
      });
    }

    const col = getCollectionByName(app.id, collectionName);
    if (!col) {
      return reply.status(404).send({
        error: `Collection "${collectionName}" introuvable dans cette application.`,
      });
    }

    const doc = createDocument(col.id, app.id, body);
    const latency = Date.now() - start;

    createLog({
      appId: app.id,
      appName: app.name,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      method: 'POST',
      endpoint: `/api/v1/${appSlug}/${collectionName}`,
      statusCode: 201,
      latencyMs: Math.max(1, latency),
      ipAddress: request.ip || '127.0.0.1',
      userAgent: request.headers['user-agent'] || 'BaaS-Client',
      requestBody: body,
      responseBody: { id: doc.id, success: true },
    });

    return reply
      .status(201)
      .header('x-fastify-engine', 'Fastify-SQLite-v5')
      .send({
        id: doc.id,
        success: true,
        data: { id: doc.id, ...doc.data },
        collection: col.name,
        app: app.slug,
        latencyMs: latency,
      });
  });
};
