import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { home } from '@/routes';

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <div className="flex h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-sidebar p-4 sm:p-6 md:p-10">
            <div className="flex max-h-full w-full max-w-md flex-col gap-6">
                <Link
                    href={home()}
                    className="flex shrink-0 items-center gap-2.5 self-center font-bold"
                >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-[#081a14] text-emerald-500 ring-1 ring-emerald-500/25 ring-inset">
                        <AppLogoIcon className="size-6 text-emerald-500" />
                    </div>
                    <span className="text-lg tracking-tight">Zenbase</span>
                </Link>

                <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
                    <Card className="max-h-full overflow-y-auto rounded-3xl border-border/80 bg-background shadow-none md:rounded-[1.75rem]">
                        <CardHeader className="px-10 pt-8 pb-0 text-center">
                            <CardTitle className="text-xl">{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-10 py-8">
                            {children}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
