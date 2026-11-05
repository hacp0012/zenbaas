import React, { useState } from 'react';
import { MoreHorizontal, Cpu, Zap, ShieldCheck } from 'lucide-react';
import { monthlyAnalytics } from '../../data/mockData';

interface AnalyticsChartProps {
  onTimeframeChange?: (tf: string) => void;
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = () => {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(5); // June by default, matching screenshot

  const activeMonthData = monthlyAnalytics[selectedMonthIndex] || monthlyAnalytics[5];

  // Max value for scaling bars
  const maxRequests = 85000;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Card: Analytics Bar Chart (like screenshot's Analytics Overview) */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs relative transition-colors duration-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
              Activité des Requêtes & Trafic API
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Volume total des appels REST et Webhooks traités par le moteur Fastify
            </p>
          </div>
          <button
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            aria-label="Options du graphique"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Chart Viewport */}
        <div className="relative pt-2 pb-6">
          {/* Horizontal grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            <div className="flex items-center border-b border-slate-100/80 dark:border-slate-800/80 pb-0.5 w-full">
              <span className="w-12 text-right pr-2">80k</span>
              <div className="flex-1 border-b border-dashed border-slate-200/60 dark:border-slate-800" />
            </div>
            <div className="flex items-center border-b border-slate-100/80 dark:border-slate-800/80 pb-0.5 w-full">
              <span className="w-12 text-right pr-2">60k</span>
              <div className="flex-1 border-b border-dashed border-slate-200/60 dark:border-slate-800" />
            </div>
            <div className="flex items-center border-b border-slate-100/80 dark:border-slate-800/80 pb-0.5 w-full">
              <span className="w-12 text-right pr-2">40k</span>
              <div className="flex-1 border-b border-dashed border-slate-200/60 dark:border-slate-800" />
            </div>
            <div className="flex items-center border-b border-slate-100/80 dark:border-slate-800/80 pb-0.5 w-full">
              <span className="w-12 text-right pr-2">20k</span>
              <div className="flex-1 border-b border-dashed border-slate-200/60 dark:border-slate-800" />
            </div>
            <div className="flex items-center border-b border-slate-100/80 dark:border-slate-800/80 pb-0.5 w-full">
              <span className="w-12 text-right pr-2">0</span>
              <div className="flex-1 border-b border-slate-200 dark:border-slate-700" />
            </div>
          </div>

          {/* Bar Columns Container */}
          <div className="h-56 ml-14 flex items-end justify-between gap-1.5 sm:gap-2 pt-2 px-1 relative z-10">
            {monthlyAnalytics.map((item, index) => {
              const heightPercent = Math.round((item.requests / maxRequests) * 100);
              const isSelected = selectedMonthIndex === index;

              return (
                <div
                  key={item.month}
                  className="flex-1 flex flex-col items-center group h-full justify-end cursor-pointer"
                  onClick={() => setSelectedMonthIndex(index)}
                >
                  {/* Bar shape */}
                  <div className="w-full max-w-[28px] h-full flex items-end justify-center">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 relative ${
                        isSelected
                          ? 'bg-gradient-to-t from-blue-600 to-cyan-500 shadow-md ring-2 ring-blue-300 dark:ring-blue-500/50 ring-offset-1 dark:ring-offset-slate-900'
                          : 'bg-slate-200/80 dark:bg-slate-800 group-hover:bg-blue-300 dark:group-hover:bg-slate-700'
                      }`}
                    >
                      {/* Segmented highlight on the selected bar like screenshot */}
                      {isSelected && (
                        <div className="w-full h-2 rounded-t-md bg-white/40 mb-auto" />
                      )}
                    </div>
                  </div>

                  {/* Month Label */}
                  <span
                    className={`mt-2 text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                    }`}
                  >
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Interactive Floating Tooltip */}
          <div className="mt-4 p-3.5 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                Détail {activeMonthData.month} 2026 :
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {activeMonthData.requests.toLocaleString('fr-FR')} requêtes traitées
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-4 text-[11px] tabular-nums">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span className="text-slate-600 dark:text-slate-300">GET (Lectures):</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {Math.round(activeMonthData.requests * 0.65).toLocaleString('fr-FR')}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="text-slate-600 dark:text-slate-300">POST/PUT:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {Math.round(activeMonthData.requests * 0.28).toLocaleString('fr-FR')}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span className="text-slate-600 dark:text-slate-300">Devs Actifs:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{activeMonthData.users}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-300">Bande Passante:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{activeMonthData.bandwidthGb} GB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Card: Performance & Growth */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
              Performance Moteur BaaS (Fastify)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Disponibilité temps réel & santé des nœuds
            </p>
          </div>
          <button
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            aria-label="Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Metric Columns with Shaded Fills */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Metric 1 */}
          <div className="flex flex-col justify-between border border-slate-200/70 dark:border-slate-800 rounded-xl p-3 bg-slate-50/40 dark:bg-slate-800/40">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                Succès 2xx
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  99.98%
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">+0.2%</span>
              </div>
            </div>

            {/* Visual shaded bar fill at bottom */}
            <div className="mt-6 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="h-10 w-full rounded bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block text-center mt-1">
                SLA Garanti
              </span>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="flex flex-col justify-between border border-blue-200/80 dark:border-blue-900/60 rounded-xl p-3 bg-blue-50/30 dark:bg-blue-950/20">
            <div>
              <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium line-clamp-1">
                Latence p95
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-base sm:text-lg font-bold text-blue-900 dark:text-blue-200 tabular-nums">
                  14.2ms
                </span>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">-3.4%</span>
              </div>
            </div>

            {/* Visual shaded bar fill at bottom */}
            <div className="mt-6 pt-2 border-t border-blue-200/60 dark:border-blue-800/60">
              <div className="h-10 w-full rounded bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block text-center mt-1">
                Ultra-rapide
              </span>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="flex flex-col justify-between border border-slate-200/70 dark:border-slate-800 rounded-xl p-3 bg-slate-50/40 dark:bg-slate-800/40">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                Charge CPU
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  18.4%
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Stable</span>
              </div>
            </div>

            {/* Visual shaded bar fill at bottom */}
            <div className="mt-6 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="h-10 w-full rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block text-center mt-1">
                4 Cores vCPU
              </span>
            </div>
          </div>
        </div>

        {/* Engine specs banner */}
        <div className="p-3 bg-slate-900 dark:bg-slate-800/90 border border-transparent dark:border-slate-700 text-slate-200 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-medium text-white">Serveur Fastify v4.28</span>
            <span className="text-slate-400">· Node.js v22</span>
          </div>
          <span className="text-[11px] text-slate-300 dark:text-slate-400 font-mono">Paris-01</span>
        </div>
      </div>
    </div>
  );
};
