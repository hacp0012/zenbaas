import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Code2,
    Database,
    Download,
    Edit3,
    FileCode2,
    FileUp,
    Layers,
    LayoutList,
    Plus,
    Search,
    Settings2,
    ShieldCheck,
    SlidersHorizontal,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { MonacoCodeEditor } from '@/components/monaco-code-editor';
import { PrismCodeBlock } from '@/components/prism-code-block';
import { ResizableJsonEditor } from '@/components/resizable-json-editor';
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
import { dashboard } from '@/routes';
import type {
    ZenbaseApp,
    ZenbaseCollectionInfo,
    ZenbaseSchemaField,
    ZenbaseSchemaFieldType,
} from '@/types';

type DbPagination = {
    total: number;
    page: number;
    per_page: number;
    last_page: number;
};

type DbFilters = {
    search: string;
    order_by: string;
    direction: 'asc' | 'desc';
    per_page: number;
};

type GuiFieldRow = {
    id: string;
    key: string;
    type: ZenbaseSchemaFieldType;
    stringValue: string;
    numberValue: string;
    booleanValue: boolean;
    jsonValue: string;
    blobValue: {
        __type: 'blob';
        mime_type: string;
        name: string | null;
        size: number;
        data: string;
    } | null;
    fromSchema?: boolean;
    required?: boolean;
};

function isComplexJsonFieldType(
    type: string,
): type is 'array' | 'object' | 'map' {
    return type === 'array' || type === 'object' || type === 'map';
}

function isBlobObject(val: unknown): val is {
    __type: 'blob';
    mime_type: string;
    name?: string | null;
    size?: number;
    data: string;
} {
    return (
        Boolean(val) &&
        typeof val === 'object' &&
        (val as Record<string, unknown>).__type === 'blob' &&
        typeof (val as Record<string, unknown>).data === 'string'
    );
}

function inferFieldType(val: unknown): ZenbaseSchemaFieldType {
    if (isBlobObject(val)) {
        return 'blob';
    }
    if (typeof val === 'number') {
        return 'number';
    }
    if (typeof val === 'boolean') {
        return 'boolean';
    }
    if (Array.isArray(val)) {
        return 'array';
    }
    if (val !== null && typeof val === 'object') {
        return 'object';
    }

    return 'string';
}

function objectToGuiFields(
    obj: Record<string, unknown>,
    schemaFields: ZenbaseSchemaField[] | null,
): GuiFieldRow[] {
    const rows: GuiFieldRow[] = [];
    const handledKeys = new Set<string>();

    if (schemaFields && schemaFields.length > 0) {
        for (const sf of schemaFields) {
            handledKeys.add(sf.name);
            const hasVal = Object.prototype.hasOwnProperty.call(obj, sf.name);
            const rawVal = hasVal ? obj[sf.name] : sf.default;

            rows.push({
                id: `schema-${sf.name}`,
                key: sf.name,
                type: sf.type,
                stringValue:
                    sf.type === 'string' &&
                    rawVal !== undefined &&
                    rawVal !== null
                        ? String(rawVal)
                        : '',
                numberValue:
                    sf.type === 'number' &&
                    rawVal !== undefined &&
                    rawVal !== null
                        ? String(rawVal)
                        : '0',
                booleanValue:
                    sf.type === 'boolean' ? Boolean(rawVal ?? true) : true,
                jsonValue:
                    sf.type === 'array' || sf.type === 'object'
                        ? JSON.stringify(
                              rawVal ?? (sf.type === 'array' ? [] : {}),
                              null,
                              2,
                          )
                        : '{}',
                blobValue: isBlobObject(rawVal)
                    ? {
                          __type: 'blob',
                          mime_type:
                              rawVal.mime_type || 'application/octet-stream',
                          name: rawVal.name ?? null,
                          size: rawVal.size ?? 0,
                          data: rawVal.data,
                      }
                    : null,
                fromSchema: true,
                required: sf.required,
            });
        }
    }

    for (const [k, v] of Object.entries(obj)) {
        if (handledKeys.has(k)) {
            continue;
        }
        const t = inferFieldType(v);
        rows.push({
            id: `field-${k}-${rows.length}`,
            key: k,
            type: t,
            stringValue: t === 'string' ? String(v ?? '') : '',
            numberValue: t === 'number' ? String(v ?? 0) : '0',
            booleanValue: t === 'boolean' ? Boolean(v) : true,
            jsonValue:
                t === 'array' || t === 'object'
                    ? JSON.stringify(v, null, 2)
                    : '{}',
            blobValue: isBlobObject(v)
                ? {
                      __type: 'blob',
                      mime_type: v.mime_type || 'application/octet-stream',
                      name: v.name ?? null,
                      size: v.size ?? 0,
                      data: v.data,
                  }
                : null,
        });
    }

    if (rows.length === 0) {
        rows.push({
            id: 'field-initial-0',
            key: 'title',
            type: 'string',
            stringValue: 'Mon document Zenbase',
            numberValue: '0',
            booleanValue: true,
            jsonValue: '{}',
            blobValue: null,
        });
    }

    return rows;
}

function guiFieldsToObject(rows: GuiFieldRow[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const row of rows) {
        const cleanKey = row.key.trim();
        if (!cleanKey) {
            continue;
        }

        switch (row.type) {
            case 'string':
                result[cleanKey] = row.stringValue;
                break;
            case 'number': {
                const parsed = Number(row.numberValue);
                result[cleanKey] = Number.isNaN(parsed) ? 0 : parsed;
                break;
            }
            case 'boolean':
                result[cleanKey] = row.booleanValue;
                break;
            case 'array':
            case 'object': {
                try {
                    result[cleanKey] = JSON.parse(row.jsonValue);
                } catch {
                    result[cleanKey] = row.type === 'array' ? [] : {};
                }
                break;
            }
            case 'blob':
                result[cleanKey] = row.blobValue ?? {
                    __type: 'blob',
                    mime_type: 'application/octet-stream',
                    name: 'empty.bin',
                    size: 0,
                    data: '',
                };
                break;
        }
    }

    return result;
}

