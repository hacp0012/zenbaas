import { Head, router, useForm } from '@inertiajs/react';
import {
    CheckSquare,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    ExternalLink,
    Eye,
    FileCode2,
    FileSpreadsheet,
    FileText,
    Film,
    Folder,
    FolderOpen,
    HardDrive,
    Image as ImageIcon,
    LayoutGrid,
    List,
    Music,
    Search,
    Square,
    Trash2,
    Upload,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { PrismCodeBlock } from '@/components/prism-code-block';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ClientAppLayout from '@/layouts/client-app-layout';
import type { ZenbaseApp, ZenbaseFile } from '@/types';

type PaginatedFiles = {
    items: ZenbaseFile[];
    total: number;
    page: number;
    per_page: number;
    last_page: number;
};

type StorageStats = {
    total_files: number;
    total_bytes: number;
    images_count: number;
};

type StorageQuota = {
    app_bytes: number;
    app_files_count: number;
    user_used_bytes: number;
    max_storage_mb: number | null;
    max_storage_bytes: number | null;
    remaining_bytes: number | null;
};

type StorageFilters = {
    search: string;
    folder: string;
    mime: string;
    sort: string;
    direction: 'asc' | 'desc';
    per_page: number;
};

function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) {
        return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getFileCategory(
    file: ZenbaseFile,
): 'image' | 'pdf' | 'video' | 'audio' | 'code' | 'other' {
    const mime = (file.mime_type || '').toLowerCase();
    const ext = (file.original_name.split('.').pop() || '').toLowerCase();

    if (mime.startsWith('image/')) {
        return 'image';
    }
    if (mime === 'application/pdf' || ext === 'pdf') {
        return 'pdf';
    }
    if (mime.startsWith('video/')) {
        return 'video';
    }
    if (mime.startsWith('audio/')) {
        return 'audio';
    }
    const binaryExtensions = [
        'zip',
        'rar',
        '7z',
        'tar',
        'gz',
        'exe',
        'dll',
        'bin',
        'iso',
        'dmg',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'ppt',
        'pptx',
        'sqlite',
        'db',
    ];

    if (binaryExtensions.includes(ext)) {
        return 'other';
    }

    if (
        [
            'json',
            'js',
            'ts',
            'tsx',
            'jsx',
            'php',
            'md',
            'txt',
            'csv',
            'html',
            'css',
            'sql',
            'yml',
            'yaml',
            'xml',
            'env',
            'log',
        ].includes(ext) ||
        mime === 'application/json' ||
        mime === 'application/javascript' ||
        mime === 'application/xml' ||
        mime.startsWith('text/')
    ) {
        return 'code';
    }

    return 'other';
}

export default function ClientAppStorage({
    app,
    paginatedFiles,
    allFolders = ['/'],
    storageStats,
    storageQuota,
    storageFilters,
}: {
    app: ZenbaseApp;
    paginatedFiles?: PaginatedFiles;
    allFolders?: string[];
    storageStats?: StorageStats;
    storageQuota?: StorageQuota;
    storageFilters?: StorageFilters;
}) {
    const files: ZenbaseFile[] = paginatedFiles?.items ?? app.files ?? [];
    const totalFilesCount =
        paginatedFiles?.total ?? storageStats?.total_files ?? files.length;

    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [searchInput, setSearchInput] = useState(
        storageFilters?.search ?? '',
    );
    const [activeFolder, setActiveFolder] = useState(
        storageFilters?.folder ?? 'all',
    );
    const [activeMime, setActiveMime] = useState(
        storageFilters?.mime ?? 'all',
    );
    const [sortBy, setSortBy] = useState(storageFilters?.sort ?? 'created_at');
    const [direction, setDirection] = useState<'asc' | 'desc'>(
        storageFilters?.direction ?? 'desc',
    );
    const [perPage, setPerPage] = useState<number>(
        storageFilters?.per_page ?? 24,
    );

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [fileToDelete, setFileToDelete] = useState<ZenbaseFile | null>(null);
    const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

    // Upload Modal
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const uploadForm = useForm<{
        files: File[];
        folder: string;
    }>({
        files: [],
        folder: activeFolder !== 'all' ? activeFolder : '/uploads',
    });

    // Rich File Preview Modal
    const [previewFile, setPreviewFile] = useState<ZenbaseFile | null>(null);
    const [previewTextContent, setPreviewTextContent] = useState<string | null>(
        null,
    );
    const [previewLoading, setPreviewLoading] = useState(false);
    const [imageZoomed, setImageZoomed] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!previewFile) {
            setPreviewTextContent(null);
            setImageZoomed(false);

            return;
        }
        const category = getFileCategory(previewFile);
        if (category === 'code') {
            setPreviewLoading(true);
            fetch(previewFile.url, {
                headers: { Accept: 'text/plain, application/json, */*' },
            })
                .then(async (res) => {
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}`);
                    }
                    const txt = await res.text();
                    if (txt.includes('\0')) {
                        return null;
                    }

                    return txt.slice(0, 50000);
                })
                .then((txt) => {
                    setPreviewTextContent(txt);
                })
                .catch(() => {
                    setPreviewTextContent(null);
                })
                .finally(() => setPreviewLoading(false));
        }
    }, [previewFile]);

    function applyFilters(
        overrides: Partial<StorageFilters & { page?: number }>,
    ) {
        router.get(
            `/dashboard/apps/${app.id}/storage`,
            {
                search: overrides.search ?? searchInput,
                folder: overrides.folder ?? activeFolder,
                mime: overrides.mime ?? activeMime,
                sort: overrides.sort ?? sortBy,
                direction: overrides.direction ?? direction,
                per_page: overrides.per_page ?? perPage,
                page: overrides.page ?? 1,
            },
            { preserveState: true, preserveScroll: true },
        );
    }

    function toggleSelectFile(id: string) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
        );
    }

    function toggleSelectAll() {
        if (selectedIds.length === files.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(files.map((f) => f.id));
        }
    }

    function handleUploadFiles(e: FormEvent) {
        e.preventDefault();
        if (uploadForm.data.files.length === 0) {
            return;
        }
        uploadForm.post(`/dashboard/apps/${app.id}/files`, {
            forceFormData: true,
            onSuccess: () => {
                uploadForm.reset();
                setUploadModalOpen(false);
            },
        });
    }

    function handleBulkDelete() {
        if (selectedIds.length === 0) {
            return;
        }
        router.delete(`/dashboard/apps/${app.id}/files-batch`, {
            data: { ids: selectedIds },
            preserveScroll: true,
            onSuccess: () => setSelectedIds([]),
        });
    }

    function copyUrl(url: string) {
        void navigator.clipboard.writeText(url);
        setCopiedUrl(url);
        setTimeout(() => setCopiedUrl(null), 2000);
    }

    function renderFileIcon(file: ZenbaseFile) {
        const cat = getFileCategory(file);
        switch (cat) {
            case 'image':
                return <ImageIcon className="size-4 text-emerald-500" />;
            case 'pdf':
                return <FileText className="size-4 text-rose-500" />;
            case 'video':
                return <Film className="size-4 text-purple-500" />;
            case 'audio':
                return <Music className="size-4 text-amber-500" />;
            case 'code':
                return <FileCode2 className="size-4 text-sky-500" />;
            default:
                return <FileSpreadsheet className="size-4 text-zinc-500" />;
        }
    }

    return (
        <>
            <Head title={`${app.name} — Gestionnaire de Fichiers Pro`} />
            <div className="space-y-4">
                {/* Storage Pro Header & KPIs */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            <HardDrive className="size-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold">
                                    Gestionnaire de Fichiers & Stockage Cloud
                                </h2>
                                <Badge
                                    variant="secondary"
                                    className="font-mono text-[10px]"
                                >
                                    {formatBytes(
                                        storageStats?.total_bytes ?? 0,
                                    )}{' '}
                                    utilisés
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Répertoire isolé{' '}
                                <code className="rounded bg-muted px-1 font-mono">
                                    storage/app/public/tenants/{app.id.slice(0, 8)}…/
                                </code>{' '}
                                · Prévisualisation multimédia & code, filtres
                                MIME et pagination haute capacité.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedIds.length > 0 && (
                            <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => setConfirmBulkDeleteOpen(true)}
                            >
                                <Trash2 className="mr-1.5 size-3.5" />
                                Supprimer la sélection ({selectedIds.length})
                            </Button>
                        )}
                        <Button
                            type="button"
                            size="sm"
                            className="bg-emerald-600 text-white hover:bg-emerald-500"
                            onClick={() => setUploadModalOpen(true)}
                        >
                            <Upload className="mr-1.5 size-4" />
                            Téléverser des Fichiers
                        </Button>
                    </div>
                </div>

                {/* Main Explorer Workspace */}
                <div className="grid min-h-[600px] overflow-hidden rounded-xl border bg-card shadow-xs lg:grid-cols-12">
                    {/* Left Folder Tree & Quick Filters */}
                    <div className="flex flex-col border-b bg-muted/20 lg:col-span-3 lg:border-r lg:border-b-0">
                        <div className="border-b px-3.5 py-2.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Arborescence Dossiers
                        </div>
                        <div className="space-y-1 p-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveFolder('all');
                                    applyFilters({ folder: 'all', page: 1 });
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition ${
                                    activeFolder === 'all'
                                        ? 'bg-emerald-600 text-white'
                                        : 'hover:bg-muted'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <FolderOpen className="size-4" />
                                    Tous les fichiers
                                </span>
                                <span className="font-mono text-[10px]">
                                    {storageStats?.total_files ?? files.length}
                                </span>
                            </button>

                            {allFolders.map((folderPath) => {
                                const isActive = activeFolder === folderPath;

                                return (
                                    <button
                                        key={folderPath}
                                        type="button"
                                        onClick={() => {
                                            setActiveFolder(folderPath);
                                            applyFilters({
                                                folder: folderPath,
                                                page: 1,
                                            });
                                        }}
                                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs transition ${
                                            isActive
                                                ? 'bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-300'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                    >
                                        <Folder className="size-3.5 shrink-0 text-amber-500" />
                                        <span className="truncate">
                                            {folderPath}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-auto border-t p-3.5 text-xs">
                            <div className="font-semibold text-foreground">
                                Statistiques Stockage
                            </div>
                            <div className="mt-2 space-y-1.5 text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>Total fichiers :</span>
                                    <span className="font-mono text-foreground">
                                        {(
                                            storageStats?.total_files ??
                                            files.length
                                        ).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Images détectées :</span>
                                    <span className="font-mono text-foreground">
                                        {(
                                            storageStats?.images_count ?? 0
                                        ).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Volume app :</span>
                                    <span className="font-mono text-foreground">
                                        {formatBytes(
                                            storageStats?.total_bytes ?? 0,
                                        )}
                                    </span>
                                </div>
                                {storageQuota && (
                                    <div className="mt-2 space-y-1.5 border-t pt-2">
                                        <div className="flex justify-between">
                                            <span>Quota compte :</span>
                                            <span className="font-mono text-foreground">
                                                {formatBytes(
                                                    storageQuota.user_used_bytes,
                                                )}{' '}
                                                /{' '}
                                                {storageQuota.max_storage_mb !==
                                                null
                                                    ? `${storageQuota.max_storage_mb} Mo`
                                                    : 'Illimité'}
                                            </span>
                                        </div>
                                        {storageQuota.max_storage_bytes !==
                                            null && (
                                            <>
                                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            storageQuota.user_used_bytes /
                                                                storageQuota.max_storage_bytes >=
                                                            0.9
                                                                ? 'bg-red-500'
                                                                : 'bg-emerald-500'
                                                        }`}
                                                        style={{
                                                            width: `${Math.min(100, Math.round((storageQuota.user_used_bytes / storageQuota.max_storage_bytes) * 100))}%`,
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-[11px]">
                                                    <span>Disponible :</span>
                                                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                                        {formatBytes(
                                                            storageQuota.remaining_bytes ??
                                                                0,
                                                        )}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Files Explorer */}
                    <div className="flex flex-col lg:col-span-9">
                        {/* Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 p-3">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    applyFilters({ page: 1 });
                                }}
                                className="flex flex-1 flex-wrap items-center gap-2"
                            >
                                <div className="relative min-w-[200px] flex-1">
                                    <Search className="pointer-events-none absolute top-2 left-2.5 size-3.5 text-muted-foreground" />
                                    <Input
                                        value={searchInput}
                                        onChange={(e) =>
                                            setSearchInput(e.target.value)
                                        }
                                        placeholder="Rechercher par nom, extension ou type MIME..."
                                        className="h-8 pl-8 text-xs"
                                    />
                                </div>

                                <select
                                    value={activeMime}
                                    onChange={(e) => {
                                        const nextMime = e.target.value;
                                        setActiveMime(nextMime);
                                        applyFilters({
                                            mime: nextMime,
                                            page: 1,
                                        });
                                    }}
                                    aria-label="Filtrer par type de fichier"
                                    className="h-8 rounded-md border bg-background px-2 text-xs"
                                >
                                    <option value="all">Tous les formats</option>
                                    <option value="image">Images</option>
                                    <option value="pdf">Documents PDF</option>
                                    <option value="code">
                                        Code / JSON / Texte
                                    </option>
                                    <option value="video">Vidéos</option>
                                    <option value="audio">Audio</option>
                                </select>

                                <select
                                    value={`${sortBy}:${direction}`}
                                    onChange={(e) => {
                                        const [s, d] = e.target.value.split(
                                            ':',
                                        ) as [string, 'asc' | 'desc'];
                                        setSortBy(s);
                                        setDirection(d);
                                        applyFilters({
                                            sort: s,
                                            direction: d,
                                            page: 1,
                                        });
                                    }}
                                    aria-label="Trier les fichiers"
                                    className="h-8 rounded-md border bg-background px-2 text-xs"
                                >
                                    <option value="created_at:desc">
                                        Plus récents
                                    </option>
                                    <option value="created_at:asc">
                                        Plus anciens
                                    </option>
                                    <option value="size:desc">
                                        Taille (Décroissant)
                                    </option>
                                    <option value="size:asc">
                                        Taille (Croissant)
                                    </option>
                                    <option value="original_name:asc">
                                        Nom (A → Z)
                                    </option>
                                </select>

                                <select
                                    value={perPage}
                                    onChange={(e) => {
                                        const nextPer = Number(e.target.value);
                                        setPerPage(nextPer);
                                        applyFilters({
                                            per_page: nextPer,
                                            page: 1,
                                        });
                                    }}
                                    aria-label="Fichiers par page"
                                    className="h-8 rounded-md border bg-background px-2 font-mono text-xs"
                                >
                                    <option value={12}>12 / page</option>
                                    <option value={24}>24 / page</option>
                                    <option value={48}>48 / page</option>
                                    <option value={96}>96 / page</option>
                                </select>
                            </form>

                            <div className="inline-flex rounded-lg border bg-background p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className={`rounded-md p-1.5 ${
                                        viewMode === 'table'
                                            ? 'bg-emerald-600 text-white'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    title="Vue Liste Détaillée"
                                >
                                    <List className="size-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`rounded-md p-1.5 ${
                                        viewMode === 'grid'
                                            ? 'bg-emerald-600 text-white'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    title="Vue Grille Vignettes"
                                >
                                    <LayoutGrid className="size-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Files View */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {files.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <FolderOpen className="size-10 text-muted-foreground/50" />
                                    <p className="mt-3 text-sm font-semibold">
                                        Aucun fichier dans cette vue
                                    </p>
                                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                                        Téléversez des fichiers depuis le bouton
                                        ci-dessus ou via{' '}
                                        <code className="font-mono">
                                            zb.storage.upload()
                                        </code>
                                        .
                                    </p>
                                </div>
                            ) : viewMode === 'table' ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b text-[11px] text-muted-foreground uppercase">
                                                <th className="w-8 pb-2.5">
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            toggleSelectAll
                                                        }
                                                        className="text-muted-foreground hover:text-foreground"
                                                    >
                                                        {selectedIds.length ===
                                                            files.length &&
                                                        files.length > 0 ? (
                                                            <CheckSquare className="size-4 text-emerald-600" />
                                                        ) : (
                                                            <Square className="size-4" />
                                                        )}
                                                    </button>
                                                </th>
                                                <th className="pb-2.5">
                                                    Fichier
                                                </th>
                                                <th className="pb-2.5">
                                                    Dossier
                                                </th>
                                                <th className="pb-2.5">
                                                    Type MIME
                                                </th>
                                                <th className="pb-2.5">
                                                    Taille
                                                </th>
                                                <th className="pb-2.5 text-right">
                                                    Outils & Prévisualisation
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {files.map((file) => {
                                                const isChecked =
                                                    selectedIds.includes(
                                                        file.id,
                                                    );

                                                return (
                                                    <tr
                                                        key={file.id}
                                                        className={`transition hover:bg-muted/40 ${
                                                            isChecked
                                                                ? 'bg-emerald-500/5'
                                                                : ''
                                                        }`}
                                                    >
                                                        <td className="py-2.5">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleSelectFile(
                                                                        file.id,
                                                                    )
                                                                }
                                                            >
                                                                {isChecked ? (
                                                                    <CheckSquare className="size-4 text-emerald-600" />
                                                                ) : (
                                                                    <Square className="size-4 text-muted-foreground" />
                                                                )}
                                                            </button>
                                                        </td>
                                                        <td className="py-2.5">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setPreviewFile(
                                                                        file,
                                                                    )
                                                                }
                                                                className="flex items-center gap-2 font-medium hover:text-emerald-600 hover:underline"
                                                            >
                                                                {renderFileIcon(
                                                                    file,
                                                                )}
                                                                <span className="max-w-[220px] truncate">
                                                                    {
                                                                        file.original_name
                                                                    }
                                                                </span>
                                                            </button>
                                                        </td>
                                                        <td className="py-2.5 font-mono text-muted-foreground">
                                                            {file.folder}
                                                        </td>
                                                        <td className="py-2.5">
                                                            <Badge
                                                                variant="outline"
                                                                className="font-mono text-[10px]"
                                                            >
                                                                {file.mime_type}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-2.5 font-mono">
                                                            {formatBytes(
                                                                file.size,
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 text-right">
                                                            <div className="inline-flex items-center gap-1">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 px-2 text-xs"
                                                                    onClick={() =>
                                                                        setPreviewFile(
                                                                            file,
                                                                        )
                                                                    }
                                                                >
                                                                    <Eye className="mr-1 size-3.5 text-emerald-600" />
                                                                    Aperçu
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 px-2 text-xs"
                                                                    onClick={() =>
                                                                        copyUrl(
                                                                            file.url,
                                                                        )
                                                                    }
                                                                    title="Copier l'URL publique"
                                                                >
                                                                    <Copy className="size-3.5" />
                                                                    {copiedUrl ===
                                                                        file.url && (
                                                                        <span className="ml-1 text-[10px] text-emerald-600">
                                                                            Copié
                                                                        </span>
                                                                    )}
                                                                </Button>
                                                                <a
                                                                    href={`${file.url}?download=1`}
                                                                    download={
                                                                        file.original_name
                                                                    }
                                                                    className="inline-flex h-7 items-center rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                    title="Télécharger"
                                                                >
                                                                    <Download className="size-3.5" />
                                                                </a>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setFileToDelete(
                                                                            file,
                                                                        )
                                                                    }
                                                                    className="inline-flex h-7 items-center rounded-md px-2 text-red-500 hover:bg-red-500/10"
                                                                    title="Supprimer"
                                                                >
                                                                    <Trash2 className="size-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                                    {files.map((file) => {
                                        const cat = getFileCategory(file);

                                        return (
                                            <div
                                                key={file.id}
                                                className="group flex flex-col justify-between overflow-hidden rounded-xl border bg-background transition hover:border-emerald-500/50"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPreviewFile(file)
                                                    }
                                                    className="relative flex h-32 w-full items-center justify-center overflow-hidden bg-muted/40"
                                                >
                                                    {cat === 'image' ? (
                                                        <img
                                                            src={file.url}
                                                            alt={
                                                                file.original_name
                                                            }
                                                            className="h-full w-full object-cover transition group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                                                            {renderFileIcon(
                                                                file,
                                                            )}
                                                            <span className="font-mono text-[10px] uppercase">
                                                                {file.original_name
                                                                    .split('.')
                                                                    .pop()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </button>
                                                <div className="p-2.5 text-xs">
                                                    <div className="truncate font-semibold">
                                                        {file.original_name}
                                                    </div>
                                                    <div className="mt-0.5 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                                                        <span>
                                                            {file.folder}
                                                        </span>
                                                        <span>
                                                            {formatBytes(
                                                                file.size,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 flex items-center justify-between border-t pt-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-6 px-2 text-[11px]"
                                                            onClick={() =>
                                                                setPreviewFile(
                                                                    file,
                                                                )
                                                            }
                                                        >
                                                            <Eye className="mr-1 size-3" />
                                                            Aperçu
                                                        </Button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setFileToDelete(
                                                                    file,
                                                                )
                                                            }
                                                            className="text-red-500 hover:opacity-80"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Pagination Footer */}
                        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
                            <span>
                                Affichage de <strong>{files.length}</strong> sur{' '}
                                <strong>
                                    {totalFilesCount.toLocaleString()}
                                </strong>{' '}
                                fichier(s)
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    disabled={
                                        !paginatedFiles ||
                                        paginatedFiles.page <= 1
                                    }
                                    onClick={() =>
                                        applyFilters({
                                            page:
                                                (paginatedFiles?.page ?? 1) - 1,
                                        })
                                    }
                                >
                                    <ChevronLeft className="mr-1 size-3.5" />
                                    Précédent
                                </Button>
                                <span className="font-mono text-xs">
                                    Page {paginatedFiles?.page ?? 1} /{' '}
                                    {paginatedFiles?.last_page ?? 1}
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    disabled={
                                        !paginatedFiles ||
                                        paginatedFiles.page >=
                                            paginatedFiles.last_page
                                    }
                                    onClick={() =>
                                        applyFilters({
                                            page:
                                                (paginatedFiles?.page ?? 1) + 1,
                                        })
                                    }
                                >
                                    Suivant
                                    <ChevronRight className="ml-1 size-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal : Téléverser un ou plusieurs fichiers */}
            <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Téléverser des Fichiers dans le Cloud
                        </DialogTitle>
                        <DialogDescription>
                            Sélectionnez un ou plusieurs fichiers et choisissez
                            le dossier logique de destination.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUploadFiles} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="upload-folder">
                                Dossier logique
                            </Label>
                            <Input
                                id="upload-folder"
                                value={uploadForm.data.folder}
                                onChange={(e) =>
                                    uploadForm.setData('folder', e.target.value)
                                }
                                placeholder="/avatars, /documents, /assets..."
                                className="font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="upload-files">
                                Fichiers (jusqu&apos;à 50 Mo par fichier)
                            </Label>
                            <Input
                                id="upload-files"
                                type="file"
                                multiple
                                onChange={(e) =>
                                    uploadForm.setData(
                                        'files',
                                        e.target.files
                                            ? Array.from(e.target.files)
                                            : [],
                                    )
                                }
                                required
                            />
                            {uploadForm.data.files.length > 0 && (
                                <p className="text-xs text-emerald-600">
                                    {uploadForm.data.files.length} fichier(s)
                                    prêt(s) à être téléversé(s).
                                </p>
                            )}
                            {uploadForm.errors.files && (
                                <p className="text-xs text-red-500">
                                    {uploadForm.errors.files}
                                </p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setUploadModalOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                className="bg-emerald-600 text-white hover:bg-emerald-500"
                                disabled={uploadForm.processing}
                            >
                                {uploadForm.processing
                                    ? 'Téléversement...'
                                    : 'Téléverser maintenant'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal : Prévisualisation Professionnelle Multimédia & Code */}
            <Dialog
                open={previewFile !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPreviewFile(null);
                    }
                }}
            >
                <DialogContent className="max-w-[95vw] overflow-hidden sm:max-w-3xl">
                    {previewFile && (
                        <div className="min-w-0 space-y-4 overflow-hidden">
                            <DialogHeader className="min-w-0">
                                <DialogTitle className="flex min-w-0 items-center gap-2 text-base">
                                    <span className="shrink-0">
                                        {renderFileIcon(previewFile)}
                                    </span>
                                    <span className="truncate">
                                        {previewFile.original_name}
                                    </span>
                                </DialogTitle>
                                <DialogDescription className="truncate font-mono text-xs">
                                    {previewFile.folder} ·{' '}
                                    {previewFile.mime_type} ·{' '}
                                    {formatBytes(previewFile.size)}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="min-w-0 space-y-4 overflow-hidden">
                                {/* Format-specific Preview Container */}
                                {getFileCategory(previewFile) === 'image' && (
                                    <div className="space-y-2">
                                        <div className="flex justify-end">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs"
                                                onClick={() =>
                                                    setImageZoomed(!imageZoomed)
                                                }
                                            >
                                                {imageZoomed ? (
                                                    <>
                                                        <ZoomOut className="mr-1 size-3.5" />
                                                        Ajuster (100%)
                                                    </>
                                                ) : (
                                                    <>
                                                        <ZoomIn className="mr-1 size-3.5" />
                                                        Zoomer (200%)
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                        <div className="flex max-h-96 w-full items-center justify-center overflow-auto rounded-xl border bg-zinc-900/5 p-4 dark:bg-zinc-900">
                                            <img
                                                src={previewFile.url}
                                                alt={previewFile.original_name}
                                                className={`rounded transition-transform ${
                                                    imageZoomed
                                                        ? 'scale-150'
                                                        : 'max-h-80 max-w-full object-contain'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {getFileCategory(previewFile) === 'pdf' && (
                                    <iframe
                                        src={previewFile.url}
                                        title={previewFile.original_name}
                                        className="h-96 w-full rounded-xl border"
                                    />
                                )}

                                {getFileCategory(previewFile) === 'video' && (
                                    <video
                                        src={previewFile.url}
                                        controls
                                        className="max-h-96 w-full rounded-xl border bg-black"
                                    />
                                )}

                                {getFileCategory(previewFile) === 'audio' && (
                                    <div className="rounded-xl border bg-muted/40 p-6">
                                        <audio
                                            src={previewFile.url}
                                            controls
                                            className="w-full"
                                        />
                                    </div>
                                )}

                                {getFileCategory(previewFile) === 'code' && (
                                    <div className="min-w-0 overflow-hidden">
                                        {previewLoading ? (
                                            <div className="rounded-xl border p-8 text-center text-xs text-muted-foreground">
                                                Chargement du contenu du
                                                fichier...
                                            </div>
                                        ) : previewTextContent !== null ? (
                                            <PrismCodeBlock
                                                code={
                                                    previewTextContent ||
                                                    '// Fichier vide'
                                                }
                                                language={
                                                    previewFile.original_name.endsWith(
                                                        '.json',
                                                    )
                                                        ? 'json'
                                                        : previewFile.original_name.endsWith(
                                                                '.php',
                                                            )
                                                          ? 'php'
                                                          : previewFile.original_name.endsWith(
                                                                  '.md',
                                                              )
                                                            ? 'markdown'
                                                            : 'typescript'
                                                }
                                                title={
                                                    previewFile.original_name
                                                }
                                                maxHeight="320px"
                                            />
                                        ) : (
                                            <div className="rounded-xl border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
                                                Aperçu texte indisponible pour
                                                ce fichier (
                                                <code className="font-mono">
                                                    {previewFile.mime_type}
                                                </code>
                                                ). Vous pouvez l&apos;ouvrir ou
                                                le télécharger directement
                                                ci-dessous.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {getFileCategory(previewFile) === 'other' && (
                                    <div className="rounded-xl border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
                                        Ce format binaire (
                                        <code className="font-mono">
                                            {previewFile.mime_type}
                                        </code>
                                        , {formatBytes(previewFile.size)}) est
                                        prêt à être téléchargé via le bouton
                                        ci-dessous.
                                    </div>
                                )}

                                {/* URL & Metadata */}
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-xs">
                                    <div className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                                        {previewFile.url}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs"
                                            onClick={() =>
                                                copyUrl(previewFile.url)
                                            }
                                        >
                                            <Copy className="mr-1 size-3" />
                                            {copiedUrl === previewFile.url
                                                ? 'Copié !'
                                                : 'Copier URL'}
                                        </Button>
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs"
                                        >
                                            <a
                                                href={previewFile.url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <ExternalLink className="mr-1 size-3" />
                                                Ouvrir
                                            </a>
                                        </Button>
                                        <Button
                                            asChild
                                            size="sm"
                                            className="h-7 bg-emerald-600 text-xs text-white hover:bg-emerald-500"
                                        >
                                            <a
                                                href={`${previewFile.url}?download=1`}
                                                download={
                                                    previewFile.original_name
                                                }
                                            >
                                                <Download className="mr-1 size-3" />
                                                Télécharger
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmActionDialog
                open={fileToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setFileToDelete(null);
                    }
                }}
                variant="destructive"
                title={`Supprimer le fichier « ${fileToDelete?.original_name ?? ''} » ?`}
                description="Ce fichier sera définitivement effacé du disque de stockage isolé de l'application."
                warningNote={`Son URL publique (${fileToDelete?.path ?? ''}) cessera immédiatement de fonctionner.`}
                confirmLabel="Supprimer le fichier"
                onConfirm={() => {
                    if (!fileToDelete) {
                        return;
                    }
                    router.delete(
                        `/dashboard/apps/${app.id}/files/${fileToDelete.id}`,
                        { preserveScroll: true },
                    );
                }}
            />

            <ConfirmActionDialog
                open={confirmBulkDeleteOpen}
                onOpenChange={setConfirmBulkDeleteOpen}
                variant="destructive"
                title={`Supprimer les ${selectedIds.length} fichier(s) sélectionné(s) ?`}
                description="Tous les fichiers cochés seront définitivement supprimés de l'espace de stockage de l'application."
                confirmLabel={`Supprimer (${selectedIds.length})`}
                onConfirm={handleBulkDelete}
            />
        </>
    );
}
