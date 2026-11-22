# Guide d'utilisation — SDK Node.js & Web (`@zenbase/sdk`)

Ce guide présente par l'exemple toutes les fonctionnalités du SDK **`@zenbase/sdk`** pour interagir avec votre serveur **Zenbase BaaS** depuis une application Web (React, Vue, Next.js, Vite) ou un serveur **Node.js**.

> 📘 **Besoin d'une signature exacte ou d'un type TypeScript ?** Consultez la [Référence API complète](./reference.md) ou revenez à l'[Introduction du SDK](../README.md).

---

## 1. Initialisation Client vs Serveur Node.js

### Utilisation côté Navigateur Web (Clé Publique)
Dans une application frontend (React, Vue, etc.), utilisez toujours la **Clé Publique (`zb_pub_...`)**. L'accès est protégé par les origines **CORS** autorisées dans votre Dashboard Zenbase :

```typescript
import { Zenbase } from '@zenbase/sdk';

export const zb = new Zenbase({
  endpoint: import.meta.env.VITE_ZENBASE_ENDPOINT,
  apiKey: import.meta.env.VITE_ZENBASE_PUBLIC_KEY, // zb_pub_...
});
```

### Utilisation côté Serveur Node.js (Clé Secrète)
Dans un backend Node.js, une route API Next.js ou un script d'automatisation, utilisez la **Clé Secrète (`zb_sec_...`)** stockée dans vos variables d'environnement serveur :

```typescript
import { Zenbase } from '@zenbase/sdk';

export const zbAdmin = new Zenbase({
  endpoint: process.env.ZENBASE_ENDPOINT!,
  apiKey: process.env.ZENBASE_SECRET_KEY!, // zb_sec_... (contourne les restrictions CORS navigateur)
  timeoutMs: 10000, // Timeout optionnel en millisecondes
});

// En-têtes dynamiques après initialisation
zbAdmin.setHeader('X-App-Version', '2.1.0');
zbAdmin.removeHeader('X-App-Version');
console.log(zbAdmin.getEndpoint()); // https://.../api/v1
```

---

## 2. Base de Données NoSQL (`collection` / `database`)

Chaque application Zenbase dispose de sa propre base de données **SQLite isolée** utilisant l'extension **JSON1**. Vous manipulez des collections et des documents JSON sans créer de tables SQL au préalable.

### A. Créer un document (`create`)

Dès que vous insérez un document dans une collection, celle-ci est créée automatiquement si elle n'existe pas encore :

```typescript
interface Product {
  name: string;
  price: number;
  inStock: boolean;
  tags?: string[];
}

const { data: product, error } = await zb.collection<Product>('products').create({
  name: 'Casque Bluetooth Pro',
  price: 79.99,
  inStock: true,
  tags: ['audio', 'wireless'],
});

console.log(product?.id); // UUID généré automatiquement
```

### B. Interroger et filtrer des documents (`where`, `orderBy`, `limit`, `get`)

Le constructeur de requêtes traduit automatiquement vos filtres en expressions SQLite `json_extract` sécurisées :

```typescript
// Syntaxe directe (retourne un tableau enrichi contenant aussi { data, error })
const products = await zb
  .collection<Product>('products')
  .where('inStock', '==', true)
  .where('price', '<=', 150)
  .orderBy('price', 'asc')
  .limit(20)
  .get();

for (const item of products) {
  console.log(item.id, item.name, item.price);
}

// Ou par déstructuration { data, error }
const { data, error } = await zb
  .collection<Product>('products')
  .where('name', 'contains', 'Casque')
  .get();
```

> **Note de compatibilité :** La syntaxe alternative `await zb.database.from('products').select()` est également supportée.

#### Opérateurs de filtrage supportés dans `.where(champ, operateur, valeur)` :
| Opérateur | Description | Exemple |
| :--- | :--- | :--- |
| `'=='` ou `'='` | Égalité stricte | `.where('inStock', '==', true)` |
| `'!='` ou `'<>'` | Différent de | `.where('status', '!=', 'archived')` |
| `'>'`, `'>='`, `'<'`, `'<='` | Comparaisons numériques ou dates | `.where('price', '>', 50)` |
| `'contains'` ou `'like'` | Recherche de sous-chaîne | `.where('title', 'contains', 'Zenbase')` |
| `'in'` | Valeur comprise dans un tableau | `.where('category', 'in', ['tech', 'audio'])` |

