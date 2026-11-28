import type { HttpClient } from '../core/http-client.js';
import type {
    ZenbaseBatchDeleteResult,
    ZenbaseResponse,
    ZenbaseStorageUsage,
    ZenbaseStoredFile,
    ZenbaseUploadResult,
} from '../types/index.js';

export class StorageModule {
    constructor(private readonly http: HttpClient) {}

    /**
     * Upload un fichier vers l'espace de stockage isolé de l'application.
     * Compatible navigateur (`File`, `Blob`) et Node.js (`Buffer`, `Uint8Array`, `string`).
     */
    public async upload(
        path: string,
        file: Blob | File | Uint8Array | string,
        options: { folder?: string; filename?: string; mimeType?: string } = {},
    ): Promise<ZenbaseUploadResult> {
        const formData = new FormData();
        const inferredName = options.filename ?? (path.split('/').pop() || 'upload.bin');

        let blobToUpload: Blob;

        if (typeof Blob !== 'undefined' && file instanceof Blob) {
            blobToUpload = file;
        } else if (typeof file === 'string') {
            blobToUpload = new Blob([file], {
                type: options.mimeType ?? 'text/plain',
            });
        } else {
            blobToUpload = new Blob([file as unknown as BlobPart], {
                type: options.mimeType ?? 'application/octet-stream',
            });
        }

        formData.append('file', blobToUpload, inferredName);
        formData.append('path', path);

        if (options.folder) {
            formData.append('folder', options.folder);
        }

        const response = await this.http.uploadMultipart<ZenbaseStoredFile>(
            '/storage/upload',
            formData,
        );

        const stored = response.data;
        const publicUrl =
            (typeof response.url === 'string' ? response.url : null) ??
            (typeof response.fileUrl === 'string' ? response.fileUrl : null) ??
            stored?.url ??
            null;

        return {
            url: publicUrl,
            fileUrl: publicUrl,
            data: stored,
            error: response.error,
        };
    }

    /**
     * Liste les fichiers stockés pour l'application courante.
     */
    public async list(folder?: string): Promise<ZenbaseResponse<ZenbaseStoredFile[]>> {
        return this.http.request<ZenbaseStoredFile[]>('GET', '/storage/files', {
            query: folder ? { folder } : undefined,
        });
    }

    /**
     * Récupère l'utilisation actuelle du stockage et le quota maximal attribué au propriétaire du compte.
     */
    public async getUsage(): Promise<ZenbaseResponse<ZenbaseStorageUsage>> {
        return this.http.request<ZenbaseStorageUsage>('GET', '/storage/usage');
    }

    /**
     * Construit l'URL publique directe d'un fichier à partir de son UUID, son chemin tenant ou son URL.
     */
    public getPublicUrl(fileIdOrPath: string): string {
        if (/^https?:\/\//i.test(fileIdOrPath)) {
            return fileIdOrPath;
        }

        const clean = fileIdOrPath.replace(/^\/+/, '');
        const origin = this.http.getOriginUrl();

        if (clean.startsWith('storage/')) {
            return `${origin}/${clean}`;
        }

        if (clean.startsWith('tenants/')) {
            return `${origin}/storage/${clean}`;
        }

        return `${origin}/storage/files/${encodeURIComponent(clean)}`;
    }

    /**
     * Construit l'URL de téléchargement forcé (`?download=1`) d'un fichier.
     */
    public getDownloadUrl(fileIdOrPath: string): string {
        const base = this.getPublicUrl(fileIdOrPath);

        return base.includes('?') ? `${base}&download=1` : `${base}?download=1`;
    }

    /**
     * Télécharge le contenu binaire d'un fichier sous forme de `Blob`.
     */
    public async download(fileIdOrPath: string): Promise<ZenbaseResponse<Blob>> {
        return this.http.downloadBlob(this.getDownloadUrl(fileIdOrPath));
    }

    /**
     * Supprime un fichier par son identifiant UUID ou son chemin.
     */
    public async delete(
        fileIdOrPath: string,
    ): Promise<ZenbaseResponse<{ deleted: boolean; file: string }>> {
        return this.http.request<{ deleted: boolean; file: string }>(
            'DELETE',
            `/storage/files/${encodeURIComponent(fileIdOrPath)}`,
        );
    }

    /**
     * Supprime plusieurs fichiers en parallèle et retourne le récapitulatif des succès et échecs.
     */
    public async deleteMany(
        fileIdsOrPaths: string[],
    ): Promise<ZenbaseResponse<ZenbaseBatchDeleteResult>> {
        const deleted: string[] = [];
        const failed: Array<{ file: string; error: string }> = [];

        await Promise.all(
            fileIdsOrPaths.map(async (item) => {
                const res = await this.delete(item);
                if (res.error) {
                    failed.push({ file: item, error: res.error });
                } else {
                    deleted.push(item);
                }
            }),
        );

        return {
            data: { deleted, failed },
            error: failed.length > 0 ? `${failed.length} fichier(s) n'ont pas pu être supprimés.` : null,
        };
    }
}
