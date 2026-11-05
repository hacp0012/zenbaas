import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  Download,
  PauseCircle,
  PlayCircle,
  Trash2,
  ExternalLink,
  CheckSquare,
  Square,
  Shield,
  Layers,
  Activity,
  Server,
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { AnalyticsChart } from '../common/AnalyticsChart';
import { AppItem, User } from '../../types/baas';

interface AdminDashboardProps {
  apps: AppItem[];
  users: User[];
  onToggleAppStatus: (appId: string) => void;
  onDeleteApp: (appId: string) => void;
  onSelectAppForInspect: (app: AppItem) => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  apps,
  users,
  onToggleAppStatus,
  onDeleteApp,
  onSelectAppForInspect,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all');

  // Filtered apps
  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.slug.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' ? true : app.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedAppIds.length === filteredApps.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(filteredApps.map((a) => a.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkPause = () => {
    if (selectedAppIds.length === 0) return;
    selectedAppIds.forEach((id) => onToggleAppStatus(id));
    onShowToast('Statut mis à jour', `${selectedAppIds.length} applications modifiées.`, 'info');
    setSelectedAppIds([]);
  };

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredApps, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `zenbaas_apps_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast('Export terminé', 'Fichier JSON téléchargé.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Sub-bar / Navigation pills */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl">
          <button className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs">
            Vue d'ensemble
          </button>
          <button
            onClick={() => setFilterStatus(filterStatus === 'all' ? 'active' : 'all')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterStatus === 'active'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Apps Actives ({apps.filter((a) => a.status === 'active').length})
          </button>
          <button
            onClick={() => setFilterStatus(filterStatus === 'paused' ? 'all' : 'paused')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterStatus === 'paused'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            En Pause ({apps.filter((a) => a.status === 'paused').length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Exporter JSON</span>
          </button>
        </div>
      </div>

      {/* Row of 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Utilisateurs Inscrits"
          value="12.840"
          percentageChange={12.4}
          comparisonValue="1.420"
          comparisonText="Depuis mois dernier"
          accentColor="cyan"
          onActionClick={() => onShowToast('Info Utilisateurs', '12 840 développeurs sur le cluster')}
        />
        <StatCard
          title="Applications Hébergées"
          value="4.218"
          percentageChange={8.2}
          comparisonValue="312"
          comparisonText="Depuis mois dernier"
          accentColor="indigo"
          onActionClick={() => onShowToast('Info Apps', '4 218 bases de données actives')}
        />
        <StatCard
          title="Requêtes API Globales"
          value="48.256 M"
          percentageChange={18.5}
          comparisonValue="7.54 M"
          comparisonText="Depuis mois dernier"
          accentColor="blue"
          onActionClick={() => onShowToast('Info Requêtes', 'Pic à 3 200 req/sec')}
        />
        <StatCard
          title="Stockage & Bande Passante"
          value="1.42 TB"
          percentageChange={4.1}
          comparisonValue="110 GB"
          comparisonText="Depuis mois dernier"
          accentColor="emerald"
          onActionClick={() => onShowToast('Info Stockage', 'Capacité restante: 8.58 TB')}
        />
      </div>

      {/* Middle row: Bar Chart + Performance Panel */}
      <AnalyticsChart />

      {/* Bottom Section: Data Table of All Applications */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors duration-200">
        {/* Table Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une application, propriétaire ou slug..."
                className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedAppIds.length > 0 && (
              <button
                onClick={handleBulkPause}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Basculer ({selectedAppIds.length})</span>
              </button>
            )}

            <button
              onClick={handleExportData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Exporter</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto border border-slate-200/70 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                <th className="py-3 px-3.5 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center"
                    aria-label="Tout sélectionner"
                  >
                    {selectedAppIds.length === filteredApps.length && filteredApps.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3.5">Nom de l'application & Propriétaire</th>
                <th className="py-3 px-3.5">Statut Actif</th>
                <th className="py-3 px-3.5">Moteur DB</th>
                <th className="py-3 px-3.5 text-right">Stockage</th>
                <th className="py-3 px-3.5 text-right">Requêtes 24h</th>
                <th className="py-3 px-3.5 text-right">Latence p95</th>
                <th className="py-3 px-3.5 text-center">Région</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    Aucune application ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const isSelected = selectedAppIds.includes(app.id);

                  return (
                    <tr
                      key={app.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5">
                        <button
                          onClick={() => toggleSelectOne(app.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="flex flex-col">
                          <button
                            onClick={() => onSelectAppForInspect(app)}
                            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left transition-colors truncate max-w-xs"
                          >
                            {app.name}
                          </button>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-mono text-slate-400 dark:text-slate-500">{app.slug}</span>
                            <span>·</span>
                            <span className="text-slate-600 dark:text-slate-300">{app.ownerName}</span>
                          </div>
                        </div>
                      </td>

                      {/* Active toggle switch */}
                      <td className="py-3 px-3.5">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={app.status === 'active'}
                            onChange={() => onToggleAppStatus(app.id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900 dark:peer-checked:bg-blue-600"></div>
                        </label>
                      </td>

                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {app.dbEngine}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {app.storageMb} MB
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                        {app.requestsLast24h.toLocaleString('fr-FR')}
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono tabular-nums">
                        <span
                          className={`font-semibold ${
                            app.p95LatencyMs < 20
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : app.p95LatencyMs < 35
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {app.p95LatencyMs} ms
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-center text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {app.region.split(' ')[0]}
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectAppForInspect(app)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                            title="Ouvrir la console client de cette application"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDeleteApp(app.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Supprimer définitivement l'application"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Stats */}
        <div className="flex items-center justify-between pt-3 mt-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          <span>
            Affichage de <strong className="text-slate-800 dark:text-slate-200">{filteredApps.length}</strong> sur{' '}
            <strong className="text-slate-800 dark:text-slate-200">{apps.length}</strong> applications
          </span>
          <span className="font-mono text-[11px]">Moteur BaaS Cluster Paris-01</span>
        </div>
      </div>
    </div>
  );
};
