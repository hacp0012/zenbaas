import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Activity,
    Calendar,
    Check,
    Clock,
    Code2,
    Copy,
    Cpu,
    Download,
    FileUp,
    Plus,
    Search,
    SlidersHorizontal,
    TerminalSquare,
    Trash2,
    Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiBaseUrl, getAppUrl } from '@/lib/app-url';
import { dashboard } from '@/routes';
import type { Auth, ZenbaseApp, ZenbaseFunction } from '@/types';

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

function formatDateOnly(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
        return '—';
    }

    return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

export default function ClientAppFunctions({
    app,
    apiBaseUrl,
    stubsContent,
    globalEnv = {},
}: {
    app: ZenbaseApp;
    apiBaseUrl?: string;
    stubsContent: string;
    globalEnv?: Record<string, string>;
}) {
    const { auth, appUrl } = usePage<{ auth: Auth; appUrl?: string }>().props;
    const functions = app.functions ?? [];

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<
        'all' | 'active' | 'inactive'
    >('all');
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
    const [snippetTab, setSnippetTab] = useState<'sdk' | 'curl'>('sdk');
    const [stubsModalOpen, setStubsModalOpen] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [functionToDelete, setFunctionToDelete] =
        useState<ZenbaseFunction | null>(null);

    const uploadForm = useForm<{
        file: File | null;
        name: string;
        description: string;
    }>({
        file: null,
        name: '',
        description: '',
    });

    const filteredFunctions = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase();

        return functions.filter((fn) => {
            if (statusFilter === 'active' && !fn.is_active) {
                return false;
            }
            if (statusFilter === 'inactive' && fn.is_active) {
                return false;
            }
            if (!needle) {
                return true;
            }

            return (
                fn.name.toLowerCase().includes(needle) ||
                (fn.description ?? '').toLowerCase().includes(needle)
            );
        });
    }, [functions, searchQuery, statusFilter]);

    const metrics = useMemo(() => {
        const activeCount = functions.filter((f) => f.is_active).length;
        const allLogs = functions.flatMap((f) => f.logs ?? []);
        const totalExecutions = allLogs.length;
        const avgDuration =
            totalExecutions > 0
                ? Math.round(
                      allLogs.reduce(
                          (acc, log) => acc + (Number(log.duration_ms) || 0),
                          0,
                      ) / totalExecutions,
                  )
                : 0;
        const successCount = allLogs.filter((l) => !l.error).length;
        const successRate =
            totalExecutions > 0
                ? Math.round((successCount / totalExecutions) * 100)
                : 100;

        return {
            activeCount,
            totalExecutions,
            avgDuration,
            successRate,
        };
    }, [functions]);

    const normalizedApiBase = getApiBaseUrl(apiBaseUrl, appUrl);
    const normalizedEndpoint =
        normalizedApiBase.replace(/\/api\/v1$/, '') || getAppUrl(appUrl);
    const sampleFnName = functions[0]?.name ?? 'hello-world';
    const sampleInvokeUrl = `${normalizedApiBase}/functions/${sampleFnName}/invoke`;

    const sdkInvokeSnippet = `import { Zenbase } from '@hacp0012/zenbase-sdk';

const zb = new Zenbase({
  endpoint: '${normalizedEndpoint}',
  apiKey: '${app.public_key}',
});

const { data, error, meta } = await zb.functions.invoke('${sampleFnName}', {
  name: 'Zenbase',
});`;

    const curlInvokeSnippet = `curl -X POST '${sampleInvokeUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Zenbase-Api-Key: ${app.public_key}' \\
  -d '{"name": "Zenbase"}'`;

    function copyEndpoint(url: string) {
        void navigator.clipboard.writeText(url);
        setCopiedUrl(url);
        setTimeout(() => setCopiedUrl(null), 2000);
    }

    function handleUploadPhpFile(e: FormEvent) {
        e.preventDefault();
        if (!uploadForm.data.file) {
            return;
        }
        uploadForm.post(`/dashboard/apps/${app.id}/functions/upload`, {
            forceFormData: true,
            onSuccess: () => {
                uploadForm.reset();
                setUploadModalOpen(false);
            },
        });
    }

    return (
        <>
            <Head title={`${app.name} — Edge / Web Functions PHP`} />
            <div className="space-y-6">
                {/* Supabase-style Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-lg border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Zap className="size-4" />
                            </div>
                            <h2 className="text-xl font-semibold tracking-tight">
                                Edge Functions (PHP Serverless)
                            </h2>
                            <Badge
                                variant="secondary"
                                className="font-mono text-[11px]"
                            >
                                {functions.length} déployée(s)
                            </Badge>
                        </div>
                        <p className="max-w-2xl text-xs text-muted-foreground">
                            Déployez, testez et surveillez vos fonctions PHP
                            exécutées côté serveur dans un bac à sable isolé
                            avec accès direct à votre base NoSQL, au stockage et
                            à vos secrets.
                        </p>
                        {auth?.user?.created_at && (
                            <div className="inline-flex items-center gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
                                <Calendar className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>
                                    Compte utilisateur créé le{' '}
                                    <strong className="font-medium text-foreground">
                                        {formatDateOnly(auth.user.created_at)}
                                    </strong>
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                            <Link
                                href={`/dashboard/apps/${app.id}/functions/env`}
                            >
                                <SlidersHorizontal className="mr-1.5 size-3.5 text-amber-500" />
                                Secrets ({Object.keys(globalEnv).length})
                            </Link>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setUploadModalOpen(true)}
                        >
                            <FileUp className="mr-1.5 size-3.5" />
                            Importer .php
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setStubsModalOpen(true)}
                        >
                            <Code2 className="mr-1.5 size-3.5" />
                            Stubs IDE
                        </Button>
                        <Button asChild size="sm">
                            <Link
                                href={`/dashboard/apps/${app.id}/functions/editor`}
                            >
                                <Plus className="mr-1.5 size-4" />
                                Déployer une fonction
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Compact KPI Strip */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-card px-4 py-3 shadow-xs">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Fonctions actives</span>
                            <Cpu className="size-3.5 text-emerald-500" />
                        </div>
                        <div className="mt-1.5 flex items-baseline gap-2">
                            <span className="font-mono text-xl font-semibold">
                                {metrics.activeCount}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                / {functions.length} au total
                            </span>
                        </div>
                    </div>

                    <div className="rounded-xl bg-card px-4 py-3 shadow-xs">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Invocations enregistrées</span>
                            <Activity className="size-3.5 text-blue-500" />
                        </div>
                        <div className="mt-1.5 flex items-baseline gap-2">
                            <span className="font-mono text-xl font-semibold">
                                {metrics.totalExecutions}
                            </span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                {metrics.successRate}% succès
                            </span>
                        </div>
                    </div>

                    <div className="rounded-xl bg-card px-4 py-3 shadow-xs">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Latence moyenne</span>
                            <Clock className="size-3.5 text-purple-500" />
                        </div>
                        <div className="mt-1.5 flex items-baseline gap-1.5">
                            <span className="font-mono text-xl font-semibold">
                                {metrics.avgDuration}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                                ms
                            </span>
                        </div>
                    </div>

                    <div className="rounded-xl bg-card px-4 py-3 shadow-xs">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Secrets globaux (.env)</span>
                            <SlidersHorizontal className="size-3.5 text-amber-500" />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                            <span className="font-mono text-xl font-semibold">
                                {Object.keys(globalEnv).length}
                            </span>
                            <Link
                                href={`/dashboard/apps/${app.id}/functions/env`}
                                className="text-xs font-medium text-foreground hover:underline"
                            >
                                Configurer →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Main Functions Table Container */}
                <div className="overflow-hidden rounded-xl bg-card shadow-xs">
                    {/* Search & Filter Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 px-4 py-3">
                        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                            <Search className="pointer-events-none absolute top-2 left-2.5 size-3.5 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher une fonction..."
                                className="h-8 pl-8 text-xs"
                            />
                        </div>

                        <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs">
                            {(
                                [
                                    ['all', `Toutes (${functions.length})`],
                                    [
                                        'active',
                                        `Actives (${metrics.activeCount})`,
                                    ],
                                    [
                                        'inactive',
                                        `Désactivées (${functions.length - metrics.activeCount})`,
                                    ],
                                ] as const
                            ).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setStatusFilter(value)}
                                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                                        statusFilter === value
                                            ? 'bg-primary text-primary-foreground shadow-2xs'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {functions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
                                <TerminalSquare className="size-6 text-muted-foreground" />
                            </div>
                            <h3 className="mt-4 text-base font-semibold">
                                Aucune Edge Function déployée
                            </h3>
                            <p className="mt-1 max-w-md text-xs text-muted-foreground">
                                Créez votre première Web Function PHP dans
                                l&apos;éditeur intégré avec autocomplétion
                                IntelliSense ou importez un fichier{' '}
                                <code className="font-mono">.php</code>.
                            </p>
                            <div className="mt-5 flex flex-wrap justify-center gap-2">
                                <Button asChild size="sm">
                                    <Link
                                        href={`/dashboard/apps/${app.id}/functions/editor`}
                                    >
                                        <Plus className="mr-1.5 size-4" />
                                        Déployer ma première fonction
                                    </Link>
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setUploadModalOpen(true)}
                                >
                                    <FileUp className="mr-1.5 size-4" />
                                    Importer un fichier .php
                                </Button>
                            </div>
                        </div>
                    ) : filteredFunctions.length === 0 ? (
                        <div className="px-6 py-12 text-center text-xs text-muted-foreground">
                            Aucune fonction ne correspond à votre filtre actuel.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b bg-muted/30 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                        <th className="px-4 py-2.5">
                                            Fonction
                                        </th>
                                        <th className="px-4 py-2.5">
                                            URL d&apos;invocation
                                        </th>
                                        <th className="px-4 py-2.5">
                                            Créée le
                                        </th>
                                        <th className="px-4 py-2.5">
                                            Mise à jour
                                        </th>
                                        <th className="px-4 py-2.5">
                                            Exécutions
                                        </th>
                                        <th className="px-4 py-2.5">Statut</th>
                                        <th className="px-4 py-2.5 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredFunctions.map((fn) => {
                                        const invokeUrl = `${normalizedApiBase}/functions/${fn.name}/invoke`;
                                        const envCount = Object.keys(
                                            fn.env_variables ?? {},
                                        ).length;
                                        const logsCount = fn.logs?.length ?? 0;
                                        const lastLog = fn.logs?.[0] ?? null;

                                        return (
                                            <tr
                                                key={fn.id}
                                                className="group transition hover:bg-muted/30"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-emerald-600 dark:text-emerald-400">
                                                            <TerminalSquare className="size-3.5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={`/dashboard/apps/${app.id}/functions/editor/${fn.id}`}
                                                                className="font-mono text-xs font-semibold text-foreground hover:text-emerald-600 hover:underline dark:hover:text-emerald-400"
                                                            >
                                                                {fn.name}
                                                            </Link>
                                                            <p className="max-w-[240px] truncate text-[11px] text-muted-foreground">
                                                                {fn.description ||
                                                                    'Fonction serverless PHP'}
                                                            </p>
                                                            {envCount > 0 && (
                                                                <span className="mt-0.5 inline-block font-mono text-[10px] text-amber-600 dark:text-amber-400">
                                                                    {envCount}{' '}
                                                                    secret(s)
                                                                    local(aux)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <code className="max-w-[260px] truncate rounded border bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                                                            /functions/{fn.name}
                                                            /invoke
                                                        </code>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                copyEndpoint(
                                                                    invokeUrl,
                                                                )
                                                            }
                                                            className="inline-flex size-6 items-center justify-center rounded border bg-background text-muted-foreground hover:border-emerald-500/50 hover:text-foreground"
                                                            title="Copier l'URL complète"
                                                        >
                                                            {copiedUrl ===
                                                            invokeUrl ? (
                                                                <Check className="size-3 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="size-3" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                                                    {formatDateTime(
                                                        fn.created_at,
                                                    )}
                                                </td>

                                                <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                                                    {formatDateTime(
                                                        fn.updated_at ??
                                                            fn.created_at,
                                                    )}
                                                </td>

                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono font-medium">
                                                            {logsCount}
                                                        </span>
                                                        {lastLog && (
                                                            <Badge
                                                                variant={
                                                                    lastLog.error
                                                                        ? 'destructive'
                                                                        : 'secondary'
                                                                }
                                                                className="h-5 px-1.5 font-mono text-[10px]"
                                                            >
                                                                {lastLog.status}{' '}
                                                                ·{' '}
                                                                {
                                                                    lastLog.duration_ms
                                                                }
                                                                ms
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                                            fn.is_active
                                                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                                : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`size-1.5 rounded-full ${
                                                                fn.is_active
                                                                    ? 'bg-emerald-500'
                                                                    : 'bg-red-500'
                                                            }`}
                                                        />
                                                        {fn.is_active
                                                            ? 'Active'
                                                            : 'Désactivée'}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1">
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 px-2.5 text-xs"
                                                        >
                                                            <Link
                                                                href={`/dashboard/apps/${app.id}/functions/editor/${fn.id}`}
                                                            >
                                                                Ouvrir IDE
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            asChild
                                                            size="icon"
                                                            variant="ghost"
                                                            className="size-7"
                                                            title="Télécharger .php"
                                                        >
                                                            <a
                                                                href={`/dashboard/apps/${app.id}/functions/${fn.id}/download`}
                                                                download
                                                            >
                                                                <Download className="size-3.5" />
                                                            </a>
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            className="size-7 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                                                            onClick={() =>
                                                                setFunctionToDelete(
                                                                    fn,
                                                                )
                                                            }
                                                            title="Supprimer la fonction"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Supabase-style Quick Invoke Reference */}
                <Card>
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
                        <div>
                            <CardTitle className="text-sm">
                                Invoquer vos Edge Functions
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Appelez{' '}
                                <code className="font-mono">
                                    {sampleFnName}
                                </code>{' '}
                                directement via le SDK JavaScript/TypeScript ou
                                HTTP cURL.
                            </CardDescription>
                        </div>
                        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setSnippetTab('sdk')}
                                className={`rounded-md px-2.5 py-1 font-medium transition ${
                                    snippetTab === 'sdk'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                @hacp0012/zenbase-sdk
                            </button>
                            <button
                                type="button"
                                onClick={() => setSnippetTab('curl')}
                                className={`rounded-md px-2.5 py-1 font-medium transition ${
                                    snippetTab === 'curl'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                cURL
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <PrismCodeBlock
                            code={
                                snippetTab === 'sdk'
                                    ? sdkInvokeSnippet
                                    : curlInvokeSnippet
                            }
                            language={
                                snippetTab === 'sdk' ? 'typescript' : 'bash'
                            }
                            title={
                                snippetTab === 'sdk'
                                    ? 'invoke-function.ts'
                                    : 'invoke-function.sh'
                            }
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Modal : Stubs IDE */}
            <Dialog open={stubsModalOpen} onOpenChange={setStubsModalOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            Autocomplétion IDE : zenbase-stubs.php
                        </DialogTitle>
                        <DialogDescription>
                            Ajoutez ce fichier à votre projet local pour
                            bénéficier de l&apos;autocomplétion de{' '}
                            <code className="font-mono">$context</code> et{' '}
                            <code className="font-mono">$event</code> dans VS
                            Code ou PhpStorm.
                        </DialogDescription>
                    </DialogHeader>
                    <PrismCodeBlock
                        code={stubsContent}
                        language="php"
                        title="zenbase-stubs.php"
                        maxHeight="360px"
                    />
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStubsModalOpen(false)}
                        >
                            Fermer
                        </Button>
                        <Button asChild>
                            <a
                                href="/dashboard/stubs/zenbase-stubs.php"
                                download
                            >
                                <Download className="mr-1.5 size-3.5" />
                                Télécharger zenbase-stubs.php
                            </a>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal : Uploader un fichier .php */}
            <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Importer / Déployer un fichier PHP
                        </DialogTitle>
                        <DialogDescription>
                            Sélectionnez un fichier{' '}
                            <code className="font-mono">.php</code> contenant
                            votre closure{' '}
                            <code className="font-mono">
                                return function($event, $context) &#123; ...
                                &#125;;
                            </code>
                            . Il sera validé par le sandbox puis ouvert dans
                            l&apos;éditeur.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUploadPhpFile} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="php-file">Fichier .php</Label>
                            <Input
                                id="php-file"
                                type="file"
                                accept=".php,text/php,application/x-httpd-php,text/plain"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    uploadForm.setData('file', file);
                                    if (file && !uploadForm.data.name) {
                                        const inferred = file.name
                                            .replace(/\.php$/i, '')
                                            .replace(/[^a-zA-Z0-9_-]/g, '-');
                                        uploadForm.setData('name', inferred);
                                    }
                                }}
                                required
                            />
                            {uploadForm.errors.file && (
                                <p className="text-xs text-red-500">
                                    {uploadForm.errors.file}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="upload-fn-name">
                                Nom de la fonction (slug)
                            </Label>
                            <Input
                                id="upload-fn-name"
                                value={uploadForm.data.name}
                                onChange={(e) =>
                                    uploadForm.setData('name', e.target.value)
                                }
                                placeholder="Ex: process-webhook"
                                className="font-mono text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Si une fonction porte déjà ce nom, son code sera
                                mis à jour.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="upload-fn-desc">
                                Description (optionnelle)
                            </Label>
                            <Input
                                id="upload-fn-desc"
                                value={uploadForm.data.description}
                                onChange={(e) =>
                                    uploadForm.setData(
                                        'description',
                                        e.target.value,
                                    )
                                }
                                placeholder="Traitement de webhook Stripe..."
                                className="text-xs"
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setUploadModalOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={uploadForm.processing}
                            >
                                Importer et ouvrir dans l&apos;IDE
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmActionDialog
                open={functionToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setFunctionToDelete(null);
                    }
                }}
                variant="destructive"
                title={`Supprimer la fonction PHP « ${functionToDelete?.name ?? ''} » ?`}
                description="Cette Web Function serverless sera définitivement supprimée de l'application."
                warningNote={`Tout appel SDK vers zb.functions.invoke('${functionToDelete?.name ?? ''}') retournera immédiatement une erreur 404.`}
                confirmLabel="Supprimer la fonction"
                onConfirm={() => {
                    if (!functionToDelete) {
                        return;
                    }
                    router.delete(
                        `/dashboard/apps/${app.id}/functions/${functionToDelete.id}`,
                        { preserveScroll: true },
                    );
                }}
            />
        </>
    );
}

ClientAppFunctions.layout = {
    breadcrumbs: [
        {
            title: 'Mes Applications',
            href: dashboard(),
        },
        {
            title: 'Edge / Web Functions PHP',
            href: '#',
        },
    ],
};
