# Démarrage & Initialisation — `@hacp0012/zenbase-sdk`

Ce guide explique comment installer, configurer et initialiser **`@hacp0012/zenbase-sdk`** dans une application Web frontend (React, Vue, Next.js, Vite) ou dans un environnement serveur **Node.js (18+)**, **Bun** ou **Deno**.

> Parcourez les guides dédiés par fonctionnalité : [Base de données](./database.md) · [Authentification](./auth.md) · [Stockage de fichiers](./storage.md) · [Web Functions](./functions.md) · [Référence API](./reference.md).

---

## 1. Installation

Installez le package `@hacp0012/zenbase-sdk` dans votre projet JavaScript ou TypeScript :

```bash
# Avec npm
npm i @hacp0012/zenbase-sdk

# Avec pnpm
pnpm add @hacp0012/zenbase-sdk
```

---

## 2. Initialisation côté Navigateur Web (Clé Publique)

Dans une application cliente (React, Vue, Svelte, Vite, etc.), utilisez **toujours** la **Clé Publique (`zb_pub_...`)**. L'accès est protégé par les origines **CORS** autorisées dans votre Dashboard Zenbase :

```typescript
import { Zenbase } from "@hacp0012/zenbase-sdk";

export const zb = new Zenbase({
    endpoint: import.meta.env.VITE_ZENBASE_ENDPOINT,
    apiKey: import.meta.env.VITE_ZENBASE_PUBLIC_KEY, // zb_pub_...
});
```

---

## 3. Initialisation côté Serveur Node.js (Clé Secrète)

Dans un backend Node.js, une route API Next.js ou un script d'automatisation, utilisez la **Clé Secrète (`zb_sec_...`)** stockée dans vos variables d'environnement serveur. Elle contourne les restrictions CORS frontales et ne doit **jamais** être exposée côté navigateur :

```typescript
import { Zenbase } from "@hacp0012/zenbase-sdk";

export const zbAdmin = new Zenbase({
    endpoint: process.env.ZENBASE_ENDPOINT!,
    apiKey: process.env.ZENBASE_SECRET_KEY!, // zb_sec_...
    timeoutMs: 10000, // Timeout optionnel en millisecondes
});
```

---

## 4. En-têtes HTTP dynamiques et Endpoint

Vous pouvez personnaliser les en-têtes HTTP envoyés avec chaque requête à l'initialisation ou dynamiquement après la création de l'instance :

```typescript
// Ajouter ou modifier un en-tête global
zbAdmin.setHeader("X-App-Version", "2.1.0");

// Supprimer un en-tête personnalisé
zbAdmin.removeHeader("X-App-Version");

// Consulter l'URL normalisée de la passerelle API
console.log(zbAdmin.getEndpoint()); // https://.../api/v1
```

---

## 5. Gestion standardisée des réponses (`{ data, error }`)

Toutes les méthodes asynchrones du SDK retournent un objet prévisible `{ data, error, meta? }` afin d'éviter les exceptions non gérées :

```typescript
const { data, error } = await zb.collection("products").find("prod_123");

if (error) {
    console.error("Erreur Zenbase :", error);
    return;
}

console.log("Produit récupéré :", data);
```

---

## Étapes suivantes

- **[Base de données NoSQL](./database.md)** : CRUD JSON1, filtres, pagination, schémas de validation et BLOBs binaires.
- **[Authentification](./auth.md)** : Email/Mot de passe, OTP à 6 chiffres par e-mail et écouteurs de session.
- **[Stockage de fichiers](./storage.md)** : Upload, téléchargement, dossiers logiques et suivi des quotas.
- **[Web Functions PHP](./functions.md)** : Invocation de vos fonctions PHP serverless isolées.
