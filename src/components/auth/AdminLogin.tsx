import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, KeyRound, Sparkles } from 'lucide-react';
import { User } from '../../types/baas';

interface AdminLoginProps {
  onLoginSuccess: (user: User) => void;
  onBackToPublic?: () => void;
  onSwitchToClientLogin?: () => void;
  adminUsers: User[];
  theme?: 'light' | 'dark';
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToPublic,
  onSwitchToClientLogin,
  adminUsers,
}) => {
  const navigate = useNavigate();
  const defaultAdmin = adminUsers.find((u) => u.role === 'admin') || adminUsers[0];

  const [email, setEmail] = useState(defaultAdmin?.email || 'princeieugene48@gmail.com');
  const [password, setPassword] = useState('••••••••••••');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBack = () => {
    if (onBackToPublic) onBackToPublic();
    else navigate('/');
  };

  const handleSwitchClient = () => {
    if (onSwitchToClientLogin) onSwitchToClientLogin();
    else navigate('/client/login');
  };

  const handleSuccess = (user: User) => {
    onLoginSuccess(user);
    navigate('/admin/dashboard');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const targetUser = adminUsers.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (!targetUser) {
        setError('Identifiants administrateur introuvables sur ce cluster.');
        return;
      }

      if (targetUser.role !== 'admin') {
        setError('Ce compte ne dispose pas des privilèges Super-Administrateur. Veuillez utiliser l\'espace client.');
        return;
      }

      if (targetUser.status === 'blocked') {
        setError('Ce compte administrateur est actuellement suspendu.');
        return;
      }

      handleSuccess(targetUser);
    }, 400);
  };

  const handleQuickDemoAdmin = () => {
    if (defaultAdmin) {
      setEmail(defaultAdmin.email);
      setPassword('MasterAdmin2026!');
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        handleSuccess(defaultAdmin);
      }, 300);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f9fa] dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200">
      {/* Top navigation */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au portail public</span>
        </button>

        <button
          onClick={handleSwitchClient}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          Vous êtes client / développeur ?
        </button>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto pt-6 pb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-colors">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 dark:from-blue-600 dark:to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Shield className="w-6 h-6 text-white" />
            </div>

            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 rounded-full mb-2">
              <Lock className="w-3 h-3" />
              Zone Restreinte Super-Admin
            </span>

            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Console d'Administration Globale
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Authentifiez-vous avec vos privilèges de super-administrateur pour piloter le serveur BaaS et les utilisateurs.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Adresse email Super-Admin
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@zenbaas.dev"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Clé Maître / Mot de passe
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  Certificat RSA
                </span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <span>Vérification des privilèges...</span>
              ) : (
                <>
                  <span>Ouvrir la session Administrateur</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Preset */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleQuickDemoAdmin}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                  EP
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                    <span>{defaultAdmin?.name || 'Eugène Prince'}</span>
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 px-1.5 py-0.2 rounded">
                      Super Admin
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {defaultAdmin?.email || 'princeieugene48@gmail.com'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0">
                Connexion 1-Clic →
              </span>
            </button>
          </div>
        </div>

        {/* Security badge footer */}
        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-4 font-mono">
          Serveur Fastify v4.28 · TLS 1.3 Strict · Journal d'audit actif
        </p>
      </div>

      <div className="text-center text-xs text-slate-400 dark:text-slate-500">
        ZenBaaS Cloud Engine &copy; 2026. Tous droits réservés.
      </div>
    </div>
  );
};
