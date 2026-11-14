import { Check, Copy } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';
import { useMemo, useState } from 'react';
import { useAppearance } from '@/hooks/use-appearance';

export type PrismCodeBlockProps = {
    code: string;
    language?: 'php' | 'json' | 'typescript' | 'javascript' | 'bash' | 'markdown';
    title?: string;
    showCopy?: boolean;
    maxHeight?: string;
    className?: string;
};

export function PrismCodeBlock({
    code,
    language = 'typescript',
    title,
    showCopy = true,
    maxHeight,
    className = '',
}: PrismCodeBlockProps) {
    const { resolvedAppearance } = useAppearance();
    const [copied, setCopied] = useState(false);

    const highlightedHtml = useMemo(() => {
        const grammar =
            Prism.languages[language] ??
            Prism.languages.typescript ??
            Prism.languages.javascript ??
            Prism.languages.plain;

        try {
            return Prism.highlight(code, grammar, language);
        } catch {
            return code
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
    }, [code, language]);

    function handleCopy() {
        void navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div
            className={`zenbase-prism-monokai overflow-hidden rounded-xl border border-zinc-300 bg-[#FAFAF8] text-[#272822] shadow-xs dark:border-zinc-800 dark:bg-[#1E1F1C] dark:text-[#F8F8F2] ${className}`}
        >
            <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100/90 px-3.5 py-1.5 text-[11px] dark:border-zinc-800 dark:bg-[#191a17]">
                <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-[#F92672]" />
                    <span className="size-2.5 rounded-full bg-[#FD971F]" />
                    <span className="size-2.5 rounded-full bg-[#A6E22E]" />
                    <span className="ml-1.5 font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                        {title ?? language.toUpperCase()}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="hidden font-mono text-[10px] text-zinc-500 sm:inline dark:text-zinc-400">
                        PrismJS · Monokai ({resolvedAppearance === 'dark' ? 'Sombre' : 'Clair'}) · JetBrains Mono
                    </span>
                    {showCopy && (
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-0.5 font-mono text-[11px] text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        >
                            {copied ? (
                                <>
                                    <Check className="size-3 text-[#A6E22E]" />
                                    Copié
                                </>
                            ) : (
                                <>
                                    <Copy className="size-3" />
                                    Copier
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <pre
                style={maxHeight ? { maxHeight } : undefined}
                className="overflow-auto p-4 font-mono text-xs leading-relaxed"
            >
                <code
                    className={`language-${language} font-mono`}
                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
            </pre>
        </div>
    );
}
