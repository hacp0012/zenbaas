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
        <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-background">
            {/* Full-Viewport Showcase Background Layer */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                {/* Soft Emerald Ambient Glow */}
                <div className="absolute top-1/2 left-1/2 h-[420px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/15" />

                {/* Concentric Orbital Rings */}
                <div className="absolute top-1/2 left-1/2 size-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/65" />
                <div className="absolute top-1/2 left-1/2 size-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/45" />
                <div className="absolute top-1/2 left-1/2 size-[980px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/25" />
                <div className="absolute top-1/2 left-1/2 hidden size-[1260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/15 lg:block" />

                {/* Floating Feature Icons Framing the Centered Form */}
                <div className="absolute top-[16%] left-[8%] hidden size-11 items-center justify-center rounded-xl border border-border/80 bg-card/85 text-emerald-600 backdrop-blur-sm md:flex lg:left-[14%] dark:text-emerald-400">
                    <Database className="size-4" />
                </div>
                <div className="absolute top-[18%] right-[8%] hidden size-11 items-center justify-center rounded-xl border border-border/80 bg-card/85 text-indigo-600 backdrop-blur-sm md:flex lg:right-[14%] dark:text-indigo-400">
                    <Code2 className="size-4" />
                </div>
                <div className="absolute bottom-[18%] left-[10%] hidden size-11 items-center justify-center rounded-xl border border-border/80 bg-card/85 text-rose-600 backdrop-blur-sm md:flex lg:left-[16%] dark:text-rose-400">
                    <Bot className="size-4" />
                </div>
                <div className="absolute right-[10%] bottom-[16%] hidden size-11 items-center justify-center rounded-xl border border-border/80 bg-card/85 text-emerald-600 backdrop-blur-sm md:flex lg:right-[16%] dark:text-emerald-400">
                    <Zap className="size-4" />
                </div>
                <div className="absolute top-[50%] left-[6%] hidden size-10 -translate-y-1/2 items-center justify-center rounded-xl border border-border/75 bg-card/85 text-muted-foreground backdrop-blur-sm lg:flex xl:left-[10%]">
                    <Terminal className="size-4" />
                </div>
                <div className="absolute top-[50%] right-[6%] hidden size-10 -translate-y-1/2 items-center justify-center rounded-xl border border-border/75 bg-card/85 text-emerald-600 backdrop-blur-sm lg:flex xl:right-[10%] dark:text-emerald-400">
                    <ShieldCheck className="size-4" />
                </div>

                {/* Subtle Ambient Preview Chips on Wide Screens */}
                <div className="absolute bottom-[30%] left-[4%] hidden w-64 items-center gap-3 rounded-2xl border border-border/70 bg-card/75 p-3 opacity-80 backdrop-blur-md xl:flex">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        {isRegister ? 'DB' : 'ZB'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">
                            {isRegister
                                ? 'Base de données isolée'
                                : 'Fonction déployée'}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                            {isRegister
                                ? 'Collections et recherche rapide'
                                : 'Exécution isolée et sécurisée'}
                        </p>
                    </div>
                </div>

                <div className="absolute top-[30%] right-[4%] hidden w-64 items-center gap-3 rounded-2xl border border-border/70 bg-card/75 p-3 opacity-80 backdrop-blur-md xl:flex">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/12 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                        {isRegister ? 'AU' : 'AI'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">
                            {isRegister
                                ? 'Auth prête à l’emploi'
                                : 'Agents IA connectés'}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                            {isRegister
                                ? 'Comptes, OTP et sessions'
                                : 'Permissions granulaires MCP'}
                        </p>
                    </div>
                </div>
            </div>

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
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/80 bg-card/90 px-2.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:border-emerald-500/40 hover:text-foreground"
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
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-border/80 bg-card/90 text-muted-foreground backdrop-blur-sm transition-colors hover:border-emerald-500/40 hover:text-foreground"
                    >
                        {isDark ? (
                            <Sun className="size-4" aria-hidden="true" />
                        ) : (
                            <Moon className="size-4" aria-hidden="true" />
                        )}
                    </button>
                </div>
            </header>

            {/* Centered Auth Form Card */}
            <main className="relative z-10 flex min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
                <div className="mx-auto my-auto flex w-full max-w-[430px] flex-col gap-6 rounded-3xl border border-border/80 bg-background/90 p-7 shadow-sm backdrop-blur-md sm:p-9 dark:bg-card/85">
                    <div className="space-y-1.5 text-center">
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
        </div>
    );
}
