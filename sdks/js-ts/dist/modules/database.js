/**
 * Utilitaire officiel Zenbase pour encoder/décoder des champs binaires BLOB dans la base NoSQL JSON.
 */
export class ZenbaseBlob {
    /**
     * Crée un objet BLOB Zenbase à partir d'une chaîne Base64 ou Data URL.
     */
    static fromBase64(base64OrDataUrl, mimeType = 'application/octet-stream', name = null) {
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
    static fromUint8Array(bytes, mimeType = 'application/octet-stream', name = null) {
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
    static fromText(text, mimeType = 'text/plain;charset=utf-8', name = null) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);
        return ZenbaseBlob.fromUint8Array(bytes, mimeType, name);
    }
    /**
     * Crée un objet BLOB Zenbase à partir d'une instance `Blob` ou `File` Web/Node.
     */
    static async fromBlob(blob, name) {
        const buffer = await blob.arrayBuffer();
        const inferredName = name ??
            (typeof blob.name === 'string'
                ? (blob.name)
                : null);
        return ZenbaseBlob.fromUint8Array(new Uint8Array(buffer), blob.type || 'application/octet-stream', inferredName);
    }
    /**
     * Vérifie si une valeur correspond à un champ BLOB Zenbase.
     */
    static isBlob(value) {
        if (!value || typeof value !== 'object') {
            return false;
        }
        const candidate = value;
        return (candidate.__type === 'blob' &&
            typeof candidate.data === 'string' &&
            typeof candidate.mime_type === 'string');
    }
    /**
     * Convertit un champ BLOB Zenbase en `Uint8Array`.
     */
    static toUint8Array(blob) {
        return ZenbaseBlob.decodeBase64ToBytes(blob.data);
    }
    /**
     * Convertit un champ BLOB Zenbase en chaîne UTF-8.
     */
    static toText(blob) {
        const decoder = new TextDecoder();
        return decoder.decode(ZenbaseBlob.toUint8Array(blob));
    }
    /**
     * Convertit un champ BLOB Zenbase en Data URL (`data:<mime>;base64,...`) utilisable dans `<img>`, `<audio>`, etc.
     */
    static toDataUrl(blob) {
        const mime = blob.mime_type || 'application/octet-stream';
        return `data:${mime};base64,${blob.data}`;
    }
    static encodeBytesToBase64(bytes) {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(bytes).toString('base64');
        }
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    static decodeBase64ToBytes(base64) {
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
export class CollectionQueryBuilder {
    http;
    collectionName;
    filters = [];
    sortField;
    sortDirection = 'asc';
    limitValue;
    offsetValue;
    constructor(http, collectionName) {
        this.http = http;
        this.collectionName = collectionName;
    }
    /**
     * Ajoute un filtre sur un champ JSON du document (ex: `.where('inStock', '==', true)`).
     */
    where(field, operator, value) {
        if (arguments.length === 2) {
            this.filters.push({
                field,
                operator: '==',
                value: operator,
            });
        }
        else {
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
    whereIn(field, values) {
        return this.where(field, 'in', values);
    }
    /**
     * Raccourci pour `.where(field, 'contains', value)`.
     */
    whereContains(field, value) {
        return this.where(field, 'contains', value);
    }
    /**
     * Trie les documents par un champ JSON ou une colonne système (`created_at`, `updated_at`, `id`).
     */
    orderBy(field, direction = 'asc') {
        this.sortField = field;
        this.sortDirection = direction;
        return this;
    }
    /**
     * Limite le nombre de documents retournés.
     */
    limit(count) {
        this.limitValue = count;
        return this;
    }
    /**
     * Décale la pagination d'un nombre de documents.
     */
    offset(count) {
        this.offsetValue = count;
        return this;
    }
    /**
     * Exécute la requête et retourne les documents correspondants.
     * Supporte à la fois `const items = await zb.collection('...').get()`
     * et `const { data, error } = await zb.collection('...').get()`.
     */
    async get() {
        const query = {};
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
        const response = await this.http.request('GET', `/collections/${encodeURIComponent(this.collectionName)}/records`, { query });
        const records = Array.isArray(response.data) ? response.data : [];
        return Object.assign([...records], {
            data: records,
            error: response.error,
        });
    }
    /**
     * Alias de `.get()` pour la syntaxe `baas.database.from('users').select()`.
     */
    async select() {
        return this.get();
    }
    /**
     * Retourne uniquement le premier document correspondant aux filtres et au tri courant (ou `null`).
     */
    async first() {
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
    async count() {
        const query = {};
        if (this.filters.length > 0) {
            query.where = JSON.stringify(this.filters);
        }
        const response = await this.http.request('GET', `/collections/${encodeURIComponent(this.collectionName)}/count`, { query });
        return {
            data: response.data ? response.data.count : null,
            error: response.error,
        };
    }
    /**
     * Vérifie si un document existe (par son `id` ou selon les filtres courants).
     */
    async exists(id) {
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
    async paginate(options = {}) {
        return this.http.request('GET', `/collections/${encodeURIComponent(this.collectionName)}/paginate`, {
            query: {
                page: options.page ?? 1,
                per_page: options.perPage ?? 25,
                search: options.search,
                orderBy: options.orderBy ?? this.sortField,
                direction: options.direction ?? this.sortDirection,
            },
        });
    }
    /**
     * Récupère un document unique par son identifiant UUID.
     */
    async find(id) {
        return this.http.request('GET', `/collections/${encodeURIComponent(this.collectionName)}/records/${encodeURIComponent(id)}`);
    }
    /**
     * Crée un nouveau document JSON dans la collection.
     */
    async create(document) {
        const response = await this.http.request('POST', `/collections/${encodeURIComponent(this.collectionName)}/records`, { body: document });
        const created = response.data ?? {};
        return Object.assign({}, created, {
            data: response.data,
            error: response.error,
        });
    }
    /**
     * Met à jour un document existant par son identifiant UUID.
     */
    async update(id, partialDocument, replace = false) {
        return this.http.request('PATCH', `/collections/${encodeURIComponent(this.collectionName)}/records/${encodeURIComponent(id)}`, {
            body: {
                ...partialDocument,
                _replace: replace,
            },
        });
    }
    /**
     * Remplace intégralement le contenu JSON d'un document existant (équivalent à `.update(id, doc, true)`).
     */
    async replace(id, document) {
        return this.update(id, document, true);
    }
    /**
     * Met à jour un document s'il existe déjà sous cet `id`, ou le crée automatiquement sinon.
     */
    async upsert(id, document, replace = false) {
        return this.http.request('PUT', `/collections/${encodeURIComponent(this.collectionName)}/records/${encodeURIComponent(id)}`, {
            body: {
                ...document,
                _replace: replace,
                _upsert: true,
            },
        });
    }
    /**
     * Supprime un document par son identifiant UUID.
     */
    async delete(id) {
        return this.http.request('DELETE', `/collections/${encodeURIComponent(this.collectionName)}/records/${encodeURIComponent(id)}`);
    }
    /**
     * Récupère le schéma optionnel défini sur la collection (ou `null` si Schema-less).
     */
    async getSchema() {
        return this.http.request('GET', `/collections/${encodeURIComponent(this.collectionName)}/schema`);
    }
    /**
     * Définit ou supprime (avec `null`) le schéma de validation de la collection.
     */
    async setSchema(schema) {
        return this.http.request('PUT', `/collections/${encodeURIComponent(this.collectionName)}/schema`, { body: { schema } });
    }
    /**
     * Supprime cette collection ainsi que tous ses documents.
     */
    async deleteCollection() {
        return this.http.request('DELETE', `/collections/${encodeURIComponent(this.collectionName)}`);
    }
}
export class DatabaseModule {
    http;
    blob = ZenbaseBlob;
    constructor(http) {
        this.http = http;
    }
    /**
     * Sélectionne une collection NoSQL pour construire une requête ou insérer un document.
     */
    collection(name) {
        return new CollectionQueryBuilder(this.http, name);
    }
    /**
     * Alias de `collection(name)` permettant d'écrire `baas.database.from('users').select()`.
     */
    from(name) {
        return this.collection(name);
    }
    /**
     * Liste toutes les collections de l'application courante.
     */
    async listCollections() {
        return this.http.request('GET', '/collections');
    }
    /**
     * Crée explicitement une collection NoSQL (avec un schéma de validation optionnel).
     */
    async createCollection(name, schema) {
        return this.http.request('POST', '/collections', {
            body: {
                name,
                schema: schema ?? null,
            },
        });
    }
    /**
     * Supprime définitivement une collection et l'ensemble de ses documents.
     */
    async deleteCollection(name) {
        return this.http.request('DELETE', `/collections/${encodeURIComponent(name)}`);
    }
}
//# sourceMappingURL=database.js.map