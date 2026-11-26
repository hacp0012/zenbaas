import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Ban,
    Calendar,
    CalendarClock,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    HardDrive,
    Infinity as InfinityIcon,
    Layers,
    Pencil,
    RotateCcw,
    Search,
    Settings2,
    ShieldAlert,
    Trash2,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    index as indexAdminUsers,
    update as updateAdminUser,
} from '@/actions/App/Http/Controllers/Admin/AdminUserController';
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
    max_storage_mb: number | null;
    used_storage_bytes: number;
    expires_at: string | null;
    apps_count: number;
    total_api_calls: number;
    created_at: string | null;
};

type PaginatedUsers = {
    items: AdminUserRow[];
    total: number;
    page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
};

type UsersStats = {
    total: number;
    admins: number;
    active: number;
    suspended: number;
    expired: number;
};

type UsersFilters = {
    search: string;
    role: 'all' | 'client' | 'admin';
    status: 'all' | 'active' | 'suspended' | 'expired';
    sort: 'created_at' | 'name' | 'apps_count' | 'total_api_calls';
    direction: 'asc' | 'desc';
    per_page: number;
};

const STORAGE_PRESETS_MB = [
    { label: '50 Mo', value: 50 },
    { label: '100 Mo', value: 100 },
    { label: '500 Mo', value: 500 },
    { label: '1 Go', value: 1024 },
    { label: '5 Go', value: 5120 },
];

function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) {
        return '0 o';
    }
    const k = 1024;
    const sizes = ['o', 'Ko', 'Mo', 'Go'];
    const i = Math.min(
        Math.floor(Math.log(bytes) / Math.log(k)),
        sizes.length - 1,
    );

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatStorageLimitMb(mb: number | null): string {
    if (mb === null || mb === undefined) {
        return 'Illimité';
    }
    if (mb >= 1024 && mb % 1024 === 0) {
        return `${mb / 1024} Go`;
    }

    return `${mb} Mo`;
}

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

