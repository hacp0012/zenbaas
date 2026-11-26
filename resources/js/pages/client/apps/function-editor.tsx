import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    Check,
    Clock,
    Copy,
    Download,
    FileUp,
    Play,
    Save,
    SlidersHorizontal,
    Sparkles,
    TerminalSquare,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { MonacoCodeEditor } from '@/components/monaco-code-editor';
import { PrismCodeBlock } from '@/components/prism-code-block';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';
import type { Auth, ZenbaseApp, ZenbaseFunction } from '@/types';

const DEFAULT_PHP_FUNCTION_TEMPLATE = `<?php

return function($event, $context) {
    // 1. Lire le payload JSON transmis par le SDK
    $name = $event['payload']['name'] ?? 'Développeur Zenbase';

    // 2. Interagir avec la base SQLite NoSQL de l'application
    $record = $context->database->collection('events')->create([
        'greeting' => "Bonjour, {$name} !",
        'user_id' => $context->auth->id(),
        'timestamp' => time(),
    ]);

    // 3. Lire une variable d'environnement ($context->env)
    $appEnv = $context->env['APP_ENV'] ?? 'production';

    return [
        'status' => 200,
        'data' => [
            'success' => true,
            'environment' => $appEnv,
            'record' => $record,
        ],
    ];
};`;

const QUICK_PHP_SNIPPETS = [
    {
        label: 'NoSQL: Insérer',
        code: `\n    $doc = $context->database->collection('items')->create([\n        'title' => 'Nouveau',\n        'active' => true,\n    ]);\n`,
    },
    {
        label: 'NoSQL: Requête',
        code: `\n    $items = $context->database->collection('items')\n        ->where('active', '==', true)\n        ->orderBy('created_at', 'desc')\n        ->limit(20)\n        ->get();\n`,
    },
    {
        label: 'Storage: Upload',
        code: `\n    $file = $context->storage->upload('exports/rapport.json', json_encode(['ok' => true]), 'application/json');\n`,
    },
    {
        label: 'Auth: Vérifier',
        code: `\n    if (! $context->auth->check()) {\n        return ['status' => 401, 'data' => ['error' => 'Authentification requise']];\n    }\n`,
    },
    {
        label: 'Mail: Envoyer',
        code: `\n    $mailResult = $context->mail->send([\n        'to' => $event['payload']['email'] ?? 'client@exemple.com',\n        'subject' => 'Notification Zenbase',\n        'html' => '<p>Bonjour depuis votre Web Function !</p>',\n    ]);\n`,
    },
    {
        label: 'HTTP: POST HTTPS',
        code: `\n    $httpResponse = $context->http\n        ->withToken($context->env['API_TOKEN'] ?? '')\n        ->post('https://api.exemple.com/v1/events', [\n            'event' => 'ping',\n        ]);\n`,
    },
];

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
        return '—';
    }

    return d.toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

