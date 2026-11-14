import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    Code2,
    Cpu,
    Database,
    FileCode2,
    FolderOpen,
    Globe,
    KeyRound,
    Layers,
    ShieldAlert,
    Sparkles,
    Terminal,
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { PrismCodeBlock } from '@/components/prism-code-block';
import { dashboard, login, register } from '@/routes';
import type { Auth } from '@/types';

const WELCOME_SDK_SNIPPET = `import { Zenbase } from '@zenbase/sdk';

const zb = new Zenbase({
  endpoint: 'https://api.zenbase.local',
  apiKey: 'zb_pub_abcdef123456',
});

// 1. Base de données NoSQL (propulsée par SQLite JSON1 isolé)
await zb.collection('todos').create({ title: 'Apprendre Zenbase', completed: false });
const todos = await zb.collection('todos').where('completed', '==', false).get();

// 2. Authentification (Email/Mot de passe & OTP par e-mail)
await zb.auth.signUp('user@example.com', 'monSuperMotDePasse');
await zb.auth.sendOtp('user@example.com');
const session = await zb.auth.verifyOtp('user@example.com', '123456');

// 3. Stockage de fichiers isolé par application
const { fileUrl } = await zb.storage.upload('avatars/profile.png', file);

// 4. Invocation de Web Functions PHP Serverless
const { data } = await zb.functions.invoke('send-welcome-email', { name: 'Alex' });`;

