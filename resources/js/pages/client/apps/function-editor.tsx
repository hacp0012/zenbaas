import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Code2,
    Download,
    FileUp,
    Play,
    Plus,
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
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ClientAppLayout from '@/layouts/client-app-layout';
import type { ZenbaseApp, ZenbaseFunction } from '@/types';

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
        label: 'NoSQL: Insérer un document',
        code: `\n    $doc = $context->database->collection('items')->create([\n        'title' => 'Nouveau',\n        'active' => true,\n    ]);\n`,
    },
    {
        label: 'NoSQL: Requête filtrée',
        code: `\n    $items = $context->database->collection('items')\n        ->where('active', '==', true)\n        ->orderBy('created_at', 'desc')\n        ->limit(20)\n        ->get();\n`,
    },
    {
        label: 'Storage: Générer un fichier',
        code: `\n    $file = $context->storage->upload('exports/rapport.json', json_encode(['ok' => true]), 'application/json');\n`,
    },
    {
        label: 'Auth: Vérifier utilisateur',
        code: `\n    if (! $context->auth->check()) {\n        return ['status' => 401, 'data' => ['error' => 'Authentification requise']];\n    }\n`,
    },
];

export default function ClientAppFunctionEditor({
    app,
    activeFunction,
    globalEnv = {},
}: {
    app: ZenbaseApp;
    activeFunction: ZenbaseFunction | null;
    stubsContent?: string;
    globalEnv?: Record<string, string>;
}) {
    const { flash, errors } = usePage<{
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
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const allEnvKeys = useMemo(() => {
        const keys = new Set<string>([
            ...Object.keys(globalEnv),
            ...Object.keys(activeFunction?.env_variables ?? {}),
        ]);

        return Array.from(keys);
    }, [globalEnv, activeFunction]);

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

    return (
        <>
            <Head
                title={`${app.name} — IDE PHP (${activeFunction?.name ?? 'Nouvelle Fonction'})`}
            />
            <div className="space-y-4">
                {/* Top IDE Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-xs">
                    <div className="flex items-center gap-3">
                        <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/apps/${app.id}/functions`}>
                                <ArrowLeft className="mr-1.5 size-3.5" />
                                Liste des fonctions
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <TerminalSquare className="size-4 text-emerald-600" />
                                <h2 className="font-mono text-base font-bold">
                                    {isEditingExisting
                                        ? `${activeFunction?.name}.php`
                                        : 'nouvelle-fonction.php'}
                                </h2>
                                <Badge
                                    variant="secondary"
                                    className="bg-emerald-500/15 font-mono text-[10px] text-emerald-700 dark:text-emerald-300"
                                >
                                    IntelliSense PHP Actif
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Éditeur PHP complet avec suggestions (
                                <code className="font-mono">$context</code>,{' '}
                                <code className="font-mono">$event</code>,
                                fonctions PHP standard) et exécution sandbox en
                                direct.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Quick Function Switcher */}
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
                                className="h-8 rounded-md border bg-background px-2.5 font-mono text-xs"
                            >
                                <option value="">+ Nouvelle fonction...</option>
                                {functions.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.name}.php
                                    </option>
                                ))}
                            </select>
                        )}

                        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted">
                            <FileUp className="size-3.5 text-emerald-600" />
                            <span>Charger un .php</span>
                            <input
                                type="file"
                                accept=".php,text/plain"
                                className="hidden"
                                onChange={handleLocalPhpFileRead}
                            />
                        </label>

                        {activeFunction && (
                            <Button asChild size="sm" variant="outline">
                                <a
                                    href={`/dashboard/apps/${app.id}/functions/${activeFunction.id}/download`}
                                    download
                                >
                                    <Download className="mr-1.5 size-3.5" />
                                    Télécharger .php
                                </a>
                            </Button>
                        )}

                        <Button asChild size="sm" variant="outline">
                            <Link
                                href={`/dashboard/apps/${app.id}/functions/env`}
                            >
                                <SlidersHorizontal className="mr-1.5 size-3.5 text-amber-500" />
                                Variables d&apos;Env ({allEnvKeys.length})
                            </Link>
                        </Button>
                    </div>
                </div>

                {(errors?.code || errors?.name) && (
                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300">
                        {errors.code || errors.name}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-12">
                    {/* Main PHP Monaco IDE Column */}
                    <div className="space-y-4 lg:col-span-8">
                        <Card>
                            <CardContent className="pt-5">
                                <form
                                    onSubmit={handleSaveFunction}
                                    className="space-y-4"
                                >
                                    <div className="grid gap-3 sm:grid-cols-12">
                                        <div className="space-y-1 sm:col-span-4">
                                            <Label
                                                htmlFor="ide-fn-name"
                                                className="text-xs"
                                            >
                                                Identifiant de la fonction
                                                (slug)
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
                                                className="text-xs"
                                            >
                                                Description
                                            </Label>
                                            <Input
                                                id="ide-fn-desc"
                                                value={fnDescription}
                                                onChange={(e) =>
                                                    setFnDescription(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Décrivez le rôle de cette Web Function..."
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="flex items-end sm:col-span-2">
                                            <label className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 text-xs">
                                                <input
                                                    type="checkbox"
                                                    checked={fnActive}
                                                    onChange={(e) =>
                                                        setFnActive(
                                                            e.target.checked,
                                                        )
                                                    }
                                                    className="size-3.5 rounded"
                                                />
                                                <span>Active</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Quick Snippets Bar */}
                                    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-2">
                                        <span className="mr-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                                            <Sparkles className="size-3 text-emerald-600" />
                                            Snippets rapides :
                                        </span>
                                        {QUICK_PHP_SNIPPETS.map((snip) => (
                                            <button
                                                key={snip.label}
                                                type="button"
                                                onClick={() =>
                                                    setFnCode((prev) =>
                                                        prev.includes(
                                                            'return [',
                                                        )
                                                            ? prev.replace(
                                                                  'return [',
                                                                  `${snip.code}\n    return [`,
                                                              )
                                                            : `${prev}\n${snip.code}`,
                                                    )
                                                }
                                                className="rounded-md border bg-background px-2 py-0.5 font-mono text-[10px] hover:border-emerald-500/50 hover:text-emerald-600"
                                            >
                                                + {snip.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Monaco PHP Editor with Autocomplete */}
                                    <MonacoCodeEditor
                                        value={fnCode}
                                        onChange={setFnCode}
                                        language="php"
                                        height={480}
                                        envKeys={allEnvKeys}
                                    />

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                        <div className="text-[11px] text-muted-foreground">
                                            Astuce : Tapez{' '}
                                            <code className="rounded bg-muted px-1 font-mono">
                                                $context-&gt;
                                            </code>{' '}
                                            ou{' '}
                                            <code className="rounded bg-muted px-1 font-mono">
                                                $event
                                            </code>{' '}
                                            pour afficher les suggestions
                                            d&apos;autocomplétion PHP.
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {activeFunction && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() =>
                                                        setConfirmDeleteOpen(
                                                            true,
                                                        )
                                                    }
                                                >
                                                    <Trash2 className="mr-1.5 size-3.5" />
                                                    Supprimer
                                                </Button>
                                            )}
                                            <Button
                                                type="submit"
                                                size="sm"
                                                className="bg-emerald-600 text-white hover:bg-emerald-500"
                                            >
                                                <Save className="mr-1.5 size-3.5" />
                                                {isEditingExisting
                                                    ? 'Enregistrer la fonction PHP'
                                                    : 'Créer et déployer la fonction'}
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Live Test Runner, Env Variables Preview & Execution Logs */}
                    <div className="space-y-4 lg:col-span-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center justify-between text-sm">
                                    <span>Console de Test en Direct</span>
                                    {activeFunction && (
                                        <Badge
                                            variant="outline"
                                            className="font-mono text-[10px]"
                                        >
                                            POST /invoke
                                        </Badge>
                                    )}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Exécutez votre fonction avec un payload JSON
                                    de test sans quitter l&apos;éditeur.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <MonacoCodeEditor
                                    value={testPayload}
                                    onChange={setTestPayload}
                                    language="json"
                                    height={140}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    className="w-full"
                                    disabled={!activeFunction}
                                    onClick={handleInvokeCurrentFunction}
                                >
                                    <Play className="mr-1.5 size-3.5" />
                                    {activeFunction
                                        ? `Exécuter ${activeFunction.name}.php`
                                        : "Enregistrez d'abord la fonction"}
                                </Button>

                                {flash?.functionResult &&
                                    activeFunction &&
                                    flash.functionResult.function_id ===
                                        activeFunction.id && (
                                        <div className="space-y-2 pt-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <Badge
                                                    variant={
                                                        flash.functionResult
                                                            .error
                                                            ? 'destructive'
                                                            : 'secondary'
                                                    }
                                                >
                                                    HTTP{' '}
                                                    {
                                                        flash.functionResult
                                                            .status
                                                    }
                                                </Badge>
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    {
                                                        flash.functionResult
                                                            .duration_ms
                                                    }{' '}
                                                    ms
                                                </span>
                                            </div>
                                            <PrismCodeBlock
                                                code={JSON.stringify(
                                                    flash.functionResult.error
                                                        ? {
                                                              error: flash
                                                                  .functionResult
                                                                  .error,
                                                          }
                                                        : flash.functionResult
                                                              .data,
                                                    null,
                                                    2,
                                                )}
                                                language="json"
                                                title="Résultat d'exécution"
                                                maxHeight="200px"
                                            />
                                        </div>
                                    )}
                            </CardContent>
                        </Card>

                        {/* Available Environment Variables Summary */}
                        <Card>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">
                                        Variables d&apos;Environnement (
                                        {allEnvKeys.length})
                                    </CardTitle>
                                    <Link
                                        href={`/dashboard/apps/${app.id}/functions/env`}
                                        className="text-xs font-medium text-emerald-600 hover:underline"
                                    >
                                        Gérer →
                                    </Link>
                                </div>
                                <CardDescription className="text-xs">
                                    Injectées dans{' '}
                                    <code className="font-mono">
                                        $context-&gt;env
                                    </code>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {allEnvKeys.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        Aucune variable configurée. Cliquez sur
                                        « Gérer » pour en ajouter.
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {allEnvKeys.map((key) => (
                                            <Badge
                                                key={key}
                                                variant="secondary"
                                                className="font-mono text-[10px]"
                                            >
                                                $context-&gt;env[&apos;{key}
                                                &apos;]
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Logs */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">
                                    Historique des Logs
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!activeFunction ||
                                !activeFunction.logs ||
                                activeFunction.logs.length === 0 ? (
                                    <p className="py-4 text-center text-xs text-muted-foreground">
                                        Aucun log d&apos;exécution.
                                    </p>
                                ) : (
                                    <div className="max-h-60 space-y-2 overflow-y-auto text-xs">
                                        {activeFunction.logs.map((log, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-lg border p-2"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <Badge
                                                        variant={
                                                            log.error
                                                                ? 'destructive'
                                                                : 'secondary'
                                                        }
                                                        className="text-[10px]"
                                                    >
                                                        HTTP {log.status}
                                                    </Badge>
                                                    <span className="font-mono text-[10px] text-muted-foreground">
                                                        {log.duration_ms} ms
                                                    </span>
                                                </div>
                                                <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                                                    {log.error || log.output}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
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
