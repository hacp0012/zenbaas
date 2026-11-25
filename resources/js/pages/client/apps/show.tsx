import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowRight,
    BarChart3,
    Cpu,
    Database,
    FolderOpen,
    HardDrive,
    KeyRound,
    ShieldCheck,
    Users,
    Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes';
import type { ZenbaseApp } from '@/types';

type DailyActivityPoint = {
    date: string;
    label: string;
    records: number;
    users: number;
    files: number;
    function_runs: number;
};

type CollectionBreakdownItem = {
    name: string;
    count: number;
    has_schema: boolean;
};

type StorageBreakdownItem = {
    key: string;
    label: string;
    count: number;
    bytes: number;
};

type StorageQuotaSummary = {
    app_bytes: number;
    app_files_count: number;
    user_used_bytes: number;
    max_storage_mb: number | null;
    max_storage_bytes: number | null;
    remaining_bytes: number | null;
};

type AuthBreakdown = {
    total: number;
    active: number;
    blocked: number;
    password: number;
    otp: number;
    other: number;
};

type FunctionRunPoint = {
    function_name: string;
    status: number;
    duration_ms: number;
    has_error: boolean;
    timestamp: string;
};

type FunctionsStats = {
    total_functions: number;
    active_functions: number;
    total_runs: number;
    success_runs: number;
    error_runs: number;
    success_rate: number;
    avg_duration_ms: number;
    recent_runs: FunctionRunPoint[];
};

type AppAnalytics = {
    daily_activity: DailyActivityPoint[];
    total_records: number;
    collections_breakdown: CollectionBreakdownItem[];
    storage_breakdown: StorageBreakdownItem[];
    storage_quota: StorageQuotaSummary;
    auth_breakdown: AuthBreakdown;
    functions_stats: FunctionsStats;
};

type ActivityMetricFilter = 'all' | 'records' | 'users' | 'files' | 'function_runs';

const STORAGE_COLORS: Record<string, { stroke: string; dot: string }> = {
    images: { stroke: '#10b981', dot: 'bg-emerald-500' },
    documents: { stroke: '#3b82f6', dot: 'bg-blue-500' },
    media: { stroke: '#a855f7', dot: 'bg-purple-500' },
    code: { stroke: '#f59e0b', dot: 'bg-amber-500' },
    other: { stroke: '#71717a', dot: 'bg-zinc-500' },
};

