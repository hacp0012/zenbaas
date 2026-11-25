import { Head, router } from "@inertiajs/react";
import {
    Activity,
    AlertTriangle,
    Copy,
    Cpu,
    Database,
    Eye,
    EyeOff,
    KeyRound,
    RefreshCw,
    Trash2,
    Users,
} from "lucide-react";
import { useState } from "react";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { PrismCodeBlock } from "@/components/prism-code-block";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { dashboard } from "@/routes";
import type { ZenbaseApp } from "@/types";

function formatBytes(bytes: number): string {
    if (bytes === 0) {
        return "0 B";
    }
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function ClientAppShow({
    app,
    apiBaseUrl,
}: {
    app: ZenbaseApp;
    apiBaseUrl: string;
}) {
    const [showSecretKey, setShowSecretKey] = useState(false);
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);
    const [confirmDeleteAppOpen, setConfirmDeleteAppOpen] = useState(false);

    function copyText(value: string) {
        void navigator.clipboard.writeText(value);
        setCopiedText(value);
        setTimeout(() => setCopiedText(null), 2000);
    }

    const sdkSnippet = `import { Zenbase } from '@zenbase/sdk';

const zb = new Zenbase({
  endpoint: '${apiBaseUrl.replace(/\/api\/v1$/, "")}',
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
            <Head title={`${app.name} — Vue d'ensemble & Clés API`} />
            <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                Appels API (SDK)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold">
                                    {app.api_calls_count.toLocaleString()}
                                </span>
                                <Activity className="size-5 text-emerald-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                Base SQLite Isolée
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold">
                                    {formatBytes(app.database_size_bytes)}
                                </span>
                                <Database className="size-5 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                Utilisateurs Inscrits
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold">
                                    {app.tenant_users_count ?? 0}
                                </span>
                                <Users className="size-5 text-amber-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                Fichiers & Functions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold">
                                    {app.files_count ?? app.files?.length ?? 0}{" "}
                                    /{" "}
                                    {app.functions_count ??
                                        app.functions?.length ??
                                        0}
                                </span>
                                <Cpu className="size-5 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <KeyRound className="size-4 text-emerald-600" />
                                        Clés d&apos;API de l&apos;Application
                                    </CardTitle>
                                    <CardDescription>
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
                                            ? "Copié !"
                                            : "Copier"}
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
                                                    ? "Copié !"
                                                    : "Copier"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-1 rounded bg-muted px-3 py-2 font-mono text-xs break-all">
                                    {showSecretKey
                                        ? app.secret_key
                                        : "zb_sec_••••••••••••••••••••••••••••••••••••••••"}
                                </div>
                                <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                    <span>
                                        <strong>Alerte de sécurité :</strong> Ne
                                        partagez jamais la clé{" "}
                                        <code className="font-mono">
                                            zb_sec_...
                                        </code>{" "}
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
                            <CardTitle className="text-base">
                                Intégration Rapide avec le SDK (@zenbase/sdk)
                            </CardTitle>
                            <CardDescription>
                                {/* Extrait TypeScript / Node.js affiché avec
                                PrismJS (Monokai + JetBrains Mono) */}
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

                {/* Danger Zone Card */}
                <Card className="border-red-500/30">
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                                    <AlertTriangle className="size-4" />
                                    Zone de Danger — Actions Irréversibles
                                </CardTitle>
                                <CardDescription>
                                    La suppression de cette application détruit
                                    immédiatement sa base SQLite isolée, ses
                                    fichiers et ses Web Functions.
                                </CardDescription>
                            </div>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => setConfirmDeleteAppOpen(true)}
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

            <ConfirmActionDialog
                open={confirmDeleteAppOpen}
                onOpenChange={setConfirmDeleteAppOpen}
                variant="destructive"
                title={`Supprimer définitivement « ${app.name} » ?`}
                description="Cette action est irréversible et détruira l'intégralité des données de l'application."
                warningNote={`Le fichier SQLite isolé (app_${app.id}.sqlite), les ${app.collections_count ?? 0} collection(s), les ${app.tenant_users_count ?? 0} utilisateur(s), les ${app.files_count ?? 0} fichier(s) et les ${app.functions_count ?? 0} fonction(s) PHP seront définitivement effacés.`}
                confirmLabel="Supprimer l'application"
                onConfirm={() => {
                    router.delete(`/dashboard/apps/${app.id}`);
                }}
            />
        </>
    );
}

ClientAppShow.layout = {
    breadcrumbs: [
        {
            title: "Mes Applications",
            href: dashboard(),
        },
        {
            title: "Vue d'ensemble & Clés API",
            href: "#",
        },
    ],
};
