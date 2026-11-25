import { Head, Link, usePage } from "@inertiajs/react";
import {
    ArrowLeft,
    BookOpen,
    Compass,
    Home,
    Moon,
    ShieldAlert,
    Sun,
    Terminal,
} from "lucide-react";
import AppLogoIcon from "@/components/app-logo-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/hooks/use-appearance";
import { dashboard, docs, home } from "@/routes";
import type { Auth } from "@/types";

export default function NotFoundPage({
    status = 404,
    path,
}: {
    status?: number;
    path?: string;
}) {
    const page = usePage<{ auth?: Auth }>();
    const user = page.props.auth?.user;
    const { resolvedAppearance, updateAppearance } = useAppearance();

    const displayedPath =
        path ??
        (typeof window !== "undefined" ? window.location.pathname : "/404");

    return (
        <>
            <Head title={`${status} — Page introuvable · Zenbase`} />

            <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
                {/* Ambient decorative gradient */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                    <div className="absolute -top-32 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/15" />
                </div>

                {/* Top bar */}
                <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
                    <Link href={home()} className="flex items-center gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                            <AppLogoIcon className="size-5 text-white" />
                        </div>
                        <span className="text-base font-bold tracking-tight">
                            Zenbase
                        </span>
                    </Link>

                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                            updateAppearance(
                                resolvedAppearance === "dark"
                                    ? "light"
                                    : "dark",
                            )
                        }
                    >
                        {resolvedAppearance === "dark" ? (
                            <Sun className="mr-1.5 size-3.5 text-amber-400" />
                        ) : (
                            <Moon className="mr-1.5 size-3.5 text-zinc-600" />
                        )}
                        {resolvedAppearance === "dark"
                            ? "Mode Clair"
                            : "Mode Sombre"}
                    </Button>
                </header>

                {/* Main 404 Card */}
                <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                    <div className="w-full rounded-3xl border border-zinc-200/90 bg-white/95 p-8 shadow-xl backdrop-blur sm:p-12 dark:border-zinc-800 dark:bg-zinc-900/95">
                        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                            <Compass className="size-8" />
                        </div>

                        <Badge
                            variant="outline"
                            className="mb-3 border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                        >
                            ERREUR HTTP {status} · ROUTE INDISPONIBLE
                        </Badge>

                        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                            Cette route n&apos;existe pas sur Zenbase
                        </h1>

                        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                            La ressource ou la page que vous tentez de consulter
                            est introuvable, a été déplacée ou son identifiant
                            est invalide.
                        </p>

                        {/* Monokai-styled terminal path preview */}
                        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-300 bg-[#FAFAF8] px-4 py-3 text-left font-mono text-xs text-[#272822] dark:border-zinc-800 dark:bg-[#1E1F1C] dark:text-[#F8F8F2]">
                            <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                                <span className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-[#F92672]" />
                                    <span className="size-2 rounded-full bg-[#FD971F]" />
                                    <span className="size-2 rounded-full bg-[#A6E22E]" />
                                    <span className="ml-1">zenbase-router</span>
                                </span>
                                <span className="text-[#F92672]">
                                    404 Not Found
                                </span>
                            </div>
                            <div className="mt-2 truncate">
                                <span className="text-[#F92672]">GET</span>{" "}
                                <span className="text-[#A6E22E]">
                                    /{displayedPath.replace(/^\/+/, "")}
                                </span>{" "}
                                <span className="text-zinc-500">
                                    — Aucune route correspondante
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.history.back()}
                            >
                                <ArrowLeft className="mr-1.5 size-4" />
                                Page précédente
                            </Button>

                            <Button asChild variant="outline">
                                <Link href={home()}>
                                    <Home className="mr-1.5 size-4" />
                                    Accueil
                                </Link>
                            </Button>

                            {user &&
                                (user.is_admin ? (
                                    <Button
                                        asChild
                                        className="bg-amber-600 text-white hover:bg-amber-500"
                                    >
                                        <Link href="/admin/dashboard">
                                            <ShieldAlert className="mr-1.5 size-4" />
                                            Console Admin
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button
                                        asChild
                                        className="bg-emerald-600 text-white hover:bg-emerald-500"
                                    >
                                        <Link href={dashboard()}>
                                            <Terminal className="mr-1.5 size-4" />
                                            Mon Dashboard
                                        </Link>
                                    </Button>
                                ))}

                            <Button asChild variant="secondary">
                                <Link href={docs()}>
                                    <BookOpen className="mr-1.5 size-4" />
                                    Documentation SDK
                                </Link>
                            </Button>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="relative z-10 py-5 text-center text-xs text-zinc-400">
                    Zenbase BaaS · Noyau Multi-Tenant &amp; SQLite JSON1
                </footer>
            </div>
        </>
    );
}
