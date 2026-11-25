import { Head, useForm } from '@inertiajs/react';
import {
    Activity,
    Bot,
    CalendarClock,
    Cpu,
    FolderOpen,
    Gauge,
    HardDrive,
    KeyRound,
    Layers,
    ShieldAlert,
    SlidersHorizontal,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { updateConfigs } from '@/actions/App/Http/Controllers/Admin/AdminSettingsController';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PlatformConfigs = {
    default_user_expiration_days: number | null;
    default_user_max_storage_mb: number | null;
    default_user_max_apps: number;
    default_rate_limit_enabled: boolean;
    default_rate_limit_key_by: 'app' | 'ip';
    default_api_rate_limit: number;
    default_auth_rate_limit: number;
    default_functions_rate_limit: number;
    default_storage_rate_limit: number;
    default_mcp_rate_limit: number;
};

export default function AdminSettingsConfigs({
    configs,
}: {
    configs: PlatformConfigs;
}) {
    const [infiniteExpiration, setInfiniteExpiration] = useState(
        configs.default_user_expiration_days === null,
    );
    const [unlimitedStorage, setUnlimitedStorage] = useState(
        configs.default_user_max_storage_mb === null,
    );

    const form = useForm({
        default_user_expiration_days:
            configs.default_user_expiration_days ?? 30,
        default_user_max_storage_mb: configs.default_user_max_storage_mb ?? 100,
        default_user_max_apps: configs.default_user_max_apps,
        default_rate_limit_enabled: configs.default_rate_limit_enabled,
        default_rate_limit_key_by: configs.default_rate_limit_key_by,
        default_api_rate_limit: configs.default_api_rate_limit,
        default_auth_rate_limit: configs.default_auth_rate_limit,
        default_functions_rate_limit: configs.default_functions_rate_limit,
        default_storage_rate_limit: configs.default_storage_rate_limit,
        default_mcp_rate_limit: configs.default_mcp_rate_limit,
    });

    function handleSave(e: FormEvent) {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            default_user_expiration_days: infiniteExpiration
                ? null
                : Math.max(1, Number(data.default_user_expiration_days) || 30),
            default_user_max_storage_mb: unlimitedStorage
                ? null
                : Math.max(1, Number(data.default_user_max_storage_mb) || 100),
            default_user_max_apps: Math.max(
                1,
                Number(data.default_user_max_apps) || 1,
            ),
        }));
        form.submit(updateConfigs(), {
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title="Configs par Défaut — Administration Zenbase" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="size-5 text-amber-500" />
                        <span className="text-xs font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                            Administration Zenbase · Settings
                        </span>
                    </div>
                    <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
                        <SlidersHorizontal className="size-6 text-emerald-600" />
                        Configurations Globales par Défaut
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Définissez les quotas et limites de débit appliqués
                        automatiquement aux nouveaux comptes utilisateurs et
                        nouvelles applications créées sur la plateforme.
                    </p>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-12">
                        {/* Users Defaults */}
                        <Card className="lg:col-span-5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Users className="size-4 text-emerald-600" />
                                    Utilisateurs (Quotas par défaut)
                                </CardTitle>
                                <CardDescription>
                                    Limites attribuées à chaque nouveau compte
                                    client lors de l&apos;inscription ou de la
                                    création manuelle.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="space-y-2 rounded-xl border p-3.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <Label
                                            htmlFor="cfg-exp"
                                            className="flex items-center gap-1.5 text-xs font-semibold"
                                        >
                                            <CalendarClock className="size-3.5 text-amber-500" />
                                            Expiration du compte (jours)
                                        </Label>
                                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                            <input
                                                type="checkbox"
                                                checked={infiniteExpiration}
                                                onChange={(e) =>
                                                    setInfiniteExpiration(
                                                        e.target.checked,
                                                    )
                                                }
                                                className="size-3.5 rounded"
                                            />
                                            <span>Illimité (Infini)</span>
                                        </label>
                                    </div>
                                    {infiniteExpiration ? (
                                        <p className="text-xs text-muted-foreground">
                                            Les nouveaux comptes n&apos;expirent
                                            pas automatiquement.
                                        </p>
                                    ) : (
                                        <>
                                            <Input
                                                id="cfg-exp"
                                                type="number"
                                                min={1}
                                                max={3650}
                                                value={
                                                    form.data
                                                        .default_user_expiration_days
                                                }
                                                onChange={(e) =>
                                                    form.setData(
                                                        'default_user_expiration_days',
                                                        Number(
                                                            e.target.value,
                                                        ) || 1,
                                                    )
                                                }
                                                className="font-mono text-xs"
                                            />
                                            <p className="text-[11px] text-muted-foreground">
                                                Durée de validité en jours (1 à
                                                3 650) avant suspension
                                                automatique.
                                            </p>
                                        </>
                                    )}
                                    {form.errors
                                        .default_user_expiration_days && (
                                        <p className="text-xs text-red-500">
                                            {
                                                form.errors
                                                    .default_user_expiration_days
                                            }
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2 rounded-xl border p-3.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <Label
                                            htmlFor="cfg-storage"
                                            className="flex items-center gap-1.5 text-xs font-semibold"
                                        >
                                            <HardDrive className="size-3.5 text-blue-500" />
                                            Storage Quota par utilisateur (Mo)
                                        </Label>
                                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                            <input
                                                type="checkbox"
                                                checked={unlimitedStorage}
                                                onChange={(e) =>
                                                    setUnlimitedStorage(
                                                        e.target.checked,
                                                    )
                                                }
                                                className="size-3.5 rounded"
                                            />
                                            <span>Illimité</span>
                                        </label>
                                    </div>
                                    {unlimitedStorage ? (
                                        <p className="text-xs text-muted-foreground">
                                            Aucune limite de stockage par compte
                                            utilisateur (seul le plafond global
                                            système s&apos;applique).
                                        </p>
                                    ) : (
                                        <>
                                            <Input
                                                id="cfg-storage"
                                                type="number"
                                                min={1}
                                                max={1048576}
                                                value={
                                                    form.data
                                                        .default_user_max_storage_mb
                                                }
                                                onChange={(e) =>
                                                    form.setData(
                                                        'default_user_max_storage_mb',
                                                        Number(
                                                            e.target.value,
                                                        ) || 1,
                                                    )
                                                }
                                                className="font-mono text-xs"
                                            />
                                            <p className="text-[11px] text-muted-foreground">
                                                Quota cumulé sur toutes les
                                                applications du client (défaut :
                                                100 Mo).
                                            </p>
                                        </>
                                    )}
                                    {form.errors
                                        .default_user_max_storage_mb && (
                                        <p className="text-xs text-red-500">
                                            {
                                                form.errors
                                                    .default_user_max_storage_mb
                                            }
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5 rounded-xl border p-3.5">
                                    <Label
                                        htmlFor="cfg-max-apps"
                                        className="flex items-center gap-1.5 text-xs font-semibold"
                                    >
                                        <Layers className="size-3.5 text-emerald-600" />
                                        Max Apps par utilisateur
                                    </Label>
                                    <Input
                                        id="cfg-max-apps"
                                        type="number"
                                        min={1}
                                        max={1000}
                                        value={form.data.default_user_max_apps}
                                        onChange={(e) =>
                                            form.setData(
                                                'default_user_max_apps',
                                                Number(e.target.value) || 1,
                                            )
                                        }
                                        className="font-mono text-xs"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Nombre maximal d&apos;applications
                                        isolées autorisées par défaut (1 à 1
                                        000).
                                    </p>
                                    {form.errors.default_user_max_apps && (
                                        <p className="text-xs text-red-500">
                                            {form.errors.default_user_max_apps}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Users / Applications Default Rate Limits */}
                        <Card className="lg:col-span-7">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Gauge className="size-4 text-emerald-600" />
                                    Utilisateurs / Applications (Default Rate
                                    Limit)
                                </CardTitle>
                                <CardDescription>
                                    Seuils de débit par minute appliqués par
                                    défaut à toute nouvelle application créée
                                    sur Zenbase.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-3 rounded-xl border p-3.5">
                                    <Checkbox
                                        id="cfg-rl-enabled"
                                        checked={
                                            form.data.default_rate_limit_enabled
                                        }
                                        onCheckedChange={(checked) =>
                                            form.setData(
                                                'default_rate_limit_enabled',
                                                checked === true,
                                            )
                                        }
                                        className="mt-0.5"
                                    />
                                    <div className="space-y-0.5">
                                        <Label
                                            htmlFor="cfg-rl-enabled"
                                            className="cursor-pointer text-sm font-semibold"
                                        >
                                            Activer le Rate Limiting par défaut
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Chaque nouvelle application hérite
                                            de ces seuils (modifiables ensuite
                                            dans Settings → Rate Limits).
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            form.setData(
                                                'default_rate_limit_key_by',
                                                'app',
                                            )
                                        }
                                        className={`rounded-lg border p-3 text-left text-xs transition ${
                                            form.data
                                                .default_rate_limit_key_by ===
                                            'app'
                                                ? 'border-emerald-600 bg-emerald-600/10'
                                                : 'hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="font-semibold">
                                            Portée : Par application
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                            Quota partagé entre tous les clients
                                            de l&apos;application.
                                        </p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            form.setData(
                                                'default_rate_limit_key_by',
                                                'ip',
                                            )
                                        }
                                        className={`rounded-lg border p-3 text-left text-xs transition ${
                                            form.data
                                                .default_rate_limit_key_by ===
                                            'ip'
                                                ? 'border-emerald-600 bg-emerald-600/10'
                                                : 'hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="font-semibold">
                                            Portée : Par adresse IP
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                            Chaque IP client dispose de son
                                            propre plafond par minute.
                                        </p>
                                    </button>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5 rounded-lg border p-3">
                                        <Label
                                            htmlFor="cfg-rl-api"
                                            className="flex items-center gap-1.5 text-xs font-semibold"
                                        >
                                            <Activity className="size-3.5 text-emerald-600" />
                                            API Globale (req/min)
                                        </Label>
                                        <Input
                                            id="cfg-rl-api"
                                            type="number"
                                            min={10}
                                            max={10000}
                                            value={
                                                form.data.default_api_rate_limit
                                            }
                                            onChange={(e) =>
                                                form.setData(
                                                    'default_api_rate_limit',
                                                    Number(e.target.value) ||
                                                        10,
                                                )
                                            }
                                            className="font-mono text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5 rounded-lg border p-3">
                                        <Label
                                            htmlFor="cfg-rl-auth"
                                            className="flex items-center gap-1.5 text-xs font-semibold"
                                        >
                                            <KeyRound className="size-3.5 text-amber-500" />
                                            Authentification (req/min/IP)
                                        </Label>
                                        <Input
                                            id="cfg-rl-auth"
                                            type="number"
                                            min={5}
                                            max={2000}
                                            value={
                                                form.data
                                                    .default_auth_rate_limit
                                            }
                                            onChange={(e) =>
                                                form.setData(
                                                    'default_auth_rate_limit',
                                                    Number(e.target.value) || 5,
                                                )
                                            }
                                            className="font-mono text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5 rounded-lg border p-3">
                                        <Label
                                            htmlFor="cfg-rl-fn"
                                            className="flex items-center gap-1.5 text-xs font-semibold"
                                        >
                                            <Cpu className="size-3.5 text-purple-500" />
                                            Web Functions (req/min)
                                        </Label>
                                        <Input
                                            id="cfg-rl-fn"
                                            type="number"
                                            min={5}
                                            max={5000}
                                            value={
                                                form.data
                                                    .default_functions_rate_limit
                                            }
                                            onChange={(e) =>
                                                form.setData(
                                                    'default_functions_rate_limit',
                                                    Number(e.target.value) || 5,
                                                )
                                            }
                                            className="font-mono text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5 rounded-lg border p-3">
                                        <Label
                                            htmlFor="cfg-rl-st"
                                            className="flex items-center gap-1.5 text-xs font-semibold"
                                        >
                                            <FolderOpen className="size-3.5 text-sky-500" />
                                            Stockage (req/min)
                                        </Label>
                                        <Input
                                            id="cfg-rl-st"
                                            type="number"
                                            min={5}
                                            max={2000}
                                            value={
                                                form.data
                                                    .default_storage_rate_limit
                                            }
                                            onChange={(e) =>
                                                form.setData(
                                                    'default_storage_rate_limit',
                                                    Number(e.target.value) || 5,
                                                )
                                            }
                                            className="font-mono text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5 rounded-lg border p-3 sm:col-span-2">
                                        <Label
                                            htmlFor="cfg-rl-mcp"
                                            className="flex items-center gap-1.5 text-xs font-semibold"
                                        >
                                            <Bot className="size-3.5 text-emerald-600" />
                                            Serveur MCP (req/min)
                                        </Label>
                                        <Input
                                            id="cfg-rl-mcp"
                                            type="number"
                                            min={10}
                                            max={5000}
                                            value={
                                                form.data.default_mcp_rate_limit
                                            }
                                            onChange={(e) =>
                                                form.setData(
                                                    'default_mcp_rate_limit',
                                                    Number(e.target.value) ||
                                                        10,
                                                )
                                            }
                                            className="max-w-xs font-mono text-xs"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            className="bg-emerald-600 text-white hover:bg-emerald-500"
                            disabled={form.processing}
                        >
                            {form.processing
                                ? 'Enregistrement...'
                                : 'Enregistrer les configurations par défaut'}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

AdminSettingsConfigs.layout = {
    breadcrumbs: [
        { title: 'Administration Globale', href: '/admin/dashboard' },
        { title: 'Settings', href: '#' },
        { title: 'Configs', href: '/admin/settings/configs' },
    ],
};
