import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Lock, Mail, ArrowLeft, ArrowRight, Code2, AlertCircle, Sparkles, UserCheck } from 'lucide-react';
import { User } from '../../types/baas';

interface ClientLoginProps {
  onLoginSuccess: (user: User) => void;
  onBackToPublic?: () => void;
  onSwitchToAdminLogin?: () => void;
  users: User[];
  theme?: 'light' | 'dark';
}

export const ClientLogin: React.FC<ClientLoginProps> = ({
  onLoginSuccess,
  onBackToPublic,
  onSwitchToAdminLogin,
  users,
}) => {
  const navigate = useNavigate();
  const defaultDev = users.find((u) => u.email === 'princeieugene48@gmail.com') || users[0];

  const [email, setEmail] = useState(defaultDev?.email || '');
  const [password, setPassword] = useState('••••••••••••');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBack = () => {
    if (onBackToPublic) onBackToPublic();
    else navigate('/');
  };

  const handleSwitchAdmin = () => {
    if (onSwitchToAdminLogin) onSwitchToAdminLogin();
    else navigate('/admin/login');
  };

  const handleSuccess = (user: User) => {
    onLoginSuccess(user);
    navigate('/client/apps');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (isRegisterMode) {
        if (!registerName.trim()) {
          setError('Veuillez saisir votre nom complet.');
          return;
        }

        const newUser: User = {
          id: 'usr_' + Math.random().toString(36).substring(2, 8),
          name: registerName.trim(),
          email: email.trim(),
          role: 'developer',
          status: 'active',
          createdAt: new Date().toISOString().slice(0, 10),
          lastActive: 'À l\'instant',
          appsCount: 0,
        };

        handleSuccess(newUser);
        return;
      }

      const existingUser = users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (!existingUser) {
        // Allow developer auto-provisioning for smooth developer onboarding
        const fallbackDev: User = {
          id: 'usr_dev_' + Math.random().toString(36).substring(2, 7),
          name: email.split('@')[0] || 'Développeur',
          email: email.trim(),
          role: 'developer',
          status: 'active',
          createdAt: new Date().toISOString().slice(0, 10),
          lastActive: 'À l\'instant',
          appsCount: 1,
        };
        handleSuccess(fallbackDev);
        return;
      }

      if (existingUser.status === 'blocked') {
        setError('Votre compte développeur a été suspendu par l\'administrateur.');
        return;
      }

      handleSuccess(existingUser);
    }, 350);
  };

  const handleSelectPredefinedDev = (devUser: User) => {
    setEmail(devUser.email);
    setPassword('Developer2026!');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      handleSuccess(devUser);
    }, 250);
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
          onClick={handleSwitchAdmin}
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Accès Super-Administrateur →
        </button>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto pt-6 pb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-colors">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Code2 className="w-6 h-6 text-white" />
            </div>

            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 px-2.5 py-0.5 rounded-full mb-2">
              <Database className="w-3 h-3" />
              Espace Client & Développeur
            </span>

            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isRegisterMode ? 'Créer un compte Développeur' : 'Connexion à votre espace client'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {isRegisterMode
                ? 'Rejoignez la plateforme et déployez vos backends en quelques secondes.'
                : 'Accédez à vos applications, gérez vos clés d\'API et explorez vos collections de données.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nom ou Organisation
                </label>
                <input
                  type="text"
                  required
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="ex: Alex Studio"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Adresse email développeur
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dev@monprojet.fr"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mot de passe
                </label>
                {!isRegisterMode && (
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                    Mot de passe oublié ?
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
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
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <span>Connexion en cours...</span>
              ) : (
                <>
                  <span>
                    {isRegisterMode ? 'Créer mon espace développeur' : 'Accéder à mes applications'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Register / Login mode */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError(null);
              }}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {isRegisterMode
                ? 'Déjà inscrit ? Connectez-vous'
                : 'Pas encore de compte ? Inscription gratuite'}
            </button>
          </div>

          {/* Quick Demo Accounts Selection */}
          {!isRegisterMode && (
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Comptes Développeurs Démo (1-Clic) :
              </p>
              <div className="space-y-2">
                {users
                  .filter((u) => u.status === 'active')
                  .slice(0, 3)
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectPredefinedDev(u)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 rounded-xl text-left transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                          alt={u.name}
                          className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {u.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate font-mono">
                            {u.email}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 opacity-80 group-hover:opacity-100 shrink-0">
                        Entrer →
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-4 font-mono">
          API Key Engine · Fastify Node Runtime · SQLite & Postgres
        </p>
      </div>

      <div className="text-center text-xs text-slate-400 dark:text-slate-500">
        ZenBaaS Cloud Engine &copy; 2026. Tous droits réservés.
      </div>
    </div>
  );
};
