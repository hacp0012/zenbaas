export class HttpClient {
    baseUrl;
    originUrl;
    apiKey;
    customHeaders;
    fetchImpl;
    timeoutMs;
    userToken = null;
    constructor(config) {
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
        this.originUrl = this.baseUrl.replace(/\/api\/v1$/, '');
        this.apiKey = config.apiKey;
        this.customHeaders = { ...(config.headers ?? {}) };
        this.fetchImpl = config.fetch ?? globalThis.fetch.bind(globalThis);
        this.timeoutMs = config.timeoutMs;
    }
    /**
     * Retourne l'URL de base de l'API (`/api/v1`).
     */
    getBaseUrl() {
        return this.baseUrl;
    }
    /**
     * Retourne l'URL racine de l'instance Zenbase (sans `/api/v1`).
     */
    getOriginUrl() {
        return this.originUrl;
    }
    /**
     * Ajoute ou met à jour un en-tête HTTP personnalisé global.
     */
    setHeader(key, value) {
        this.customHeaders[key] = value;
    }
    /**
     * Supprime un en-tête HTTP personnalisé global.
     */
    removeHeader(key) {
        delete this.customHeaders[key];
    }
    /**
     * Définit le token d'accès de l'utilisateur authentifié (`zb_token_...`).
     */
    setUserToken(token) {
        this.userToken = token;
    }
    /**
     * Retourne le token d'accès de l'utilisateur courant.
     */
    getUserToken() {
        return this.userToken;
    }
    /**
     * Construit les en-têtes d'authentification Zenbase.
     */
    buildHeaders(extraHeaders = {}, isMultipart = false) {
        const headers = {
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
    async request(method, path, options = {}) {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const url = new URL(`${this.baseUrl}${cleanPath}`);
        if (options.query) {
            for (const [key, val] of Object.entries(options.query)) {
                if (val !== undefined && val !== null) {
                    url.searchParams.set(key, String(val));
                }
            }
        }
        const { signal, cleanup } = this.createTimeoutSignal();
        try {
            const response = await this.fetchImpl(url.toString(), {
                method,
                headers: this.buildHeaders(options.headers),
                body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
                signal,
            });
            const json = (await response.json().catch(() => null));
            if (!response.ok) {
                const errorMessage = (typeof json?.error === 'string' && json.error) ||
                    (typeof json?.message === 'string' && json.message) ||
                    `Erreur HTTP ${response.status}`;
                return {
                    data: null,
                    error: errorMessage,
                };
            }
            return {
                data: (json && 'data' in json ? json.data : json) ?? null,
                error: typeof json?.error === 'string' ? json.error : null,
                meta: json?.meta ?? undefined,
            };
        }
        catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : 'Erreur réseau inconnue',
            };
        }
        finally {
            cleanup();
        }
    }
    /**
     * Exécute une requête multipart/form-data (upload de fichier) vers Zenbase Storage.
     */
    async uploadMultipart(path, formData) {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const url = `${this.baseUrl}${cleanPath}`;
        const { signal, cleanup } = this.createTimeoutSignal();
        try {
            const response = await this.fetchImpl(url, {
                method: 'POST',
                headers: this.buildHeaders({}, true),
                body: formData,
                signal,
            });
            const json = (await response.json().catch(() => null));
            if (!response.ok) {
                const errorMessage = (typeof json?.error === 'string' && json.error) ||
                    (typeof json?.message === 'string' && json.message) ||
                    `Erreur HTTP ${response.status}`;
                return {
                    data: null,
                    error: errorMessage,
                };
            }
            return {
                ...(json ?? {}),
                data: (json && 'data' in json ? json.data : json) ?? null,
                error: null,
            };
        }
        catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : 'Erreur réseau lors de l\'upload',
            };
        }
        finally {
            cleanup();
        }
    }
    /**
     * Télécharge une ressource binaire (Blob) depuis une URL absolue ou relative à l'instance Zenbase.
     */
    async downloadBlob(urlOrPath) {
        const targetUrl = /^https?:\/\//i.test(urlOrPath)
            ? urlOrPath
            : `${this.originUrl}${urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`}`;
        const { signal, cleanup } = this.createTimeoutSignal();
        try {
            const response = await this.fetchImpl(targetUrl, {
                method: 'GET',
                headers: {
                    ...this.customHeaders,
                },
                signal,
            });
            if (!response.ok) {
                return {
                    data: null,
                    error: `Erreur HTTP ${response.status} lors du téléchargement.`,
                };
            }
            const blob = await response.blob();
            return {
                data: blob,
                error: null,
            };
        }
        catch (err) {
            return {
                data: null,
                error: err instanceof Error ? err.message : 'Erreur réseau lors du téléchargement',
            };
        }
        finally {
            cleanup();
        }
    }
    createTimeoutSignal() {
        if (!this.timeoutMs || this.timeoutMs <= 0 || typeof AbortController === 'undefined') {
            return { signal: undefined, cleanup: () => { } };
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        return {
            signal: controller.signal,
            cleanup: () => clearTimeout(timer),
        };
    }
}
//# sourceMappingURL=http-client.js.map