import { usePage } from '@inertiajs/react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { ClientAppSidebar } from '@/components/client-app-sidebar';
import { DesktopTabletGate } from '@/components/desktop-tablet-gate';
import { Badge } from '@/components/ui/badge';
import type { AppLayoutProps, ZenbaseApp } from '@/types';

export default function ClientAppLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps & { app?: ZenbaseApp }) {
    const { app } = usePage<{
        app?: ZenbaseApp;
    }>().props;

    return (
        <DesktopTabletGate>
            <AppShell variant="sidebar">
                <ClientAppSidebar />
                <AppContent variant="sidebar" className="min-w-0">
                    <AppSidebarHeader breadcrumbs={breadcrumbs} />

                    <div
                        scroll-region=""
                        className="flex min-h-0 flex-1 flex-col overflow-x-clip overflow-y-auto"
                    >
                        <div className="flex flex-1 flex-col gap-6 p-6">
                            {app && (
                                <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
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
                                </div>
                            )}

                            {children}
                        </div>
                    </div>
                </AppContent>
            </AppShell>
        </DesktopTabletGate>
    );
}