export default function AdminUsersIndex({
    users,
    stats,
    filters,
}: {
    users: PaginatedUsers;
    stats: UsersStats;
    filters: UsersFilters;
}) {
    const { auth } = usePage<{
        auth: Auth;
    }>().props;

    const [searchInput, setSearchInput] = useState(filters.search ?? '');
    const [roleFilter, setRoleFilter] = useState<UsersFilters['role']>(
        filters.role ?? 'all',
    );
    const [statusFilter, setStatusFilter] = useState<UsersFilters['status']>(
        filters.status ?? 'all',
    );
    const [sortField, setSortField] = useState<UsersFilters['sort']>(
        filters.sort ?? 'created_at',
    );
    const [sortDirection, setSortDirection] = useState<
        UsersFilters['direction']
    >(filters.direction ?? 'desc');
    const [perPage, setPerPage] = useState<number>(filters.per_page ?? 15);

    const hasActiveFilters =
        filters.search !== '' ||
        filters.role !== 'all' ||
        filters.status !== 'all' ||
        filters.sort !== 'created_at' ||
        filters.direction !== 'desc';

    function applyFilters(overrides: Partial<UsersFilters & { page?: number }>) {
        const nextQuery: Record<string, string | number> = {
            search: overrides.search ?? searchInput,
            role: overrides.role ?? roleFilter,
            status: overrides.status ?? statusFilter,
            sort: overrides.sort ?? sortField,
            direction: overrides.direction ?? sortDirection,
            per_page: overrides.per_page ?? perPage,
            page: overrides.page ?? 1,
        };

        if (nextQuery.search === '') {
            delete nextQuery.search;
        }
        if (nextQuery.role === 'all') {
            delete nextQuery.role;
        }
        if (nextQuery.status === 'all') {
            delete nextQuery.status;
        }
        if (nextQuery.page === 1) {
            delete nextQuery.page;
        }

        router.get(
            indexAdminUsers.url({ query: nextQuery }),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    function handleFilterSubmit(e: FormEvent) {
        e.preventDefault();
        applyFilters({ page: 1 });
    }

    function resetFilters() {
        setSearchInput('');
        setRoleFilter('all');
        setStatusFilter('all');
        setSortField('created_at');
        setSortDirection('desc');
        setPerPage(15);

        router.get(
            indexAdminUsers.url(),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    const [userToToggle, setUserToToggle] = useState<AdminUserRow | null>(null);
    const [userToDelete, setUserToDelete] = useState<AdminUserRow | null>(null);
    const [userToEditProfile, setUserToEditProfile] =
        useState<AdminUserRow | null>(null);
    const [userToEditQuota, setUserToEditQuota] = useState<AdminUserRow | null>(
        null,
    );
    const editProfileForm = useForm({
        name: '',
        email: '',
    });
    const [quotaMaxApps, setQuotaMaxApps] = useState<number>(1);
    const [quotaUnlimitedStorage, setQuotaUnlimitedStorage] =
        useState<boolean>(false);
    const [quotaMaxStorageMb, setQuotaMaxStorageMb] = useState<number>(100);
    const [quotaInfinite, setQuotaInfinite] = useState<boolean>(true);
    const [quotaExpiresAt, setQuotaExpiresAt] = useState<string>('');
    const [createInfinite, setCreateInfinite] = useState<boolean>(true);
    const [createUnlimitedStorage, setCreateUnlimitedStorage] =
        useState<boolean>(false);

    const form = useForm({
        name: '',
        email: '',
        password: '',
        is_admin: false,
        max_apps: 1,
        max_storage_mb: 100 as number | null,
        expires_at: '' as string,
    });

    function handleCreateUser(e: FormEvent) {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            max_apps: Number(data.max_apps) || 1,
            max_storage_mb: createUnlimitedStorage
                ? null
                : Math.max(1, Number(data.max_storage_mb) || 100),
            expires_at:
                createInfinite || !data.expires_at ? null : data.expires_at,
        }));
        form.post('/admin/users', {
            onSuccess: () => {
                form.reset();
                setCreateInfinite(true);
                setCreateUnlimitedStorage(false);
            },
        });
    }

    function openEditProfileModal(user: AdminUserRow) {
        setUserToEditProfile(user);
        editProfileForm.clearErrors();
        editProfileForm.setData({
            name: user.name,
            email: user.email,
        });
    }

    function handleSaveProfile(e: FormEvent) {
        e.preventDefault();
        if (!userToEditProfile) {
            return;
        }
        editProfileForm.submit(updateAdminUser(userToEditProfile.id), {
            preserveScroll: true,
            onSuccess: () => {
                setUserToEditProfile(null);
            },
        });
    }

    function openQuotaModal(user: AdminUserRow) {
        setUserToEditQuota(user);
        setQuotaMaxApps(user.max_apps ?? 1);
        if (user.max_storage_mb === null || user.max_storage_mb === undefined) {
            setQuotaUnlimitedStorage(true);
            setQuotaMaxStorageMb(100);
        } else {
            setQuotaUnlimitedStorage(false);
            setQuotaMaxStorageMb(user.max_storage_mb);
        }
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
                max_storage_mb: quotaUnlimitedStorage
                    ? null
                    : Math.max(1, Number(quotaMaxStorageMb) || 100),
                expires_at:
                    quotaInfinite || !quotaExpiresAt ? null : quotaExpiresAt,
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
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="size-5 text-amber-500" />
                            <span className="text-xs font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                                Administration Zenbase
                            </span>
                        </div>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight">
                            Gestion des Comptes Clients, Quotas &amp;
                            Expirations
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Créez un compte client, filtrez les utilisateurs,
                            définissez leurs quotas d&apos;applications, de
                            stockage et d&apos;expiration.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-lg bg-card px-3 py-1.5 font-medium shadow-xs">
                            Total :{' '}
                            <strong className="font-mono">{stats.total}</strong>
                        </span>
                        <span className="rounded-lg bg-emerald-500/10 px-3 py-1.5 font-medium text-emerald-700 dark:text-emerald-300">
                            Actifs :{' '}
                            <strong className="font-mono">
                                {stats.active}
                            </strong>
                        </span>
                        <span className="rounded-lg bg-red-500/10 px-3 py-1.5 font-medium text-red-700 dark:text-red-300">
                            Suspendus :{' '}
                            <strong className="font-mono">
                                {stats.suspended}
                            </strong>
                        </span>
                        <span className="rounded-lg bg-amber-500/10 px-3 py-1.5 font-medium text-amber-700 dark:text-amber-300">
                            Admins :{' '}
                            <strong className="font-mono">
                                {stats.admins}
                            </strong>
                        </span>
                    </div>
                </div>

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
                                    <div className="space-y-3 rounded-xl bg-muted/40 p-3.5">
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
                                                <Label
                                                    htmlFor="max_storage_mb"
                                                    className="text-xs"
                                                >
                                                    Stockage max (Mo)
                                                </Label>
                                                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            createUnlimitedStorage
                                                        }
                                                        onChange={(e) =>
                                                            setCreateUnlimitedStorage(
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                        className="size-3.5 rounded"
                                                    />
                                                    <span>Illimité</span>
                                                </label>
                                            </div>
                                            {!createUnlimitedStorage && (
                                                <Input
                                                    id="max_storage_mb"
                                                    type="number"
                                                    min={1}
                                                    max={1048576}
                                                    value={
                                                        form.data
                                                            .max_storage_mb ??
                                                        100
                                                    }
                                                    onChange={(e) =>
                                                        form.setData(
                                                            'max_storage_mb',
                                                            Math.max(
                                                                1,
                                                                Number(
                                                                    e.target
                                                                        .value,
                                                                ) || 1,
                                                            ),
                                                        )
                                                    }
                                                    className="h-8 font-mono text-xs"
                                                />
                                            )}
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
                                                                e.target
                                                                    .checked,
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
                        <CardHeader className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Users className="size-4" />
                                        Utilisateurs Inscrits ({users.total})
                                    </CardTitle>
                                    <CardDescription>
                                        Liste filtrable et paginée des
                                        développeurs, quotas et expirations
                                    </CardDescription>
                                </div>
                                {hasActiveFilters && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={resetFilters}
                                    >
                                        <RotateCcw className="mr-1.5 size-3.5" />
                                        Réinitialiser
                                    </Button>
                                )}
                            </div>

                            <form
                                onSubmit={handleFilterSubmit}
                                className="flex flex-wrap items-center gap-2"
                            >
                                <div className="relative min-w-[200px] flex-1">
                                    <Search className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
                                    <Input
                                        value={searchInput}
                                        onChange={(e) =>
                                            setSearchInput(e.target.value)
                                        }
                                        placeholder="Rechercher par nom ou e-mail..."
                                        className="h-9 pl-8 text-xs"
                                    />
                                </div>

                                <select
                                    value={roleFilter}
                                    onChange={(e) => {
                                        const next = e.target
                                            .value as UsersFilters['role'];
                                        setRoleFilter(next);
                                        applyFilters({ role: next, page: 1 });
                                    }}
                                    aria-label="Filtrer par rôle"
                                    className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                                >
                                    <option value="all">Tous les rôles</option>
                                    <option value="client">Clients</option>
                                    <option value="admin">Super-Admin</option>
                                </select>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => {
                                        const next = e.target
                                            .value as UsersFilters['status'];
                                        setStatusFilter(next);
                                        applyFilters({ status: next, page: 1 });
                                    }}
                                    aria-label="Filtrer par statut"
                                    className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                                >
                                    <option value="all">
                                        Tous les statuts
                                    </option>
                                    <option value="active">Actifs</option>
                                    <option value="suspended">Suspendus</option>
                                    <option value="expired">Expirés</option>
                                </select>

                                <select
                                    value={`${sortField}:${sortDirection}`}
                                    onChange={(e) => {
                                        const [s, d] = e.target.value.split(
                                            ':',
                                        ) as [
                                            UsersFilters['sort'],
                                            UsersFilters['direction'],
                                        ];
                                        setSortField(s);
                                        setSortDirection(d);
                                        applyFilters({
                                            sort: s,
                                            direction: d,
                                            page: 1,
                                        });
                                    }}
                                    aria-label="Trier les utilisateurs"
                                    className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                                >
                                    <option value="created_at:desc">
                                        Plus récents
                                    </option>
                                    <option value="created_at:asc">
                                        Plus anciens
                                    </option>
                                    <option value="name:asc">
                                        Nom (A → Z)
                                    </option>
                                    <option value="apps_count:desc">
                                        Apps (Décroissant)
                                    </option>
                                    <option value="total_api_calls:desc">
                                        Appels API (Décroissant)
                                    </option>
                                </select>

                                <select
                                    value={perPage}
                                    onChange={(e) => {
                                        const next = Number(e.target.value);
                                        setPerPage(next);
                                        applyFilters({
                                            per_page: next,
                                            page: 1,
                                        });
                                    }}
                                    aria-label="Utilisateurs par page"
                                    className="h-9 rounded-md border border-input bg-background px-2.5 font-mono text-xs"
                                >
                                    <option value={10}>10 / page</option>
                                    <option value={15}>15 / page</option>
                                    <option value={25}>25 / page</option>
                                    <option value={50}>50 / page</option>
                                </select>

                                <Button type="submit" size="sm">
                                    Filtrer
                                </Button>
                            </form>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {users.items.length === 0 ? (
                                <div className="rounded-xl bg-muted/40 py-12 text-center text-sm text-muted-foreground">
                                    Aucun utilisateur ne correspond aux critères
                                    sélectionnés.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-border/60 text-xs text-muted-foreground uppercase">
                                                <th className="pb-3 font-medium">
                                                    Utilisateur
                                                </th>
                                                <th className="pb-3 font-medium">
                                                    Statut &amp; Expiration
                                                </th>
                                                <th className="pb-3 font-medium">
                                                    Quota Apps / Appels
                                                </th>
                                                <th className="pb-3 text-right font-medium">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {users.items.map((user) => {
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
                                                        {user.created_at && (
                                                            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/80">
                                                                <Calendar className="size-3" />
                                                                <span>
                                                                    Créé le{' '}
                                                                    {new Date(
                                                                        user.created_at,
                                                                    ).toLocaleDateString(
                                                                        'fr-FR',
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
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
                                                                            Expire
                                                                            :{' '}
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
                                                            <div className="space-y-1">
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
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1 font-mono text-[11px]">
                                                                    <HardDrive className="size-3 text-amber-500" />
                                                                    <span>
                                                                        {formatBytes(
                                                                            user.used_storage_bytes ??
                                                                                0,
                                                                        )}{' '}
                                                                        /{' '}
                                                                        {formatStorageLimitMb(
                                                                            user.max_storage_mb,
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                {user.max_storage_mb !==
                                                                    null && (
                                                                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                                                                        <div
                                                                            className={`h-full rounded-full transition-all ${
                                                                                (user.used_storage_bytes ??
                                                                                    0) /
                                                                                    (user.max_storage_mb *
                                                                                        1024 *
                                                                                        1024) >=
                                                                                0.9
                                                                                    ? 'bg-red-500'
                                                                                    : 'bg-emerald-500'
                                                                            }`}
                                                                            style={{
                                                                                width: `${Math.min(100, Math.round(((user.used_storage_bytes ?? 0) / (user.max_storage_mb * 1024 * 1024)) * 100))}%`,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}
                                                                <div className="text-[11px] text-muted-foreground">
                                                                    {user.total_api_calls.toLocaleString()}{' '}
                                                                    appels API
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    openEditProfileModal(
                                                                        user,
                                                                    )
                                                                }
                                                                title="Modifier le nom et l'adresse e-mail"
                                                            >
                                                                <Pencil className="mr-1 size-3.5 text-sky-600 dark:text-sky-400" />
                                                                Modifier
                                                            </Button>
                                                            {isSelf ? (
                                                                <span className="px-1 text-xs text-muted-foreground">
                                                                    Vous-même
                                                                </span>
                                                            ) : (
                                                                <>
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
                                                                            Quota
                                                                            &amp;
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
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination Controls */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
                                <span>
                                    {users.total === 0 ? (
                                        '0 utilisateur'
                                    ) : (
                                        <>
                                            Affichage{' '}
                                            <strong className="font-mono text-foreground">
                                                {users.from ?? 1}–
                                                {users.to ?? users.items.length}
                                            </strong>{' '}
                                            sur{' '}
                                            <strong className="font-mono text-foreground">
                                                {users.total}
                                            </strong>{' '}
                                            utilisateur(s)
                                        </>
                                    )}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        disabled={users.page <= 1}
                                        onClick={() =>
                                            applyFilters({
                                                page: users.page - 1,
                                            })
                                        }
                                    >
                                        <ChevronLeft className="mr-1 size-3.5" />
                                        Précédent
                                    </Button>
                                    <span className="font-mono">
                                        Page {users.page} / {users.last_page}
                                    </span>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        disabled={users.page >= users.last_page}
                                        onClick={() =>
                                            applyFilters({
                                                page: users.page + 1,
                                            })
                                        }
                                    >
                                        Suivant
                                        <ChevronRight className="ml-1 size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* User Profile Edit Dialog */}
            <Dialog
                open={userToEditProfile !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setUserToEditProfile(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="size-4 text-emerald-600" />
                            Modifier le profil — {userToEditProfile?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Modifiez le nom complet et l&apos;adresse e-mail de
                            cet utilisateur.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-user-name">Nom complet</Label>
                            <Input
                                id="edit-user-name"
                                value={editProfileForm.data.name}
                                onChange={(e) =>
                                    editProfileForm.setData(
                                        'name',
                                        e.target.value,
                                    )
                                }
                                placeholder="Ex: Marie Curie"
                                required
                            />
                            {editProfileForm.errors.name && (
                                <p className="text-xs text-red-500">
                                    {editProfileForm.errors.name}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-user-email">
                                Adresse e-mail
                            </Label>
                            <Input
                                id="edit-user-email"
                                type="email"
                                value={editProfileForm.data.email}
                                onChange={(e) =>
                                    editProfileForm.setData(
                                        'email',
                                        e.target.value,
                                    )
                                }
                                placeholder="client@exemple.com"
                                required
                            />
                            {editProfileForm.errors.email && (
                                <p className="text-xs text-red-500">
                                    {editProfileForm.errors.email}
                                </p>
                            )}
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setUserToEditProfile(null)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={editProfileForm.processing}
                            >
                                {editProfileForm.processing
                                    ? 'Enregistrement...'
                                    : 'Enregistrer'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

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
                                        Math.max(
                                            1,
                                            Number(e.target.value) || 1,
                                        ),
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

                        <div className="space-y-2 rounded-xl bg-muted/40 p-3.5">
                            <div className="flex items-center justify-between">
                                <Label
                                    htmlFor="edit-max-storage-mb"
                                    className="text-xs font-semibold"
                                >
                                    Espace de stockage maximal (Mo)
                                </Label>
                                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                    <input
                                        type="checkbox"
                                        checked={quotaUnlimitedStorage}
                                        onChange={(e) =>
                                            setQuotaUnlimitedStorage(
                                                e.target.checked,
                                            )
                                        }
                                        className="size-3.5 rounded"
                                    />
                                    <span>Stockage illimité</span>
                                </label>
                            </div>

                            {quotaUnlimitedStorage ? (
                                <p className="text-xs text-muted-foreground">
                                    Aucune limite de stockage imposée à ce
                                    client. Actuellement utilisé :{' '}
                                    <span className="font-mono font-medium text-foreground">
                                        {formatBytes(
                                            userToEditQuota?.used_storage_bytes ??
                                                0,
                                        )}
                                    </span>
                                    .
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    <Input
                                        id="edit-max-storage-mb"
                                        type="number"
                                        min={1}
                                        max={1048576}
                                        value={quotaMaxStorageMb}
                                        onChange={(e) =>
                                            setQuotaMaxStorageMb(
                                                Math.max(
                                                    1,
                                                    Number(e.target.value) || 1,
                                                ),
                                            )
                                        }
                                        className="font-mono text-xs"
                                        required={!quotaUnlimitedStorage}
                                    />
                                    <div className="flex flex-wrap gap-1.5">
                                        {STORAGE_PRESETS_MB.map((preset) => (
                                            <button
                                                key={preset.value}
                                                type="button"
                                                onClick={() =>
                                                    setQuotaMaxStorageMb(
                                                        preset.value,
                                                    )
                                                }
                                                className={`rounded-md px-2 py-0.5 font-mono text-[11px] transition ${
                                                    quotaMaxStorageMb ===
                                                    preset.value
                                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                                        : 'bg-background hover:bg-muted'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Actuellement consommé :{' '}
                                        <span className="font-mono font-medium text-foreground">
                                            {formatBytes(
                                                userToEditQuota?.used_storage_bytes ??
                                                    0,
                                            )}
                                        </span>{' '}
                                        sur{' '}
                                        <span className="font-mono font-medium text-foreground">
                                            {formatStorageLimitMb(
                                                quotaMaxStorageMb,
                                            )}
                                        </span>{' '}
                                        (cumulé sur toutes ses applications).
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 rounded-xl bg-muted/40 p-3.5">
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
                            <Button type="submit">Enregistrer</Button>
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
