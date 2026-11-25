import { Head, useForm } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Bot,
    Cpu,
    FolderOpen,
    Gauge,
    KeyRound,
    ShieldCheck,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { updateRateLimits } from '@/actions/App/Http/Controllers/Dashboard/AppSettingsController';
import { PrismCodeBlock } from '@/components/prism-code-block';
import { Badge } from '@/components/ui/badge';
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
import { dashboard } from '@/routes';
import type { ZenbaseApp, ZenbaseRateLimitSettings } from '@/types';

const RATE_LIMIT_PRESETS: Array<{
    label: string;
    description: string;
    values: Omit<ZenbaseRateLimitSettings, 'enabled' | 'key_by'>;
}> = [
    {
        label: 'Strict',
        description: 'Prototypes & petits projets',
        values: {
            api_per_minute: 60,
            auth_per_minute: 15,
            functions_per_minute: 30,
            storage_per_minute: 30,
            mcp_per_minute: 60,
        },
    },
    {
        label: 'Standard',
        description: 'Recommandé (défaut)',
        values: {
            api_per_minute: 120,
            auth_per_minute: 30,
            functions_per_minute: 60,
            storage_per_minute: 60,
            mcp_per_minute: 120,
        },
    },
    {
        label: 'Haute capacité',
        description: 'Trafic soutenu en production',
        values: {
            api_per_minute: 600,
            auth_per_minute: 100,
            functions_per_minute: 300,
            storage_per_minute: 200,
            mcp_per_minute: 300,
        },
    },
];

