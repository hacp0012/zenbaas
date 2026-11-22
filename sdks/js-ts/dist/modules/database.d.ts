import type { HttpClient } from '../core/http-client.js';
import type { FilterOperator, ZenbaseBlobValue, ZenbaseCollectionSchema, ZenbaseCollectionSummary, ZenbaseDocument, ZenbasePaginatedResult, ZenbasePaginateOptions, ZenbaseQueryResult, ZenbaseResponse } from '../types/index.js';
/**
 * Utilitaire officiel Zenbase pour encoder/décoder des champs binaires BLOB dans la base NoSQL JSON.
 */
export declare class ZenbaseBlob {
    /**
     * Crée un objet BLOB Zenbase à partir d'une chaîne Base64 ou Data URL.
     */
    static fromBase64(base64OrDataUrl: string, mimeType?: string, name?: string | null): ZenbaseBlobValue;
    /**
     * Crée un objet BLOB Zenbase à partir d'un `Uint8Array` ou `ArrayBuffer`.
     */
    static fromUint8Array(bytes: Uint8Array | ArrayBuffer, mimeType?: string, name?: string | null): ZenbaseBlobValue;
    /**
     * Crée un objet BLOB Zenbase à partir d'une chaîne de texte UTF-8.
     */
    static fromText(text: string, mimeType?: string, name?: string | null): ZenbaseBlobValue;
    /**
     * Crée un objet BLOB Zenbase à partir d'une instance `Blob` ou `File` Web/Node.
     */
    static fromBlob(blob: Blob, name?: string | null): Promise<ZenbaseBlobValue>;
    /**
     * Vérifie si une valeur correspond à un champ BLOB Zenbase.
     */
    static isBlob(value: unknown): value is ZenbaseBlobValue;
    /**
     * Convertit un champ BLOB Zenbase en `Uint8Array`.
     */
    static toUint8Array(blob: ZenbaseBlobValue): Uint8Array;
    /**
     * Convertit un champ BLOB Zenbase en chaîne UTF-8.
     */
    static toText(blob: ZenbaseBlobValue): string;
    /**
     * Convertit un champ BLOB Zenbase en Data URL (`data:<mime>;base64,...`) utilisable dans `<img>`, `<audio>`, etc.
     */
    static toDataUrl(blob: ZenbaseBlobValue): string;
    private static encodeBytesToBase64;
    private static decodeBase64ToBytes;
}
export declare class CollectionQueryBuilder<T = Record<string, unknown>> {
    private readonly http;
    private readonly collectionName;
    private filters;
    private sortField?;
    private sortDirection;
    private limitValue?;
    private offsetValue?;
    constructor(http: HttpClient, collectionName: string);
    /**
     * Ajoute un filtre sur un champ JSON du document (ex: `.where('inStock', '==', true)`).
     */
    where(field: string, operator: FilterOperator, value?: unknown): this;
    /**
     * Raccourci pour `.where(field, 'in', values)`.
     */
    whereIn(field: string, values: unknown[]): this;
    /**
     * Raccourci pour `.where(field, 'contains', value)`.
     */
    whereContains(field: string, value: string): this;
    /**
     * Trie les documents par un champ JSON ou une colonne système (`created_at`, `updated_at`, `id`).
     */
    orderBy(field: string, direction?: 'asc' | 'desc'): this;
    /**
     * Limite le nombre de documents retournés.
     */
    limit(count: number): this;
    /**
     * Décale la pagination d'un nombre de documents.
     */
    offset(count: number): this;
    /**
     * Exécute la requête et retourne les documents correspondants.
     * Supporte à la fois `const items = await zb.collection('...').get()`
     * et `const { data, error } = await zb.collection('...').get()`.
     */
    get(): Promise<ZenbaseQueryResult<T>>;
    /**
     * Alias de `.get()` pour la syntaxe `baas.database.from('users').select()`.
     */
    select(): Promise<ZenbaseQueryResult<T>>;
    /**
     * Retourne uniquement le premier document correspondant aux filtres et au tri courant (ou `null`).
     */
    first(): Promise<ZenbaseResponse<ZenbaseDocument<T> | null>>;
    /**
     * Compte le nombre de documents correspondant aux filtres courants sans transférer les documents.
     */
    count(): Promise<ZenbaseResponse<number>>;
    /**
     * Vérifie si un document existe (par son `id` ou selon les filtres courants).
     */
    exists(id?: string): Promise<ZenbaseResponse<boolean>>;
    /**
     * Pagine les documents de la collection côté serveur avec recherche plein-texte optionnelle.
     */
    paginate(options?: ZenbasePaginateOptions): Promise<ZenbaseResponse<ZenbasePaginatedResult<T>>>;
    /**
     * Récupère un document unique par son identifiant UUID.
     */
    find(id: string): Promise<ZenbaseResponse<ZenbaseDocument<T>>>;
    /**
     * Crée un nouveau document JSON dans la collection.
     */
    create(document: T): Promise<ZenbaseDocument<T> & ZenbaseResponse<ZenbaseDocument<T>>>;
    /**
     * Met à jour un document existant par son identifiant UUID.
     */
    update(id: string, partialDocument: Partial<T>, replace?: boolean): Promise<ZenbaseResponse<ZenbaseDocument<T>>>;
    /**
     * Remplace intégralement le contenu JSON d'un document existant (équivalent à `.update(id, doc, true)`).
     */
    replace(id: string, document: T): Promise<ZenbaseResponse<ZenbaseDocument<T>>>;
    /**
     * Met à jour un document s'il existe déjà sous cet `id`, ou le crée automatiquement sinon.
     */
    upsert(id: string, document: T, replace?: boolean): Promise<ZenbaseResponse<ZenbaseDocument<T>>>;
    /**
     * Supprime un document par son identifiant UUID.
     */
    delete(id: string): Promise<ZenbaseResponse<{
        deleted: boolean;
        id: string;
    }>>;
    /**
     * Récupère le schéma optionnel défini sur la collection (ou `null` si Schema-less).
     */
    getSchema(): Promise<ZenbaseResponse<{
        collection: string;
        schema: ZenbaseCollectionSchema | null;
    }>>;
    /**
     * Définit ou supprime (avec `null`) le schéma de validation de la collection.
     */
    setSchema(schema: ZenbaseCollectionSchema | null): Promise<ZenbaseResponse<{
        collection: string;
        schema: ZenbaseCollectionSchema | null;
    }>>;
    /**
     * Supprime cette collection ainsi que tous ses documents.
     */
    deleteCollection(): Promise<ZenbaseResponse<{
        deleted: boolean;
        collection: string;
    }>>;
}
export declare class DatabaseModule {
    private readonly http;
    readonly blob: typeof ZenbaseBlob;
    constructor(http: HttpClient);
    /**
     * Sélectionne une collection NoSQL pour construire une requête ou insérer un document.
     */
    collection<T = Record<string, unknown>>(name: string): CollectionQueryBuilder<T>;
    /**
     * Alias de `collection(name)` permettant d'écrire `baas.database.from('users').select()`.
     */
    from<T = Record<string, unknown>>(name: string): CollectionQueryBuilder<T>;
    /**
     * Liste toutes les collections de l'application courante.
     */
    listCollections(): Promise<ZenbaseResponse<ZenbaseCollectionSummary[]>>;
    /**
     * Crée explicitement une collection NoSQL (avec un schéma de validation optionnel).
     */
    createCollection(name: string, schema?: ZenbaseCollectionSchema | null): Promise<ZenbaseResponse<{
        name: string;
        schema: ZenbaseCollectionSchema | null;
    }>>;
    /**
     * Supprime définitivement une collection et l'ensemble de ses documents.
     */
    deleteCollection(name: string): Promise<ZenbaseResponse<{
        deleted: boolean;
        collection: string;
    }>>;
}
//# sourceMappingURL=database.d.ts.map