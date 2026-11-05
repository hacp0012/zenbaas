import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Layers,
  Database,
  FileText,
  Activity,
  Terminal,
  ChevronLeft,
  ChevronRight,
  Search,
  Shield,
  Code2,
  Server,
  ExternalLink,
  Plus,
  Sun,
  Moon,
  LogOut,
  Home,
} from 'lucide-react';
import { User, AppItem } from '../../types/baas';

export type MainView =
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-apps'
  | 'dev-apps'
  | 'dev-app-detail';

interface SidebarProps {
  currentRole: 'admin' | 'developer';
  activeView?: MainView;
  onViewChange?: (view: MainView) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentUser: User;
  selectedApp: AppItem | null;
  onSelectApp: (app: AppItem | null) => void;
  onOpenCreateAppModal: () => void;
  onLogout: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  activeView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
  currentUser,
  selectedApp,
  onSelectApp,
  onOpenCreateAppModal,
  onLogout,
  theme = 'light',
  onToggleTheme,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminDashboard =
    location.pathname === '/admin/dashboard' ||
    location.pathname === '/admin' ||
    activeView === 'admin-dashboard';
  const isAdminUsers =
    location.pathname === '/admin/users' || activeView === 'admin-users';
  const isAdminApps =
    location.pathname === '/admin/apps' || activeView === 'admin-apps';
  const isDevApps =
    location.pathname === '/client/apps' ||
    location.pathname === '/client' ||
    (activeView === 'dev-apps' && !selectedApp);
  const isDevAppDetail =
    (location.pathname.startsWith('/client/apps/') &&
      location.pathname !== '/client/apps') ||
    activeView === 'dev-app-detail';
  return (
    <aside
      className={`bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-colors duration-200 flex flex-col z-30 shrink-0 h-screen sticky top-0 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 ${
                currentRole === 'admin'
                  ? 'bg-gradient-to-tr from-slate-900 to-slate-800 dark:from-blue-600 dark:to-indigo-600'
                  : 'bg-gradient-to-tr from-blue-700 to-indigo-600'
              }`}
            >
              {currentRole === 'admin' ? (
                <Shield className="w-5 h-5" />
              ) : (
                <Database className="w-5 h-5" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-base tracking-tight truncate flex items-center gap-1.5">
                ZenBaaS
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${
                    currentRole === 'admin'
                      ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-800/80'
                      : 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/80'
                  }`}
                >
                  {currentRole === 'admin' ? 'Super-Admin' : 'Espace Client'}
                </span>
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                {currentRole === 'admin' ? 'Supervision Serveur' : 'Console Développeur'}
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-full flex justify-center">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm ${
                currentRole === 'admin'
                  ? 'bg-slate-900 dark:bg-blue-600'
                  : 'bg-blue-600'
              }`}
            >
              {currentRole === 'admin' ? (
                <Shield className="w-5 h-5" />
              ) : (
                <Database className="w-5 h-5" />
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={onToggleCollapse}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={isCollapsed ? 'Déplier la barre' : 'Replier la barre'}
            title={isCollapsed ? 'Déplier' : 'Replier'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Workspace Status Badge */}
      {!isCollapsed && (
        <div className="px-3 pt-3">
          <div
            className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
              currentRole === 'admin'
                ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                : 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-200/70 dark:border-blue-800/60 text-blue-900 dark:text-blue-200'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {currentRole === 'admin' ? (
                <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              ) : (
                <Code2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              )}
              <span className="font-bold truncate">
                {currentRole === 'admin' ? 'Session Administrateur' : 'Session Développeur'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              Actif
            </span>
          </div>
        </div>
      )}

      {/* Quick search input */}
      {!isCollapsed && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Recherche rapide..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-xl pl-9 pr-12 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded shadow-2xs">
              ⌘K
            </span>
          </div>
        </div>
      )}

      {/* Navigation scrollable area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          {!isCollapsed && (
            <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              {currentRole === 'admin' ? 'Administration Système' : 'Mes Projets'}
            </p>
          )}

          <nav className="space-y-1">
            {currentRole === 'admin' ? (
              <>
                <button
                  onClick={() => {
                    navigate('/admin/dashboard');
                    onViewChange?.('admin-dashboard');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isAdminDashboard
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Tableau de bord global"
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  {!isCollapsed && <span className="truncate">Tableau de bord</span>}
                </button>

                <button
                  onClick={() => {
                    navigate('/admin/users');
                    onViewChange?.('admin-users');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isAdminUsers
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Gestion des utilisateurs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Users className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
                    {!isCollapsed && <span className="truncate">Utilisateurs</span>}
                  </div>
                  {!isCollapsed && (
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-md">
                      5
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    navigate('/admin/apps');
                    onViewChange?.('admin-apps');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isAdminApps
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Gestion des applications"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Layers className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
                    {!isCollapsed && <span className="truncate">Toutes les Apps</span>}
                  </div>
                  {!isCollapsed && (
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-md">
                      4
                    </span>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    onSelectApp(null);
                    navigate('/client/apps');
                    onViewChange?.('dev-apps');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isDevApps
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Mes Applications"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <LayoutDashboard className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                    {!isCollapsed && <span className="truncate">Mes Applications</span>}
                  </div>
                  {!isCollapsed && (
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-md">
                      2
                    </span>
                  )}
                </button>

                {selectedApp && (
                  <div className="pt-2 pb-1 space-y-1">
                    {!isCollapsed && (
                      <div className="px-3 pt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span className="truncate">App en cours</span>
                        <span className="text-emerald-600 dark:text-emerald-400">En ligne</span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        navigate(`/client/apps/${selectedApp.id}`);
                        onViewChange?.('dev-app-detail');
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                        isDevAppDetail
                          ? 'bg-indigo-100/80 dark:bg-indigo-950/70 border border-indigo-300/80 dark:border-indigo-700/80 text-indigo-950 dark:text-indigo-200'
                          : 'bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200 hover:bg-indigo-100/60'
                      }`}
                    >
                      <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      {!isCollapsed && (
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{selectedApp.name}</p>
                          <p className="text-[10px] text-indigo-700 dark:text-indigo-400 truncate font-mono">
                            {selectedApp.slug}
                          </p>
                        </div>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Quick Collections / Shortcuts */}
        {!isCollapsed && (
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Collections & Données
              </p>
              {currentRole === 'developer' && (
                <button
                  onClick={onOpenCreateAppModal}
                  className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5 rounded transition-colors"
                  title="Nouvelle application"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="truncate">products (6 entrées)</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="truncate">orders (4 entrées)</span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="truncate">posts (3 entrées)</span>
              </div>
            </div>
          </div>
        )}

        {/* Fastify Engine Specs */}
        {!isCollapsed && (
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Moteur & Specs
            </p>
            <div className="space-y-1">
              <a
                href="https://fastify.dev"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Fastify Core Engine</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <div className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer">
                <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Documentation API REST</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Theme Toggle & User Account Card at bottom */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-2">
        {onToggleTheme && !isCollapsed && (
          <button
            onClick={onToggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Basculer le thème"
          >
            <div className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              <span>Thème {theme === 'dark' ? 'Sombre' : 'Clair'}</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>
        )}

        {!isCollapsed ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                alt={currentUser.name}
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
              title="Déconnexion de cette session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Quitter la session</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onLogout}
              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
