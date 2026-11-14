import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Code2,
    Cpu,
    Download,
    ExternalLink,
    FileUp,
    Play,
    Plus,
    SlidersHorizontal,
    TerminalSquare,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
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
import ClientAppLayout from '@/layouts/client-app-layout';
import type { ZenbaseApp, ZenbaseFunction } from '@/types';

export default function ClientAppFunctions({
    app,
    stubsContent,
    globalEnv = {},
}: {
    app: ZenbaseApp;
    stubsContent: string;
    globalEnv?: Record<string, string>;
}) {
    const functions = app.functions ?? [];
    const [showStubsModal, setShowStubsModal] = useState(false);
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
            <Head title={`${app.name} — Web Functions PHP`} />
            <div className="space-y-6">
                {/* Top Navigation & Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                            <Cpu className="size-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold">
                                Web Functions Serverless en PHP (Sandbox Isolé)
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Créez, éditez dans l&apos;IDE PHP dédié avec
                                suggestions, téléchargez ou importez des
                                fichiers{' '}
                                <code className="font-mono">.php</code> et gérez
                                vos variables d&apos;environnement.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/apps/${app.id}/functions/env`}>
                                <SlidersHorizontal className="mr-1.5 size-3.5 text-amber-500" />
                                Variables d&apos;Env (
                                {Object.keys(globalEnv).length})
                            </Link>
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setUploadModalOpen(true)}
                        >
                            <FileUp className="mr-1.5 size-3.5 text-emerald-600" />
                            Uploader un fichier .php
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowStubsModal(!showStubsModal)}
                        >
                            <Code2 className="mr-1.5 size-3.5" />
                            {showStubsModal ? 'Masquer Stubs' : 'Stubs IDE'}
                        </Button>
                        <Button
                            asChild
                            size="sm"
                            className="bg-emerald-600 text-white hover:bg-emerald-500"
                        >
                            <Link
                                href={`/dashboard/apps/${app.id}/functions/editor`}
                            >
                                <Plus className="mr-1.5 size-4" />
                                Ouvrir l&apos;Éditeur PHP (Nouvelle Fonction)
                            </Link>
                        </Button>
                    </div>
                </div>

                {showStubsModal && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-sm">
                                    Fichier d&apos;autocomplétion IDE :
                                    zenbase-stubs.php (PrismJS Monokai)
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Téléchargez ce fichier pour bénéficier aussi
                                    de l&apos;autocomplétion dans VS Code ou
                                    PhpStorm.
                                </CardDescription>
                            </div>
                            <Button asChild size="sm" variant="outline">
                                <a
                                    href="/dashboard/stubs/zenbase-stubs.php"
                                    download
                                >
                                    <Download className="mr-1.5 size-3.5" />
                                    Télécharger zenbase-stubs.php
                                </a>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <PrismCodeBlock
                                code={stubsContent}
                                language="php"
                                title="zenbase-stubs.php"
                                maxHeight="300px"
                            />
                        </CardContent>
                    </Card>
                )}

                {functions.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                            <TerminalSquare className="size-10 text-muted-foreground/60" />
                            <h3 className="mt-3 text-base font-semibold">
                                Aucune Web Function PHP déployée
                            </h3>
                            <p className="mt-1 max-w-md text-xs text-muted-foreground">
                                Ouvrez l&apos;éditeur PHP complet avec
                                autocomplétion ou importez directement un
                                fichier <code className="font-mono">.php</code>{' '}
                                depuis votre ordinateur.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Button
                                    asChild
                                    size="sm"
                                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                                >
                                    <Link
                                        href={`/dashboard/apps/${app.id}/functions/editor`}
                                    >
                                        <TerminalSquare className="mr-1.5 size-4" />
                                        Ouvrir l&apos;Éditeur PHP Complet
                                    </Link>
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setUploadModalOpen(true)}
                                >
                                    <FileUp className="mr-1.5 size-4" />
                                    Uploader un fichier .php
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {functions.map((fn) => {
                            const envCount = Object.keys(
                                fn.env_variables ?? {},
                            ).length;
                            const logsCount = fn.logs?.length ?? 0;
                            const lastLog = fn.logs?.[0] ?? null;

                            return (
                                <Card
                                    key={fn.id}
                                    className="flex flex-col justify-between transition hover:border-emerald-500/50"
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <CardTitle className="flex items-center gap-2 font-mono text-base">
                                                    <Link
                                                        href={`/dashboard/apps/${app.id}/functions/editor/${fn.id}`}
                                                        className="hover:text-emerald-600 hover:underline"
                                                    >
                                                        {fn.name}.php
                                                    </Link>
                                                </CardTitle>
                                                <CardDescription className="mt-1 text-xs">
                                                    {fn.description ||
                                                        'Fonction serverless PHP Zenbase'}
                                                </CardDescription>
                                            </div>
                                            <Badge
                                                variant={
                                                    fn.is_active
                                                        ? 'secondary'
                                                        : 'destructive'
                                                }
                                                className={
                                                    fn.is_active
                                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                        : ''
                                                }
                                            >
                                                {fn.is_active
                                                    ? 'Active'
                                                    : 'Désactivée'}
                                            </Badge>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        <div className="rounded-lg border bg-muted/30 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                                            POST /api/v1/functions/{fn.name}
                                            /invoke
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-[10px]"
                                            >
                                                {envCount} variable(s)
                                                d&apos;env locale(s)
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-[10px]"
                                            >
                                                {logsCount} exécution(s)
                                            </Badge>
                                            {lastLog && (
                                                <Badge
                                                    variant={
                                                        lastLog.error
                                                            ? 'destructive'
                                                            : 'secondary'
                                                    }
                                                    className="font-mono text-[10px]"
                                                >
                                                    Dernier statut : HTTP{' '}
                                                    {lastLog.status} (
                                                    {lastLog.duration_ms} ms)
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    className="bg-emerald-600 text-white hover:bg-emerald-500"
                                                >
                                                    <Link
                                                        href={`/dashboard/apps/${app.id}/functions/editor/${fn.id}`}
                                                    >
                                                        <TerminalSquare className="mr-1.5 size-3.5" />
                                                        Éditer dans l&apos;IDE
                                                        PHP
                                                    </Link>
                                                </Button>
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <a
                                                        href={`/dashboard/apps/${app.id}/functions/${fn.id}/download`}
                                                        download
                                                    >
                                                        <Download className="mr-1.5 size-3.5" />
                                                        Télécharger .php
                                                    </a>
                                                </Button>
                                            </div>

                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                className="size-8"
                                                onClick={() =>
                                                    setFunctionToDelete(fn)
                                                }
                                                title="Supprimer la fonction"
                                            >
                                                <Trash2 className="size-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal : Uploader un fichier .php */}
            <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Importer / Uploader un fichier de fonction PHP
                        </DialogTitle>
                        <DialogDescription>
                            Sélectionnez un fichier{' '}
                            <code className="font-mono">.php</code> contenant
                            votre closure{' '}
                            <code className="font-mono">
                                return function($event, $context) &#123; ... &#125;;
                            </code>
                            . Il sera automatiquement vérifié par le sandbox et
                            ouvert dans l&apos;IDE web.
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
                                className="bg-emerald-600 text-white hover:bg-emerald-500"
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
