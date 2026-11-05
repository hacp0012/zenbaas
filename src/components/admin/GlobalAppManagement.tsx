import React, { useState } from 'react';
import {
  Layers,
  Search,
  UserCheck,
  HardDrive,
  Activity,
  ExternalLink,
  Trash2,
  PauseCircle,
  PlayCircle,
  Shield,
  Filter,
} from 'lucide-react';
import { AppItem, User } from '../../types/baas';

interface GlobalAppManagementProps {
  apps: AppItem[];
  users: User[];
  onToggleAppStatus: (appId: string) => void;
  onDeleteApp: (appId: string) => void;
  onSelectAppForInspect: (app: AppItem) => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'error' | 'info') => void;
}

export const GlobalAppManagement: React.FC<GlobalAppManagementProps> = ({
  apps,
  users,
  onToggleAppStatus,
  onDeleteApp,
  onSelectAppForInspect,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');

  // Filter apps
  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOwner =
      selectedOwner === 'all' ? true : app.ownerEmail === selectedOwner;
    return matchesSearch && matchesOwner;
  });

  // Group apps by owner
  const uniqueOwners = Array.from(new Set(apps.map((a) => a.ownerEmail)));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors duration-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Supervision Globale des Applications (Par Propriétaire)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit des bases hébergées, quotas de stockage et métriques réseau sur tous les comptes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {apps.length} applications enregistrées
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 transition-colors duration-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer par nom d'application, slug ou email du propriétaire..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Tous les propriétaires ({uniqueOwners.length})</option>
            {uniqueOwners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grouped Applications Cards */}
      <div className="space-y-6">
        {uniqueOwners
          .filter((owner) => selectedOwner === 'all' || selectedOwner === owner)
          .map((ownerEmail) => {
            const ownerApps = filteredApps.filter((a) => a.ownerEmail === ownerEmail);
            if (ownerApps.length === 0) return null;

            const ownerName = ownerApps[0].ownerName;

            return (
              <div
                key={ownerEmail}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors duration-200"
              >
                {/* Owner Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs">
                      {ownerName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {ownerName}
                        <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 font-mono">
                          ({ownerEmail})
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {ownerApps.length} application{ownerApps.length > 1 ? 's' : ''} sous ce compte
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="tabular-nums">
                      Total requêtes :{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {ownerApps
                          .reduce((acc, a) => acc + a.totalRequests, 0)
                          .toLocaleString('fr-FR')}
                      </strong>
                    </span>
                    <span>·</span>
                    <span className="tabular-nums">
                      Stockage :{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {ownerApps
                          .reduce((acc, a) => acc + a.storageMb, 0)
                          .toFixed(1)}{' '}
                        MB
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Applications Grid for this owner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ownerApps.map((app) => (
                    <div
                      key={app.id}
                      className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all bg-slate-50/30 dark:bg-slate-800/30 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{app.name}</h4>
                            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                              {app.slug}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                              app.status === 'active'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60'
                            }`}
                          >
                            {app.status === 'active' ? 'Actif' : 'En pause'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                          {app.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums font-mono">
                          <span>{app.storageMb} MB</span>
                          <span>·</span>
                          <span>{app.requestsLast24h.toLocaleString('fr-FR')} req/24h</span>
                          <span>·</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{app.p95LatencyMs}ms</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              onToggleAppStatus(app.id);
                              onShowToast(
                                'Statut modifié',
                                `L'application ${app.name} est maintenant ${
                                  app.status === 'active' ? 'en pause' : 'active'
                                }.`,
                                'info'
                              );
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title={app.status === 'active' ? 'Mettre en pause' : 'Activer'}
                          >
                            {app.status === 'active' ? (
                              <PauseCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <PlayCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </button>

                          <button
                            onClick={() => onSelectAppForInspect(app)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                          >
                            <span>Ouvrir</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
