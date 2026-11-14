import { Form, Head, Link, usePage } from '@inertiajs/react';
import { CalendarClock, Infinity as InfinityIcon, Layers } from 'lucide-react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';
import { send } from '@/routes/verification';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profile"
                    description="Update your name and email address"
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>

                                <Input
                                    id="name"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Full name"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.name}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>

                                <Input
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder="Email address"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.email}
                                />
                            </div>

                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <div>
                                        <p className="-mt-4 text-sm text-muted-foreground">
                                            Your email address is unverified.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                            >
                                                Click here to re-send the
                                                verification email.
                                            </Link>
                                        </p>

                                        {status ===
                                            'verification-link-sent' && (
                                            <div className="mt-2 text-sm font-medium text-green-600">
                                                A new verification link has been
                                                sent to your email address.
                                            </div>
                                        )}
                                    </div>
                                )}

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            {!auth.user.is_admin && (
                <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
                    <Heading
                        variant="small"
                        title="Quota d'applications & Validité du compte Zenbase"
                        description="Informations définies par l'administrateur de la plateforme concernant votre compte développeur"
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg border bg-background p-4">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <Layers className="size-4 text-emerald-600" />
                                    Nombre maximal d&apos;applications
                                </span>
                                <Badge variant="secondary" className="font-mono text-xs">
                                    {auth.user.apps_count ?? 0} / {auth.user.max_apps ?? 1}
                                </Badge>
                            </div>
                            <p className="mt-2 font-mono text-lg font-bold">
                                {auth.user.max_apps ?? 1} application(s) max
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Vous utilisez actuellement {auth.user.apps_count ?? 0}{' '}
                                sur {auth.user.max_apps ?? 1} application(s) autorisée(s).
                            </p>
                        </div>

                        <div className="rounded-lg border bg-background p-4">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <CalendarClock className="size-4 text-amber-500" />
                                    Date d&apos;expiration du compte
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                >
                                    {auth.user.expires_at ? 'Planifiée' : 'Illimitée'}
                                </Badge>
                            </div>
                            <p className="mt-2 flex items-center gap-1.5 font-mono text-lg font-bold">
                                {auth.user.expires_at ? (
                                    new Date(auth.user.expires_at).toLocaleDateString(
                                        'fr-FR',
                                        {
                                            day: '2-digit',
                                            month: 'long',
                                            year: 'numeric',
                                        },
                                    )
                                ) : (
                                    <>
                                        <InfinityIcon className="size-5 text-emerald-600" />
                                        <span>Infini</span>
                                    </>
                                )}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {auth.user.expires_at
                                    ? "Contactez l'administrateur avant cette échéance pour prolonger votre accès."
                                    : "Votre compte ne possède aucune date limite d'expiration."}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
