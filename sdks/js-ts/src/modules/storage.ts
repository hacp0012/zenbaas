import type { HttpClient } from '../core/http-client.js';
import type {
    ZenbaseResponse,
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
}
