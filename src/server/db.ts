/**
 * SQLite Database Configuration & Repository for ZenBaaS
 * Powered by better-sqlite3 with WAL mode for Fastify high throughput.
 */

import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import {
  initialUsers,
  initialApps,
  initialCollections,
  initialDocuments,
  initialLogs,
} from '../data/mockData';
import { User, AppItem, Collection, DataDocument, ApiLog, UserRole, UserStatus, CollectionField } from '../types/baas';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'zenbaas.sqlite');
export const db = new Database(dbPath);

// Enable WAL mode & foreign keys for optimal performance and data integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Initialize SQLite tables
 */
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      avatarUrl TEXT,
      createdAt TEXT NOT NULL,
      lastActive TEXT,
      appsCount INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS apps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      ownerEmail TEXT NOT NULL,
      ownerName TEXT NOT NULL,
      environment TEXT DEFAULT 'production',
      status TEXT DEFAULT 'active',
      dbEngine TEXT DEFAULT 'Fastify-SQLite',
      region TEXT DEFAULT 'europe-west1 (Paris)',
      publicKey TEXT NOT NULL,
      secretKey TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      requestsLast24h INTEGER DEFAULT 0,
      storageUsedMb REAL DEFAULT 0.0,
      errorRate REAL DEFAULT 0.0,
      p95LatencyMs INTEGER DEFAULT 14,
      collectionsCount INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      appId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      documentCount INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      fieldsJson TEXT NOT NULL,
      FOREIGN KEY (appId) REFERENCES apps(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      collectionId TEXT NOT NULL,
      appId TEXT NOT NULL,
      dataJson TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (collectionId) REFERENCES collections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS api_logs (
      id TEXT PRIMARY KEY,
      appId TEXT NOT NULL,
      appName TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      method TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      statusCode INTEGER NOT NULL,
      latencyMs INTEGER NOT NULL,
      ipAddress TEXT,
      userAgent TEXT,
      requestBody TEXT,
      responseBody TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_apps_owner ON apps(ownerEmail);
    CREATE INDEX IF NOT EXISTS idx_apps_slug ON apps(slug);
    CREATE INDEX IF NOT EXISTS idx_collections_app ON collections(appId);
    CREATE INDEX IF NOT EXISTS idx_documents_col ON documents(collectionId);
    CREATE INDEX IF NOT EXISTS idx_logs_app ON api_logs(appId);
  `);

  // Seed initial data if database is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    seedInitialData();
  }
}

/**
 * Seed initial records into SQLite
 */
function seedInitialData() {
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, role, status, avatarUrl, createdAt, lastActive, appsCount)
    VALUES (@id, @name, @email, @role, @status, @avatarUrl, @createdAt, @lastActive, @appsCount)
  `);

  const insertApp = db.prepare(`
    INSERT INTO apps (
      id, name, slug, description, ownerEmail, ownerName, environment, status,
      dbEngine, region, publicKey, secretKey, createdAt, updatedAt,
      requestsLast24h, storageUsedMb, errorRate, p95LatencyMs, collectionsCount
    )
    VALUES (
      @id, @name, @slug, @description, @ownerEmail, @ownerName, @environment, @status,
      @dbEngine, @region, @publicKey, @secretKey, @createdAt, @updatedAt,
      @requestsLast24h, @storageUsedMb, @errorRate, @p95LatencyMs, @collectionsCount
    )
  `);

  const insertCol = db.prepare(`
    INSERT INTO collections (id, appId, name, description, documentCount, createdAt, fieldsJson)
    VALUES (@id, @appId, @name, @description, @documentCount, @createdAt, @fieldsJson)
  `);

  const insertDoc = db.prepare(`
    INSERT INTO documents (id, collectionId, appId, dataJson, createdAt, updatedAt)
    VALUES (@id, @collectionId, @appId, @dataJson, @createdAt, @updatedAt)
  `);

  const insertLog = db.prepare(`
    INSERT INTO api_logs (id, appId, appName, timestamp, method, endpoint, statusCode, latencyMs, ipAddress, userAgent, requestBody, responseBody)
    VALUES (@id, @appId, @appName, @timestamp, @method, @endpoint, @statusCode, @latencyMs, @ipAddress, @userAgent, @requestBody, @responseBody)
  `);

  const transaction = db.transaction(() => {
    for (const u of initialUsers) {
      insertUser.run(u);
    }
    for (const a of initialApps) {
      insertApp.run({
        ...a,
        updatedAt: a.createdAt,
        storageUsedMb: a.storageMb || 10,
        errorRate: 0.0,
      });
    }
    for (const c of initialCollections) {
      insertCol.run({
        ...c,
        fieldsJson: JSON.stringify(c.fields || []),
      });
    }
    for (const d of initialDocuments) {
      const col = initialCollections.find((c) => c.id === d.collectionId);
      insertDoc.run({
        id: d.id,
        collectionId: d.collectionId,
        appId: col?.appId || '',
        dataJson: JSON.stringify(d.data || {}),
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      });
    }
    for (const l of initialLogs) {
      insertLog.run({
        ...l,
        requestBody: l.requestBody ? JSON.stringify(l.requestBody) : null,
        responseBody: l.responseBody ? JSON.stringify(l.responseBody) : null,
      });
    }
  });

  transaction();
}

