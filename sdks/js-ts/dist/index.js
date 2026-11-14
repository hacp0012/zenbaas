import { HttpClient } from './core/http-client.js';
import { AuthModule } from './modules/auth.js';
import { CollectionQueryBuilder, DatabaseModule, ZenbaseBlob } from './modules/database.js';
import { FunctionsModule } from './modules/functions.js';
import { StorageModule } from './modules/storage.js';
export class Zenbase {
    http;
    database;
    storage;
    auth;
    functions;
    blob = ZenbaseBlob;
    constructor(config) {
        this.http = new HttpClient(config);
        this.database = new DatabaseModule(this.http);
        this.storage = new StorageModule(this.http);
        this.auth = new AuthModule(this.http);
        this.functions = new FunctionsModule(this.http);
    }
    /**
     * Raccourci direct pour interagir avec une collection NoSQL (`zb.collection('todos')`).
     */
    collection(name) {
        return this.database.collection(name);
    }
}
/**
 * Alias de `Zenbase` pour la compatibilité avec `new BaaSClient({ endpoint, apiKey })`.
 */
export class BaaSClient extends Zenbase {
}
export { AuthModule, CollectionQueryBuilder, DatabaseModule, FunctionsModule, HttpClient, StorageModule, ZenbaseBlob, };
export default Zenbase;
//# sourceMappingURL=index.js.map