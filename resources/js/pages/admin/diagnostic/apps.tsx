import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
    Bot,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Cpu,
    Database,
    ExternalLink,
    FolderOpen,
    Layers,
    Search,
    ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import {
    DonutChart,
    HorizontalBarChart,
    VerticalBarChart,
} from '@/components/admin-charts';
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

type DiagnosticAppRow = {
    id: string;
    name: string;
    description: string | null;
    public_key: string;
    api_calls_count: number;
    files_count: number;
    functions_count: number;
    cors_origins_count: number;
    database_size_bytes: number;
    files_size_bytes: number;
    mcp_enabled: boolean;
    mcp_read_only: boolean;
    rate_limit_enabled: boolean;
    rate_limit_per_minute: number;
    user: {
        id: number;
        name: string;
        email: string;
        is_suspended: boolean;
    } | null;
    created_at: string | null;
};

type PaginatedApps = {
    items: DiagnosticAppRow[];
    total: number;
    page: number;
    per_page: number;
    last_page: number;
};

type AppFilters = {
    search: string;
    owner_status: string;
    mcp_status: string;
    sort: string;
    direction: 'asc' | 'desc';
    per_page: number;
};

type AppCharts = {
    total_apps: number;
    active_owner_apps: number;
    suspended_owner_apps: number;
    mcp_enabled_apps: number;
    with_functions_apps: number;
    with_files_apps: number;
    timeline: Array<{ label: string; value: number }>;
    top_api_apps: Array<{
        id: string;
        label: string;
        sublabel: string;
        value: number;
    }>;
};

