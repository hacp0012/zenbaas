import type { ZenbaseConfig, ZenbaseResponse } from '../types/index.js';
export declare class HttpClient {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly customHeaders;
    private readonly fetchImpl;
    private userToken;
    constructor(config: ZenbaseConfig);
    /**
     * Définit le token d'accès de l'utilisateur authentifié (`zb_token_...`).
     */
    setUserToken(token: string | null): void;
    /**
     * Retourne le token d'accès de l'utilisateur courant.
     */
    getUserToken(): string | null;
    /**
     * Construit les en-têtes d'authentification Zenbase.
     */
    buildHeaders(extraHeaders?: Record<string, string>, isMultipart?: boolean): Record<string, string>;
    /**
     * Exécute une requête HTTP JSON vers la passerelle API Laravel de Zenbase.
     */
    request<T>(method: string, path: string, options?: {
        query?: Record<string, string | number | boolean | undefined>;
        body?: unknown;
        headers?: Record<string, string>;
    }): Promise<ZenbaseResponse<T>>;
    /**
     * Exécute une requête multipart/form-data (upload de fichier) vers Zenbase Storage.
     */
    uploadMultipart<T>(path: string, formData: FormData): Promise<Record<string, unknown> & ZenbaseResponse<T>>;
}
//# sourceMappingURL=http-client.d.ts.map