import React from 'react';
import { MoreHorizontal, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  percentageChange: number;
  comparisonText: string;
  comparisonValue: string | number;
  accentColor?: 'blue' | 'indigo' | 'cyan' | 'emerald' | 'amber';
  onActionClick?: () => void;
}

const accentColorMap = {
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-600',
  cyan: 'bg-cyan-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  percentageChange,
  comparisonText,
  comparisonValue,
  accentColor = 'blue',
  onActionClick,
}) => {
  const isPositive = percentageChange >= 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between">
      {/* Top row: accent line + title + context menu */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-1 h-4 rounded-full ${accentColorMap[accentColor]}`}
            aria-hidden="true"
          />
          <h3 className="text-xs font-medium text-slate-600 dark:text-slate-400 tracking-tight">{title}</h3>
        </div>
        <button
          onClick={onActionClick}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          aria-label="Options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Main Metric Value & Change Pill */}
      <div className="flex items-baseline gap-2.5 mb-4">
        <span className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
          {value}
        </span>
        <span
          className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums ${
            isPositive
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
          }`}
        >
          {isPositive ? `+${percentageChange}%` : `${percentageChange}%`}
        </span>
      </div>

      {/* Bottom comparison row */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-1 font-medium tabular-nums">
          {isPositive ? (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {comparisonValue}
            </span>
          ) : (
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
              <ArrowDownRight className="w-3.5 h-3.5" />
              {comparisonValue}
            </span>
          )}
        </div>
        <span className="text-slate-400 dark:text-slate-500 text-[11px]">{comparisonText}</span>
      </div>
    </div>
  );
};
