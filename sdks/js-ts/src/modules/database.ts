import type { HttpClient } from '../core/http-client.js';
import type {
    FilterOperator,
    QueryFilter,
    ZenbaseBlobValue,
    ZenbaseCollectionSchema,
    ZenbaseCollectionSummary,
    ZenbaseDocument,
    ZenbasePaginatedResult,
    ZenbasePaginateOptions,
    ZenbaseQueryResult,
    ZenbaseResponse,
} from '../types/index.js';

/**
 * Utilitaire officiel Zenbase pour encoder/décoder des champs binaires BLOB dans la base NoSQL JSON.
 */
export class ZenbaseBlob {
    /**
     * Crée un objet BLOB Zenbase à partir d'une chaîne Base64 ou Data URL.
     */
    public static fromBase64(
        base64OrDataUrl: string,
        mimeType = 'application/octet-stream',
        name: string | null = null,
    ): ZenbaseBlobValue {
        const clean = base64OrDataUrl.replace(/^data:[^;]+;base64,/, '').trim();
        const bytes = ZenbaseBlob.decodeBase64ToBytes(clean);

        return {
            __type: 'blob',
            mime_type: mimeType || 'application/octet-stream',
            name,
            size: bytes.byteLength,
            data: clean,
        };
    }

    /**
     * Crée un objet BLOB Zenbase à partir d'un `Uint8Array` ou `ArrayBuffer`.
     */
    public static fromUint8Array(
        bytes: Uint8Array | ArrayBuffer,
        mimeType = 'application/octet-stream',
        name: string | null = null,
    ): ZenbaseBlobValue {
        const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        const base64 = ZenbaseBlob.encodeBytesToBase64(view);

        return {
            __type: 'blob',
            mime_type: mimeType || 'application/octet-stream',
            name,
            size: view.byteLength,
            data: base64,
        };
    }

    /**
     * Crée un objet BLOB Zenbase à partir d'une chaîne de texte UTF-8.
     */
    public static fromText(
        text: string,
        mimeType = 'text/plain;charset=utf-8',
        name: string | null = null,
    ): ZenbaseBlobValue {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);

        return ZenbaseBlob.fromUint8Array(bytes, mimeType, name);
    }

    /**
     * Crée un objet BLOB Zenbase à partir d'une instance `Blob` ou `File` Web/Node.
     */
    public static async fromBlob(
        blob: Blob,
        name?: string | null,
    ): Promise<ZenbaseBlobValue> {
        const buffer = await blob.arrayBuffer();
        const inferredName =
            name ??
            (typeof (blob as { name?: unknown }).name === 'string'
                ? ((blob as unknown as { name: string }).name)
                : null);

        return ZenbaseBlob.fromUint8Array(
            new Uint8Array(buffer),
            blob.type || 'application/octet-stream',
            inferredName,
        );
    }

    /**
     * Vérifie si une valeur correspond à un champ BLOB Zenbase.
     */
    public static isBlob(value: unknown): value is ZenbaseBlobValue {
        if (!value || typeof value !== 'object') {
            return false;
        }
        const candidate = value as Record<string, unknown>;

        return (
            candidate.__type === 'blob' &&
            typeof candidate.data === 'string' &&
            typeof candidate.mime_type === 'string'
        );
    }

    /**
     * Convertit un champ BLOB Zenbase en `Uint8Array`.
     */
    public static toUint8Array(blob: ZenbaseBlobValue): Uint8Array {
        return ZenbaseBlob.decodeBase64ToBytes(blob.data);
    }

    /**
     * Convertit un champ BLOB Zenbase en chaîne UTF-8.
     */
    public static toText(blob: ZenbaseBlobValue): string {
        const decoder = new TextDecoder();

        return decoder.decode(ZenbaseBlob.toUint8Array(blob));
    }

    /**
     * Convertit un champ BLOB Zenbase en Data URL (`data:<mime>;base64,...`) utilisable dans `<img>`, `<audio>`, etc.
     */
    public static toDataUrl(blob: ZenbaseBlobValue): string {
        const mime = blob.mime_type || 'application/octet-stream';

        return `data:${mime};base64,${blob.data}`;
    }

    private static encodeBytesToBase64(bytes: Uint8Array): string {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(bytes).toString('base64');
        }
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        return btoa(binary);
    }

    private static decodeBase64ToBytes(base64: string): Uint8Array {
        if (typeof Buffer !== 'undefined') {
            return new Uint8Array(Buffer.from(base64, 'base64'));
        }
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
    }
}

export class CollectionQueryBuilder<T = Record<string, unknown>> {
    private filters: QueryFilter[] = [];
    private sortField?: string;
    private sortDirection: 'asc' | 'desc' = 'asc';
    private limitValue?: number;
    private offsetValue?: number;

    constructor(
        private readonly http: HttpClient,
        private readonly collectionName: string,
    ) {}

    /**
     * Ajoute un filtre sur un champ JSON du document (ex: `.where('inStock', '==', true)`).
     */
    public where(field: string, operator: FilterOperator, value?: unknown): this {
        if (arguments.length === 2) {
            this.filters.push({
                field,
                operator: '==',
                value: operator,
            });
        } else {
            this.filters.push({
                field,
                operator,
                value,
            });
        }

        return this;
    }

