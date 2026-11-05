/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import { Sidebar, MainView } from './components/common/Sidebar';
import { TopHeader } from './components/common/TopHeader';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { LandingPage } from './components/public/LandingPage';
import { AdminLogin } from './components/auth/AdminLogin';
import { ClientLogin } from './components/auth/ClientLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UserManagement } from './components/admin/UserManagement';
import { GlobalAppManagement } from './components/admin/GlobalAppManagement';
import { DeveloperAppList } from './components/developer/DeveloperAppList';
import { AppDetailView } from './components/developer/AppDetailView';
import { CreateAppModal } from './components/developer/CreateAppModal';
import { baasApi } from './services/api';
import {
  initialUsers,
  initialApps,
  initialCollections,
  initialDocuments,
  initialLogs,
} from './data/mockData';
import { User, AppItem, Collection, DataDocument, ApiLog, UserRole } from './types/baas';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Theme state with localStorage persistence
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zenbaas_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('zenbaas_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    addToast(
      theme === 'light' ? 'Mode Sombre Activé' : 'Mode Clair Activé',
      `Thème ${theme === 'light' ? 'sombre' : 'clair'} appliqué.`,
      'info'
    );
  };

  // Core Data states
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [apps, setApps] = useState<AppItem[]>(initialApps);
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [documents, setDocuments] = useState<DataDocument[]>(initialDocuments);
  const [logs, setLogs] = useState<ApiLog[]>(initialLogs);

  // Sync state with Fastify SQLite backend on mount
  useEffect(() => {
    const syncWithBackend = async () => {
      try {
        const [fetchedUsers, fetchedApps] = await Promise.all([
          baasApi.getUsers(),
          baasApi.getApps(),
        ]);
        if (fetchedUsers && fetchedUsers.length > 0) {
          setUsers(fetchedUsers);
        }
        if (fetchedApps && fetchedApps.length > 0) {
          setApps(fetchedApps);
        }
      } catch {
        // Fallback gracefully to mock data
      }
    };
    syncWithBackend();
  }, []);

  // Authenticated user session with persistence
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('zenbaas_user_id');
      if (savedId) {
        const found = initialUsers.find((u) => u.id === savedId);
        if (found) return found;
      }
    }
    return null;
  });

  // Sidebar collapse & active selected app state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);

  // Modals & Toasts
  const [showCreateAppModal, setShowCreateAppModal] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Helper to trigger toasts
  const addToast = (
    title: string,
    description?: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Login handler
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zenbaas_user_id', user.id);
    }
    setSelectedApp(null);

    addToast(
      'Connexion réussie',
      user.role === 'admin'
        ? `Bienvenue sur la console d'administration, ${user.name}.`
        : `Bienvenue dans votre espace client, ${user.name}.`,
      'success'
    );
  };

  // Logout handler
  const handleLogout = () => {
    const userName = currentUser?.name;
    setCurrentUser(null);
    setSelectedApp(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zenbaas_user_id');
    }
    navigate('/');
    addToast(
      'Déconnexion effectuée',
      userName ? `À bientôt, ${userName}.` : 'Session terminée en toute sécurité.',
      'info'
    );
  };

  // User actions (synced with Fastify SQLite)
  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    try {
      await baasApi.updateUserRole(userId, newRole);
    } catch (e) {
      console.warn('Role update fallback:', e);
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === 'active' ? 'blocked' : 'active' }
          : u
      )
    );
    try {
      await baasApi.toggleUserStatus(userId);
    } catch (e) {
      console.warn('Status toggle fallback:', e);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    try {
      await baasApi.deleteUser(userId);
    } catch (e) {
      console.warn('User delete fallback:', e);
    }
  };

  const handleCreateUser = async (name: string, email: string, role: UserRole) => {
    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 8),
      name,
      email,
      role,
      status: 'active',
      createdAt: new Date().toISOString().slice(0, 10),
      lastActive: 'À l\'instant',
      appsCount: 0,
    };
    setUsers((prev) => [newUser, ...prev]);

    try {
      const created = await baasApi.createUser(name, email, role);
      setUsers((prev) => prev.map((u) => (u.id === newUser.id ? created : u)));
    } catch (e) {
      console.warn('User create fallback:', e);
    }
  };

  // App actions (synced with Fastify SQLite)
  const handleToggleAppStatus = async (appId: string) => {
    setApps((prev) =>
      prev.map((a) =>
        a.id === appId
          ? { ...a, status: a.status === 'active' ? 'paused' : 'active' }
          : a
      )
    );
    try {
      await baasApi.toggleAppStatus(appId);
    } catch (e) {
      console.warn('App toggle fallback:', e);
    }
  };

  const handleDeleteApp = async (appId: string) => {
    setApps((prev) => prev.filter((a) => a.id !== appId));
    if (selectedApp?.id === appId) {
      setSelectedApp(null);
      navigate('/client/apps');
    }
    try {
      await baasApi.deleteApp(appId);
    } catch (e) {
      console.warn('App delete fallback:', e);
    }
    addToast('Application supprimée', 'L\'instance a été retirée du serveur.', 'info');
  };

  const handleUpdateApp = async (updated: AppItem) => {
    setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelectedApp(updated);
    try {
      await baasApi.updateApp(updated.id, updated);
    } catch (e) {
      console.warn('App update fallback:', e);
    }
  };

  const handleCreateApp = async (
    newAppPartial: Partial<AppItem>,
    templateType: 'ecommerce' | 'blog' | 'empty'
  ) => {
    try {
      const created = await baasApi.createApp(newAppPartial, templateType);
      setApps((prev) => [created, ...prev]);
      setSelectedApp(created);

      // Fetch collections generated in SQLite
      const appCols = await baasApi.getCollections(created.id);
      setCollections((prev) => [...prev, ...appCols]);

      addToast(
        'Application créée !',
        `L'instance "${created.name}" est prête sur le serveur Fastify & SQLite.`,
        'success'
      );
      navigate(`/client/apps/${created.id}`);
      return;
    } catch (err: any) {
      console.warn('CreateApp API fallback, using local seed:', err);
    }

    const newApp = newAppPartial as AppItem;
    setApps((prev) => [newApp, ...prev]);

    // Seed collections for the new app
    if (templateType === 'ecommerce') {
      const colProdId = 'col_prod_' + Math.random().toString(36).substring(2, 7);
      const colOrdId = 'col_ord_' + Math.random().toString(36).substring(2, 7);

      const colProducts: Collection = {
        id: colProdId,
        appId: newApp.id,
        name: 'products',
        description: 'Articles et catalogue',
        documentCount: 2,
        createdAt: new Date().toISOString().slice(0, 10),
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'price', type: 'number', required: true },
          { name: 'inStock', type: 'boolean', required: true },
        ],
      };

      const colOrders: Collection = {
        id: colOrdId,
        appId: newApp.id,
        name: 'orders',
        description: 'Commandes clients',
        documentCount: 1,
        createdAt: new Date().toISOString().slice(0, 10),
        fields: [
          { name: 'orderNumber', type: 'string', required: true },
          { name: 'totalAmount', type: 'number', required: true },
        ],
      };

      setCollections((prev) => [...prev, colProducts, colOrders]);

      const doc1: DataDocument = {
        id: 'doc_' + Math.random().toString(36).substring(2, 8),
        collectionId: colProdId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: { name: 'Exemple Produit A', price: 49.99, inStock: true },
      };
      const doc2: DataDocument = {
        id: 'doc_' + Math.random().toString(36).substring(2, 8),
        collectionId: colProdId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: { name: 'Exemple Produit B', price: 129.0, inStock: false },
      };

      setDocuments((prev) => [...prev, doc1, doc2]);
    } else if (templateType === 'blog') {
      const colPostId = 'col_post_' + Math.random().toString(36).substring(2, 7);
      const colPosts: Collection = {
        id: colPostId,
        appId: newApp.id,
        name: 'posts',
        description: 'Articles de blog',
        documentCount: 1,
        createdAt: new Date().toISOString().slice(0, 10),
        fields: [
          { name: 'title', type: 'string', required: true },
          { name: 'published', type: 'boolean', required: true },
        ],
      };
      setCollections((prev) => [...prev, colPosts]);
      setDocuments((prev) => [
        ...prev,
        {
          id: 'doc_' + Math.random().toString(36).substring(2, 8),
          collectionId: colPostId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          data: { title: 'Bienvenue sur votre nouveau blog', published: true },
        },
      ]);
    }

    addToast(
      'Application créée !',
      `L'instance "${newApp.name}" est prête. Vos clés d'API ont été générées.`,
      'success'
    );

    // Focus on new app & navigate to its detail route
    setSelectedApp(newApp);
    navigate(`/client/apps/${newApp.id}`);
  };

  // Data / Collection actions (synced with Fastify SQLite)
  const handleAddDocument = async (collectionId: string, data: Record<string, any>) => {
    if (selectedApp) {
      try {
        const createdDoc = await baasApi.createDocument(selectedApp.id, collectionId, data);
        setDocuments((prev) => [createdDoc, ...prev]);
        const refreshedLogs = await baasApi.getLogs(selectedApp.id);
        if (refreshedLogs) setLogs(refreshedLogs);
        return;
      } catch (e) {
        console.warn('Doc create API fallback:', e);
      }
    }

    const newDoc: DataDocument = {
      id: 'doc_' + Math.random().toString(36).substring(2, 8),
      collectionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data,
    };
    setDocuments((prev) => [newDoc, ...prev]);

    if (selectedApp) {
      const col = collections.find((c) => c.id === collectionId);
      const newLog: ApiLog = {
        id: 'log_' + Math.random().toString(36).substring(2, 8),
        appId: selectedApp.id,
        appName: selectedApp.name,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        method: 'POST',
        endpoint: `/api/v1/${selectedApp.slug}/${col?.name || 'data'}`,
        statusCode: 201,
        latencyMs: 16,
        ipAddress: '127.0.0.1',
        userAgent: 'ZenBaaS-Admin-Console',
        requestBody: data,
        responseBody: { id: newDoc.id, success: true },
      };
      setLogs((prev) => [newLog, ...prev]);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    if (selectedApp) {
      try {
        await baasApi.deleteDocument(selectedApp.id, docId);
      } catch (e) {
        console.warn('Doc delete API fallback:', e);
      }
    }
  };

  const handleCreateCollection = async (name: string, description: string) => {
    if (!selectedApp) return;
    try {
      const createdCol = await baasApi.createCollection(selectedApp.id, name, description);
      setCollections((prev) => [...prev, createdCol]);
      return;
    } catch (e) {
      console.warn('Collection create API fallback:', e);
    }

    const newCol: Collection = {
      id: 'col_' + Math.random().toString(36).substring(2, 8),
      appId: selectedApp.id,
      name,
      description,
      documentCount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      fields: [{ name: 'title', type: 'string', required: true }],
    };
    setCollections((prev) => [...prev, newCol]);
  };

  // Inspect an app from Admin
  const handleInspectAppFromAdmin = (app: AppItem) => {
    setSelectedApp(app);
    navigate(`/client/apps/${app.id}`);
  };

  // Active users for workspace layout
  const defaultAdmin = users.find((u) => u.role === 'admin') || users[0];
  const defaultDev = users.find((u) => u.role === 'developer') || users[1] || users[0];

  const adminActiveUser =
    currentUser?.role === 'admin' ? currentUser : defaultAdmin;
  const devActiveUser =
    currentUser?.role === 'developer' ? currentUser : defaultDev;

  // Workspace Layout Component for Admin or Client
  const renderWorkspace = (role: 'admin' | 'developer', content: React.ReactNode) => {
    const userForWorkspace = role === 'admin' ? adminActiveUser : devActiveUser;

    return (
      <div className="flex h-screen w-full bg-[#f8f9fa] dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden transition-colors duration-200">
        <ToastContainer toasts={toasts} onDismiss={removeToast} />

        {/* Sidebar */}
        <Sidebar
          currentRole={role}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          currentUser={userForWorkspace}
          selectedApp={selectedApp}
          onSelectApp={(app) => setSelectedApp(app)}
          onOpenCreateAppModal={() => setShowCreateAppModal(true)}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <TopHeader
            currentRole={role}
            selectedApp={selectedApp}
            onOpenCreateAppModal={() => setShowCreateAppModal(true)}
            onOpenInviteUserModal={() => navigate('/admin/users')}
            onSelectApp={(app) => setSelectedApp(app)}
            onLogout={handleLogout}
            theme={theme}
            onToggleTheme={toggleTheme}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {content}
            </div>
          </main>
        </div>

        {/* Create Application Modal */}
        <CreateAppModal
          isOpen={showCreateAppModal}
          onClose={() => setShowCreateAppModal(false)}
          onCreateApp={handleCreateApp}
          currentUserEmail={userForWorkspace.email}
          currentUserName={userForWorkspace.name}
        />
      </div>
    );
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      <Routes>
        {/* PUBLIC PORTAL */}
        <Route
          path="/"
          element={
            <LandingPage
              onGoToAdminLogin={() => navigate('/admin/login')}
              onGoToClientLogin={() => navigate('/client/login')}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          }
        />

        {/* AUTHENTICATION SCREENS */}
        <Route
          path="/admin/login"
          element={
            <AdminLogin
              onLoginSuccess={handleLoginSuccess}
              onBackToPublic={() => navigate('/')}
              onSwitchToClientLogin={() => navigate('/client/login')}
              adminUsers={users}
              theme={theme}
            />
          }
        />

        <Route
          path="/client/login"
          element={
            <ClientLogin
              onLoginSuccess={handleLoginSuccess}
              onBackToPublic={() => navigate('/')}
              onSwitchToAdminLogin={() => navigate('/admin/login')}
              users={users}
              theme={theme}
            />
          }
        />

        {/* ADMIN WORKSPACE ROUTES */}
        <Route
          path="/admin"
          element={<Navigate to="/admin/dashboard" replace />}
        />

        <Route
          path="/admin/dashboard"
          element={renderWorkspace(
            'admin',
            <AdminDashboard
              apps={apps}
              users={users}
              onToggleAppStatus={handleToggleAppStatus}
              onDeleteApp={handleDeleteApp}
              onSelectAppForInspect={handleInspectAppFromAdmin}
              onShowToast={addToast}
            />
          )}
        />

        <Route
          path="/admin/users"
          element={renderWorkspace(
            'admin',
            <UserManagement
              users={users}
              onUpdateRole={handleUpdateUserRole}
              onToggleStatus={handleToggleUserStatus}
              onDeleteUser={handleDeleteUser}
              onCreateUser={handleCreateUser}
              onShowToast={addToast}
            />
          )}
        />

        <Route
          path="/admin/apps"
          element={renderWorkspace(
            'admin',
            <GlobalAppManagement
              apps={apps}
              users={users}
              onToggleAppStatus={handleToggleAppStatus}
              onDeleteApp={handleDeleteApp}
              onSelectAppForInspect={handleInspectAppFromAdmin}
              onShowToast={addToast}
            />
          )}
        />

        {/* CLIENT / DEVELOPER WORKSPACE ROUTES */}
        <Route
          path="/client"
          element={<Navigate to="/client/apps" replace />}
        />

        <Route
          path="/client/apps"
          element={renderWorkspace(
            'developer',
            <DeveloperAppList
              apps={apps}
              currentUserEmail={devActiveUser.email}
              onSelectApp={(app) => {
                setSelectedApp(app);
                navigate(`/client/apps/${app.id}`);
              }}
              onOpenCreateModal={() => setShowCreateAppModal(true)}
              onShowToast={addToast}
            />
          )}
        />

        <Route
          path="/client/apps/:appId"
          element={renderWorkspace(
            'developer',
            <AppDetailRouteWrapper
              apps={apps}
              collections={collections}
              documents={documents}
              logs={logs}
              selectedApp={selectedApp}
              setSelectedApp={setSelectedApp}
              onUpdateApp={handleUpdateApp}
              onAddDocument={handleAddDocument}
              onDeleteDocument={handleDeleteDocument}
              onCreateCollection={handleCreateCollection}
              onShowToast={addToast}
            />
          )}
        />

        {/* FALLBACK REDIRECT */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

/**
 * Route wrapper that resolves :appId from URL params and manages selectedApp state
 */
function AppDetailRouteWrapper({
  apps,
  collections,
  documents,
  logs,
  selectedApp,
  setSelectedApp,
  onUpdateApp,
  onAddDocument,
  onDeleteDocument,
  onCreateCollection,
  onShowToast,
}: {
  apps: AppItem[];
  collections: Collection[];
  documents: DataDocument[];
  logs: ApiLog[];
  selectedApp: AppItem | null;
  setSelectedApp: (app: AppItem | null) => void;
  onUpdateApp: (updated: AppItem) => void;
  onAddDocument: (collectionId: string, data: Record<string, any>) => void;
  onDeleteDocument: (docId: string) => void;
  onCreateCollection: (name: string, description: string) => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();

  const currentApp = apps.find((a) => a.id === appId) || selectedApp;

  useEffect(() => {
    if (currentApp && (!selectedApp || selectedApp.id !== currentApp.id)) {
      setSelectedApp(currentApp);
    }
  }, [currentApp, selectedApp, setSelectedApp]);

  if (!currentApp) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Application introuvable
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          L'application avec l'identifiant "{appId}" n'a pas été trouvée sur ce cluster ou a été supprimée.
        </p>
        <button
          onClick={() => navigate('/client/apps')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
        >
          Retour à mes applications
        </button>
      </div>
    );
  }

  return (
    <AppDetailView
      app={currentApp}
      collections={collections}
      documents={documents}
      logs={logs}
      onBack={() => {
        setSelectedApp(null);
        navigate('/client/apps');
      }}
      onUpdateApp={onUpdateApp}
      onAddDocument={onAddDocument}
      onDeleteDocument={onDeleteDocument}
      onCreateCollection={onCreateCollection}
      onShowToast={onShowToast}
    />
  );
}
