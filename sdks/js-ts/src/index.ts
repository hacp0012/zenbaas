import { HttpClient } from './core/http-client.js';
import { AuthModule } from './modules/auth.js';
import { CollectionQueryBuilder, DatabaseModule, ZenbaseBlob } from './modules/database.js';
import { FunctionsModule } from './modules/functions.js';
import { StorageModule } from './modules/storage.js';
import type { ZenbaseConfig } from './types/index.js';

export class Zenbase {
    private readonly http: HttpClient;

    public readonly database: DatabaseModule;
    public readonly storage: StorageModule;
    public readonly auth: AuthModule;
    public readonly functions: FunctionsModule;
    public readonly blob = ZenbaseBlob;

    constructor(config: ZenbaseConfig) {
        this.http = new HttpClient(config);
        this.database = new DatabaseModule(this.http);
        this.storage = new StorageModule(this.http);
        this.auth = new AuthModule(this.http);
        this.functions = new FunctionsModule(this.http);
    }

    /**
     * Raccourci direct pour interagir avec une collection NoSQL (`zb.collection('todos')`).
     */
    public collection<T = Record<string, unknown>>(name: string): CollectionQueryBuilder<T> {
        return this.database.collection<T>(name);
    }
}

/**
 * Alias de `Zenbase` pour la compatibilité avec `new BaaSClient({ endpoint, apiKey })`.
 */
export class BaaSClient extends Zenbase {}

export {
    AuthModule,
    CollectionQueryBuilder,
    DatabaseModule,
    FunctionsModule,
    HttpClient,
    StorageModule,
    ZenbaseBlob,
};

export type * from './types/index.js';
export default Zenbase;
