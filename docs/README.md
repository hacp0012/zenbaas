# Documentation Officielle de la Plateforme & des SDKs Zenbase

Bienvenue dans la documentation officielle de **Zenbase**, la plateforme Backend-as-a-Service (BaaS) modulaire propulsée par Laravel et SQLite JSON1.

L'architecture documentaire de Zenbase est organisée de manière décentralisée et modulaire :
- **`/docs`** : Contient la présentation générale de la plateforme et les concepts transversaux communs à tous les environnements.
- **`/sdks/<nom-du-sdk>/`** : Chaque SDK embarque sa propre documentation officielle (`README.md` et dossier `docs/`) au plus près de son code source pour garantir un versionnement et une publication npm/package autonomes.

---

## 📦 Catalogue des SDKs Officiels

| Langage / Plateforme | Package | Emplacement Monorepo | Statut | Documentation |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js & Web (JS / TS)** | `@zenbase/sdk` | `sdks/js-ts/` | ✅ Disponible | [Présentation](sdks/js-ts/README.md) · [Guide d'utilisation](sdks/js-ts/docs/usage.md) · [Référence API](sdks/js-ts/docs/reference.md) |
| **Dart / Flutter** (Mobile & Desktop) | `zenbase_flutter` | `sdks/dart/` | 🚧 Prévu | *À venir* |
| **Python** (Scripts, IA & Backends) | `zenbase-py` | `sdks/python/` | 🚧 Prévu | *À venir* |

---

## 🔑 Concepts Communs à Tous les SDKs

Peu importe le langage utilisé (JavaScript, TypeScript, Node.js, Dart ou Python), tous les SDKs Zenbase communiquent avec la passerelle universelle `/api/v1` du noyau Laravel et partagent les mêmes concepts fondamentaux :

### 1. Les Deux Types de Clés d'API
Chaque application créée dans le **Dashboard Client** génère deux clés distinctes :
- **Clé Publique (`zb_pub_...`)** : Conçue pour être utilisée dans les applications clientes (navigateur Web, React, Vue, application mobile Flutter). Elle est soumise aux politiques **CORS** configurées pour l'application.
- **Clé Secrète / Service (`zb_sec_...`)** : Conçue exclusivement pour les environnements serveurs sécurisés (serveur Node.js, script Python, worker backend). Elle contourne les restrictions CORS frontales et ne doit **jamais** être exposée publiquement.

### 2. Les 4 Modules Principaux
Chaque SDK expose une interface unifiée autour de 4 modules :
1. **`database` (ou `.collection()`)** : Base de données orientée documents NoSQL propulsée sous le capot par un fichier SQLite isolé par application et l'extension JSON1 (avec support optionnel des schémas de validation et des champs binaires `BLOB`).
2. **`auth`** : Authentification des utilisateurs finaux de l'application (stockés dans la table `auth_users` de la base SQLite de l'application) par **Email/Mot de passe** ou **Code OTP à 6 chiffres par e-mail**.
3. **`storage`** : Gestionnaire de fichiers isolé par application (`upload`, `list`, `delete`) avec prise en charge des dossiers logiques.
4. **`functions`** : Invocation des **Web Functions PHP Serverless** exécutées dans le bac à sable isolé de l'application.

### 3. Format Standardisé des Réponses
Toutes les méthodes des SDKs retournent une structure prévisible `{ data, error }` afin d'éviter les exceptions non gérées et de garantir un typage strict :

```json
{
  "data": { ... },
  "error": null
}
```
