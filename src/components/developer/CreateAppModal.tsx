import React, { useState } from 'react';
import { X, Sparkles, Database, Server, Check } from 'lucide-react';
import { AppItem } from '../../types/baas';

interface CreateAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateApp: (newApp: Partial<AppItem>, templateType: 'ecommerce' | 'blog' | 'empty') => void;
  currentUserEmail: string;
  currentUserName: string;
}

export const CreateAppModal: React.FC<CreateAppModalProps> = ({
  isOpen,
  onClose,
  onCreateApp,
  currentUserEmail,
  currentUserName,
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [dbEngine, setDbEngine] = useState<'Fastify SQLite' | 'PostgreSQL Engine' | 'In-Memory Store'>('Fastify SQLite');
  const [region, setRegion] = useState('eu-west-3 (Paris)');
  const [environment, setEnvironment] = useState<'production' | 'staging'>('production');
  const [template, setTemplate] = useState<'ecommerce' | 'blog' | 'empty'>('ecommerce');

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(autoSlug);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const randomId = 'app_' + Math.random().toString(36).substring(2, 9);
    const randomPubKey = 'pk_live_' + Math.random().toString(36).substring(2, 18);
    const randomSecKey = 'sk_live_sec_' + Math.random().toString(36).substring(2, 28);

    const newApp: Partial<AppItem> = {
      id: randomId,
      name: name.trim(),
      slug: slug || 'app-' + Math.floor(Math.random() * 1000),
      description: description.trim() || 'Backend-as-a-Service propulsé par Fastify.',
      ownerId: 'usr_current',
      ownerName: currentUserName,
      ownerEmail: currentUserEmail,
      status: 'active',
      createdAt: new Date().toISOString().slice(0, 10),
      region,
      environment,
      dbEngine,
      publicKey: randomPubKey,
      secretKey: randomSecKey,
      totalRequests: 0,
      requestsLast24h: 0,
      storageMb: 12.4,
      collectionsCount: template === 'ecommerce' ? 3 : template === 'blog' ? 2 : 0,
      p95LatencyMs: 14,
      allowedOrigins: ['*'],
    };

    onCreateApp(newApp, template);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-xs animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Créer une nouvelle application BaaS
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Déployez instantanément un mini-backend avec collections et clés API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Nom et Slug */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nom de l'application *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="ex: E-Commerce Storefront, Blog Headless..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Identifiant API (Slug URL)
              </label>
              <div className="flex items-center">
                <span className="bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-xl px-3 py-2 text-slate-500 dark:text-slate-400 text-xs font-mono">
                  api.zenbaas.dev/v1/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="mon-application"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-r-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description du projet
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description concise du rôle de ce backend..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Moteur DB Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Moteur de stockage (Backend Fastify)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDbEngine('Fastify SQLite')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  dbEngine === 'Fastify SQLite'
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>SQLite</span>
                  {dbEngine === 'Fastify SQLite' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Léger & Zero-config</p>
              </button>

              <button
                type="button"
                onClick={() => setDbEngine('PostgreSQL Engine')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  dbEngine === 'PostgreSQL Engine'
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>PostgreSQL</span>
                  {dbEngine === 'PostgreSQL Engine' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Scale relationnel</p>
              </button>

              <button
                type="button"
                onClick={() => setDbEngine('In-Memory Store')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  dbEngine === 'In-Memory Store'
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>In-Memory</span>
                  {dbEngine === 'In-Memory Store' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Sub-milliseconde</p>
              </button>
            </div>
          </div>

          {/* Starter Template Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Modèle de données initial
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTemplate('ecommerce')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  template === 'ecommerce'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                <span className="font-bold text-slate-900 dark:text-white block">E-Commerce</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">products, orders</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('blog')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  template === 'blog'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                <span className="font-bold text-slate-900 dark:text-white block">Blog CMS</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">posts, authors</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('empty')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  template === 'empty'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                <span className="font-bold text-slate-900 dark:text-white block">Vierge</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">0 collections</span>
              </button>
            </div>
          </div>

          {/* Region and Environment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Région d'hébergement
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="eu-west-3 (Paris)">eu-west-3 (Paris)</option>
                <option value="eu-west-1 (Irlande)">eu-west-1 (Irlande)</option>
                <option value="eu-central-1 (Francfort)">eu-central-1 (Francfort)</option>
                <option value="us-east-1 (N. Virginia)">us-east-1 (N. Virginia)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Environnement
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="production">Production</option>
                <option value="staging">Staging / Test</option>
              </select>
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Provisionner l'application</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
