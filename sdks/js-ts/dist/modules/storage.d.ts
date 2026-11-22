import type { HttpClient } from '../core/http-client.js';
import type { ZenbaseBatchDeleteResult, ZenbaseResponse, ZenbaseStorageUsage, ZenbaseStoredFile, ZenbaseUploadResult } from '../types/index.js';
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
     * Récupère l'utilisation actuelle du stockage et le quota maximal attribué au propriétaire du compte.
     */
    getUsage(): Promise<ZenbaseResponse<ZenbaseStorageUsage>>;
    /**
     * Construit l'URL publique directe d'un fichier à partir de son UUID, son chemin tenant ou son URL.
     */
    getPublicUrl(fileIdOrPath: string): string;
    /**
     * Construit l'URL de téléchargement forcé (`?download=1`) d'un fichier.
     */
    getDownloadUrl(fileIdOrPath: string): string;
    /**
     * Télécharge le contenu binaire d'un fichier sous forme de `Blob`.
     */
    download(fileIdOrPath: string): Promise<ZenbaseResponse<Blob>>;
    /**
     * Supprime un fichier par son identifiant UUID ou son chemin.
     */
    delete(fileIdOrPath: string): Promise<ZenbaseResponse<{
        deleted: boolean;
        file: string;
    }>>;
    /**
     * Supprime plusieurs fichiers en parallèle et retourne le récapitulatif des succès et échecs.
     */
    deleteMany(fileIdsOrPaths: string[]): Promise<ZenbaseResponse<ZenbaseBatchDeleteResult>>;
}
//# sourceMappingURL=storage.d.ts.map