export default function ClientAppFunctionEditor({
    app,
    apiBaseUrl,
    activeFunction,
    globalEnv = {},
}: {
    app: ZenbaseApp;
    apiBaseUrl?: string;
    activeFunction: ZenbaseFunction | null;
    stubsContent?: string;
    globalEnv?: Record<string, string>;
}) {
    const { auth, flash, errors } = usePage<{
        auth: Auth;
        flash?: {
            success?: string;
            error?: string;
            functionResult?: {
                function_id: string;
                function_name: string;
                status: number;
                data: unknown;
                error: string | null;
                duration_ms: number;
            };
        };
        errors?: Record<string, string>;
    }>().props;

    const functions = app.functions ?? [];
    const isEditingExisting = Boolean(activeFunction);

    const [fnName, setFnName] = useState(activeFunction?.name ?? '');
    const [fnDescription, setFnDescription] = useState(
        activeFunction?.description ?? '',
    );
    const [fnCode, setFnCode] = useState(
        activeFunction?.code ?? DEFAULT_PHP_FUNCTION_TEMPLATE,
    );
    const [fnActive, setFnActive] = useState<boolean>(
        activeFunction?.is_active ?? true,
    );
    const [testPayload, setTestPayload] = useState(
        '{\n  "name": "Alex",\n  "action": "ping"\n}',
    );
    const [rightTab, setRightTab] = useState<'test' | 'logs' | 'secrets'>(
        'test',
    );
    const [copiedEndpoint, setCopiedEndpoint] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const allEnvKeys = useMemo(() => {
        const keys = new Set<string>([
            ...Object.keys(globalEnv),
            ...Object.keys(activeFunction?.env_variables ?? {}),
        ]);

        return Array.from(keys);
    }, [globalEnv, activeFunction]);

    const normalizedApiBase = (apiBaseUrl ?? '/api/v1').replace(/\/+$/, '');
    const invokeEndpoint = activeFunction
        ? `${normalizedApiBase}/functions/${activeFunction.name}/invoke`
        : `${normalizedApiBase}/functions/${fnName || 'ma-fonction'}/invoke`;

    function handleCopyEndpoint() {
        void navigator.clipboard.writeText(invokeEndpoint);
        setCopiedEndpoint(true);
        setTimeout(() => setCopiedEndpoint(false), 2000);
    }

    function handleLocalPhpFileRead(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const content = String(reader.result ?? '');
            setFnCode(content);
            if (!isEditingExisting && !fnName.trim()) {
                const slug = file.name
                    .replace(/\.php$/i, '')
                    .replace(/[^a-zA-Z0-9_-]/g, '-');
                setFnName(slug);
            }
        };
        reader.readAsText(file);
    }

    function handleSaveFunction(e: FormEvent) {
        e.preventDefault();
        if (isEditingExisting && activeFunction) {
            router.put(
                `/dashboard/apps/${app.id}/functions/${activeFunction.id}`,
                {
                    name: fnName,
                    description: fnDescription,
                    code: fnCode,
                    is_active: fnActive,
                    env_variables: activeFunction.env_variables ?? {},
                },
                { preserveScroll: true },
            );
        } else {
            router.post(
                `/dashboard/apps/${app.id}/functions`,
                {
                    name: fnName,
                    description: fnDescription,
                    code: fnCode,
                    env_variables: {},
                    redirect_to_editor: true,
                },
                { preserveScroll: true },
            );
        }
    }

    function handleInvokeCurrentFunction() {
        if (!activeFunction) {
            return;
        }
        router.post(
            `/dashboard/apps/${app.id}/functions/${activeFunction.id}/invoke`,
            { payload: testPayload },
            { preserveScroll: true },
        );
    }

    const logsCount = activeFunction?.logs?.length ?? 0;

    return (
        <>
            <Head
                title={`${app.name} — IDE Edge Function (${activeFunction?.name ?? 'Nouvelle Fonction'})`}
            />
            <div className="flex flex-1 flex-col gap-4">
                {/* Function Detail Header */}
                <div className="rounded-xl bg-card px-4 py-3.5 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <Button asChild size="sm" variant="secondary">
                                <Link
                                    href={`/dashboard/apps/${app.id}/functions`}
                                >
                                    <ArrowLeft className="mr-1.5 size-3.5" />
                                    Fonctions
                                </Link>
                            </Button>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <TerminalSquare className="size-4 text-emerald-600" />
                                    <h2 className="font-mono text-base font-bold">
                                        {isEditingExisting
                                            ? activeFunction?.name
                                            : 'nouvelle-fonction'}
                                    </h2>
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                            fnActive
                                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-red-500/15 text-red-700 dark:text-red-300'
                                        }`}
                                    >
                                        <span
                                            className={`size-1.5 rounded-full ${fnActive ? 'bg-emerald-500' : 'bg-red-500'}`}
                                        />
                                        {fnActive ? 'Active' : 'Désactivée'}
                                    </span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                    {activeFunction?.created_at && (
                                        <span className="inline-flex items-center gap-1 font-mono">
                                            <Clock className="size-3" />
                                            Créée le{' '}
                                            {formatDateTime(
                                                activeFunction.created_at,
                                            )}
                                        </span>
                                    )}
                                    {auth?.user?.created_at && (
                                        <span className="inline-flex items-center gap-1">
                                            <Calendar className="size-3 text-emerald-600 dark:text-emerald-400" />
                                            Compte créé le{' '}
                                            {new Date(
                                                auth.user.created_at,
                                            ).toLocaleDateString('fr-FR')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {functions.length > 0 && (
                                <select
                                    value={activeFunction?.id ?? ''}
                                    onChange={(e) => {
                                        const targetId = e.target.value;
                                        if (targetId) {
                                            router.get(
                                                `/dashboard/apps/${app.id}/functions/editor/${targetId}`,
                                            );
                                        } else {
                                            router.get(
                                                `/dashboard/apps/${app.id}/functions/editor`,
                                            );
                                        }
                                    }}
                                    aria-label="Changer de fonction PHP"
                                    className="h-8 rounded-md bg-muted/60 px-2.5 font-mono text-xs"
                                >
                                    <option value="">
                                        + Nouvelle fonction...
                                    </option>
                                    {functions.map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.name}.php
                                        </option>
                                    ))}
                                </select>
                            )}

                            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-secondary px-2.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80">
                                <FileUp className="size-3.5 text-emerald-600" />
                                <span>Charger .php</span>
                                <input
                                    type="file"
                                    accept=".php,text/plain"
                                    className="hidden"
                                    onChange={handleLocalPhpFileRead}
                                />
                            </label>

                            {activeFunction && (
                                <Button asChild size="sm" variant="secondary">
                                    <a
                                        href={`/dashboard/apps/${app.id}/functions/${activeFunction.id}/download`}
                                        download
                                    >
                                        <Download className="mr-1.5 size-3.5" />
                                        .php
                                    </a>
                                </Button>
                            )}

                            <Button asChild size="sm" variant="secondary">
                                <Link
                                    href={`/dashboard/apps/${app.id}/functions/env`}
                                >
                                    <SlidersHorizontal className="mr-1.5 size-3.5 text-amber-500" />
                                    Secrets ({allEnvKeys.length})
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Endpoint bar */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-xs">
                        <div className="flex min-w-0 items-center gap-2">
                            <Badge
                                variant="secondary"
                                className="h-5 bg-emerald-500/15 font-mono text-[10px] text-emerald-700 dark:text-emerald-300"
                            >
                                POST
                            </Badge>
                            <code className="truncate font-mono text-[11px] text-muted-foreground">
                                {invokeEndpoint}
                            </code>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyEndpoint}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                            {copiedEndpoint ? (
                                <>
                                    <Check className="size-3" />
                                    Copié
                                </>
                            ) : (
                                <>
                                    <Copy className="size-3" />
                                    Copier URL
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {(errors?.code || errors?.name) && (
                    <div className="rounded-xl bg-red-500/10 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300">
                        {errors.code || errors.name}
                    </div>
                )}

                {/* Split IDE & Inspector Workspace */}
                <div className="grid flex-1 gap-5 lg:grid-cols-12">
                    {/* Main Code Editor Column */}
                    <div className="flex flex-col lg:col-span-8">
                        <form
                            onSubmit={handleSaveFunction}
                            className="flex h-full flex-1 flex-col overflow-hidden rounded-xl bg-card shadow-xs"
                        >
                            {/* Metadata Strip */}
                            <div className="grid gap-3 bg-muted/25 p-4 sm:grid-cols-12">
                                <div className="space-y-1 sm:col-span-4">
                                    <Label
                                        htmlFor="ide-fn-name"
                                        className="text-[11px] text-muted-foreground uppercase"
                                    >
                                        Slug de la fonction
                                    </Label>
                                    <Input
                                        id="ide-fn-name"
                                        value={fnName}
                                        onChange={(e) =>
                                            setFnName(e.target.value)
                                        }
                                        placeholder="send-welcome-email"
                                        className="h-8 font-mono text-xs"
                                        required
                                    />
                                </div>
                                <div className="space-y-1 sm:col-span-6">
                                    <Label
                                        htmlFor="ide-fn-desc"
                                        className="text-[11px] text-muted-foreground uppercase"
                                    >
                                        Description
                                    </Label>
                                    <Input
                                        id="ide-fn-desc"
                                        value={fnDescription}
                                        onChange={(e) =>
                                            setFnDescription(e.target.value)
                                        }
                                        placeholder="Décrivez le rôle de cette Edge Function..."
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="flex items-end sm:col-span-2">
                                    <label className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-background px-2 text-xs shadow-2xs">
                                        <input
                                            type="checkbox"
                                            checked={fnActive}
                                            onChange={(e) =>
                                                setFnActive(e.target.checked)
                                            }
                                            className="size-3.5 rounded"
                                        />
                                        <span>Active</span>
                                    </label>
                                </div>
                            </div>

                            {/* Snippets Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/15 px-4 py-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="mr-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                                        <Sparkles className="size-3 text-emerald-600" />
                                        Snippets :
                                    </span>
                                    {QUICK_PHP_SNIPPETS.map((snip) => (
                                        <button
                                            key={snip.label}
                                            type="button"
                                            onClick={() =>
                                                setFnCode((prev) =>
                                                    prev.includes('return [')
                                                        ? prev.replace(
                                                              'return [',
                                                              `${snip.code}\n    return [`,
                                                          )
                                                        : `${prev}\n${snip.code}`,
                                                )
                                            }
                                            className="rounded-md bg-muted/60 px-2 py-0.5 font-mono text-[10px] transition hover:bg-muted hover:text-foreground"
                                        >
                                            + {snip.label}
                                        </button>
                                    ))}
                                </div>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    {fnName || 'index'}.php
                                </span>
                            </div>

                            {/* Edge-to-Edge Monaco PHP Editor */}
                            <div className="min-h-[480px] flex-1">
                                <MonacoCodeEditor
                                    value={fnCode}
                                    onChange={setFnCode}
                                    language="php"
                                    height="100%"
                                    edgeToEdge
                                    envKeys={allEnvKeys}
                                />
                            </div>

                            {/* Editor Footer Action Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/25 px-4 py-3">
                                <div className="text-[11px] text-muted-foreground">
                                    Autocomplétion active sur{' '}
                                    <code className="rounded bg-muted px-1 font-mono">
                                        $context-&gt;
                                    </code>{' '}
                                    et{' '}
                                    <code className="rounded bg-muted px-1 font-mono">
                                        $event
                                    </code>
                                    .
                                </div>

                                <div className="flex items-center gap-2">
                                    {activeFunction && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="destructive"
                                            onClick={() =>
                                                setConfirmDeleteOpen(true)
                                            }
                                        >
                                            <Trash2 className="mr-1.5 size-3.5" />
                                            Supprimer
                                        </Button>
                                    )}
                                    <Button type="submit" size="sm">
                                        <Save className="mr-1.5 size-3.5" />
                                        {isEditingExisting
                                            ? 'Déployer les modifications'
                                            : 'Créer et déployer'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Right Column: Tabbed Inspector (Test / Logs / Secrets) */}
                    <div className="flex flex-col lg:col-span-4">
                        <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl bg-card shadow-xs">
                            <div className="grid grid-cols-3 bg-muted/30 p-1 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setRightTab('test')}
                                    className={`rounded-md py-1.5 font-medium transition ${
                                        rightTab === 'test'
                                            ? 'bg-background text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Tester
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRightTab('logs')}
                                    className={`rounded-md py-1.5 font-medium transition ${
                                        rightTab === 'logs'
                                            ? 'bg-background text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Logs ({logsCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRightTab('secrets')}
                                    className={`rounded-md py-1.5 font-medium transition ${
                                        rightTab === 'secrets'
                                            ? 'bg-background text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Secrets ({allEnvKeys.length})
                                </button>
                            </div>

                            <div className="flex-1 p-4">
                                {rightTab === 'test' && (
                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="text-xs font-semibold">
                                                Payload JSON d&apos;invocation
                                            </h3>
                                            <p className="text-[11px] text-muted-foreground">
                                                Envoyé dans{' '}
                                                <code className="font-mono">
                                                    $event[&apos;payload&apos;]
                                                </code>
                                                .
                                            </p>
                                        </div>
                                        <MonacoCodeEditor
                                            value={testPayload}
                                            onChange={setTestPayload}
                                            language="json"
                                            height={170}
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="w-full"
                                            disabled={!activeFunction}
                                            onClick={
                                                handleInvokeCurrentFunction
                                            }
                                        >
                                            <Play className="mr-1.5 size-3.5" />
                                            {activeFunction
                                                ? `Invoquer ${activeFunction.name}`
                                                : "Déployez d'abord la fonction"}
                                        </Button>

                                        {flash?.functionResult &&
                                            activeFunction &&
                                            flash.functionResult.function_id ===
                                                activeFunction.id && (
                                                <div className="space-y-2 pt-3">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <Badge
                                                            variant={
                                                                flash
                                                                    .functionResult
                                                                    .error
                                                                    ? 'destructive'
                                                                    : 'secondary'
                                                            }
                                                        >
                                                            HTTP{' '}
                                                            {
                                                                flash
                                                                    .functionResult
                                                                    .status
                                                            }
                                                        </Badge>
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            {
                                                                flash
                                                                    .functionResult
                                                                    .duration_ms
                                                            }{' '}
                                                            ms
                                                        </span>
                                                    </div>
                                                    <PrismCodeBlock
                                                        code={JSON.stringify(
                                                            flash.functionResult
                                                                .error
                                                                ? {
                                                                      error: flash
                                                                          .functionResult
                                                                          .error,
                                                                  }
                                                                : flash
                                                                      .functionResult
                                                                      .data,
                                                            null,
                                                            2,
                                                        )}
                                                        language="json"
                                                        title="Réponse JSON"
                                                        maxHeight="260px"
                                                    />
                                                </div>
                                            )}
                                    </div>
                                )}

                                {rightTab === 'logs' && (
                                    <div className="space-y-2">
                                        {!activeFunction ||
                                        !activeFunction.logs ||
                                        activeFunction.logs.length === 0 ? (
                                            <div className="py-10 text-center text-xs text-muted-foreground">
                                                Aucun journal d&apos;exécution
                                                enregistré.
                                            </div>
                                        ) : (
                                            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1 text-xs">
                                                {activeFunction.logs.map(
                                                    (log, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="rounded-lg bg-muted/35 p-2.5"
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <Badge
                                                                    variant={
                                                                        log.error
                                                                            ? 'destructive'
                                                                            : 'secondary'
                                                                    }
                                                                    className="h-5 font-mono text-[10px]"
                                                                >
                                                                    HTTP{' '}
                                                                    {log.status}
                                                                </Badge>
                                                                <span className="font-mono text-[10px] text-muted-foreground">
                                                                    {
                                                                        log.duration_ms
                                                                    }{' '}
                                                                    ms
                                                                </span>
                                                            </div>
                                                            {log.timestamp && (
                                                                <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                                                                    {formatDateTime(
                                                                        log.timestamp,
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="mt-1.5 rounded bg-muted/50 p-1.5 font-mono text-[11px] break-all text-muted-foreground">
                                                                {log.error ||
                                                                    log.output ||
                                                                    'OK'}
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {rightTab === 'secrets' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground">
                                                Disponibles via{' '}
                                                <code className="font-mono">
                                                    $context-&gt;env
                                                </code>
                                            </p>
                                            <Link
                                                href={`/dashboard/apps/${app.id}/functions/env`}
                                                className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                                            >
                                                Gérer →
                                            </Link>
                                        </div>

                                        {allEnvKeys.length === 0 ? (
                                            <div className="rounded-lg bg-muted/35 py-10 text-center text-xs text-muted-foreground">
                                                Aucune variable
                                                d&apos;environnement configurée.
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {allEnvKeys.map((key) => (
                                                    <div
                                                        key={key}
                                                        className="flex items-center justify-between rounded-md bg-muted/35 px-2.5 py-2 font-mono text-[11px]"
                                                    >
                                                        <span className="truncate font-medium">
                                                            {key}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            ••••••••
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmActionDialog
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                variant="destructive"
                title={`Supprimer la fonction « ${activeFunction?.name ?? ''} » ?`}
                description="Cette Web Function PHP sera définitivement supprimée."
                confirmLabel="Supprimer définitivement"
                onConfirm={() => {
                    if (!activeFunction) {
                        return;
                    }
                    router.delete(
                        `/dashboard/apps/${app.id}/functions/${activeFunction.id}`,
                    );
                }}
            />
        </>
    );
}

ClientAppFunctionEditor.layout = {
    breadcrumbs: [
        {
            title: 'Mes Applications',
            href: dashboard(),
        },
        {
            title: 'Edge / Web Functions PHP',
            href: '#',
        },
        {
            title: 'Éditeur PHP (IDE)',
            href: '#',
        },
    ],
};
