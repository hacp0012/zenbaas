type DonutSegment = {
    label: string;
    value: number;
    color: string;
};

type HorizontalBarItem = {
    label: string;
    sublabel?: string;
    value: number;
    formattedValue?: string;
};

type VerticalBarItem = {
    label: string;
    value: number;
};

export function DonutChart({
    segments,
    centerLabel,
    centerValue,
    formatValue = (v) => v.toLocaleString('fr-FR'),
}: {
    segments: DonutSegment[];
    centerLabel: string;
    centerValue: string;
    formatValue?: (value: number) => string;
}) {
    const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
    const radius = 54;
    const circumference = 2 * Math.PI * radius;

    let cumulativeOffset = 0;

    return (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <div className="relative flex size-36 shrink-0 items-center justify-center">
                <svg
                    viewBox="0 0 140 140"
                    className="size-full -rotate-90"
                    role="img"
                    aria-label={centerLabel}
                >
                    <circle
                        cx="70"
                        cy="70"
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="16"
                        className="text-muted/60"
                    />
                    {total > 0 &&
                        segments.map((segment) => {
                            const safeVal = Math.max(0, segment.value);
                            if (safeVal === 0) {
                                return null;
                            }
                            const fraction = safeVal / total;
                            const dashLength = fraction * circumference;
                            const dashOffset = -cumulativeOffset;
                            cumulativeOffset += dashLength;

                            return (
                                <circle
                                    key={segment.label}
                                    cx="70"
                                    cy="70"
                                    r={radius}
                                    fill="transparent"
                                    stroke={segment.color}
                                    strokeWidth="16"
                                    strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                                    strokeDashoffset={dashOffset}
                                    strokeLinecap="butt"
                                />
                            );
                        })}
                </svg>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-sm leading-tight font-bold">
                        {centerValue}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        {centerLabel}
                    </span>
                </div>
            </div>

            <div className="w-full min-w-0 flex-1 space-y-2 text-xs">
                {segments.map((segment) => {
                    const pct =
                        total > 0
                            ? Math.round(
                                  (Math.max(0, segment.value) / total) * 100,
                              )
                            : 0;

                    return (
                        <div
                            key={segment.label}
                            className="flex items-center justify-between gap-2"
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <span
                                    className="size-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: segment.color }}
                                />
                                <span className="truncate text-muted-foreground">
                                    {segment.label}
                                </span>
                            </div>
                            <div className="shrink-0 font-mono font-medium">
                                {formatValue(segment.value)}{' '}
                                <span className="text-[10px] text-muted-foreground">
                                    ({pct}%)
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function HorizontalBarChart({
    items,
    emptyText = 'Aucune donnée disponible.',
    barColorClass = 'bg-emerald-500',
    formatValue = (v) => v.toLocaleString('fr-FR'),
}: {
    items: HorizontalBarItem[];
    emptyText?: string;
    barColorClass?: string;
    formatValue?: (value: number) => string;
}) {
    if (items.length === 0) {
        return (
            <p className="py-6 text-center text-xs text-muted-foreground">
                {emptyText}
            </p>
        );
    }

    const maxVal = Math.max(1, ...items.map((item) => Math.max(0, item.value)));

    return (
        <div className="space-y-3">
            {items.map((item, idx) => {
                const pct = Math.max(
                    item.value > 0 ? 4 : 0,
                    Math.round((Math.max(0, item.value) / maxVal) * 100),
                );

                return (
                    <div key={`${item.label}-${idx}`} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                            <div className="min-w-0 truncate">
                                <span className="font-medium">
                                    {item.label}
                                </span>
                                {item.sublabel && (
                                    <span className="ml-1.5 text-[11px] text-muted-foreground">
                                        · {item.sublabel}
                                    </span>
                                )}
                            </div>
                            <span className="shrink-0 font-mono text-[11px] font-semibold">
                                {item.formattedValue ?? formatValue(item.value)}
                            </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function VerticalBarChart({
    items,
    barColorClass = 'bg-emerald-500',
    unitLabel = '',
}: {
    items: VerticalBarItem[];
    barColorClass?: string;
    unitLabel?: string;
}) {
    const maxVal = Math.max(1, ...items.map((item) => Math.max(0, item.value)));

    return (
        <div className="flex h-44 items-end justify-between gap-2 pt-4">
            {items.map((item) => {
                const heightPct =
                    item.value > 0
                        ? Math.max(10, Math.round((item.value / maxVal) * 100))
                        : 3;

                return (
                    <div
                        key={item.label}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                    >
                        <span className="font-mono text-[11px] font-semibold text-foreground">
                            {item.value}
                            {unitLabel}
                        </span>
                        <div className="flex h-28 w-full items-end justify-center rounded-md bg-muted/40 px-1.5">
                            <div
                                className={`w-full max-w-10 rounded-t-md transition-all duration-300 ${
                                    item.value > 0
                                        ? barColorClass
                                        : 'bg-muted-foreground/20'
                                }`}
                                style={{ height: `${heightPct}%` }}
                                title={`${item.label} : ${item.value}${unitLabel}`}
                            />
                        </div>
                        <span className="truncate text-[10px] font-medium text-muted-foreground">
                            {item.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
