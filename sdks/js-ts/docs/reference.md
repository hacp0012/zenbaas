# Référence API — SDK Node.js & Web (`@zenbase/sdk`)

Cette page constitue la **référence technique exhaustive** du SDK **`@zenbase/sdk`** pour **Node.js (18+)**, **TypeScript**, **Bun**, **Deno** et les navigateurs modernes.

> Vous cherchez des exemples pratiques pas-à-pas ? Consultez le [Guide d'utilisation](./usage.md) ou l'[Introduction du SDK](../README.md).

---

## 1. Classe Principale `Zenbase` (et alias `BaaSClient`)

### Constructeur

```typescript
import { Zenbase, BaaSClient } from '@zenbase/sdk';

const zb = new Zenbase(config: ZenbaseConfig);
// ou via l'alias compatible :
const baas = new BaaSClient(config: ZenbaseConfig);
```

### Options de configuration (`ZenbaseConfig`)

| Propriété | Type | Requis | Description |
| :--- | :--- | :---: | :--- |
| `endpoint` | `string` | ✅ | URL de base de votre serveur Zenbase (ex: `'http://localhost:8000'` ou `'https://api.domaine.com'`). Le suffixe `/api/v1` est ajouté automatiquement s'il est absent. |
| `apiKey` | `string` | ✅ | Clé d'API de l'application : utilisez `zb_sec_...` côté serveur Node.js (accès complet sans restriction CORS) ou `zb_pub_...` côté client navigateur. |
| `headers` | `Record<string, string>` | ❌ | En-têtes HTTP additionnels envoyés avec chaque requête. |
| `fetch` | `typeof fetch` | ❌ | Implémentation personnalisée de `fetch` (utile pour les tests unitaires, proxys d'entreprise ou environnements isolés). |

### Propriétés et méthodes d'instance de `Zenbase`

| Membre | Type / Signature | Description |
| :--- | :--- | :--- |
| `zb.database` | `DatabaseModule` | Sous-module de gestion des collections et documents NoSQL JSON1. |
| `zb.auth` | `AuthModule` | Sous-module d'authentification des utilisateurs finaux (`auth_users`). |
| `zb.storage` | `StorageModule` | Sous-module de stockage et téléversement de fichiers isolés par application. |
| `zb.functions` | `FunctionsModule` | Sous-module d'invocation des Web Functions PHP serverless. |
| `zb.blob` | `typeof ZenbaseBlob` | Référence directe vers l'utilitaire statique `ZenbaseBlob` pour manipuler les champs binaires BLOB. |
| `zb.collection<T>(name)` | `(name: string) => CollectionQueryBuilder<T>` | Raccourci direct vers `zb.database.collection<T>(name)`. |

---

## 2. Référence `DatabaseModule` (`zb.database`)

Accès : `zb.database`

| Méthode | Signature | Retour | Description |
| :--- | :--- | :--- | :--- |
| `collection<T>(name)` | `(name: string)` | `CollectionQueryBuilder<T>` | Initialise un constructeur de requêtes typé sur la collection `name`. |
| `from<T>(name)` | `(name: string)` | `CollectionQueryBuilder<T>` | Alias de `collection<T>(name)` permettant d'écrire `zb.database.from('users').select()`. |
| `listCollections()` | `()` | `Promise<ZenbaseResponse<CollectionMetadata[]>>` | Retourne la liste de toutes les collections de l'application avec le nombre de documents et leur schéma éventuel. |

### Exemple `listCollections()`

```typescript
const { data: collections, error } = await zb.database.listCollections();

if (collections) {
  for (const col of collections) {
    console.log(col.name, col.count, col.schema ? 'Schéma actif' : 'Schema-less');
  }
}
```

---

## 3. Référence `CollectionQueryBuilder<T>` (`zb.collection(name)`)

Toutes les opérations CRUD, le filtrage JSON1 et la gestion du schéma d'une collection s'effectuent via `CollectionQueryBuilder<T>`.

### Méthodes de chaînage (Filtres, Tri & Pagination)

| Méthode | Signature | Description |
| :--- | :--- | :--- |
| `.where(field, operator, value)` | `(field: string, operator: FilterOperator, value?: unknown): this` | Ajoute un filtre `json_extract` sur un champ du document JSON. Si seulement 2 arguments sont fournis (`.where('active', true)`), l'opérateur `'=='` est utilisé implicitement. |
| `.orderBy(field, direction?)` | `(field: string, direction?: 'asc' \| 'desc'): this` | Trie les résultats sur un champ JSON ou système (`id`, `created_at`, `updated_at`). Par défaut `'asc'`. |
| `.limit(count)` | `(count: number): this` | Limite le nombre maximal de documents retournés (plafonné à `500` par requête). |
| `.offset(count)` | `(count: number): this` | Ignore les `count` premiers documents (utile pour la pagination par page). |

#### Opérateurs `FilterOperator` acceptés par `.where()`

- `'=='` ou `'='` : Égalité stricte
- `'!='` ou `'<>'` : Différence
- `'>'`, `'>='`, `'<'`, `'<='` : Comparaisons numériques ou lexicographiques (ISO dates)
- `'contains'` ou `'like'` : Recherche partielle insensible à la casse (`LIKE %val%`)
- `'in'` : Vérifie que la valeur appartient au tableau fourni (ex: `.where('role', 'in', ['admin', 'editor'])`)

### Méthodes d'exécution CRUD & Schéma

| Méthode | Signature | Retour | Description |
| :--- | :--- | :--- | :--- |
| `.get()` | `()` | `Promise<ZenbaseQueryResult<T>>` | Exécute la requête `SELECT` et retourne un tableau hybride itérable contenant également `{ data, error }`. |
| `.select()` | `()` | `Promise<ZenbaseQueryResult<T>>` | Alias exact de `.get()`. |
| `.find(id)` | `(id: string)` | `Promise<ZenbaseResponse<ZenbaseDocument<T>>>` | Récupère un document unique par son UUID `id`. |
| `.create(document)` | `(document: T)` | `Promise<ZenbaseDocument<T> & ZenbaseResponse<ZenbaseDocument<T>>>` | Insère un nouveau document JSON (valide le schéma s'il existe) et génère son UUID. |
| `.update(id, partial, replace?)` | `(id: string, partial: Partial<T>, replace?: boolean)` | `Promise<ZenbaseResponse<ZenbaseDocument<T>>>` | Met à jour un document. Par défaut `replace = false` (fusion partielle des clés JSON). Si `replace = true`, remplace tout le document. |
| `.delete(id)` | `(id: string)` | `Promise<ZenbaseResponse<{ deleted: boolean; id: string }>>` | Supprime définitivement le document `id` de la collection. |
| `.getSchema()` | `()` | `Promise<ZenbaseResponse<{ collection: string; schema: ZenbaseCollectionSchema \| null }>>` | Récupère la définition du schéma de la collection (ou `null` si Schema-less). |
| `.setSchema(schema)` | `(schema: ZenbaseCollectionSchema \| null)` | `Promise<ZenbaseResponse<{ collection: string; schema: ZenbaseCollectionSchema \| null }>>` | Définit ou met à jour le schéma de la collection. Passez `null` pour désactiver le schéma. |

---

## 4. Référence `ZenbaseBlob` (`zb.blob`)

L'utilitaire `ZenbaseBlob` permet d'encoder et de décoder des fichiers ou données binaires (`Uint8Array`, `Buffer`, `Blob`, `File`, chaînes Base64) directement dans un champ de document JSON NoSQL.

### Méthodes statiques de `ZenbaseBlob`

| Méthode | Signature | Retour | Description |
| :--- | :--- | :--- | :--- |
| `ZenbaseBlob.fromUint8Array` | `(bytes: Uint8Array \| ArrayBuffer, mimeType?: string, name?: string \| null)` | `ZenbaseBlobValue` | Encode un `Uint8Array`, `Buffer` Node.js ou `ArrayBuffer` en structure BLOB Zenbase. |
| `ZenbaseBlob.fromBase64` | `(base64OrDataUrl: string, mimeType?: string, name?: string \| null)` | `ZenbaseBlobValue` | Crée un `ZenbaseBlobValue` à partir d'une chaîne Base64 brute ou d'une Data URL (`data:...;base64,...`). |
| `ZenbaseBlob.fromText` | `(text: string, mimeType?: string, name?: string \| null)` | `ZenbaseBlobValue` | Encode une chaîne UTF-8 en objet BLOB Zenbase. |
| `ZenbaseBlob.fromBlob` | `(blob: Blob, name?: string \| null)` | `Promise<ZenbaseBlobValue>` | Convertit de manière asynchrone une instance `Blob` ou `File` standard en `ZenbaseBlobValue`. |
| `ZenbaseBlob.isBlob` | `(value: unknown)` | `value is ZenbaseBlobValue` | Type guard TypeScript vérifiant si un objet JSON est un BLOB Zenbase valide (`__type === 'blob'`). |
| `ZenbaseBlob.toUint8Array` | `(blob: ZenbaseBlobValue)` | `Uint8Array` | Décode le contenu Base64 du BLOB en `Uint8Array` binaire. |
| `ZenbaseBlob.toText` | `(blob: ZenbaseBlobValue)` | `string` | Décode le contenu du BLOB en texte UTF-8. |
| `ZenbaseBlob.toDataUrl` | `(blob: ZenbaseBlobValue)` | `string` | Génère une URL `data:<mime_type>;base64,<data>` prête pour un attribut `src` d'image ou d'audio. |

### Exemple sous Node.js avec `Buffer`

```typescript
import { readFileSync, writeFileSync } from 'node:fs';
import { Zenbase, ZenbaseBlob } from '@zenbase/sdk';

const pdfBytes = readFileSync('./contrat.pdf');
const blobField = ZenbaseBlob.fromUint8Array(pdfBytes, 'application/pdf', 'contrat.pdf');

const { data: saved } = await zb.collection('archives').create({
  reference: 'CTR-2026-001',
  attachment: blobField,
});

if (saved && ZenbaseBlob.isBlob(saved.attachment)) {
  const restoredBytes = ZenbaseBlob.toUint8Array(saved.attachment);
  writeFileSync('./contrat-restaure.pdf', restoredBytes);
}
```

---

## 5. Référence `AuthModule` (`zb.auth`)

Accès : `zb.auth`

| Méthode | Signature | Retour | Description |
| :--- | :--- | :--- | :--- |
| `signUp(email, password)` | `(email: string, password: string)` | `Promise<ZenbaseAuthSession>` | Crée un compte utilisateur dans la table `auth_users` de l'application et active immédiatement son token Bearer. |
| `signInWithPassword(email, password)` | `(email: string, password: string)` | `Promise<ZenbaseAuthSession>` | Authentifie un utilisateur par e-mail et mot de passe et mémorise son token Bearer. |
| `signIn(email, password)` | `(email: string, password: string)` | `Promise<ZenbaseAuthSession>` | Alias court de `signInWithPassword(email, password)`. |
| `sendOtp(email)` | `(email: string)` | `Promise<ZenbaseOtpDispatchResult>` | Génère et envoie un code OTP à 6 chiffres par e-mail (valide 10 minutes). |
| `verifyOtp(email, code)` | `(email: string, code: string)` | `Promise<ZenbaseAuthSession>` | Vérifie le code OTP à 6 chiffres et ouvre une session authentifiée. |
| `getUser()` | `()` | `Promise<ZenbaseResponse<{ user: ZenbaseUser }>>` | Interroge `/api/v1/auth/user` avec le token Bearer actif et met à jour le cache utilisateur. |
| `signOut()` | `()` | `Promise<ZenbaseResponse<{ signed_out: boolean }>>` | Révoque le token Bearer côté serveur et vide la session locale du SDK. |
| `getToken()` | `()` | `string \| null` | Retourne le token Bearer actuellement configuré dans le client HTTP. |
| `setToken(token)` | `(token: string \| null)` | `void` | Définit ou supprime manuellement le token Bearer d'authentification utilisateur. |
| `getCachedUser()` | `()` | `ZenbaseUser \| null` | Retourne le dernier profil `ZenbaseUser` récupéré en mémoire sans effectuer d'appel réseau. |

---

## 6. Référence `StorageModule` (`zb.storage`)

Accès : `zb.storage`

| Méthode | Signature | Retour | Description |
| :--- | :--- | :--- | :--- |
| `upload(path, file, options?)` | `(path: string, file: Blob \| File \| Uint8Array \| string, options?: UploadOptions)` | `Promise<ZenbaseUploadResult>` | Téléverse un fichier dans l'espace isolé du tenant. Retourne `{ url, fileUrl, data, error }`. |
| `list(folder?)` | `(folder?: string)` | `Promise<ZenbaseResponse<ZenbaseStoredFile[]>>` | Liste tous les fichiers de l'application, ou filtre uniquement ceux du dossier `folder` (ex: `'/avatars'`). |
| `delete(fileIdOrPath)` | `(fileIdOrPath: string)` | `Promise<ZenbaseResponse<{ deleted: boolean; file: string }>>` | Supprime le fichier physique et son enregistrement par son UUID `id` ou son chemin relatif. |

### Options de `zb.storage.upload`

```typescript
interface UploadOptions {
  folder?: string;   // Dossier logique (ex: '/documents', par défaut '/')
  filename?: string; // Nom de fichier explicite (sinon déduit de `path`)
  mimeType?: string; // Type MIME explicite lors de l'envoi d'un Buffer/Uint8Array ou string sous Node.js
}
```

---

## 7. Référence `FunctionsModule` (`zb.functions`)

Accès : `zb.functions`

| Méthode | Signature | Retour | Description |
| :--- | :--- | :--- | :--- |
| `invoke<TResponse>(functionName, payload?)` | `(functionName: string, payload?: Record<string, unknown>)` | `Promise<ZenbaseResponse<TResponse>>` | Exécute la Web Function PHP `functionName` avec les données `payload`. Le temps d'exécution est retourné dans `meta.duration_ms`. |

---

## 8. Interfaces & Types TypeScript Exportés

Tous les types suivants peuvent être importés directement depuis `@zenbase/sdk` :

```typescript
import type {
  ZenbaseConfig,
  FilterOperator,
  QueryFilter,
  ZenbaseResponse,
  ZenbaseDocument,
  ZenbaseQueryResult,
  ZenbaseUser,
  ZenbaseAuthSession,
  ZenbaseOtpDispatchResult,
  ZenbaseStoredFile,
  ZenbaseUploadResult,
  ZenbaseFieldType,
  ZenbaseSchemaField,
  ZenbaseCollectionSchema,
  ZenbaseBlobValue,
} from '@zenbase/sdk';
```

### Détail des Structures de Données

```typescript
interface ZenbaseResponse<T> {
  data: T | null;
  error: string | null;
  meta?: Record<string, unknown>;
}

type ZenbaseDocument<T = Record<string, unknown>> = T & {
  id: string;
  collection: string;
  data: T;
  created_at: string;
  updated_at: string;
};

interface ZenbaseCollectionSchema {
  strict?: boolean;
  fields: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'blob';
    required?: boolean;
    default?: unknown;
    description?: string | null;
  }>;
}

interface ZenbaseBlobValue {
  __type: 'blob';
  mime_type: string;
  name?: string | null;
  size: number;
  data: string; // Payload encodé en Base64
}
```