function formatBytes(bytes: number): string {
    if (bytes <= 0) {
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

export default function ClientAppShow({
    app,
    analytics,
}: {
    app: ZenbaseApp;
    analytics: AppAnalytics;
}) {
    const [activityFilter, setActivityFilter] =
        useState<ActivityMetricFilter>('all');
    const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
    const [hoveredRunIndex, setHoveredRunIndex] = useState<number | null>(null);

    const dailyActivity = analytics.daily_activity;

    const activityTotals = useMemo(() => {
        return dailyActivity.reduce(
            (acc, day) => ({
                records: acc.records + day.records,
                users: acc.users + day.users,
                files: acc.files + day.files,
                function_runs: acc.function_runs + day.function_runs,
            }),
            { records: 0, users: 0, files: 0, function_runs: 0 },
        );
    }, [dailyActivity]);

    const maxDailyValue = useMemo(() => {
        const values = dailyActivity.map((day) => {
            if (activityFilter === 'all') {
                return (
                    day.records +
                    day.users +
                    day.files +
                    day.function_runs
                );
            }

            return day[activityFilter];
        });

        return Math.max(1, ...values);
    }, [dailyActivity, activityFilter]);

    const storageDonutSegments = useMemo(() => {
        const totalBytes = analytics.storage_breakdown.reduce(
            (sum, item) => sum + item.bytes,
            0,
        );
        const radius = 44;
        const circumference = 2 * Math.PI * radius;

        if (totalBytes <= 0) {
            return { totalBytes: 0, circumference, radius, arcs: [] };
        }

        let cumulativeOffset = 0;
        const arcs = analytics.storage_breakdown
            .filter((item) => item.bytes > 0)
            .map((item) => {
                const ratio = item.bytes / totalBytes;
                const dashLength = ratio * circumference;
                const segment = {
                    ...item,
                    ratio,
                    dashLength,
                    dashOffset: -cumulativeOffset,
                    color: STORAGE_COLORS[item.key]?.stroke ?? '#71717a',
                };
                cumulativeOffset += dashLength;

                return segment;
            });

        return { totalBytes, circumference, radius, arcs };
    }, [analytics.storage_breakdown]);

    const quotaPercent = useMemo(() => {
        const maxBytes = analytics.storage_quota.max_storage_bytes;
        if (!maxBytes || maxBytes <= 0) {
            return null;
        }

        return Math.min(
            100,
            Math.round((analytics.storage_quota.user_used_bytes / maxBytes) * 100),
        );
    }, [analytics.storage_quota]);

    const maxCollectionCount = useMemo(() => {
        return Math.max(
            1,
            ...analytics.collections_breakdown.map((c) => c.count),
        );
    }, [analytics.collections_breakdown]);

    const maxRunLatency = useMemo(() => {
        return Math.max(
            10,
            ...analytics.functions_stats.recent_runs.map((r) => r.duration_ms),
        );
    }, [analytics.functions_stats.recent_runs]);

    const activeDayTooltip =
        hoveredDayIndex !== null ? dailyActivity[hoveredDayIndex] ?? null : null;
    const activeRunTooltip =
        hoveredRunIndex !== null
            ? analytics.functions_stats.recent_runs[hoveredRunIndex] ?? null
            : null;

    const totalAuth = analytics.auth_breakdown.total;
    const passwordPercent =
        totalAuth > 0
            ? Math.round((analytics.auth_breakdown.password / totalAuth) * 100)
            : 0;
    const otpPercent =
        totalAuth > 0
            ? Math.round((analytics.auth_breakdown.otp / totalAuth) * 100)
            : 0;
    const otherAuthPercent =
        totalAuth > 0 ? Math.max(0, 100 - passwordPercent - otpPercent) : 0;

    return (
        <>
            <Head title={`${app.name} — Vue d'ensemble`} />
            <div className="space-y-6">
                {/* Top KPI Strip */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                Appels API (SDK)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-2xl font-bold">
                                        {app.api_calls_count.toLocaleString()}
                                    </span>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Requêtes passerelle /api/v1
                                    </p>
                                </div>
                                <Activity className="size-5 text-emerald-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                Base SQLite Isolée
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-2xl font-bold">
                                        {formatBytes(app.database_size_bytes)}
                                    </span>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {analytics.total_records.toLocaleString()}{' '}
                                        doc(s) · {app.collections_count ?? 0}{' '}
                                        collection(s)
                                    </p>
                                </div>
                                <Database className="size-5 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                Utilisateurs Inscrits
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-2xl font-bold">
                                        {analytics.auth_breakdown.total.toLocaleString()}
                                    </span>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {analytics.auth_breakdown.active}{' '}
                                        actif(s) ·{' '}
                                        {analytics.auth_breakdown.blocked}{' '}
                                        bloqué(s)
                                    </p>
                                </div>
                                <Users className="size-5 text-amber-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                Fichiers & Functions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-2xl font-bold">
                                        {app.files_count ??
                                            app.files?.length ??
                                            0}{' '}
                                        /{' '}
                                        {analytics.functions_stats.total_functions}
                                    </span>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {analytics.functions_stats.active_functions}{' '}
                                        fonction(s) active(s)
                                    </p>
                                </div>
                                <Cpu className="size-5 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Primary Charts Row: 7-Day Activity & Storage Breakdown */}
                <div className="grid gap-6 lg:grid-cols-12">
                    {/* 7-Day Activity Chart */}
                    <Card className="lg:col-span-7">
                        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <BarChart3 className="size-4 text-emerald-600" />
                                    Activité des 7 derniers jours
                                </CardTitle>
                                <CardDescription className="mt-0.5 text-xs">
                                    Nouveaux documents, inscriptions, fichiers
                                    et exécutions de Web Functions.
                                </CardDescription>
                            </div>

                            <div className="inline-flex flex-wrap rounded-lg border bg-muted/40 p-0.5 text-[11px]">
                                {(
                                    [
                                        ['all', 'Tout'],
                                        ['records', 'Docs'],
                                        ['users', 'Auth'],
                                        ['files', 'Fichiers'],
                                        ['function_runs', 'Functions'],
                                    ] as const
                                ).map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setActivityFilter(key)}
                                        className={`rounded-md px-2 py-1 font-medium transition ${
                                            activityFilter === key
                                                ? 'bg-background text-foreground shadow-2xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {/* Hover Summary Strip */}
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/25 px-3 py-2 text-xs">
                                <span className="font-medium text-muted-foreground">
                                    {activeDayTooltip
                                        ? `Journée du ${activeDayTooltip.label}`
                                        : 'Cumul sur 7 jours'}
                                </span>
                                <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="size-2 rounded-full bg-emerald-500" />
                                        Docs :{' '}
                                        <strong>
                                            {activeDayTooltip
                                                ? activeDayTooltip.records
                                                : activityTotals.records}
                                        </strong>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="size-2 rounded-full bg-amber-500" />
                                        Auth :{' '}
                                        <strong>
                                            {activeDayTooltip
                                                ? activeDayTooltip.users
                                                : activityTotals.users}
                                        </strong>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="size-2 rounded-full bg-blue-500" />
                                        Fichiers :{' '}
                                        <strong>
                                            {activeDayTooltip
                                                ? activeDayTooltip.files
                                                : activityTotals.files}
                                        </strong>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="size-2 rounded-full bg-purple-500" />
                                        Functions :{' '}
                                        <strong>
                                            {activeDayTooltip
                                                ? activeDayTooltip.function_runs
                                                : activityTotals.function_runs}
                                        </strong>
                                    </span>
                                </div>
                            </div>

                            {/* Interactive Stacked Column Chart */}
                            <div className="relative pt-2">
                                <div className="pointer-events-none absolute inset-x-0 top-2 bottom-7 flex flex-col justify-between">
                                    {[0, 1, 2, 3].map((line) => (
                                        <div
                                            key={line}
                                            className="border-b border-dashed border-border/60"
                                        />
                                    ))}
                                </div>

                                <div className="relative grid h-48 grid-cols-7 items-end gap-2 sm:gap-3">
                                    {dailyActivity.map((day, index) => {
                                        const totalForDay =
                                            activityFilter === 'all'
                                                ? day.records +
                                                  day.users +
                                                  day.files +
                                                  day.function_runs
                                                : day[activityFilter];
                                        const isHovered =
                                            hoveredDayIndex === index;

                                        const segments =
                                            activityFilter === 'all'
                                                ? [
                                                      {
                                                          key: 'records',
                                                          value: day.records,
                                                          color: 'bg-emerald-500',
                                                      },
                                                      {
                                                          key: 'users',
                                                          value: day.users,
                                                          color: 'bg-amber-500',
                                                      },
                                                      {
                                                          key: 'files',
                                                          value: day.files,
                                                          color: 'bg-blue-500',
                                                      },
                                                      {
                                                          key: 'function_runs',
                                                          value: day.function_runs,
                                                          color: 'bg-purple-500',
                                                      },
                                                  ]
                                                : [
                                                      {
                                                          key: activityFilter,
                                                          value: day[
                                                              activityFilter
                                                          ],
                                                          color:
                                                              activityFilter ===
                                                              'records'
                                                                  ? 'bg-emerald-500'
                                                                  : activityFilter ===
                                                                      'users'
                                                                    ? 'bg-amber-500'
                                                                    : activityFilter ===
                                                                        'files'
                                                                      ? 'bg-blue-500'
                                                                      : 'bg-purple-500',
                                                      },
                                                  ];

                                        return (
                                            <div
                                                key={day.date}
                                                onMouseEnter={() =>
                                                    setHoveredDayIndex(index)
                                                }
                                                onMouseLeave={() =>
                                                    setHoveredDayIndex(null)
                                                }
                                                className="group flex h-full flex-col items-center justify-end gap-1.5"
                                            >
                                                <span
                                                    className={`font-mono text-[10px] transition ${
                                                        isHovered
                                                            ? 'font-semibold text-foreground'
                                                            : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {totalForDay}
                                                </span>

                                                <div
                                                    className={`flex w-full max-w-10 flex-1 flex-col justify-end overflow-hidden rounded-t-lg transition ${
                                                        isHovered
                                                            ? 'bg-muted/70'
                                                            : 'bg-muted/30'
                                                    }`}
                                                >
                                                    {totalForDay > 0 ? (
                                                        <div
                                                            className="flex w-full flex-col-reverse overflow-hidden rounded-t-lg transition-all duration-300"
                                                            style={{
                                                                height: `${Math.max(8, Math.round((totalForDay / maxDailyValue) * 100))}%`,
                                                            }}
                                                        >
                                                            {segments
                                                                .filter(
                                                                    (s) =>
                                                                        s.value >
                                                                        0,
                                                                )
                                                                .map((seg) => (
                                                                    <div
                                                                        key={
                                                                            seg.key
                                                                        }
                                                                        className={`w-full ${seg.color}`}
                                                                        style={{
                                                                            flexGrow:
                                                                                seg.value,
                                                                        }}
                                                                    />
                                                                ))}
                                                        </div>
                                                    ) : (
                                                        <div className="h-1 w-full rounded-t bg-border/60" />
                                                    )}
                                                </div>

                                                <span
                                                    className={`font-mono text-[11px] ${
                                                        isHovered
                                                            ? 'font-semibold text-foreground'
                                                            : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {day.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Storage Donut Chart & Quota */}
                    <Card className="lg:col-span-5">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <HardDrive className="size-4 text-blue-600 dark:text-blue-400" />
                                        Stockage & Répartition
                                    </CardTitle>
                                    <CardDescription className="mt-0.5 text-xs">
                                        Poids des fichiers par catégorie et
                                        consommation du quota.
                                    </CardDescription>
                                </div>
                                <Button asChild size="sm" variant="ghost">
                                    <Link
                                        href={`/dashboard/apps/${app.id}/storage`}
                                        className="text-xs"
                                    >
                                        Ouvrir
                                        <ArrowRight className="ml-1 size-3" />
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-5">
                            <div className="flex flex-col items-center gap-5 sm:flex-row">
                                {/* SVG Donut Chart */}
                                <div className="relative flex size-32 shrink-0 items-center justify-center">
                                    <svg
                                        viewBox="0 0 112 112"
                                        className="size-32 -rotate-90"
                                        role="img"
                                        aria-label="Répartition du stockage par type de fichier"
                                    >
                                        <circle
                                            cx="56"
                                            cy="56"
                                            r={storageDonutSegments.radius}
                                            fill="transparent"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            className="text-muted/60"
                                        />
                                        {storageDonutSegments.arcs.map(
                                            (arc) => (
                                                <circle
                                                    key={arc.key}
                                                    cx="56"
                                                    cy="56"
                                                    r={
                                                        storageDonutSegments.radius
                                                    }
                                                    fill="transparent"
                                                    stroke={arc.color}
                                                    strokeWidth="12"
                                                    strokeDasharray={`${arc.dashLength} ${storageDonutSegments.circumference}`}
                                                    strokeDashoffset={
                                                        arc.dashOffset
                                                    }
                                                    strokeLinecap="butt"
                                                />
                                            ),
                                        )}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <span className="font-mono text-sm font-bold">
                                            {formatBytes(
                                                analytics.storage_quota
                                                    .app_bytes,
                                            )}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {
                                                analytics.storage_quota
                                                    .app_files_count
                                            }{' '}
                                            fichier(s)
                                        </span>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="w-full flex-1 space-y-2 text-xs">
                                    {analytics.storage_breakdown.map((item) => (
                                        <div
                                            key={item.key}
                                            className="flex items-center justify-between gap-2"
                                        >
                                            <span className="flex items-center gap-2 text-muted-foreground">
                                                <span
                                                    className={`size-2.5 rounded-full ${STORAGE_COLORS[item.key]?.dot ?? 'bg-zinc-500'}`}
                                                />
                                                {item.label}
                                            </span>
                                            <span className="font-mono text-[11px] font-medium">
                                                {formatBytes(item.bytes)}{' '}
                                                <span className="text-muted-foreground">
                                                    ({item.count})
                                                </span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quota Progress Bar */}
                            <div className="space-y-2 rounded-xl border bg-muted/25 p-3">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium text-muted-foreground">
                                        Quota compte (toutes apps)
                                    </span>
                                    {quotaPercent !== null ? (
                                        <span className="font-mono text-[11px] font-semibold">
                                            {formatBytes(
                                                analytics.storage_quota
                                                    .user_used_bytes,
                                            )}{' '}
                                            /{' '}
                                            {
                                                analytics.storage_quota
                                                    .max_storage_mb
                                            }{' '}
                                            Mo ({quotaPercent}%)
                                        </span>
                                    ) : (
                                        <Badge
                                            variant="secondary"
                                            className="font-mono text-[10px]"
                                        >
                                            Illimité
                                        </Badge>
                                    )}
                                </div>
                                {quotaPercent !== null && (
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                quotaPercent >= 85
                                                    ? 'bg-red-500'
                                                    : quotaPercent >= 65
                                                      ? 'bg-amber-500'
                                                      : 'bg-emerald-500'
                                            }`}
                                            style={{
                                                width: `${quotaPercent}%`,
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Secondary Charts Row: Collections Breakdown & Functions/Auth Health */}
                <div className="grid gap-6 lg:grid-cols-12">
                    {/* NoSQL Collections Horizontal Bar Chart */}
                    <Card className="lg:col-span-6">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Database className="size-4 text-emerald-600" />
                                        Collections NoSQL
                                    </CardTitle>
                                    <CardDescription className="mt-0.5 text-xs">
                                        Volume de documents JSON par collection
                                        SQLite.
                                    </CardDescription>
                                </div>
                                <Button asChild size="sm" variant="ghost">
                                    <Link
                                        href={`/dashboard/apps/${app.id}/database`}
                                        className="text-xs"
                                    >
                                        Explorer
                                        <ArrowRight className="ml-1 size-3" />
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent>
                            {analytics.collections_breakdown.length === 0 ? (
                                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
                                    <FolderOpen className="size-7 text-muted-foreground/60" />
                                    <p className="mt-2 text-xs font-medium">
                                        Aucune collection créée
                                    </p>
                                    <p className="mt-0.5 max-w-xs text-[11px] text-muted-foreground">
                                        Créez une collection depuis
                                        l&apos;explorateur NoSQL ou insérez un
                                        premier document via le SDK.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {analytics.collections_breakdown.map(
                                        (col) => {
                                            const widthPct = Math.max(
                                                4,
                                                Math.round(
                                                    (col.count /
                                                        maxCollectionCount) *
                                                        100,
                                                ),
                                            );
                                            const sharePct =
                                                analytics.total_records > 0
                                                    ? Math.round(
                                                          (col.count /
                                                              analytics.total_records) *
                                                              100,
                                                      )
                                                    : 0;

                                            return (
                                                <div
                                                    key={col.name}
                                                    className="space-y-1.5"
                                                >
                                                    <div className="flex items-center justify-between gap-2 text-xs">
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <span className="truncate font-mono font-semibold">
                                                                {col.name}
                                                            </span>
                                                            <Badge
                                                                variant="secondary"
                                                                className="h-4 px-1.5 text-[10px]"
                                                            >
                                                                {col.has_schema
                                                                    ? 'Schéma'
                                                                    : 'Schema-less'}
                                                            </Badge>
                                                        </div>
                                                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                                                            <strong className="text-foreground">
                                                                {col.count.toLocaleString()}
                                                            </strong>{' '}
                                                            ({sharePct}%)
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                                            style={{
                                                                width: `${widthPct}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        },
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Web Functions Latency & Auth Distribution */}
                    <Card className="lg:col-span-6">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Zap className="size-4 text-purple-500" />
                                        Web Functions & Authentification
                                    </CardTitle>
                                    <CardDescription className="mt-0.5 text-xs">
                                        Latence des dernières invocations PHP et
                                        répartition des comptes utilisateurs.
                                    </CardDescription>
                                </div>
                                <Button asChild size="sm" variant="outline">
                                    <Link
                                        href={`/dashboard/apps/${app.id}/integrations`}
                                        className="text-xs"
                                    >
                                        <KeyRound className="mr-1.5 size-3.5 text-emerald-600" />
                                        Integrations
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* Web Functions Latency Mini Bar Chart */}
                            <div className="space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <span className="font-semibold">
                                        Latence des Web Functions
                                    </span>
                                    <div className="flex items-center gap-2 font-mono text-[11px]">
                                        <Badge
                                            variant="secondary"
                                            className="h-5 px-2 font-mono text-[10px]"
                                        >
                                            {
                                                analytics.functions_stats
                                                    .success_rate
                                            }
                                            % succès
                                        </Badge>
                                        <span className="text-muted-foreground">
                                            Moy.{' '}
                                            <strong className="text-foreground">
                                                {
                                                    analytics.functions_stats
                                                        .avg_duration_ms
                                                }{' '}
                                                ms
                                            </strong>
                                        </span>
                                    </div>
                                </div>

                                {analytics.functions_stats.recent_runs
                                    .length === 0 ? (
                                    <div className="rounded-xl border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
                                        Aucune exécution enregistrée pour le
                                        moment.
                                    </div>
                                ) : (
                                    <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                                        <div className="flex h-24 items-end gap-1.5">
                                            {analytics.functions_stats.recent_runs.map(
                                                (run, idx) => {
                                                    const heightPct = Math.max(
                                                        12,
                                                        Math.round(
                                                            (run.duration_ms /
                                                                maxRunLatency) *
                                                                100,
                                                        ),
                                                    );
                                                    const isSelected =
                                                        hoveredRunIndex === idx;

                                                    return (
                                                        <div
                                                            key={`${run.function_name}-${run.timestamp}-${idx}`}
                                                            onMouseEnter={() =>
                                                                setHoveredRunIndex(
                                                                    idx,
                                                                )
                                                            }
                                                            onMouseLeave={() =>
                                                                setHoveredRunIndex(
                                                                    null,
                                                                )
                                                            }
                                                            className="flex h-full flex-1 items-end"
                                                        >
                                                            <div
                                                                className={`w-full rounded-t-md transition-all ${
                                                                    run.has_error
                                                                        ? isSelected
                                                                            ? 'bg-red-500'
                                                                            : 'bg-red-500/75'
                                                                        : isSelected
                                                                          ? 'bg-emerald-500'
                                                                          : 'bg-emerald-500/75'
                                                                }`}
                                                                style={{
                                                                    height: `${heightPct}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                },
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                            {activeRunTooltip ? (
                                                <>
                                                    <span className="truncate font-mono font-medium text-foreground">
                                                        {
                                                            activeRunTooltip.function_name
                                                        }
                                                    </span>
                                                    <span className="shrink-0 font-mono">
                                                        HTTP{' '}
                                                        {
                                                            activeRunTooltip.status
                                                        }{' '}
                                                        ·{' '}
                                                        {
                                                            activeRunTooltip.duration_ms
                                                        }{' '}
                                                        ms
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>
                                                        {
                                                            analytics
                                                                .functions_stats
                                                                .total_runs
                                                        }{' '}
                                                        invocation(s) récente(s)
                                                    </span>
                                                    <span className="font-mono">
                                                        {
                                                            analytics
                                                                .functions_stats
                                                                .error_runs
                                                        }{' '}
                                                        erreur(s)
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Auth Method Distribution */}
                            <div className="space-y-2.5 border-t pt-4">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-1.5 font-semibold">
                                        <ShieldCheck className="size-3.5 text-amber-500" />
                                        Méthodes d&apos;authentification
                                    </span>
                                    <span className="font-mono text-[11px] text-muted-foreground">
                                        {totalAuth} compte(s)
                                    </span>
                                </div>

                                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                                    {passwordPercent > 0 && (
                                        <div
                                            className="h-full bg-emerald-500"
                                            style={{
                                                width: `${passwordPercent}%`,
                                            }}
                                        />
                                    )}
                                    {otpPercent > 0 && (
                                        <div
                                            className="h-full bg-blue-500"
                                            style={{ width: `${otpPercent}%` }}
                                        />
                                    )}
                                    {otherAuthPercent > 0 && (
                                        <div
                                            className="h-full bg-amber-500"
                                            style={{
                                                width: `${otherAuthPercent}%`,
                                            }}
                                        />
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="size-2 rounded-full bg-emerald-500" />
                                        Email / Mot de passe :{' '}
                                        <strong className="font-mono text-foreground">
                                            {analytics.auth_breakdown.password}
                                        </strong>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="size-2 rounded-full bg-blue-500" />
                                        OTP E-mail :{' '}
                                        <strong className="font-mono text-foreground">
                                            {analytics.auth_breakdown.otp}
                                        </strong>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="size-2 rounded-full bg-red-500" />
                                        Bloqués :{' '}
                                        <strong className="font-mono text-foreground">
                                            {analytics.auth_breakdown.blocked}
                                        </strong>
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

ClientAppShow.layout = {
    breadcrumbs: [
        {
            title: 'Mes Applications',
            href: dashboard(),
        },
        {
            title: "Vue d'ensemble",
            href: '#',
        },
    ],
};
