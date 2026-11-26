import { Link } from '@inertiajs/react';
import { BookOpen, Home, Monitor, Tablet } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { home } from '@/routes';

export function DesktopTabletGate({ children }: PropsWithChildren) {
    return (
        <>
            {/* Mobile blocker (< 768px) */}
            <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-background px-6 py-12 text-center md:hidden">
                <div className="w-full max-w-sm space-y-6 rounded-2xl bg-card p-8 shadow-sm">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#081a14] text-emerald-500 ring-1 ring-emerald-500/25 ring-inset">
                        <AppLogoIcon className="size-7 text-emerald-500" />
                    </div>

                    <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
                        <Tablet className="size-3.5" />
                        <span>Tablette &amp; Desktop uniquement</span>
                        <Monitor className="size-3.5" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-lg font-bold tracking-tight text-foreground">
                            Écran plus large requis
                        </h1>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            Les interfaces Client et Administration de Zenbase
                            sont conçues pour les tablettes et les ordinateurs
                            de bureau (largeur minimale de{' '}
                            <span className="font-mono font-medium text-foreground">
                                768px
                            </span>
                            ). Veuillez ouvrir cette console sur un écran plus
                            large.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2.5 pt-2">
                        <Button asChild className="w-full">
                            <Link href={home()}>
                                <Home className="mr-1.5 size-4" />
                                Retour à l&apos;accueil
                            </Link>
                        </Button>
                        <Button asChild variant="secondary" className="w-full">
                            <Link href="/docs">
                                <BookOpen className="mr-1.5 size-4" />
                                Consulter la documentation
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tablet & Desktop workspace (>= 768px) */}
            <div className="hidden min-h-svh w-full md:block">{children}</div>
        </>
    );
}
