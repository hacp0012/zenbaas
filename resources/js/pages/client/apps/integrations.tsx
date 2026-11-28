import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    BookOpen,
    Check,
    Code2,
    Copy,
    Eye,
    EyeOff,
    Globe,
    KeyRound,
    RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { PrismCodeBlock } from '@/components/prism-code-block';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { getApiBaseUrl, getAppUrl } from '@/lib/app-url';
import { dashboard } from '@/routes';
import type { ZenbaseApp } from '@/types';

export default function ClientAppIntegrations({
    app,
    apiBaseUrl,
}: {
    app: ZenbaseApp;
    apiBaseUrl: string;
}) {
    const [showSecretKey, setShowSecretKey] = useState(false);
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);

    function copyText(value: string) {
        void navigator.clipboard.writeText(value);
        setCopiedText(value);
        setTimeout(() => setCopiedText(null), 2000);
    }

    const normalizedApiBase = getApiBaseUrl(apiBaseUrl);
    const normalizedEndpoint =
        normalizedApiBase.replace(/\/api\/v1$/, '') || getAppUrl();

    const sdkSnippet = `import { Zenbase } from '@zenbase/sdk';

const zb = new Zenbase({
  endpoint: '${normalizedEndpoint}',
  apiKey: '${app.public_key}',
});

// 1. Insérer et requêter des documents NoSQL
await zb.collection('products').create({
  name: 'Casque Bluetooth',
  price: 79.99,
  inStock: true,
});
const { data } = await zb.collection('products')
  .where('inStock', '==', true)
  .get();

// 2. Authentification utilisateur (Password ou OTP)
await zb.auth.signUp('client@exemple.com', 'secret123');

// 3. Uploader un fichier
const { fileUrl } = await zb.storage.upload('avatars/photo.png', file);`;

    return (
        <>
            <Head title={`${app.name} — Integrations`} />
            <div className="space-y-6">
                {/* Endpoint quick reference banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/30 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Globe className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                Passerelle API v1 de l&apos;application
                            </div>
                            <code className="block truncate font-mono text-xs text-foreground">
                                {apiBaseUrl}
                            </code>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => copyText(apiBaseUrl)}
                        >
                            {copiedText === apiBaseUrl ? (
                                <>
                                    <Check className="mr-1.5 size-3.5 text-emerald-600" />
                                    Copié !
                                </>
                            ) : (
                                <>
                                    <Copy className="mr-1.5 size-3.5" />
                                    Copier l&apos;endpoint
                                </>
                            )}
                        </Button>
                        <Button asChild size="sm" variant="outline">
                            <Link href="/docs?doc=sdks/js-ts/docs/getting-started.md">
                                <BookOpen className="mr-1.5 size-3.5" />
                                Guide SDK
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* API Keys & SDK Quickstart cards */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <KeyRound className="size-4 text-emerald-600" />
                                        Clés d&apos;API de l&apos;Application
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        Utilisez la clé publique dans votre
                                        frontend/mobile et la clé secrète
                                        uniquement côté serveur.
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        setConfirmRegenerateOpen(true)
                                    }
                                >
                                    <RefreshCw className="mr-1.5 size-3.5" />
                                    Régénérer
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-xl border p-3.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-emerald-600 uppercase">
                                        Clé Publique (Public / Anon Key)
                                    </span>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyText(app.public_key)}
                                    >
                                        <Copy className="mr-1.5 size-3.5" />
                                        {copiedText === app.public_key
                                            ? 'Copié !'
                                            : 'Copier'}
                                    </Button>
                                </div>
                                <div className="mt-1 rounded bg-muted px-3 py-2 font-mono text-xs break-all">
                                    {app.public_key}
                                </div>
                                <p className="mt-1.5 text-xs text-muted-foreground">
                                    Conçue pour le SDK dans le navigateur
                                    (React, Vue) ou mobile (Flutter). Soumise
                                    aux règles CORS de l&apos;application.
                                </p>
                            </div>

                            <div className="rounded-xl border border-amber-500/30 p-3.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-amber-600 uppercase">
                                        Clé Secrète / Service (Secret / Master
                                        Key)
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                setShowSecretKey(!showSecretKey)
                                            }
                                        >
                                            {showSecretKey ? (
                                                <EyeOff className="size-3.5" />
                                            ) : (
                                                <Eye className="size-3.5" />
                                            )}
                                        </Button>
                                        {app.secret_key && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    copyText(app.secret_key!)
                                                }
                                            >
                                                <Copy className="mr-1.5 size-3.5" />
                                                {copiedText === app.secret_key
                                                    ? 'Copié !'
                                                    : 'Copier'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-1 rounded bg-muted px-3 py-2 font-mono text-xs break-all">
                                    {showSecretKey
                                        ? app.secret_key
                                        : 'zb_sec_••••••••••••••••••••••••••••••••••••••••'}
                                </div>
                                <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                    <span>
                                        <strong>Alerte de sécurité :</strong> Ne
                                        partagez jamais la clé{' '}
                                        <code className="font-mono">
                                            zb_sec_...
                                        </code>{' '}
                                        dans une application frontend ou mobile.
                                        Elle contourne les restrictions CORS et
                                        accorde un accès complet.
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Code2 className="size-4 text-blue-600 dark:text-blue-400" />
                                Intégration Rapide avec le SDK (@zenbase/sdk)
                            </CardTitle>
                            <CardDescription>
                                Initialisez le client TypeScript / JavaScript
                                avec les identifiants de cette application.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PrismCodeBlock
                                code={sdkSnippet}
                                language="typescript"
                                title="sdk-quickstart.ts"
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ConfirmActionDialog
                open={confirmRegenerateOpen}
                onOpenChange={setConfirmRegenerateOpen}
                variant="warning"
                title="Régénérer les clés API de l'application ?"
                description="De nouvelles clés publique (zb_pub_...) et secrète (zb_sec_...) seront générées immédiatement."
                warningNote="Toutes les applications clientes ou serveurs utilisant actuellement les anciennes clés API recevront immédiatement une erreur 401 Unauthorized tant que vous n'aurez pas mis à jour leur configuration."
                confirmLabel="Régénérer les clés"
                onConfirm={() => {
                    router.post(
                        `/dashboard/apps/${app.id}/regenerate-keys`,
                        {},
                        { preserveScroll: true },
                    );
                }}
            />
        </>
    );
}

ClientAppIntegrations.layout = {
    breadcrumbs: [
        {
            title: 'Mes Applications',
            href: dashboard(),
        },
        {
            title: 'Integrations',
            href: '#',
        },
    ],
};
