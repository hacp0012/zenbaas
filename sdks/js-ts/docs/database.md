# Base de données NoSQL — `@zenbase/sdk`

Chaque application Zenbase dispose de sa propre base de données **SQLite isolée** propulsée par l'extension **JSON1**. Vous manipulez des collections et des documents JSON sans créer de tables SQL au préalable via `zb.collection(name)` ou `zb.database`.

> Voir aussi : [Démarrage & Initialisation](./getting-started.md) · [Référence API `DatabaseModule` & `CollectionQueryBuilder`](./reference.md).

---

## 1. Créer un document (`create`)

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

---

## 2. Interroger et filtrer des documents (`where`, `orderBy`, `limit`, `get`)

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

### Opérateurs de filtrage supportés dans `.where()`

| Opérateur | Description | Exemple |
| :--- | :--- | :--- |
| `'=='` ou `'='` | Égalité stricte | `.where('inStock', '==', true)` |
| `'!='` ou `'<>'` | Différent de | `.where('status', '!=', 'archived')` |
| `'>'`, `'>='`, `'<'`, `'<='` | Comparaisons numériques ou dates | `.where('price', '>', 50)` |
| `'contains'` ou `'like'` | Recherche de sous-chaîne | `.where('title', 'contains', 'Zenbase')` |
| `'in'` | Valeur comprise dans un tableau | `.where('category', 'in', ['tech', 'audio'])` |

---

## 3. Récupérer un document par son ID (`find`)

```typescript
const { data: item, error } = await zb
  .collection<Product>('products')
  .find('550e8400-e29b-41d4-a716-446655440000');
```

---

## 4. Mettre à jour, remplacer ou faire un Upsert (`update`, `replace`, `upsert`)

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

---

## 5. Raccourcis de requêtes et pagination (`first`, `count`, `exists`, `paginate`)

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

---

## 6. Supprimer un document (`delete`)

```typescript
const { data, error } = await zb
  .collection('products')
  .delete(product.id);
```

---

## 7. Gérer les collections (`createCollection`, `listCollections`, `deleteCollection`)

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

// Ou directement depuis le constructeur de collection :
await zb.collection('old_logs').deleteCollection();
```

---

## 8. Définir un schéma optionnel (`setSchema`, `getSchema`)

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

---

## 9. Données binaires BLOB dans la base JSON (`ZenbaseBlob`)

La base NoSQL JSON de Zenbase supporte nativement le format **BLOB** directement au sein de vos documents JSON via l'utilitaire `ZenbaseBlob` (`zb.blob`) :

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
