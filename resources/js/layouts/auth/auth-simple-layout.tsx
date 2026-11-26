import { Link } from '@inertiajs/react';
import { Moon, Sun } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { useAppearance } from '@/hooks/use-appearance';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    return (
        <div className="flex h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-sidebar p-4 sm:p-6 md:p-10">
            <div className="relative max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-border/80 bg-background p-8 shadow-none sm:p-10 md:rounded-[1.75rem]">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-24 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/15"
                />

                <button
                    type="button"
                    onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
                    aria-label={
                        isDark
                            ? 'Passer en mode clair'
                            : 'Passer en mode sombre'
                    }
                    className="absolute top-5 right-5 z-10 inline-flex size-8 items-center justify-center rounded-lg border border-border/80 bg-card text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-foreground"
                >
                    {isDark ? (
                        <Sun className="size-4" aria-hidden="true" />
                    ) : (
                        <Moon className="size-4" aria-hidden="true" />
                    )}
                </button>

                <div className="relative z-10 flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2 font-medium"
                        >
                            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-[#081a14] text-emerald-500 ring-1 ring-emerald-500/25 ring-inset">
                                <AppLogoIcon className="size-6 text-emerald-500" />
                            </div>
                            <span className="text-sm font-bold tracking-tight">
                                Zenbase
                            </span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="text-xl font-semibold tracking-tight">
                                {title}
                            </h1>
                            <p className="text-center text-sm text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
