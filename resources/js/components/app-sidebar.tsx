import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    BookOpen,
    ChevronRight,
    Database,
    Globe,
    HardDrive,
    Layers,
    ScrollText,
    Settings,
    ShieldAlert,
    SlidersHorizontal,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { dashboard, home } from '@/routes';
import type { Auth, NavItem } from '@/types';

type AdminGroup = {
    key: string;
    title: string;
    icon: LucideIcon;
    isActive: boolean;
    items: Array<{
        title: string;
        href: string;
        icon: LucideIcon;
        isActive: boolean;
    }>;
};

export function AppSidebar() {
    const page = usePage<{ auth: Auth }>();
    const isAdmin = Boolean(page.props.auth?.user?.is_admin);
    const currentUrl = page.url;

    const isSettingsActive = currentUrl.startsWith('/admin/settings');
    const isDiagnosticActive = currentUrl.startsWith('/admin/diagnostic');

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        settings: isSettingsActive,
        diagnostic: isDiagnosticActive,
    });

    useEffect(() => {
        if (isSettingsActive) {
            setOpenGroups((prev) =>
                prev.settings ? prev : { ...prev, settings: true },
            );
        }
    }, [isSettingsActive]);

    useEffect(() => {
        if (isDiagnosticActive) {
            setOpenGroups((prev) =>
                prev.diagnostic ? prev : { ...prev, diagnostic: true },
            );
        }
    }, [isDiagnosticActive]);

    const mainNavItems: NavItem[] = isAdmin
        ? [
              {
                  title: 'Supervision Admin',
                  href: '/admin/dashboard',
                  icon: ShieldAlert,
              },
              {
                  title: 'Gestion des Clients',
                  href: '/admin/users',
                  icon: Users,
              },
          ]
        : [
              {
                  title: 'Mes Applications',
                  href: dashboard(),
                  icon: Database,
              },
          ];

    const adminGroups: AdminGroup[] = [
        {
            key: 'settings',
            title: 'Settings',
            icon: Settings,
            isActive: isSettingsActive,
            items: [
                {
                    title: 'Configs',
                    href: '/admin/settings/configs',
                    icon: SlidersHorizontal,
                    isActive: currentUrl.startsWith('/admin/settings/configs'),
                },
                {
                    title: 'Storage',
                    href: '/admin/settings/storage',
                    icon: HardDrive,
                    isActive: currentUrl.startsWith('/admin/settings/storage'),
                },
            ],
        },
        {
            key: 'diagnostic',
            title: 'Diagnostic',
            icon: Activity,
            isActive: isDiagnosticActive,
            items: [
                {
                    title: 'App List',
                    href: '/admin/diagnostic/apps',
                    icon: Layers,
                    isActive: currentUrl.startsWith('/admin/diagnostic/apps'),
                },
                {
                    title: 'Logs',
                    href: '/admin/diagnostic/logs',
                    icon: ScrollText,
                    isActive: currentUrl.startsWith('/admin/diagnostic/logs'),
                },
            ],
        },
    ];

    const footerNavItems: NavItem[] = [
        {
            title: 'Documentation SDK (/docs)',
            href: '/docs',
            icon: BookOpen,
        },
        {
            title: 'Accueil Public Zenbase',
            href: home(),
            icon: Globe,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link
                                href={
                                    isAdmin ? '/admin/dashboard' : dashboard()
                                }
                                prefetch
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />

                {isAdmin && (
                    <SidebarGroup className="px-2 py-0">
                        <SidebarGroupLabel>Système</SidebarGroupLabel>
                        <SidebarMenu>
                            {adminGroups.map((group) => {
                                const isOpen = Boolean(openGroups[group.key]);

                                return (
                                    <Collapsible
                                        key={group.key}
                                        asChild
                                        open={isOpen}
                                        onOpenChange={(open) =>
                                            setOpenGroups((prev) => ({
                                                ...prev,
                                                [group.key]: open,
                                            }))
                                        }
                                        className="group/collapsible"
                                    >
                                        <SidebarMenuItem>
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton
                                                    isActive={group.isActive}
                                                    tooltip={{
                                                        children: group.title,
                                                    }}
                                                >
                                                    <group.icon className="size-4" />
                                                    <span>{group.title}</span>
                                                    <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub>
                                                    {group.items.map((item) => (
                                                        <SidebarMenuSubItem
                                                            key={item.href}
                                                        >
                                                            <SidebarMenuSubButton
                                                                asChild
                                                                isActive={
                                                                    item.isActive
                                                                }
                                                            >
                                                                <Link
                                                                    href={
                                                                        item.href
                                                                    }
                                                                    prefetch
                                                                >
                                                                    <item.icon className="size-3.5" />
                                                                    <span>
                                                                        {
                                                                            item.title
                                                                        }
                                                                    </span>
                                                                </Link>
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    ))}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </SidebarMenuItem>
                                    </Collapsible>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
