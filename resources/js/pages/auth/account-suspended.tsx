import { Head } from '@inertiajs/react';
import {
    AlertOctagon,
    CalendarClock,
    LogOut,
    Mail,
    ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { LogoutConfirmDialog } from '@/components/logout-confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

type AccountSuspendedProps = {
    email: string;
    name: string;
    isExpired: boolean;
    expiresAt: string | null;
};

export default function AccountSuspended({
    email,
    name,
    isExpired,
    expiresAt,
}: AccountSuspendedProps) {
    const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
    const formattedDate = expiresAt
        ? new Date(expiresAt).toLocaleString('fr-FR', {
              dateStyle: 'long',
              timeStyle: 'short',
          })
        : null;

    return (
        <>
            <Head title="Compte Suspendu — Zenbase BaaS" />
            <div className="flex h-svh flex-col items-center justify-center overflow-hidden bg-sidebar px-4 py-6">
                <div className="mb-6 flex shrink-0 items-center gap-2.5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-[#081a14] text-emerald-500 ring-1 ring-emerald-500/25 ring-inset">
                        <AppLogoIcon className="size-6 text-emerald-500" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">
                        Zenbase BaaS
                    </span>
                </div>

                <Card className="max-h-full w-full max-w-lg overflow-y-auto rounded-3xl border-red-500/40 bg-background shadow-none md:rounded-[1.75rem]">
                    <CardHeader className="space-y-3 text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-600 dark:text-red-400">
                            <AlertOctagon className="size-7" />
                        </div>
                        <div className="flex justify-center">
                            <Badge
                                variant="destructive"
                                className="px-3 py-0.5 text-xs"
                            >
                                {isExpired
                                    ? "Délai d'autorisation expiré"
                                    : 'Compte suspendu'}
                            </Badge>
                        </div>
                        <CardTitle className="text-xl font-bold">
                            Votre compte Zenbase a été suspendu
                        </CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                            Bonjour{' '}
                            <span className="font-semibold text-foreground">
                                {name}
                            </span>{' '}
                            (<span className="font-mono text-xs">{email}</span>
                            ), votre accès à la console développeur Zenbase est
                            actuellement restreint.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-5">
                        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-200">
                            <div className="flex items-start gap-3">
                                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
                                <div className="space-y-1.5">
                                    <p className="font-semibold">
                                        Motif de la suspension :
                                    </p>
                                    <p className="text-xs leading-relaxed">
                                        {isExpired
                                            ? "Votre compte a été suspendu car le délai d'expiration autorisé à utiliser la plateforme a expiré. Vous devez contacter l'administrateur pour prolonger votre accès."
                                            : "Votre compte a été suspendu car le délai d'expiration autorisé à utiliser la plateforme a expiré ou sur décision de l'administrateur. Vous devez contacter l'administrateur pour rétablir votre accès."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {formattedDate && (
                            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3.5 py-2.5 text-xs">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <CalendarClock className="size-4 text-amber-500" />
                                    Date d&apos;expiration enregistrée :
                                </span>
                                <span className="font-mono font-semibold text-foreground">
                                    {formattedDate}
                                </span>
                            </div>
                        )}

                        <div className="rounded-lg border bg-muted/30 p-3.5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2 font-semibold text-foreground">
                                <Mail className="size-4 text-emerald-600" />
                                Que faire maintenant ?
                            </div>
                            <p className="mt-1 leading-relaxed">
                                Contactez l&apos;administrateur de la plateforme
                                Zenbase en mentionnant votre adresse e-mail (
                                <code className="font-mono text-foreground">
                                    {email}
                                </code>
                                ) afin de demander le renouvellement de votre
                                période d&apos;utilisation ou la réactivation de
                                votre compte.
                            </p>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => setLogoutDialogOpen(true)}
                            >
                                <LogOut className="mr-2 size-4" />
                                Se déconnecter
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <LogoutConfirmDialog
                open={logoutDialogOpen}
                onOpenChange={setLogoutDialogOpen}
            />
        </>
    );
}
