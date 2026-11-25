import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-sidebar p-4 sm:p-6 md:p-10">
            <div className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-border/80 bg-background p-8 shadow-none sm:p-10 md:rounded-[1.75rem]">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2 font-medium"
                        >
                            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                                <AppLogoIcon className="size-6 text-white" />
                            </div>
                            <span className="text-sm font-bold tracking-tight">
                                Zenbase
                            </span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="text-xl font-medium">{title}</h1>
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
