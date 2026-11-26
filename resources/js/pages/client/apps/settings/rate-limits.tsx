import { Head, useForm } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Bot,
    Clock,
    Cpu,
    FolderOpen,
    Gauge,
    Globe,
    KeyRound,
    Mail,
    Send,
    ShieldCheck,
    Users,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { updateRateLimits } from '@/actions/App/Http/Controllers/Dashboard/AppSettingsController';
import { PrismCodeBlock } from '@/components/prism-code-block';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
            function_mail_per_minute: 10,
            function_mail_per_invocation: 2,
            function_mail_max_recipients: 5,
            function_http_per_invocation: 3,
            function_http_timeout_seconds: 2,
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
            function_mail_per_minute: 30,
            function_mail_per_invocation: 5,
            function_mail_max_recipients: 10,
            function_http_per_invocation: 5,
            function_http_timeout_seconds: 3,
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
            function_mail_per_minute: 120,
            function_mail_per_invocation: 10,
            function_mail_max_recipients: 25,
            function_http_per_invocation: 15,
            function_http_timeout_seconds: 4,
        },
    },
];

function LimitSettingRow({
    id,
    icon,
    label,
    tag,
    description,
    unit,
    min,
    max,
    value,
    disabled = false,
    error,
    onChange,
}: {
    id: string;
    icon: ReactNode;
    label: string;
    tag: string;
    description: string;
    unit: string;
    min: number;
    max: number;
    value: number;
    disabled?: boolean;
    error?: string;
    onChange: (nextValue: number) => void;
}) {
    return (
        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <Label
                        htmlFor={id}
                        className="flex items-center gap-2 text-sm font-medium"
                    >
                        {icon}
                        <span>{label}</span>
                    </Label>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {tag}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground">{description}</p>
                {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:pl-6">
                <Input
                    id={id}
                    type="number"
                    min={min}
                    max={max}
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value) || min)}
                    className="h-9 w-28 font-mono text-xs"
                />
                <span className="w-20 font-mono text-[11px] text-muted-foreground">
                    {unit}
                </span>
            </div>
        </div>
    );
}

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
        function_mail_per_minute: rateLimits.function_mail_per_minute,
        function_mail_per_invocation: rateLimits.function_mail_per_invocation,
        function_mail_max_recipients: rateLimits.function_mail_max_recipients,
        function_http_per_invocation: rateLimits.function_http_per_invocation,
        function_http_timeout_seconds: rateLimits.function_http_timeout_seconds,
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
            <div className="max-w-4xl space-y-10 pb-8">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                            <Gauge className="size-4 text-muted-foreground" />
                            Limites de débit &amp; quotas Web Functions
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            Ajustez les plafonds de requêtes API, Auth, Storage,
                            MCP ainsi que les quotas d&apos;envoi d&apos;e-mails
                            et d&apos;appels HTTPS sortants de vos Web Functions.
                        </p>
                    </div>
                    <Badge
                        variant={rateLimits.enabled ? 'default' : 'secondary'}
                        className={
                            rateLimits.enabled
                                ? 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300'
                                : ''
                        }
                    >
                        {rateLimits.enabled
                            ? `Actif · ${rateLimits.api_per_minute} req/min`
                            : 'Désactivé'}
                    </Badge>
                </div>

                <form onSubmit={handleSave} className="space-y-10">
                    {/* Activation & Presets */}
                    <section className="space-y-6">
                        <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
                            <Checkbox
                                id="rl-enabled"
                                checked={form.data.enabled}
                                onCheckedChange={(checked) =>
                                    form.setData('enabled', checked === true)
                                }
                                className="mt-0.5"
                            />
                            <div className="space-y-1">
                                <Label
                                    htmlFor="rl-enabled"
                                    className="cursor-pointer text-sm font-semibold"
                                >
                                    Activer la limitation de débit pour cette
                                    application
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Protège la base SQLite, les Web Functions,
                                    l&apos;envoi d&apos;e-mails et les routes
                                    d&apos;authentification contre les pics et
                                    abus.
                                </p>
                            </div>
                        </div>

                        {!form.data.enabled && (
                            <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                <span>
                                    <strong>Attention :</strong> la limitation
                                    de débit par minute (API, Auth, Mail) est
                                    désactivée. Les plafonds par invocation des
                                    Web Functions restent actifs par sécurité.
                                </span>
                            </div>
                        )}

                        <div className="space-y-2.5">
                            <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Profils préconfigurés
                            </Label>
                            <div className="grid gap-2.5 sm:grid-cols-3">
                                {RATE_LIMIT_PRESETS.map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() =>
                                            applyPreset(preset.values)
                                        }
                                        className="rounded-xl bg-muted/40 px-3.5 py-3 text-left transition hover:bg-muted/80"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold">
                                                {preset.label}
                                            </span>
                                            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                                                {preset.values.api_per_minute}/m
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                            {preset.description}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Portée du compteur global (API, Functions,
                                Storage, MCP)
                            </Label>
                            <div className="inline-flex w-full flex-col gap-2 rounded-xl bg-muted/40 p-1.5 sm:flex-row">
                                <button
                                    type="button"
                                    disabled={!form.data.enabled}
                                    onClick={() =>
                                        form.setData('key_by', 'app')
                                    }
                                    className={`flex-1 rounded-lg px-3.5 py-2.5 text-left transition disabled:opacity-50 ${
                                        form.data.key_by === 'app'
                                            ? 'bg-background text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <div className="text-xs font-semibold">
                                        Par application (global)
                                    </div>
                                    <p className="mt-0.5 text-[11px] opacity-80">
                                        Quota partagé entre tous les clients de
                                        cette application.
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    disabled={!form.data.enabled}
                                    onClick={() => form.setData('key_by', 'ip')}
                                    className={`flex-1 rounded-lg px-3.5 py-2.5 text-left transition disabled:opacity-50 ${
                                        form.data.key_by === 'ip'
                                            ? 'bg-background text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <div className="text-xs font-semibold">
                                        Par adresse IP client
                                    </div>
                                    <p className="mt-0.5 text-[11px] opacity-80">
                                        Chaque adresse IP dispose de son propre
                                        quota par minute.
                                    </p>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Section 1: API & Modules Rate Limits (Single vertical column, no box borders) */}
                    <section className="space-y-2">
                        <div className="pb-1">
                            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Passerelle API &amp; Modules
                            </h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Plafonds de requêtes par minute sur les routes
                                exposées.
                            </p>
                        </div>

                        <div className="divide-y divide-border/50">
                            <LimitSettingRow
                                id="rl-api"
                                icon={
                                    <Activity className="size-4 text-muted-foreground" />
                                }
                                label="API Globale"
                                tag="/api/v1/*"
                                description="Plafond global de la passerelle SDK (10 à 10 000)."
                                unit="req/min"
                                min={10}
                                max={10000}
                                disabled={!form.data.enabled}
                                value={form.data.api_per_minute}
                                error={form.errors.api_per_minute}
                                onChange={(v) =>
                                    form.setData('api_per_minute', v)
                                }
                            />

                            <LimitSettingRow
                                id="rl-auth"
                                icon={
                                    <KeyRound className="size-4 text-muted-foreground" />
                                }
                                label="Authentification"
                                tag="/api/v1/auth/*"
                                description="Toujours isolé par adresse IP (5 à 2 000). Protection anti brute-force & OTP."
                                unit="req/min"
                                min={5}
                                max={2000}
                                disabled={!form.data.enabled}
                                value={form.data.auth_per_minute}
                                error={form.errors.auth_per_minute}
                                onChange={(v) =>
                                    form.setData('auth_per_minute', v)
                                }
                            />

                            <LimitSettingRow
                                id="rl-functions"
                                icon={
                                    <Cpu className="size-4 text-muted-foreground" />
                                }
                                label="Web Functions PHP"
                                tag="/api/v1/functions/*"
                                description="Nombre maximal d'invocations de fonctions serverless (5 à 5 000)."
                                unit="invoc/min"
                                min={5}
                                max={5000}
                                disabled={!form.data.enabled}
                                value={form.data.functions_per_minute}
                                error={form.errors.functions_per_minute}
                                onChange={(v) =>
                                    form.setData('functions_per_minute', v)
                                }
                            />

                            <LimitSettingRow
                                id="rl-storage"
                                icon={
                                    <FolderOpen className="size-4 text-muted-foreground" />
                                }
                                label="Stockage Fichiers"
                                tag="/api/v1/storage/*"
                                description="Uploads, téléchargements et opérations sur fichiers (5 à 2 000)."
                                unit="req/min"
                                min={5}
                                max={2000}
                                disabled={!form.data.enabled}
                                value={form.data.storage_per_minute}
                                error={form.errors.storage_per_minute}
                                onChange={(v) =>
                                    form.setData('storage_per_minute', v)
                                }
                            />

                            <LimitSettingRow
                                id="rl-mcp"
                                icon={
                                    <Bot className="size-4 text-muted-foreground" />
                                }
                                label="Serveur MCP (Agents IA)"
                                tag="POST /mcp"
                                description="Requêtes JSON-RPC pour Cursor, Claude Code, VS Code ou Antigravity (10 à 5 000)."
                                unit="req/min"
                                min={10}
                                max={5000}
                                disabled={!form.data.enabled}
                                value={form.data.mcp_per_minute}
                                error={form.errors.mcp_per_minute}
                                onChange={(v) =>
                                    form.setData('mcp_per_minute', v)
                                }
                            />
                        </div>
                    </section>

                    {/* Section 2: Web Functions Mail & Outbound HTTPS Limits (Single vertical column, no box borders) */}
                    <section className="space-y-2">
                        <div className="pb-1">
                            <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Quotas internes des Web Functions (Mail &amp;
                                HTTPS)
                            </h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Limites appliquées directement à{' '}
                                <code className="font-mono">$context-&gt;mail</code>{' '}
                                et{' '}
                                <code className="font-mono">$context-&gt;http</code>{' '}
                                dans le sandbox PHP.
                            </p>
                        </div>

                        <div className="divide-y divide-border/50">
                            <LimitSettingRow
                                id="rl-fn-mail-minute"
                                icon={
                                    <Mail className="size-4 text-muted-foreground" />
                                }
                                label="E-mails par minute"
                                tag="$context->mail"
                                description="Nombre maximal d'e-mails envoyés par minute pour cette application (1 à 500)."
                                unit="mails/min"
                                min={1}
                                max={500}
                                disabled={!form.data.enabled}
                                value={form.data.function_mail_per_minute}
                                error={form.errors.function_mail_per_minute}
                                onChange={(v) =>
                                    form.setData('function_mail_per_minute', v)
                                }
                            />

                            <LimitSettingRow
                                id="rl-fn-mail-invocation"
                                icon={
                                    <Send className="size-4 text-muted-foreground" />
                                }
                                label="E-mails par invocation"
                                tag="$context->mail"
                                description="Nombre maximal d'envois autorisés au cours d'une seule exécution de fonction (1 à 25)."
                                unit="mails/exec"
                                min={1}
                                max={25}
                                value={form.data.function_mail_per_invocation}
                                error={form.errors.function_mail_per_invocation}
                                onChange={(v) =>
                                    form.setData(
                                        'function_mail_per_invocation',
                                        v,
                                    )
                                }
                            />

                            <LimitSettingRow
                                id="rl-fn-mail-recipients"
                                icon={
                                    <Users className="size-4 text-muted-foreground" />
                                }
                                label="Destinataires max par e-mail"
                                tag="to + cc + bcc"
                                description="Nombre maximal d'adresses cumulées dans un même message (1 à 50)."
                                unit="dest."
                                min={1}
                                max={50}
                                value={form.data.function_mail_max_recipients}
                                error={form.errors.function_mail_max_recipients}
                                onChange={(v) =>
                                    form.setData(
                                        'function_mail_max_recipients',
                                        v,
                                    )
                                }
                            />

                            <LimitSettingRow
                                id="rl-fn-http-invocation"
                                icon={
                                    <Globe className="size-4 text-muted-foreground" />
                                }
                                label="Requêtes HTTPS par invocation"
                                tag="$context->http"
                                description="Nombre maximal d'appels HTTPS sortants anti-SSRF par exécution de fonction (1 à 25)."
                                unit="req/exec"
                                min={1}
                                max={25}
                                value={form.data.function_http_per_invocation}
                                error={form.errors.function_http_per_invocation}
                                onChange={(v) =>
                                    form.setData(
                                        'function_http_per_invocation',
                                        v,
                                    )
                                }
                            />

                            <LimitSettingRow
                                id="rl-fn-http-timeout"
                                icon={
                                    <Clock className="size-4 text-muted-foreground" />
                                }
                                label="Timeout HTTPS maximal"
                                tag="$context->http->timeout()"
                                description="Délai maximal d'une requête HTTPS sortante, plafonné sous le timeout de 5 s du runner (1 à 4 s)."
                                unit="secondes"
                                min={1}
                                max={4}
                                value={form.data.function_http_timeout_seconds}
                                error={
                                    form.errors.function_http_timeout_seconds
                                }
                                onChange={(v) =>
                                    form.setData(
                                        'function_http_timeout_seconds',
                                        v,
                                    )
                                }
                            />
                        </div>
                    </section>

                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing
                                ? 'Enregistrement...'
                                : 'Enregistrer les limites'}
                        </Button>
                    </div>
                </form>

                {/* Compact HTTP 429 Reference (Clean vertical section without heavy boxes) */}
                <section className="space-y-4 border-t border-border/60 pt-8">
                    <div className="space-y-1">
                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                            <ShieldCheck className="size-4 text-muted-foreground" />
                            Comportement HTTP 429
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            En-têtes standards renvoyés (
                            <code className="font-mono">X-RateLimit-Limit</code>,{' '}
                            <code className="font-mono">
                                X-RateLimit-Remaining
                            </code>
                            , <code className="font-mono">Retry-After</code>) et
                            enveloppe JSON lorsqu&apos;un seuil par minute est
                            dépassé.
                        </p>
                    </div>

                    <PrismCodeBlock
                        language="json"
                        title="Réponse HTTP 429 Too Many Requests"
                        code={sample429Json}
                    />
                </section>
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