function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) {
        return '0 o';
    }
    const k = 1024;
    const sizes = ['o', 'Ko', 'Mo', 'Go'];
    const i = Math.min(
        Math.floor(Math.log(bytes) / Math.log(k)),
        sizes.length - 1,
    );

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function AdminDiagnosticApps({
    paginatedApps,
    filters,
    appCharts,
}: {
    paginatedApps: PaginatedApps;
    filters: AppFilters;
    appCharts: AppCharts;
}) {
    const [searchInput, setSearchInput] = useState(filters.search);
    const [ownerStatus, setOwnerStatus] = useState(filters.owner_status);
    const [mcpStatus, setMcpStatus] = useState(filters.mcp_status);
    const [sort, setSort] = useState(filters.sort);
    const [direction, setDirection] = useState<'asc' | 'desc'>(
        filters.direction,
    );
    const [perPage, setPerPage] = useState(filters.per_page);

    function applyFilters(overrides: Partial<AppFilters & { page?: number }>) {
        router.get(
            '/admin/diagnostic/apps',
            {
                search: overrides.search ?? searchInput,
                owner_status: overrides.owner_status ?? ownerStatus,
                mcp_status: overrides.mcp_status ?? mcpStatus,
                sort: overrides.sort ?? sort,
                direction: overrides.direction ?? direction,
                per_page: overrides.per_page ?? perPage,
                page: overrides.page ?? 1,
            },
            { preserveState: true, preserveScroll: true },
        );
    }

    return (
        <>
            <Head title="App List — Diagnostic Zenbase" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="size-5 text-amber-500" />
                            <span className="text-xs font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                                Administration Zenbase · Diagnostic
                            </span>
                        </div>
                        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
                            <Layers className="size-6 text-emerald-600" />
                            Liste des Applications ({appCharts.total_apps})
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Vue consolidée, statistiques d&apos;adoption et
                            tableau filtrable de toutes les applications
                            hébergées sur la plateforme.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge
                            variant="outline"
                            className="px-3 py-1 font-mono text-xs"
                        >
                            MCP actifs : {appCharts.mcp_enabled_apps}
                        </Badge>
                        <Badge
                            variant="outline"
                            className="px-3 py-1 font-mono text-xs"
                        >
                            Avec Functions : {appCharts.with_functions_apps}
                        </Badge>
                        <Badge
                            variant="outline"
                            className="px-3 py-1 font-mono text-xs"
                        >
                            Avec Fichiers : {appCharts.with_files_apps}
                        </Badge>
                    </div>
                </div>

                {/* Statistical Charts */}
                <div className="grid gap-6 lg:grid-cols-12">
                    <Card className="lg:col-span-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Activity className="size-4 text-emerald-600" />
                                Créations (6 mois)
                            </CardTitle>
                            <CardDescription>
                                Nouvelles applications par mois
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <VerticalBarChart
                                items={appCharts.timeline}
                                barColorClass="bg-emerald-500"
                            />
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <BarChart3 className="size-4 text-blue-500" />
                                Top Appels API
                            </CardTitle>
                            <CardDescription>
                                Applications les plus sollicitées
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <HorizontalBarChart
                                items={appCharts.top_api_apps}
                                emptyText="Aucune application enregistrée."
                                barColorClass="bg-blue-500"
                                formatValue={(v) =>
                                    `${v.toLocaleString('fr-FR')} req`
                                }
                            />
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Bot className="size-4 text-emerald-600" />
                                Statut &amp; Adoption MCP
                            </CardTitle>
                            <CardDescription>
                                Répartition des propriétaires actifs vs
                                suspendus
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DonutChart
                                segments={[
                                    {
                                        label: 'Propriétaire actif',
                                        value: appCharts.active_owner_apps,
                                        color: '#10b981',
                                    },
                                    {
                                        label: 'Propriétaire suspendu',
                                        value: appCharts.suspended_owner_apps,
                                        color: '#ef4444',
                                    },
                                ]}
                                centerLabel="Apps"
                                centerValue={String(appCharts.total_apps)}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Filterable & Paginated Data Table */}
                <Card>
                    <CardHeader className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-base">
                                    Tableau des Applications (
                                    {paginatedApps.total} résultat(s))
                                </CardTitle>
                                <CardDescription>
                                    Filtrez par nom, UUID, propriétaire, statut
                                    ou serveur MCP
                                </CardDescription>
                            </div>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                applyFilters({ page: 1 });
                            }}
                            className="flex flex-wrap items-center gap-2"
                        >
                            <div className="relative min-w-[220px] flex-1">
                                <Search className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
                                <Input
                                    value={searchInput}
                                    onChange={(e) =>
                                        setSearchInput(e.target.value)
                                    }
                                    placeholder="Rechercher par nom d'app, UUID, nom ou e-mail client..."
                                    className="h-9 pl-8 text-xs"
                                />
                            </div>

                            <select
                                value={ownerStatus}
                                onChange={(e) => {
                                    setOwnerStatus(e.target.value);
                                    applyFilters({
                                        owner_status: e.target.value,
                                        page: 1,
                                    });
                                }}
                                aria-label="Statut propriétaire"
                                className="h-9 rounded-md border bg-background px-2.5 text-xs"
                            >
                                <option value="all">
                                    Tous les propriétaires
                                </option>
                                <option value="active">
                                    Propriétaires actifs
                                </option>
                                <option value="suspended">
                                    Propriétaires suspendus
                                </option>
                            </select>

                            <select
                                value={mcpStatus}
                                onChange={(e) => {
                                    setMcpStatus(e.target.value);
                                    applyFilters({
                                        mcp_status: e.target.value,
                                        page: 1,
                                    });
                                }}
                                aria-label="Statut MCP"
                                className="h-9 rounded-md border bg-background px-2.5 text-xs"
                            >
                                <option value="all">MCP : Tous</option>
                                <option value="enabled">MCP : Activé</option>
                                <option value="disabled">
                                    MCP : Désactivé
                                </option>
                            </select>

                            <select
                                value={`${sort}:${direction}`}
                                onChange={(e) => {
                                    const [s, d] = e.target.value.split(
                                        ':',
                                    ) as [string, 'asc' | 'desc'];
                                    setSort(s);
                                    setDirection(d);
                                    applyFilters({
                                        sort: s,
                                        direction: d,
                                        page: 1,
                                    });
                                }}
                                aria-label="Trier les applications"
                                className="h-9 rounded-md border bg-background px-2.5 text-xs"
                            >
                                <option value="created_at:desc">
                                    Plus récentes
                                </option>
                                <option value="created_at:asc">
                                    Plus anciennes
                                </option>
                                <option value="api_calls_count:desc">
                                    Appels API (Décroissant)
                                </option>
                                <option value="files_count:desc">
                                    Fichiers (Décroissant)
                                </option>
                                <option value="functions_count:desc">
                                    Functions (Décroissant)
                                </option>
                                <option value="name:asc">Nom (A → Z)</option>
                            </select>

                            <select
                                value={perPage}
                                onChange={(e) => {
                                    const next = Number(e.target.value);
                                    setPerPage(next);
                                    applyFilters({ per_page: next, page: 1 });
                                }}
                                aria-label="Applications par page"
                                className="h-9 rounded-md border bg-background px-2.5 font-mono text-xs"
                            >
                                <option value={10}>10 / page</option>
                                <option value={25}>25 / page</option>
                                <option value={50}>50 / page</option>
                                <option value={100}>100 / page</option>
                            </select>

                            <Button type="submit" size="sm" variant="outline">
                                Filtrer
                            </Button>
                        </form>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {paginatedApps.items.length === 0 ? (
                            <p className="py-10 text-center text-sm text-muted-foreground">
                                Aucune application ne correspond aux critères
                                sélectionnés.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b text-xs text-muted-foreground uppercase">
                                            <th className="pb-3 font-medium">
                                                Application
                                            </th>
                                            <th className="pb-3 font-medium">
                                                Propriétaire
                                            </th>
                                            <th className="pb-3 font-medium">
                                                Appels &amp; Rate Limit
                                            </th>
                                            <th className="pb-3 font-medium">
                                                Stockage &amp; Modules
                                            </th>
                                            <th className="pb-3 font-medium">
                                                MCP
                                            </th>
                                            <th className="pb-3 text-right font-medium">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {paginatedApps.items.map((app) => (
                                            <tr
                                                key={app.id}
                                                className="hover:bg-muted/40"
                                            >
                                                <td className="py-3">
                                                    <div className="font-semibold">
                                                        {app.name}
                                                    </div>
                                                    <div className="font-mono text-[11px] text-muted-foreground">
                                                        {app.id}
                                                    </div>
                                                    {app.created_at && (
                                                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/80">
                                                            <Calendar className="size-3" />
                                                            {new Date(
                                                                app.created_at,
                                                            ).toLocaleDateString(
                                                                'fr-FR',
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3">
                                                    {app.user ? (
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-1.5 font-medium">
                                                                <span>
                                                                    {
                                                                        app.user
                                                                            .name
                                                                    }
                                                                </span>
                                                                {app.user
                                                                    .is_suspended && (
                                                                    <Badge
                                                                        variant="destructive"
                                                                        className="text-[10px]"
                                                                    >
                                                                        Suspendu
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {app.user.email}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 text-xs">
                                                    <div className="font-mono font-semibold">
                                                        {app.api_calls_count.toLocaleString(
                                                            'fr-FR',
                                                        )}{' '}
                                                        req
                                                    </div>
                                                    <div className="font-mono text-[11px] text-muted-foreground">
                                                        Limit :{' '}
                                                        {app.rate_limit_enabled
                                                            ? `${app.rate_limit_per_minute}/min`
                                                            : 'Off'}
                                                    </div>
                                                </td>
                                                <td className="py-3 text-xs">
                                                    <div className="flex items-center gap-1.5 font-mono">
                                                        <Database className="size-3 text-emerald-500" />
                                                        <span>
                                                            {formatBytes(
                                                                app.database_size_bytes +
                                                                    app.files_size_bytes,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                                                        <span className="inline-flex items-center gap-1">
                                                            <FolderOpen className="size-3 text-blue-500" />
                                                            {app.files_count}{' '}
                                                            fich.
                                                        </span>
                                                        <span className="inline-flex items-center gap-1">
                                                            <Cpu className="size-3 text-purple-500" />
                                                            {
                                                                app.functions_count
                                                            }{' '}
                                                            fn
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    <Badge
                                                        variant={
                                                            app.mcp_enabled
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                        className={
                                                            app.mcp_enabled
                                                                ? 'bg-emerald-600/15 font-mono text-[10px] text-emerald-700 hover:bg-emerald-600/15 dark:text-emerald-300'
                                                                : 'font-mono text-[10px]'
                                                        }
                                                    >
                                                        {app.mcp_enabled
                                                            ? app.mcp_read_only
                                                                ? 'MCP · RO'
                                                                : 'MCP · RW'
                                                            : 'Off'}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <Link
                                                            href={`/dashboard/apps/${app.id}`}
                                                        >
                                                            Inspecter
                                                            <ExternalLink className="ml-1.5 size-3.5" />
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination Controls */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
                            <span>
                                Affichage de{' '}
                                <strong>{paginatedApps.items.length}</strong>{' '}
                                sur <strong>{paginatedApps.total}</strong>{' '}
                                application(s)
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={paginatedApps.page <= 1}
                                    onClick={() =>
                                        applyFilters({
                                            page: paginatedApps.page - 1,
                                        })
                                    }
                                >
                                    <ChevronLeft className="mr-1 size-3.5" />
                                    Précédent
                                </Button>
                                <span className="font-mono">
                                    Page {paginatedApps.page} /{' '}
                                    {paginatedApps.last_page}
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={
                                        paginatedApps.page >=
                                        paginatedApps.last_page
                                    }
                                    onClick={() =>
                                        applyFilters({
                                            page: paginatedApps.page + 1,
                                        })
                                    }
                                >
                                    Suivant
                                    <ChevronRight className="ml-1 size-3.5" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

AdminDiagnosticApps.layout = {
    breadcrumbs: [
        { title: 'Administration Globale', href: '/admin/dashboard' },
        { title: 'Diagnostic', href: '#' },
        { title: 'App List', href: '/admin/diagnostic/apps' },
    ],
};