function buildDefaultJsonFromSchema(
    schemaFields: ZenbaseSchemaField[] | null,
): Record<string, unknown> {
    if (!schemaFields || schemaFields.length === 0) {
        return {
            title: 'Nouveau document',
            active: true,
        };
    }

    const obj: Record<string, unknown> = {};
    for (const sf of schemaFields) {
        if (sf.default !== undefined && sf.default !== null) {
            obj[sf.name] = sf.default;
            continue;
        }
        switch (sf.type) {
            case 'string':
                obj[sf.name] = '';
                break;
            case 'number':
                obj[sf.name] = 0;
                break;
            case 'boolean':
                obj[sf.name] = true;
                break;
            case 'array':
                obj[sf.name] = [];
                break;
            case 'object':
                obj[sf.name] = {};
                break;
            case 'blob':
                obj[sf.name] = {
                    __type: 'blob',
                    mime_type: 'application/octet-stream',
                    name: 'fichier.bin',
                    size: 0,
                    data: '',
                };
                break;
        }
    }

    return obj;
}

function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) {
        return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function ClientAppDatabase({
    app,
    collections,
    activeCollection,
    records,
    pagination,
    dbFilters,
}: {
    app: ZenbaseApp;
    collections: ZenbaseCollectionInfo[];
    activeCollection: string | null;
    records: Array<Record<string, unknown>>;
    pagination: DbPagination;
    dbFilters: DbFilters;
}) {
    const { errors } = usePage<{ errors?: Record<string, string> }>().props;

    const currentCollectionInfo = useMemo(
        () => collections.find((c) => c.name === activeCollection) ?? null,
        [collections, activeCollection],
    );
    const activeSchema = currentCollectionInfo?.schema ?? null;
    const schemaFields = activeSchema?.fields ?? null;

    // Collection creation state
    const [newCollectionModalOpen, setNewCollectionModalOpen] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [collectionToDelete, setCollectionToDelete] = useState<string | null>(
        null,
    );

    // Search & filter state
    const [searchInput, setSearchInput] = useState(dbFilters?.search ?? '');
    const [perPage, setPerPage] = useState<number>(dbFilters?.per_page ?? 25);

    // Selected document or creation mode in Pane 3
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
        (records[0]?.id as string | undefined) ?? null,
    );
    const [isCreatingDoc, setIsCreatingDoc] = useState<boolean>(
        records.length === 0,
    );
    const [editorMode, setEditorMode] = useState<'gui' | 'json'>('gui');
    const [customDocId, setCustomDocId] = useState('');
    const [guiJsonError, setGuiJsonError] = useState<string | null>(null);

    const selectedRecord = useMemo(
        () =>
            records.find((r) => String(r.id) === String(selectedRecordId)) ??
            null,
        [records, selectedRecordId],
    );

    const [jsonContent, setJsonContent] = useState<string>(() => {
        const initialObj = selectedRecord
            ? ((selectedRecord.data as Record<string, unknown>) ?? {})
            : buildDefaultJsonFromSchema(schemaFields);

        return JSON.stringify(initialObj, null, 2);
    });

    const [guiRows, setGuiRows] = useState<GuiFieldRow[]>(() => {
        const initialObj = selectedRecord
            ? ((selectedRecord.data as Record<string, unknown>) ?? {})
            : buildDefaultJsonFromSchema(schemaFields);

        return objectToGuiFields(initialObj, schemaFields);
    });

    const [recordToDelete, setRecordToDelete] = useState<{
        collection: string;
        id: string;
    } | null>(null);

    // Schema Editor Modal state
    const [schemaModalOpen, setSchemaModalOpen] = useState(false);
    const [schemaStrict, setSchemaStrict] = useState<boolean>(
        activeSchema?.strict ?? false,
    );
    const [editableSchemaFields, setEditableSchemaFields] = useState<
        ZenbaseSchemaField[]
    >(activeSchema?.fields ?? []);

    function selectRecordForInspection(record: Record<string, unknown>) {
        setIsCreatingDoc(false);
        setGuiJsonError(null);
        setSelectedRecordId(String(record.id));
        const payload = (record.data as Record<string, unknown>) ?? {};
        setJsonContent(JSON.stringify(payload, null, 2));
        setGuiRows(objectToGuiFields(payload, schemaFields));
    }

    function openCreateDocDrawer() {
        setIsCreatingDoc(true);
        setGuiJsonError(null);
        setSelectedRecordId(null);
        setCustomDocId('');
        const initialObj = buildDefaultJsonFromSchema(schemaFields);
        setJsonContent(JSON.stringify(initialObj, null, 2));
        setGuiRows(objectToGuiFields(initialObj, schemaFields));
    }

    function switchEditorMode(nextMode: 'gui' | 'json') {
        if (nextMode === editorMode) {
            return;
        }
        setGuiJsonError(null);
        if (nextMode === 'json') {
            const built = guiFieldsToObject(guiRows);
            setJsonContent(JSON.stringify(built, null, 2));
        } else {
            try {
                const parsed = JSON.parse(jsonContent) as Record<
                    string,
                    unknown
                >;
                if (parsed && typeof parsed === 'object') {
                    setGuiRows(objectToGuiFields(parsed, schemaFields));
                }
            } catch {
                // Keep existing GUI rows if JSON is temporarily malformed
            }
        }
        setEditorMode(nextMode);
    }

    function updateGuiRow(index: number, patch: Partial<GuiFieldRow>) {
        setGuiJsonError(null);
        setGuiRows((prev) => {
            const next = prev.map((r, i) => {
                if (i !== index) {
                    return r;
                }

                const updated: GuiFieldRow = { ...r, ...patch };
                if (patch.type && patch.jsonValue === undefined) {
                    const trimmed = updated.jsonValue.trim();
                    if (
                        patch.type === 'array' &&
                        (trimmed === '' || trimmed === '{}')
                    ) {
                        updated.jsonValue = '[]';
                    } else if (
                        (patch.type === 'object' ||
                            (patch.type as string) === 'map') &&
                        (trimmed === '' || trimmed === '[]')
                    ) {
                        updated.jsonValue = '{}';
                    }
                }

                return updated;
            });
            setJsonContent(JSON.stringify(guiFieldsToObject(next), null, 2));

            return next;
        });
    }

    function addGuiFieldRow() {
        setGuiRows((prev) => {
            const next: GuiFieldRow[] = [
                ...prev,
                {
                    id: `custom-${Date.now()}-${prev.length}`,
                    key: `champ_${prev.length + 1}`,
                    type: 'string',
                    stringValue: '',
                    numberValue: '0',
                    booleanValue: true,
                    jsonValue: '{}',
                    blobValue: null,
                },
            ];
            setJsonContent(JSON.stringify(guiFieldsToObject(next), null, 2));

            return next;
        });
    }

    function removeGuiFieldRow(index: number) {
        setGuiRows((prev) => {
            const next = prev.filter((_, i) => i !== index);
            setJsonContent(JSON.stringify(guiFieldsToObject(next), null, 2));

            return next;
        });
    }

    function handleBlobFileUpload(
        index: number,
        e: ChangeEvent<HTMLInputElement>,
    ) {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result ?? '');
            const base64 = result.replace(/^data:[^;]+;base64,/, '');
            updateGuiRow(index, {
                type: 'blob',
                blobValue: {
                    __type: 'blob',
                    mime_type: file.type || 'application/octet-stream',
                    name: file.name,
                    size: file.size,
                    data: base64,
                },
            });
        };
        reader.readAsDataURL(file);
    }

    function handleSaveDocument(e: FormEvent) {
        e.preventDefault();
        if (!activeCollection) {
            return;
        }

        if (editorMode === 'gui') {
            for (const row of guiRows) {
                const cleanKey = row.key.trim();
                if (!cleanKey || !isComplexJsonFieldType(row.type)) {
                    continue;
                }
                try {
                    JSON.parse(row.jsonValue);
                } catch {
                    setGuiJsonError(
                        `Le champ « ${cleanKey} » contient du JSON invalide. Corrigez la syntaxe avant d'enregistrer.`,
                    );
                    return;
                }
            }
            setGuiJsonError(null);
        }

        const payloadString =
            editorMode === 'gui'
                ? JSON.stringify(guiFieldsToObject(guiRows), null, 2)
                : jsonContent;

        if (isCreatingDoc) {
            router.post(
                `/dashboard/apps/${app.id}/collections/${activeCollection}/records`,
                {
                    data: payloadString,
                    custom_id: customDocId.trim() || null,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setIsCreatingDoc(false);
                    },
                },
            );
        } else if (selectedRecord) {
            router.put(
                `/dashboard/apps/${app.id}/collections/${activeCollection}/records/${String(selectedRecord.id)}`,
                {
                    data: payloadString,
                },
                { preserveScroll: true },
            );
        }
    }

    function handleCreateCollection(e: FormEvent) {
        e.preventDefault();
        if (!newCollectionName.trim()) {
            return;
        }
        router.post(
            `/dashboard/apps/${app.id}/collections`,
            { name: newCollectionName.trim() },
            {
                onSuccess: () => {
                    setNewCollectionName('');
                    setNewCollectionModalOpen(false);
                },
            },
        );
    }

    function applyDatabaseQuery(
        overrides: Partial<DbFilters & { page?: number }>,
    ) {
        if (!activeCollection) {
            return;
        }
        router.get(
            `/dashboard/apps/${app.id}/database`,
            {
                collection: activeCollection,
                search: overrides.search ?? searchInput,
                per_page: overrides.per_page ?? perPage,
                order_by:
                    overrides.order_by ?? dbFilters?.order_by ?? 'created_at',
                direction:
                    overrides.direction ?? dbFilters?.direction ?? 'desc',
                page: overrides.page ?? 1,
            },
            { preserveState: true, preserveScroll: true },
        );
    }

    function openSchemaModal() {
        setSchemaStrict(activeSchema?.strict ?? false);
        setEditableSchemaFields(
            activeSchema?.fields && activeSchema.fields.length > 0
                ? [...activeSchema.fields]
                : [
                      {
                          name: 'title',
                          type: 'string',
                          required: true,
                          description: 'Titre principal',
                      },
                  ],
        );
        setSchemaModalOpen(true);
    }

    function handleSaveSchema(e: FormEvent) {
        e.preventDefault();
        if (!activeCollection) {
            return;
        }
        router.put(
            `/dashboard/apps/${app.id}/collections/${activeCollection}/schema`,
            {
                schema: JSON.stringify({
                    strict: schemaStrict,
                    fields: editableSchemaFields,
                }),
            },
            {
                preserveScroll: true,
                onSuccess: () => setSchemaModalOpen(false),
            },
        );
    }

    function handleClearSchema() {
        if (!activeCollection) {
            return;
        }
        router.put(
            `/dashboard/apps/${app.id}/collections/${activeCollection}/schema`,
            { schema: null },
            {
                preserveScroll: true,
                onSuccess: () => setSchemaModalOpen(false),
            },
        );
    }

    return (
        <>
            <Head title={`${app.name} — Firestore / NoSQL Explorer`} />
            <div className="flex min-h-0 flex-1 flex-col gap-4">
                {/* Top Firestore Header Bar */}
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            <Database className="size-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold">
                                    Zenbase Cloud Database (NoSQL JSON1 + BLOB)
                                </h2>
                                <Badge
                                    variant="secondary"
                                    className="font-mono text-[10px]"
                                >
                                    app_{app.id.slice(0, 8)}.sqlite
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Console inspirée de Firebase Firestore ·
                                Supporte les schémas optionnels, le format
                                binaire BLOB, la pagination haute capacité et le
                                double éditeur (Graphique & Monaco JSON).
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {activeCollection && (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={openSchemaModal}
                            >
                                <SlidersHorizontal className="mr-1.5 size-3.5 text-emerald-600" />
                                {activeSchema
                                    ? `Schéma actif (${activeSchema.fields.length} champs)`
                                    : 'Définir un Schéma'}
                            </Button>
                        )}
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setNewCollectionModalOpen(true)}
                        >
                            <Plus className="mr-1.5 size-4" />
                            Nouvelle Collection
                        </Button>
                    </div>
                </div>

                {(errors?.data || guiJsonError) && (
                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-700 dark:text-red-300">
                        {guiJsonError ?? errors?.data}
                    </div>
                )}

                {/* Firestore 3-Pane Explorer — fluid full-height */}
                <div className="grid min-h-[600px] flex-1 overflow-hidden rounded-xl bg-card shadow-xs lg:grid-cols-12">
                    {/* PANE 1: COLLECTIONS */}
                    <div className="flex min-h-0 flex-col border-b border-border/50 lg:col-span-3 lg:border-r lg:border-b-0">
                        <div className="flex shrink-0 items-center justify-between bg-muted/35 px-3.5 py-2.5">
                            <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                <Layers className="size-3.5 text-emerald-600" />
                                Collections ({collections.length})
                            </span>
                            <button
                                type="button"
                                onClick={() => setNewCollectionModalOpen(true)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                            >
                                <Plus className="size-3.5" />
                                Lancer
                            </button>
                        </div>

                        <div className="flex-1 divide-y overflow-y-auto">
                            {collections.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center">
                                    <Database className="size-8 text-muted-foreground/50" />
                                    <p className="mt-2 text-xs font-medium">
                                        Aucune collection
                                    </p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Créez votre première collection NoSQL
                                        (avec ou sans schéma).
                                    </p>
                                </div>
                            ) : (
                                collections.map((col) => {
                                    const isActive =
                                        col.name === activeCollection;
                                    const hasSchema = Boolean(
                                        col.schema &&
                                        col.schema.fields &&
                                        col.schema.fields.length > 0,
                                    );

                                    return (
                                        <div
                                            key={col.name}
                                            className={`flex items-center justify-between px-3.5 py-2.5 text-sm transition ${
                                                isActive
                                                    ? 'bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300'
                                                    : 'hover:bg-muted/50'
                                            }`}
                                        >
                                            <Link
                                                href={`/dashboard/apps/${app.id}/database?collection=${encodeURIComponent(col.name)}`}
                                                className="flex flex-1 flex-col truncate"
                                            >
                                                <div className="flex items-center gap-1.5 truncate font-mono text-xs">
                                                    <span>{col.name}</span>
                                                    {hasSchema ? (
                                                        <Badge
                                                            variant="secondary"
                                                            className="h-4 bg-emerald-500/15 px-1 text-[9px] text-emerald-700 dark:text-emerald-300"
                                                        >
                                                            Schéma
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="h-4 px-1 text-[9px] text-muted-foreground"
                                                        >
                                                            Libre
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="mt-0.5 text-[10px] text-muted-foreground">
                                                    {col.count.toLocaleString()}{' '}
                                                    document(s)
                                                </span>
                                            </Link>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCollectionToDelete(
                                                        col.name,
                                                    )
                                                }
                                                className="ml-2 rounded p-1 text-muted-foreground opacity-60 hover:bg-red-500/10 hover:text-red-500 hover:opacity-100"
                                                title="Supprimer la collection"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* PANE 2: PAGINATED DOCUMENTS LIST */}
                    <div className="flex min-h-0 flex-col border-b border-border/50 lg:col-span-4 lg:border-r lg:border-b-0">
                        <div className="shrink-0 space-y-2 bg-muted/35 p-2.5">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-foreground">
                                    {activeCollection
                                        ? `/${activeCollection}`
                                        : 'Documents'}
                                </span>
                                {activeCollection && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2.5 text-xs"
                                        onClick={openCreateDocDrawer}
                                    >
                                        <Plus className="mr-1 size-3.5 text-emerald-600" />
                                        Ajouter un document
                                    </Button>
                                )}
                            </div>

                            {activeCollection && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        applyDatabaseQuery({ page: 1 });
                                    }}
                                    className="flex gap-1.5"
                                >
                                    <div className="relative flex-1">
                                        <Search className="pointer-events-none absolute top-2 left-2.5 size-3.5 text-muted-foreground" />
                                        <Input
                                            value={searchInput}
                                            onChange={(e) =>
                                                setSearchInput(e.target.value)
                                            }
                                            placeholder="Filtrer par ID ou contenu JSON..."
                                            className="h-7 pl-8 text-xs"
                                        />
                                    </div>
                                    <select
                                        value={perPage}
                                        onChange={(e) => {
                                            const nextPerPage = Number(
                                                e.target.value,
                                            );
                                            setPerPage(nextPerPage);
                                            applyDatabaseQuery({
                                                per_page: nextPerPage,
                                                page: 1,
                                            });
                                        }}
                                        aria-label="Documents par page"
                                        className="h-7 rounded-md border bg-background px-1.5 font-mono text-[11px]"
                                    >
                                        <option value={10}>10 / page</option>
                                        <option value={25}>25 / page</option>
                                        <option value={50}>50 / page</option>
                                        <option value={100}>100 / page</option>
                                        <option value={250}>250 / page</option>
                                    </select>
                                </form>
                            )}
                        </div>

                        <div className="min-h-0 flex-1 divide-y divide-border/40 overflow-y-auto">
                            {!activeCollection ? (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    Sélectionnez une collection à gauche.
                                </div>
                            ) : records.length === 0 ? (
                                <div className="p-8 text-center">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Aucun document trouvé dans «{' '}
                                        {activeCollection} ».
                                    </p>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="mt-3 text-xs"
                                        onClick={openCreateDocDrawer}
                                    >
                                        <Plus className="mr-1.5 size-3.5" />
                                        Créer le premier document
                                    </Button>
                                </div>
                            ) : (
                                records.map((rec) => {
                                    const id = String(rec.id);
                                    const isSelected =
                                        !isCreatingDoc &&
                                        selectedRecord?.id === id;
                                    const payload =
                                        (rec.data as Record<string, unknown>) ??
                                        {};
                                    const keys = Object.keys(payload);
                                    const hasBlob = Object.values(payload).some(
                                        (v) => isBlobObject(v),
                                    );

                                    const previewLabel =
                                        typeof payload.title === 'string'
                                            ? payload.title
                                            : typeof payload.name === 'string'
                                              ? payload.name
                                              : typeof payload.email ===
                                                  'string'
                                                ? payload.email
                                                : `${keys.length} champ(s)`;

                                    return (
                                        <div
                                            key={id}
                                            className={`flex items-center justify-between px-3 py-2.5 text-xs transition ${
                                                isSelected
                                                    ? 'bg-emerald-500/15 font-semibold text-emerald-800 dark:text-emerald-200'
                                                    : 'hover:bg-muted/40'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    selectRecordForInspection(
                                                        rec,
                                                    )
                                                }
                                                className="flex flex-1 flex-col truncate text-left"
                                            >
                                                <div className="flex items-center gap-1.5 truncate font-mono text-[11px]">
                                                    <span className="truncate">
                                                        {id}
                                                    </span>
                                                    {hasBlob && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="h-4 bg-purple-500/15 px-1 text-[9px] text-purple-700 dark:text-purple-300"
                                                        >
                                                            BLOB
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                                    {previewLabel}
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setRecordToDelete({
                                                        collection:
                                                            activeCollection,
                                                        id,
                                                    })
                                                }
                                                className="ml-2 rounded p-1 text-muted-foreground opacity-60 hover:bg-red-500/10 hover:text-red-500 hover:opacity-100"
                                                title="Supprimer ce document"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Pagination Footer */}
                        {activeCollection && (
                            <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                                <span className="font-mono">
                                    Total :{' '}
                                    <strong>
                                        {pagination?.total?.toLocaleString() ??
                                            records.length}
                                    </strong>{' '}
                                    doc(s)
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="size-6"
                                        disabled={
                                            !pagination || pagination.page <= 1
                                        }
                                        onClick={() =>
                                            applyDatabaseQuery({
                                                page:
                                                    (pagination?.page ?? 1) - 1,
                                            })
                                        }
                                    >
                                        <ChevronLeft className="size-3.5" />
                                    </Button>
                                    <span className="font-mono">
                                        Page {pagination?.page ?? 1} /{' '}
                                        {pagination?.last_page ?? 1}
                                    </span>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="size-6"
                                        disabled={
                                            !pagination ||
                                            pagination.page >=
                                                pagination.last_page
                                        }
                                        onClick={() =>
                                            applyDatabaseQuery({
                                                page:
                                                    (pagination?.page ?? 1) + 1,
                                            })
                                        }
                                    >
                                        <ChevronRight className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PANE 3: DOCUMENT INSPECTOR & DUAL EDITOR (GRAPHICAL UI OR MONACO JSON) */}
                    <div className="flex min-h-0 flex-col lg:col-span-5">
                        {!activeCollection ? (
                            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
                                Créez ou sélectionnez une collection pour
                                inspecter et éditer ses documents JSON / BLOB.
                            </div>
                        ) : (
                            <>
                                {/* Pane 3 Header with Mode Switcher */}
                                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 bg-muted/35 px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={
                                                isCreatingDoc
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                            className={
                                                isCreatingDoc
                                                    ? ''
                                                    : 'font-mono text-xs'
                                            }
                                        >
                                            {isCreatingDoc
                                                ? 'Nouveau Document'
                                                : `ID : ${String(selectedRecord?.id ?? '')}`}
                                        </Badge>
                                        {activeSchema && (
                                            <Badge
                                                variant="outline"
                                                className="border-emerald-500/40 text-[10px] text-emerald-700 dark:text-emerald-300"
                                            >
                                                <ShieldCheck className="mr-1 size-3" />
                                                {activeSchema.strict
                                                    ? 'Schéma Strict'
                                                    : 'Schéma Souple'}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Dual Editor Toggle: Graphical vs JSON Code */}
                                    <div className="inline-flex rounded-lg bg-muted p-0.5">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                switchEditorMode('gui')
                                            }
                                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                                                editorMode === 'gui'
                                                    ? 'bg-primary text-primary-foreground shadow-2xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <LayoutList className="size-3.5" />
                                            Interface Graphique
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                switchEditorMode('json')
                                            }
                                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                                                editorMode === 'json'
                                                    ? 'bg-primary text-primary-foreground shadow-2xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <Code2 className="size-3.5" />
                                            Éditeur JSON (Monaco)
                                        </button>
                                    </div>
                                </div>

                                <form
                                    onSubmit={handleSaveDocument}
                                    className="flex min-h-0 flex-1 flex-col"
                                >
                                    <div
                                        className={`flex min-h-0 flex-1 flex-col ${
                                            editorMode === 'json'
                                                ? ''
                                                : 'gap-4 p-4'
                                        }`}
                                    >
                                        {isCreatingDoc && (
                                            <div
                                                className={`shrink-0 space-y-1 ${
                                                    editorMode === 'json'
                                                        ? 'bg-muted/20 px-4 py-3'
                                                        : ''
                                                }`}
                                            >
                                                <Label className="text-xs">
                                                    ID du document (optionnel —
                                                    UUID généré automatiquement
                                                    si vide)
                                                </Label>
                                                <Input
                                                    value={customDocId}
                                                    onChange={(e) =>
                                                        setCustomDocId(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Ex: user_001 (ou laisser vide)"
                                                    className="h-8 font-mono text-xs"
                                                />
                                            </div>
                                        )}

                                        {editorMode === 'gui' ? (
                                            <div className="flex min-h-0 flex-1 flex-col space-y-2.5">
                                                <div className="flex shrink-0 items-center justify-between">
                                                    <Label className="text-xs font-semibold">
                                                        Champs du Document
                                                        (Style Firebase
                                                        Firestore)
                                                    </Label>
                                                    {(!activeSchema ||
                                                        !activeSchema.strict) && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 px-2 text-xs"
                                                            onClick={
                                                                addGuiFieldRow
                                                            }
                                                        >
                                                            <Plus className="mr-1 size-3" />
                                                            Ajouter un champ
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                                                    {guiRows.map((row, idx) => (
                                                        <div
                                                            key={row.id}
                                                            className="space-y-2 rounded-lg border bg-muted/20 p-2.5"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    value={
                                                                        row.key
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateGuiRow(
                                                                            idx,
                                                                            {
                                                                                key: e
                                                                                    .target
                                                                                    .value,
                                                                            },
                                                                        )
                                                                    }
                                                                    placeholder="nom_du_champ"
                                                                    disabled={
                                                                        row.fromSchema
                                                                    }
                                                                    className="h-7 flex-1 font-mono text-xs"
                                                                />
                                                                <select
                                                                    value={
                                                                        row.type
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateGuiRow(
                                                                            idx,
                                                                            {
                                                                                type: e
                                                                                    .target
                                                                                    .value as ZenbaseSchemaFieldType,
                                                                            },
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        row.fromSchema
                                                                    }
                                                                    aria-label="Type de champ"
                                                                    className="h-7 rounded-md border bg-background px-2 font-mono text-xs"
                                                                >
                                                                    <option value="string">
                                                                        string
                                                                    </option>
                                                                    <option value="number">
                                                                        number
                                                                    </option>
                                                                    <option value="boolean">
                                                                        boolean
                                                                    </option>
                                                                    <option value="object">
                                                                        map /
                                                                        object
                                                                    </option>
                                                                    <option value="array">
                                                                        array
                                                                    </option>
                                                                    <option value="blob">
                                                                        blob
                                                                        (binaire)
                                                                    </option>
                                                                </select>

                                                                {row.required && (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-[9px]"
                                                                    >
                                                                        Requis
                                                                    </Badge>
                                                                )}

                                                                {!row.fromSchema && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            removeGuiFieldRow(
                                                                                idx,
                                                                            )
                                                                        }
                                                                        className="rounded p-1 text-muted-foreground hover:text-red-500"
                                                                        title="Supprimer ce champ"
                                                                    >
                                                                        <Trash2 className="size-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Value Editor based on field type */}
                                                            {row.type ===
                                                                'string' && (
                                                                <Input
                                                                    value={
                                                                        row.stringValue
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateGuiRow(
                                                                            idx,
                                                                            {
                                                                                stringValue:
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                            },
                                                                        )
                                                                    }
                                                                    placeholder="Valeur texte..."
                                                                    className="h-7 text-xs"
                                                                />
                                                            )}

                                                            {row.type ===
                                                                'number' && (
                                                                <Input
                                                                    type="number"
                                                                    step="any"
                                                                    value={
                                                                        row.numberValue
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateGuiRow(
                                                                            idx,
                                                                            {
                                                                                numberValue:
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                            },
                                                                        )
                                                                    }
                                                                    className="h-7 font-mono text-xs"
                                                                />
                                                            )}

                                                            {row.type ===
                                                                'boolean' && (
                                                                <div className="flex items-center gap-2 pt-0.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            updateGuiRow(
                                                                                idx,
                                                                                {
                                                                                    booleanValue: true,
                                                                                },
                                                                            )
                                                                        }
                                                                        className={`rounded px-2.5 py-0.5 font-mono text-xs ${
                                                                            row.booleanValue
                                                                                ? 'bg-emerald-600 text-white'
                                                                                : 'border bg-background'
                                                                        }`}
                                                                    >
                                                                        true
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            updateGuiRow(
                                                                                idx,
                                                                                {
                                                                                    booleanValue: false,
                                                                                },
                                                                            )
                                                                        }
                                                                        className={`rounded px-2.5 py-0.5 font-mono text-xs ${
                                                                            !row.booleanValue
                                                                                ? 'bg-rose-600 text-white'
                                                                                : 'border bg-background'
                                                                        }`}
                                                                    >
                                                                        false
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {isComplexJsonFieldType(
                                                                row.type,
                                                            ) && (
                                                                <ResizableJsonEditor
                                                                    value={
                                                                        row.jsonValue
                                                                    }
                                                                    expectedType={
                                                                        row.type
                                                                    }
                                                                    minLines={3}
                                                                    onChange={(
                                                                        val,
                                                                    ) =>
                                                                        updateGuiRow(
                                                                            idx,
                                                                            {
                                                                                jsonValue:
                                                                                    val,
                                                                            },
                                                                        )
                                                                    }
                                                                />
                                                            )}

                                                            {row.type ===
                                                                'blob' && (
                                                                <div className="space-y-2 rounded-md border border-dashed bg-background p-2.5 text-xs">
                                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                                                                            <FileUp className="size-3.5" />
                                                                            <span>
                                                                                Charger
                                                                                un
                                                                                fichier
                                                                                BLOB
                                                                            </span>
                                                                            <input
                                                                                type="file"
                                                                                className="hidden"
                                                                                onChange={(
                                                                                    e,
                                                                                ) =>
                                                                                    handleBlobFileUpload(
                                                                                        idx,
                                                                                        e,
                                                                                    )
                                                                                }
                                                                            />
                                                                        </label>
                                                                        {row.blobValue &&
                                                                            row
                                                                                .blobValue
                                                                                .data && (
                                                                                <a
                                                                                    href={`data:${row.blobValue.mime_type};base64,${row.blobValue.data}`}
                                                                                    download={
                                                                                        row
                                                                                            .blobValue
                                                                                            .name ||
                                                                                        `${row.key}.bin`
                                                                                    }
                                                                                    className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 hover:underline"
                                                                                >
                                                                                    <Download className="size-3" />
                                                                                    Télécharger
                                                                                    BLOB
                                                                                </a>
                                                                            )}
                                                                    </div>

                                                                    {row.blobValue &&
                                                                    row
                                                                        .blobValue
                                                                        .data ? (
                                                                        <div className="space-y-1.5">
                                                                            <div className="font-mono text-[11px] text-muted-foreground">
                                                                                {row
                                                                                    .blobValue
                                                                                    .name ||
                                                                                    'blob.bin'}{' '}
                                                                                ·{' '}
                                                                                {
                                                                                    row
                                                                                        .blobValue
                                                                                        .mime_type
                                                                                }{' '}
                                                                                ·{' '}
                                                                                {formatBytes(
                                                                                    row
                                                                                        .blobValue
                                                                                        .size,
                                                                                )}
                                                                            </div>
                                                                            {row.blobValue.mime_type.startsWith(
                                                                                'image/',
                                                                            ) && (
                                                                                <img
                                                                                    src={`data:${row.blobValue.mime_type};base64,${row.blobValue.data}`}
                                                                                    alt={
                                                                                        row.key
                                                                                    }
                                                                                    className="max-h-24 rounded border object-contain"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-[11px] text-muted-foreground">
                                                                            Aucun
                                                                            binaire
                                                                            chargé
                                                                            (format
                                                                            JSON
                                                                            BLOB
                                                                            Base64).
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex min-h-[380px] flex-1 flex-col">
                                                <MonacoCodeEditor
                                                    value={jsonContent}
                                                    onChange={setJsonContent}
                                                    language="json"
                                                    height="100%"
                                                    edgeToEdge
                                                    className="flex-1"
                                                    schemaFields={schemaFields}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex shrink-0 items-center justify-between bg-muted/25 px-4 py-3">
                                        {!isCreatingDoc && selectedRecord ? (
                                            <span className="font-mono text-[10px] text-muted-foreground">
                                                Mis à jour :{' '}
                                                {String(
                                                    selectedRecord.updated_at ??
                                                        '',
                                                ).slice(0, 19)}
                                            </span>
                                        ) : (
                                            <span />
                                        )}

                                        <div className="flex gap-2">
                                            {!isCreatingDoc && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={
                                                        openCreateDocDrawer
                                                    }
                                                >
                                                    <Plus className="mr-1 size-3.5" />
                                                    Nouveau
                                                </Button>
                                            )}
                                            <Button type="submit" size="sm">
                                                {isCreatingDoc
                                                    ? 'Insérer le Document'
                                                    : 'Enregistrer les modifications'}
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal : Créer une Collection */}
            <Dialog
                open={newCollectionModalOpen}
                onOpenChange={setNewCollectionModalOpen}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Créer une Nouvelle Collection</DialogTitle>
                        <DialogDescription>
                            Vous pourrez ensuite y insérer des documents
                            librement (Schema-less) ou définir un schéma de
                            validation.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={handleCreateCollection}
                        className="space-y-4"
                    >
                        <div className="space-y-1.5">
                            <Label htmlFor="col-name">
                                Nom de la collection
                            </Label>
                            <Input
                                id="col-name"
                                value={newCollectionName}
                                onChange={(e) =>
                                    setNewCollectionName(e.target.value)
                                }
                                placeholder="Ex: products, users_profiles, invoices..."
                                className="font-mono"
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setNewCollectionModalOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button type="submit">Créer la collection</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal : Configurer le Schéma de la Collection */}
            <Dialog open={schemaModalOpen} onOpenChange={setSchemaModalOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            Schéma de la Collection « {activeCollection} »
                        </DialogTitle>
                        <DialogDescription>
                            Définissez les champs, leurs types (incluant{' '}
                            <code className="font-mono text-xs">blob</code>) et
                            activez les suggestions automatiques dans
                            l&apos;éditeur de code JSON Monaco.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveSchema} className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                            <div>
                                <div className="text-xs font-semibold">
                                    Mode Schéma Strict
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                    Si activé, tout champ non déclaré dans la
                                    liste ci-dessous sera rejeté lors de
                                    l&apos;insertion ou de la mise à jour.
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={schemaStrict}
                                onChange={(e) =>
                                    setSchemaStrict(e.target.checked)
                                }
                                className="size-4 rounded"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">
                                    Champs déclarés (
                                    {editableSchemaFields.length})
                                </Label>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() =>
                                        setEditableSchemaFields([
                                            ...editableSchemaFields,
                                            {
                                                name: `champ_${editableSchemaFields.length + 1}`,
                                                type: 'string',
                                                required: false,
                                                description: '',
                                            },
                                        ])
                                    }
                                >
                                    <Plus className="mr-1 size-3.5" />
                                    Ajouter un champ au schéma
                                </Button>
                            </div>

                            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                                {editableSchemaFields.map((field, index) => (
                                    <div
                                        key={index}
                                        className="grid grid-cols-12 items-center gap-2 rounded-lg border p-2"
                                    >
                                        <div className="col-span-4">
                                            <Input
                                                value={field.name}
                                                onChange={(e) => {
                                                    const copy = [
                                                        ...editableSchemaFields,
                                                    ];
                                                    copy[index] = {
                                                        ...field,
                                                        name: e.target.value,
                                                    };
                                                    setEditableSchemaFields(
                                                        copy,
                                                    );
                                                }}
                                                placeholder="nom_champ"
                                                className="h-8 font-mono text-xs"
                                                required
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <select
                                                value={field.type}
                                                onChange={(e) => {
                                                    const copy = [
                                                        ...editableSchemaFields,
                                                    ];
                                                    copy[index] = {
                                                        ...field,
                                                        type: e.target
                                                            .value as ZenbaseSchemaFieldType,
                                                    };
                                                    setEditableSchemaFields(
                                                        copy,
                                                    );
                                                }}
                                                aria-label="Type du champ"
                                                className="h-8 w-full rounded-md border bg-background px-2 font-mono text-xs"
                                            >
                                                <option value="string">
                                                    string
                                                </option>
                                                <option value="number">
                                                    number
                                                </option>
                                                <option value="boolean">
                                                    boolean
                                                </option>
                                                <option value="object">
                                                    object
                                                </option>
                                                <option value="array">
                                                    array
                                                </option>
                                                <option value="blob">
                                                    blob (binaire)
                                                </option>
                                            </select>
                                        </div>
                                        <div className="col-span-3">
                                            <Input
                                                value={field.description ?? ''}
                                                onChange={(e) => {
                                                    const copy = [
                                                        ...editableSchemaFields,
                                                    ];
                                                    copy[index] = {
                                                        ...field,
                                                        description:
                                                            e.target.value,
                                                    };
                                                    setEditableSchemaFields(
                                                        copy,
                                                    );
                                                }}
                                                placeholder="Description..."
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="col-span-2 flex items-center justify-end gap-2">
                                            <label className="inline-flex items-center gap-1 text-[11px]">
                                                <input
                                                    type="checkbox"
                                                    checked={field.required}
                                                    onChange={(e) => {
                                                        const copy = [
                                                            ...editableSchemaFields,
                                                        ];
                                                        copy[index] = {
                                                            ...field,
                                                            required:
                                                                e.target
                                                                    .checked,
                                                        };
                                                        setEditableSchemaFields(
                                                            copy,
                                                        );
                                                    }}
                                                    className="size-3.5 rounded"
                                                />
                                                <span>Requis</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setEditableSchemaFields(
                                                        editableSchemaFields.filter(
                                                            (_, i) =>
                                                                i !== index,
                                                        ),
                                                    )
                                                }
                                                className="text-red-500 hover:opacity-80"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="flex flex-wrap justify-between gap-2 sm:justify-between">
                            {activeSchema ? (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleClearSchema}
                                >
                                    Supprimer le schéma (Passer en Schema-less)
                                </Button>
                            ) : (
                                <div />
                            )}
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSchemaModalOpen(false)}
                                >
                                    Annuler
                                </Button>
                                <Button type="submit" size="sm">
                                    Enregistrer le Schéma
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmActionDialog
                open={collectionToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setCollectionToDelete(null);
                    }
                }}
                variant="destructive"
                title={`Supprimer la collection « ${collectionToDelete ?? ''} » ?`}
                description="Cette action supprimera la collection ainsi que tous les documents JSON qu'elle contient."
                warningNote={`Tous les documents enregistrés dans « ${collectionToDelete ?? ''} » seront définitivement effacés de la base SQLite.`}
                confirmLabel="Supprimer la collection"
                onConfirm={() => {
                    if (!collectionToDelete) {
                        return;
                    }
                    router.delete(
                        `/dashboard/apps/${app.id}/collections/${collectionToDelete}`,
                    );
                }}
            />

            <ConfirmActionDialog
                open={recordToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setRecordToDelete(null);
                    }
                }}
                variant="destructive"
                title={`Supprimer le document « ${recordToDelete?.id ?? ''} » ?`}
                description="Ce document JSON sera définitivement supprimé de la collection."
                confirmLabel="Supprimer le document"
                onConfirm={() => {
                    if (!recordToDelete) {
                        return;
                    }
                    router.delete(
                        `/dashboard/apps/${app.id}/collections/${recordToDelete.collection}/records/${recordToDelete.id}`,
                        { preserveScroll: true },
                    );
                }}
            />
        </>
    );
}