### C. Récupérer un document par son ID (`find`)

```typescript
const { data: item, error } = await zb
  .collection<Product>('products')
  .find('550e8400-e29b-41d4-a716-446655440000');
```

### D. Mettre à jour, remplacer ou faire un Upsert (`update`, `replace`, `upsert`)

Par défaut, `update` fusionne (`merge`) les champs fournis avec le document JSON existant. Utilisez `replace` pour remplacer l'intégralité du document JSON, ou `upsert` pour mettre à jour un document existant et le créer automatiquement s'il n'existe pas encore :

```typescript
// Fusion partielle (met uniquement à jour le prix et inStock)
const { data: updated, error } = await zb
  .collection<Product>('products')
  .update(product.id, {
    price: 69.99,
    inStock: false,
  });

// Remplacement complet du document JSON
await zb.collection<Product>('products').replace(product.id, {
  name: 'Casque Bluetooth Pro v2',
  price: 89.99,
  inStock: true,
});

// Upsert : met à jour le document 'featured-product' ou le crée s'il n'existe pas
await zb.collection<Product>('products').upsert('featured-product', {
  name: 'Offre Spéciale',
  price: 49.99,
  inStock: true,
});
```

### E. Raccourcis de requêtes : `first`, `count`, `exists`, `paginate`, `whereIn`, `whereContains`

```typescript
// Récupérer uniquement le premier document correspondant
const { data: cheapest } = await zb
  .collection<Product>('products')
  .where('inStock', '==', true)
  .orderBy('price', 'asc')
  .first();

// Compter les documents côté serveur sans les télécharger
const { data: inStockCount } = await zb
  .collection('products')
  .whereIn('category', ['audio', 'tech'])
  .whereContains('name', 'Casque')
  .count();

// Vérifier l'existence d'un document (par ID ou selon les filtres)
const { data: hasFeatured } = await zb.collection('products').exists('featured-product');

// Pagination serveur complète avec recherche plein-texte
const { data: page1 } = await zb.collection<Product>('products').paginate({
  page: 1,
  perPage: 20,
  search: 'Bluetooth',
  orderBy: 'created_at',
  direction: 'desc',
});
console.log(page1?.items, page1?.total, page1?.last_page);
```

### F. Supprimer un document (`delete`)

```typescript
const { data, error } = await zb
  .collection('products')
  .delete(product.id);
```

### G. Créer, lister et supprimer des collections (`database.createCollection`, `listCollections`, `deleteCollection`)

```typescript
// Créer explicitement une collection (avec schéma optionnel)
await zb.database.createCollection('products', {
  strict: false,
  fields: [{ name: 'name', type: 'string', required: true }],
});

// Lister toutes les collections de l'application
const { data: collections } = await zb.database.listCollections();
// [{ name: 'products', count: 12, schema: { ... }, created_at: '...' }, ...]

// Supprimer définitivement une collection et ses documents
await zb.database.deleteCollection('old_logs');
// ou directement depuis le builder :
await zb.collection('old_logs').deleteCollection();
```

### G. Définir un Schéma Optionnel sur une Collection (`setSchema` / `getSchema`)

Par défaut, les collections Zenbase sont **Schema-less**. Vous pouvez toutefois définir un schéma de validation (strict ou flexible) sur une collection avec les types `string`, `number`, `boolean`, `object`, `array` et `blob` :

```typescript
// Définir un schéma sur la collection 'products'
await zb.collection('products').setSchema({
  strict: true, // Rejette tout champ non déclaré dans le schéma
  fields: [
    { name: 'name', type: 'string', required: true, description: 'Nom du produit' },
    { name: 'price', type: 'number', required: true },
    { name: 'inStock', type: 'boolean', required: false, default: true },
    { name: 'thumbnail', type: 'blob', required: false },
  ],
});

// Récupérer le schéma actif
const { data: schemaInfo } = await zb.collection('products').getSchema();

// Supprimer le schéma (revenir en mode Schema-less)
await zb.collection('products').setSchema(null);
```

