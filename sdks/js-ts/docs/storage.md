# Stockage de fichiers — `@hacp0012/zenbase-sdk`

Le module `zb.storage` permet de téléverser, lister, télécharger et supprimer des fichiers dans l'espace de stockage isolé de votre application (`storage/app/public/tenants/{app_id}/`), tout en appliquant automatiquement le quota disque configuré pour votre compte.

> Voir aussi : [Démarrage & Initialisation](./getting-started.md) · [Référence API `StorageModule`](./reference.md).

---

## 1. Téléverser un fichier (`upload`)

La méthode `upload` accepte un objet `File` / `Blob` dans le navigateur ainsi qu'un `Buffer`, `Uint8Array` ou `string` sous Node.js.

### Dans le navigateur

```typescript
const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
const file = fileInput.files![0];

const { url, fileUrl, data, error } = await zb.storage.upload(
  'avatars/profile.png',
  file,
  { folder: '/avatars' }
);

console.log('URL publique du fichier :', fileUrl);
```

### Sous Node.js

```typescript
import { readFileSync } from 'node:fs';

const buffer = readFileSync('./facture.pdf');

const { url, error } = await zb.storage.upload('factures/2026-01.pdf', buffer, {
  folder: '/factures',
  filename: '2026-01.pdf',
  mimeType: 'application/pdf',
});
```

> **Quota de stockage :** si l'envoi dépasse la limite attribuée par l'administrateur, le serveur renvoie une erreur HTTP `413` dans `error`.

---

## 2. Lister les fichiers (`list`)

```typescript
// Lister tous les fichiers de l'application
const { data: allFiles } = await zb.storage.list();

// Filtrer par dossier logique
const { data: avatars } = await zb.storage.list('/avatars');
```

---

## 3. URLs publiques et téléchargement (`getPublicUrl`, `getDownloadUrl`, `download`)

```typescript
// Générer les URLs publiques et de téléchargement forcé sans appel réseau
const publicUrl = zb.storage.getPublicUrl(fileId);
const downloadUrl = zb.storage.getDownloadUrl(fileId);

// Télécharger directement un fichier sous forme de Blob
const { data: blob, error: dlError } = await zb.storage.download(fileId);
```

---

## 4. Consulter l'espace disque et le quota (`getUsage`)

```typescript
const { data: usage } = await zb.storage.getUsage();

console.log('Utilisé (octets) :', usage?.user_used_bytes);
console.log('Quota max (Mo) :', usage?.max_storage_mb);
console.log('Restant (octets) :', usage?.remaining_bytes);
```

---

## 5. Supprimer un ou plusieurs fichiers (`delete`, `deleteMany`)

```typescript
// Supprimer un fichier par son UUID ou son chemin
await zb.storage.delete(fileId);

// Supprimer plusieurs fichiers en parallèle
const { data: batch } = await zb.storage.deleteMany([fileId1, fileId2]);
console.log('Supprimés :', batch?.deleted, 'Échecs :', batch?.failed);
```
