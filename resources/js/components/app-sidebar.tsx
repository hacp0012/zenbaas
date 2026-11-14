import { Link, usePage } from '@inertiajs/react';
import { BookOpen, Code2, Database, Globe, ShieldAlert, Users } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard, home } from '@/routes';
import type { Auth, NavItem } from '@/types';

export function AppSidebar() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const isAdmin = Boolean(auth?.user?.is_admin);

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
        {
            title: 'Stubs IDE (PHP Functions)',
            href: '/dashboard/stubs/zenbase-stubs.php',
            icon: Code2,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link
                                href={isAdmin ? '/admin/dashboard' : dashboard()}
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
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