### H. Stocker et Lire des Données Binaires BLOB dans la Base JSON (`ZenbaseBlob`)

La base de données NoSQL JSON de Zenbase supporte nativement le format **BLOB** directement au sein de vos documents JSON via l'utilitaire `ZenbaseBlob` (`zb.blob`) :

```typescript
import { Zenbase, ZenbaseBlob } from '@zenbase/sdk';

// 1. Créer un champ BLOB à partir d'un Uint8Array, texte ou Base64
const avatarBlob = ZenbaseBlob.fromUint8Array(
  new Uint8Array([137, 80, 78, 71]),
  'image/png',
  'avatar.png'
);

// Ou depuis un fichier navigateur (File / Blob) :
// const avatarBlob = await ZenbaseBlob.fromBlob(fileInput.files[0]);

// 2. Insérer le document contenant le BLOB dans la collection
const doc = await zb.collection('profiles').create({
  username: 'marie_curie',
  avatar: avatarBlob,
});

// 3. Lire et décoder le BLOB
if (ZenbaseBlob.isBlob(doc.avatar)) {
  const bytes = ZenbaseBlob.toUint8Array(doc.avatar);
  const dataUrl = ZenbaseBlob.toDataUrl(doc.avatar); // 'data:image/png;base64,...'
}
```

---

## 3. Authentification Utilisateurs (`auth`)

Le module `auth` gère les utilisateurs finaux propres à votre application (stockés de manière isolée dans la table `auth_users` de la base SQLite de l'application).

Dès qu'un utilisateur s'inscrit ou se connecte, le SDK conserve automatiquement son token Bearer (`zb_token_...`) et l'attache à toutes les requêtes suivantes.

### A. Inscription et Connexion par E-mail / Mot de passe

```typescript
// 1. Inscription d'un nouvel utilisateur
const { user, token, error } = await zb.auth.signUp(
  'alice@exemple.com',
  'monSuperMotDePasse'
);

// 2. Connexion d'un utilisateur existant
const session = await zb.auth.signInWithPassword(
  'alice@exemple.com',
  'monSuperMotDePasse'
);

if (!session.error) {
  console.log('Connecté en tant que :', session.user?.email);
  console.log('Token de session :', session.token);
}
```

### B. Connexion sans mot de passe par Code OTP E-mail

Zenbase intègre un système d'OTP à 6 chiffres envoyé par e-mail (valable 10 minutes et à usage unique) :

```typescript
// Étape 1 : Demander l'envoi d'un code à 6 chiffres par e-mail
const { email, expires_at, error: sendError } = await zb.auth.sendOtp('bob@exemple.com');

// Étape 2 : Valider le code saisi par l'utilisateur
const { user, token, error: verifyError } = await zb.auth.verifyOtp(
  'bob@exemple.com',
  '123456'
);
```

### C. Profil, Changement de Mot de Passe, Écouteurs d'État & Déconnexion

```typescript
// S'abonner aux changements d'état d'authentification (React, Vue, etc.)
const unsubscribe = zb.auth.onAuthStateChange((event, session) => {
  console.log('Événement auth :', event, session.user?.email);
});

// Vérifier rapidement si un token est actif
if (zb.auth.isAuthenticated()) {
  const { data } = await zb.auth.getUser();
  console.log(data?.user);
}

// Modifier le mot de passe de l'utilisateur authentifié
const { data: pwdResult, error: pwdError } = await zb.auth.updatePassword(
  'monSuperMotDePasse',
  'nouveauMotDePasseTresSecurise'
);

// Restaurer manuellement un token sauvegardé (ex: depuis localStorage)
zb.auth.setToken(savedToken);

// Révoquer le token côté serveur et déconnecter l'utilisateur
await zb.auth.signOut();

// Ou effacer la session uniquement en mémoire locale (sans requête HTTP)
zb.auth.clearSession();

// Se désabonner de l'écouteur
unsubscribe();
```

---

## 4. Stockage de Fichiers (`storage`)

Le module `storage` permet d'uploader, de lister et de supprimer des fichiers dans l'espace isolé de votre application (`storage/app/public/tenants/{app_id}/`).

### A. Uploader un fichier (`upload`)

Compatible avec un objet `File` / `Blob` dans le navigateur ou un `Buffer` / `Uint8Array` / `string` sous Node.js :

```typescript
// Dans le navigateur (avec un <input type="file" />)
const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
const file = fileInput.files![0];

const { url, fileUrl, data, error } = await zb.storage.upload(
  'avatars/profile.png',
  file,
  { folder: '/avatars' }
);

console.log('URL publique du fichier :', fileUrl);
```

```typescript
// Sous Node.js (avec un Buffer ou une chaîne JSON/texte)
import { readFileSync } from 'node:fs';

const buffer = readFileSync('./facture.pdf');
const { url, error } = await zb.storage.upload('factures/2026-01.pdf', buffer, {
  folder: '/factures',
  filename: '2026-01.pdf',
  mimeType: 'application/pdf',
});
```

### B. Lister, Télécharger, Consulter le Quota et Supprimer (`list`, `download`, `getPublicUrl`, `getUsage`, `delete`, `deleteMany`)

```typescript
// Lister tous les fichiers de l'application
const { data: allFiles } = await zb.storage.list();

// Filtrer par dossier logique
const { data: avatars } = await zb.storage.list('/avatars');

// Générer les URLs publiques et de téléchargement sans appel réseau
const publicUrl = zb.storage.getPublicUrl(fileId);
const downloadUrl = zb.storage.getDownloadUrl(fileId);

// Télécharger directement un fichier sous forme de Blob
const { data: blob, error: dlError } = await zb.storage.download(fileId);

// Consulter l'espace disque utilisé et le quota maximal attribué par l'administrateur
const { data: usage } = await zb.storage.getUsage();
console.log('Utilisé (octets) :', usage?.user_used_bytes, 'Quota (Mo) :', usage?.max_storage_mb);

// Supprimer un fichier par son ID ou son chemin
await zb.storage.delete(fileId);

// Supprimer plusieurs fichiers en parallèle
const { data: batch } = await zb.storage.deleteMany([fileId1, fileId2]);
console.log('Supprimés :', batch?.deleted, 'Échecs :', batch?.failed);
```

---

## 5. Web Functions Serverless PHP (`functions`)

Les **Web Functions** vous permettent d'exécuter du code métier PHP isolé côté serveur (configuré depuis l'onglet *Web Functions PHP* de votre application dans le Dashboard Zenbase).

