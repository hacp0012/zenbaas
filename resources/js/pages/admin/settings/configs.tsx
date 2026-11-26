import { Head, useForm } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Bot,
    CalendarClock,
    Clock,
    Cpu,
    FolderOpen,
    Globe,
    HardDrive,
    KeyRound,
    Layers,
    Mail,
    Send,
    SlidersHorizontal,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { updateConfigs } from '@/actions/App/Http/Controllers/Admin/AdminSettingsController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    default_function_mail_per_minute: number;
    default_function_mail_per_invocation: number;
    default_function_mail_max_recipients: number;
    default_function_http_per_invocation: number;
    default_function_http_timeout_seconds: number;
};

type RateLimitPresetValues = {
    default_api_rate_limit: number;
    default_auth_rate_limit: number;
    default_functions_rate_limit: number;
    default_storage_rate_limit: number;
    default_mcp_rate_limit: number;
    default_function_mail_per_minute: number;
    default_function_mail_per_invocation: number;
    default_function_mail_max_recipients: number;
    default_function_http_per_invocation: number;
    default_function_http_timeout_seconds: number;
};

const RATE_LIMIT_PRESETS: Array<{
    label: string;
    description: string;
    values: RateLimitPresetValues;
}> = [
    {
        label: 'Strict',
        description: 'Prototypes & petits projets',
        values: {
            default_api_rate_limit: 60,
            default_auth_rate_limit: 15,
            default_functions_rate_limit: 30,
            default_storage_rate_limit: 30,
            default_mcp_rate_limit: 60,
            default_function_mail_per_minute: 10,
            default_function_mail_per_invocation: 2,
            default_function_mail_max_recipients: 5,
            default_function_http_per_invocation: 3,
            default_function_http_timeout_seconds: 2,
        },
    },
    {
        label: 'Standard',
        description: 'Recommandé (défaut)',
        values: {
            default_api_rate_limit: 120,
            default_auth_rate_limit: 30,
            default_functions_rate_limit: 60,
            default_storage_rate_limit: 60,
            default_mcp_rate_limit: 120,
            default_function_mail_per_minute: 30,
            default_function_mail_per_invocation: 5,
            default_function_mail_max_recipients: 10,
            default_function_http_per_invocation: 5,
            default_function_http_timeout_seconds: 3,
        },
    },
    {
        label: 'Haute capacité',
        description: 'Trafic soutenu en production',
        values: {
            default_api_rate_limit: 600,
            default_auth_rate_limit: 100,
            default_functions_rate_limit: 300,
            default_storage_rate_limit: 200,
            default_mcp_rate_limit: 300,
            default_function_mail_per_minute: 120,
            default_function_mail_per_invocation: 10,
            default_function_mail_max_recipients: 25,
            default_function_http_per_invocation: 15,
            default_function_http_timeout_seconds: 4,
        },
    },
];

