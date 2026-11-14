import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Copy,
    Download,
    Eye,
    EyeOff,
    FileUp,
    KeyRound,
    Plus,
    Save,
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
import type { ZenbaseApp } from '@/types';

type EnvEntry = {
    key: string;
    value: string;
};

function recordToEntries(rec: Record<string, string> | null | undefined): EnvEntry[] {
    if (!rec) {
        return [];
    }

    return Object.entries(rec).map(([key, value]) => ({
        key,
        value: String(value ?? ''),
    }));
}

function entriesToRecord(entries: EnvEntry[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const item of entries) {
        const k = item.key.trim();
        if (k) {
            out[k] = item.value;
        }
    }

    return out;
}

export default function ClientAppFunctionEnv({
    app,
    globalEnv = {},
}: {
    app: ZenbaseApp;
    globalEnv?: Record<string, string>;
}) {
    const functions = app.functions ?? [];

    const [selectedScope, setSelectedScope] = useState<'global' | string>(
        'global',
    );
    const [entries, setEntries] = useState<EnvEntry[]>(() =>
        recordToEntries(globalEnv),
    );
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');
    const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>(
        {},
    );
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [rawDotEnvText, setRawDotEnvText] = useState('');
    const [confirmClearAllOpen, setConfirmClearAllOpen] = useState(false);

    function handleSelectScope(nextScope: 'global' | string) {
        setSelectedScope(nextScope);
        setRevealedKeys({});
        if (nextScope === 'global') {
            setEntries(recordToEntries(globalEnv));
        } else {
            const targetFn = functions.find((f) => f.id === nextScope);
            setEntries(recordToEntries(targetFn?.env_variables ?? {}));
        }
    }

    function handleAddEntry(e: FormEvent) {
        e.preventDefault();
        const cleanKey = newKey
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9_]/g, '_');
        if (!cleanKey) {
            return;
        }
        const updated = [
            ...entries.filter((item) => item.key !== cleanKey),
            { key: cleanKey, value: newValue },
        ];
        setEntries(updated);
        setNewKey('');
        setNewValue('');
        saveEntriesToBackend(updated);
    }

    function saveEntriesToBackend(targetEntries: EnvEntry[]) {
        router.put(
            `/dashboard/apps/${app.id}/functions-env`,
            {
                scope: selectedScope === 'global' ? 'global' : 'function',
                function_id: selectedScope === 'global' ? null : selectedScope,
                env_variables: entriesToRecord(targetEntries),
            },
            { preserveScroll: true },
        );
    }

    function handleRemoveEntry(keyToRemove: string) {
        const updated = entries.filter((item) => item.key !== keyToRemove);
        setEntries(updated);
        saveEntriesToBackend(updated);
    }

    function handleUpdateEntryValue(index: number, nextVal: string) {
        setEntries((prev) =>
            prev.map((item, i) =>
                i === index ? { ...item, value: nextVal } : item,
            ),
        );
    }

    function handleImportDotEnv(e: FormEvent) {
        e.preventDefault();
        const lines = rawDotEnvText.split(/\r?\n/);
        const merged = entriesToRecord(entries);

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1) {
                continue;
            }
            const k = trimmed
                .slice(0, eqIdx)
                .trim()
                .replace(/[^a-zA-Z0-9_]/g, '_');
            let v = trimmed.slice(eqIdx + 1).trim();
            if (
                (v.startsWith('"') && v.endsWith('"')) ||
                (v.startsWith("'") && v.endsWith("'"))
            ) {
                v = v.slice(1, -1);
            }
            if (k) {
                merged[k] = v;
            }
        }

        const nextEntries = recordToEntries(merged);
        setEntries(nextEntries);
        setRawDotEnvText('');
        setImportModalOpen(false);
        saveEntriesToBackend(nextEntries);
    }

    function handleExportDotEnv() {
        const content = entries
            .map((e) => `${e.key}="${e.value.replace(/"/g, '\\"')}"`)
            .join('\n');
        const blob = new Blob([content + '\n'], {
            type: 'text/plain;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download =
            selectedScope === 'global'
                ? `${app.name.toLowerCase().replace(/\s+/g, '-')}.env`
                : `function-${selectedScope.slice(0, 6)}.env`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function toggleReveal(key: string) {
        setRevealedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    function copyValue(key: string, val: string) {
        void navigator.clipboard.writeText(val);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    }

    const activeFunctionObj =
        selectedScope !== 'global'
            ? functions.find((f) => f.id === selectedScope) ?? null
            : null;

    const phpUsageExample =
        entries.length > 0
            ? `<?php\nreturn function($event, $context) {\n    // Lecture de vos variables d'environnement :\n${entries
                  .slice(0, 4)
                  .map(
                      (e) =>
                          `    $${e.key.toLowerCase()} = $context->env['${e.key}'] ?? null;`,
                  )
                  .join('\n')}\n};`
            : `<?php\nreturn function($event, $context) {\n    $apiKey = $context->env['STRIPE_SECRET_KEY'] ?? null;\n};`;

    return (
        <>
            <Head title={`${app.name} — Variables d'Environnement`} />
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-xs">
                    <div className="flex items-center gap-3">
                        <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/apps/${app.id}/functions`}>
                                <ArrowLeft className="mr-1.5 size-3.5" />
                                Web Functions
                            </Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal className="size-4 text-amber-500" />
                                <h2 className="text-base font-bold">
                                    Gestionnaire des Variables
                                    d&apos;Environnement (
                                    <code className="font-mono text-xs">
                                        $context-&gt;env
                                    </code>
                                    )
                                </h2>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Configurez des secrets globaux partagés entre
                                toutes vos Web Functions ou des variables
                                propres à chaque fonction PHP.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setImportModalOpen(true)}
                        >
                            <FileUp className="mr-1.5 size-3.5 text-emerald-600" />
                            Importer .env
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={entries.length === 0}
                            onClick={handleExportDotEnv}
                        >
                            <Download className="mr-1.5 size-3.5" />
                            Exporter .env
                        </Button>
                        <Button
                            asChild
                            size="sm"
                            className="bg-emerald-600 text-white hover:bg-emerald-500"
                        >
                            <Link
                                href={`/dashboard/apps/${app.id}/functions/editor`}
                            >
                                <TerminalSquare className="mr-1.5 size-3.5" />
                                Ouvrir l&apos;IDE PHP
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-12">
                    {/* Left Scope Selector */}
                    <Card className="lg:col-span-4">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">
                                Portée des Variables (Scope)
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Les variables d&apos;une fonction surchargent
                                les variables globales portant le même nom.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <button
                                type="button"
                                onClick={() => handleSelectScope('global')}
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-medium transition ${
                                    selectedScope === 'global'
                                        ? 'bg-emerald-600 text-white'
                                        : 'border hover:bg-muted'
                                }`}
                            >
                                <div>
                                    <div className="font-semibold">
                                        Variables Globales de l&apos;Application
                                    </div>
                                    <div
                                        className={`text-[11px] ${
                                            selectedScope === 'global'
                                                ? 'text-emerald-100'
                                                : 'text-muted-foreground'
                                        }`}
                                    >
                                        Disponibles dans toutes les Web
                                        Functions
                                    </div>
                                </div>
                                <Badge variant="secondary" className="font-mono">
                                    {Object.keys(globalEnv).length}
                                </Badge>
                            </button>

                            <div className="pt-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                Par Fonction PHP ({functions.length})
                            </div>

                            {functions.map((fn) => {
                                const isSelected = selectedScope === fn.id;
                                const count = Object.keys(
                                    fn.env_variables ?? {},
                                ).length;

                                return (
                                    <button
                                        key={fn.id}
                                        type="button"
                                        onClick={() => handleSelectScope(fn.id)}
                                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-mono text-xs transition ${
                                            isSelected
                                                ? 'bg-emerald-600 text-white'
                                                : 'hover:bg-muted'
                                        }`}
                                    >
                                        <span className="truncate">
                                            {fn.name}.php
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className="font-mono text-[10px]"
                                        >
                                            {count}
                                        </Badge>
                                    </button>
                                );
                            })}

                            <div className="pt-4">
                                <PrismCodeBlock
                                    code={phpUsageExample}
                                    language="php"
                                    title="Exemple d'accès dans votre fonction PHP"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right Variables Editor */}
                    <Card className="lg:col-span-8">
                        <CardHeader className="pb-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <KeyRound className="size-4 text-emerald-600" />
                                        {selectedScope === 'global'
                                            ? "Variables Globales de l'Application"
                                            : `Variables de la fonction « ${activeFunctionObj?.name ?? ''}.php »`}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Ajoutez, modifiez, masquez ou copiez vos
                                        clés secrètes et paramètres.
                                    </CardDescription>
                                </div>

                                <div className="flex gap-2">
                                    {entries.length > 0 && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="destructive"
                                            onClick={() =>
                                                setConfirmClearAllOpen(true)
                                            }
                                        >
                                            <Trash2 className="mr-1.5 size-3.5" />
                                            Tout vider
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="bg-emerald-600 text-white hover:bg-emerald-500"
                                        onClick={() =>
                                            saveEntriesToBackend(entries)
                                        }
                                    >
                                        <Save className="mr-1.5 size-3.5" />
                                        Enregistrer tout
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {/* Add Variable Form */}
                            <form
                                onSubmit={handleAddEntry}
                                className="grid gap-2 rounded-xl border bg-muted/30 p-3 sm:grid-cols-12"
                            >
                                <div className="sm:col-span-4">
                                    <Input
                                        value={newKey}
                                        onChange={(e) =>
                                            setNewKey(e.target.value)
                                        }
                                        placeholder="NOM_DE_LA_VARIABLE"
                                        className="h-8 font-mono text-xs uppercase"
                                        required
                                    />
                                </div>
                                <div className="sm:col-span-6">
                                    <Input
                                        value={newValue}
                                        onChange={(e) =>
                                            setNewValue(e.target.value)
                                        }
                                        placeholder="Valeur secrète (ex: sk_live_...)"
                                        className="h-8 font-mono text-xs"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <Button
                                        type="submit"
                                        size="sm"
                                        className="h-8 w-full bg-emerald-600 text-xs text-white hover:bg-emerald-500"
                                    >
                                        <Plus className="mr-1 size-3.5" />
                                        Ajouter
                                    </Button>
                                </div>
                            </form>

                            {/* Variables List */}
                            {entries.length === 0 ? (
                                <div className="rounded-xl border border-dashed py-12 text-center text-xs text-muted-foreground">
                                    Aucune variable d&apos;environnement définie
                                    dans cette portée.
                                </div>
                            ) : (
                                <div className="divide-y rounded-xl border">
                                    {entries.map((entry, idx) => {
                                        const isRevealed = Boolean(
                                            revealedKeys[entry.key],
                                        );

                                        return (
                                            <div
                                                key={entry.key}
                                                className="flex flex-wrap items-center gap-2 p-2.5 sm:flex-nowrap"
                                            >
                                                <div className="w-full font-mono text-xs font-semibold sm:w-52">
                                                    {entry.key}
                                                </div>

                                                <div className="flex-1">
                                                    <Input
                                                        type={
                                                            isRevealed
                                                                ? 'text'
                                                                : 'password'
                                                        }
                                                        value={entry.value}
                                                        onChange={(e) =>
                                                            handleUpdateEntryValue(
                                                                idx,
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="h-8 font-mono text-xs"
                                                    />
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-7"
                                                        onClick={() =>
                                                            toggleReveal(
                                                                entry.key,
                                                            )
                                                        }
                                                        title={
                                                            isRevealed
                                                                ? 'Masquer la valeur'
                                                                : 'Révéler la valeur'
                                                        }
                                                    >
                                                        {isRevealed ? (
                                                            <EyeOff className="size-3.5" />
                                                        ) : (
                                                            <Eye className="size-3.5" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-7"
                                                        onClick={() =>
                                                            copyValue(
                                                                entry.key,
                                                                entry.value,
                                                            )
                                                        }
                                                        title="Copier la valeur"
                                                    >
                                                        <Copy className="size-3.5" />
                                                    </Button>
                                                    {copiedKey ===
                                                        entry.key && (
                                                        <span className="text-[10px] text-emerald-600">
                                                            Copié
                                                        </span>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-7 text-red-500 hover:bg-red-500/10"
                                                        onClick={() =>
                                                            handleRemoveEntry(
                                                                entry.key,
                                                            )
                                                        }
                                                        title="Supprimer cette variable"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modal : Importer un bloc .env */}
            <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Importer des variables au format .env
                        </DialogTitle>
                        <DialogDescription>
                            Collez vos paires{' '}
                            <code className="font-mono">CLE=VALEUR</code>{' '}
                            ci-dessous. Elles seront fusionnées avec les
                            variables existantes.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleImportDotEnv} className="space-y-4">
                        <textarea
                            value={rawDotEnvText}
                            onChange={(e) => setRawDotEnvText(e.target.value)}
                            placeholder={
                                'STRIPE_SECRET_KEY=sk_live_123456\nWEBHOOK_URL=https://exemple.com/hook\nAPP_ENV=production'
                            }
                            rows={6}
                            className="w-full rounded-lg border bg-background p-3 font-mono text-xs"
                            required
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setImportModalOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                className="bg-emerald-600 text-white hover:bg-emerald-500"
                            >
                                Importer et enregistrer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmActionDialog
                open={confirmClearAllOpen}
                onOpenChange={setConfirmClearAllOpen}
                variant="destructive"
                title="Supprimer toutes les variables de cette portée ?"
                description="Toutes les variables d'environnement affichées dans cette portée seront supprimées."
                confirmLabel="Tout supprimer"
                onConfirm={() => {
                    setEntries([]);
                    saveEntriesToBackend([]);
                }}
            />
        </>
    );
}
