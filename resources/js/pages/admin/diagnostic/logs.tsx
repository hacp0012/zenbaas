import { Head, router } from '@inertiajs/react';
import {
    ChevronDown,
    Cpu,
    Download,
    RefreshCw,
    ScrollText,
    Search,
    ShieldAlert,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import {
    clearLogs,
    downloadLogs,
} from '@/actions/App/Http/Controllers/Admin/AdminDiagnosticController';
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

type SystemLogEntry = {
    id: string;
    timestamp: string;
    environment: string;
    level: string;
    message: string;
    trace: string;
};

type FunctionLogEntry = {
    app_id: string;
    app_name: string;
    function_name: string;
    timestamp: string | null;
    status: number;
    duration_ms: number;
    output: string | null;
    error: string | null;
};

type LogFilters = {
    level: string;
    search: string;
    limit: number;
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

function getLevelBadgeClass(level: string): string {
    switch (level) {
        case 'EMERGENCY':
        case 'ALERT':
        case 'CRITICAL':
        case 'ERROR':
            return 'bg-red-500/15 text-red-700 hover:bg-red-500/15 dark:text-red-300';
        case 'WARNING':
        case 'NOTICE':
            return 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300';
        case 'INFO':
            return 'bg-sky-500/15 text-sky-700 hover:bg-sky-500/15 dark:text-sky-300';
        default:
            return 'bg-muted text-muted-foreground';
    }
}

export default function AdminDiagnosticLogs({
    systemLogs,
    totalMatchingLogs,
    totalParsedLogs,
    levelCounts,
    logFileInfo,
    functionLogs,
    filters,
}: {
    systemLogs: SystemLogEntry[];
    totalMatchingLogs: number;
    totalParsedLogs: number;
    levelCounts: {
        ERROR: number;
        WARNING: number;
        INFO: number;
        DEBUG: number;
    };
    logFileInfo: {
        exists: boolean;
        path: string;
        size_bytes: number;
        updated_at: string | null;
    };
    functionLogs: FunctionLogEntry[];
    filters: LogFilters;
}) {
    const [activeTab, setActiveTab] = useState<'system' | 'functions'>(
        'system',
    );
    const [searchInput, setSearchInput] = useState(filters.search);
    const [activeLevel, setActiveLevel] = useState(filters.level);
    const [activeLimit, setActiveLimit] = useState(filters.limit);
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
    const [confirmClearOpen, setConfirmClearOpen] = useState(false);

    function applyFilters(overrides: Partial<LogFilters>) {
        router.get(
            '/admin/diagnostic/logs',
            {
                level: overrides.level ?? activeLevel,
                search: overrides.search ?? searchInput,
                limit: overrides.limit ?? activeLimit,
            },
            { preserveState: true, preserveScroll: true },
        );
    }

    function toggleExpand(id: string) {
        setExpandedIds((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    }

    return (
        <>
            <Head title="Logs Système — Diagnostic Zenbase" />
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
                            <ScrollText className="size-6 text-emerald-600" />
                            Journaux Système &amp; Diagnostic
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Consultez les entrées de{' '}
                            <code className="font-mono text-xs">
                                {logFileInfo.path}
                            </code>{' '}
                            ({formatBytes(logFileInfo.size_bytes)}) et les
                            journaux d&apos;exécution des Web Functions PHP.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => applyFilters({})}
                        >
                            <RefreshCw className="mr-1.5 size-3.5" />
                            Actualiser
                        </Button>
                        {logFileInfo.exists && logFileInfo.size_bytes > 0 && (
                            <>
                                <Button asChild size="sm" variant="outline">
                                    <a href={downloadLogs.url()}>
                                        <Download className="mr-1.5 size-3.5" />
                                        Télécharger .log
                                    </a>
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setConfirmClearOpen(true)}
                                >
                                    <Trash2 className="mr-1.5 size-3.5" />
                                    Vider les logs
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Level Summary Badges */}
                <div className="grid gap-3 sm:grid-cols-4">
                    <Card>
                        <CardContent className="flex items-center justify-between p-4">
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Erreurs / Critiques
                                </p>
                                <p className="mt-0.5 text-xl font-bold text-red-600 dark:text-red-400">
                                    {levelCounts.ERROR}
                                </p>
                            </div>
                            <Badge className={getLevelBadgeClass('ERROR')}>
                                ERROR
                            </Badge>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between p-4">
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Avertissements
                                </p>
                                <p className="mt-0.5 text-xl font-bold text-amber-600 dark:text-amber-400">
                                    {levelCounts.WARNING}
                                </p>
                            </div>
                            <Badge className={getLevelBadgeClass('WARNING')}>
                                WARN
                            </Badge>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between p-4">
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Informations
                                </p>
                                <p className="mt-0.5 text-xl font-bold text-sky-600 dark:text-sky-400">
                                    {levelCounts.INFO}
                                </p>
                            </div>
                            <Badge className={getLevelBadgeClass('INFO')}>
                                INFO
                            </Badge>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between p-4">
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Entrées analysées
                                </p>
                                <p className="mt-0.5 text-xl font-bold">
                                    {totalParsedLogs}
                                </p>
                            </div>
                            <Badge variant="outline" className="font-mono">
                                {formatBytes(logFileInfo.size_bytes)}
                            </Badge>
                        </CardContent>
                    </Card>
                </div>

                {/* Tab switcher */}
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant={
                            activeTab === 'system' ? 'default' : 'secondary'
                        }
                        onClick={() => setActiveTab('system')}
                    >
                        <ScrollText className="mr-1.5 size-3.5" />
                        Logs Système ({totalMatchingLogs})
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={
                            activeTab === 'functions' ? 'default' : 'secondary'
                        }
                        onClick={() => setActiveTab('functions')}
                    >
                        <Cpu className="mr-1.5 size-3.5" />
                        Exécutions Web Functions ({functionLogs.length})
                    </Button>
                </div>

                {activeTab === 'system' ? (
                    <Card>
                        <CardHeader className="space-y-4">
                            <div>
                                <CardTitle className="text-base">
                                    Journal Laravel ({systemLogs.length} /{' '}
                                    {totalMatchingLogs} entrées affichées)
                                </CardTitle>
                                <CardDescription>
                                    Trié du plus récent au plus ancien. Cliquez
                                    sur une entrée contenant une stack trace
                                    pour la déplier.
                                </CardDescription>
                            </div>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    applyFilters({});
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
                                        placeholder="Rechercher une exception, route ou message..."
                                        className="h-9 pl-8 text-xs"
                                    />
                                </div>
                                <select
                                    value={activeLevel}
                                    onChange={(e) => {
                                        setActiveLevel(e.target.value);
                                        applyFilters({ level: e.target.value });
                                    }}
                                    aria-label="Niveau de log"
                                    className="h-9 rounded-md border bg-background px-2.5 text-xs"
                                >
                                    <option value="ALL">
                                        Tous les niveaux
                                    </option>
                                    <option value="ERROR">
                                        ERROR / CRITICAL
                                    </option>
                                    <option value="WARNING">WARNING</option>
                                    <option value="INFO">INFO</option>
                                    <option value="DEBUG">DEBUG</option>
                                </select>
                                <select
                                    value={activeLimit}
                                    onChange={(e) => {
                                        const next = Number(e.target.value);
                                        setActiveLimit(next);
                                        applyFilters({ limit: next });
                                    }}
                                    aria-label="Limite d'entrées"
                                    className="h-9 rounded-md border bg-background px-2.5 font-mono text-xs"
                                >
                                    <option value={50}>50 entrées</option>
                                    <option value={100}>100 entrées</option>
                                    <option value={200}>200 entrées</option>
                                    <option value={500}>500 entrées</option>
                                </select>
                                <Button
                                    type="submit"
                                    size="sm"
                                    variant="outline"
                                >
                                    Filtrer
                                </Button>
                            </form>
                        </CardHeader>
                        <CardContent>
                            {systemLogs.length === 0 ? (
                                <p className="py-10 text-center text-sm text-muted-foreground">
                                    Aucune entrée de journal système ne
                                    correspond aux filtres actuels.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {systemLogs.map((entry) => {
                                        const hasTrace =
                                            entry.trace.trim() !== '';
                                        const isExpanded = Boolean(
                                            expandedIds[entry.id],
                                        );

                                        return (
                                            <div
                                                key={entry.id}
                                                className="overflow-hidden rounded-lg border bg-background"
                                            >
                                                <div
                                                    className={`flex flex-wrap items-start justify-between gap-2 px-3.5 py-2.5 text-xs ${
                                                        hasTrace
                                                            ? 'cursor-pointer hover:bg-muted/40'
                                                            : ''
                                                    }`}
                                                    onClick={() => {
                                                        if (hasTrace) {
                                                            toggleExpand(
                                                                entry.id,
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <div className="min-w-0 flex-1 space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge
                                                                className={`font-mono text-[10px] ${getLevelBadgeClass(entry.level)}`}
                                                            >
                                                                {entry.level}
                                                            </Badge>
                                                            <span className="font-mono text-[11px] text-muted-foreground">
                                                                {
                                                                    entry.timestamp
                                                                }
                                                            </span>
                                                            <Badge
                                                                variant="outline"
                                                                className="font-mono text-[10px]"
                                                            >
                                                                {
                                                                    entry.environment
                                                                }
                                                            </Badge>
                                                        </div>
                                                        <p className="font-mono text-xs break-words text-foreground">
                                                            {entry.message}
                                                        </p>
                                                    </div>
                                                    {hasTrace && (
                                                        <ChevronDown
                                                            className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform ${
                                                                isExpanded
                                                                    ? 'rotate-180'
                                                                    : ''
                                                            }`}
                                                        />
                                                    )}
                                                </div>
                                                {hasTrace && isExpanded && (
                                                    <pre className="max-h-72 overflow-auto border-t bg-muted/40 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                                                        {entry.trace}
                                                    </pre>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Journaux d&apos;Exécution des Web Functions PHP
                            </CardTitle>
                            <CardDescription>
                                50 dernières invocations enregistrées sur
                                l&apos;ensemble des applications Zenbase
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {functionLogs.length === 0 ? (
                                <p className="py-10 text-center text-sm text-muted-foreground">
                                    Aucune exécution de Web Function
                                    enregistrée.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b text-muted-foreground uppercase">
                                                <th className="pb-2.5 font-medium">
                                                    Date
                                                </th>
                                                <th className="pb-2.5 font-medium">
                                                    Application
                                                </th>
                                                <th className="pb-2.5 font-medium">
                                                    Fonction
                                                </th>
                                                <th className="pb-2.5 font-medium">
                                                    Statut
                                                </th>
                                                <th className="pb-2.5 font-medium">
                                                    Durée
                                                </th>
                                                <th className="pb-2.5 font-medium">
                                                    Sortie / Erreur
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {functionLogs.map((log, idx) => (
                                                <tr key={idx}>
                                                    <td className="py-2.5 font-mono whitespace-nowrap text-muted-foreground">
                                                        {log.timestamp
                                                            ? new Date(
                                                                  log.timestamp,
                                                              ).toLocaleString(
                                                                  'fr-FR',
                                                              )
                                                            : '—'}
                                                    </td>
                                                    <td className="py-2.5 font-medium">
                                                        {log.app_name}
                                                    </td>
                                                    <td className="py-2.5 font-mono">
                                                        {log.function_name}
                                                    </td>
                                                    <td className="py-2.5">
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
                                                    <td className="py-2.5 font-mono">
                                                        {log.duration_ms} ms
                                                    </td>
                                                    <td className="max-w-md truncate py-2.5 font-mono text-muted-foreground">
                                                        {log.error ||
                                                            log.output ||
                                                            'OK'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            <ConfirmActionDialog
                open={confirmClearOpen}
                onOpenChange={setConfirmClearOpen}
                variant="destructive"
                title="Vider le journal système (laravel.log) ?"
                description="Toutes les entrées actuelles de storage/logs/laravel.log seront définitivement effacées."
                confirmLabel="Vider le fichier log"
                onConfirm={() => {
                    router.delete(clearLogs.url(), { preserveScroll: true });
                }}
            />
        </>
    );
}

AdminDiagnosticLogs.layout = {
    breadcrumbs: [
        { title: 'Administration Globale', href: '/admin/dashboard' },
        { title: 'Diagnostic', href: '#' },
        { title: 'Logs', href: '/admin/diagnostic/logs' },
    ],
};