export default function Welcome() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const user = auth?.user;

    return (
        <>
            <Head title="Zenbase — Backend-as-a-Service Modulaire & Gratuit" />
            <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
                {/* Header */}
                <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                                <AppLogoIcon className="size-6 text-white" />
                            </div>
                            <div>
                                <span className="text-lg font-bold tracking-tight">Zenbase</span>
                                <span className="ml-2 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    BaaS Open & Gratuit
                                </span>
                            </div>
                        </div>

                        <nav className="flex flex-wrap items-center gap-3">
                            <Link
                                href="/docs"
                                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100/80 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                                <BookOpen className="size-4 text-emerald-600" />
                                Documentation (SDK)
                            </Link>

                            {user ? (
                                user.is_admin ? (
                                    <Link
                                        href="/admin/dashboard"
                                        className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-500"
                                    >
                                        <ShieldAlert className="size-4" />
                                        Espace Administrateur
                                        <ArrowRight className="size-4" />
                                    </Link>
                                ) : (
                                    <Link
                                        href={dashboard()}
                                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500"
                                    >
                                        Espace Client / Développeur
                                        <ArrowRight className="size-4" />
                                    </Link>
                                )
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    >
                                        Connexion
                                    </Link>
                                    <Link
                                        href={register()}
                                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500"
                                    >
                                        Créer un compte gratuit
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                {/* Hero + Entry Points */}
                <main className="mx-auto max-w-7xl px-6 py-16">
                    <div className="mx-auto max-w-3xl text-center">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            <Sparkles className="size-3.5" />
                            Architecture Modulaire : Zenbase Core + Isolation SQLite JSON1 + SDK TypeScript
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                            Votre plateforme{' '}
                            <span className="text-emerald-600 dark:text-emerald-400">
                                Backend-as-a-Service
                            </span>{' '}
                            complète et isolée
                        </h1>
                        <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                            Créez des applications en un clic avec chacune sa propre base SQLite orientée documents (NoSQL), son système d&apos;authentification (Email/Mot de passe & OTP), son stockage de fichiers, ses règles CORS dynamiques et ses Web Functions PHP isolées.
                        </p>
                    </div>

                    {/* Three Entry Portals: Client, Admin, and SDK Documentation */}
                    <div className="mt-12 grid gap-6 lg:grid-cols-3">
                        {/* Portal 1: Client / Developer Space */}
                        <div className="flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-white p-7 shadow-sm transition hover:border-emerald-500 dark:bg-zinc-900">
                            <div>
                                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
                                    <Terminal className="size-6" />
                                </div>
                                <span className="ml-3 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    Porte d&apos;entrée Développeur
                                </span>
                                <h2 className="mt-3 text-xl font-bold">
                                    Espace Client / Développeur
                                </h2>
                                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                    Créez et pilotez vos applications, récupérez vos clés API (<code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">zb_pub_...</code> et <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">zb_sec_...</code>), explorez vos collections NoSQL et vos Web Functions.
                                </p>
                                <ul className="mt-5 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                                    <li className="flex items-center gap-2">
                                        <Database className="size-4 shrink-0 text-emerald-600" />
                                        Explorateur NoSQL (Collections & Documents JSON)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <KeyRound className="size-4 shrink-0 text-emerald-600" />
                                        Utilisateurs Auth (Email/Password & OTP)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <FolderOpen className="size-4 shrink-0 text-emerald-600" />
                                        Stockage de Fichiers & Règles CORS
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Cpu className="size-4 shrink-0 text-emerald-600" />
                                        Web Functions PHP Serverless
                                    </li>
                                </ul>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    href={user ? dashboard() : login()}
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                                >
                                    Accéder à l&apos;Espace Client
                                    <ArrowRight className="size-4" />
                                </Link>
                            </div>
                        </div>

                        {/* Portal 2: Administrator Space */}
                        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm transition hover:border-amber-500/60 dark:border-zinc-800 dark:bg-zinc-900">
                            <div>
                                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <ShieldAlert className="size-6" />
                                </div>
                                <span className="ml-3 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    Porte d&apos;entrée Super-Admin
                                </span>
                                <h2 className="mt-3 text-xl font-bold">Espace Administrateur</h2>
                                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                    Supervisez la Base de Données Centrale (Core) de Zenbase : gérez les comptes clients inscrits, surveillez les applications créées et la santé du système.
                                </p>
                                <ul className="mt-5 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                                    <li className="flex items-center gap-2">
                                        <Layers className="size-4 shrink-0 text-amber-500" />
                                        Dashboard Global : clients, apps actives, stockage
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Globe className="size-4 shrink-0 text-amber-500" />
                                        Gestion des Clients : création, suspension, suppression
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Code2 className="size-4 shrink-0 text-amber-500" />
                                        Monitoring Global : santé du système, SQLite & logs
                                    </li>
                                </ul>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    href={user ? '/admin/dashboard' : login()}
                                    className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                >
                                    Accéder à l&apos;Espace Admin
                                    <ArrowRight className="size-4" />
                                </Link>
                            </div>
                        </div>

                        {/* Portal 3: SDK & Markdown Documentation (/docs) */}
                        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm transition hover:border-blue-500/60 dark:border-zinc-800 dark:bg-zinc-900">
                            <div>
                                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <BookOpen className="size-6" />
                                </div>
                                <span className="ml-3 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                    Documentation SDK (/docs)
                                </span>
                                <h2 className="mt-3 text-xl font-bold">
                                    Documentation & SDKs
                                </h2>
                                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                    Consultez la documentation officielle générée directement depuis les fichiers Markdown (<code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">/docs</code> &amp; <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">/sdks/*</code>) pour intégrer Zenbase dans vos projets.
                                </p>
                                <ul className="mt-5 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                                    <li className="flex items-center gap-2">
                                        <FileCode2 className="size-4 shrink-0 text-blue-500" />
                                        SDK Node.js & Web (@zenbase/sdk)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Database className="size-4 shrink-0 text-blue-500" />
                                        Guide complet Database NoSQL, Auth OTP, Storage & Functions
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Layers className="size-4 shrink-0 text-blue-500" />
                                        Architecture extensible (futurs SDKs Dart/Flutter, Python)
                                    </li>
                                </ul>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-2.5">
                                <Link
                                    href="/docs"
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                                >
                                    Ouvrir la Documentation
                                    <ArrowRight className="size-4" />
                                </Link>
                                <Link
                                    href="/docs?doc=sdks/js-ts/docs/usage.md"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 px-3.5 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                    Guide SDK Node.js & Web
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* SDK Code Preview */}
                    <div className="mt-14 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                                Exemple d&apos;utilisation du SDK Node.js & Web (@zenbase/sdk)
                            </span>
                            <Link
                                href="/docs?doc=sdks/js-ts/docs/usage.md"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                            >
                                <BookOpen className="size-3.5" />
                                Lire la documentation complète (sdks/js-ts/docs/usage.md)
                            </Link>
                        </div>
                        <PrismCodeBlock
                            code={WELCOME_SDK_SNIPPET}
                            language="typescript"
                            title="@zenbase/sdk — quickstart.ts"
                        />
                    </div>
                </main>
            </div>
        </>
    );
}
