import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    Activity,
    ArrowRight,
    Copy,
    Cpu,
    Database,
    FolderOpen,
    KeyRound,
    Plus,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
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
import { dashboard } from '@/routes';
import type { Auth, ZenbaseApp } from '@/types';

function formatBytes(bytes: number): string {
    if (bytes === 0) {
        return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function ClientAppsIndex({ apps }: { apps: ZenbaseApp[] }) {
    const { auth } = usePage<{
        auth: Auth;
    }>().props;
    const isAdmin = Boolean(auth?.user?.is_admin);
    const maxApps = Number(auth?.user?.max_apps ?? 1);
    const hasReachedQuota = apps.length >= maxApps;

    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const form = useForm({
        name: '',
        description: '',
    });

    function handleCreateApp(e: FormEvent) {
        e.preventDefault();
        form.post('/dashboard/apps', {
            onSuccess: () => form.reset(),
        });
    }

    function copyToClipboard(text: string) {
        void navigator.clipboard.writeText(text);
        setCopiedKey(text);
        setTimeout(() => setCopiedKey(null), 2000);
    }

    return (
        <>
            <Head title="Mes Applications — Espace Développeur Zenbase" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <span className="text-xs font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                            Espace Client / Développeur
                        </span>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight">
                            Mes Applications BaaS
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Chaque application dispose de sa propre base SQLite
                            orientée documents (JSON1), de ses clés API, de son
                            stockage isolé et de ses Web Functions PHP.
                        </p>
                    </div>
                    {!isAdmin && (
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge
                                variant="outline"
                                className="px-3 py-1 font-mono text-xs"
                            >
                                Apps : {apps.length} /{' '}
                                {auth?.user?.max_apps ?? 1}
                            </Badge>
                            <Badge
                                variant="outline"
                                className="px-3 py-1 font-mono text-xs"
                            >
                                Stockage :{' '}
                                {formatBytes(
                                    Number(auth?.user?.used_storage_bytes ?? 0),
                                )}{' '}
                                /{' '}
                                {auth?.user?.max_storage_mb != null
                                    ? `${auth.user.max_storage_mb} Mo`
                                    : 'Illimité'}
                            </Badge>
                            <Badge
                                variant="secondary"
                                className="bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-300"
                            >
                                Expiration :{' '}
                                {auth?.user?.expires_at
                                    ? new Date(
                                          auth.user.expires_at,
                                      ).toLocaleDateString('fr-FR')
                                    : 'Infini'}
                            </Badge>
                        </div>
                    )}
                </div>

                {!isAdmin && (
                    <Card className="border-emerald-500/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Plus className="size-4 text-emerald-600" />
                                Créer une Nouvelle Application
                            </CardTitle>
                            <CardDescription>
                                Provisionne instantanément un fichier SQLite
                                isolé, deux clés d&apos;API (
                                <code className="font-mono text-xs">
                                    zb_pub_...
                                </code>{' '}
                                et{' '}
                                <code className="font-mono text-xs">
                                    zb_sec_...
                                </code>
                                ) et un espace de stockage dédié.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {hasReachedQuota && (
                                <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-200">
                                    Vous avez atteint votre limite maximale
                                    d&apos;applications autorisées (
                                    {apps.length}/{maxApps}). Contactez
                                    l&apos;administrateur pour augmenter votre
                                    quota.
                                </div>
                            )}
                            <form
                                onSubmit={handleCreateApp}
                                className="grid gap-4 md:grid-cols-12 md:items-end"
                            >
                                <div className="space-y-1.5 md:col-span-4">
                                    <Label htmlFor="app-name">
                                        Nom de l&apos;application
                                    </Label>
                                    <Input
                                        id="app-name"
                                        value={form.data.name}
                                        onChange={(e) =>
                                            form.setData('name', e.target.value)
                                        }
                                        placeholder="Ex: Mon SaaS E-Commerce"
                                        disabled={hasReachedQuota}
                                        required
                                    />
                                    {form.errors.name && (
                                        <p className="text-xs text-red-500">
                                            {form.errors.name}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1.5 md:col-span-6">
                                    <Label htmlFor="app-description">
                                        Description (optionnelle)
                                    </Label>
                                    <Input
                                        id="app-description"
                                        value={form.data.description}
                                        onChange={(e) =>
                                            form.setData(
                                                'description',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Backend mobile Flutter & Web React..."
                                        disabled={hasReachedQuota}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Button
                                        type="submit"
                                        className="w-full bg-emerald-600 text-white hover:bg-emerald-500"
                                        disabled={
                                            form.processing || hasReachedQuota
                                        }
                                    >
                                        <Plus className="mr-1.5 size-4" />
                                        {form.processing
                                            ? 'Création...'
                                            : "Créer l'App"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {apps.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <Database className="size-10 text-muted-foreground" />
                            <h3 className="mt-3 text-base font-semibold">
                                Aucune application pour le moment
                            </h3>
                            <p className="mt-1 max-w-md text-sm text-muted-foreground">
                                Utilisez le formulaire ci-dessus pour créer
                                votre première application BaaS et obtenir vos
                                clés d&apos;API pour le SDK.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {apps.map((app) => (
                            <Card
                                key={app.id}
                                className="flex flex-col justify-between transition hover:border-emerald-500/50"
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <CardTitle className="text-lg">
                                                <Link
                                                    href={`/dashboard/apps/${app.id}`}
                                                    className="hover:text-emerald-600 hover:underline"
                                                >
                                                    {app.name}
                                                </Link>
                                            </CardTitle>
                                            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                                UUID : {app.id}
                                            </p>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                        >
                                            SQLite Isolé
                                        </Badge>
                                    </div>
                                    {app.description && (
                                        <CardDescription className="mt-2 line-clamp-2">
                                            {app.description}
                                        </CardDescription>
                                    )}
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    <div className="rounded-lg border bg-muted/40 p-2.5">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1 font-medium">
                                                <KeyRound className="size-3.5 text-emerald-600" />
                                                Clé Publique (Anon/SDK)
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    copyToClipboard(
                                                        app.public_key,
                                                    )
                                                }
                                                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
                                            >
                                                <Copy className="size-3" />
                                                {copiedKey === app.public_key
                                                    ? 'Copié !'
                                                    : 'Copier'}
                                            </button>
                                        </div>
                                        <div className="mt-1 truncate font-mono text-xs">
                                            {app.public_key}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5">
                                            <Database className="size-3.5 text-emerald-500" />
                                            <span>
                                                BDD :{' '}
                                                {formatBytes(
                                                    app.database_size_bytes,
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5">
                                            <Activity className="size-3.5 text-blue-500" />
                                            <span>
                                                {app.api_calls_count} appels API
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5">
                                            <FolderOpen className="size-3.5 text-amber-500" />
                                            <span>
                                                {app.files_count ?? 0}{' '}
                                                fichier(s)
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5">
                                            <Cpu className="size-3.5 text-purple-500" />
                                            <span>
                                                {app.functions_count ?? 0}{' '}
                                                fonction(s)
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Button
                                            asChild
                                            className="w-full bg-emerald-600 text-white hover:bg-emerald-500"
                                        >
                                            <Link
                                                href={`/dashboard/apps/${app.id}`}
                                            >
                                                Ouvrir l&apos;Application
                                                <ArrowRight className="ml-1.5 size-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

ClientAppsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Mes Applications',
            href: dashboard(),
        },
    ],
};
