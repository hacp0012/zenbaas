import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    Database,
    KeyRound,
    RefreshCw,
    Settings,
    ShieldAlert,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { updateAdvanced } from '@/actions/App/Http/Controllers/Dashboard/AppSettingsController';
import {
    destroy as destroyApp,
    regenerateKeys,
} from '@/actions/App/Http/Controllers/Dashboard/ClientAppController';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
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
import { dashboard } from '@/routes';
import type { ZenbaseApp } from '@/types';

function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) {
        return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function ClientAppAdvancedSettings({
    app,
}: {
    app: ZenbaseApp;
}) {
    const form = useForm({
        name: app.name,
        description: app.description ?? '',
    });

    const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [confirmAppName, setConfirmAppName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    function handleSaveGeneral(e: FormEvent) {
        e.preventDefault();
        form.submit(updateAdvanced(app.id), {
            preserveScroll: true,
        });
    }

    function handleConfirmDelete(e: FormEvent) {
        e.preventDefault();
        if (confirmAppName.trim() !== app.name) {
            return;
        }
        setIsDeleting(true);
        router.delete(destroyApp.url(app.id), {
            onFinish: () => setIsDeleting(false),
        });
    }

    return (
        <>
            <Head title={`${app.name} — Settings · Advanced`} />
            <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-12">
                    <Card className="lg:col-span-7">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Settings className="size-4 text-emerald-600" />
                                Identité &amp; Métadonnées de l&apos;Application
                            </CardTitle>
                            <CardDescription>
                                Modifiez le nom d&apos;affichage et la
                                description de cette application Zenbase.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleSaveGeneral}
                                className="space-y-4"
                            >
                                <div className="space-y-1.5">
                                    <Label htmlFor="adv-app-name">
                                        Nom de l&apos;application
                                    </Label>
                                    <Input
                                        id="adv-app-name"
                                        value={form.data.name}
                                        onChange={(e) =>
                                            form.setData('name', e.target.value)
                                        }
                                        required
                                    />
                                    {form.errors.name && (
                                        <p className="text-xs text-red-500">
                                            {form.errors.name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="adv-app-description">
                                        Description (optionnelle)
                                    </Label>
                                    <Input
                                        id="adv-app-description"
                                        value={form.data.description}
                                        onChange={(e) =>
                                            form.setData(
                                                'description',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Ex: Backend SaaS e-commerce..."
                                    />
                                    {form.errors.description && (
                                        <p className="text-xs text-red-500">
                                            {form.errors.description}
                                        </p>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                    >
                                        {form.processing
                                            ? 'Enregistrement...'
                                            : 'Enregistrer les modifications'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Database className="size-4 text-emerald-600" />
                                Informations Techniques
                            </CardTitle>
                            <CardDescription>
                                Identifiants système et ressources isolées du
                                tenant.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="rounded-lg border bg-muted/30 p-3">
                                <p className="text-[11px] font-medium text-muted-foreground">
                                    Identifiant Application (UUID)
                                </p>
                                <p className="mt-0.5 font-mono break-all text-foreground">
                                    {app.id}
                                </p>
                            </div>
                            <div className="rounded-lg border bg-muted/30 p-3">
                                <p className="text-[11px] font-medium text-muted-foreground">
                                    Base SQLite isolée
                                </p>
                                <p className="mt-0.5 font-mono text-foreground">
                                    app_{app.id}.sqlite (
                                    {formatBytes(app.database_size_bytes)})
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                                <div className="rounded-lg border p-2.5">
                                    <span className="block text-[11px]">
                                        Collections
                                    </span>
                                    <span className="font-mono text-sm font-semibold text-foreground">
                                        {app.collections_count ?? 0}
                                    </span>
                                </div>
                                <div className="rounded-lg border p-2.5">
                                    <span className="block text-[11px]">
                                        Utilisateurs Auth
                                    </span>
                                    <span className="font-mono text-sm font-semibold text-foreground">
                                        {app.tenant_users_count ?? 0}
                                    </span>
                                </div>
                                <div className="rounded-lg border p-2.5">
                                    <span className="block text-[11px]">
                                        Fichiers Storage
                                    </span>
                                    <span className="font-mono text-sm font-semibold text-foreground">
                                        {app.files_count ?? 0}
                                    </span>
                                </div>
                                <div className="rounded-lg border p-2.5">
                                    <span className="block text-[11px]">
                                        Web Functions PHP
                                    </span>
                                    <span className="font-mono text-sm font-semibold text-foreground">
                                        {app.functions_count ?? 0}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* API Keys Rotation */}
                <Card className="border-amber-500/30">
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <KeyRound className="size-4 text-amber-500" />
                                    Rotation des clés d&apos;API
                                </CardTitle>
                                <CardDescription>
                                    Régénère immédiatement la clé publique (
                                    <code className="font-mono text-xs">
                                        zb_pub_...
                                    </code>
                                    ) et la clé secrète (
                                    <code className="font-mono text-xs">
                                        zb_sec_...
                                    </code>
                                    ). Les anciennes clés sont invalidées sans
                                    délai.
                                </CardDescription>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmRegenerateOpen(true)}
                            >
                                <RefreshCw className="mr-1.5 size-3.5" />
                                Régénérer les clés API
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                {/* Danger Zone — Centralized App Deletion */}
                <Card className="border-red-500/40 bg-red-500/[0.02]">
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                                    <ShieldAlert className="size-4" />
                                    Zone de Danger — Suppression de
                                    l&apos;Application
                                </CardTitle>
                                <CardDescription>
                                    Cette action irréversible détruit
                                    définitivement le fichier SQLite isolé, les{' '}
                                    <strong>
                                        {app.collections_count ?? 0}
                                    </strong>{' '}
                                    collection(s), les{' '}
                                    <strong>
                                        {app.tenant_users_count ?? 0}
                                    </strong>{' '}
                                    utilisateur(s), les{' '}
                                    <strong>{app.files_count ?? 0}</strong>{' '}
                                    fichier(s) et les{' '}
                                    <strong>{app.functions_count ?? 0}</strong>{' '}
                                    Web Function(s) PHP.
                                </CardDescription>
                            </div>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    setConfirmAppName('');
                                    setDeleteDialogOpen(true);
                                }}
                            >
                                <Trash2 className="mr-1.5 size-4" />
                                Supprimer cette application
                            </Button>
                        </div>
                    </CardHeader>
                </Card>
            </div>

            <ConfirmActionDialog
                open={confirmRegenerateOpen}
                onOpenChange={setConfirmRegenerateOpen}
                variant="warning"
                title="Régénérer les clés API de l'application ?"
                description="De nouvelles clés publique (zb_pub_...) et secrète (zb_sec_...) seront générées immédiatement."
                warningNote="Toutes les applications clientes, serveurs ou clients MCP utilisant les anciennes clés recevront immédiatement une erreur 401 Unauthorized."
                confirmLabel="Régénérer les clés"
                onConfirm={() => {
                    router.post(
                        regenerateKeys.url(app.id),
                        {},
                        { preserveScroll: true },
                    );
                }}
            />

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertTriangle className="size-4" />
                            Supprimer définitivement « {app.name} » ?
                        </DialogTitle>
                        <DialogDescription>
                            Cette action est irréversible. Toutes les données
                            isolées (
                            <code className="font-mono text-xs">
                                app_{app.id}.sqlite
                            </code>
                            , fichiers Storage, Web Functions et utilisateurs)
                            seront détruites.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleConfirmDelete} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="confirm-delete-app-name"
                                className="text-xs"
                            >
                                Saisissez{' '}
                                <span className="font-mono font-semibold text-foreground">
                                    {app.name}
                                </span>{' '}
                                pour confirmer :
                            </Label>
                            <Input
                                id="confirm-delete-app-name"
                                value={confirmAppName}
                                onChange={(e) =>
                                    setConfirmAppName(e.target.value)
                                }
                                placeholder={app.name}
                                autoComplete="off"
                            />
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDeleteDialogOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={
                                    isDeleting ||
                                    confirmAppName.trim() !== app.name
                                }
                            >
                                <Trash2 className="mr-1.5 size-3.5" />
                                {isDeleting
                                    ? 'Suppression...'
                                    : 'Supprimer définitivement'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

ClientAppAdvancedSettings.layout = {
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
            title: 'Advanced',
            href: '#',
        },
    ],
};
