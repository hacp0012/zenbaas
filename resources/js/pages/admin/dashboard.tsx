import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowRight,
    BarChart3,
    Cpu,
    HardDrive,
    Layers,
    ScrollText,
    ShieldAlert,
    SlidersHorizontal,
    Users,
} from 'lucide-react';
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

type AdminStats = {
    total_users: number;
    active_users: number;
    suspended_users: number;
    total_apps: number;
    mcp_enabled_apps: number;
    total_api_calls: number;
    total_files: number;
    total_functions: number;
    total_storage_bytes: number;
    files_storage_bytes: number;
    databases_storage_bytes: number;
    global_max_storage_mb: number | null;
    global_max_storage_bytes: number | null;
};

type AdminDashboardCharts = {
    top_apps_by_api: Array<{
        id: string;
        label: string;
        sublabel: string;
        value: number;
    }>;
    apps_timeline: Array<{
        label: string;
        value: number;
    }>;
    storage_distribution: Array<{
        label: string;
        value: number;
        color: string;
    }>;
    users_distribution: Array<{
        label: string;
        value: number;
        color: string;
    }>;
};

type SystemHealth = {
    status: string;
    php_version: string;
    laravel_version: string;
    sqlite_version: string;
    recent_logs: Array<{
        app_name: string;
        function_name: string;
        timestamp: string | null;
        status: number;
        duration_ms: number;
        error: string | null;
    }>;
};

