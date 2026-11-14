import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { ClientAppSidebar } from '@/components/client-app-sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import type { AppLayoutProps, ZenbaseApp } from '@/types';

export default function ClientAppLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps & { app?: ZenbaseApp }) {
    const { app, flash } = usePage<{
        app?: ZenbaseApp;
        flash?: {
            success?: string;
            error?: string;
        };
    }>().props;

    return (
        <AppShell variant="sidebar">
            <ClientAppSidebar />
            <AppContent variant="sidebar" className="min-w-0 overflow-x-clip">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />

                <div className="flex flex-1 flex-col gap-6 p-6">
                    {app && (
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-emerald-600 text-white">
                                        Application Active
                                    </Badge>
                                    <span className="font-mono text-xs text-muted-foreground">
                                        app_{app.id}.sqlite
                                    </span>
                                </div>
                                <h1 className="mt-1 text-2xl font-bold tracking-tight">
                                    {app.name}
                                </h1>
                                {app.description && (
                                    <p className="text-sm text-muted-foreground">
                                        {app.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={dashboard()}>
                                        <ArrowLeft className="mr-1.5 size-3.5" />
                                        Retour aux Applications
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )}

                    {flash?.success && (
                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                            {flash.error}
                        </div>
                    )}

                    {children}
                </div>
            </AppContent>
        </AppShell>
    );
}
