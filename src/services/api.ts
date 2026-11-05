/**
 * Client-side API Service for communicating with the Fastify + SQLite Backend
 */

import { User, AppItem, Collection, DataDocument, ApiLog, UserRole, CollectionField } from '../types/baas';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: 'Erreur réseau inconnue' }));
    throw new Error(errorBody.error || `Erreur HTTP ${res.status}`);
  }

  return res.json();
}

export const baasApi = {
  // Engine & Stats
  async getStats() {
    return request<any>('/engine/stats');
  },

  async getHealth() {
    return request<any>('/health');
  },

  // Users
  async getUsers(): Promise<User[]> {
    const res = await request<{ users: User[] }>('/admin/users');
    return res.users;
  },

  async createUser(name: string, email: string, role: UserRole): Promise<User> {
    const res = await request<{ user: User }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, role }),
    });
    return res.user;
  },

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const res = await request<{ user: User }>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    return res.user;
  },

  async toggleUserStatus(userId: string): Promise<User> {
    const res = await request<{ user: User }>(`/admin/users/${userId}/status`, {
      method: 'PATCH',
    });
    return res.user;
  },

  async deleteUser(userId: string): Promise<void> {
    await request(`/admin/users/${userId}`, { method: 'DELETE' });
  },

  // Apps
  async getApps(ownerEmail?: string): Promise<AppItem[]> {
    const query = ownerEmail ? `?ownerEmail=${encodeURIComponent(ownerEmail)}` : '';
    const res = await request<{ apps: AppItem[] }>(`/apps${query}`);
    return res.apps;
  },

  async getApp(id: string): Promise<{ app: AppItem; collections: Collection[]; logs: ApiLog[] }> {
    return request(`/apps/${id}`);
  },

  async createApp(
    app: Partial<AppItem>,
    templateType: 'ecommerce' | 'blog' | 'empty' = 'empty'
  ): Promise<AppItem> {
    const res = await request<{ app: AppItem }>('/apps', {
      method: 'POST',
      body: JSON.stringify({ ...app, templateType }),
    });
    return res.app;
  },

  async updateApp(id: string, updates: Partial<AppItem>): Promise<AppItem> {
    const res = await request<{ app: AppItem }>(`/apps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return res.app;
  },

  async toggleAppStatus(id: string): Promise<AppItem> {
    const res = await request<{ app: AppItem }>(`/admin/apps/${id}/status`, {
      method: 'PATCH',
    });
    return res.app;
  },

  async deleteApp(id: string): Promise<void> {
    await request(`/apps/${id}`, { method: 'DELETE' });
  },

  async regenerateKeys(id: string): Promise<{ publicKey: string; secretKey: string }> {
    return request(`/apps/${id}/regenerate-keys`, { method: 'POST' });
  },

  // Collections
  async getCollections(appId: string): Promise<Collection[]> {
    const res = await request<{ collections: Collection[] }>(`/apps/${appId}/collections`);
    return res.collections;
  },

  async createCollection(
    appId: string,
    name: string,
    description?: string,
    fields?: CollectionField[]
  ): Promise<Collection> {
    const res = await request<{ collection: Collection }>(`/apps/${appId}/collections`, {
      method: 'POST',
      body: JSON.stringify({ name, description, fields }),
    });
    return res.collection;
  },

  async deleteCollection(appId: string, colId: string): Promise<void> {
    await request(`/apps/${appId}/collections/${colId}`, { method: 'DELETE' });
  },

  // Documents
  async getDocuments(appId: string, colId: string): Promise<DataDocument[]> {
    const res = await request<{ documents: DataDocument[] }>(`/apps/${appId}/collections/${colId}/documents`);
    return res.documents;
  },

  async createDocument(
    appId: string,
    colId: string,
    data: Record<string, any>
  ): Promise<DataDocument> {
    const res = await request<{ document: DataDocument }>(`/apps/${appId}/collections/${colId}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.document;
  },

  async deleteDocument(appId: string, docId: string): Promise<void> {
    await request(`/apps/${appId}/documents/${docId}`, { method: 'DELETE' });
  },

  // Logs
  async getLogs(appId: string): Promise<ApiLog[]> {
    const res = await request<{ logs: ApiLog[] }>(`/apps/${appId}/logs`);
    return res.logs;
  },

  // Public REST Engine Runner (for Live Playground testing)
  async executeRestQuery(appSlug: string, collectionName: string, apiKey: string) {
    const res = await fetch(`/api/v1/${appSlug}/${collectionName}`, {
      headers: {
        'x-api-key': apiKey,
      },
    });
    const data = await res.json();
    return {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      data,
    };
  },

  async executeRestInsert(appSlug: string, collectionName: string, apiKey: string, body: any) {
    const res = await fetch(`/api/v1/${appSlug}/${collectionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      data,
    };
  },
};
