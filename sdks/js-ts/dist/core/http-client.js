export class HttpClient {
    baseUrl;
    apiKey;
    customHeaders;
    fetchImpl;
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
        this.apiKey = config.apiKey;
        this.customHeaders = config.headers ?? {};
        this.fetchImpl = config.fetch ?? globalThis.fetch.bind(globalThis);
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
        try {
            const response = await this.fetchImpl(url.toString(), {
                method,
                headers: this.buildHeaders(options.headers),
                body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
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
    }
    /**
     * Exécute une requête multipart/form-data (upload de fichier) vers Zenbase Storage.
     */
    async uploadMultipart(path, formData) {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const url = `${this.baseUrl}${cleanPath}`;
        try {
            const response = await this.fetchImpl(url, {
                method: 'POST',
                headers: this.buildHeaders({}, true),
                body: formData,
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
    }
}
//# sourceMappingURL=http-client.js.map