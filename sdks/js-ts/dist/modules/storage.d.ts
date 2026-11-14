import type { HttpClient } from '../core/http-client.js';
import type { ZenbaseResponse, ZenbaseStoredFile, ZenbaseUploadResult } from '../types/index.js';
export declare class StorageModule {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * Upload un fichier vers l'espace de stockage isolé de l'application.
     * Compatible navigateur (`File`, `Blob`) et Node.js (`Buffer`, `Uint8Array`, `string`).
     */
    upload(path: string, file: Blob | File | Uint8Array | string, options?: {
        folder?: string;
        filename?: string;
        mimeType?: string;
    }): Promise<ZenbaseUploadResult>;
    /**
     * Liste les fichiers stockés pour l'application courante.
     */
    list(folder?: string): Promise<ZenbaseResponse<ZenbaseStoredFile[]>>;
    /**
     * Supprime un fichier par son identifiant UUID ou son chemin.
     */
    delete(fileIdOrPath: string): Promise<ZenbaseResponse<{
        deleted: boolean;
        file: string;
    }>>;
}
//# sourceMappingURL=storage.d.ts.map