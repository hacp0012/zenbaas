import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Shield,
  Code2,
  Server,
  Zap,
  ArrowRight,
  Key,
  Layers,
  Activity,
  CheckCircle2,
  Lock,
  ExternalLink,
  Sun,
  Moon,
  ChevronRight,
  Terminal,
} from 'lucide-react';

interface LandingPageProps {
  onGoToAdminLogin?: () => void;
  onGoToClientLogin?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToAdminLogin,
  onGoToClientLogin,
  theme = 'light',
  onToggleTheme,
}) => {
  const navigate = useNavigate();

  const handleAdminClick = () => {
    if (onGoToAdminLogin) onGoToAdminLogin();
    else navigate('/admin/login');
  };

  const handleClientClick = () => {
    if (onGoToClientLogin) onGoToClientLogin();
    else navigate('/client/login');
  };
  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Top Public Header */}
      <header className="h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight flex items-center gap-2">
              ZenBaaS
              <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/80 px-2 py-0.5 rounded-md">
                Fastify Cloud v2.4
              </span>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Mini Backend-as-a-Service Engine
            </span>
          </div>
        </div>

        {/* Center Live Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Cluster Paris-01 en ligne · 14ms p95</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Basculer le thème"
              aria-label="Basculer le thème"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          )}

          <button
            onClick={handleAdminClick}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 rounded-xl transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Portail Admin</span>
          </button>

          <button
            onClick={handleClientClick}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Espace Client / Dev</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold mb-6">
          <Zap className="w-3.5 h-3.5" />
          <span>Architecture découplée · Administration & Espace Client séparés</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
          La plateforme Backend-as-a-Service moderne, épurée et instantanée.
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Propulsé par le framework Fastify ultra-performant. Choisissez votre espace d'accès ci-dessous pour gérer l'infrastructure ou développer vos applications.
        </p>

        {/* Dual Portal Entry Cards (THE TWO DISTINCT ENTRANCES) */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* CARD 1: Espace Client & Développeur */}
          <div className="relative group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shadow-xs">
                  <Code2 className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full">
                  Pour les Développeurs
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Espace Client & Projets
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Connectez-vous pour concevoir vos backends, générer vos clés API et inspecter vos collections.
              </p>

              {/* Feature list */}
              <ul className="mt-6 space-y-3 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Gestion de vos applications (E-Commerce, Blog, Mobile API...)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Gestion des clés API (Clé publique et clé secrète avec masquage)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Explorateur de données et collections JSON à la Supabase</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Journal des requêtes HTTP en direct et Playground cURL</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleClientClick}
                className="w-full py-3 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 group-hover:bg-blue-700"
              >
                <span>Accéder à l'Espace Client</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-2">
                Accessible aux développeurs déclarés et nouveaux inscrits
              </p>
            </div>
          </div>

          {/* CARD 2: Console Administration Globale */}
          <div className="relative group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-slate-400 dark:hover:border-slate-600 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shadow-xs">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Accès Restreint Super-Admin
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Console d'Administration Globale
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Réservé au super-administrateur du serveur BaaS pour piloter les nœuds et les utilisateurs.
              </p>

              {/* Feature list */}
              <ul className="mt-6 space-y-3 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Tableau de bord global (utilisateurs inscrits, requêtes cumulées, RAM)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Gestion des utilisateurs (Changer les rôles, bloquer/débloquer, supprimer)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Vue globale de toutes les applications du cluster triées par propriétaire</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Contrôle des quotas de stockage et état du moteur Fastify Node.js</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleAdminClick}
                className="w-full py-3 px-4 text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Accéder à la Console Admin</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-2">
                Nécessite des privilèges d'administrateur système (Eugène Prince)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cluster Specs Strip */}
      <section className="border-y border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 py-10 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums font-mono">
                99.98%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Disponibilité SLA</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
                14.2 ms
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Latence p95 Fastify</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums font-mono">
                4 218
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Applications Hébergées</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums font-mono">
                48.2 M
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Requêtes API Mensuelles</p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Overview */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Conçu pour la rapidité et la simplicité
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Tout ce dont vos frontends React, Vue ou mobiles ont besoin pour stocker des données en temps réel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Moteur Fastify Embarqué</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Des vitesses de traitement 2x plus rapides qu'Express grâce au pipeline d'exécution ultra-optimisé de Fastify.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Collections BSON / JSON</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Structurez vos tables sans contrainte de migration rigide. Stockez vos documents avec validation schématique instantanée.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <Key className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Clés Publiques & Secrètes</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Découplez les droits clients et serveurs en toute sécurité. Whitelist CORS et révocation en un clic.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>ZenBaaS Mini Backend-as-a-Service Engine &copy; 2026. Déployé sur cluster Fastify.</p>
      </footer>
    </div>
  );
};
