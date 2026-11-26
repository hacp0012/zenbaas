import { Link } from '@inertiajs/react';
import {
    BookOpen,
    Bot,
    Code2,
    Database,
    Moon,
    ShieldCheck,
    Sun,
    Terminal,
    Zap,
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { useAppearance } from '@/hooks/use-appearance';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
    mode = 'login',
}: AuthLayoutProps) {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';
    const isRegister = mode === 'register';

    return (
        <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
            {/* Unified Top Bar */}
            <header className="relative z-20 flex shrink-0 items-center justify-between px-6 pt-5 sm:px-10 sm:pt-6">
                <Link
                    href={home()}
                    className="inline-flex items-center gap-2.5 font-bold tracking-tight text-foreground"
                >
                    <div className="flex size-8 items-center justify-center rounded-lg bg-[#081a14] text-emerald-500 ring-1 ring-emerald-500/25 ring-inset">
                        <AppLogoIcon className="size-5 text-emerald-500" />
                    </div>
                    <span className="text-base">Zenbase</span>
                </Link>

                <div className="flex items-center gap-2">
                    <Link
                        href="/docs"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-foreground"
                    >
                        <BookOpen className="size-3.5" />
                        <span>Docs</span>
                    </Link>
                    <button
                        type="button"
                        onClick={() =>
                            updateAppearance(isDark ? 'light' : 'dark')
                        }
                        aria-label={
                            isDark
                                ? 'Passer en mode clair'
                                : 'Passer en mode sombre'
                        }
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-border/80 bg-card text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-foreground"
                    >
                        {isDark ? (
                            <Sun className="size-4" aria-hidden="true" />
                        ) : (
                            <Moon className="size-4" aria-hidden="true" />
                        )}
                    </button>
                </div>
            </header>

            {/* Seamless Single-Background Two-Column Content */}
            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
                {/* Left Column (Primary): Form & Input Fields */}
                <main className="flex h-full min-h-0 w-full overflow-y-auto px-6 py-8 sm:px-10">
                    <div className="mx-auto my-auto flex w-full max-w-[390px] flex-col gap-6">
                        <div className="space-y-1.5">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                {title}
                            </h1>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {description}
                            </p>
                        </div>

                        {children}
                    </div>
                </main>

                {/* Right Column (Secondary): Landing-Inspired Showcase on Same Background */}
                <aside className="relative hidden h-full flex-col items-center justify-center overflow-hidden p-10 lg:flex xl:p-12">
                    {/* Concentric Orbital Rings & Floating Icons */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 overflow-hidden"
                    >
                        <div className="absolute top-1/2 left-1/2 size-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/65" />
                        <div className="absolute top-1/2 left-1/2 size-[580px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/40" />
                        <div className="absolute top-1/2 left-1/2 size-[780px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/20" />

                        <div className="absolute top-[12%] left-[10%] flex size-10 items-center justify-center rounded-xl border border-border/80 bg-card text-emerald-600 dark:text-emerald-400">
                            <Database className="size-4" />
                        </div>
                        <div className="absolute top-[18%] right-[11%] flex size-10 items-center justify-center rounded-xl border border-border/80 bg-card text-indigo-600 dark:text-indigo-400">
                            <Code2 className="size-4" />
                        </div>
                        <div className="absolute bottom-[20%] left-[9%] flex size-10 items-center justify-center rounded-xl border border-border/80 bg-card text-rose-600 dark:text-rose-400">
                            <Bot className="size-4" />
                        </div>
                        <div className="absolute right-[10%] bottom-[16%] flex size-10 items-center justify-center rounded-xl border border-border/80 bg-card text-emerald-600 dark:text-emerald-400">
                            <Zap className="size-4" />
                        </div>
                        <div className="absolute top-[50%] left-[5%] hidden size-9 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground xl:flex">
                            <Terminal className="size-4" />
                        </div>
                        <div className="absolute top-[48%] right-[5%] hidden size-9 items-center justify-center rounded-xl border border-border/70 bg-card text-emerald-600 dark:text-emerald-400 xl:flex">
                            <ShieldCheck className="size-4" />
                        </div>
                    </div>

                    {/* Center Hero Copy & Stacked Activity Preview */}
                    <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center text-center">
                        <h2 className="text-3xl leading-[1.15] font-bold tracking-tight text-balance text-foreground xl:text-[2.15rem]">
                            {isRegister ? (
                                <>
                                    Lancez votre backend en secondes,{' '}
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                        pas en semaines.
                                    </span>
                                </>
                            ) : (
                                <>
                                    Pilotez vos projets backend,{' '}
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                        en un instant.
                                    </span>
                                </>
                            )}
                        </h2>

                        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                            {isRegister
                                ? 'Base de données isolée, authentification, stockage de fichiers et fonctions serverless prêts dès le premier clic.'
                                : 'Retrouvez vos bases de données, vos utilisateurs, vos fichiers et vos fonctions dans une console unifiée.'}
                        </p>

                        {/* Stacked Activity Preview with Soft Emerald Glow */}
                        <div className="relative mt-8 w-full max-w-sm pt-2 pb-4">
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-4 top-4 bottom-0 rounded-full bg-emerald-400/25 blur-3xl dark:bg-emerald-500/20"
                            />

                            <div className="relative flex flex-col items-center">
                                {isRegister ? (
                                    <>
                                        <div className="relative z-30 flex w-full items-center gap-3 rounded-2xl border border-border/80 bg-card p-3.5 text-left">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                                DB
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium text-foreground">
                                                    Base de données isolée par
                                                    projet
                                                </p>
                                                <p className="truncate text-[11px] text-muted-foreground">
                                                    Collections flexibles et
                                                    recherche rapide
                                                </p>
                                            </div>
                                            <span className="shrink-0 rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                                Inclus
                                            </span>
                                        </div>

                                        <div className="relative z-20 -mt-2 flex w-[92%] items-center gap-3 rounded-2xl border border-border/80 bg-card p-3 text-left">
                                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/12 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                                                AU
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium text-foreground">
                                                    Authentification prête à
                                                    l&apos;emploi
                                                </p>
                                                <p className="truncate text-[11px] text-muted-foreground">
                                                    Comptes, codes OTP et
                                                    gestion des sessions
                                                </p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 -mt-2 flex w-[84%] items-center gap-2.5 rounded-2xl border border-border/75 bg-muted/70 p-2.5 text-left">
                                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-500/12 text-rose-600 dark:text-rose-300">
                                                <Zap className="size-3.5" />
                                            </div>
                                            <p className="truncate text-[11px] font-medium text-muted-foreground">
                                                Stockage sécurisé et fonctions
                                                serverless
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="relative z-30 flex w-full items-center gap-3 rounded-2xl border border-border/80 bg-card p-3.5 text-left">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                                ZB
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium text-foreground">
                                                    Fonction déployée avec
                                                    succès
                                                </p>
                                                <p className="truncate text-[11px] text-muted-foreground">
                                                    Exécution isolée et
                                                    sécurisée
                                                </p>
                                            </div>
                                            <span className="shrink-0 rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                                Actif
                                            </span>
                                        </div>

                                        <div className="relative z-20 -mt-2 flex w-[92%] items-center gap-3 rounded-2xl border border-border/80 bg-card p-3 text-left">
                                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/12 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                                                AI
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium text-foreground">
                                                    Agents IA connectés
                                                </p>
                                                <p className="truncate text-[11px] text-muted-foreground">
                                                    Permissions granulaires par
                                                    application
                                                </p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 -mt-2 flex w-[84%] items-center gap-2.5 rounded-2xl border border-border/75 bg-muted/70 p-2.5 text-left">
                                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-500/12 text-rose-600 dark:text-rose-300">
                                                <Database className="size-3.5" />
                                            </div>
                                            <p className="truncate text-[11px] font-medium text-muted-foreground">
                                                Données et utilisateurs
                                                synchronisés
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
