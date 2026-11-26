import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    ChevronDown,
    ChevronRight,
    Code2,
    Copy,
    Database,
    Eye,
    FileCode2,
    FileText,
    FolderOpen,
    HardDrive,
    KeyRound,
    Moon,
    Package,
    Rocket,
    ShieldAlert,
    Sparkles,
    Sun,
    Terminal,
    Zap,
} from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { PrismCodeBlock } from '@/components/prism-code-block';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppearance } from '@/hooks/use-appearance';
import { dashboard, home, login } from '@/routes';
import type { Auth } from '@/types';

type DocFileItem = {
    path: string;
    title: string;
    nav_label: string;
    category: string;
    sdk_slug?: string | null;
    sdk_label?: string | null;
    filename: string;
    updated_at: string;
    parent_path?: string | null;
    sort_order?: number;
};

type DocTreeEntry = {
    doc: DocFileItem;
    children: DocFileItem[];
};

type DocHeading = {
    level: number;
    text: string;
    id: string;
};

export default function DocsShow({
    documents,
    currentDoc,
    rawMarkdown,
    htmlContent,
    headings,
}: {
    documents: DocFileItem[];
    currentDoc: DocFileItem | null;
    rawMarkdown: string;
    htmlContent: string;
    headings: DocHeading[];
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const user = auth?.user;
    const { resolvedAppearance, updateAppearance } = useAppearance();

    const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
    const [copied, setCopied] = useState(false);
    const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
        'sdks/js-ts/README.md': true,
    });
    const [activeHeadingId, setActiveHeadingId] = useState<string | null>(
        () => headings[0]?.id ?? null,
    );
    const markdownContainerRef = useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (viewMode === 'rendered' && markdownContainerRef.current) {
            Prism.highlightAllUnder(markdownContainerRef.current);
        }
    }, [htmlContent, viewMode, resolvedAppearance]);

    useEffect(() => {
        if (headings.length === 0) {
            setActiveHeadingId(null);
            return;
        }

        const hashId = window.location.hash.replace(/^#/, '');
        if (hashId && headings.some((h) => h.id === hashId)) {
            setActiveHeadingId(hashId);
        } else {
            setActiveHeadingId(headings[0].id);
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = 0;
            }
        }
    }, [currentDoc?.path, headings]);

    useEffect(() => {
        if (viewMode !== 'rendered' || headings.length === 0) {
            return;
        }

        const scrollContainer = scrollContainerRef.current;
        let rafId: number | null = null;

        const updateActiveHeading = () => {
            rafId = null;

            const elements = headings
                .map((h) => ({
                    id: h.id,
                    el: document.getElementById(h.id),
                }))
                .filter(
                    (item): item is { id: string; el: HTMLElement } =>
                        item.el !== null,
                );

            if (elements.length === 0) {
                return;
            }

            const isInnerScrolling =
                scrollContainer !== null &&
                scrollContainer.scrollHeight > scrollContainer.clientHeight + 4;

            if (isInnerScrolling && scrollContainer) {
                const isAtBottom =
                    scrollContainer.scrollTop + scrollContainer.clientHeight >=
                    scrollContainer.scrollHeight - 24;

                if (isAtBottom) {
                    setActiveHeadingId(elements[elements.length - 1].id);
                    return;
                }

                const containerTop = scrollContainer.getBoundingClientRect().top;
                const innerOffset = 56;
                let currentId = elements[0].id;

                for (const item of elements) {
                    if (
                        item.el.getBoundingClientRect().top - containerTop <=
                        innerOffset
                    ) {
                        currentId = item.id;
                    } else {
                        break;
                    }
                }

                setActiveHeadingId(currentId);
                return;
            }

            const isAtBottom =
                window.innerHeight + window.scrollY >=
                document.documentElement.scrollHeight - 24;

            if (isAtBottom) {
                setActiveHeadingId(elements[elements.length - 1].id);
                return;
            }

            const windowOffset = 128;
            let currentId = elements[0].id;
            for (const item of elements) {
                if (item.el.getBoundingClientRect().top <= windowOffset) {
                    currentId = item.id;
                } else {
                    break;
                }
            }

            setActiveHeadingId(currentId);
        };

        const handleScroll = () => {
            if (rafId !== null) {
                return;
            }
            rafId = window.requestAnimationFrame(updateActiveHeading);
        };

        updateActiveHeading();
        scrollContainer?.addEventListener('scroll', handleScroll, {
            passive: true,
        });
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll, { passive: true });

        return () => {
            scrollContainer?.removeEventListener('scroll', handleScroll);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
            if (rafId !== null) {
                window.cancelAnimationFrame(rafId);
            }
        };
    }, [headings, viewMode, currentDoc?.path]);

    const groupedDocuments = useMemo(() => {
        const childrenByParent: Record<string, DocFileItem[]> = {};
        const docPaths = new Set(documents.map((d) => d.path));

        for (const doc of documents) {
            if (doc.parent_path && docPaths.has(doc.parent_path)) {
                if (!childrenByParent[doc.parent_path]) {
                    childrenByParent[doc.parent_path] = [];
                }
                childrenByParent[doc.parent_path].push(doc);
            }
        }

        const groups: Record<string, DocTreeEntry[]> = {};
        for (const doc of documents) {
            if (doc.parent_path && docPaths.has(doc.parent_path)) {
                continue;
            }
            if (!groups[doc.category]) {
                groups[doc.category] = [];
            }
            groups[doc.category].push({
                doc,
                children: childrenByParent[doc.path] ?? [],
            });
        }

        return groups;
    }, [documents]);

    function toggleSubmenu(path: string) {
        setOpenSubmenus((prev) => ({
            ...prev,
            [path]: !(prev[path] ?? true),
        }));
    }

    function handleCopyMarkdown() {
        void navigator.clipboard.writeText(rawMarkdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function handleContentClick(e: MouseEvent<HTMLDivElement>) {
        const target = (e.target as HTMLElement).closest('a');
        if (!target) {
            return;
        }
        const href = target.getAttribute('href');
        if (href && href.startsWith('/docs')) {
            e.preventDefault();
            router.visit(href);
        }
    }

    function handleHeadingClick(e: MouseEvent<HTMLAnchorElement>, id: string) {
        e.preventDefault();
        setActiveHeadingId(id);
        if (viewMode !== 'rendered') {
            setViewMode('rendered');
            setTimeout(() => {
                const el = document.getElementById(id);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 60);
            return;
        }
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.history.replaceState(null, '', `#${id}`);
        }
    }

    function renderChildIcon(filename: string) {
        const lower = filename.toLowerCase();
        if (lower.includes('reference') || lower.includes('api')) {
            return <Code2 className="size-3.5 shrink-0" />;
        }
        if (lower.includes('getting-started') || lower.includes('quickstart')) {
            return <Rocket className="size-3.5 shrink-0" />;
        }
        if (lower.includes('database') || lower.includes('db')) {
            return <Database className="size-3.5 shrink-0" />;
        }
        if (lower.includes('auth')) {
            return <KeyRound className="size-3.5 shrink-0" />;
        }
        if (lower.includes('storage') || lower.includes('files')) {
            return <HardDrive className="size-3.5 shrink-0" />;
        }
        if (lower.includes('function')) {
            return <Zap className="size-3.5 shrink-0" />;
        }

        return <BookOpen className="size-3.5 shrink-0" />;
    }

    return (
        <>
            <Head
                title={`${currentDoc?.title ?? 'Documentation SDK'} — Documentation Zenbase`}
            />
            <div className="flex min-h-screen flex-col bg-sidebar text-foreground lg:h-svh lg:overflow-hidden">
                {/* Top Navigation Bar */}
                <header className="sticky top-0 z-30 shrink-0 border-b border-sidebar-border/80 bg-sidebar/90 backdrop-blur lg:static">
                    <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-4">
                            <Link href={home()} className="flex items-center gap-2.5">
                                <div className="flex size-9 items-center justify-center rounded-xl bg-[#081a14] text-emerald-500 ring-1 ring-emerald-500/25 ring-inset">
                                    <AppLogoIcon className="size-5 text-emerald-500" />
                                </div>
                                <div>
                                    <span className="text-base font-bold tracking-tight">
                                        Zenbase
                                    </span>
                                    <span className="ml-2 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                        Docs & SDKs
                                    </span>
                                </div>
                            </Link>

                            <span className="hidden text-zinc-300 sm:inline dark:text-zinc-700">
                                |
                            </span>

                            <Link
                                href={home()}
                                className="hidden items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 sm:inline-flex dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                                <ArrowLeft className="size-3.5" />
                                Retour à l&apos;accueil
                            </Link>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    updateAppearance(
                                        resolvedAppearance === 'dark'
                                            ? 'light'
                                            : 'dark',
                                    )
                                }
                            >
                                {resolvedAppearance === 'dark' ? (
                                    <Sun className="mr-1.5 size-3.5 text-amber-400" />
                                ) : (
                                    <Moon className="mr-1.5 size-3.5 text-zinc-600" />
                                )}
                                {resolvedAppearance === 'dark'
                                    ? 'Mode Clair'
                                    : 'Mode Sombre'}
                            </Button>

                            {user ? (
                                user.is_admin ? (
                                    <Link
                                        href="/admin/dashboard"
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
                                    >
                                        <ShieldAlert className="size-3.5" />
                                        Administration
                                    </Link>
                                ) : (
                                    <Link
                                        href={dashboard()}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                                    >
                                        <Terminal className="size-3.5" />
                                        Mon Dashboard
                                    </Link>
                                )
                            ) : (
                                <Link
                                    href={login()}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                                >
                                    Espace Développeur
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main 3-Column Documentation Layout */}
                <div className="mx-auto grid w-full max-w-[1600px] flex-1 gap-6 px-4 py-4 sm:px-6 lg:min-h-0 lg:grid-cols-12 lg:overflow-hidden lg:py-5">
                    {/* Left Sidebar: Platform & SDKs Navigation */}
                    <aside className="lg:col-span-3 lg:flex lg:min-h-0 lg:flex-col xl:col-span-2">
                        <div className="space-y-6 overflow-y-auto rounded-3xl border border-border/60 bg-background/75 p-4 shadow-none dark:bg-background/60 lg:h-full">
                            <div className="flex items-center justify-between border-b pb-3">
                                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-500 uppercase">
                                    <FolderOpen className="size-4 text-emerald-600" />
                                    Documentation
                                </div>
                                <Badge variant="secondary" className="text-[11px]">
                                    {documents.length} pages
                                </Badge>
                            </div>

                            {Object.entries(groupedDocuments).map(([category, entries]) => (
                                <div key={category} className="space-y-1.5">
                                    <div className="px-2 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                                        {category}
                                    </div>
                                    {entries.map(({ doc, children }) => {
                                        const isActive = currentDoc?.path === doc.path;
                                        const hasActiveChild = children.some(
                                            (c) => c.path === currentDoc?.path,
                                        );
                                        const isSdkGroup = children.length > 0 || Boolean(doc.sdk_label);
                                        const isExpanded =
                                            (openSubmenus[doc.path] ?? true) ||
                                            isActive ||
                                            hasActiveChild;

                                        return (
                                            <div key={doc.path} className="space-y-1">
                                                <div className="flex items-center gap-1">
                                                    <Link
                                                        href={`/docs?doc=${encodeURIComponent(doc.path)}`}
                                                        prefetch
                                                        className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                                                            isActive && !isSdkGroup
                                                                ? 'bg-primary font-semibold text-primary-foreground shadow-xs'
                                                                : isActive || hasActiveChild
                                                                  ? 'bg-muted font-semibold text-foreground'
                                                                  : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                                        }`}
                                                    >
                                                        {isSdkGroup ? (
                                                            <Package className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                        ) : (
                                                            <FileText className="size-3.5 shrink-0" />
                                                        )}
                                                        <span className="truncate">
                                                            {doc.sdk_label ?? doc.nav_label ?? doc.title}
                                                        </span>
                                                    </Link>

                                                    {children.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleSubmenu(doc.path)
                                                            }
                                                            title="Afficher / masquer le sous-menu du SDK"
                                                            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronDown className="size-4" />
                                                            ) : (
                                                                <ChevronRight className="size-4" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>

                                                {children.length > 0 && isExpanded && (
                                                    <div className="ml-4 space-y-1 border-l-2 border-emerald-500/30 pl-2.5">
                                                        {/* 1. SDK Root README (Introduction & Présentation) */}
                                                        <Link
                                                            href={`/docs?doc=${encodeURIComponent(doc.path)}`}
                                                            prefetch
                                                            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                                                                isActive
                                                                    ? 'bg-primary font-semibold text-primary-foreground shadow-xs'
                                                                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/70'
                                                            }`}
                                                        >
                                                            <Sparkles className="size-3.5 shrink-0" />
                                                            <span className="truncate">
                                                                {doc.nav_label || 'Introduction'}
                                                            </span>
                                                        </Link>

                                                        {/* 2. Child pages inside sdks/<sdk>/docs/ */}
                                                        {children.map((child) => {
                                                            const isChildActive =
                                                                currentDoc?.path ===
                                                                child.path;

                                                            return (
                                                                <Link
                                                                    key={child.path}
                                                                    href={`/docs?doc=${encodeURIComponent(child.path)}`}
                                                                    prefetch
                                                                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                                                                        isChildActive
                                                                            ? 'bg-primary font-semibold text-primary-foreground shadow-xs'
                                                                            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/70'
                                                                    }`}
                                                                >
                                                                    {renderChildIcon(child.filename)}
                                                                    <span className="truncate">
                                                                        {child.nav_label || child.title}
                                                                    </span>
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </aside>

                    {/* Center: Rendered Markdown Content */}
                    <main className="lg:col-span-6 lg:flex lg:min-h-0 lg:flex-col xl:col-span-8">
                        {!currentDoc ? (
                            <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-border/80 bg-background p-12 text-center shadow-none md:rounded-[1.75rem]">
                                <BookOpen className="mx-auto size-10 text-zinc-400" />
                                <p className="mt-3 text-sm text-zinc-500">
                                    Aucun fichier Markdown (.md) trouvé dans{' '}
                                    <code>/docs</code> ou <code>/sdks</code>.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-border/80 bg-background shadow-none md:rounded-[1.75rem] lg:h-full lg:min-h-0">
                                {/* File Metadata Toolbar */}
                                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/70 px-6 py-4 sm:px-8">
                                    <div className="flex items-center gap-2">
                                        <FileCode2 className="size-4 text-emerald-600" />
                                        <span className="font-mono text-xs text-zinc-500">
                                            {currentDoc.path}
                                        </span>
                                        <span className="text-xs text-zinc-400">
                                            · Mis à jour : {currentDoc.updated_at}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={
                                                viewMode === 'rendered' ? 'default' : 'outline'
                                            }
                                            onClick={() => setViewMode('rendered')}
                                        >
                                            <Eye className="mr-1.5 size-3.5" />
                                            Rendu
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={viewMode === 'raw' ? 'default' : 'outline'}
                                            onClick={() => setViewMode('raw')}
                                        >
                                            <Code2 className="mr-1.5 size-3.5" />
                                            Source .md
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCopyMarkdown}
                                        >
                                            <Copy className="mr-1.5 size-3.5" />
                                            {copied ? 'Copié !' : 'Copier'}
                                        </Button>
                                    </div>
                                </div>

                                <div
                                    ref={scrollContainerRef}
                                    scroll-region=""
                                    className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8"
                                >
                                    {viewMode === 'raw' ? (
                                        <PrismCodeBlock
                                            code={rawMarkdown}
                                            language="markdown"
                                            title={currentDoc.path}
                                        />
                                    ) : (
                                        <div
                                            ref={markdownContainerRef}
                                            onClick={handleContentClick}
                                            className="zenbase-markdown space-y-4 text-sm leading-relaxed [&_a]:font-semibold [&_a]:text-emerald-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-500 [&_blockquote]:bg-emerald-500/5 [&_blockquote]:py-2 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs dark:[&_code]:bg-zinc-800 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:scroll-mt-24 lg:[&_h2]:scroll-mt-6 [&_h2]:border-b [&_h2]:pb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:scroll-mt-24 lg:[&_h3]:scroll-mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-zinc-200 dark:[&_hr]:border-zinc-800 [&_li]:ml-5 [&_li]:list-disc [&_ol_li]:list-decimal [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-zinc-300 [&_pre]:bg-[#FAFAF8] [&_pre]:p-4 [&_pre]:text-[#272822] dark:[&_pre]:border-zinc-800 dark:[&_pre]:bg-[#1E1F1C] dark:[&_pre]:text-[#F8F8F2] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-xs [&_td]:border [&_td]:border-zinc-200 [&_td]:p-2.5 dark:[&_td]:border-zinc-800 [&_th]:border [&_th]:border-zinc-200 [&_th]:bg-zinc-100 [&_th]:p-2.5 [&_th]:font-semibold dark:[&_th]:border-zinc-800 dark:[&_th]:bg-zinc-800/60"
                                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </main>

                    {/* Right Sidebar: Table of Contents (Scrollspy) */}
                    <aside className="lg:col-span-3 lg:flex lg:min-h-0 lg:flex-col xl:col-span-2">
                        <div className="overflow-y-auto rounded-3xl border border-border/60 bg-background/75 p-4 shadow-none dark:bg-background/60 lg:h-full">
                            <div className="mb-3 flex items-center gap-2 border-b pb-2.5 text-xs font-bold tracking-wider text-zinc-500 uppercase">
                                <BookOpen className="size-4 text-emerald-600" />
                                Sur cette page
                            </div>
                            {headings.length === 0 ? (
                                <p className="text-xs text-zinc-400">
                                    Aucune sous-section détectée.
                                </p>
                            ) : (
                                <ul className="space-y-1 border-l border-zinc-200 text-xs dark:border-zinc-800">
                                    {headings.map((h, i) => {
                                        const isHeadingActive =
                                            activeHeadingId === h.id;

                                        return (
                                            <li key={`${h.id}-${i}`}>
                                                <a
                                                    href={`#${h.id}`}
                                                    aria-current={
                                                        isHeadingActive
                                                            ? 'location'
                                                            : undefined
                                                    }
                                                    onClick={(e) =>
                                                        handleHeadingClick(
                                                            e,
                                                            h.id,
                                                        )
                                                    }
                                                    className={`-ml-px block rounded-r-md border-l-2 py-1 pr-2 transition ${
                                                        h.level === 3
                                                            ? 'pl-5'
                                                            : 'pl-3'
                                                    } ${
                                                        isHeadingActive
                                                            ? 'border-emerald-600 bg-emerald-500/10 font-semibold text-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                            : h.level === 3
                                                              ? 'border-transparent text-zinc-500 hover:border-zinc-300 hover:bg-zinc-100/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100'
                                                              : 'border-transparent font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100/70 hover:text-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100'
                                                    }`}
                                                >
                                                    {h.text}
                                                </a>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}
