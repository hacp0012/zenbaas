export class StorageModule {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Upload un fichier vers l'espace de stockage isolé de l'application.
     * Compatible navigateur (`File`, `Blob`) et Node.js (`Buffer`, `Uint8Array`, `string`).
     */
    async upload(path, file, options = {}) {
        const formData = new FormData();
        const inferredName = options.filename ?? (path.split('/').pop() || 'upload.bin');
        let blobToUpload;
        if (typeof Blob !== 'undefined' && file instanceof Blob) {
            blobToUpload = file;
        }
        else if (typeof file === 'string') {
            blobToUpload = new Blob([file], {
                type: options.mimeType ?? 'text/plain',
            });
        }
        else {
            blobToUpload = new Blob([file], {
                type: options.mimeType ?? 'application/octet-stream',
            });
        }
        formData.append('file', blobToUpload, inferredName);
        formData.append('path', path);
        if (options.folder) {
            formData.append('folder', options.folder);
        }
        const response = await this.http.uploadMultipart('/storage/upload', formData);
        const stored = response.data;
        const publicUrl = (typeof response.url === 'string' ? response.url : null) ??
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
    async list(folder) {
        return this.http.request('GET', '/storage/files', {
            query: folder ? { folder } : undefined,
        });
    }
    /**
     * Récupère l'utilisation actuelle du stockage et le quota maximal attribué au propriétaire du compte.
     */
    async getUsage() {
        return this.http.request('GET', '/storage/usage');
    }
    /**
     * Construit l'URL publique directe d'un fichier à partir de son UUID, son chemin tenant ou son URL.
     */
    getPublicUrl(fileIdOrPath) {
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
    getDownloadUrl(fileIdOrPath) {
        const base = this.getPublicUrl(fileIdOrPath);
        return base.includes('?') ? `${base}&download=1` : `${base}?download=1`;
    }
    /**
     * Télécharge le contenu binaire d'un fichier sous forme de `Blob`.
     */
    async download(fileIdOrPath) {
        return this.http.downloadBlob(this.getDownloadUrl(fileIdOrPath));
    }
    /**
     * Supprime un fichier par son identifiant UUID ou son chemin.
     */
    async delete(fileIdOrPath) {
        return this.http.request('DELETE', `/storage/files/${encodeURIComponent(fileIdOrPath)}`);
    }
    /**
     * Supprime plusieurs fichiers en parallèle et retourne le récapitulatif des succès et échecs.
     */
    async deleteMany(fileIdsOrPaths) {
        const deleted = [];
        const failed = [];
        await Promise.all(fileIdsOrPaths.map(async (item) => {
            const res = await this.delete(item);
            if (res.error) {
                failed.push({ file: item, error: res.error });
            }
            else {
                deleted.push(item);
            }
        }));
        return {
            data: { deleted, failed },
            error: failed.length > 0 ? `${failed.length} fichier(s) n'ont pas pu être supprimés.` : null,
        };
    }
}
//# sourceMappingURL=storage.js.map