### A. Lister et invoquer des fonctions depuis le SDK (`list`, `invoke`)

```typescript
interface WelcomeResponse {
  success: boolean;
  item_id: string;
}

// Lister les Web Functions actives de l'application
const { data: availableFunctions } = await zb.functions.list();

// Invoquer une fonction avec payload JSON et en-têtes HTTP personnalisés optionnels
const { data, error, meta } = await zb.functions.invoke<WelcomeResponse>(
  'send-welcome-email',
  {
    name: 'Alex',
    plan: 'starter',
  },
  {
    headers: { 'X-Idempotency-Key': 'welcome-alex-001' },
  }
);

if (!error) {
  console.log('ID créé par la fonction :', data?.item_id);
  console.log('Temps d\'exécution :', meta?.duration_ms, 'ms');
}
```

### B. Écriture de la fonction PHP correspondante dans le Dashboard

Dans le Dashboard Zenbase, votre fonction PHP reçoit automatiquement `$event` (contenant le payload envoyé par le SDK) et `$context` (donnant accès à la base SQLite de l'application, au stockage, aux variables d'environnement secrètes et à l'utilisateur authentifié) :

```php
return function($event, $context) {
    $name = $event['payload']['name'] ?? 'Utilisateur';

    // Accès direct à la base SQLite NoSQL de l'application
    $newItem = $context->database->collection('notifications')->create([
        'message' => "Bienvenue, {$name} !",
        'read' => false,
        'created_at' => time(),
    ]);

    // Lecture d'une variable d'environnement secrète configurée dans le Dashboard
    $sender = $context->env['MAIL_FROM'] ?? 'noreply@zenbase.local';

    // Vérification optionnelle de l'utilisateur authentifié qui appelle la fonction
    $callerEmail = $context->auth->email();

    return [
        'status' => 201,
        'data' => [
            'success' => true,
            'item_id' => $newItem['id'],
            'sender' => $sender,
            'caller' => $callerEmail,
        ],
    ];
};
```
