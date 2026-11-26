import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { MonacoCodeEditor } from '@/components/monaco-code-editor';

const COMPACT_LINE_HEIGHT_PX = 20;
const COMPACT_VERTICAL_PADDING_PX = 12;

export type ResizableJsonEditorProps = {
    value: string;
    onChange: (value: string) => void;
    expectedType?: 'array' | 'object' | 'map';
    minLines?: number;
    maxHeight?: number;
    readOnly?: boolean;
};

type JsonValidationResult =
    | { status: 'valid' }
    | { status: 'type_mismatch'; message: string }
    | { status: 'invalid'; message: string };

function validateJsonValue(
    raw: string,
    expectedType?: 'array' | 'object' | 'map',
): JsonValidationResult {
    try {
        const parsed: unknown = JSON.parse(raw);

        if (expectedType === 'array' && !Array.isArray(parsed)) {
            return {
                status: 'type_mismatch',
                message: 'Un tableau JSON ([...]) est attendu.',
            };
        }

        if (
            (expectedType === 'object' || expectedType === 'map') &&
            (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
        ) {
            return {
                status: 'type_mismatch',
                message: 'Un objet JSON ({...}) est attendu.',
            };
        }

        return { status: 'valid' };
    } catch (error) {
        return {
            status: 'invalid',
            message:
                error instanceof Error
                    ? error.message
                    : 'Syntaxe JSON invalide.',
        };
    }
}

export function ResizableJsonEditor({
    value,
    onChange,
    expectedType = 'object',
    minLines = 3,
    maxHeight = 480,
    readOnly = false,
}: ResizableJsonEditorProps) {
    const minHeight =
        Math.max(1, minLines) * COMPACT_LINE_HEIGHT_PX +
        COMPACT_VERTICAL_PADDING_PX;

    const [editorHeight, setEditorHeight] = useState<number>(minHeight);
    const [isResizing, setIsResizing] = useState(false);
    const dragStateRef = useRef<{ startY: number; startHeight: number } | null>(
        null,
    );

    const validation = useMemo(
        () => validateJsonValue(value, expectedType),
        [value, expectedType],
    );

    function handleFormatJson() {
        try {
            const parsed: unknown = JSON.parse(value);
            onChange(JSON.stringify(parsed, null, 2));
        } catch {
            // Invalid JSON cannot be formatted until syntax errors are fixed
        }
    }

    function handleResizePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragStateRef.current = {
            startY: e.clientY,
            startHeight: editorHeight,
        };
        setIsResizing(true);
    }

    function handleResizePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
        const drag = dragStateRef.current;
        if (!drag) {
            return;
        }

        const deltaY = e.clientY - drag.startY;
        const nextHeight = Math.max(
            minHeight,
            Math.min(maxHeight, Math.round(drag.startHeight + deltaY)),
        );
        setEditorHeight(nextHeight);
    }

    function handleResizePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
        if (!dragStateRef.current) {
            return;
        }
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        dragStateRef.current = null;
        setIsResizing(false);
    }

    function handleResizeDoubleClick() {
        const lineCount = Math.max(minLines, value.split(/\r?\n/).length);
        const autoFitHeight = Math.min(
            maxHeight,
            lineCount * COMPACT_LINE_HEIGHT_PX + COMPACT_VERTICAL_PADDING_PX,
        );

        setEditorHeight((current) =>
            current > minHeight + 8 ? minHeight : Math.max(minHeight, autoFitHeight),
        );
    }

    const typeLabel = expectedType === 'array' ? 'JSON Array' : 'JSON Object';

    return (
        <div
            className={`overflow-hidden rounded-md border bg-background transition-colors ${
                validation.status === 'invalid'
                    ? 'border-red-500/60'
                    : validation.status === 'type_mismatch'
                      ? 'border-amber-500/60'
                      : 'border-border'
            }`}
        >
            {/* Compact JSON Toolbar */}
            <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-muted/40 px-2.5 py-1">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-[10px] font-medium text-muted-foreground">
                        {typeLabel}
                    </span>

                    {validation.status === 'valid' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3 shrink-0" />
                            Valide
                        </span>
                    )}

                    {validation.status === 'type_mismatch' && (
                        <span className="inline-flex items-center gap-1 truncate text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            <AlertCircle className="size-3 shrink-0" />
                            {validation.message}
                        </span>
                    )}

                    {validation.status === 'invalid' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400">
                            <AlertCircle className="size-3 shrink-0" />
                            JSON invalide
                        </span>
                    )}
                </div>

                {!readOnly && (
                    <button
                        type="button"
                        onClick={handleFormatJson}
                        disabled={validation.status === 'invalid'}
                        title="Formater et indenter le JSON"
                        className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Sparkles className="size-3" />
                        <span>Formater</span>
                    </button>
                )}
            </div>

            {/* Monaco JSON Editor (min-height = 3 lines by default, dynamically resized) */}
            <div
                style={{
                    height: `${editorHeight}px`,
                    minHeight: `${minHeight}px`,
                }}
                className="relative w-full"
            >
                <MonacoCodeEditor
                    value={value}
                    onChange={onChange}
                    language="json"
                    height="100%"
                    readOnly={readOnly}
                    edgeToEdge
                    compact
                />
            </div>

            {/* Validation Syntax Error Detail */}
            {validation.status === 'invalid' && (
                <div className="border-t border-red-500/30 bg-red-500/5 px-2.5 py-1 font-mono text-[10px] text-red-600 dark:text-red-400">
                    {validation.message}
                </div>
            )}

            {/* Interactive Vertical Resize Handle (similar to CSS resize: vertical) */}
            <div
                role="separator"
                aria-orientation="horizontal"
                aria-label="Redimensionner verticalement l'éditeur JSON"
                title="Glisser vers le bas pour agrandir (double-clic pour ajuster)"
                onPointerDown={handleResizePointerDown}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                onPointerCancel={handleResizePointerUp}
                onDoubleClick={handleResizeDoubleClick}
                className={`group relative flex h-3.5 w-full cursor-ns-resize items-center justify-center border-t border-border/70 bg-muted/35 select-none transition-colors hover:bg-muted/70 ${
                    isResizing ? 'bg-emerald-500/15' : ''
                }`}
            >
                <span
                    className={`h-0.5 w-8 rounded-full transition-colors ${
                        isResizing
                            ? 'bg-emerald-500'
                            : 'bg-muted-foreground/35 group-hover:bg-muted-foreground/65'
                    }`}
                />
                <svg
                    aria-hidden="true"
                    viewBox="0 0 10 10"
                    className="pointer-events-none absolute right-1.5 bottom-0.5 size-2.5 text-muted-foreground/50 group-hover:text-muted-foreground"
                >
                    <path
                        d="M9 1L1 9M9 5L5 9"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                    />
                </svg>
            </div>
        </div>
    );
}
