import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  Bell,
  Plus,
  ChevronRight,
  Shield,
  Code2,
  Zap,
  Sun,
  Moon,
  LogOut,
  Home,
} from 'lucide-react';
import { MainView } from './Sidebar';
import { AppItem } from '../../types/baas';

interface TopHeaderProps {
  currentRole: 'admin' | 'developer';
  activeView?: MainView;
  selectedApp: AppItem | null;
  onOpenCreateAppModal: () => void;
  onOpenInviteUserModal?: () => void;
  onViewChange?: (view: MainView) => void;
  onSelectApp: (app: AppItem | null) => void;
  onLogout: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentRole,
  activeView,
  selectedApp,
  onOpenCreateAppModal,
  onOpenInviteUserModal,
  onViewChange,
  onSelectApp,
  onLogout,
  theme = 'light',
  onToggleTheme,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('1 Juin - 30 Juin 2026');

  // Breadcrumb generation based on router path & props
  const getBreadcrumbs = () => {
    const isClient = location.pathname.startsWith('/client') || currentRole === 'developer';

    if (!isClient) {
      let viewLabel = 'Tableau de bord';
      if (location.pathname === '/admin/users' || activeView === 'admin-users') {
        viewLabel = 'Gestion des Utilisateurs';
      } else if (location.pathname === '/admin/apps' || activeView === 'admin-apps') {
        viewLabel = 'Toutes les Applications';
      }

      return [
        {
          label: 'Administration',
          clickable: true,
          onClick: () => {
            navigate('/admin/dashboard');
            onViewChange?.('admin-dashboard');
          },
        },
        { label: viewLabel, clickable: false },
      ];
    } else {
      const isAppDetail =
        location.pathname.startsWith('/client/apps/') &&
        location.pathname !== '/client/apps';

      if (isAppDetail || selectedApp) {
        return [
          {
            label: 'Mes Applications',
            clickable: true,
            onClick: () => {
              onSelectApp(null);
              navigate('/client/apps');
              onViewChange?.('dev-apps');
            },
          },
          { label: selectedApp?.name || 'Détails de l\'Application', clickable: false },
        ];
      }
      return [
        {
          label: 'Espace Client',
          clickable: true,
          onClick: () => {
            navigate('/client/apps');
            onViewChange?.('dev-apps');
          },
        },
        { label: 'Mes Applications', clickable: false },
      ];
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-20 transition-colors duration-200">
      {/* Left zone: Breadcrumbs */}
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-xs">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.label}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />}
            {crumb.clickable ? (
              <button
                onClick={crumb.onClick}
                className="font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors truncate max-w-[160px]"
              >
                {crumb.label}
              </button>
            ) : (
              <span
                className={`truncate max-w-[220px] ${
                  idx === breadcrumbs.length - 1
                    ? 'font-bold text-slate-900 dark:text-white bg-slate-100/80 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700'
                    : 'font-medium text-slate-500 dark:text-slate-400'
                }`}
              >
                {crumb.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Right zone: Date range, notifications, theme toggle, logout, primary CTA */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Fastify Engine Live Pill */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/80 rounded-lg text-[11px] font-medium">
          <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>Fastify v4.28</span>
        </div>

        {/* Date range picker pill */}
        <div className="relative hidden md:block">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors cursor-pointer">
            <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>{selectedDateRange}</span>
          </div>
        </div>

        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title={`Basculer vers le thème ${theme === 'dark' ? 'clair' : 'sombre'}`}
            aria-label="Basculer le mode sombre"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full ring-2 ring-white dark:ring-slate-900" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 z-50 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">Notifications Système</span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold cursor-pointer">
                  Tout marquer comme lu
                </span>
              </div>
              <div className="mt-3 space-y-2.5">
                <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/60 text-slate-700 dark:text-slate-300">
                  <p className="font-semibold text-blue-950 dark:text-blue-200">Session active</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Connecté en tant que {currentRole === 'admin' ? 'Super-Administrateur' : 'Développeur'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
          title="Déconnexion (retour au portail public)"
          aria-label="Déconnexion"
        >
          <LogOut className="w-4 h-4" />
        </button>

        {/* Primary Action Button */}
        {currentRole === 'developer' || activeView === 'admin-apps' ? (
          <button
            onClick={onOpenCreateAppModal}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-xl shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Créer une application</span>
          </button>
        ) : (
          <button
            onClick={onOpenInviteUserModal}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-xl shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Inviter un utilisateur</span>
          </button>
        )}
      </div>
    </header>
  );
};
