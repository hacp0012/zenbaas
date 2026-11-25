import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative grid h-dvh flex-col items-stretch justify-center gap-3 overflow-hidden bg-sidebar p-2 sm:p-3 lg:max-w-none lg:grid-cols-2">
            <div className="relative hidden h-full flex-col overflow-hidden rounded-[1.75rem] bg-muted p-10 text-white lg:flex dark:border dark:border-border/80">
                <div className="absolute inset-0 bg-zinc-900" />
                <Link
                    href={home()}
                    className="relative z-20 flex items-center gap-2.5 text-lg font-bold"
                >
                    <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
                        <AppLogoIcon className="size-5 text-white" />
                    </div>
                    Zenbase
                </Link>
            </div>
            <div className="flex h-full min-h-0 w-full items-center justify-center overflow-y-auto rounded-3xl border border-border/80 bg-background p-6 shadow-none sm:p-8 md:rounded-[1.75rem]">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <Link
                        href={home()}
                        className="relative z-20 flex items-center justify-center gap-2 font-bold lg:hidden"
                    >
                        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                            <AppLogoIcon className="size-6 text-white" />
                        </div>
                        <span>Zenbase</span>
                    </Link>
                    <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                        <h1 className="text-xl font-medium">{title}</h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
