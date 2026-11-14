import { Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    Code2,
    Cpu,
    Database,
    FolderOpen,
    Globe,
    KeyRound,
    Moon,
    SlidersHorizontal,
    Sun,
    TerminalSquare,
    Users,
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { NavFooter } from '@/components/nav-footer';
import { NavUser } from '@/components/nav-user';
import { Badge } from '@/components/ui/badge';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useAppearance } from '@/hooks/use-appearance';
import { dashboard } from '@/routes';
import type { NavItem, ZenbaseApp } from '@/types';

export function ClientAppSidebar() {
    const page = usePage<{ app?: ZenbaseApp }>();
    const app = page.props.app;
    const currentUrl = page.url;
    const { resolvedAppearance, updateAppearance } = useAppearance();

    if (!app) {
        return null;
    }

    const baseAppUrl = `/dashboard/apps/${app.id}`;

    const appSections = [
        {
            title: "Vue d'ensemble & Clés API",
            href: baseAppUrl,
            icon: KeyRound,
            isActive:
                currentUrl === baseAppUrl ||
                currentUrl.startsWith(`${baseAppUrl}?`),
            badge: null,
        },
        {
            title: 'Base de Données NoSQL',
            href: `${baseAppUrl}/database`,
            icon: Database,
            isActive: currentUrl.startsWith(`${baseAppUrl}/database`),
            badge: app.collections_count ?? 0,
        },
        {
            title: 'Utilisateurs / Auth',
            href: `${baseAppUrl}/auth`,
            icon: Users,
            isActive: currentUrl.startsWith(`${baseAppUrl}/auth`),
            badge: app.tenant_users_count ?? 0,
        },
        {
            title: 'Fichiers / Stockage',
            href: `${baseAppUrl}/storage`,
            icon: FolderOpen,
            isActive: currentUrl.startsWith(`${baseAppUrl}/storage`),
            badge: app.files_count ?? app.files?.length ?? 0,
        },
        {
            title: 'Origines CORS',
            href: `${baseAppUrl}/cors`,
            icon: Globe,
            isActive: currentUrl.startsWith(`${baseAppUrl}/cors`),
            badge: app.cors_origins_count ?? app.cors_origins?.length ?? 0,
        },
        {
            title: 'Web Functions PHP',
            href: `${baseAppUrl}/functions`,
            icon: Cpu,
            isActive:
                currentUrl === `${baseAppUrl}/functions` ||
                currentUrl.startsWith(`${baseAppUrl}/functions?`),
            badge: app.functions_count ?? app.functions?.length ?? 0,
            subItems: [
                {
                    title: 'Éditeur PHP (IDE)',
                    href: `${baseAppUrl}/functions/editor`,
                    icon: TerminalSquare,
                    isActive: currentUrl.startsWith(
                        `${baseAppUrl}/functions/editor`,
                    ),
                },
                {
                    title: "Variables d'Env (.env)",
                    href: `${baseAppUrl}/functions/env`,
                    icon: SlidersHorizontal,
                    isActive: currentUrl.startsWith(
                        `${baseAppUrl}/functions/env`,
                    ),
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
            title: 'Stubs IDE (PHP Functions)',
            href: '/dashboard/stubs/zenbase-stubs.php',
            icon: Code2,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="space-y-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="sm" asChild>
                            <Link
                                href={dashboard()}
                                prefetch
                                className="text-xs text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="size-3.5" />
                                <span>Toutes mes applications</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={baseAppUrl} prefetch>
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                                    <AppLogoIcon className="size-5 text-white" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">
                                        {app.name}
                                    </span>
                                    <span className="truncate font-mono text-[11px] text-muted-foreground">
                                        app_{app.id.slice(0, 8)}.sqlite
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup className="px-2 py-0">
                    <SidebarGroupLabel>Modules de l&apos;Application</SidebarGroupLabel>
                    <SidebarMenu>
                        {appSections.map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={item.isActive}
                                    tooltip={{ children: item.title }}
                                >
                                    <Link href={item.href} prefetch>
                                        <item.icon className="size-4" />
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                                {item.badge !== null && (
                                    <SidebarMenuBadge>
                                        <Badge
                                            variant="secondary"
                                            className="h-5 px-1.5 font-mono text-[10px]"
                                        >
                                            {item.badge}
                                        </Badge>
                                    </SidebarMenuBadge>
                                )}
                                {item.subItems && item.subItems.length > 0 && (
                                    <SidebarMenuSub>
                                        {item.subItems.map((subItem) => (
                                            <SidebarMenuSubItem
                                                key={subItem.href}
                                            >
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={subItem.isActive}
                                                >
                                                    <Link
                                                        href={subItem.href}
                                                        prefetch
                                                    >
                                                        <subItem.icon className="size-3.5" />
                                                        <span>
                                                            {subItem.title}
                                                        </span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                )}
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() =>
                                updateAppearance(
                                    resolvedAppearance === 'dark' ? 'light' : 'dark',
                                )
                            }
                            tooltip={{
                                children:
                                    resolvedAppearance === 'dark'
                                        ? 'Passer en mode clair'
                                        : 'Passer en mode sombre',
                            }}
                        >
                            {resolvedAppearance === 'dark' ? (
                                <Sun className="size-4 text-amber-400" />
                            ) : (
                                <Moon className="size-4 text-zinc-600" />
                            )}
                            <span>
                                Thème :{' '}
                                {resolvedAppearance === 'dark' ? 'Sombre' : 'Clair'}
                            </span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
