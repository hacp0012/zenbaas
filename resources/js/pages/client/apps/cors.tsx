import { Head, router, useForm } from '@inertiajs/react';
import { AlertTriangle, Globe, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
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
import type { ZenbaseApp, ZenbaseCorsOrigin } from '@/types';

export default function ClientAppCors({ app }: { app: ZenbaseApp }) {
    const corsForm = useForm({ origin: '' });
    const [corsToDelete, setCorsToDelete] = useState<ZenbaseCorsOrigin | null>(
        null,
    );

    function handleAddCors(e: FormEvent) {
        e.preventDefault();
        corsForm.post(`/dashboard/apps/${app.id}/cors`, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => corsForm.reset(),
        });
    }

    return (
        <>
            <Head title={`${app.name} — Origines CORS`} />
            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ShieldCheck className="size-4 text-emerald-600" />
                            Ajouter une Origine CORS
                        </CardTitle>
                        <CardDescription>
                            Autorisez les domaines frontends à appeler
                            l&apos;API de cette application avec la clé
                            publique.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddCors} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="cors-origin">
                                    Origine (URL ou *)
                                </Label>
                                <Input
                                    id="cors-origin"
                                    value={corsForm.data.origin}
                                    onChange={(e) =>
                                        corsForm.setData(
                                            'origin',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="https://mon-site-client.com ou *"
                                    required
                                />
                                {corsForm.errors.origin && (
                                    <p className="text-xs text-red-500">
                                        {corsForm.errors.origin}
                                    </p>
                                )}
                            </div>

                            {corsForm.data.origin.trim() === '*' && (
                                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                    <span>
                                        Autoriser <code>*</code> permet à
                                        n&apos;importe quel domaine web
                                        d&apos;interroger votre API publique. En
                                        production, privilégiez vos domaines
                                        exacts.
                                    </span>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={corsForm.processing}
                            >
                                Autoriser ce domaine
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base">
                            Domaines Autorisés (
                            {app.cors_origins?.length ?? 0})
                        </CardTitle>
                        <CardDescription>
                            Vérifiés à la volée par le middleware{' '}
                            <code className="font-mono text-xs">
                                DynamicCors
                            </code>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!app.cors_origins || app.cors_origins.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                Aucune restriction CORS spécifique enregistrée
                                (toutes les origines sont acceptées par défaut
                                tant qu&apos;aucune règle restrictive n&apos;est
                                définie).
                            </p>
                        ) : (
                            <div className="divide-y">
                                {app.cors_origins.map((cors) => (
                                    <div
                                        key={cors.id}
                                        className="flex items-center justify-between py-3"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Globe className="size-4 text-emerald-600" />
                                            <span className="font-mono text-sm font-medium">
                                                {cors.origin}
                                            </span>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="destructive"
                                            onClick={() =>
                                                setCorsToDelete(cors)
                                            }
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ConfirmActionDialog
                open={corsToDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setCorsToDelete(null);
                    }
                }}
                variant="destructive"
                title={`Retirer l'origine CORS « ${corsToDelete?.origin ?? ''} » ?`}
                description="Ce domaine ne sera plus dans la liste blanche CORS de l'application."
                warningNote="Les requêtes navigateur provenant de ce domaine seront bloquées par la politique CORS s'il reste d'autres origines restrictives actives."
                confirmLabel="Retirer le domaine"
                onConfirm={() => {
                    if (!corsToDelete) {
                        return;
                    }
                    router.delete(
                        `/dashboard/apps/${app.id}/cors/${corsToDelete.id}`,
                        { preserveState: true, preserveScroll: true },
                    );
                }}
            />
        </>
    );
}

ClientAppCors.layout = {
    breadcrumbs: [
        {
            title: 'Mes Applications',
            href: dashboard(),
        },
        {
            title: 'Origines CORS',
            href: '#',
        },
    ],
};