    /**
     * Raccourci pour `.where(field, 'in', values)`.
     */
    public whereIn(field: string, values: unknown[]): this {
        return this.where(field, 'in', values);
    }

    /**
     * Raccourci pour `.where(field, 'contains', value)`.
     */
    public whereContains(field: string, value: string): this {
        return this.where(field, 'contains', value);
    }

    /**
     * Trie les documents par un champ JSON ou une colonne système (`created_at`, `updated_at`, `id`).
     */
    public orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
        this.sortField = field;
        this.sortDirection = direction;

        return this;
    }

    /**
     * Limite le nombre de documents retournés.
     */
    public limit(count: number): this {
        this.limitValue = count;

        return this;
    }

    /**
     * Décale la pagination d'un nombre de documents.
     */
    public offset(count: number): this {
        this.offsetValue = count;

        return this;
    }

    /**
     * Exécute la requête et retourne les documents correspondants.
     * Supporte à la fois `const items = await zb.collection('...').get()`
     * et `const { data, error } = await zb.collection('...').get()`.
     */
    public async get(): Promise<ZenbaseQueryResult<T>> {
        const query: Record<string, string | number | undefined> = {};

        if (this.filters.length > 0) {
            query.where = JSON.stringify(this.filters);
        }
        if (this.sortField) {
            query.orderBy = this.sortField;
            query.direction = this.sortDirection;
        }
        if (this.limitValue !== undefined) {
            query.limit = this.limitValue;
        }
        if (this.offsetValue !== undefined) {
            query.offset = this.offsetValue;
        }

        const response = await this.http.request<Array<ZenbaseDocument<T>>>(
            'GET',
            `/collections/${encodeURIComponent(this.collectionName)}/records`,
            { query },
        );

        const records = Array.isArray(response.data) ? response.data : [];

        return Object.assign([...records], {
            data: records,
            error: response.error,
        });
    }

    /**
     * Alias de `.get()` pour la syntaxe `baas.database.from('users').select()`.
     */
    public async select(): Promise<ZenbaseQueryResult<T>> {
        return this.get();
    }

    /**
     * Retourne uniquement le premier document correspondant aux filtres et au tri courant (ou `null`).
     */
    public async first(): Promise<ZenbaseResponse<ZenbaseDocument<T> | null>> {
        const previousLimit = this.limitValue;
        this.limitValue = 1;
        const result = await this.get();
        this.limitValue = previousLimit;

        return {
            data: result.data[0] ?? null,
            error: result.error,
        };
    }

    /**
     * Compte le nombre de documents correspondant aux filtres courants sans transférer les documents.
     */
    public async count(): Promise<ZenbaseResponse<number>> {
        const query: Record<string, string | undefined> = {};

        if (this.filters.length > 0) {
            query.where = JSON.stringify(this.filters);
        }

        const response = await this.http.request<{ collection: string; count: number }>(
            'GET',
            `/collections/${encodeURIComponent(this.collectionName)}/count`,
            { query },
        );

        return {
            data: response.data ? response.data.count : null,
            error: response.error,
        };
    }

    /**
     * Vérifie si un document existe (par son `id` ou selon les filtres courants).
     */
    public async exists(id?: string): Promise<ZenbaseResponse<boolean>> {
        if (id) {
            const response = await this.find(id);
            if (response.data) {
                return { data: true, error: null };
            }

            return { data: false, error: null };
        }

        const counted = await this.count();

        return {
            data: counted.data !== null ? counted.data > 0 : null,
            error: counted.error,
        };
    }

    /**
     * Pagine les documents de la collection côté serveur avec recherche plein-texte optionnelle.
     */
    public async paginate(
        options: ZenbasePaginateOptions = {},
    ): Promise<ZenbaseResponse<ZenbasePaginatedResult<T>>> {
        return this.http.request<ZenbasePaginatedResult<T>>(
            'GET',
            `/collections/${encodeURIComponent(this.collectionName)}/paginate`,
            {
                query: {
                    page: options.page ?? 1,
                    per_page: options.perPage ?? 25,
                    search: options.search,
                    orderBy: options.orderBy ?? this.sortField,
                    direction: options.direction ?? this.sortDirection,
                },
            },
        );
    }

    /**
     * Récupère un document unique par son identifiant UUID.
     */
    public async find(id: string): Promise<ZenbaseResponse<ZenbaseDocument<T>>> {
        return this.http.request<ZenbaseDocument<T>>(
            'GET',
            `/collections/${encodeURIComponent(this.collectionName)}/records/${encodeURIComponent(id)}`,
        );
    }

    /**
     * Crée un nouveau document JSON dans la collection.
     */
    public async create(
        document: T,
    ): Promise<ZenbaseDocument<T> & ZenbaseResponse<ZenbaseDocument<T>>> {
        const response = await this.http.request<ZenbaseDocument<T>>(
            'POST',
            `/collections/${encodeURIComponent(this.collectionName)}/records`,
            { body: document },
        );

        const created = response.data ?? ({} as ZenbaseDocument<T>);

        return Object.assign({}, created, {
            data: response.data,
            error: response.error,
        });
    }

    /**
     * Met à jour un document existant par son identifiant UUID.
     */
    public async update(
        id: string,
        partialDocument: Partial<T>,
        replace = false,
    ): Promise<ZenbaseResponse<ZenbaseDocument<T>>> {
        return this.http.request<ZenbaseDocument<T>>(
            'PATCH',
            `/collections/${encodeURIComponent(this.collectionName)}/records/${encodeURIComponent(id)}`,
            {
                body: {
                    ...partialDocument,
                    _replace: replace,
                },
            },
        );
    }

    /**
     * Remplace intégralement le contenu JSON d'un document existant (équivalent à `.update(id, doc, true)`).
     */
    public async replace(
        id: string,
        document: T,
    ): Promise<ZenbaseResponse<ZenbaseDocument<T>>> {
        return this.update(id, document, true);
    }

    /**
     * Met à jour un document s'il existe déjà sous cet `id`, ou le crée automatiquement sinon.
     */
    public async upsert(
        id: string,
        document: T,
        replace = false,
    ): Promise<ZenbaseResponse<ZenbaseDocument<T>>> {
        return this.http.request<ZenbaseDocument<T>>(
            'PUT',
            `/collections/${encodeURIComponent(this.collectionName)}/records/${encodeURIComponent(id)}`,
            {
                body: {
                    ...document,
                    _replace: replace,
                    _upsert: true,
                },
            },
        );
    }

    /**
     * Supprime un document par son identifiant UUID.
     */
    public async delete(id: string): Promise<ZenbaseResponse<{ deleted: boolean; id: string }>> {
        return this.http.request<{ deleted: boolean; id: string }>(
            'DELETE',
            `/collections/${encodeURIComponent(this.collectionName)}/records/${encodeURIComponent(id)}`,
        );
    }

    /**
     * Récupère le schéma optionnel défini sur la collection (ou `null` si Schema-less).
     */
    public async getSchema(): Promise<
        ZenbaseResponse<{ collection: string; schema: ZenbaseCollectionSchema | null }>
    > {
        return this.http.request<{ collection: string; schema: ZenbaseCollectionSchema | null }>(
            'GET',
            `/collections/${encodeURIComponent(this.collectionName)}/schema`,
        );
    }

    /**
     * Définit ou supprime (avec `null`) le schéma de validation de la collection.
     */
    public async setSchema(
        schema: ZenbaseCollectionSchema | null,
    ): Promise<ZenbaseResponse<{ collection: string; schema: ZenbaseCollectionSchema | null }>> {
        return this.http.request<{ collection: string; schema: ZenbaseCollectionSchema | null }>(
            'PUT',
            `/collections/${encodeURIComponent(this.collectionName)}/schema`,
            { body: { schema } },
        );
    }

    /**
     * Supprime cette collection ainsi que tous ses documents.
     */
    public async deleteCollection(): Promise<
        ZenbaseResponse<{ deleted: boolean; collection: string }>
    > {
        return this.http.request<{ deleted: boolean; collection: string }>(
            'DELETE',
            `/collections/${encodeURIComponent(this.collectionName)}`,
        );
    }
}

