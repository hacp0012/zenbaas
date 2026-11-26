import { Head, useForm } from '@inertiajs/react';
import {
    Database,
    FolderOpen,
    HardDrive,
    Layers,
    ShieldAlert,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { updateStorage } from '@/actions/App/Http/Controllers/Admin/AdminSettingsController';
import { DonutChart, HorizontalBarChart } from '@/components/admin-charts';
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
import { Label } from '@/components/ui/label';

type StorageConfig = {
    global_max_storage_mb: number | null;
    global_max_storage_bytes: number | null;
};

type StorageSummary = {
    total_used_bytes: number;
    files_bytes: number;
    databases_bytes: number;
    total_files_count: number;
    total_apps_count: number;
    total_users_count: number;
    remaining_bytes: number | null;
};

type MimeSlice = {
    label: string;
    bytes: number;
    color: string;
};

type TopAppStorage = {
    id: string;
    name: string;
    owner: string;
    db_bytes: number;
    files_bytes: number;
    total_bytes: number;
    files_count: number;
};

type TopUserStorage = {
    id: number;
    name: string;
    email: string;
    max_storage_mb: number | null;
    used_bytes: number;
    files_count: number;
};

const GLOBAL_STORAGE_PRESETS = [
    { label: '1 Go', value: 1024 },
    { label: '5 Go', value: 5120 },
    { label: '10 Go', value: 10240 },
    { label: '50 Go', value: 51200 },
    { label: '100 Go', value: 102400 },
];

function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) {
        return '0 o';
    }
    const k = 1024;
    const sizes = ['o', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.min(
        Math.floor(Math.log(bytes) / Math.log(k)),
        sizes.length - 1,
    );

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatLimitMb(mb: number | null): string {
    if (mb === null) {
        return 'Illimité';
    }
    if (mb >= 1024 && mb % 1024 === 0) {
        return `${mb / 1024} Go`;
    }

    return `${mb.toLocaleString('fr-FR')} Mo`;
}

export default function AdminSettingsStorage({
    storageConfig,
    storageSummary,
    mimeBreakdown,
    topApps,
    topUsers,
}: {
    storageConfig: StorageConfig;
    storageSummary: StorageSummary;
    mimeBreakdown: MimeSlice[];
    topApps: TopAppStorage[];
    topUsers: TopUserStorage[];
}) {
    const [isUnlimited, setIsUnlimited] = useState(
        storageConfig.global_max_storage_mb === null,
    );
    const form = useForm({
        global_max_storage_mb: storageConfig.global_max_storage_mb ?? 10240,
    });

    function handleSave(e: FormEvent) {
        e.preventDefault();
        form.transform((data) => ({
            global_max_storage_mb: isUnlimited
                ? null
                : Math.max(10, Number(data.global_max_storage_mb) || 1024),
        }));
        form.submit(updateStorage(), {
            preserveScroll: true,
        });
    }

    const usedPercent =
        storageConfig.global_max_storage_bytes &&
        storageConfig.global_max_storage_bytes > 0
            ? Math.min(
                  100,
                  Math.round(
                      (storageSummary.total_used_bytes /
                          storageConfig.global_max_storage_bytes) *
                          100,
                  ),
              )
            : null;

    return (
        <>
            <Head title="Stockage Global — Administration Zenbase" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="size-5 text-amber-500" />
                            <span className="text-xs font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                                Administration Zenbase · Settings
                            </span>
                        </div>
                        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
                            <HardDrive className="size-6 text-emerald-600" />
                            Stockage Global &amp; Consommation
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Définissez la capacité maximale allouée à
                            l&apos;ensemble du système Zenbase et analysez la
                            répartition par type de données, application et
                            utilisateur.
                        </p>
                    </div>
                    <Badge
                        variant="outline"
                        className="px-3 py-1 font-mono text-xs"
                    >
                        Plafond global :{' '}
                        {formatLimitMb(storageConfig.global_max_storage_mb)}
                    </Badge>
                </div>

                {/* KPIs */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                Consommation Totale
                            </CardTitle>
                            <HardDrive className="size-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatBytes(storageSummary.total_used_bytes)}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {storageSummary.remaining_bytes !== null
                                    ? `Disponible : ${formatBytes(storageSummary.remaining_bytes)}`
                                    : 'Aucun plafond global actif'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                Fichiers Storage
                            </CardTitle>
                            <FolderOpen className="size-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatBytes(storageSummary.files_bytes)}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {storageSummary.total_files_count.toLocaleString(
                                    'fr-FR',
                                )}{' '}
                                fichier(s) hébergé(s)
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                Bases SQLite Tenants
                            </CardTitle>
                            <Database className="size-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatBytes(storageSummary.databases_bytes)}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Réparties sur {storageSummary.total_apps_count}{' '}
                                application(s)
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                Taux d&apos;Occupation
                            </CardTitle>
                            <Layers className="size-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {usedPercent !== null ? `${usedPercent}%` : '∞'}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {storageSummary.total_users_count} client(s)
                                actifs
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quota Form + Breakdown Donut */}
                <div className="grid gap-6 lg:grid-cols-12">
                    <Card className="lg:col-span-5">
                        <CardHeader>
                            <CardTitle className="text-base">
                                Quota Global du Système Zenbase
                            </CardTitle>
                            <CardDescription>
                                Lorsque ce plafond est atteint, tout nouvel
                                upload sur la plateforme retourne une erreur
                                HTTP <code className="font-mono">413</code>.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <Label className="text-xs font-semibold">
                                        Capacité maximale globale (Mo)
                                    </Label>
                                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                        <input
                                            type="checkbox"
                                            checked={isUnlimited}
                                            onChange={(e) =>
                                                setIsUnlimited(e.target.checked)
                                            }
                                            className="size-3.5 rounded"
                                        />
                                        <span>Illimité</span>
                                    </label>
                                </div>

                                {!isUnlimited && (
                                    <div className="space-y-2.5">
                                        <Input
                                            type="number"
                                            min={10}
                                            max={104857600}
                                            value={
                                                form.data.global_max_storage_mb
                                            }
                                            onChange={(e) =>
                                                form.setData(
                                                    'global_max_storage_mb',
                                                    Number(e.target.value) ||
                                                        10,
                                                )
                                            }
                                            className="font-mono text-xs"
                                        />
                                        <div className="flex flex-wrap gap-1.5">
                                            {GLOBAL_STORAGE_PRESETS.map(
                                                (preset) => (
                                                    <button
                                                        key={preset.value}
                                                        type="button"
                                                        onClick={() =>
                                                            form.setData(
                                                                'global_max_storage_mb',
                                                                preset.value,
                                                            )
                                                        }
                                                        className={`rounded-md px-2.5 py-1 font-mono text-[11px] transition ${
                                                            form.data
                                                                .global_max_storage_mb ===
                                                            preset.value
                                                                ? 'bg-primary text-primary-foreground shadow-xs'
                                                                : 'bg-muted/60 hover:bg-muted'
                                                        }`}
                                                    >
                                                        {preset.label}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                        {form.errors.global_max_storage_mb && (
                                            <p className="text-xs text-red-500">
                                                {
                                                    form.errors
                                                        .global_max_storage_mb
                                                }
                                            </p>
                                        )}
                                    </div>
                                )}

                                {usedPercent !== null && (
                                    <div className="space-y-1.5 rounded-xl bg-muted/40 p-3 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                Espace occupé
                                            </span>
                                            <span className="font-mono font-semibold">
                                                {formatBytes(
                                                    storageSummary.total_used_bytes,
                                                )}{' '}
                                                /{' '}
                                                {formatLimitMb(
                                                    storageConfig.global_max_storage_mb,
                                                )}
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className={`h-full rounded-full ${
                                                    usedPercent >= 90
                                                        ? 'bg-red-500'
                                                        : 'bg-emerald-500'
                                                }`}
                                                style={{
                                                    width: `${usedPercent}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={form.processing}
                                >
                                    {form.processing
                                        ? 'Enregistrement...'
                                        : 'Enregistrer le quota global'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-7">
                        <CardHeader>
                            <CardTitle className="text-base">
                                Répartition par Type de Données
                            </CardTitle>
                            <CardDescription>
                                Distribution globale entre bases SQLite et
                                catégories MIME de fichiers
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DonutChart
                                segments={mimeBreakdown.map((item) => ({
                                    label: item.label,
                                    value: item.bytes,
                                    color: item.color,
                                }))}
                                centerLabel="Utilisé"
                                centerValue={formatBytes(
                                    storageSummary.total_used_bytes,
                                )}
                                formatValue={formatBytes}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Top Consumers Charts */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Layers className="size-4 text-emerald-600" />
                                Consommation par Application (Top 8)
                            </CardTitle>
                            <CardDescription>
                                Cumul base SQLite + fichiers Storage par
                                application
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <HorizontalBarChart
                                items={topApps.map((a) => ({
                                    label: a.name,
                                    sublabel: `${a.owner} · ${a.files_count} fich.`,
                                    value: a.total_bytes,
                                    formattedValue: formatBytes(a.total_bytes),
                                }))}
                                emptyText="Aucune application ne consomme d'espace."
                                barColorClass="bg-emerald-500"
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="size-4 text-blue-500" />
                                Consommation Fichiers par Utilisateur (Top 8)
                            </CardTitle>
                            <CardDescription>
                                Volume total stocké par compte client
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <HorizontalBarChart
                                items={topUsers.map((u) => ({
                                    label: u.name,
                                    sublabel: `${u.files_count} fich. · Quota ${formatLimitMb(u.max_storage_mb)}`,
                                    value: u.used_bytes,
                                    formattedValue: formatBytes(u.used_bytes),
                                }))}
                                emptyText="Aucun fichier stocké par les utilisateurs."
                                barColorClass="bg-blue-500"
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

AdminSettingsStorage.layout = {
    breadcrumbs: [
        { title: 'Administration Globale', href: '/admin/dashboard' },
        { title: 'Settings', href: '#' },
        { title: 'Storage', href: '/admin/settings/storage' },
    ],
};