function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) {
        return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(
        Math.floor(Math.log(bytes) / Math.log(k)),
        sizes.length - 1,
    );

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function AdminDashboard({
    stats,
    charts,
    systemHealth,
}: {
    stats: AdminStats;
    charts: AdminDashboardCharts;
    systemHealth: SystemHealth;
}) {
    const globalStoragePct =
        stats.global_max_storage_bytes && stats.global_max_storage_bytes > 0
            ? Math.min(
                  100,
                  Math.round(
                      (stats.total_storage_bytes /
                          stats.global_max_storage_bytes) *
                          100,
                  ),
              )
            : null;

    return (
        <>
            <Head title="Administration Globale — Zenbase" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="size-5 text-amber-500" />
                            <span className="text-xs font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                                Espace Super-Administrateur
                            </span>
                        </div>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight">
                            Dashboard Global &amp; Supervision Zenbase
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Vue d&apos;ensemble de la Base Centrale (Core), des
                            métriques de consommation, des tendances
                            applicatives et de la santé du serveur.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/settings/configs">
                                <SlidersHorizontal className="mr-1.5 size-3.5" />
                                Configs par défaut
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/diagnostic/apps">
                                <Layers className="mr-1.5 size-3.5" />
                                App List ({stats.total_apps})
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/users">
                                <Users className="mr-1.5 size-3.5" />
                                Clients ({stats.total_users})
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Global Metrics */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                Clients / Développeurs
                            </CardTitle>
                            <Users className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.total_users}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {stats.active_users} actifs ·{' '}
                                {stats.suspended_users} suspendus
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                Applications Créées
                            </CardTitle>
                            <Layers className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.total_apps}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {stats.total_functions} Web Functions ·{' '}
                                {stats.mcp_enabled_apps} MCP actif(s)
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                Appels API (SDK Gateway)
                            </CardTitle>
                            <Activity className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.total_api_calls.toLocaleString('fr-FR')}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Requêtes traitées par le noyau Zenbase Core
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                Stockage Global Consommé
                            </CardTitle>
                            <HardDrive className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatBytes(stats.total_storage_bytes)}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {stats.global_max_storage_mb !== null
                                    ? `Plafond : ${stats.global_max_storage_mb} Mo (${globalStoragePct}%)`
                                    : `SQLite : ${formatBytes(stats.databases_storage_bytes)} · Fichiers : ${formatBytes(stats.files_storage_bytes)}`}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Summary Charts Row (replaces the full apps table) */}
                <div className="grid gap-6 lg:grid-cols-12">
                    <Card className="lg:col-span-6">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <BarChart3 className="size-4 text-emerald-600" />
                                        Top Applications par Appels API
                                    </CardTitle>
                                    <CardDescription>
                                        Volume de trafic SDK par application
                                    </CardDescription>
                                </div>
                                <Button asChild size="sm" variant="ghost">
                                    <Link href="/admin/diagnostic/apps">
                                        App List
                                        <ArrowRight className="ml-1 size-3.5" />
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <HorizontalBarChart
                                items={charts.top_apps_by_api}
                                emptyText="Aucune application enregistrée."
                                barColorClass="bg-emerald-500"
                                formatValue={(v) =>
                                    `${v.toLocaleString('fr-FR')} req`
                                }
                            />
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-6">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <HardDrive className="size-4 text-blue-500" />
                                        Répartition du Stockage Global
                                    </CardTitle>
                                    <CardDescription>
                                        Bases SQLite isolées vs fichiers stockés
                                        ({stats.total_files} fichiers)
                                    </CardDescription>
                                </div>
                                <Button asChild size="sm" variant="ghost">
                                    <Link href="/admin/settings/storage">
                                        Gérer
                                        <ArrowRight className="ml-1 size-3.5" />
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <DonutChart
                                segments={charts.storage_distribution}
                                centerLabel="Total"
                                centerValue={formatBytes(
                                    stats.total_storage_bytes,
                                )}
                                formatValue={formatBytes}
                            />
                            {globalStoragePct !== null && (
                                <div className="space-y-1.5 border-t pt-3 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Utilisation du quota global
                                        </span>
                                        <span className="font-mono font-semibold">
                                            {globalStoragePct}%
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className={`h-full rounded-full ${
                                                globalStoragePct >= 90
                                                    ? 'bg-red-500'
                                                    : 'bg-emerald-500'
                                            }`}
                                            style={{
                                                width: `${globalStoragePct}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Growth Timeline & User Status Charts */}
                <div className="grid gap-6 lg:grid-cols-12">
                    <Card className="lg:col-span-7">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Layers className="size-4 text-emerald-600" />
                                Nouvelles Applications (6 derniers mois)
                            </CardTitle>
                            <CardDescription>
                                Évolution mensuelle des créations
                                d&apos;applications sur la plateforme
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <VerticalBarChart
                                items={charts.apps_timeline}
                                barColorClass="bg-emerald-500"
                            />
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="size-4 text-emerald-600" />
                                État des Comptes Utilisateurs
                            </CardTitle>
                            <CardDescription>
                                Proportion des comptes actifs vs suspendus /
                                expirés
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DonutChart
                                segments={charts.users_distribution}
                                centerLabel="Comptes"
                                centerValue={String(stats.total_users)}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* System Health + Recent Logs */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Cpu className="size-4 text-emerald-500" />
                                Santé du Système (Core Engine)
                            </CardTitle>
                            <CardDescription>
                                État de l&apos;infrastructure et des moteurs
                                d&apos;exécution
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between py-1">
                                <span className="text-muted-foreground">
                                    Statut Serveur BaaS
                                </span>
                                <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
                                    Opérationnel
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <span className="text-muted-foreground">
                                    Version PHP
                                </span>
                                <span className="font-mono font-medium">
                                    {systemHealth.php_version}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <span className="text-muted-foreground">
                                    Moteur Zenbase Core
                                </span>
                                <span className="font-mono font-medium">
                                    v{systemHealth.laravel_version}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <span className="text-muted-foreground">
                                    Moteur SQLite + JSON1
                                </span>
                                <span className="font-mono font-medium">
                                    {systemHealth.sqlite_version}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-base">
                                        Journaux d&apos;Exécution Globaux
                                        (Monitoring)
                                    </CardTitle>
                                    <CardDescription>
                                        Historique récent des appels aux Web
                                        Functions PHP sur la plateforme
                                    </CardDescription>
                                </div>
                                <Button asChild size="sm" variant="ghost">
                                    <Link href="/admin/diagnostic/logs">
                                        <ScrollText className="mr-1.5 size-3.5" />
                                        Logs système
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {systemHealth.recent_logs.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">
                                    Aucun journal d&apos;exécution enregistré
                                    pour le moment.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b text-muted-foreground">
                                                <th className="pb-2 font-medium">
                                                    Application
                                                </th>
                                                <th className="pb-2 font-medium">
                                                    Fonction
                                                </th>
                                                <th className="pb-2 font-medium">
                                                    Statut
                                                </th>
                                                <th className="pb-2 font-medium">
                                                    Durée
                                                </th>
                                                <th className="pb-2 font-medium">
                                                    Détail
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {systemHealth.recent_logs.map(
                                                (log, idx) => (
                                                    <tr key={idx}>
                                                        <td className="py-2 font-medium">
                                                            {log.app_name}
                                                        </td>
                                                        <td className="py-2 font-mono">
                                                            {log.function_name}
                                                        </td>
                                                        <td className="py-2">
                                                            <Badge
                                                                variant={
                                                                    log.error
                                                                        ? 'destructive'
                                                                        : 'secondary'
                                                                }
                                                            >
                                                                {log.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-2 font-mono">
                                                            {log.duration_ms} ms
                                                        </td>
                                                        <td className="max-w-xs truncate py-2 text-muted-foreground">
                                                            {log.error ||
                                                                'Exécution réussie'}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Administration Globale',
            href: '/admin/dashboard',
        },
    ],
};
