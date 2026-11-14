# SDK Node.js & Web (`@zenbase/sdk`)

Bienvenue dans la documentation officielle du package **`@zenbase/sdk`** — le client universel **Node.js**, **TypeScript** et **Web** pour la plateforme Backend-as-a-Service **Zenbase**.

Ce SDK est conçu sans dépendance externe lourde (basé sur l'API standard `fetch`) afin d'offrir une compatibilité native sur :
- **Environnements Serveurs & Runtimes JS** : Node.js (18+), Bun, Deno, Edge Workers
- **Frameworks Web Frontend & Fullstack** : React, Next.js, Vue, Nuxt, SvelteKit, Vite, Astro

---

## ⚡ Installation & Démarrage Rapide

### 1. Installation du package

Depuis la racine du monorepo ou votre projet :

```bash
# Avec npm
npm install ./sdks/js-ts

# Avec pnpm
pnpm add ./sdks/js-ts
```

### 2. Initialisation du client

```typescript
import { Zenbase } from '@zenbase/sdk';

const zb = new Zenbase({
  endpoint: 'http://localhost:8000', // URL de votre instance Zenbase
  apiKey: 'zb_pub_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // ou zb_sec_... côté serveur Node.js
});
```

### 3. Premier appel en 30 secondes

```typescript
// 1. Insérer un document JSON dans une collection NoSQL (créée à la volée)
const { data: todo, error } = await zb.collection('todos').create({
  title: 'Déployer mon application avec Zenbase',
  completed: false,
  priority: 'high',
});

// 2. Filtrer les documents avec SQLite JSON1
const highPriorityTodos = await zb
  .collection('todos')
  .where('completed', '==', false)
  .where('priority', '==', 'high')
  .orderBy('created_at', 'desc')
  .limit(10)
  .get();
```

---

## 🧭 Architecture du SDK

Le client `Zenbase` regroupe les 4 piliers de votre backend au sein d'une interface fluide et intégralement typée en TypeScript :

| Module | Accès SDK | Rôle principal |
| :--- | :--- | :--- |
| **Database NoSQL & BLOB** | `zb.collection(name)` / `zb.database` / `zb.blob` | Collections JSON1 sans migration, filtres avancés, validation de schéma optionnelle et stockage binaire BLOB intégré. |
| **Authentication** | `zb.auth` | Inscription, connexion Email/Mot de passe, authentification sans mot de passe par code OTP à 6 chiffres et gestion automatique du token Bearer. |
| **Cloud Storage** | `zb.storage` | Téléversement (`File`, `Blob`, `Buffer`, `Uint8Array`), organisation par dossiers logiques et suppression de fichiers isolés par application. |
| **Serverless Functions** | `zb.functions` | Exécution à la demande de vos Web Functions PHP isolées avec mesure du temps d'exécution. |

---

## 📚 Explorer la Documentation du SDK

La documentation détaillée est située directement dans le dossier [`sdks/js-ts/docs/`](./docs/usage.md) de ce SDK :

1. **[Guide d'utilisation (`docs/usage.md`)](./docs/usage.md)** : Tutoriels complets et cas d'usage pratiques pour chaque module (CRUD NoSQL, Schémas, BLOBs, Auth OTP, Upload de fichiers et Web Functions).
2. **[Référence API (`docs/reference.md`)](./docs/reference.md)** : Dictionnaire technique exhaustif de toutes les classes, signatures de méthodes, options de configuration et interfaces TypeScript exportées.
