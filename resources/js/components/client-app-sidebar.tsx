import { Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    Bot,
    ChevronRight,
    Cpu,
    Database,
    FolderOpen,
    Gauge,
    Globe,
    KeyRound,
    LayoutDashboard,
    Moon,
    Plug,
    ScrollText,
    Settings,
    ShieldAlert,
    SlidersHorizontal,
    Sparkles,
    Sun,
    TerminalSquare,
    Users,
    Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { NavFooter } from '@/components/nav-footer';
import { NavUser } from '@/components/nav-user';
import { Badge } from '@/components/ui/badge';
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

type SidebarSubItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    isActive: boolean;
    badge?: string | number | null;
};

type SidebarSection =
    | {
          type: 'link';
          title: string;
          href: string;
          icon: LucideIcon;
          isActive: boolean;
          badge: string | number | null;
      }
    | {
          type: 'collapsible';
          key: string;
          title: string;
          icon: LucideIcon;
          isActive: boolean;
          subItems: SidebarSubItem[];
      };

export function ClientAppSidebar() {
    const page = usePage<{ app?: ZenbaseApp }>();
    const app = page.props.app;
    const currentUrl = page.url;
    const { resolvedAppearance, updateAppearance } = useAppearance();

    const baseAppUrl = app ? `/dashboard/apps/${app.id}` : '';
    const isFunctionsSectionActive =
        app !== undefined && currentUrl.startsWith(`${baseAppUrl}/functions`);
    const isAiSectionActive =
        app !== undefined &&
        (currentUrl.startsWith(`${baseAppUrl}/mcp`) ||
            currentUrl.startsWith(`${baseAppUrl}/skills`));
    const isSettingsSectionActive =
        app !== undefined && currentUrl.startsWith(`${baseAppUrl}/settings`);

    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        functions: isFunctionsSectionActive,
        ai: isAiSectionActive,
        settings: isSettingsSectionActive,
    });

    useEffect(() => {
        if (isFunctionsSectionActive) {
            setOpenMenus((prev) =>
                prev.functions ? prev : { ...prev, functions: true },
            );
        }
    }, [isFunctionsSectionActive]);

    useEffect(() => {
        if (isAiSectionActive) {
            setOpenMenus((prev) => (prev.ai ? prev : { ...prev, ai: true }));
        }
    }, [isAiSectionActive]);

    useEffect(() => {
        if (isSettingsSectionActive) {
            setOpenMenus((prev) =>
                prev.settings ? prev : { ...prev, settings: true },
            );
        }
    }, [isSettingsSectionActive]);

    if (!app) {
        return null;
    }

    const mcpStatusBadge = app.mcp_settings?.enabled
        ? app.mcp_settings.read_only
            ? 'RO'
            : 'RW'
        : 'Off';

    const appSections: SidebarSection[] = [
        {
            type: 'link',
            title: "Vue d'ensemble",
            href: baseAppUrl,
            icon: LayoutDashboard,
            isActive:
                currentUrl === baseAppUrl ||
                currentUrl.startsWith(`${baseAppUrl}?`),
            badge: null,
        },
        {
            type: 'link',
            title: 'Integrations',
            href: `${baseAppUrl}/integrations`,
            icon: KeyRound,
            isActive: currentUrl.startsWith(`${baseAppUrl}/integrations`),
            badge: null,
        },
        {
            type: 'link',
            title: 'Base de Données NoSQL',
            href: `${baseAppUrl}/database`,
            icon: Database,
            isActive: currentUrl.startsWith(`${baseAppUrl}/database`),
            badge: app.collections_count ?? 0,
        },
        {
            type: 'link',
            title: 'Utilisateurs / Auth',
            href: `${baseAppUrl}/auth`,
            icon: Users,
            isActive: currentUrl.startsWith(`${baseAppUrl}/auth`),
            badge: app.tenant_users_count ?? 0,
        },
        {
            type: 'link',
            title: 'Fichiers / Stockage',
            href: `${baseAppUrl}/storage`,
            icon: FolderOpen,
            isActive: currentUrl.startsWith(`${baseAppUrl}/storage`),
            badge: app.files_count ?? app.files?.length ?? 0,
        },
        {
            type: 'link',
            title: 'Origines CORS',
            href: `${baseAppUrl}/cors`,
            icon: Globe,
            isActive: currentUrl.startsWith(`${baseAppUrl}/cors`),
            badge: app.cors_origins_count ?? app.cors_origins?.length ?? 0,
        },
        {
            type: 'collapsible',
            key: 'functions',
            title: 'Web Functions PHP',
            icon: Cpu,
            isActive: isFunctionsSectionActive,
            subItems: [
                {
                    title: 'Fonctions',
                    href: `${baseAppUrl}/functions`,
                    icon: Zap,
                    isActive:
                        currentUrl === `${baseAppUrl}/functions` ||
                        currentUrl.startsWith(`${baseAppUrl}/functions?`),
                    badge: app.functions_count ?? app.functions?.length ?? 0,
                },
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
        {
            type: 'collapsible',
            key: 'ai',
            title: 'AI',
            icon: Bot,
            isActive: isAiSectionActive,
            subItems: [
                {
                    title: 'Serveur MCP',
                    href: `${baseAppUrl}/mcp`,
                    icon: Plug,
                    isActive: currentUrl.startsWith(`${baseAppUrl}/mcp`),
                    badge: mcpStatusBadge,
                },
                {
                    title: 'Skills',
                    href: `${baseAppUrl}/skills`,
                    icon: Sparkles,
                    isActive: currentUrl.startsWith(`${baseAppUrl}/skills`),
                },
            ],
        },
        {
            type: 'link',
            title: 'Logs',
            href: `${baseAppUrl}/logs`,
            icon: ScrollText,
            isActive: currentUrl.startsWith(`${baseAppUrl}/logs`),
            badge:
                (app.error_logs_count ?? 0) > 0
                    ? `${app.error_logs_count} err`
                    : (app.logs_count ?? 0),
        },
        {
            type: 'collapsible',
            key: 'settings',
            title: 'Settings',
            icon: Settings,
            isActive: isSettingsSectionActive,
            subItems: [
                {
                    title: 'Rate Limits',
                    href: `${baseAppUrl}/settings/rate-limits`,
                    icon: Gauge,
                    isActive: currentUrl.startsWith(
                        `${baseAppUrl}/settings/rate-limits`,
                    ),
                    badge:
                        app.rate_limits?.enabled === false
                            ? 'Off'
                            : `${app.rate_limits?.api_per_minute ?? 120}/m`,
                },
                {
                    title: 'Advanced',
                    href: `${baseAppUrl}/settings/advanced`,
                    icon: ShieldAlert,
                    isActive: currentUrl.startsWith(
                        `${baseAppUrl}/settings/advanced`,
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
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#081a14] text-emerald-500 ring-1 ring-emerald-500/25 ring-inset">
                                    <AppLogoIcon className="size-5 text-emerald-500" />
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
                    <SidebarGroupLabel>
                        Modules de l&apos;Application
                    </SidebarGroupLabel>
                    <SidebarMenu>
                        {appSections.map((item) => {
                            if (item.type === 'collapsible') {
                                const isOpen = Boolean(openMenus[item.key]);

                                return (
                                    <Collapsible
                                        key={item.key}
                                        asChild
                                        open={isOpen}
                                        onOpenChange={(open) =>
                                            setOpenMenus((prev) => ({
                                                ...prev,
                                                [item.key]: open,
                                            }))
                                        }
                                        className="group/collapsible"
                                    >
                                        <SidebarMenuItem>
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton
                                                    isActive={item.isActive}
                                                    tooltip={{
                                                        children: item.title,
                                                    }}
                                                >
                                                    <item.icon className="size-4" />
                                                    <span>{item.title}</span>
                                                    <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub>
                                                    {item.subItems.map(
                                                        (subItem) => (
                                                            <SidebarMenuSubItem
                                                                key={
                                                                    subItem.href
                                                                }
                                                            >
                                                                <SidebarMenuSubButton
                                                                    asChild
                                                                    isActive={
                                                                        subItem.isActive
                                                                    }
                                                                >
                                                                    <Link
                                                                        href={
                                                                            subItem.href
                                                                        }
                                                                        prefetch
                                                                        className="flex items-center justify-between gap-2"
                                                                    >
                                                                        <span className="flex min-w-0 items-center gap-2">
                                                                            <subItem.icon className="size-3.5 shrink-0" />
                                                                            <span className="truncate">
                                                                                {
                                                                                    subItem.title
                                                                                }
                                                                            </span>
                                                                        </span>
                                                                        {subItem.badge !==
                                                                            undefined &&
                                                                            subItem.badge !==
                                                                                null && (
                                                                                <Badge
                                                                                    variant="secondary"
                                                                                    className="h-4 px-1.5 font-mono text-[10px]"
                                                                                >
                                                                                    {
                                                                                        subItem.badge
                                                                                    }
                                                                                </Badge>
                                                                            )}
                                                                    </Link>
                                                                </SidebarMenuSubButton>
                                                            </SidebarMenuSubItem>
                                                        ),
                                                    )}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </SidebarMenuItem>
                                    </Collapsible>
                                );
                            }

                            return (
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
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() =>
                                updateAppearance(
                                    resolvedAppearance === 'dark'
                                        ? 'light'
                                        : 'dark',
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
                                {resolvedAppearance === 'dark'
                                    ? 'Sombre'
                                    : 'Clair'}
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
