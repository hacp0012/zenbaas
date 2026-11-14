import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Ban,
    CalendarClock,
    CheckCircle2,
    Infinity as InfinityIcon,
    Layers,
    Settings2,
    ShieldAlert,
    Trash2,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
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
import type { Auth } from '@/types';

type AdminUserRow = {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    is_suspended: boolean;
    is_expired: boolean;
    max_apps: number;
    expires_at: string | null;
    apps_count: number;
    total_api_calls: number;
    created_at: string | null;
};

function toDateTimeLocalValue(iso: string | null): string {
    if (!iso) {
        return '';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
        return '';
    }
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminUsersIndex({ users }: { users: AdminUserRow[] }) {
    const { auth, flash } = usePage<{
        auth: Auth;
        flash?: { success?: string; error?: string };
    }>().props;

    const [userToToggle, setUserToToggle] = useState<AdminUserRow | null>(null);
    const [userToDelete, setUserToDelete] = useState<AdminUserRow | null>(null);
    const [userToEditQuota, setUserToEditQuota] = useState<AdminUserRow | null>(
        null,
    );
    const [quotaMaxApps, setQuotaMaxApps] = useState<number>(1);
    const [quotaInfinite, setQuotaInfinite] = useState<boolean>(true);
    const [quotaExpiresAt, setQuotaExpiresAt] = useState<string>('');
    const [createInfinite, setCreateInfinite] = useState<boolean>(true);

    const form = useForm({
        name: '',
        email: '',
        password: '',
        is_admin: false,
        max_apps: 1,
        expires_at: '' as string,
    });

    function handleCreateUser(e: FormEvent) {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            max_apps: Number(data.max_apps) || 1,
            expires_at: createInfinite || !data.expires_at ? null : data.expires_at,
        }));
        form.post('/admin/users', {
            onSuccess: () => {
                form.reset();
                setCreateInfinite(true);
            },
        });
    }

    function openQuotaModal(user: AdminUserRow) {
        setUserToEditQuota(user);
        setQuotaMaxApps(user.max_apps ?? 1);
        if (user.expires_at) {
            setQuotaInfinite(false);
            setQuotaExpiresAt(toDateTimeLocalValue(user.expires_at));
        } else {
            setQuotaInfinite(true);
            setQuotaExpiresAt('');
        }
    }

    function handleSaveQuota(e: FormEvent) {
        e.preventDefault();
        if (!userToEditQuota) {
            return;
        }
        router.patch(
            `/admin/users/${userToEditQuota.id}/quota`,
            {
                max_apps: Math.max(1, Number(quotaMaxApps) || 1),
                expires_at: quotaInfinite || !quotaExpiresAt ? null : quotaExpiresAt,
            },
            {
                preserveScroll: true,
                onSuccess: () => setUserToEditQuota(null),
            },
        );
    }

    function confirmToggleStatus() {
        if (!userToToggle) {
            return;
        }
        router.patch(
            `/admin/users/${userToToggle.id}/toggle-status`,
            {},
            { preserveScroll: true },
        );
    }

    function confirmDeleteUser() {
        if (!userToDelete) {
            return;
        }
        router.delete(`/admin/users/${userToDelete.id}`, {
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title="Gestion des Clients — Administration Zenbase" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="size-5 text-amber-500" />
                        <span className="text-xs font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                            Administration Zenbase
                        </span>
                    </div>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">
                        Gestion des Comptes Clients, Quotas & Expirations
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Créez un compte client, définissez le nombre maximal
                        d&apos;applications (par défaut 1) et la date
                        d&apos;expiration/suspension automatique (par défaut à
                        l&apos;infini).
                    </p>
                </div>

                {flash?.success && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                        {flash.error}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Create Client Form */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <UserPlus className="size-4 text-emerald-600" />
                                Créer un Client Manuellement
                            </CardTitle>
                            <CardDescription>
                                Ajoutez un développeur avec son quota
                                d&apos;applications et sa durée de validité
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleCreateUser}
                                className="space-y-4"
                            >
                                <div className="space-y-1.5">
                                    <Label htmlFor="name">Nom complet</Label>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={(e) =>
                                            form.setData('name', e.target.value)
                                        }
                                        placeholder="Ex: Marie Curie"
                                        required
                                    />
                                    {form.errors.name && (
                                        <p className="text-xs text-red-500">
                                            {form.errors.name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="email">
                                        Adresse e-mail
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={form.data.email}
                                        onChange={(e) =>
                                            form.setData(
                                                'email',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="client@exemple.com"
                                        required
                                    />
                                    {form.errors.email && (
                                        <p className="text-xs text-red-500">
                                            {form.errors.email}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="password">
                                        Mot de passe initial
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={form.data.password}
                                        onChange={(e) =>
                                            form.setData(
                                                'password',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Minimum 8 caractères"
                                        required
                                    />
                                    {form.errors.password && (
                                        <p className="text-xs text-red-500">
                                            {form.errors.password}
                                        </p>
                                    )}
                                </div>

                                {!form.data.is_admin && (
                                    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor="max_apps"
                                                className="flex items-center justify-between text-xs"
                                            >
                                                <span>
                                                    Nombre max
                                                    d&apos;applications
                                                </span>
                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                    Défaut : 1
                                                </span>
                                            </Label>
                                            <Input
                                                id="max_apps"
                                                type="number"
                                                min={1}
                                                max={1000}
                                                value={form.data.max_apps}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'max_apps',
                                                        Math.max(
                                                            1,
                                                            Number(
                                                                e.target.value,
                                                            ) || 1,
                                                        ),
                                                    )
                                                }
                                                className="h-8 font-mono text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs">
                                                    Expiration du compte
                                                </Label>
                                                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                                    <input
                                                        type="checkbox"
                                                        checked={createInfinite}
                                                        onChange={(e) =>
                                                            setCreateInfinite(
                                                                e.target.checked,
                                                            )
                                                        }
                                                        className="size-3.5 rounded"
                                                    />
                                                    <span>
                                                        À l&apos;infini (défaut)
                                                    </span>
                                                </label>
                                            </div>
                                            {!createInfinite && (
                                                <Input
                                                    type="datetime-local"
                                                    value={form.data.expires_at}
                                                    onChange={(e) =>
                                                        form.setData(
                                                            'expires_at',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="h-8 font-mono text-xs"
                                                    required={!createInfinite}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        id="is_admin"
                                        type="checkbox"
                                        checked={form.data.is_admin}
                                        onChange={(e) =>
                                            form.setData(
                                                'is_admin',
                                                e.target.checked,
                                            )
                                        }
                                        className="size-4 rounded border-zinc-300"
                                    />
                                    <Label
                                        htmlFor="is_admin"
                                        className="text-xs font-normal"
                                    >
                                        Accorder les privilèges Super-Admin
                                    </Label>
                                </div>

                                {form.data.is_admin && (
                                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                        <span>
                                            Un compte Super-Admin supervise
                                            toute la plateforme Zenbase et ne
                                            crée pas d&apos;applications
                                            clientes.
                                        </span>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={form.processing}
                                >
                                    {form.processing
                                        ? 'Création...'
                                        : 'Créer le compte'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Users Table */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="size-4" />
                                Utilisateurs Inscrits ({users.length})
                            </CardTitle>
                            <CardDescription>
                                Liste complète des développeurs, quotas
                                d&apos;applications et dates d&apos;expiration
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b text-xs text-muted-foreground uppercase">
                                            <th className="pb-3 font-medium">
                                                Utilisateur
                                            </th>
                                            <th className="pb-3 font-medium">
                                                Statut & Expiration
                                            </th>
                                            <th className="pb-3 font-medium">
                                                Quota Apps / Appels
                                            </th>
                                            <th className="pb-3 text-right font-medium">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {users.map((user) => {
                                            const isSelf =
                                                auth.user.id === user.id;

                                            return (
                                                <tr
                                                    key={user.id}
                                                    className="hover:bg-muted/40"
                                                >
                                                    <td className="py-3">
                                                        <div className="flex items-center gap-2 font-semibold">
                                                            <span>
                                                                {user.name}
                                                            </span>
                                                            {user.is_admin ? (
                                                                <Badge className="bg-amber-500/15 text-[10px] text-amber-700 dark:text-amber-300">
                                                                    Super-Admin
                                                                </Badge>
                                                            ) : (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="text-[10px]"
                                                                >
                                                                    Client
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {user.email}
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <div className="flex flex-col gap-1">
                                                            <div>
                                                                {user.is_suspended ? (
                                                                    <Badge variant="destructive">
                                                                        {user.is_expired
                                                                            ? 'Suspendu (Expiré)'
                                                                            : 'Suspendu'}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                                                        Actif
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {!user.is_admin && (
                                                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                                    <CalendarClock className="size-3" />
                                                                    {user.expires_at ? (
                                                                        <span className="font-mono">
                                                                            Expire :{' '}
                                                                            {new Date(
                                                                                user.expires_at,
                                                                            ).toLocaleDateString(
                                                                                'fr-FR',
                                                                            )}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                                            <InfinityIcon className="size-3" />
                                                                            Infini
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-xs">
                                                        {user.is_admin ? (
                                                            <span className="text-muted-foreground">
                                                                Supervision
                                                                globale
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-1 font-mono font-medium">
                                                                    <Layers className="size-3.5 text-emerald-600" />
                                                                    <span>
                                                                        {
                                                                            user.apps_count
                                                                        }{' '}
                                                                        /{' '}
                                                                        {user.max_apps ??
                                                                            1}{' '}
                                                                        app(s)
                                                                        max
                                                                    </span>
                                                                </div>
                                                                <div className="text-muted-foreground">
                                                                    {user.total_api_calls.toLocaleString()}{' '}
                                                                    appels API
                                                                </div>
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        {isSelf ? (
                                                            <span className="text-xs text-muted-foreground">
                                                                Vous-même
                                                            </span>
                                                        ) : (
                                                            <div className="flex justify-end gap-1.5">
                                                                {!user.is_admin && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() =>
                                                                            openQuotaModal(
                                                                                user,
                                                                            )
                                                                        }
                                                                        title="Configurer quota d'apps et date d'expiration"
                                                                    >
                                                                        <Settings2 className="mr-1 size-3.5 text-emerald-600" />
                                                                        Quota &
                                                                        Expiration
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        setUserToToggle(
                                                                            user,
                                                                        )
                                                                    }
                                                                >
                                                                    {user.is_suspended ? (
                                                                        <>
                                                                            <CheckCircle2 className="mr-1 size-3.5 text-emerald-600" />
                                                                            Réactiver
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Ban className="mr-1 size-3.5 text-amber-600" />
                                                                            Suspendre
                                                                        </>
                                                                    )}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() =>
                                                                        setUserToDelete(
                                                                            user,
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="size-3.5" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Quota & Expiration Edit Dialog */}
            <Dialog
                open={userToEditQuota !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setUserToEditQuota(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Quotas & Expiration — {userToEditQuota?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Définissez le nombre maximal d&apos;applications que{' '}
                            <span className="font-mono">
                                {userToEditQuota?.email}
                            </span>{' '}
                            peut créer ainsi que la date d&apos;expiration du
                            compte.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveQuota} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-max-apps">
                                Nombre maximal d&apos;applications autorisées
                            </Label>
                            <Input
                                id="edit-max-apps"
                                type="number"
                                min={1}
                                max={1000}
                                value={quotaMaxApps}
                                onChange={(e) =>
                                    setQuotaMaxApps(
                                        Math.max(1, Number(e.target.value) || 1),
                                    )
                                }
                                className="font-mono"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Actuellement :{' '}
                                {userToEditQuota?.apps_count ?? 0}{' '}
                                application(s) créée(s). Par défaut : 1.
                            </p>
                        </div>

                        <div className="space-y-2 rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">
                                    Date de suspension / expiration automatique
                                </Label>
                                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                    <input
                                        type="checkbox"
                                        checked={quotaInfinite}
                                        onChange={(e) =>
                                            setQuotaInfinite(e.target.checked)
                                        }
                                        className="size-3.5 rounded"
                                    />
                                    <span>Défini à l&apos;infini</span>
                                </label>
                            </div>

                            {quotaInfinite ? (
                                <p className="text-xs text-muted-foreground">
                                    Ce compte n&apos;expirera jamais
                                    automatiquement (validité illimitée).
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    <Input
                                        type="datetime-local"
                                        value={quotaExpiresAt}
                                        onChange={(e) =>
                                            setQuotaExpiresAt(e.target.value)
                                        }
                                        className="font-mono text-xs"
                                        required={!quotaInfinite}
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Une fois cette date dépassée, le client
                                        sera redirigé vers la page de compte
                                        suspendu lors de sa connexion.
                                    </p>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setUserToEditQuota(null)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                className="bg-emerald-600 text-white hover:bg-emerald-500"
                            >
                                Enregistrer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmActionDialog
                open={userToToggle !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setUserToToggle(null);
                    }
                }}
                variant="warning"
                title={
                    userToToggle?.is_suspended
                        ? `Réactiver le compte de « ${userToToggle.name} » ?`
                        : `Suspendre le compte de « ${userToToggle?.name ?? ''} » ?`
                }
                description={
                    userToToggle?.is_suspended
                        ? 'Ce développeur retrouvera immédiatement accès à sa console Zenbase et à la gestion de ses applications.'
                        : 'Ce développeur ne pourra plus accéder à sa console Zenbase tant que son compte sera suspendu.'
                }
                warningNote={
                    userToToggle?.is_suspended
                        ? undefined
                        : `Lorsqu'il tentera de se connecter, ${userToToggle?.email ?? ''} sera redirigé vers la page d'information de suspension.`
                }
                confirmLabel={
                    userToToggle?.is_suspended
                        ? 'Réactiver le compte'
                        : 'Suspendre le compte'
                }
                onConfirm={confirmToggleStatus}
            />

            <ConfirmActionDialog
                open={userToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setUserToDelete(null);
                    }
                }}
                variant="destructive"
                title={`Supprimer définitivement « ${userToDelete?.name ?? ''} » ?`}
                description="Cette action est irréversible et supprimera le compte client de la base centrale Zenbase."
                warningNote={`Toutes les applications (${userToDelete?.apps_count ?? 0}), bases SQLite isolées, collections NoSQL, fichiers stockés et Web Functions appartenant à ${userToDelete?.email ?? ''} seront définitivement détruits.`}
                confirmLabel="Supprimer définitivement"
                onConfirm={confirmDeleteUser}
            />
        </>
    );
}

AdminUsersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Administration Globale',
            href: '/admin/dashboard',
        },
        {
            title: 'Gestion des Clients',
            href: '/admin/users',
        },
    ],
};
