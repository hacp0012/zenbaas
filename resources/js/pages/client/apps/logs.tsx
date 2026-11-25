import { Head, router } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Bot,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    Cpu,
    Database,
    Download,
    FolderOpen,
    Gauge,
    RefreshCw,
    ScrollText,
    Search,
    ShieldAlert,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import {
    clear as clearAppLogs,
    exportMethod as exportAppLogs,
} from '@/actions/App/Http/Controllers/Dashboard/AppLogController';
import { logs as showLogsPage } from '@/actions/App/Http/Controllers/Dashboard/ClientAppController';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { dashboard } from '@/routes';
import type { ZenbaseApp } from '@/types';

type AppLogSource = 'api' | 'auth' | 'functions' | 'mcp' | 'storage';
type AppLogLevel = 'info' | 'warning' | 'error';

type AppLogEntry = {
    id: number;
    source: AppLogSource;
    level: AppLogLevel;
    action: string;
    method: string | null;
    path: string | null;
    status_code: number | null;
    duration_ms: number | null;
    api_key_role: string | null;
    ip_address: string | null;
    message: string | null;
    context: Record<string, unknown> | null;
    created_at: string | null;
};

type PaginatedLogs = {
    data: AppLogEntry[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type SourceCounts = {
    all: number;
    api: number;
    auth: number;
    functions: number;
    mcp: number;
    storage: number;
};

type LogSummary = {
    total: number;
    info_count: number;
    warning_count: number;
    error_count: number;
    rate_limited_count: number;
    avg_duration_ms: number;
};

type LogFilters = {
    source: string;
    level: string;
    status: string;
    search: string;
    per_page: number;
};

const SOURCE_TABS: Array<{
    key: 'all' | AppLogSource;
    label: string;
    icon: LucideIcon;
}> = [
    { key: 'all', label: 'Tous', icon: ScrollText },
    { key: 'api', label: 'API', icon: Database },
    { key: 'auth', label: 'Auth', icon: Users },
    { key: 'functions', label: 'Functions', icon: Cpu },
    { key: 'mcp', label: 'MCP', icon: Bot },
    { key: 'storage', label: 'Storage', icon: FolderOpen },
];

function formatDateTime(iso: string | null): string {
    if (!iso) {
        return '—';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }

    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(date);
}

function getSourceBadgeClass(source: AppLogSource): string {
    switch (source) {
        case 'api':
            return 'bg-sky-500/15 text-sky-700 hover:bg-sky-500/15 dark:text-sky-300';
        case 'auth':
            return 'bg-violet-500/15 text-violet-700 hover:bg-violet-500/15 dark:text-violet-300';
        case 'functions':
            return 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300';
        case 'mcp':
            return 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300';
        case 'storage':
            return 'bg-cyan-500/15 text-cyan-700 hover:bg-cyan-500/15 dark:text-cyan-300';
    }
}

function getSourceLabel(source: AppLogSource): string {
    switch (source) {
        case 'api':
            return 'API';
        case 'auth':
            return 'Auth';
        case 'functions':
            return 'Functions';
        case 'mcp':
            return 'MCP';
        case 'storage':
            return 'Storage';
    }
}

function getStatusBadgeClass(
    statusCode: number | null,
    level: AppLogLevel,
): string {
    if (statusCode === 429) {
        return 'bg-orange-500/15 text-orange-700 hover:bg-orange-500/15 dark:text-orange-300';
    }
    if (level === 'error' || (statusCode !== null && statusCode >= 500)) {
        return 'bg-red-500/15 text-red-700 hover:bg-red-500/15 dark:text-red-300';
    }
    if (level === 'warning' || (statusCode !== null && statusCode >= 400)) {
        return 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300';
    }

    return 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300';
}

function getKeyRoleLabel(role: string | null): string | null {
    switch (role) {
        case 'secret':
            return 'Clé secrète';
        case 'public':
            return 'Clé publique';
        case 'dashboard':
            return 'Dashboard IDE';
        case 'mcp':
            return 'MCP';
        default:
            return role;
    }
}

export default function ClientAppLogs({
    app,
    logs,
    sourceCounts,
    summary,
    retention,
    filters,
}: {
    app: ZenbaseApp;
    logs: PaginatedLogs;
    sourceCounts: SourceCounts;
    summary: LogSummary;
    retention: {
        max_entries: number;
        retention_days: number;
    };
    filters: LogFilters;
}) {
    const [searchInput, setSearchInput] = useState(filters.search);
    const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});
    const [confirmClearOpen, setConfirmClearOpen] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    const navigateWithFilters = (
        overrides: Partial<LogFilters> & { page?: number },
    ) => {
        const nextFilters = {
            source: overrides.source ?? filters.source,
            level: overrides.level ?? filters.level,
            status: overrides.status ?? filters.status,
            search: overrides.search ?? searchInput,
            per_page: overrides.per_page ?? filters.per_page,
            page: overrides.page ?? 1,
        };

        const query: Record<string, string | number> = {};
        if (nextFilters.source !== 'all') {
            query.source = nextFilters.source;
        }
        if (nextFilters.level !== 'all') {
            query.level = nextFilters.level;
        }
        if (nextFilters.status !== 'all') {
            query.status = nextFilters.status;
        }
        if (nextFilters.search.trim() !== '') {
            query.search = nextFilters.search.trim();
        }
        if (nextFilters.per_page !== 30) {
            query.per_page = nextFilters.per_page;
        }
        if (nextFilters.page > 1) {
            query.page = nextFilters.page;
        }

        router.get(
            showLogsPage.url(app.id, { query }),
            {},
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigateWithFilters({ search: searchInput, page: 1 });
    };

    const handleResetFilters = () => {
        setSearchInput('');
        router.get(
            showLogsPage.url(app.id),
            {},
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handleRefresh = () => {
        router.reload({
            only: ['app', 'logs', 'sourceCounts', 'summary'],
        });
    };

    const handleClearLogs = () => {
        setIsClearing(true);
        router.delete(clearAppLogs.url(app.id), {
            data: {
                source: filters.source,
            },
            preserveScroll: true,
            onFinish: () => {
                setIsClearing(false);
                setConfirmClearOpen(false);
            },
        });
    };

    const toggleExpand = (id: number) => {
        setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const hasActiveFilters =
        filters.source !== 'all' ||
        filters.level !== 'all' ||
        filters.status !== 'all' ||
        filters.search.trim() !== '';

    const exportUrl = exportAppLogs.url(app.id, {
        query: {
            ...(filters.source !== 'all' ? { source: filters.source } : {}),
            ...(filters.level !== 'all' ? { level: filters.level } : {}),
        },
    });

    return (
        <>
            <Head title={`Logs — ${app.name}`} />

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl font-bold tracking-tight">
                                Logs de l&apos;application
                            </h1>
                            <Badge variant="outline" className="text-xs">
                                Rétention : {retention.retention_days} jours ·
                                max{' '}
                                {retention.max_entries.toLocaleString('fr-FR')}
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Journal unifié en temps réel des appels API,
                            événements Auth, Web Functions, requêtes MCP et
                            opérations Storage — sans aucun secret exposé.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                        >
                            <RefreshCw className="mr-1.5 size-3.5" />
                            Actualiser
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            disabled={summary.total === 0}
                        >
                            <a href={exportUrl}>
                                <Download className="mr-1.5 size-3.5" />
                                Exporter (.json)
                            </a>
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={summary.total === 0}
                            onClick={() => setConfirmClearOpen(true)}
                        >
                            <Trash2 className="mr-1.5 size-3.5" />
                            {filters.source !== 'all'
                                ? `Vider (${filters.source.toUpperCase()})`
                                : 'Vider les logs'}
                        </Button>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                    Total enregistré
                                </p>
                                <p className="mt-1 text-2xl font-bold tabular-nums">
                                    {summary.total.toLocaleString('fr-FR')}
                                </p>
                            </div>
                            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                                <Activity className="size-4" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                    Succès (Info)
                                </p>
                                <p className="mt-1 text-2xl font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                                    {summary.info_count.toLocaleString('fr-FR')}
                                </p>
                            </div>
                            <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="size-4" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                    Avertissements (4xx)
                                </p>
                                <p className="mt-1 text-2xl font-bold text-amber-600 tabular-nums dark:text-amber-400">
                                    {summary.warning_count.toLocaleString(
                                        'fr-FR',
                                    )}
                                </p>
                            </div>
                            <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="size-4" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                    Erreurs (5xx / RPC)
                                </p>
                                <p className="mt-1 text-2xl font-bold text-red-600 tabular-nums dark:text-red-400">
                                    {summary.error_count.toLocaleString(
                                        'fr-FR',
                                    )}
                                </p>
                            </div>
                            <div className="rounded-lg bg-red-500/10 p-2.5 text-red-600 dark:text-red-400">
                                <ShieldAlert className="size-4" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                    Latence moy. / 429
                                </p>
                                <p className="mt-1 text-2xl font-bold tabular-nums">
                                    {summary.avg_duration_ms} ms
                                </p>
                                {summary.rate_limited_count > 0 && (
                                    <p className="mt-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                                        {summary.rate_limited_count} blocage(s)
                                        429
                                    </p>
                                )}
                            </div>
                            <div className="rounded-lg bg-muted p-2.5 text-muted-foreground">
                                {summary.rate_limited_count > 0 ? (
                                    <Gauge className="size-4 text-orange-500" />
                                ) : (
                                    <Clock className="size-4" />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Source Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                    {SOURCE_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const active = filters.source === tab.key;
                        const count = sourceCounts[tab.key];

                        return (
                            <Button
                                key={tab.key}
                                type="button"
                                size="sm"
                                variant={active ? 'default' : 'outline'}
                                onClick={() =>
                                    navigateWithFilters({
                                        source: tab.key,
                                        page: 1,
                                    })
                                }
                                className="gap-1.5"
                            >
                                <Icon className="size-3.5" />
                                {tab.label}
                                <Badge
                                    variant={active ? 'secondary' : 'outline'}
                                    className="ml-0.5 px-1.5 py-0 text-[10px] tabular-nums"
                                >
                                    {count}
                                </Badge>
                            </Button>
                        );
                    })}
                </div>

                {/* Search & Filters Card */}
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-base">
                                    Journal des événements
                                </CardTitle>
                                <CardDescription>
                                    {logs.total > 0
                                        ? `Affichage de ${logs.from ?? 0} à ${logs.to ?? 0} sur ${logs.total.toLocaleString('fr-FR')} entrée(s) correspondante(s).`
                                        : 'Aucune entrée ne correspond aux filtres sélectionnés.'}
                                </CardDescription>
                            </div>

                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetFilters}
                                >
                                    <X className="mr-1 size-3.5" />
                                    Réinitialiser les filtres
                                </Button>
                            )}
                        </div>

                        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
                            <form
                                onSubmit={handleSearchSubmit}
                                className="flex flex-1 items-center gap-2"
                            >
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={searchInput}
                                        onChange={(e) =>
                                            setSearchInput(e.target.value)
                                        }
                                        placeholder="Rechercher par action, endpoint, message ou IP..."
                                        className="pl-9"
                                    />
                                </div>
                                <Button type="submit" size="sm">
                                    Filtrer
                                </Button>
                            </form>

                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    aria-label="Filtrer par niveau"
                                    value={filters.level}
                                    onChange={(e) =>
                                        navigateWithFilters({
                                            level: e.target.value,
                                            page: 1,
                                        })
                                    }
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="all">Tous niveaux</option>
                                    <option value="info">Info (Succès)</option>
                                    <option value="warning">
                                        Warning (4xx)
                                    </option>
                                    <option value="error">
                                        Error (5xx / RPC)
                                    </option>
                                </select>

                                <select
                                    aria-label="Filtrer par statut HTTP"
                                    value={filters.status}
                                    onChange={(e) =>
                                        navigateWithFilters({
                                            status: e.target.value,
                                            page: 1,
                                        })
                                    }
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="all">Tous statuts</option>
                                    <option value="2xx">Succès (2xx)</option>
                                    <option value="4xx">Client (4xx)</option>
                                    <option value="429">
                                        Rate Limit (429)
                                    </option>
                                    <option value="5xx">Serveur (5xx)</option>
                                </select>

                                <select
                                    aria-label="Nombre d'entrées par page"
                                    value={filters.per_page}
                                    onChange={(e) =>
                                        navigateWithFilters({
                                            per_page: Number(e.target.value),
                                            page: 1,
                                        })
                                    }
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value={20}>20 / page</option>
                                    <option value={30}>30 / page</option>
                                    <option value={50}>50 / page</option>
                                    <option value={100}>100 / page</option>
                                </select>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-2">
                        {logs.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                                <ScrollText className="size-10 text-muted-foreground/50" />
                                <p className="mt-3 text-sm font-medium">
                                    Aucun log enregistré pour le moment
                                </p>
                                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                                    Les appels API (`/api/v1/*`), opérations
                                    Auth, Web Functions, requêtes MCP (`/mcp`)
                                    et uploads Storage apparaîtront ici
                                    automatiquement.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y rounded-lg border">
                                {logs.data.map((entry) => {
                                    const isExpanded = !!expandedIds[entry.id];
                                    const keyRoleLabel = getKeyRoleLabel(
                                        entry.api_key_role,
                                    );

                                    return (
                                        <div
                                            key={entry.id}
                                            className="transition-colors hover:bg-muted/30"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleExpand(entry.id)
                                                }
                                                className="flex w-full flex-col gap-2 px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                                                        {formatDateTime(
                                                            entry.created_at,
                                                        )}
                                                    </span>

                                                    <Badge
                                                        className={`shrink-0 text-[10px] ${getSourceBadgeClass(entry.source)}`}
                                                    >
                                                        {getSourceLabel(
                                                            entry.source,
                                                        )}
                                                    </Badge>

                                                    {entry.status_code !==
                                                        null && (
                                                        <Badge
                                                            className={`shrink-0 font-mono text-[10px] ${getStatusBadgeClass(entry.status_code, entry.level)}`}
                                                        >
                                                            {entry.status_code}
                                                        </Badge>
                                                    )}

                                                    {entry.method && (
                                                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                                                            {entry.method}
                                                        </span>
                                                    )}

                                                    <span className="truncate font-mono text-xs font-medium text-foreground">
                                                        {entry.action}
                                                    </span>

                                                    {entry.message && (
                                                        <span className="hidden truncate text-xs text-muted-foreground xl:inline">
                                                            — {entry.message}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex shrink-0 items-center gap-2.5 text-xs text-muted-foreground">
                                                    {keyRoleLabel && (
                                                        <Badge
                                                            variant="outline"
                                                            className="hidden text-[10px] md:inline-flex"
                                                        >
                                                            {keyRoleLabel}
                                                        </Badge>
                                                    )}
                                                    {entry.duration_ms !==
                                                        null && (
                                                        <span className="font-mono text-[11px] tabular-nums">
                                                            {entry.duration_ms}{' '}
                                                            ms
                                                        </span>
                                                    )}
                                                    {entry.ip_address && (
                                                        <span className="hidden font-mono text-[11px] lg:inline">
                                                            {entry.ip_address}
                                                        </span>
                                                    )}
                                                    <ChevronDown
                                                        className={`size-4 transition-transform ${
                                                            isExpanded
                                                                ? 'rotate-180'
                                                                : ''
                                                        }`}
                                                    />
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="space-y-3 border-t bg-muted/20 px-4 py-3 text-xs">
                                                    {entry.message && (
                                                        <div>
                                                            <p className="mb-1 font-semibold text-muted-foreground">
                                                                Message
                                                            </p>
                                                            <p className="rounded-md border bg-background px-3 py-2 text-foreground">
                                                                {entry.message}
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                                        <div className="rounded-md border bg-background px-3 py-2">
                                                            <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                                                                Chemin
                                                            </span>
                                                            <p className="mt-0.5 truncate font-mono text-foreground">
                                                                {entry.path ??
                                                                    '—'}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-md border bg-background px-3 py-2">
                                                            <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                                                                Authentification
                                                            </span>
                                                            <p className="mt-0.5 font-medium text-foreground">
                                                                {keyRoleLabel ??
                                                                    'Non spécifiée'}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-md border bg-background px-3 py-2">
                                                            <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                                                                Adresse IP
                                                            </span>
                                                            <p className="mt-0.5 font-mono text-foreground">
                                                                {entry.ip_address ??
                                                                    '—'}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-md border bg-background px-3 py-2">
                                                            <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                                                                Durée / Niveau
                                                            </span>
                                                            <p className="mt-0.5 font-mono text-foreground">
                                                                {entry.duration_ms !==
                                                                null
                                                                    ? `${entry.duration_ms} ms`
                                                                    : '—'}{' '}
                                                                ·{' '}
                                                                {entry.level.toUpperCase()}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {entry.context &&
                                                        Object.keys(
                                                            entry.context,
                                                        ).length > 0 && (
                                                            <div>
                                                                <p className="mb-1 font-semibold text-muted-foreground">
                                                                    Contexte
                                                                    structuré
                                                                    (assaini)
                                                                </p>
                                                                <pre className="max-h-60 overflow-auto rounded-md border bg-zinc-950 p-3 font-mono text-[11px] text-zinc-100">
                                                                    {JSON.stringify(
                                                                        entry.context,
                                                                        null,
                                                                        2,
                                                                    )}
                                                                </pre>
                                                            </div>
                                                        )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination */}
                        {logs.last_page > 1 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                                <p className="text-xs text-muted-foreground">
                                    Page {logs.current_page} sur{' '}
                                    {logs.last_page}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={logs.current_page <= 1}
                                        onClick={() =>
                                            navigateWithFilters({
                                                page: logs.current_page - 1,
                                            })
                                        }
                                    >
                                        <ChevronLeft className="mr-1 size-3.5" />
                                        Précédent
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={
                                            logs.current_page >= logs.last_page
                                        }
                                        onClick={() =>
                                            navigateWithFilters({
                                                page: logs.current_page + 1,
                                            })
                                        }
                                    >
                                        Suivant
                                        <ChevronRight className="ml-1 size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ConfirmActionDialog
                open={confirmClearOpen}
                onOpenChange={setConfirmClearOpen}
                title={
                    filters.source !== 'all'
                        ? `Vider les logs [${filters.source.toUpperCase()}] ?`
                        : "Vider tous les logs de l'application ?"
                }
                description={
                    filters.source !== 'all'
                        ? `Toutes les entrées de source "${filters.source}" seront définitivement supprimées pour ${app.name}.`
                        : `Toutes les entrées du journal d'activité de ${app.name} seront définitivement supprimées.`
                }
                confirmLabel="Vider maintenant"
                variant="destructive"
                processing={isClearing}
                onConfirm={handleClearLogs}
            />
        </>
    );
}

ClientAppLogs.layout = {
    breadcrumbs: [
        {
            title: 'Mes Applications',
            href: dashboard(),
        },
        {
            title: 'Logs',
            href: '#',
        },
    ],
};
