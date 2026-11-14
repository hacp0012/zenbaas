import { HttpClient } from './core/http-client.js';
import { AuthModule } from './modules/auth.js';
import { CollectionQueryBuilder, DatabaseModule, ZenbaseBlob } from './modules/database.js';
import { FunctionsModule } from './modules/functions.js';
import { StorageModule } from './modules/storage.js';
import type { ZenbaseConfig } from './types/index.js';
export declare class Zenbase {
    private readonly http;
    readonly database: DatabaseModule;
    readonly storage: StorageModule;
    readonly auth: AuthModule;
    readonly functions: FunctionsModule;
    readonly blob: typeof ZenbaseBlob;
    constructor(config: ZenbaseConfig);
    /**
     * Raccourci direct pour interagir avec une collection NoSQL (`zb.collection('todos')`).
     */
    collection<T = Record<string, unknown>>(name: string): CollectionQueryBuilder<T>;
}
/**
 * Alias de `Zenbase` pour la compatibilité avec `new BaaSClient({ endpoint, apiKey })`.
 */
export declare class BaaSClient extends Zenbase {
}
export { AuthModule, CollectionQueryBuilder, DatabaseModule, FunctionsModule, HttpClient, StorageModule, ZenbaseBlob, };
export type * from './types/index.js';
export default Zenbase;
//# sourceMappingURL=index.d.ts.map