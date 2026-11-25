import { Head, router, useForm } from '@inertiajs/react';
import {
    Ban,
    Calendar,
    CheckCircle2,
    Pencil,
    Search,
    Trash2,
    UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { update as updateTenantUser } from '@/actions/App/Http/Controllers/Dashboard/AppTenantUserController';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
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
import { dashboard } from '@/routes';
import type { ZenbaseApp, ZenbaseTenantUser } from '@/types';

export default function ClientAppAuth({
    app,
    tenantUsers,
    userSearch,
}: {
    app: ZenbaseApp;
    tenantUsers: ZenbaseTenantUser[];
    userSearch: string;
}) {
    const [searchQuery, setSearchQuery] = useState(userSearch || '');
    const [resettingUserId, setResettingUserId] = useState<string | null>(null);
    const [resetPasswordValue, setResetPasswordValue] = useState('');
    const [userToEdit, setUserToEdit] = useState<ZenbaseTenantUser | null>(
        null,
    );
    const [userToBlock, setUserToBlock] = useState<ZenbaseTenantUser | null>(
        null,
    );
    const [userToDelete, setUserToDelete] = useState<ZenbaseTenantUser | null>(
        null,
    );
    const newUserForm = useForm({ name: '', email: '', password: '' });
    const editUserForm = useForm({ name: '', email: '' });

    function openEditUserModal(user: ZenbaseTenantUser) {
        setUserToEdit(user);
        editUserForm.clearErrors();
        editUserForm.setData({
            name: user.name ?? '',
            email: user.email,
        });
    }

    function handleUpdateTenantUser(e: FormEvent) {
        e.preventDefault();
        if (!userToEdit) {
            return;
        }
        editUserForm.submit(updateTenantUser([app.id, userToEdit.id]), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setUserToEdit(null);
            },
        });
    }

    function handleCreateTenantUser(e: FormEvent) {
        e.preventDefault();
        newUserForm.post(`/dashboard/apps/${app.id}/users`, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => newUserForm.reset(),
        });
    }

    function handleSearchUsers(e: FormEvent) {
        e.preventDefault();
        router.get(
            `/dashboard/apps/${app.id}/auth`,
            { search: searchQuery },
            { preserveState: true, preserveScroll: true },
        );
    }

    function handleResetUserPassword(userId: string) {
        if (!resetPasswordValue || resetPasswordValue.length < 6) {
            return;
        }
        router.patch(
            `/dashboard/apps/${app.id}/users/${userId}/reset-password`,
            { password: resetPasswordValue },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    setResettingUserId(null);
                    setResetPasswordValue('');
                },
            },
        );
    }

    return (
        <>
            <Head title={`${app.name} — Utilisateurs / Auth`} />
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <UserPlus className="size-4 text-emerald-600" />
                            Ajouter un Utilisateur
                        </CardTitle>
                        <CardDescription>
                            Crée un utilisateur directement dans la table{' '}
                            <code className="font-mono text-xs">
                                auth_users
                            </code>{' '}
                            de la base SQLite de l&apos;application.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={handleCreateTenantUser}
                            className="space-y-4"
                        >
                            <div className="space-y-1.5">
                                <Label htmlFor="tu-name">
                                    Nom complet (optionnel)
                                </Label>
                                <Input
                                    id="tu-name"
                                    value={newUserForm.data.name}
                                    onChange={(e) =>
                                        newUserForm.setData(
                                            'name',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Ex: Alice Martin"
                                />
                                {newUserForm.errors.name && (
                                    <p className="text-xs text-red-500">
                                        {newUserForm.errors.name}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="tu-email">Adresse e-mail</Label>
                                <Input
                                    id="tu-email"
                                    type="email"
                                    value={newUserForm.data.email}
                                    onChange={(e) =>
                                        newUserForm.setData(
                                            'email',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="utilisateur@app.com"
                                    required
                                />
                                {newUserForm.errors.email && (
                                    <p className="text-xs text-red-500">
                                        {newUserForm.errors.email}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="tu-pass">Mot de passe</Label>
                                <Input
                                    id="tu-pass"
                                    type="password"
                                    value={newUserForm.data.password}
                                    onChange={(e) =>
                                        newUserForm.setData(
                                            'password',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Minimum 6 caractères"
                                    required
                                />
                                {newUserForm.errors.password && (
                                    <p className="text-xs text-red-500">
                                        {newUserForm.errors.password}
                                    </p>
                                )}
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-emerald-600 text-white hover:bg-emerald-500"
                                disabled={newUserForm.processing}
                            >
                                Ajouter l&apos;utilisateur
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-base">
                                    Utilisateurs de l&apos;Application (
                                    {tenantUsers.length})
                                </CardTitle>
                                <CardDescription>
                                    Authentifiés via Email/Mot de passe ou code
                                    OTP par e-mail
                                </CardDescription>
                            </div>
                            <form
                                onSubmit={handleSearchUsers}
                                className="flex gap-2"
                            >
                                <Input
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    placeholder="Rechercher par nom ou e-mail..."
                                    className="h-9 w-56 text-xs"
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    variant="outline"
                                >
                                    <Search className="size-3.5" />
                                </Button>
                            </form>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {tenantUsers.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                Aucun utilisateur inscrit sur cette application.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b text-xs text-muted-foreground uppercase">
                                            <th className="pb-2 font-medium">
                                                Utilisateur
                                            </th>
                                            <th className="pb-2 font-medium">
                                                Méthode
                                            </th>
                                            <th className="pb-2 font-medium">
                                                Date de création
                                            </th>
                                            <th className="pb-2 font-medium">
                                                Statut
                                            </th>
                                            <th className="pb-2 text-right font-medium">
                                                Contrôle
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {tenantUsers.map((tu) => (
                                            <tr key={tu.id}>
                                                <td className="py-3">
                                                    {tu.name && (
                                                        <div className="font-semibold">
                                                            {tu.name}
                                                        </div>
                                                    )}
                                                    <div
                                                        className={
                                                            tu.name
                                                                ? 'text-xs text-muted-foreground'
                                                                : 'font-medium'
                                                        }
                                                    >
                                                        {tu.email}
                                                    </div>
                                                    <div className="font-mono text-[11px] text-muted-foreground/80">
                                                        {tu.id}
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    <Badge variant="outline">
                                                        {tu.auth_method ===
                                                        'otp'
                                                            ? 'OTP E-mail'
                                                            : 'Mot de passe'}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 text-xs text-muted-foreground">
                                                    {tu.created_at ? (
                                                        <div className="flex items-center gap-1.5 font-mono">
                                                            <Calendar className="size-3.5 shrink-0 text-muted-foreground/70" />
                                                            <span>
                                                                {new Date(
                                                                    tu.created_at,
                                                                ).toLocaleString(
                                                                    'fr-FR',
                                                                    {
                                                                        dateStyle:
                                                                            'short',
                                                                        timeStyle:
                                                                            'short',
                                                                    },
                                                                )}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span>—</span>
                                                    )}
                                                </td>
                                                <td className="py-3">
                                                    {tu.is_blocked ? (
                                                        <Badge variant="destructive">
                                                            Bloqué
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                                            Actif
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="py-3 text-right">
                                                    <div className="flex flex-wrap justify-end gap-1.5">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                openEditUserModal(
                                                                    tu,
                                                                )
                                                            }
                                                            title="Modifier le nom et l'adresse e-mail"
                                                        >
                                                            <Pencil className="mr-1 size-3.5 text-sky-600 dark:text-sky-400" />
                                                            Modifier
                                                        </Button>
                                                        {resettingUserId ===
                                                        tu.id ? (
                                                            <div className="flex items-center gap-1">
                                                                <Input
                                                                    type="password"
                                                                    value={
                                                                        resetPasswordValue
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setResetPasswordValue(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    placeholder="Nouveau mot de passe"
                                                                    className="h-8 w-36 text-xs"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleResetUserPassword(
                                                                            tu.id,
                                                                        )
                                                                    }
                                                                >
                                                                    OK
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() =>
                                                                        setResettingUserId(
                                                                            null,
                                                                        )
                                                                    }
                                                                >
                                                                    ✕
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    setResettingUserId(
                                                                        tu.id,
                                                                    )
                                                                }
                                                            >
                                                                Réinitialiser
                                                                MDP
                                                            </Button>
                                                        )}
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                setUserToBlock(
                                                                    tu,
                                                                )
                                                            }
                                                        >
                                                            {tu.is_blocked ? (
                                                                <>
                                                                    <CheckCircle2 className="mr-1 size-3.5 text-emerald-600" />
                                                                    Débloquer
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Ban className="mr-1 size-3.5 text-amber-600" />
                                                                    Bloquer
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() =>
                                                                setUserToDelete(
                                                                    tu,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog
                open={userToEdit !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setUserToEdit(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="size-4 text-emerald-600" />
                            Modifier l&apos;utilisateur
                        </DialogTitle>
                        <DialogDescription>
                            Modifiez le nom et l&apos;adresse e-mail de cet
                            utilisateur dans la base{' '}
                            <code className="font-mono text-xs">
                                auth_users
                            </code>{' '}
                            de l&apos;application.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={handleUpdateTenantUser}
                        className="space-y-4"
                    >
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-tu-name">
                                Nom complet (optionnel)
                            </Label>
                            <Input
                                id="edit-tu-name"
                                value={editUserForm.data.name}
                                onChange={(e) =>
                                    editUserForm.setData('name', e.target.value)
                                }
                                placeholder="Ex: Alice Martin"
                            />
                            {editUserForm.errors.name && (
                                <p className="text-xs text-red-500">
                                    {editUserForm.errors.name}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-tu-email">
                                Adresse e-mail
                            </Label>
                            <Input
                                id="edit-tu-email"
                                type="email"
                                value={editUserForm.data.email}
                                onChange={(e) =>
                                    editUserForm.setData(
                                        'email',
                                        e.target.value,
                                    )
                                }
                                placeholder="utilisateur@app.com"
                                required
                            />
                            {editUserForm.errors.email && (
                                <p className="text-xs text-red-500">
                                    {editUserForm.errors.email}
                                </p>
                            )}
                        </div>
                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setUserToEdit(null)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                className="bg-emerald-600 text-white hover:bg-emerald-500"
                                disabled={editUserForm.processing}
                            >
                                {editUserForm.processing
                                    ? 'Enregistrement...'
                                    : 'Enregistrer'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmActionDialog
                open={userToBlock !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setUserToBlock(null);
                    }
                }}
                variant="warning"
                title={
                    userToBlock?.is_blocked
                        ? `Débloquer l'utilisateur « ${userToBlock.email} » ?`
                        : `Bloquer l'utilisateur « ${userToBlock?.email ?? ''} » ?`
                }
                description={
                    userToBlock?.is_blocked
                        ? "Cet utilisateur pourra à nouveau s'authentifier via le SDK sur cette application."
                        : 'Cet utilisateur ne pourra plus se connecter ni utiliser ses jetons de session sur cette application.'
                }
                confirmLabel={
                    userToBlock?.is_blocked
                        ? "Débloquer l'utilisateur"
                        : "Bloquer l'utilisateur"
                }
                onConfirm={() => {
                    if (!userToBlock) {
                        return;
                    }
                    router.patch(
                        `/dashboard/apps/${app.id}/users/${userToBlock.id}/toggle-block`,
                        {},
                        { preserveState: true, preserveScroll: true },
                    );
                }}
            />

            <ConfirmActionDialog
                open={userToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setUserToDelete(null);
                    }
                }}
                variant="destructive"
                title={`Supprimer l'utilisateur « ${userToDelete?.email ?? ''} » ?`}
                description="Ce compte sera définitivement supprimé de la table auth_users de l'application."
                warningNote="Toutes ses sessions actives seront révoquées immédiatement."
                confirmLabel="Supprimer l'utilisateur"
                onConfirm={() => {
                    if (!userToDelete) {
                        return;
                    }
                    router.delete(
                        `/dashboard/apps/${app.id}/users/${userToDelete.id}`,
                        { preserveState: true, preserveScroll: true },
                    );
                }}
            />
        </>
    );
}

ClientAppAuth.layout = {
    breadcrumbs: [
        {
            title: 'Mes Applications',
            href: dashboard(),
        },
        {
            title: 'Utilisateurs / Auth',
            href: '#',
        },
    ],
};