export default function ClientAppRateLimits({
    app,
    rateLimits,
}: {
    app: ZenbaseApp;
    rateLimits: ZenbaseRateLimitSettings;
}) {
    const form = useForm<ZenbaseRateLimitSettings>({
        enabled: rateLimits.enabled,
        key_by: rateLimits.key_by,
        api_per_minute: rateLimits.api_per_minute,
        auth_per_minute: rateLimits.auth_per_minute,
        functions_per_minute: rateLimits.functions_per_minute,
        storage_per_minute: rateLimits.storage_per_minute,
        mcp_per_minute: rateLimits.mcp_per_minute,
    });

    function handleSave(e: FormEvent) {
        e.preventDefault();
        form.submit(updateRateLimits(app.id), {
            preserveScroll: true,
        });
    }

    function applyPreset(
        values: Omit<ZenbaseRateLimitSettings, 'enabled' | 'key_by'>,
    ) {
        form.setData((prev) => ({
            ...prev,
            enabled: true,
            ...values,
        }));
    }

    const sample429Json = JSON.stringify(
        {
            data: null,
            error: `Limite de débit atteinte pour le module API (${form.data.api_per_minute} requêtes/minute). Réessayez dans 42 seconde(s).`,
            meta: {
                scope: 'API',
                limit_per_minute: form.data.api_per_minute,
                retry_after: 42,
            },
        },
        null,
        2,
    );

    return (
        <>
            <Head title={`${app.name} — Settings · Rate Limits`} />
            <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-12">
                    <Card className="lg:col-span-8">
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Gauge className="size-4 text-emerald-600" />
                                        Limites de débit (Rate Limiting)
                                    </CardTitle>
                                    <CardDescription>
                                        Définissez les plafonds de requêtes par
                                        minute appliqués aux endpoints API v1,
                                        Auth, Web Functions, Stockage et Serveur
                                        MCP de cette application.
                                    </CardDescription>
                                </div>
                                <Badge
                                    variant={
                                        rateLimits.enabled
                                            ? 'default'
                                            : 'secondary'
                                    }
                                    className={
                                        rateLimits.enabled
                                            ? 'bg-emerald-600 text-white'
                                            : ''
                                    }
                                >
                                    {rateLimits.enabled
                                        ? `Actif · ${rateLimits.api_per_minute} req/min`
                                        : 'Désactivé'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSave} className="space-y-5">
                                <div className="flex items-start gap-3 rounded-xl border p-3.5">
                                    <Checkbox
                                        id="rl-enabled"
                                        checked={form.data.enabled}
                                        onCheckedChange={(checked) =>
                                            form.setData(
                                                'enabled',
                                                checked === true,
                                            )
                                        }
                                        className="mt-0.5"
                                    />
                                    <div className="space-y-1">
                                        <Label
                                            htmlFor="rl-enabled"
                                            className="cursor-pointer text-sm font-semibold"
                                        >
                                            Activer la limitation de débit pour
                                            cette application
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Protège votre base SQLite isolée,
                                            vos Web Functions PHP et vos routes
                                            d&apos;authentification contre les
                                            abus et pics de requêtes.
                                        </p>
                                    </div>
                                </div>

                                {!form.data.enabled && (
                                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                        <span>
                                            <strong>Attention :</strong> la
                                            limitation de débit est désactivée.
                                            Les appels API et Auth ne seront
                                            plus plafonnés tant que vous ne la
                                            réactiverez pas.
                                        </span>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground uppercase">
                                        Profils préconfigurés
                                    </Label>
                                    <div className="grid gap-2 sm:grid-cols-3">
                                        {RATE_LIMIT_PRESETS.map((preset) => (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={() =>
                                                    applyPreset(preset.values)
                                                }
                                                className="rounded-lg border p-2.5 text-left transition hover:border-emerald-500/50 hover:bg-muted/40"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold">
                                                        {preset.label}
                                                    </span>
                                                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                                                        {
                                                            preset.values
                                                                .api_per_minute
                                                        }
                                                        /m
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                    {preset.description}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 rounded-xl border bg-muted/20 p-3.5">
                                    <Label className="text-xs font-semibold">
                                        Portée du compteur global (API,
                                        Functions, Storage, MCP)
                                    </Label>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            disabled={!form.data.enabled}
                                            onClick={() =>
                                                form.setData('key_by', 'app')
                                            }
                                            className={`rounded-lg border p-3 text-left transition disabled:opacity-50 ${
                                                form.data.key_by === 'app'
                                                    ? 'border-emerald-600 bg-emerald-600/10'
                                                    : 'bg-background hover:bg-muted/40'
                                            }`}
                                        >
                                            <div className="text-xs font-semibold">
                                                Par application (global)
                                            </div>
                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                Quota partagé entre tous les
                                                clients de cette application.
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!form.data.enabled}
                                            onClick={() =>
                                                form.setData('key_by', 'ip')
                                            }
                                            className={`rounded-lg border p-3 text-left transition disabled:opacity-50 ${
                                                form.data.key_by === 'ip'
                                                    ? 'border-emerald-600 bg-emerald-600/10'
                                                    : 'bg-background hover:bg-muted/40'
                                            }`}
                                        >
                                            <div className="text-xs font-semibold">
                                                Par adresse IP client
                                            </div>
                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                Chaque adresse IP dispose de son
                                                propre quota par minute.
                                            </p>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5 rounded-xl border p-3.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label
                                                htmlFor="rl-api"
                                                className="flex items-center gap-1.5 text-xs font-semibold"
                                            >
                                                <Activity className="size-3.5 text-emerald-600" />
                                                API Globale
                                            </Label>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-[10px]"
                                            >
                                                /api/v1/*
                                            </Badge>
                                        </div>
                                        <Input
                                            id="rl-api"
                                            type="number"
                                            min={10}
                                            max={10000}
                                            disabled={!form.data.enabled}
                                            value={form.data.api_per_minute}
                                            onChange={(e) =>
                                                form.setData(
                                                    'api_per_minute',
                                                    Number(e.target.value) ||
                                                        10,
                                                )
                                            }
                                            className="font-mono text-xs"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            Requêtes / minute (10 à 10 000).
                                            Plafond global de la passerelle SDK.
                                        </p>
                                        {form.errors.api_per_minute && (
                                            <p className="text-xs text-red-500">
                                                {form.errors.api_per_minute}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 rounded-xl border p-3.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label
                                                htmlFor="rl-auth"
                                                className="flex items-center gap-1.5 text-xs font-semibold"
                                            >
                                                <KeyRound className="size-3.5 text-amber-500" />
                                                Authentification
                                            </Label>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-[10px]"
                                            >
                                                /api/v1/auth/*
                                            </Badge>
                                        </div>
                                        <Input
                                            id="rl-auth"
                                            type="number"
                                            min={5}
                                            max={2000}
                                            disabled={!form.data.enabled}
                                            value={form.data.auth_per_minute}
                                            onChange={(e) =>
                                                form.setData(
                                                    'auth_per_minute',
                                                    Number(e.target.value) || 5,
                                                )
                                            }
                                            className="font-mono text-xs"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            Requêtes / minute par IP (5 à 2
                                            000). Protection anti brute-force
                                            &amp; OTP.
                                        </p>
                                        {form.errors.auth_per_minute && (
                                            <p className="text-xs text-red-500">
                                                {form.errors.auth_per_minute}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 rounded-xl border p-3.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label
                                                htmlFor="rl-functions"
                                                className="flex items-center gap-1.5 text-xs font-semibold"
                                            >
                                                <Cpu className="size-3.5 text-purple-500" />
                                                Web Functions PHP
                                            </Label>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-[10px]"
                                            >
                                                /api/v1/functions/*
                                            </Badge>
                                        </div>
                                        <Input
                                            id="rl-functions"
                                            type="number"
                                            min={5}
                                            max={5000}
                                            disabled={!form.data.enabled}
                                            value={
                                                form.data.functions_per_minute
                                            }
                                            onChange={(e) =>
                                                form.setData(
                                                    'functions_per_minute',
                                                    Number(e.target.value) || 5,
                                                )
                                            }
                                            className="font-mono text-xs"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            Invocations / minute (5 à 5 000).
                                        </p>
                                        {form.errors.functions_per_minute && (
                                            <p className="text-xs text-red-500">
                                                {
                                                    form.errors
                                                        .functions_per_minute
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 rounded-xl border p-3.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label
                                                htmlFor="rl-storage"
                                                className="flex items-center gap-1.5 text-xs font-semibold"
                                            >
                                                <FolderOpen className="size-3.5 text-sky-500" />
                                                Stockage Fichiers
                                            </Label>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-[10px]"
                                            >
                                                /api/v1/storage/*
                                            </Badge>
                                        </div>
                                        <Input
                                            id="rl-storage"
                                            type="number"
                                            min={5}
                                            max={2000}
                                            disabled={!form.data.enabled}
                                            value={form.data.storage_per_minute}
                                            onChange={(e) =>
                                                form.setData(
                                                    'storage_per_minute',
                                                    Number(e.target.value) || 5,
                                                )
                                            }
                                            className="font-mono text-xs"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            Uploads &amp; requêtes / minute (5 à
                                            2 000).
                                        </p>
                                        {form.errors.storage_per_minute && (
                                            <p className="text-xs text-red-500">
                                                {form.errors.storage_per_minute}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5 rounded-xl border p-3.5 sm:col-span-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label
                                                htmlFor="rl-mcp"
                                                className="flex items-center gap-1.5 text-xs font-semibold"
                                            >
                                                <Bot className="size-3.5 text-emerald-600" />
                                                Serveur MCP (Agents IA)
                                            </Label>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-[10px]"
                                            >
                                                POST /mcp
                                            </Badge>
                                        </div>
                                        <Input
                                            id="rl-mcp"
                                            type="number"
                                            min={10}
                                            max={5000}
                                            disabled={!form.data.enabled}
                                            value={form.data.mcp_per_minute}
                                            onChange={(e) =>
                                                form.setData(
                                                    'mcp_per_minute',
                                                    Number(e.target.value) ||
                                                        10,
                                                )
                                            }
                                            className="max-w-xs font-mono text-xs"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            Requêtes JSON-RPC / minute (10 à 5
                                            000) pour Cursor, Claude Code, VS
                                            Code ou Antigravity.
                                        </p>
                                        {form.errors.mcp_per_minute && (
                                            <p className="text-xs text-red-500">
                                                {form.errors.mcp_per_minute}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        type="submit"
                                        className="bg-emerald-600 text-white hover:bg-emerald-500"
                                        disabled={form.processing}
                                    >
                                        {form.processing
                                            ? 'Enregistrement...'
                                            : 'Enregistrer les limites de débit'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ShieldCheck className="size-4 text-emerald-600" />
                                Comportement HTTP 429
                            </CardTitle>
                            <CardDescription>
                                En-têtes et enveloppe JSON renvoyés
                                lorsqu&apos;un seuil est dépassé.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs text-muted-foreground">
                            <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
                                <p className="font-semibold text-foreground">
                                    En-têtes HTTP standards
                                </p>
                                <ul className="space-y-1 font-mono text-[11px]">
                                    <li>X-RateLimit-Limit</li>
                                    <li>X-RateLimit-Remaining</li>
                                    <li>Retry-After</li>
                                </ul>
                            </div>

                            <PrismCodeBlock
                                language="json"
                                title="Réponse HTTP 429 Too Many Requests"
                                code={sample429Json}
                            />

                            <p>
                                Les limites spécifiques par module (Auth,
                                Functions, Storage) s&apos;appliquent en
                                complément du plafond global{' '}
                                <code className="font-mono">/api/v1/*</code>.
                                Les routes Auth sont toujours isolées par
                                adresse IP pour éviter qu&apos;un client ne
                                bloque tous les autres utilisateurs.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

ClientAppRateLimits.layout = {
    breadcrumbs: [
        {
            title: 'Mes Applications',
            href: dashboard(),
        },
        {
            title: 'Settings',
            href: '#',
        },
        {
            title: 'Rate Limits',
            href: '#',
        },
    ],
};
