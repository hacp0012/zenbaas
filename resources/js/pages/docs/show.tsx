import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    ChevronDown,
    ChevronRight,
    Code2,
    Copy,
    Eye,
    FileCode2,
    FileText,
    FolderOpen,
    Moon,
    Package,
    ShieldAlert,
    Sparkles,
    Sun,
    Terminal,
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
    const markdownContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (viewMode === 'rendered' && markdownContainerRef.current) {
            Prism.highlightAllUnder(markdownContainerRef.current);
        }
    }, [htmlContent, viewMode, resolvedAppearance]);

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

    return (
        <>
            <Head
                title={`${currentDoc?.title ?? 'Documentation SDK'} — Documentation Zenbase`}
            />
            <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
                {/* Top Navigation Bar */}
                <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
                    <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-4">
                            <Link href={home()} className="flex items-center gap-2.5">
                                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                                    <AppLogoIcon className="size-5 text-white" />
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
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                                    >
                                        <Terminal className="size-3.5" />
                                        Mon Dashboard
                                    </Link>
                                )
                            ) : (
                                <Link
                                    href={login()}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                                >
                                    Espace Développeur
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main 3-Column Documentation Layout */}
                <div className="mx-auto grid max-w-[1600px] gap-6 px-6 py-8 lg:grid-cols-12">
                    {/* Left Sidebar: Platform & SDKs Navigation */}
                    <aside className="lg:col-span-3 xl:col-span-2">
                        <div className="sticky top-20 space-y-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
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
                                                        className={`flex min-w-0 flex-1 flex-col rounded-xl px-3 py-2 text-sm transition ${
                                                            isActive && !isSdkGroup
                                                                ? 'bg-emerald-600 font-semibold text-white shadow-xs'
                                                                : isActive || hasActiveChild
                                                                  ? 'bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-300'
                                                                  : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                                        }`}
                                                    >
                                                        <span className="flex items-center gap-2 truncate">
                                                            {isSdkGroup ? (
                                                                <Package className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                            ) : (
                                                                <FileText className="size-3.5 shrink-0" />
                                                            )}
                                                            <span className="truncate">
                                                                {doc.sdk_label ?? doc.nav_label ?? doc.title}
                                                            </span>
                                                        </span>
                                                        <span
                                                            className={`mt-0.5 pl-5 font-mono text-[10px] ${
                                                                isActive && !isSdkGroup
                                                                    ? 'text-emerald-100'
                                                                    : 'text-zinc-400'
                                                            }`}
                                                        >
                                                            {doc.sdk_slug
                                                                ? `sdks/${doc.sdk_slug}/`
                                                                : doc.path}
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
                                                            className={`flex flex-col rounded-lg px-2.5 py-1.5 text-xs transition ${
                                                                isActive
                                                                    ? 'bg-emerald-600 font-semibold text-white shadow-xs'
                                                                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/70'
                                                            }`}
                                                        >
                                                            <span className="flex items-center gap-1.5 truncate">
                                                                <Sparkles className="size-3 shrink-0" />
                                                                <span className="truncate">
                                                                    {doc.nav_label || 'Introduction'}
                                                                </span>
                                                            </span>
                                                            <span
                                                                className={`mt-0.5 pl-4 font-mono text-[9px] ${
                                                                    isActive
                                                                        ? 'text-emerald-100'
                                                                        : 'text-zinc-400'
                                                                }`}
                                                            >
                                                                {doc.path}
                                                            </span>
                                                        </Link>

                                                        {/* 2. Child pages inside sdks/<sdk>/docs/ */}
                                                        {children.map((child) => {
                                                            const isChildActive =
                                                                currentDoc?.path ===
                                                                child.path;
                                                            const isReference =
                                                                child.filename
                                                                    .toLowerCase()
                                                                    .includes('reference');

                                                            return (
                                                                <Link
                                                                    key={child.path}
                                                                    href={`/docs?doc=${encodeURIComponent(child.path)}`}
                                                                    prefetch
                                                                    className={`flex flex-col rounded-lg px-2.5 py-1.5 text-xs transition ${
                                                                        isChildActive
                                                                            ? 'bg-emerald-600 font-semibold text-white shadow-xs'
                                                                            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/70'
                                                                    }`}
                                                                >
                                                                    <span className="flex items-center gap-1.5 truncate">
                                                                        {isReference ? (
                                                                            <Code2 className="size-3 shrink-0" />
                                                                        ) : (
                                                                            <BookOpen className="size-3 shrink-0" />
                                                                        )}
                                                                        <span className="truncate">
                                                                            {child.nav_label || child.title}
                                                                        </span>
                                                                    </span>
                                                                    <span
                                                                        className={`mt-0.5 pl-4 font-mono text-[9px] ${
                                                                            isChildActive
                                                                                ? 'text-emerald-100'
                                                                                : 'text-zinc-400'
                                                                        }`}
                                                                    >
                                                                        {child.path}
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
                    <main className="lg:col-span-6 xl:col-span-8">
                        {!currentDoc ? (
                            <div className="rounded-2xl border bg-white p-12 text-center dark:bg-zinc-900">
                                <BookOpen className="mx-auto size-10 text-zinc-400" />
                                <p className="mt-3 text-sm text-zinc-500">
                                    Aucun fichier Markdown (.md) trouvé dans{' '}
                                    <code>/docs</code> ou <code>/sdks</code>.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
                                {/* File Metadata Toolbar */}
                                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
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
                                        className="zenbase-markdown space-y-4 text-sm leading-relaxed [&_a]:font-semibold [&_a]:text-emerald-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-500 [&_blockquote]:bg-emerald-500/5 [&_blockquote]:py-2 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs dark:[&_code]:bg-zinc-800 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:scroll-mt-24 [&_h2]:border-b [&_h2]:pb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:scroll-mt-24 [&_h3]:text-base [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-zinc-200 dark:[&_hr]:border-zinc-800 [&_li]:ml-5 [&_li]:list-disc [&_ol_li]:list-decimal [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-zinc-300 [&_pre]:bg-[#FAFAF8] [&_pre]:p-4 [&_pre]:text-[#272822] dark:[&_pre]:border-zinc-800 dark:[&_pre]:bg-[#1E1F1C] dark:[&_pre]:text-[#F8F8F2] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-xs [&_td]:border [&_td]:border-zinc-200 [&_td]:p-2.5 dark:[&_td]:border-zinc-800 [&_th]:border [&_th]:border-zinc-200 [&_th]:bg-zinc-100 [&_th]:p-2.5 [&_th]:font-semibold dark:[&_th]:border-zinc-800 dark:[&_th]:bg-zinc-800/60"
                                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                                    />
                                )}
                            </div>
                        )}
                    </main>

                    {/* Right Sidebar: Table of Contents */}
                    <aside className="lg:col-span-3 xl:col-span-2">
                        <div className="sticky top-20 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="mb-3 flex items-center gap-2 border-b pb-2.5 text-xs font-bold tracking-wider text-zinc-500 uppercase">
                                <BookOpen className="size-4 text-emerald-600" />
                                Sommaire du fichier
                            </div>
                            {headings.length === 0 ? (
                                <p className="text-xs text-zinc-400">
                                    Aucune sous-section détectée.
                                </p>
                            ) : (
                                <ul className="space-y-1.5 text-xs">
                                    {headings.map((h, i) => (
                                        <li
                                            key={`${h.id}-${i}`}
                                            className={h.level === 3 ? 'pl-3' : ''}
                                        >
                                            <a
                                                href={`#${h.id}`}
                                                onClick={(e) =>
                                                    handleHeadingClick(e, h.id)
                                                }
                                                className={`block rounded-md px-2 py-1 transition hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 ${
                                                    h.level === 3
                                                        ? 'text-zinc-500 dark:text-zinc-400'
                                                        : 'font-medium text-zinc-800 dark:text-zinc-200'
                                                }`}
                                            >
                                                {h.text}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}