function ConfigSettingRow({
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
    unlimitedToggle,
    onChange,
}: {
    id: string;
    icon: ReactNode;
    label: string;
    tag?: string;
    description: string;
    unit: string;
    min: number;
    max: number;
    value: number;
    disabled?: boolean;
    error?: string;
    unlimitedToggle?: {
        id: string;
        checked: boolean;
        label: string;
        onCheckedChange: (checked: boolean) => void;
    };
    onChange: (nextValue: number) => void;
}) {
    const isInputDisabled = disabled || Boolean(unlimitedToggle?.checked);

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
                    {tag && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {tag}
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">{description}</p>
                {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3 sm:pl-6">
                {unlimitedToggle && (
                    <label
                        htmlFor={unlimitedToggle.id}
                        className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none"
                    >
                        <Checkbox
                            id={unlimitedToggle.id}
                            checked={unlimitedToggle.checked}
                            onCheckedChange={(checked) =>
                                unlimitedToggle.onCheckedChange(
                                    checked === true,
                                )
                            }
                        />
                        <span>{unlimitedToggle.label}</span>
                    </label>
                )}

                <div className="flex items-center gap-2">
                    <Input
                        id={id}
                        type="number"
                        min={min}
                        max={max}
                        disabled={isInputDisabled}
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value) || min)}
                        className="h-9 w-28 font-mono text-xs"
                    />
                    <span className="w-20 font-mono text-[11px] text-muted-foreground">
                        {unlimitedToggle?.checked ? 'illimité' : unit}
                    </span>
                </div>
            </div>
        </div>
    );
}

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
        default_function_mail_per_minute:
            configs.default_function_mail_per_minute,
        default_function_mail_per_invocation:
            configs.default_function_mail_per_invocation,
        default_function_mail_max_recipients:
            configs.default_function_mail_max_recipients,
        default_function_http_per_invocation:
            configs.default_function_http_per_invocation,
        default_function_http_timeout_seconds:
            configs.default_function_http_timeout_seconds,
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

    function applyPreset(values: RateLimitPresetValues) {
        form.setData((prev) => ({
            ...prev,
            default_rate_limit_enabled: true,
            ...values,
        }));
    }

    return (
        <>
            <Head title="Configs par Défaut — Administration Zenbase" />
            <div className="max-w-4xl space-y-10 p-6 pb-10">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                            <SlidersHorizontal className="size-4 text-muted-foreground" />
                            Configurations globales par défaut
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Définissez les quotas utilisateurs et les limites de
                            débit (API, Auth, Storage, MCP et Web Functions Mail
                            &amp; HTTPS) appliqués automatiquement aux nouveaux
                            comptes et nouvelles applications.
                        </p>
                    </div>
                    <Badge
                        variant={
                            configs.default_rate_limit_enabled
                                ? 'default'
                                : 'secondary'
                        }
                        className={
                            configs.default_rate_limit_enabled
                                ? 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300'
                                : ''
                        }
                    >
                        {configs.default_rate_limit_enabled
                            ? `Rate limit actif · ${configs.default_api_rate_limit} req/min`
                            : 'Rate limit désactivé'}
                    </Badge>
                </div>

                <form onSubmit={handleSave} className="space-y-10">
                    {/* Section 1: Users Default Quotas */}
                    <section className="space-y-2">
                        <div className="pb-1">
                            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Quotas par défaut des utilisateurs
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Limites attribuées à chaque nouveau compte
                                développeur lors de l&apos;inscription ou de la
                                création manuelle.
                            </p>
                        </div>

                        <div className="divide-y divide-border/50">
                            <ConfigSettingRow
                                id="cfg-exp"
                                icon={
                                    <CalendarClock className="size-4 text-muted-foreground" />
                                }
                                label="Expiration du compte"
                                tag="Comptes clients"
                                description={
                                    infiniteExpiration
                                        ? "Les nouveaux comptes n'expirent pas automatiquement."
                                        : 'Durée de validité en jours avant suspension automatique (1 à 3 650).'
                                }
                                unit="jours"
                                min={1}
                                max={3650}
                                value={form.data.default_user_expiration_days}
                                error={form.errors.default_user_expiration_days}
                                unlimitedToggle={{
                                    id: 'cfg-exp-unlimited',
                                    checked: infiniteExpiration,
                                    label: 'Illimité',
                                    onCheckedChange: setInfiniteExpiration,
                                }}
                                onChange={(v) =>
                                    form.setData(
                                        'default_user_expiration_days',
                                        v,
                                    )
                                }
                            />

                            <ConfigSettingRow
                                id="cfg-storage"
                                icon={
                                    <HardDrive className="size-4 text-muted-foreground" />
                                }
                                label="Quota de stockage par utilisateur"
                                tag="Cumulé"
                                description={
                                    unlimitedStorage
                                        ? 'Aucune limite individuelle (seul le plafond global système s’applique).'
                                        : 'Espace maximal cumulé sur toutes les applications du compte (1 à 1 048 576 Mo).'
                                }
                                unit="Mo"
                                min={1}
                                max={1048576}
                                value={form.data.default_user_max_storage_mb}
                                error={form.errors.default_user_max_storage_mb}
                                unlimitedToggle={{
                                    id: 'cfg-storage-unlimited',
                                    checked: unlimitedStorage,
                                    label: 'Illimité',
                                    onCheckedChange: setUnlimitedStorage,
                                }}
                                onChange={(v) =>
                                    form.setData(
                                        'default_user_max_storage_mb',
                                        v,
                                    )
                                }
                            />

                            <ConfigSettingRow
                                id="cfg-max-apps"
                                icon={
                                    <Layers className="size-4 text-muted-foreground" />
                                }
                                label="Max applications par utilisateur"
                                tag="Tenants isolés"
                                description="Nombre maximal d'applications isolées autorisées par défaut (1 à 1 000)."
                                unit="apps"
                                min={1}
                                max={1000}
                                value={form.data.default_user_max_apps}
                                error={form.errors.default_user_max_apps}
                                onChange={(v) =>
                                    form.setData('default_user_max_apps', v)
                                }
                            />
                        </div>
                    </section>

                    {/* Section 2: Rate Limit Activation, Presets & Scope */}
                    <section className="space-y-6">
                        <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
                            <Checkbox
                                id="cfg-rl-enabled"
                                checked={form.data.default_rate_limit_enabled}
                                onCheckedChange={(checked) =>
                                    form.setData(
                                        'default_rate_limit_enabled',
                                        checked === true,
                                    )
                                }
                                className="mt-0.5"
                            />
                            <div className="space-y-1">
                                <Label
                                    htmlFor="cfg-rl-enabled"
                                    className="cursor-pointer text-sm font-semibold"
                                >
                                    Activer la limitation de débit par défaut
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Chaque nouvelle application hérite de ces
                                    seuils (modifiables ensuite par application
                                    dans Settings → Rate Limits).
                                </p>
                            </div>
                        </div>

                        {!form.data.default_rate_limit_enabled && (
                            <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                <span>
                                    <strong>Attention :</strong> la limitation
                                    de débit par minute (API, Auth, Mail) sera
                                    désactivée par défaut sur les nouvelles
                                    applications. Les plafonds par invocation
                                    des Web Functions restent actifs par
                                    sécurité.
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
                                                {
                                                    preset.values
                                                        .default_api_rate_limit
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

                        <div className="space-y-2.5">
                            <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Portée du compteur global par défaut (API,
                                Functions, Storage, MCP)
                            </Label>
                            <div className="inline-flex w-full flex-col gap-2 rounded-xl bg-muted/40 p-1.5 sm:flex-row">
                                <button
                                    type="button"
                                    disabled={
                                        !form.data.default_rate_limit_enabled
                                    }
                                    onClick={() =>
                                        form.setData(
                                            'default_rate_limit_key_by',
                                            'app',
                                        )
                                    }
                                    className={`flex-1 rounded-lg px-3.5 py-2.5 text-left transition disabled:opacity-50 ${
                                        form.data.default_rate_limit_key_by ===
                                        'app'
                                            ? 'bg-background text-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <div className="text-xs font-semibold">
                                        Par application (global)
                                    </div>
                                    <p className="mt-0.5 text-[11px] opacity-80">
                                        Quota partagé entre tous les clients
                                        d&apos;une application.
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    disabled={
                                        !form.data.default_rate_limit_enabled
                                    }
                                    onClick={() =>
                                        form.setData(
                                            'default_rate_limit_key_by',
                                            'ip',
                                        )
                                    }
                                    className={`flex-1 rounded-lg px-3.5 py-2.5 text-left transition disabled:opacity-50 ${
                                        form.data.default_rate_limit_key_by ===
                                        'ip'
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

                    {/* Section 3: API & Modules Default Rate Limits */}
                    <section className="space-y-2">
                        <div className="pb-1">
                            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Passerelle API &amp; Modules (par défaut)
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Plafonds de requêtes par minute attribués par
                                défaut aux nouvelles applications.
                            </p>
                        </div>

                        <div className="divide-y divide-border/50">
                            <ConfigSettingRow
                                id="cfg-rl-api"
                                icon={
                                    <Activity className="size-4 text-muted-foreground" />
                                }
                                label="API Globale"
                                tag="/api/v1/*"
                                description="Plafond global de la passerelle SDK (10 à 10 000)."
                                unit="req/min"
                                min={10}
                                max={10000}
                                disabled={!form.data.default_rate_limit_enabled}
                                value={form.data.default_api_rate_limit}
                                error={form.errors.default_api_rate_limit}
                                onChange={(v) =>
                                    form.setData('default_api_rate_limit', v)
                                }
                            />

                            <ConfigSettingRow
                                id="cfg-rl-auth"
                                icon={
                                    <KeyRound className="size-4 text-muted-foreground" />
                                }
                                label="Authentification"
                                tag="/api/v1/auth/*"
                                description="Toujours isolé par adresse IP (5 à 2 000). Protection anti brute-force & OTP."
                                unit="req/min"
                                min={5}
                                max={2000}
                                disabled={!form.data.default_rate_limit_enabled}
                                value={form.data.default_auth_rate_limit}
                                error={form.errors.default_auth_rate_limit}
                                onChange={(v) =>
                                    form.setData('default_auth_rate_limit', v)
                                }
                            />

                            <ConfigSettingRow
                                id="cfg-rl-fn"
                                icon={
                                    <Cpu className="size-4 text-muted-foreground" />
                                }
                                label="Web Functions PHP"
                                tag="/api/v1/functions/*"
                                description="Nombre maximal d'invocations de fonctions serverless (5 à 5 000)."
                                unit="invoc/min"
                                min={5}
                                max={5000}
                                disabled={!form.data.default_rate_limit_enabled}
                                value={form.data.default_functions_rate_limit}
                                error={form.errors.default_functions_rate_limit}
                                onChange={(v) =>
                                    form.setData(
                                        'default_functions_rate_limit',
                                        v,
                                    )
                                }
                            />

                            <ConfigSettingRow
                                id="cfg-rl-st"
                                icon={
                                    <FolderOpen className="size-4 text-muted-foreground" />
                                }
                                label="Stockage Fichiers"
                                tag="/api/v1/storage/*"
                                description="Uploads, téléchargements et opérations sur fichiers (5 à 2 000)."
                                unit="req/min"
                                min={5}
                                max={2000}
                                disabled={!form.data.default_rate_limit_enabled}
                                value={form.data.default_storage_rate_limit}
                                error={form.errors.default_storage_rate_limit}
                                onChange={(v) =>
                                    form.setData(
                                        'default_storage_rate_limit',
                                        v,
                                    )
                                }
                            />

                            <ConfigSettingRow
                                id="cfg-rl-mcp"
                                icon={
                                    <Bot className="size-4 text-muted-foreground" />
                                }
                                label="Serveur MCP (Agents IA)"
                                tag="POST /mcp"
                                description="Requêtes JSON-RPC pour Cursor, Claude Code, VS Code ou Antigravity (10 à 5 000)."
                                unit="req/min"
                                min={10}
                                max={5000}
                                disabled={!form.data.default_rate_limit_enabled}
                                value={form.data.default_mcp_rate_limit}
                                error={form.errors.default_mcp_rate_limit}
                                onChange={(v) =>
                                    form.setData('default_mcp_rate_limit', v)
                                }
                            />
                        </div>
                    </section>

                    {/* Section 4: Web Functions Internal Quotas (Mail & Outbound HTTPS) */}
                    <section className="space-y-2">
                        <div className="pb-1">
                            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Quotas internes des Web Functions (Mail &amp;
                                HTTPS par défaut)
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Limites appliquées par défaut à{' '}
                                <code className="font-mono">$context-&gt;mail</code>{' '}
                                et{' '}
                                <code className="font-mono">$context-&gt;http</code>{' '}
                                dans le sandbox PHP de chaque nouvelle
                                application.
                            </p>
                        </div>

                        <div className="divide-y divide-border/50">
                            <ConfigSettingRow
                                id="cfg-fn-mail-minute"
                                icon={
                                    <Mail className="size-4 text-muted-foreground" />
                                }
                                label="E-mails par minute"
                                tag="$context->mail"
                                description="Nombre maximal d'e-mails envoyés par minute par application (1 à 500)."
                                unit="mails/min"
                                min={1}
                                max={500}
                                disabled={!form.data.default_rate_limit_enabled}
                                value={
                                    form.data.default_function_mail_per_minute
                                }
                                error={
                                    form.errors.default_function_mail_per_minute
                                }
                                onChange={(v) =>
                                    form.setData(
                                        'default_function_mail_per_minute',
                                        v,
                                    )
                                }
                            />

                            <ConfigSettingRow
                                id="cfg-fn-mail-invocation"
                                icon={
                                    <Send className="size-4 text-muted-foreground" />
                                }
                                label="E-mails par invocation"
                                tag="$context->mail"
                                description="Nombre maximal d'envois autorisés au cours d'une seule exécution de fonction (1 à 25)."
                                unit="mails/exec"
                                min={1}
                                max={25}
                                value={
                                    form.data
                                        .default_function_mail_per_invocation
                                }
                                error={
                                    form.errors
                                        .default_function_mail_per_invocation
                                }
                                onChange={(v) =>
                                    form.setData(
                                        'default_function_mail_per_invocation',
                                        v,
                                    )
                                }
                            />

                            <ConfigSettingRow
                                id="cfg-fn-mail-recipients"
                                icon={
                                    <Users className="size-4 text-muted-foreground" />
                                }
                                label="Destinataires max par e-mail"
                                tag="to + cc + bcc"
                                description="Nombre maximal d'adresses cumulées dans un même message (1 à 50)."
                                unit="dest."
                                min={1}
                                max={50}
                                value={
                                    form.data
                                        .default_function_mail_max_recipients
                                }
                                error={
                                    form.errors
                                        .default_function_mail_max_recipients
                                }
                                onChange={(v) =>
                                    form.setData(
                                        'default_function_mail_max_recipients',
                                        v,
                                    )
                                }
                            />

                            <ConfigSettingRow
                                id="cfg-fn-http-invocation"
                                icon={
                                    <Globe className="size-4 text-muted-foreground" />
                                }
                                label="Requêtes HTTPS par invocation"
                                tag="$context->http"
                                description="Nombre maximal d'appels HTTPS sortants anti-SSRF par exécution de fonction (1 à 25)."
                                unit="req/exec"
                                min={1}
                                max={25}
                                value={
                                    form.data
                                        .default_function_http_per_invocation
                                }
                                error={
                                    form.errors
                                        .default_function_http_per_invocation
                                }
                                onChange={(v) =>
                                    form.setData(
                                        'default_function_http_per_invocation',
                                        v,
                                    )
                                }
                            />

                            <ConfigSettingRow
                                id="cfg-fn-http-timeout"
                                icon={
                                    <Clock className="size-4 text-muted-foreground" />
                                }
                                label="Timeout HTTPS maximal"
                                tag="$context->http->timeout()"
                                description="Délai maximal d'une requête HTTPS sortante, plafonné sous le timeout de 5 s du runner (1 à 4 s)."
                                unit="secondes"
                                min={1}
                                max={4}
                                value={
                                    form.data
                                        .default_function_http_timeout_seconds
                                }
                                error={
                                    form.errors
                                        .default_function_http_timeout_seconds
                                }
                                onChange={(v) =>
                                    form.setData(
                                        'default_function_http_timeout_seconds',
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
