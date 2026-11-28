import { Head, Link } from '@inertiajs/react';
import {
    BookOpen,
    Download,
    Eye,
    FolderArchive,
    Plug,
    Terminal,
} from 'lucide-react';
import { useState } from 'react';
import {
    downloadSkill,
    downloadSkillsBundle,
} from '@/actions/App/Http/Controllers/Dashboard/AppMcpController';
import { mcp as showMcpPage } from '@/actions/App/Http/Controllers/Dashboard/ClientAppController';
import { PrismCodeBlock } from '@/components/prism-code-block';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { dashboard } from '@/routes';
import type { ZenbaseAgentSkillInfo, ZenbaseApp } from '@/types';

const AGENT_SKILL_PATHS = [
    {
        client: 'Antigravity',
        path: '.agents/skills/',
        description:
            'Découverte automatique à la racine du workspace (partageable en équipe via Git).',
    },
    {
        client: 'Cursor',
        path: '.cursor/skills/',
        description:
            'Activé automatiquement à la demande selon le contexte du prompt.',
    },
    {
        client: 'Claude Code',
        path: '.claude/skills/',
        description:
            'Chargement progressif (progressive disclosure) dans le projet client.',
    },
];

export default function ClientAppSkills({
    app,
    mcpSkills = [],
}: {
    app: ZenbaseApp;
    mcpSkills?: ZenbaseAgentSkillInfo[];
}) {
    const [previewSkill, setPreviewSkill] =
        useState<ZenbaseAgentSkillInfo | null>(null);

    return (
        <>
            <Head title={`${app.name} — Skills Agents IA`} />
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <BookOpen className="size-4 text-emerald-600" />
                                    Skills Agents IA ({mcpSkills.length})
                                </CardTitle>
                                <CardDescription>
                                    Téléchargez ces skills prêts à l&apos;emploi
                                    dans votre projet client afin de guider vos
                                    agents IA sur le SDK{' '}
                                    <code className="font-mono text-xs">
                                        @hacp0012/zenbase-sdk
                                    </code>
                                    , les Web Functions PHP et le serveur MCP.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button asChild size="sm" variant="outline">
                                    <Link href={showMcpPage.url(app.id)}>
                                        <Plug className="mr-1.5 size-3.5" />
                                        Configurer le Serveur MCP
                                    </Link>
                                </Button>
                                <Button asChild size="sm">
                                    <a href={downloadSkillsBundle.url()}>
                                        <FolderArchive className="mr-1.5 size-3.5" />
                                        Tout télécharger (.zip)
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            {mcpSkills.map((skill) => (
                                <div
                                    key={skill.slug}
                                    className="flex flex-col justify-between gap-3 rounded-xl border p-4"
                                >
                                    <div className="space-y-1.5">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <h3 className="text-sm font-semibold">
                                                {skill.title}
                                            </h3>
                                            <Badge
                                                variant="secondary"
                                                className="font-mono text-[10px]"
                                            >
                                                SKILL.md
                                            </Badge>
                                        </div>
                                        <code className="block truncate font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                                            {skill.target_path}
                                        </code>
                                        <p className="text-xs text-muted-foreground">
                                            {skill.description}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() =>
                                                setPreviewSkill(skill)
                                            }
                                        >
                                            <Eye className="mr-1.5 size-3.5" />
                                            Aperçu
                                        </Button>
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                            className="flex-1"
                                        >
                                            <a
                                                href={downloadSkill.url(
                                                    skill.slug,
                                                )}
                                            >
                                                <Download className="mr-1.5 size-3.5" />
                                                Télécharger
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Terminal className="size-4 text-emerald-600" />
                            Installation dans votre projet client
                        </CardTitle>
                        <CardDescription>
                            Décompressez{' '}
                            <code className="font-mono text-xs">
                                zenbase-skills.zip
                            </code>{' '}
                            dans le répertoire skills de votre assistant IA.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-3">
                            {AGENT_SKILL_PATHS.map((target) => (
                                <div
                                    key={target.client}
                                    className="rounded-lg border p-3.5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-semibold">
                                            {target.client}
                                        </span>
                                        <code className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                                            {target.path}
                                        </code>
                                    </div>
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        {target.description}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <PrismCodeBlock
                            language="bash"
                            title="Exemple d'installation rapide (Antigravity)"
                            code={`mkdir -p .agents/skills\nunzip zenbase-skills.zip -d .agents/skills`}
                        />
                    </CardContent>
                </Card>
            </div>

            <Dialog
                open={previewSkill !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPreviewSkill(null);
                    }
                }}
            >
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-mono text-sm">
                            <BookOpen className="size-4 text-emerald-600" />
                            {previewSkill?.target_path}
                        </DialogTitle>
                        <DialogDescription>
                            {previewSkill?.description}
                        </DialogDescription>
                    </DialogHeader>
                    {previewSkill && (
                        <PrismCodeBlock
                            code={previewSkill.content}
                            language="markdown"
                            title={`${previewSkill.slug}/SKILL.md`}
                            maxHeight="60vh"
                        />
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPreviewSkill(null)}
                        >
                            Fermer
                        </Button>
                        {previewSkill && (
                            <Button asChild>
                                <a href={downloadSkill.url(previewSkill.slug)}>
                                    <Download className="mr-1.5 size-3.5" />
                                    Télécharger SKILL.md
                                </a>
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

ClientAppSkills.layout = {
    breadcrumbs: [
        {
            title: 'Mes Applications',
            href: dashboard(),
        },
        {
            title: 'AI',
            href: '#',
        },
        {
            title: 'Skills',
            href: '#',
        },
    ],
};
