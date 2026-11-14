import type { ZenbaseConfig, ZenbaseResponse } from '../types/index.js';

export class HttpClient {
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly customHeaders: Record<string, string>;
    private readonly fetchImpl: typeof fetch;
    private userToken: string | null = null;

    constructor(config: ZenbaseConfig) {
        if (!config.endpoint) {
            throw new Error('[Zenbase SDK] `endpoint` est requis lors de l\'initialisation.');
        }
        if (!config.apiKey) {
            throw new Error('[Zenbase SDK] `apiKey` est requis lors de l\'initialisation.');
        }

        const trimmedEndpoint = config.endpoint.replace(/\/+$/, '');
        this.baseUrl = trimmedEndpoint.endsWith('/api/v1')
            ? trimmedEndpoint
            : `${trimmedEndpoint}/api/v1`;

        this.apiKey = config.apiKey;
        this.customHeaders = config.headers ?? {};
        this.fetchImpl = config.fetch ?? globalThis.fetch.bind(globalThis);
    }

    /**
     * Définit le token d'accès de l'utilisateur authentifié (`zb_token_...`).
     */
    public setUserToken(token: string | null): void {
        this.userToken = token;
    }

    /**
     * Retourne le token d'accès de l'utilisateur courant.
     */
    public getUserToken(): string | null {
        return this.userToken;
    }

    /**
     * Construit les en-têtes d'authentification Zenbase.
     */
    public buildHeaders(extraHeaders: Record<string, string> = {}, isMultipart = false): Record<string, string> {
        const headers: Record<string, string> = {
            Accept: 'application/json',
            'X-Zenbase-Api-Key': this.apiKey,
            Authorization: this.userToken ? `Bearer ${this.userToken}` : `Bearer ${this.apiKey}`,
            ...this.customHeaders,
            ...extraHeaders,
        };

        if (this.userToken) {
            headers['X-Zenbase-User-Token'] = this.userToken;
        }

        if (!isMultipart && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        return headers;
    }

    /**
     * Exécute une requête HTTP JSON vers la passerelle API Laravel de Zenbase.
     */
    public async request<T>(
        method: string,
        path: string,
        options: {
            query?: Record<string, string | number | boolean | undefined>;
            body?: unknown;
            headers?: Record<string, string>;
        } = {},
    ): Promise<ZenbaseResponse<T>> {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const url = new URL(`${this.baseUrl}${cleanPath}`);

        if (options.query) {
            for (const [key, val] of Object.entries(options.query)) {
                if (val !== undefined && val !== null) {
                    url.searchParams.set(key, String(val));
                }
            }
        }

        try {
            const response = await this.fetchImpl(url.toString(), {
                method,
                headers: this.buildHeaders(options.headers),
                body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
            });

            const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;

            if (!response.ok) {
                const errorMessage =
                    (typeof json?.error === 'string' && json.error) ||
                    (typeof json?.message === 'string' && json.message) ||
                    `Erreur HTTP ${response.status}`;

                return {
                    data: null,
                    error: errorMessage,
                };
            }

            return {
                data: (json && 'data' in json ? (json.data as T) : (json as T)) ?? null,
                error: typeof json?.error === 'string' ? json.error : null,
                meta: (json?.meta as Record<string, unknown>) ?? undefined,
            };
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : 'Erreur réseau inconnue',
            };
        }
    }

    /**
     * Exécute une requête multipart/form-data (upload de fichier) vers Zenbase Storage.
     */
    public async uploadMultipart<T>(
        path: string,
        formData: FormData,
    ): Promise<Record<string, unknown> & ZenbaseResponse<T>> {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const url = `${this.baseUrl}${cleanPath}`;

        try {
            const response = await this.fetchImpl(url, {
                method: 'POST',
                headers: this.buildHeaders({}, true),
                body: formData,
            });

            const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;

            if (!response.ok) {
                const errorMessage =
                    (typeof json?.error === 'string' && json.error) ||
                    (typeof json?.message === 'string' && json.message) ||
                    `Erreur HTTP ${response.status}`;

                return {
                    data: null,
                    error: errorMessage,
                };
            }

            return {
                ...(json ?? {}),
                data: (json && 'data' in json ? (json.data as T) : (json as T)) ?? null,
                error: null,
            };
        } catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : 'Erreur réseau lors de l\'upload',
            };
        }
    }
}
