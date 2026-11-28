import { Head, Link, usePage } from '@inertiajs/react';
import {
    Bell,
    Bot,
    CheckCircle2,
    ChevronDown,
    Cloud,
    CloudUpload,
    Code2,
    Cpu,
    Database,
    Eye,
    FileCode2,
    FolderOpen,
    Layers,
    LayoutDashboard,
    Moon,
    MoreHorizontal,
    Network,
    Plus,
    Puzzle,
    Rocket,
    Search,
    Server,
    Settings,
    ShieldCheck,
    Star,
    Sun,
    Terminal,
    Users,
    Webhook,
    Zap,
} from 'lucide-react';
import { type KeyboardEvent, useRef, useState } from 'react';
import '../../css/welcome/welcome.css';
import AppLogoIcon from '@/components/app-logo-icon';
import { useAppearance } from '@/hooks/use-appearance';
import { dashboard, home, login, register } from '@/routes';
import type { Auth } from '@/types';

type CapabilityTabId = 'functions' | 'database' | 'observability';

const CAPABILITY_TABS: ReadonlyArray<{
    id: CapabilityTabId;
    label: string;
}> = [
    { id: 'functions', label: 'Web Functions' },
    { id: 'database', label: 'Base NoSQL' },
    { id: 'observability', label: 'Observabilité' },
];

