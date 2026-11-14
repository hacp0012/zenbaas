export interface ZenbaseConfig {
    /**
     * URL de base du serveur Zenbase (ex: 'https://api.zenbase.local' ou 'http://localhost:8000')
     */
    endpoint: string;
    /**
     * Clé d'API de l'application (`zb_pub_...` côté client ou `zb_sec_...` côté serveur Node.js)
     */
    apiKey: string;
    /**
     * En-têtes HTTP personnalisés optionnels
     */
    headers?: Record<string, string>;
    /**
     * Implémentation personnalisée de `fetch` (utile pour les tests ou environnements spécifiques)
     */
    fetch?: typeof fetch;
}
export type FilterOperator = '==' | '=' | '!=' | '<>' | '>' | '>=' | '<' | '<=' | 'contains' | 'like' | 'in';
export interface QueryFilter {
    field: string;
    operator: FilterOperator;
    value: unknown;
}
export interface ZenbaseResponse<T> {
    data: T | null;
    error: string | null;
    meta?: Record<string, unknown>;
}
export type ZenbaseDocument<T = Record<string, unknown>> = T & {
    id: string;
    collection: string;
    data: T;
    created_at: string;
    updated_at: string;
};
export type ZenbaseQueryResult<T = Record<string, unknown>> = Array<ZenbaseDocument<T>> & {
    data: Array<ZenbaseDocument<T>>;
    error: string | null;
};
export interface ZenbaseUser {
    id: string;
    email: string;
    auth_method: 'password' | 'otp' | string;
    is_blocked: boolean;
    created_at: string;
    updated_at?: string;
}
export interface ZenbaseAuthSession {
    user: ZenbaseUser | null;
    token: string | null;
    data: {
        user: ZenbaseUser;
        token: string;
    } | null;
    error: string | null;
}
export interface ZenbaseOtpDispatchResult {
    email: string | null;
    expires_at: string | null;
    data: {
        email: string;
        expires_at: string;
    } | null;
    error: string | null;
}
export interface ZenbaseStoredFile {
    id: string;
    url: string;
    fileUrl: string;
    path: string;
    folder: string;
    original_name: string;
    size: number;
    mime_type: string;
    created_at: string;
}
export interface ZenbaseUploadResult {
    url: string | null;
    fileUrl: string | null;
    data: ZenbaseStoredFile | null;
    error: string | null;
}
export type ZenbaseFieldType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'blob';
export interface ZenbaseSchemaField {
    name: string;
    type: ZenbaseFieldType;
    required?: boolean;
    default?: unknown;
    description?: string | null;
}
export interface ZenbaseCollectionSchema {
    strict?: boolean;
    fields: ZenbaseSchemaField[];
}
export interface ZenbaseBlobValue {
    __type: 'blob';
    mime_type: string;
    name?: string | null;
    size: number;
    data: string;
}
//# sourceMappingURL=index.d.ts.map