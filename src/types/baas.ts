export type UserRole = 'admin' | 'developer' | 'viewer';
export type UserStatus = 'active' | 'blocked';
export type AppStatus = 'active' | 'paused' | 'archived';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;
  lastActive: string;
  appsCount: number;
}

export interface AppItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  status: AppStatus;
  createdAt: string;
  region: string;
  environment: 'production' | 'staging';
  dbEngine: 'Fastify SQLite' | 'PostgreSQL Engine' | 'In-Memory Store';
  publicKey: string;
  secretKey: string;
  totalRequests: number;
  requestsLast24h: number;
  storageMb: number;
  collectionsCount: number;
  p95LatencyMs: number;
  allowedOrigins: string[];
}

export interface CollectionField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'date';
  required: boolean;
}

export interface Collection {
  id: string;
  name: string;
  appId: string;
  description: string;
  documentCount: number;
  fields: CollectionField[];
  createdAt: string;
}

export interface DataDocument {
  id: string;
  collectionId: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ApiLog {
  id: string;
  appId: string;
  appName?: string;
  timestamp: string;
  method: HttpMethod;
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  ipAddress: string;
  userAgent: string;
  requestBody?: any;
  responseBody?: any;
}

export interface GlobalStats {
  totalUsers: number;
  usersChange: number;
  totalApps: number;
  appsChange: number;
  totalRequests: number;
  requestsChange: number;
  totalStorageGb: number;
  storageChange: number;
  averageLatencyMs: number;
  uptimePercentage: number;
}