// -------------------------------------------------------------
// USER OPERATIONS
// -------------------------------------------------------------
export function getAllUsers(): User[] {
  return db.prepare('SELECT * FROM users ORDER BY createdAt DESC').all() as User[];
}

export function getUserById(id: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getUserByEmail(email: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as User | undefined;
}

export function createUser(user: {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  avatarUrl?: string;
  createdAt?: string;
  lastActive?: string;
  appsCount?: number;
}): User {
  const id = user.id || 'usr_' + Math.random().toString(36).substring(2, 9);
  const newUser: User = {
    id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status || 'active',
    avatarUrl: user.avatarUrl || `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 50)}?auto=format&fit=crop&w=120&q=80`,
    createdAt: user.createdAt || new Date().toISOString().slice(0, 10),
    lastActive: user.lastActive || 'À l\'instant',
    appsCount: user.appsCount || 0,
  };

  db.prepare(`
    INSERT INTO users (id, name, email, role, status, avatarUrl, createdAt, lastActive, appsCount)
    VALUES (@id, @name, @email, @role, @status, @avatarUrl, @createdAt, @lastActive, @appsCount)
  `).run(newUser);

  return newUser;
}

export function updateUserRole(id: string, role: UserRole): boolean {
  const info = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  return info.changes > 0;
}

export function toggleUserStatus(id: string): User | null {
  const user = getUserById(id);
  if (!user) return null;
  const newStatus = user.status === 'active' ? 'blocked' : 'active';
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(newStatus, id);
  return { ...user, status: newStatus };
}

export function deleteUser(id: string): boolean {
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return info.changes > 0;
}

// -------------------------------------------------------------
// APP OPERATIONS
// -------------------------------------------------------------
export function getAllApps(ownerEmail?: string): AppItem[] {
  if (ownerEmail) {
    return db.prepare('SELECT * FROM apps WHERE LOWER(ownerEmail) = LOWER(?) ORDER BY createdAt DESC').all(ownerEmail) as AppItem[];
  }
  return db.prepare('SELECT * FROM apps ORDER BY createdAt DESC').all() as AppItem[];
}

export function getAppById(id: string): AppItem | undefined {
  return db.prepare('SELECT * FROM apps WHERE id = ?').get(id) as AppItem | undefined;
}

export function getAppBySlug(slug: string): AppItem | undefined {
  return db.prepare('SELECT * FROM apps WHERE slug = ?').get(slug) as AppItem | undefined;
}

export function createApp(appPartial: Partial<AppItem>, templateType: 'ecommerce' | 'blog' | 'empty' = 'empty'): AppItem {
  const id = appPartial.id || 'app_' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString().slice(0, 10);

  const newApp: AppItem = {
    id,
    name: appPartial.name || 'Nouvelle Application',
    slug: appPartial.slug || `app-${Math.random().toString(36).substring(2, 6)}`,
    description: appPartial.description || 'Instance BaaS propulsée par Fastify et SQLite.',
    ownerId: appPartial.ownerId || 'usr_1',
    ownerEmail: appPartial.ownerEmail || 'princeieugene48@gmail.com',
    ownerName: appPartial.ownerName || 'Eugène Prince',
    environment: appPartial.environment || 'production',
    status: 'active',
    dbEngine: 'Fastify SQLite',
    region: appPartial.region || 'europe-west1 (Paris)',
    publicKey: 'zbaas_anon_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12),
    secretKey: 'zbaas_service_role_' + Math.random().toString(36).substring(2, 16) + Math.random().toString(36).substring(2, 16),
    createdAt: now,
    totalRequests: appPartial.totalRequests || 48200000,
    requestsLast24h: 1,
    storageMb: appPartial.storageMb || 120,
    p95LatencyMs: 12,
    collectionsCount: templateType === 'ecommerce' ? 2 : templateType === 'blog' ? 1 : 0,
    allowedOrigins: appPartial.allowedOrigins || ['*'],
  };

  db.prepare(`
    INSERT INTO apps (
      id, name, slug, description, ownerEmail, ownerName, environment, status,
      dbEngine, region, publicKey, secretKey, createdAt, updatedAt,
      requestsLast24h, storageUsedMb, errorRate, p95LatencyMs, collectionsCount
    )
    VALUES (
      @id, @name, @slug, @description, @ownerEmail, @ownerName, @environment, @status,
      @dbEngine, @region, @publicKey, @secretKey, @createdAt, @createdAt,
      @requestsLast24h, @storageMb, 0.0, @p95LatencyMs, @collectionsCount
    )
  `).run({
    ...newApp,
    storageMb: newApp.storageMb,
  });

  // Update user app count
  db.prepare('UPDATE users SET appsCount = appsCount + 1 WHERE LOWER(email) = LOWER(?)').run(newApp.ownerEmail);

  // Seed template collections
  if (templateType === 'ecommerce') {
    const colProd = createCollection({
      appId: newApp.id,
      name: 'products',
      description: 'Articles et catalogue',
      fields: [
        { name: 'name', type: 'string', required: true },
        { name: 'price', type: 'number', required: true },
        { name: 'inStock', type: 'boolean', required: true },
      ],
    });
    createDocument(colProd.id, newApp.id, { name: 'Exemple Produit Fastify', price: 59.99, inStock: true });
    createDocument(colProd.id, newApp.id, { name: 'Pack Développeur SQLite', price: 99.0, inStock: true });

    createCollection({
      appId: newApp.id,
      name: 'orders',
      description: 'Commandes clients',
      fields: [
        { name: 'orderNumber', type: 'string', required: true },
        { name: 'totalAmount', type: 'number', required: true },
      ],
    });
  } else if (templateType === 'blog') {
    const colPosts = createCollection({
      appId: newApp.id,
      name: 'posts',
      description: 'Articles de blog',
      fields: [
        { name: 'title', type: 'string', required: true },
        { name: 'published', type: 'boolean', required: true },
      ],
    });
    createDocument(colPosts.id, newApp.id, {
      title: 'Bienvenue sur votre backend Fastify & SQLite',
      published: true,
    });
  }

  return newApp;
}

export function updateApp(id: string, updates: Partial<AppItem>): AppItem | null {
  const existing = getAppById(id);
  if (!existing) return null;

  const merged = { ...existing, ...updates, updatedAt: new Date().toISOString().slice(0, 10) };
  db.prepare(`
    UPDATE apps
    SET name = @name, description = @description, environment = @environment,
        status = @status, region = @region, updatedAt = @updatedAt
    WHERE id = @id
  `).run(merged);

  return merged;
}

export function toggleAppStatus(id: string): AppItem | null {
  const app = getAppById(id);
  if (!app) return null;
  const newStatus = app.status === 'active' ? 'paused' : 'active';
  db.prepare('UPDATE apps SET status = ? WHERE id = ?').run(newStatus, id);
  return { ...app, status: newStatus };
}

export function deleteApp(id: string): boolean {
  const app = getAppById(id);
  if (!app) return false;

  const info = db.prepare('DELETE FROM apps WHERE id = ?').run(id);
  db.prepare('UPDATE users SET appsCount = MAX(0, appsCount - 1) WHERE LOWER(email) = LOWER(?)').run(app.ownerEmail);
  return info.changes > 0;
}

export function regenerateAppKeys(id: string): { publicKey: string; secretKey: string } | null {
  const newPub = 'zbaas_anon_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
  const newSec = 'zbaas_service_role_' + Math.random().toString(36).substring(2, 16) + Math.random().toString(36).substring(2, 16);

  const info = db.prepare('UPDATE apps SET publicKey = ?, secretKey = ?, updatedAt = ? WHERE id = ?').run(
    newPub,
    newSec,
    new Date().toISOString().slice(0, 10),
    id
  );

  if (info.changes === 0) return null;
  return { publicKey: newPub, secretKey: newSec };
}

// -------------------------------------------------------------
// COLLECTION OPERATIONS
// -------------------------------------------------------------
export function getCollections(appId: string): Collection[] {
  const rows = db.prepare('SELECT * FROM collections WHERE appId = ? ORDER BY createdAt ASC').all(appId) as any[];
  return rows.map((r) => ({
    id: r.id,
    appId: r.appId,
    name: r.name,
    description: r.description,
    documentCount: r.documentCount,
    createdAt: r.createdAt,
    fields: JSON.parse(r.fieldsJson || '[]'),
  }));
}

export function getCollectionById(id: string): Collection | undefined {
  const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as any;
  if (!row) return undefined;
  return {
    id: row.id,
    appId: row.appId,
    name: row.name,
    description: row.description,
    documentCount: row.documentCount,
    createdAt: row.createdAt,
    fields: JSON.parse(row.fieldsJson || '[]'),
  };
}

export function getCollectionByName(appId: string, name: string): Collection | undefined {
  const row = db.prepare('SELECT * FROM collections WHERE appId = ? AND LOWER(name) = LOWER(?)').get(appId, name) as any;
  if (!row) return undefined;
  return {
    id: row.id,
    appId: row.appId,
    name: row.name,
    description: row.description,
    documentCount: row.documentCount,
    createdAt: row.createdAt,
    fields: JSON.parse(row.fieldsJson || '[]'),
  };
}

export function createCollection(params: {
  appId: string;
  name: string;
  description?: string;
  fields?: CollectionField[];
}): Collection {
  const id = 'col_' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString().slice(0, 10);
  const fields: CollectionField[] = params.fields && params.fields.length > 0
    ? params.fields
    : [{ name: 'title', type: 'string', required: true }];

  db.prepare(`
    INSERT INTO collections (id, appId, name, description, documentCount, createdAt, fieldsJson)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `).run(id, params.appId, params.name.toLowerCase().trim(), params.description || '', now, JSON.stringify(fields));

  db.prepare('UPDATE apps SET collectionsCount = collectionsCount + 1 WHERE id = ?').run(params.appId);

  return {
    id,
    appId: params.appId,
    name: params.name.toLowerCase().trim(),
    description: params.description || '',
    documentCount: 0,
    createdAt: now,
    fields,
  };
}

export function deleteCollection(id: string): boolean {
  const col = getCollectionById(id);
  if (!col) return false;

  const info = db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  db.prepare('UPDATE apps SET collectionsCount = MAX(0, collectionsCount - 1) WHERE id = ?').run(col.appId);
  return info.changes > 0;
}

// -------------------------------------------------------------
// DOCUMENT OPERATIONS
// -------------------------------------------------------------
export function getDocuments(collectionId: string): DataDocument[] {
  const rows = db.prepare('SELECT * FROM documents WHERE collectionId = ? ORDER BY createdAt DESC').all(collectionId) as any[];
  return rows.map((r) => ({
    id: r.id,
    collectionId: r.collectionId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    data: JSON.parse(r.dataJson || '{}'),
  }));
}

export function getDocumentById(id: string): DataDocument | undefined {
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
  if (!row) return undefined;
  return {
    id: row.id,
    collectionId: row.collectionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    data: JSON.parse(row.dataJson || '{}'),
  };
}

export function createDocument(collectionId: string, appId: string, data: Record<string, any>): DataDocument {
  const id = 'doc_' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO documents (id, collectionId, appId, dataJson, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, collectionId, appId, JSON.stringify(data), now, now);

  db.prepare('UPDATE collections SET documentCount = documentCount + 1 WHERE id = ?').run(collectionId);
  db.prepare('UPDATE apps SET storageUsedMb = ROUND(storageUsedMb + 0.05, 2) WHERE id = ?').run(appId);

  return {
    id,
    collectionId,
    createdAt: now,
    updatedAt: now,
    data,
  };
}

export function deleteDocument(id: string): boolean {
  const doc = getDocumentById(id);
  if (!doc) return false;

  const info = db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  db.prepare('UPDATE collections SET documentCount = MAX(0, documentCount - 1) WHERE id = ?').run(doc.collectionId);
  return info.changes > 0;
}

// -------------------------------------------------------------
// LOG OPERATIONS
// -------------------------------------------------------------
export function getLogs(appId?: string, limit: number = 50): ApiLog[] {
  let rows: any[];
  if (appId) {
    rows = db.prepare('SELECT * FROM api_logs WHERE appId = ? ORDER BY timestamp DESC LIMIT ?').all(appId, limit);
  } else {
    rows = db.prepare('SELECT * FROM api_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
  }

  return rows.map((r) => ({
    id: r.id,
    appId: r.appId,
    appName: r.appName,
    timestamp: r.timestamp,
    method: r.method,
    endpoint: r.endpoint,
    statusCode: r.statusCode,
    latencyMs: r.latencyMs,
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    requestBody: r.requestBody ? JSON.parse(r.requestBody) : undefined,
    responseBody: r.responseBody ? JSON.parse(r.responseBody) : undefined,
  }));
}

export function createLog(log: Omit<ApiLog, 'id'> & { id?: string }): ApiLog {
  const id = log.id || 'log_' + Math.random().toString(36).substring(2, 9);
  const newLog: ApiLog = {
    ...log,
    id,
  };

  db.prepare(`
    INSERT INTO api_logs (id, appId, appName, timestamp, method, endpoint, statusCode, latencyMs, ipAddress, userAgent, requestBody, responseBody)
    VALUES (@id, @appId, @appName, @timestamp, @method, @endpoint, @statusCode, @latencyMs, @ipAddress, @userAgent, @requestBody, @responseBody)
  `).run({
    ...newLog,
    requestBody: newLog.requestBody ? JSON.stringify(newLog.requestBody) : null,
    responseBody: newLog.responseBody ? JSON.stringify(newLog.responseBody) : null,
  });

  // Increment requests on app
  db.prepare('UPDATE apps SET requestsLast24h = requestsLast24h + 1 WHERE id = ?').run(newLog.appId);

  return newLog;
}

// -------------------------------------------------------------
// GLOBAL STATS
// -------------------------------------------------------------
export function getGlobalStats() {
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  const appCount = (db.prepare('SELECT COUNT(*) as c FROM apps').get() as any).c;
  const reqTotal = (db.prepare('SELECT SUM(requestsLast24h) as s FROM apps').get() as any).s || 48200000;
  const docTotal = (db.prepare('SELECT COUNT(*) as c FROM documents').get() as any).c;

  let dbFileSizeKb = 0;
  try {
    const stats = fs.statSync(dbPath);
    dbFileSizeKb = Math.round(stats.size / 1024);
  } catch {
    dbFileSizeKb = 128;
  }

  return {
    totalUsers: userCount,
    totalApps: appCount,
    totalRequests24h: reqTotal,
    totalDocuments: docTotal,
    sqliteDatabaseSizeKb: dbFileSizeKb,
    databaseFile: dbPath,
    fastifyEngine: 'Fastify v5.12 with SQLite WAL',
    uptimeSeconds: Math.floor(process.uptime()),
    status: 'online',
  };
}
