import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    Cpu,
    Database,
    ExternalLink,
    FolderOpen,
    HardDrive,
    Layers,
    ShieldAlert,
    Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { ZenbaseApp } from '@/types';

type AdminStats = {
    total_users: number;
    active_users: number;
    suspended_users: number;
    total_apps: number;
    total_api_calls: number;
    total_files: number;
    total_functions: number;
    total_storage_bytes: number;
    files_storage_bytes: number;
    databases_storage_bytes: number;
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
    if (bytes === 0) {
        return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function AdminDashboard({
    stats,
    apps,
    systemHealth,
}: {
    stats: AdminStats;
    apps: ZenbaseApp[];
    systemHealth: SystemHealth;
}) {
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
                            Dashboard Global & Supervision Zenbase
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Vue d&apos;ensemble de la Base Centrale (Core), des clients inscrits, des applications isolées et de la santé du serveur.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button asChild variant="outline">
                            <Link href="/admin/users">
                                <Users className="mr-2 size-4" />
                                Gérer les Clients ({stats.total_users})
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
                            <div className="text-2xl font-bold">{stats.total_users}</div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {stats.active_users} actifs · {stats.suspended_users} suspendus
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
                            <div className="text-2xl font-bold">{stats.total_apps}</div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {stats.total_functions} Web Functions · {stats.total_files} fichiers
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
                                {stats.total_api_calls.toLocaleString()}
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
                                SQLite : {formatBytes(stats.databases_storage_bytes)} · Fichiers : {formatBytes(stats.files_storage_bytes)}
                            </p>
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
                                État de l&apos;infrastructure et des moteurs d&apos;exécution
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-muted-foreground">Statut Serveur BaaS</span>
                                <Badge className="bg-emerald-600 text-white">Opérationnel</Badge>
                            </div>
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-muted-foreground">Version PHP</span>
                                <span className="font-mono font-medium">{systemHealth.php_version}</span>
                            </div>
                            <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-muted-foreground">Moteur Zenbase Core</span>
                                <span className="font-mono font-medium">v{systemHealth.laravel_version}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Moteur SQLite + JSON1</span>
                                <span className="font-mono font-medium">{systemHealth.sqlite_version}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base">
                                Journaux d&apos;Exécution Globaux (Monitoring)
                            </CardTitle>
                            <CardDescription>
                                Historique récent des appels aux Web Functions PHP sur la plateforme
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {systemHealth.recent_logs.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">
                                    Aucun journal d&apos;exécution enregistré pour le moment.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b text-muted-foreground">
                                                <th className="pb-2 font-medium">Application</th>
                                                <th className="pb-2 font-medium">Fonction</th>
                                                <th className="pb-2 font-medium">Statut</th>
                                                <th className="pb-2 font-medium">Durée</th>
                                                <th className="pb-2 font-medium">Détail</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {systemHealth.recent_logs.map((log, idx) => (
                                                <tr key={idx}>
                                                    <td className="py-2 font-medium">{log.app_name}</td>
                                                    <td className="py-2 font-mono">{log.function_name}</td>
                                                    <td className="py-2">
                                                        <Badge
                                                            variant={log.error ? 'destructive' : 'secondary'}
                                                        >
                                                            {log.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-2 font-mono">{log.duration_ms} ms</td>
                                                    <td className="max-w-xs truncate py-2 text-muted-foreground">
                                                        {log.error || 'Exécution réussie'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* All Platform Applications */}
                <Card>
                    <CardHeader>
                        <CardTitle>Toutes les Applications de la Plateforme ({apps.length})</CardTitle>
                        <CardDescription>
                            Vue d&apos;ensemble de chaque application créée et de son propriétaire
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {apps.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                Aucune application n&apos;a encore été créée sur la plateforme.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b text-xs text-muted-foreground uppercase">
                                            <th className="pb-3 font-medium">Application</th>
                                            <th className="pb-3 font-medium">Propriétaire (Client)</th>
                                            <th className="pb-3 font-medium">Appels API</th>
                                            <th className="pb-3 font-medium">BDD SQLite</th>
                                            <th className="pb-3 font-medium">Fichiers / Functions</th>
                                            <th className="pb-3 text-right font-medium">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {apps.map((app) => (
                                            <tr key={app.id} className="hover:bg-muted/40">
                                                <td className="py-3">
                                                    <div className="font-semibold">{app.name}</div>
                                                    <div className="font-mono text-xs text-muted-foreground">
                                                        {app.id}
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    {app.user ? (
                                                        <div>
                                                            <div className="font-medium">{app.user.name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {app.user.email}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3 font-mono">
                                                    {app.api_calls_count.toLocaleString()}
                                                </td>
                                                <td className="py-3 font-mono text-xs">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Database className="size-3.5 text-emerald-500" />
                                                        {formatBytes(app.database_size_bytes)}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-xs">
                                                    <span className="inline-flex items-center gap-2">
                                                        <FolderOpen className="size-3.5 text-blue-500" />
                                                        {app.files_count ?? 0} fichiers · {app.functions_count ?? 0} fonctions
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <Button asChild size="sm" variant="outline">
                                                        <Link href={`/dashboard/apps/${app.id}`}>
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
                    </CardContent>
                </Card>
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