export default function Welcome() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const user = auth?.user;
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    const [activeTab, setActiveTab] = useState<CapabilityTabId>('functions');
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const primaryCtaHref = user
        ? user.is_admin
            ? '/admin/dashboard'
            : dashboard()
        : register();
    const primaryCtaLabel = user
        ? user.is_admin
            ? 'Espace Admin'
            : 'Espace Client'
        : 'Démarrer gratuitement';

    function handleTabKeyDown(
        event: KeyboardEvent<HTMLButtonElement>,
        index: number,
    ) {
        let nextIndex = index;
        if (event.key === 'ArrowRight') {
            nextIndex = (index + 1) % CAPABILITY_TABS.length;
        } else if (event.key === 'ArrowLeft') {
            nextIndex =
                (index - 1 + CAPABILITY_TABS.length) % CAPABILITY_TABS.length;
        } else if (event.key === 'Home') {
            nextIndex = 0;
        } else if (event.key === 'End') {
            nextIndex = CAPABILITY_TABS.length - 1;
        } else {
            return;
        }

        event.preventDefault();
        setActiveTab(CAPABILITY_TABS[nextIndex].id);
        tabRefs.current[nextIndex]?.focus();
    }

    return (
        <>
            <Head title="Zenbase — Votre backend complet, prêt en quelques secondes">
                <meta
                    head-key="description"
                    name="description"
                    content="Zenbase est une plateforme Backend-as-a-Service (BaaS) multi-tenant propulsée par Laravel et SQLite JSON1 isolé : API NoSQL instantanées, Authentification JWT & OTP, stockage de fichiers, Web Functions PHP serverless et Serveur MCP natif."
                />
                <meta
                    head-key="og:title"
                    property="og:title"
                    content="Zenbase — Votre backend complet, prêt en quelques secondes"
                />
                <meta
                    head-key="og:description"
                    property="og:description"
                    content="API NoSQL isolées par SQLite JSON1, Authentification JWT & OTP, stockage cloisonné, Web Functions PHP et Serveur MCP natif pour l'IA."
                />
                <meta
                    head-key="twitter:title"
                    name="twitter:title"
                    content="Zenbase — Votre backend complet, prêt en quelques secondes"
                />
                <meta
                    head-key="twitter:description"
                    name="twitter:description"
                    content="API NoSQL isolées par SQLite JSON1, Authentification JWT & OTP, stockage cloisonné, Web Functions PHP et Serveur MCP natif pour l'IA."
                />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Geist:wght@400;500;600&family=Geist+Mono:wght@500&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <div className="zb-landing">
                {/* Sticky Top Navigation Bar */}
                <header className="zb-header">
                    <div className="zb-container-5xl zb-header__bar">
                        <Link
                            href={home()}
                            className="zb-brand"
                            aria-label="Zenbase, accueil"
                        >
                            <span className="zb-brand__mark" aria-hidden="true">
                                <AppLogoIcon />
                            </span>
                            <span className="zb-title-md zb-brand__name">
                                Zenbase
                            </span>
                        </Link>

                        <nav
                            aria-label="Navigation principale"
                            className="zb-nav"
                        >
                            <a
                                href="#features"
                                className="zb-nav__link zb-label-md"
                            >
                                Produits
                            </a>
                            <a
                                href="#workspace"
                                className="zb-nav__link zb-label-md"
                            >
                                <span>Solutions</span>
                                <ChevronDown size={14} aria-hidden="true" />
                            </a>
                            <a
                                href="#functions"
                                className="zb-nav__link zb-label-md"
                            >
                                <span>Functions</span>
                                <span
                                    role="status"
                                    className="zb-badge--brand-pill zb-label-sm"
                                >
                                    NEW
                                </span>
                            </a>
                            <a
                                href="#bento"
                                className="zb-nav__link zb-label-md"
                            >
                                Modules
                            </a>
                            <Link
                                href="/docs"
                                className="zb-nav__link zb-label-md"
                            >
                                Docs
                            </Link>
                        </nav>

                        <div className="zb-header__actions">
                            <button
                                type="button"
                                onClick={() =>
                                    updateAppearance(isDark ? 'light' : 'dark')
                                }
                                aria-label={
                                    isDark
                                        ? 'Passer en mode clair'
                                        : 'Passer en mode sombre'
                                }
                                className="zb-theme-toggle"
                            >
                                {isDark ? (
                                    <Sun size={16} aria-hidden="true" />
                                ) : (
                                    <Moon size={16} aria-hidden="true" />
                                )}
                            </button>

                            {user ? (
                                <Link
                                    href={primaryCtaHref}
                                    className="zb-btn-nav-primary zb-label-md"
                                >
                                    {primaryCtaLabel}
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="zb-btn-nav-secondary zb-label-md"
                                    >
                                        Connexion
                                    </Link>
                                    <Link
                                        href={register()}
                                        className="zb-btn-nav-primary zb-label-md"
                                    >
                                        Créer un compte
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="zb-main">
                    {/* Section 1: Hero with Animated Orbital Integration Rings & Floating Activity Stack */}
                    <section className="zb-hero">
                        <div className="zb-hero__orbits" aria-hidden="true">
                            <div className="zb-orbit-ring zb-orbit-ring--sm" />
                            <div className="zb-orbit-ring zb-orbit-ring--md" />
                            <div className="zb-orbit-ring zb-orbit-ring--lg" />

                            {/* Left Orbit Badges */}
                            <div className="zb-orbit-badge zb-orbit-badge--l1">
                                <FileCode2 size={18} className="zb-ink-rose" />
                            </div>
                            <div className="zb-orbit-badge zb-orbit-badge--l2">
                                <Code2 size={18} className="zb-ink-indigo" />
                            </div>
                            <div className="zb-orbit-badge zb-orbit-badge--l3">
                                <Database size={18} className="zb-ink-accent" />
                            </div>
                            <div className="zb-orbit-badge zb-orbit-badge--l4">
                                <Terminal size={18} />
                            </div>
                            <div className="zb-orbit-badge zb-orbit-badge--l5">
                                <Zap size={18} className="zb-ink-emerald" />
                            </div>

                            {/* Right Orbit Badges */}
                            <div className="zb-orbit-badge zb-orbit-badge--r1">
                                <Network size={18} className="zb-ink-rose" />
                            </div>
                            <div className="zb-orbit-badge zb-orbit-badge--r2">
                                <Cloud size={18} />
                            </div>
                            <div className="zb-orbit-badge zb-orbit-badge--r3">
                                <Server size={18} className="zb-ink-accent" />
                            </div>
                            <div className="zb-orbit-badge zb-orbit-badge--r4">
                                <Layers size={18} className="zb-ink-purple" />
                            </div>
                            <div className="zb-orbit-badge zb-orbit-badge--r5">
                                <Webhook size={18} className="zb-ink-indigo" />
                            </div>
                        </div>

                        <div className="zb-container-3xl zb-hero__content">
                            {/* Pill Strip */}
                            <div className="zb-rating-pill zb-anim-rise">
                                <span className="zb-rating-pill__item">
                                    <span className="zb-label-md zb-ink-accent">
                                        BaaS
                                    </span>
                                    <span className="zb-label-md zb-tabular">
                                        SQLite JSON1
                                    </span>
                                    <span className="zb-body-sm zb-muted">
                                        Isolé
                                    </span>
                                </span>
                                <span
                                    className="zb-rating-pill__sep"
                                    aria-hidden="true"
                                />
                                <span className="zb-rating-pill__item">
                                    <Star
                                        size={14}
                                        className="zb-ink-emerald"
                                        fill="currentColor"
                                        aria-hidden="true"
                                    />
                                    <span className="zb-label-md zb-tabular">
                                        PHP 8.5
                                    </span>
                                    <span className="zb-body-sm zb-muted">
                                        Web Functions &amp; MCP
                                    </span>
                                </span>
                            </div>

                            <h1 className="zb-display-lg zb-hero__title zb-anim-rise zb-anim-delay-1">
                                Lancez votre backend en secondes,{' '}
                                <span className="zb-hero__title-accent">
                                    pas en semaines.
                                </span>
                            </h1>

                            <p className="zb-body-lg zb-hero__subtitle zb-anim-rise zb-anim-delay-2">
                                Base NoSQL SQLite isolée, Auth OTP, stockage,
                                Web Functions PHP et serveur MCP : toute votre
                                infrastructure prête dès le premier clic.
                            </p>

                            <div className="zb-cta-row zb-hero__cta zb-anim-rise zb-anim-delay-3">
                                <Link
                                    href={primaryCtaHref}
                                    className="zb-btn-primary zb-label-lg"
                                >
                                    {primaryCtaLabel}
                                </Link>
                                <Link
                                    href="/docs"
                                    className="zb-btn-secondary zb-label-lg"
                                >
                                    Consulter la documentation
                                </Link>
                            </div>

                            {/* Stacked Activity Preview with Soft Emerald Glow */}
                            <div className="zb-hero-stack zb-anim-rise zb-anim-delay-4">
                                <div
                                    className="zb-glow-sky zb-hero-stack__glow"
                                    aria-hidden="true"
                                />
                                <div className="zb-hero-stack__cards">
                                    <div className="zb-activity-card zb-activity-card--top">
                                        <div className="zb-avatar zb-avatar--lg zb-badge--emerald">
                                            <span className="zb-label-md">
                                                ZB
                                            </span>
                                        </div>
                                        <div className="zb-card-body">
                                            <p className="zb-body-sm">
                                                Déploiement de{' '}
                                                <span className="zb-code-sm">
                                                    auth-webhook.php
                                                </span>
                                            </p>
                                            <p className="zb-label-sm zb-muted zb-tabular">
                                                Il y a 2 min · Sandbox PHP isolé
                                            </p>
                                        </div>
                                        <span className="zb-badge zb-badge--pill zb-badge--emerald zb-label-sm">
                                            Live
                                        </span>
                                    </div>

                                    <div className="zb-activity-card zb-activity-card--mid">
                                        <div className="zb-avatar zb-avatar--md zb-badge--indigo">
                                            <span className="zb-label-sm">
                                                MC
                                            </span>
                                        </div>
                                        <div className="zb-card-body">
                                            <p className="zb-body-sm">
                                                Serveur MCP connecté
                                            </p>
                                            <p className="zb-label-sm zb-muted zb-tabular">
                                                POST /mcp · 19 outils · zb_sec_…
                                            </p>
                                        </div>
                                    </div>

                                    <div className="zb-activity-card zb-activity-card--bot">
                                        <div className="zb-avatar zb-avatar--sm zb-badge--rose">
                                            <Database
                                                size={14}
                                                aria-hidden="true"
                                            />
                                        </div>
                                        <div className="zb-card-body">
                                            <p className="zb-label-sm zb-muted">
                                                Base synchronisée ·
                                                tenants/app_id.sqlite &amp;
                                                auth_users prêts
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Ecosystem / Stack Strip */}
                    <section className="zb-trusted">
                        <div className="zb-container-5xl">
                            <p className="zb-body-sm zb-trusted__label">
                                Conçu pour les équipes Laravel, TypeScript,
                                Mobile et Agents IA
                            </p>
                            <div className="zb-trusted__logos">
                                <span className="zb-trusted__logo">
                                    Laravel 13
                                </span>
                                <span className="zb-trusted__logo">
                                    SQLite JSON1
                                </span>
                                <span className="zb-trusted__logo">
                                    @hacp0012/zenbase-sdk
                                </span>
                                <span className="zb-trusted__logo">
                                    TypeScript
                                </span>
                                <span className="zb-trusted__logo zb-trusted__logo--caps">
                                    MCP SERVER
                                </span>
                                <span className="zb-trusted__logo zb-trusted__logo--italic">
                                    PHP 8.5
                                </span>
                                <span className="zb-trusted__logo">
                                    Auth OTP
                                </span>
                                <span className="zb-trusted__logo">
                                    Web Functions
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: 2x2 Feature Grid */}
                    <section id="features" className="zb-section">
                        <div className="zb-container-4xl">
                            <div className="zb-section-head zb-section-head--lg">
                                <h2 className="zb-headline-lg zb-section-head__title">
                                    Simplifiez vos opérations backend
                                    <br />
                                    pour livrer plus vite
                                </h2>
                            </div>

                            <div className="zb-grid-2x2">
                                <div
                                    className="zb-grid-2x2__dot"
                                    aria-hidden="true"
                                />

                                <div className="zb-feature-cell zb-feature-cell--tl">
                                    <div className="zb-feature-cell__icon zb-badge--indigo">
                                        <Rocket size={18} aria-hidden="true" />
                                    </div>
                                    <h3 className="zb-title-md zb-feature-cell__title">
                                        APIs instantanées par application
                                    </h3>
                                    <p className="zb-body-sm zb-feature-cell__desc">
                                        Exposez vos collections JSON, clés
                                        publiques/secrètes, règles CORS et rate
                                        limits sans code serveur répétitif.
                                    </p>
                                </div>

                                <div className="zb-feature-cell zb-feature-cell--tr">
                                    <div className="zb-feature-cell__icon zb-badge--emerald">
                                        <Zap size={18} aria-hidden="true" />
                                    </div>
                                    <h3 className="zb-title-md zb-feature-cell__title">
                                        Web Functions PHP isolées
                                    </h3>
                                    <p className="zb-body-sm zb-feature-cell__desc">
                                        Exécutez votre logique métier PHP dans
                                        un sandbox sécurisé avec variables .env
                                        et éditeur intégré.
                                    </p>
                                </div>

                                <div className="zb-feature-cell zb-feature-cell--bl">
                                    <div className="zb-feature-cell__icon zb-badge--purple">
                                        <Database
                                            size={18}
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <h3 className="zb-title-md zb-feature-cell__title">
                                        Isolation stricte SQLite JSON1
                                    </h3>
                                    <p className="zb-body-sm zb-feature-cell__desc">
                                        Chaque application possède son propre
                                        fichier SQLite et son répertoire de
                                        stockage dédié sous tenants/.
                                    </p>
                                </div>

                                <div className="zb-feature-cell zb-feature-cell--br">
                                    <div className="zb-feature-cell__icon zb-badge--rose">
                                        <Bot size={18} aria-hidden="true" />
                                    </div>
                                    <h3 className="zb-title-md zb-feature-cell__title">
                                        Serveur MCP &amp; Skills IA natifs
                                    </h3>
                                    <p className="zb-body-sm zb-feature-cell__desc">
                                        Connectez vos agents IA via POST /mcp
                                        avec permissions granulaires et bundle
                                        SKILL.md téléchargeable.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 4: All-in-One Workspace (2-Column Floating Showcases) */}
                    <section id="workspace" className="zb-section--compact">
                        <div className="zb-container-5xl">
                            <div className="zb-section-head">
                                <h2 className="zb-headline-lg zb-section-head__title">
                                    Votre espace backend tout-en-un
                                </h2>
                                <p className="zb-body-md zb-section-head__desc">
                                    Déployez vos fonctions PHP, gérez vos
                                    schémas NoSQL et inspectez les logs en
                                    direct dans une console unifiée.
                                </p>
                            </div>

                            <div className="zb-workspace-grid">
                                {/* Left Showcase */}
                                <div className="zb-showcase-panel">
                                    <div
                                        className="zb-glow-sky zb-showcase-panel__glow"
                                        aria-hidden="true"
                                    />
                                    <div className="zb-showcase-panel__inner">
                                        <div className="zb-float-card zb-float-card--max-sm">
                                            <div
                                                className="zb-row-gap-sm"
                                                style={{ marginBottom: '6px' }}
                                            >
                                                <span className="zb-circle-radio" />
                                                <span className="zb-title-md">
                                                    Auth, OTP &amp; Clés API
                                                </span>
                                            </div>
                                            <p
                                                className="zb-body-sm zb-muted"
                                                style={{ marginBottom: '12px' }}
                                            >
                                                Inscription mot de passe, codes
                                                OTP à 6 chiffres et tokens
                                                isolés par application…
                                            </p>
                                            <div className="zb-row-gap-sm">
                                                <span className="zb-badge zb-badge--rose zb-label-sm">
                                                    PHP 8.5
                                                </span>
                                                <span className="zb-badge zb-badge--emerald zb-label-sm">
                                                    Actif
                                                </span>
                                            </div>
                                        </div>

                                        <div className="zb-float-chip zb-float-chip--file">
                                            <div className="zb-row-gap-md">
                                                <span className="zb-badge zb-badge--rose zb-code-sm">
                                                    PHP
                                                </span>
                                                <div>
                                                    <p className="zb-label-md">
                                                        webhook_handler.php
                                                    </p>
                                                    <p className="zb-label-sm zb-muted zb-tabular">
                                                        2.4 KB
                                                    </p>
                                                </div>
                                            </div>
                                            <CheckCircle2
                                                size={18}
                                                className="zb-ink-emerald"
                                                aria-hidden="true"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Showcase */}
                                <div className="zb-showcase-panel">
                                    <div
                                        className="zb-glow-sky zb-showcase-panel__glow"
                                        aria-hidden="true"
                                    />
                                    <div className="zb-showcase-panel__inner">
                                        <div className="zb-float-chip">
                                            <Layers
                                                size={16}
                                                className="zb-ink-accent"
                                                aria-hidden="true"
                                            />
                                            <div>
                                                <p className="zb-label-sm">
                                                    Passerelle API v1
                                                </p>
                                                <p className="zb-label-sm zb-muted zb-tabular">
                                                    CORS &amp; Rate Limits
                                                </p>
                                            </div>
                                        </div>

                                        <div className="zb-float-card zb-float-card--md">
                                            <div className="zb-row-between">
                                                <div className="zb-row-gap-sm">
                                                    <Cpu
                                                        size={16}
                                                        className="zb-ink-accent"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="zb-title-md">
                                                        Tenant Isolé Zenbase
                                                    </span>
                                                </div>
                                                <span
                                                    role="status"
                                                    className="zb-badge zb-badge--pill zb-badge--emerald zb-label-sm"
                                                >
                                                    Actif
                                                </span>
                                            </div>
                                            <div className="zb-cluster-meta">
                                                <div>
                                                    <p
                                                        className="zb-label-sm zb-muted"
                                                        style={{
                                                            marginBottom: '4px',
                                                        }}
                                                    >
                                                        Espace Client
                                                    </p>
                                                    <div className="zb-row-gap-sm">
                                                        <span className="zb-avatar zb-avatar--xs zb-badge--indigo zb-label-sm">
                                                            CL
                                                        </span>
                                                        <span className="zb-label-md">
                                                            /dashboard
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p
                                                        className="zb-label-sm zb-muted"
                                                        style={{
                                                            marginBottom: '4px',
                                                        }}
                                                    >
                                                        Zenbase Core
                                                    </p>
                                                    <div className="zb-row-gap-sm">
                                                        <span className="zb-avatar zb-avatar--xs zb-badge--emerald zb-label-sm">
                                                            AD
                                                        </span>
                                                        <span className="zb-label-md">
                                                            /admin
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 5: Interactive Tabs + Split Feature */}
                    <section id="functions" className="zb-section">
                        <div className="zb-container-5xl">
                            <div className="zb-section-head">
                                <h2 className="zb-headline-lg zb-section-head__title">
                                    Déployez vos fonctions plus vite avec votre
                                    équipe
                                </h2>
                                <p className="zb-body-md zb-section-head__desc">
                                    Écrivez vos Web Functions PHP, gérez vos
                                    collections NoSQL et consultez les logs
                                    d’exécution en un seul endroit.
                                </p>
                            </div>

                            <div
                                role="tablist"
                                aria-label="Capacités de la plateforme Zenbase"
                                className="zb-tablist"
                            >
                                {CAPABILITY_TABS.map((tab, index) => {
                                    const isActive = activeTab === tab.id;
                                    const Icon =
                                        tab.id === 'functions'
                                            ? Code2
                                            : tab.id === 'database'
                                              ? Database
                                              : Eye;

                                    return (
                                        <button
                                            key={tab.id}
                                            ref={(el) => {
                                                tabRefs.current[index] = el;
                                            }}
                                            type="button"
                                            role="tab"
                                            id={`tab-${tab.id}`}
                                            aria-selected={isActive}
                                            aria-controls={`panel-${tab.id}`}
                                            tabIndex={isActive ? 0 : -1}
                                            onClick={() => setActiveTab(tab.id)}
                                            onKeyDown={(e) =>
                                                handleTabKeyDown(e, index)
                                            }
                                            className="zb-tab-btn zb-label-md"
                                        >
                                            <Icon
                                                size={16}
                                                aria-hidden="true"
                                            />
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Panel 1: Web Functions */}
                            <div
                                role="tabpanel"
                                id="panel-functions"
                                aria-labelledby="tab-functions"
                                hidden={activeTab !== 'functions'}
                                className="zb-tab-panel"
                            >
                                <div className="zb-tab-panel__copy">
                                    <h3 className="zb-headline-sm">
                                        Écrivez vos fonctions PHP, invoquez-les
                                        via SDK
                                    </h3>
                                    <p className="zb-body-md zb-tab-panel__desc">
                                        Découpez votre logique serveur en
                                        fonctions PHP validées dans un sandbox,
                                        avec variables .env isolées et stubs IDE
                                        téléchargeables.
                                    </p>
                                    <div className="zb-cta-row zb-cta-row--left">
                                        <Link
                                            href={primaryCtaHref}
                                            className="zb-btn-primary zb-label-lg"
                                        >
                                            {primaryCtaLabel}
                                        </Link>
                                        <Link
                                            href="/docs?doc=sdks/js-ts/docs/getting-started.md"
                                            className="zb-btn-secondary zb-label-lg"
                                        >
                                            Guide @hacp0012/zenbase-sdk
                                        </Link>
                                    </div>
                                </div>

                                <div className="zb-tab-panel__visual">
                                    <div
                                        className="zb-glow-sky zb-tab-panel__glow"
                                        aria-hidden="true"
                                    />
                                    <div className="zb-tab-panel__cards">
                                        <div className="zb-float-card">
                                            <div
                                                className="zb-row-gap-md"
                                                style={{
                                                    alignItems: 'flex-start',
                                                }}
                                            >
                                                <div className="zb-avatar zb-avatar--md zb-badge--emerald">
                                                    <span className="zb-label-sm">
                                                        FN
                                                    </span>
                                                </div>
                                                <div className="zb-card-body">
                                                    <p className="zb-body-sm">
                                                        Exécution de{' '}
                                                        <span className="zb-code-sm">
                                                            send-welcome.php
                                                        </span>
                                                    </p>
                                                    <p className="zb-label-sm zb-muted">
                                                        API v1 · Sandbox validé
                                                    </p>
                                                    <div className="zb-code-pill zb-code-sm">
                                                        200 OK · 14ms · JSON
                                                        retourné
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="zb-float-card zb-row-gap-md">
                                            <div className="zb-avatar zb-avatar--md zb-badge--indigo">
                                                <span className="zb-label-sm">
                                                    DB
                                                </span>
                                            </div>
                                            <div className="zb-card-body">
                                                <p className="zb-body-sm">
                                                    Collection créée :{' '}
                                                    <span className="zb-code-sm">
                                                        orders
                                                    </span>
                                                </p>
                                                <p className="zb-label-sm zb-muted">
                                                    Schéma JSON validé · SQLite
                                                    JSON1
                                                </p>
                                            </div>
                                        </div>

                                        <div className="zb-float-card zb-row-gap-md">
                                            <div className="zb-avatar zb-avatar--md zb-badge--purple">
                                                <span className="zb-label-sm">
                                                    AI
                                                </span>
                                            </div>
                                            <div className="zb-card-body">
                                                <p className="zb-body-sm">
                                                    Outil MCP invoqué :{' '}
                                                    <span className="zb-code-sm">
                                                        list_collections
                                                    </span>
                                                </p>
                                                <p className="zb-label-sm zb-muted">
                                                    Clé zb_sec_… · Journalisé
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Panel 2: Database */}
                            <div
                                role="tabpanel"
                                id="panel-database"
                                aria-labelledby="tab-database"
                                hidden={activeTab !== 'database'}
                                className="zb-tab-panel"
                            >
                                <div className="zb-tab-panel__copy">
                                    <h3 className="zb-headline-sm">
                                        SQLite JSON1 dédié pour chaque
                                        application
                                    </h3>
                                    <p className="zb-body-md zb-tab-panel__desc">
                                        Provisionnez automatiquement une base
                                        NoSQL isolée avec collections, schémas
                                        JSON optionnels et requêtes filtrées via
                                        @hacp0012/zenbase-sdk.
                                    </p>
                                    <div className="zb-cta-row zb-cta-row--left">
                                        <Link
                                            href={primaryCtaHref}
                                            className="zb-btn-primary zb-label-lg"
                                        >
                                            {primaryCtaLabel}
                                        </Link>
                                    </div>
                                </div>

                                <div className="zb-tab-panel__visual">
                                    <div
                                        className="zb-glow-sky zb-tab-panel__glow"
                                        aria-hidden="true"
                                    />
                                    <div className="zb-tab-panel__cards">
                                        <div className="zb-float-card">
                                            <p
                                                className="zb-code-sm"
                                                style={{ marginBottom: '8px' }}
                                            >
                                                await
                                                zb.collection(&apos;todos&apos;).where(&apos;completed&apos;,
                                                &apos;==&apos;, false).get()
                                            </p>
                                            <p className="zb-body-sm zb-muted">
                                                storage/app/tenants/app_&#123;id&#125;.sqlite
                                                · Isolation complète
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Panel 3: Observability */}
                            <div
                                role="tabpanel"
                                id="panel-observability"
                                aria-labelledby="tab-observability"
                                hidden={activeTab !== 'observability'}
                                className="zb-tab-panel"
                            >
                                <div className="zb-tab-panel__copy">
                                    <h3 className="zb-headline-sm">
                                        Journaux unifiés API, Auth, MCP et
                                        Storage
                                    </h3>
                                    <p className="zb-body-md zb-tab-panel__desc">
                                        Filtrez vos logs par source et code
                                        HTTP, repérez les blocages CORS ou Rate
                                        Limits 429 et exportez vos diagnostics
                                        en JSON.
                                    </p>
                                    <div className="zb-cta-row zb-cta-row--left">
                                        <Link
                                            href={primaryCtaHref}
                                            className="zb-btn-primary zb-label-lg"
                                        >
                                            {primaryCtaLabel}
                                        </Link>
                                    </div>
                                </div>

                                <div className="zb-tab-panel__visual">
                                    <div
                                        className="zb-glow-sky zb-tab-panel__glow"
                                        aria-hidden="true"
                                    />
                                    <div className="zb-tab-panel__cards">
                                        <div className="zb-float-card">
                                            <p
                                                className="zb-code-sm zb-ink-emerald"
                                                style={{ marginBottom: '8px' }}
                                            >
                                                [INFO] POST
                                                /api/v1/functions/invoice-pdf
                                                200 (12ms)
                                            </p>
                                            <p className="zb-body-sm zb-muted">
                                                Rétention 7 jours · Secrets
                                                masqués automatiquement
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 6: 3-Column Bento Grid */}
                    <section id="bento" className="zb-section--compact">
                        <div className="zb-container-5xl">
                            <div className="zb-section-head">
                                <h2 className="zb-headline-lg zb-section-head__title">
                                    Créez vos APIs et livrez vos fonctions PHP
                                    sans friction
                                </h2>
                                <p className="zb-body-md zb-section-head__desc">
                                    Des briques BaaS pensées pour structurer,
                                    sécuriser et faire évoluer chaque
                                    application au quotidien.
                                </p>
                            </div>

                            <div className="zb-bento-grid">
                                {/* Bento Card 1 */}
                                <article className="zb-bento-card">
                                    <div className="zb-bento-well">
                                        <div className="zb-bento-stack-1">
                                            <span className="zb-label-sm zb-muted">
                                                SQLite JSON1
                                            </span>
                                        </div>
                                        <div className="zb-bento-stack-2">
                                            <span className="zb-label-sm">
                                                Auth &amp; OTP 6 chiffres
                                            </span>
                                        </div>
                                        <div className="zb-bento-stack-3">
                                            <div
                                                className="zb-row-gap-sm"
                                                style={{ marginBottom: '2px' }}
                                            >
                                                <FolderOpen
                                                    size={15}
                                                    className="zb-ink-accent"
                                                    aria-hidden="true"
                                                />
                                                <span className="zb-label-md">
                                                    Stockage cloisonné
                                                </span>
                                            </div>
                                            <p className="zb-label-sm zb-muted">
                                                Quotas suivis par compte et
                                                plateforme
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <div
                                            className="zb-row-gap-sm"
                                            style={{ marginBottom: '6px' }}
                                        >
                                            <ShieldCheck
                                                size={16}
                                                className="zb-ink-emerald"
                                                aria-hidden="true"
                                            />
                                            <h3 className="zb-title-md">
                                                Cloisonnement par projet
                                            </h3>
                                        </div>
                                        <p className="zb-body-sm zb-muted">
                                            Regroupez base SQLite, variables
                                            .env, origines CORS et quotas
                                            proprement pour chaque application.
                                        </p>
                                    </div>
                                </article>

                                {/* Bento Card 2 */}
                                <article className="zb-bento-card">
                                    <div className="zb-bento-well">
                                        <div className="zb-webhook-box">
                                            <div
                                                className="zb-row-between"
                                                style={{ marginBottom: '8px' }}
                                            >
                                                <Bot
                                                    size={16}
                                                    className="zb-ink-accent"
                                                    aria-hidden="true"
                                                />
                                                <span className="zb-switch-pill">
                                                    <span className="zb-switch-pill__knob" />
                                                </span>
                                            </div>
                                            <p
                                                className="zb-label-md"
                                                style={{ marginBottom: '2px' }}
                                            >
                                                Serveur MCP
                                            </p>
                                            <p
                                                className="zb-label-sm zb-muted"
                                                style={{ marginBottom: '10px' }}
                                            >
                                                Outils IA lecture / écriture
                                            </p>
                                            <span className="zb-badge zb-badge--pill zb-badge--neutral zb-label-sm">
                                                <Settings
                                                    size={11}
                                                    aria-hidden="true"
                                                />
                                                Configurer
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <div
                                            className="zb-row-gap-sm"
                                            style={{ marginBottom: '6px' }}
                                        >
                                            <Puzzle
                                                size={16}
                                                className="zb-ink-purple"
                                                aria-hidden="true"
                                            />
                                            <h3 className="zb-title-md">
                                                Intégrations &amp; Skills IA
                                            </h3>
                                        </div>
                                        <p className="zb-body-sm zb-muted">
                                            Connectez @hacp0012/zenbase-sdk, votre IDE et
                                            vos assistants IA grâce au serveur
                                            MCP et aux fichiers SKILL.md.
                                        </p>
                                    </div>
                                </article>

                                {/* Bento Card 3 */}
                                <article className="zb-bento-card">
                                    <div className="zb-bento-well">
                                        <span className="zb-mini-add-btn zb-label-sm">
                                            <Plus
                                                size={13}
                                                className="zb-ink-accent"
                                                aria-hidden="true"
                                            />
                                            Nouvelle fonction
                                        </span>

                                        <div className="zb-upload-box">
                                            <div className="zb-row-between">
                                                <div className="zb-row-gap-sm">
                                                    <span className="zb-badge zb-badge--rose zb-code-sm">
                                                        PHP
                                                    </span>
                                                    <span className="zb-label-md">
                                                        invoice-pdf.php
                                                    </span>
                                                </div>
                                                <span className="zb-label-sm zb-muted zb-tabular">
                                                    92%
                                                </span>
                                            </div>
                                            <div className="zb-progress-track">
                                                <div className="zb-progress-fill" />
                                            </div>
                                            <p className="zb-label-sm zb-muted zb-tabular">
                                                14.8 KB sur 16.0 KB · Sandbox
                                                validé
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <div
                                            className="zb-row-gap-sm"
                                            style={{ marginBottom: '6px' }}
                                        >
                                            <CloudUpload
                                                size={16}
                                                className="zb-ink-rose"
                                                aria-hidden="true"
                                            />
                                            <h3 className="zb-title-md">
                                                Déploiement Web Functions
                                            </h3>
                                        </div>
                                        <p className="zb-body-sm zb-muted">
                                            Écrivez ou importez un script PHP
                                            depuis la console et obtenez un
                                            endpoint HTTPS prêt immédiatement.
                                        </p>
                                    </div>
                                </article>
                            </div>
                        </div>
                    </section>

                    {/* Section 7: Split Timeline + Developer Proof */}
                    <section className="zb-section">
                        <div className="zb-container-5xl zb-timeline-grid">
                            <div className="zb-timeline-left">
                                <div>
                                    <h2
                                        className="zb-headline-lg"
                                        style={{ marginBottom: '16px' }}
                                    >
                                        Structurez votre logique et accélérez
                                        vos livraisons
                                    </h2>
                                    <p
                                        className="zb-body-md zb-muted"
                                        style={{
                                            maxWidth: '448px',
                                            marginBottom: '24px',
                                        }}
                                    >
                                        Du simple prototype au produit complet,
                                        gouvernez données, utilisateurs, quotas
                                        et limites de débit avec clarté.
                                    </p>
                                    <div className="zb-cta-row zb-cta-row--left">
                                        <Link
                                            href={primaryCtaHref}
                                            className="zb-btn-primary zb-label-lg"
                                        >
                                            {primaryCtaLabel}
                                        </Link>
                                        <Link
                                            href="/docs"
                                            className="zb-btn-secondary zb-label-lg"
                                        >
                                            Explorer /docs
                                        </Link>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        paddingTop: '16px',
                                    }}
                                >
                                    <div className="zb-avatar-stack">
                                        <span className="zb-avatar-stack__item zb-badge--indigo zb-label-sm">
                                            DB
                                        </span>
                                        <span className="zb-avatar-stack__item zb-badge--emerald zb-label-sm">
                                            AU
                                        </span>
                                        <span className="zb-avatar-stack__item zb-badge--purple zb-label-sm">
                                            FN
                                        </span>
                                        <span className="zb-avatar-stack__item zb-badge--rose zb-label-sm">
                                            AI
                                        </span>
                                        <span className="zb-avatar-stack__item zb-badge--neutral zb-label-sm">
                                            +
                                        </span>
                                    </div>
                                    <p
                                        className="zb-body-sm zb-muted"
                                        style={{ maxWidth: '320px' }}
                                    >
                                        Une architecture Core + Tenants isolés
                                        pensée pour les développeurs Laravel et
                                        JavaScript.
                                    </p>
                                </div>
                            </div>

                            <div className="zb-timeline-right">
                                <div
                                    className="zb-timeline-rail"
                                    aria-hidden="true"
                                />

                                <div className="zb-timeline-item">
                                    <div className="zb-timeline-node">
                                        <Database
                                            size={16}
                                            className="zb-ink-accent"
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <div>
                                        <h3
                                            className="zb-title-md"
                                            style={{ marginBottom: '4px' }}
                                        >
                                            Base NoSQL SQLite JSON1
                                        </h3>
                                        <p className="zb-body-sm zb-muted">
                                            Créez vos collections, validez vos
                                            schémas JSON et interrogez vos
                                            documents dans une base dédiée par
                                            app.
                                        </p>
                                    </div>
                                </div>

                                <div className="zb-timeline-item">
                                    <div className="zb-timeline-node">
                                        <Code2 size={16} aria-hidden="true" />
                                    </div>
                                    <div>
                                        <h3
                                            className="zb-title-md"
                                            style={{ marginBottom: '4px' }}
                                        >
                                            Web Functions PHP Serverless
                                        </h3>
                                        <p className="zb-body-sm zb-muted">
                                            Exécutez des endpoints PHP 8.5
                                            isolés avec injection de variables
                                            .env et accès direct à votre tenant.
                                        </p>
                                    </div>
                                </div>

                                <div className="zb-timeline-item">
                                    <div className="zb-timeline-node">
                                        <Zap
                                            size={16}
                                            className="zb-ink-purple"
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <div>
                                        <h3
                                            className="zb-title-md"
                                            style={{ marginBottom: '4px' }}
                                        >
                                            Rate Limits, CORS &amp; Logs
                                        </h3>
                                        <p className="zb-body-sm zb-muted">
                                            Protégez chaque module par seuils
                                            configurables et inspectez tous les
                                            appels API, Auth, MCP et Storage.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 8: Bottom Dashboard Preview */}
                    <section id="dashboard" className="zb-dashboard-sec">
                        <div className="zb-container-5xl">
                            <div
                                className="zb-section-head"
                                style={{ marginBottom: '40px' }}
                            >
                                <h2 className="zb-headline-lg zb-section-head__title">
                                    Gestion backend claire
                                    <br />
                                    pour vos applications en croissance
                                </h2>
                                <p
                                    className="zb-body-md zb-section-head__desc"
                                    style={{ marginBottom: '24px' }}
                                >
                                    Organisez vos Web Functions PHP, explorez
                                    vos collections SQLite et suivez vos logs
                                    depuis la console Zenbase.
                                </p>
                                <div className="zb-cta-row">
                                    <Link
                                        href={primaryCtaHref}
                                        className="zb-btn-primary zb-label-lg"
                                    >
                                        {primaryCtaLabel}
                                    </Link>
                                    <Link
                                        href={
                                            user ? '/admin/dashboard' : login()
                                        }
                                        className="zb-btn-secondary zb-label-lg"
                                    >
                                        Espace Administrateur
                                    </Link>
                                </div>
                            </div>

                            {/* Dashboard Preview Window */}
                            <div className="zb-dashboard-frame-wrap">
                                <div
                                    className="zb-glow-sky zb-dashboard-glow"
                                    aria-hidden="true"
                                />
                                <div className="zb-dashboard-window">
                                    <aside className="zb-dash-sidebar">
                                        <div
                                            className="zb-row-gap-sm"
                                            style={{
                                                padding: '8px',
                                                marginBottom: '12px',
                                            }}
                                        >
                                            <span
                                                className="zb-brand__mark"
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                }}
                                            >
                                                <AppLogoIcon />
                                            </span>
                                            <span className="zb-title-md">
                                                Zenbase
                                            </span>
                                        </div>
                                        <div className="zb-dash-nav-item zb-dash-nav-item--active zb-label-md">
                                            <LayoutDashboard
                                                size={16}
                                                aria-hidden="true"
                                            />
                                            <span>Dashboard</span>
                                        </div>
                                        <div className="zb-dash-nav-item zb-label-md">
                                            <Code2
                                                size={16}
                                                aria-hidden="true"
                                            />
                                            <span>Functions</span>
                                        </div>
                                        <div className="zb-dash-nav-item zb-label-md">
                                            <Database
                                                size={16}
                                                aria-hidden="true"
                                            />
                                            <span>Base NoSQL</span>
                                        </div>
                                        <div className="zb-dash-nav-item zb-label-md">
                                            <Users
                                                size={16}
                                                aria-hidden="true"
                                            />
                                            <span>Auth &amp; Users</span>
                                        </div>
                                        <div className="zb-dash-nav-item zb-label-md">
                                            <Terminal
                                                size={16}
                                                aria-hidden="true"
                                            />
                                            <span>Logs</span>
                                        </div>
                                    </aside>

                                    <div className="zb-dash-main">
                                        <div className="zb-dash-topbar">
                                            <span className="zb-title-lg">
                                                Dashboard
                                            </span>
                                            <div className="zb-row-gap-md">
                                                <div className="zb-dash-search">
                                                    <Search
                                                        size={14}
                                                        aria-hidden="true"
                                                    />
                                                    <span className="zb-body-sm">
                                                        Rechercher une fonction…
                                                    </span>
                                                </div>
                                                <span className="zb-dash-bell">
                                                    <Bell
                                                        size={15}
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '16px' }}>
                                            <p className="zb-title-md">
                                                Web Functions — Actives
                                            </p>
                                            <p className="zb-body-sm zb-muted">
                                                Endpoints PHP 8.5 isolés et
                                                prêts à l’invocation via API v1
                                                ou MCP
                                            </p>
                                        </div>

                                        <div className="zb-kanban-grid">
                                            <div className="zb-kanban-col">
                                                <div className="zb-row-between">
                                                    <span className="zb-label-md">
                                                        Brouillon
                                                    </span>
                                                    <MoreHorizontal
                                                        size={14}
                                                        className="zb-muted"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                                <div className="zb-kanban-card">
                                                    <p
                                                        className="zb-code-sm"
                                                        style={{
                                                            marginBottom: '4px',
                                                        }}
                                                    >
                                                        stripe-checkout.php
                                                    </p>
                                                    <p
                                                        className="zb-body-sm zb-muted"
                                                        style={{
                                                            marginBottom:
                                                                '10px',
                                                        }}
                                                    >
                                                        Valide le panier et crée
                                                        la session.
                                                    </p>
                                                    <div className="zb-row-gap-sm">
                                                        <span className="zb-badge zb-badge--rose zb-label-sm">
                                                            PHP 8.5
                                                        </span>
                                                        <span className="zb-badge zb-badge--neutral zb-label-sm zb-tabular">
                                                            12ms
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="zb-kanban-col">
                                                <div className="zb-row-between">
                                                    <span className="zb-label-md">
                                                        Validation
                                                    </span>
                                                    <MoreHorizontal
                                                        size={14}
                                                        className="zb-muted"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                                <div className="zb-kanban-card">
                                                    <p
                                                        className="zb-code-sm"
                                                        style={{
                                                            marginBottom: '4px',
                                                        }}
                                                    >
                                                        auth-otp-mailer.php
                                                    </p>
                                                    <p
                                                        className="zb-body-sm zb-muted"
                                                        style={{
                                                            marginBottom:
                                                                '10px',
                                                        }}
                                                    >
                                                        Envoie les codes OTP à 6
                                                        chiffres.
                                                    </p>
                                                    <div className="zb-row-gap-sm">
                                                        <span className="zb-badge zb-badge--purple zb-label-sm">
                                                            Sandbox
                                                        </span>
                                                        <span className="zb-badge zb-badge--neutral zb-label-sm">
                                                            .env
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="zb-kanban-col">
                                                <div className="zb-row-between">
                                                    <span className="zb-label-md">
                                                        Actif
                                                    </span>
                                                    <MoreHorizontal
                                                        size={14}
                                                        className="zb-muted"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                                <div className="zb-kanban-card">
                                                    <p
                                                        className="zb-code-sm"
                                                        style={{
                                                            marginBottom: '4px',
                                                        }}
                                                    >
                                                        pdf-invoice-gen.php
                                                    </p>
                                                    <p
                                                        className="zb-body-sm zb-muted"
                                                        style={{
                                                            marginBottom:
                                                                '10px',
                                                        }}
                                                    >
                                                        Génère et stocke les
                                                        reçus client.
                                                    </p>
                                                    <div className="zb-row-gap-sm">
                                                        <span className="zb-badge zb-badge--emerald zb-label-sm">
                                                            Live
                                                        </span>
                                                        <span className="zb-badge zb-badge--neutral zb-label-sm zb-tabular">
                                                            14ms
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="zb-kanban-col">
                                                <div className="zb-row-between">
                                                    <span className="zb-label-md">
                                                        MCP IA
                                                    </span>
                                                    <MoreHorizontal
                                                        size={14}
                                                        className="zb-muted"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                                <div className="zb-kanban-card">
                                                    <p
                                                        className="zb-code-sm"
                                                        style={{
                                                            marginBottom: '4px',
                                                        }}
                                                    >
                                                        sync-catalog.php
                                                    </p>
                                                    <p
                                                        className="zb-body-sm zb-muted"
                                                        style={{
                                                            marginBottom:
                                                                '10px',
                                                        }}
                                                    >
                                                        Synchronise la
                                                        collection produits.
                                                    </p>
                                                    <div className="zb-row-gap-sm">
                                                        <span className="zb-badge zb-badge--indigo zb-label-sm">
                                                            MCP
                                                        </span>
                                                        <span className="zb-badge zb-badge--neutral zb-label-sm zb-tabular">
                                                            200 OK
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>

                {/* Clean Footer */}
                <footer className="zb-footer">
                    <div className="zb-container-5xl zb-footer__inner">
                        <Link
                            href={home()}
                            className="zb-brand"
                            aria-label="Zenbase, retour à l’accueil"
                        >
                            <span className="zb-brand__mark" aria-hidden="true">
                                <AppLogoIcon />
                            </span>
                            <span className="zb-title-md zb-brand__name">
                                Zenbase
                            </span>
                        </Link>

                        <div className="zb-footer__links">
                            <Link
                                href={user ? dashboard() : login()}
                                className="zb-footer__link zb-label-md"
                            >
                                Espace Client
                            </Link>
                            <Link
                                href={user ? '/admin/dashboard' : login()}
                                className="zb-footer__link zb-label-md"
                            >
                                Espace Admin
                            </Link>
                            <Link
                                href="/docs"
                                className="zb-footer__link zb-label-md"
                            >
                                Documentation
                            </Link>
                            <Link
                                href="/docs?doc=sdks/js-ts/docs/getting-started.md"
                                className="zb-footer__link zb-label-md"
                            >
                                Guide SDK
                            </Link>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
