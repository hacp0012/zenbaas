import { Head, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Bot,
    Check,
    ChevronDown,
    Copy,
    Eye,
    EyeOff,
    Lock,
    Plug,
    ShieldCheck,
    Sparkles,
    Terminal,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { update as updateMcpSettings } from '@/actions/App/Http/Controllers/Dashboard/AppMcpController';
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
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';
import type {
    ZenbaseApp,
    ZenbaseMcpPromptInfo,
    ZenbaseMcpResourceInfo,
    ZenbaseMcpSettings,
    ZenbaseMcpToolInfo,
} from '@/types';

type ClientTab = 'cursor' | 'claude' | 'vscode' | 'generic';

export default function ClientAppMcp({
    app,
    mcpEndpointUrl,
    mcpSettings,
    mcpTools,
    mcpResources = [],
    mcpPrompts = [],
}: {
    app: ZenbaseApp;
    mcpEndpointUrl: string;
    mcpSettings: ZenbaseMcpSettings;
    mcpTools: ZenbaseMcpToolInfo[];
    mcpResources?: ZenbaseMcpResourceInfo[];
    mcpPrompts?: ZenbaseMcpPromptInfo[];
}) {
    const form = useForm<ZenbaseMcpSettings>({
        enabled: mcpSettings.enabled,
        read_only: mcpSettings.read_only,
        allow_functions: mcpSettings.allow_functions,
        allow_auth_management: mcpSettings.allow_auth_management,
        allow_storage_write: mcpSettings.allow_storage_write,
    });

    const [activeClient, setActiveClient] = useState<ClientTab>('cursor');
    const [revealSecretInSnippets, setRevealSecretInSnippets] = useState(false);
    const [copiedEndpoint, setCopiedEndpoint] = useState(false);
    const [copiedItem, setCopiedItem] = useState<string | null>(null);
    const [resourcesOpen, setResourcesOpen] = useState(false);
    const [promptsOpen, setPromptsOpen] = useState(false);

    const apiKeyPlaceholder =
        revealSecretInSnippets && app.secret_key
            ? app.secret_key
            : 'VOTRE_CLE_SECRETE_ZB_SEC';

    const serverSlug =
        `zenbase-${app.name}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'zenbase-app';

    function handleSave(e: FormEvent) {
        e.preventDefault();
        form.submit(updateMcpSettings(app.id), {
            preserveScroll: true,
        });
    }

    function handleCopyEndpoint() {
        void navigator.clipboard.writeText(mcpEndpointUrl);
        setCopiedEndpoint(true);
        setTimeout(() => setCopiedEndpoint(false), 2000);
    }

    function handleCopyText(key: string, value: string) {
        void navigator.clipboard.writeText(value);
        setCopiedItem(key);
        setTimeout(() => {
            setCopiedItem((current) => (current === key ? null : current));
        }, 2000);
    }

    function handleToggleReadOnly(checked: boolean) {
        form.setData((prev) => ({
            ...prev,
            read_only: checked,
            allow_functions: checked ? false : prev.allow_functions,
            allow_auth_management: checked ? false : prev.allow_auth_management,
            allow_storage_write: checked ? false : prev.allow_storage_write,
        }));
    }

    const snippets: Record<
        ClientTab,
        {
            label: string;
            title: string;
            language: 'json' | 'bash';
            code: string;
        }
    > = {
        cursor: {
            label: 'Cursor',
            title: '.cursor/mcp.json',
            language: 'json',
            code: JSON.stringify(
                {
                    mcpServers: {
                        [serverSlug]: {
                            url: mcpEndpointUrl,
                            headers: {
                                Authorization: `Bearer ${apiKeyPlaceholder}`,
                            },
                        },
                    },
                },
                null,
                2,
            ),
        },
        claude: {
            label: 'Claude Code',
            title: 'Terminal (Claude Code CLI)',
            language: 'bash',
            code: `claude mcp add --transport http ${serverSlug} ${mcpEndpointUrl} \\\n  --header "Authorization: Bearer ${apiKeyPlaceholder}"`,
        },
        vscode: {
            label: 'VS Code',
            title: '.vscode/mcp.json',
            language: 'json',
            code: JSON.stringify(
                {
                    servers: {
                        [serverSlug]: {
                            type: 'http',
                            url: mcpEndpointUrl,
                            headers: {
                                Authorization: `Bearer ${apiKeyPlaceholder}`,
                            },
                        },
                    },
                },
                null,
                2,
            ),
        },
        generic: {
            label: 'Antigravity / Générique',
            title: 'mcp_config.json',
            language: 'json',
            code: JSON.stringify(
                {
                    mcpServers: {
                        [serverSlug]: {
                            serverUrl: mcpEndpointUrl,
                            headers: {
                                'X-Zenbase-Api-Key': apiKeyPlaceholder,
                            },
                        },
                    },
                },
                null,
                2,
            ),
        },
    };

    const currentSnippet = snippets[activeClient];
    const activeToolsCount = mcpTools.filter((tool) => tool.active).length;

    return (
        <>
            <Head title={`${app.name} — Serveur MCP (IA)`} />
            <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-12">
                    <Card className="lg:col-span-5">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ShieldCheck className="size-4 text-emerald-600" />
                                    Statut &amp; Permissions MCP
                                </CardTitle>
                                <Badge
                                    variant={
                                        mcpSettings.enabled
                                            ? 'default'
                                            : 'secondary'
                                    }
                                    className={
                                        mcpSettings.enabled
                                            ? 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300'
                                            : ''
                                    }
                                >
                                    {mcpSettings.enabled
                                        ? mcpSettings.read_only
                                            ? 'Actif · Lecture seule'
                                            : 'Actif · Lecture & Écriture'
                                        : 'Désactivé'}
                                </Badge>
                            </div>
                            <CardDescription>
                                Contrôlez précisément ce que les agents IA
                                connectés avec la clé secrète{' '}
                                <code className="font-mono text-xs">
                                    zb_sec_...
                                </code>{' '}
                                peuvent inspecter ou modifier.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="flex items-start gap-3 rounded-xl border p-3.5">
                                    <Checkbox
                                        id="mcp-enabled"
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
                                            htmlFor="mcp-enabled"
                                            className="cursor-pointer text-sm font-semibold"
                                        >
                                            Activer le serveur MCP pour cette
                                            application
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Autorise les requêtes Streamable
                                            HTTP authentifiées par{' '}
                                            <code className="font-mono">
                                                zb_sec_...
                                            </code>{' '}
                                            sur{' '}
                                            <code className="font-mono">
                                                /mcp
                                            </code>
                                            . Les clés publiques{' '}
                                            <code className="font-mono">
                                                zb_pub_...
                                            </code>{' '}
                                            sont toujours refusées.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 rounded-xl border p-3.5">
                                    <Checkbox
                                        id="mcp-read-only"
                                        checked={form.data.read_only}
                                        disabled={!form.data.enabled}
                                        onCheckedChange={(checked) =>
                                            handleToggleReadOnly(
                                                checked === true,
                                            )
                                        }
                                        className="mt-0.5"
                                    />
                                    <div className="space-y-1">
                                        <Label
                                            htmlFor="mcp-read-only"
                                            className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold"
                                        >
                                            <Lock className="size-3.5 text-emerald-600" />
                                            Mode Lecture seule (recommandé)
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Expose uniquement les outils
                                            d&apos;inspection (collections,
                                            schémas, requêtes, utilisateurs,
                                            fichiers, code des functions) et
                                            masque toute mutation.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3 rounded-xl border border-dashed p-3.5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                                        Permissions avancées (nécessite mode
                                        écriture)
                                    </p>

                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            id="mcp-allow-functions"
                                            checked={form.data.allow_functions}
                                            disabled={
                                                !form.data.enabled ||
                                                form.data.read_only
                                            }
                                            onCheckedChange={(checked) =>
                                                form.setData(
                                                    'allow_functions',
                                                    checked === true,
                                                )
                                            }
                                            className="mt-0.5"
                                        />
                                        <div className="space-y-0.5">
                                            <Label
                                                htmlFor="mcp-allow-functions"
                                                className="cursor-pointer text-xs font-medium"
                                            >
                                                Déployer &amp; invoquer les Web
                                                Functions PHP
                                            </Label>
                                            <p className="text-[11px] text-muted-foreground">
                                                Active{' '}
                                                <code className="font-mono">
                                                    upsert_function
                                                </code>{' '}
                                                et{' '}
                                                <code className="font-mono">
                                                    invoke_function
                                                </code>{' '}
                                                (toujours soumis au sandbox
                                                PHP).
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            id="mcp-allow-auth"
                                            checked={
                                                form.data.allow_auth_management
                                            }
                                            disabled={
                                                !form.data.enabled ||
                                                form.data.read_only
                                            }
                                            onCheckedChange={(checked) =>
                                                form.setData(
                                                    'allow_auth_management',
                                                    checked === true,
                                                )
                                            }
                                            className="mt-0.5"
                                        />
                                        <div className="space-y-0.5">
                                            <Label
                                                htmlFor="mcp-allow-auth"
                                                className="cursor-pointer text-xs font-medium"
                                            >
                                                Gérer les utilisateurs Tenant
                                                (Auth)
                                            </Label>
                                            <p className="text-[11px] text-muted-foreground">
                                                Active{' '}
                                                <code className="font-mono">
                                                    manage_tenant_user
                                                </code>{' '}
                                                (bloquer, débloquer, supprimer).
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            id="mcp-allow-storage"
                                            checked={
                                                form.data.allow_storage_write
                                            }
                                            disabled={
                                                !form.data.enabled ||
                                                form.data.read_only
                                            }
                                            onCheckedChange={(checked) =>
                                                form.setData(
                                                    'allow_storage_write',
                                                    checked === true,
                                                )
                                            }
                                            className="mt-0.5"
                                        />
                                        <div className="space-y-0.5">
                                            <Label
                                                htmlFor="mcp-allow-storage"
                                                className="cursor-pointer text-xs font-medium"
                                            >
                                                Supprimer des fichiers Storage
                                            </Label>
                                            <p className="text-[11px] text-muted-foreground">
                                                Active{' '}
                                                <code className="font-mono">
                                                    delete_storage_file
                                                </code>
                                                .
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {form.data.enabled && !form.data.read_only && (
                                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                        <span>
                                            <strong>
                                                Mode écriture activé :
                                            </strong>{' '}
                                            les agents connectés pourront créer,
                                            modifier et supprimer des
                                            collections ou documents NoSQL. Les
                                            actions destructives restent
                                            annotées{' '}
                                            <code className="font-mono">
                                                destructiveHint
                                            </code>
                                            .
                                        </span>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={form.processing}
                                >
                                    Enregistrer la configuration MCP
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-7">
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Plug className="size-4 text-emerald-600" />
                                        Connecter votre IDE ou Agent IA
                                    </CardTitle>
                                    <CardDescription>
                                        Transport Streamable HTTP standard MCP
                                        (aucun paquet local à installer).
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        setRevealSecretInSnippets(
                                            !revealSecretInSnippets,
                                        )
                                    }
                                >
                                    {revealSecretInSnippets ? (
                                        <>
                                            <EyeOff className="mr-1.5 size-3.5" />
                                            Masquer la clé
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="mr-1.5 size-3.5" />
                                            Injecter ma clé secrète
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between gap-2 rounded-xl border bg-muted/40 px-3.5 py-2.5">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                                        Endpoint MCP (POST)
                                    </p>
                                    <p className="truncate font-mono text-xs font-medium">
                                        {mcpEndpointUrl}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCopyEndpoint}
                                >
                                    {copiedEndpoint ? (
                                        <>
                                            <Check className="mr-1.5 size-3.5 text-emerald-600" />
                                            Copié
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="mr-1.5 size-3.5" />
                                            Copier
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {(
                                    Object.entries(snippets) as [
                                        ClientTab,
                                        (typeof snippets)[ClientTab],
                                    ][]
                                ).map(([key, item]) => (
                                    <Button
                                        key={key}
                                        type="button"
                                        size="sm"
                                        variant={
                                            activeClient === key
                                                ? 'default'
                                                : 'secondary'
                                        }
                                        onClick={() => setActiveClient(key)}
                                    >
                                        {item.label}
                                    </Button>
                                ))}
                            </div>

                            <PrismCodeBlock
                                code={currentSnippet.code}
                                language={currentSnippet.language}
                                title={currentSnippet.title}
                            />

                            <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">
                                    Note de sécurité :
                                </span>{' '}
                                Les valeurs des variables d&apos;environnement (
                                <code className="font-mono">.env</code>), les
                                mots de passe hashés et les tokens d&apos;accès
                                utilisateurs ne sont jamais renvoyés par les
                                outils MCP.
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Terminal className="size-4 text-emerald-600" />
                                Catalogue des Tools ({activeToolsCount}/
                                {mcpTools.length} actifs)
                            </CardTitle>
                        </div>
                        <CardDescription>
                            Les outils désactivés ne sont ni listés dans{' '}
                            <code className="font-mono text-xs">
                                tools/list
                            </code>{' '}
                            ni exécutables via{' '}
                            <code className="font-mono text-xs">
                                tools/call
                            </code>
                            .
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 md:grid-cols-2">
                            {mcpTools.map((tool) => (
                                <div
                                    key={tool.name}
                                    className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${
                                        tool.active ? '' : 'opacity-50'
                                    }`}
                                >
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <code className="font-mono text-xs font-semibold">
                                                {tool.name}
                                            </code>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px]"
                                            >
                                                {tool.module}
                                            </Badge>
                                            <Badge
                                                variant={
                                                    tool.access ===
                                                    'destructive'
                                                        ? 'destructive'
                                                        : tool.access ===
                                                            'write'
                                                          ? 'default'
                                                          : 'secondary'
                                                }
                                                className="text-[10px]"
                                            >
                                                {tool.access === 'read'
                                                    ? 'Lecture'
                                                    : tool.access === 'write'
                                                      ? 'Écriture'
                                                      : 'Destructif'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {tool.description}
                                        </p>
                                    </div>
                                    <Badge
                                        variant={
                                            tool.active
                                                ? 'default'
                                                : 'secondary'
                                        }
                                        className={
                                            tool.active
                                                ? 'bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/15 dark:text-emerald-300'
                                                : ''
                                        }
                                    >
                                        {tool.active ? 'Exposé' : 'Masqué'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid items-start gap-6 lg:grid-cols-2">
                    <Collapsible
                        open={resourcesOpen}
                        onOpenChange={setResourcesOpen}
                    >
                        <Card>
                            <CollapsibleTrigger asChild>
                                <button
                                    type="button"
                                    className="w-full cursor-pointer text-left transition-colors hover:bg-muted/30"
                                >
                                    <CardHeader>
                                        <div className="flex items-center justify-between gap-3">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <Bot className="size-4 text-emerald-600" />
                                                Resources MCP (
                                                {mcpResources.length})
                                            </CardTitle>
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                {resourcesOpen
                                                    ? 'Masquer'
                                                    : 'Afficher'}
                                                <ChevronDown
                                                    className={`size-4 transition-transform duration-200 ${
                                                        resourcesOpen
                                                            ? 'rotate-180'
                                                            : ''
                                                    }`}
                                                />
                                            </span>
                                        </div>
                                        <CardDescription>
                                            Contexte en lecture seule attachable
                                            directement dans vos conversations
                                            IA via leur URI{' '}
                                            <code className="font-mono text-xs">
                                                zenbase://
                                            </code>
                                            .
                                        </CardDescription>
                                    </CardHeader>
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <CardContent className="space-y-4 border-t pt-4">
                                    <div className="rounded-xl border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                                        <p className="font-semibold text-foreground">
                                            Comment utiliser les Resources ?
                                        </p>
                                        <ul className="mt-1.5 list-disc space-y-1 pl-4">
                                            <li>
                                                <strong>
                                                    Tous les clients
                                                </strong>{' '}
                                                : mentionnez simplement
                                                l&apos;URI dans votre message
                                                (ex.{' '}
                                                <code className="font-mono">
                                                    Lis zenbase://app/overview
                                                </code>
                                                ).
                                            </li>
                                            <li>
                                                <strong>Claude Code</strong> :
                                                tapez{' '}
                                                <code className="font-mono">
                                                    @
                                                </code>{' '}
                                                pour auto-compléter une
                                                ressource MCP.
                                            </li>
                                            <li>
                                                <strong>
                                                    VS Code (Copilot)
                                                </strong>{' '}
                                                : utilisez{' '}
                                                <code className="font-mono">
                                                    #
                                                </code>{' '}
                                                ou{' '}
                                                <em>
                                                    Add Context → MCP Resources
                                                </em>
                                                .
                                            </li>
                                            <li>
                                                <strong>Templates URI</strong> :
                                                remplacez{' '}
                                                <code className="font-mono">
                                                    {'{collection}'}
                                                </code>{' '}
                                                ou{' '}
                                                <code className="font-mono">
                                                    {'{function}'}
                                                </code>{' '}
                                                par le nom réel de votre
                                                ressource.
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="space-y-3">
                                        {mcpResources.map((resource) => {
                                            const copyKey = `resource:${resource.uri}`;

                                            return (
                                                <div
                                                    key={resource.uri}
                                                    className="space-y-2 rounded-lg border p-3.5"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                                            <code className="truncate font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                                                {resource.uri}
                                                            </code>
                                                            <Badge
                                                                variant={
                                                                    resource.is_template
                                                                        ? 'default'
                                                                        : 'secondary'
                                                                }
                                                                className={
                                                                    resource.is_template
                                                                        ? 'bg-emerald-600/15 text-[10px] text-emerald-700 hover:bg-emerald-600/15 dark:text-emerald-300'
                                                                        : 'text-[10px]'
                                                                }
                                                            >
                                                                {resource.is_template
                                                                    ? 'Template URI'
                                                                    : 'Statique'}
                                                            </Badge>
                                                            <Badge
                                                                variant="outline"
                                                                className="font-mono text-[10px]"
                                                            >
                                                                {
                                                                    resource.mime_type
                                                                }
                                                            </Badge>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 px-2 text-xs"
                                                            onClick={() =>
                                                                handleCopyText(
                                                                    copyKey,
                                                                    resource.uri,
                                                                )
                                                            }
                                                        >
                                                            {copiedItem ===
                                                            copyKey ? (
                                                                <>
                                                                    <Check className="mr-1 size-3 text-emerald-600" />
                                                                    Copié
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy className="mr-1 size-3" />
                                                                    URI
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {resource.description}
                                                    </p>
                                                    <p className="rounded-md bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                                                        <span className="font-semibold text-foreground">
                                                            Exemple :
                                                        </span>{' '}
                                                        {resource.usage_example}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>

                    <Collapsible
                        open={promptsOpen}
                        onOpenChange={setPromptsOpen}
                    >
                        <Card>
                            <CollapsibleTrigger asChild>
                                <button
                                    type="button"
                                    className="w-full cursor-pointer text-left transition-colors hover:bg-muted/30"
                                >
                                    <CardHeader>
                                        <div className="flex items-center justify-between gap-3">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <Sparkles className="size-4 text-emerald-600" />
                                                Commandes guidées / Prompts (
                                                {mcpPrompts.length})
                                            </CardTitle>
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                {promptsOpen
                                                    ? 'Masquer'
                                                    : 'Afficher'}
                                                <ChevronDown
                                                    className={`size-4 transition-transform duration-200 ${
                                                        promptsOpen
                                                            ? 'rotate-180'
                                                            : ''
                                                    }`}
                                                />
                                            </span>
                                        </div>
                                        <CardDescription>
                                            Commandes expertes prêtes à
                                            l&apos;emploi qui injectent
                                            automatiquement le contexte réel de
                                            votre application (collections,
                                            schémas, code, logs, CORS).
                                        </CardDescription>
                                    </CardHeader>
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <CardContent className="space-y-4 border-t pt-4">
                                    <div className="rounded-xl border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                                        <p className="font-semibold text-foreground">
                                            Comment lancer une commande guidée ?
                                        </p>
                                        <ul className="mt-1.5 list-disc space-y-1 pl-4">
                                            <li>
                                                Dans{' '}
                                                <strong>
                                                    Claude Code, VS Code ou
                                                    Cursor
                                                </strong>
                                                , tapez{' '}
                                                <code className="font-mono">
                                                    /
                                                </code>{' '}
                                                puis sélectionnez le prompt MCP
                                                et renseignez ses arguments.
                                            </li>
                                            <li>
                                                Vous pouvez aussi demander en
                                                langage naturel :{' '}
                                                <em>
                                                    « Utilise le prompt MCP
                                                    debug-web-function pour la
                                                    fonction create-order »
                                                </em>
                                                .
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="space-y-3">
                                        {mcpPrompts.map((prompt) => {
                                            const commandText = `/${prompt.name}`;
                                            const copyKey = `prompt:${prompt.name}`;

                                            return (
                                                <div
                                                    key={prompt.name}
                                                    className="space-y-2 rounded-lg border p-3.5"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <code className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                                            {commandText}
                                                        </code>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 px-2 text-xs"
                                                            onClick={() =>
                                                                handleCopyText(
                                                                    copyKey,
                                                                    commandText,
                                                                )
                                                            }
                                                        >
                                                            {copiedItem ===
                                                            copyKey ? (
                                                                <>
                                                                    <Check className="mr-1 size-3 text-emerald-600" />
                                                                    Copié
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy className="mr-1 size-3" />
                                                                    Copier
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {prompt.description}
                                                    </p>
                                                    {prompt.arguments.length >
                                                    0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {prompt.arguments.map(
                                                                (arg) => (
                                                                    <Badge
                                                                        key={
                                                                            arg.name
                                                                        }
                                                                        variant="outline"
                                                                        title={
                                                                            arg.description
                                                                        }
                                                                        className="font-mono text-[10px]"
                                                                    >
                                                                        {
                                                                            arg.name
                                                                        }
                                                                        {arg.required
                                                                            ? ' *'
                                                                            : ' (opt)'}
                                                                    </Badge>
                                                                ),
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[10px]"
                                                        >
                                                            Aucun argument
                                                            requis
                                                        </Badge>
                                                    )}
                                                    <p className="rounded-md bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                                                        <span className="font-semibold text-foreground">
                                                            Cas d&apos;usage :
                                                        </span>{' '}
                                                        {prompt.use_case}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>
                </div>
            </div>
        </>
    );
}

ClientAppMcp.layout = {
    breadcrumbs: [
        {
            title: 'Mes Applications',
            href: dashboard(),
        },
        {
            title: 'AI',
            href: '#',
        },
        {
            title: 'Serveur MCP',
            href: '#',
        },
    ],
};