export class DatabaseModule {
    public readonly blob = ZenbaseBlob;

    constructor(private readonly http: HttpClient) {}

    /**
     * Sélectionne une collection NoSQL pour construire une requête ou insérer un document.
     */
    public collection<T = Record<string, unknown>>(name: string): CollectionQueryBuilder<T> {
        return new CollectionQueryBuilder<T>(this.http, name);
    }

    /**
     * Alias de `collection(name)` permettant d'écrire `baas.database.from('users').select()`.
     */
    public from<T = Record<string, unknown>>(name: string): CollectionQueryBuilder<T> {
        return this.collection<T>(name);
    }

    /**
     * Liste toutes les collections de l'application courante.
     */
    public async listCollections(): Promise<ZenbaseResponse<ZenbaseCollectionSummary[]>> {
        return this.http.request<ZenbaseCollectionSummary[]>('GET', '/collections');
    }

    /**
     * Crée explicitement une collection NoSQL (avec un schéma de validation optionnel).
     */
    public async createCollection(
        name: string,
        schema?: ZenbaseCollectionSchema | null,
    ): Promise<ZenbaseResponse<{ name: string; schema: ZenbaseCollectionSchema | null }>> {
        return this.http.request<{ name: string; schema: ZenbaseCollectionSchema | null }>(
            'POST',
            '/collections',
            {
                body: {
                    name,
                    schema: schema ?? null,
                },
            },
        );
    }

    /**
     * Supprime définitivement une collection et l'ensemble de ses documents.
     */
    public async deleteCollection(
        name: string,
    ): Promise<ZenbaseResponse<{ deleted: boolean; collection: string }>> {
        return this.http.request<{ deleted: boolean; collection: string }>(
            'DELETE',
            `/collections/${encodeURIComponent(name)}`,
        );
    }
}
