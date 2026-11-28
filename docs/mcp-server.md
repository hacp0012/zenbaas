# Serveur MCP (Model Context Protocol)

Zenbase intègre nativement un **serveur MCP distant (Streamable HTTP)** par application cliente, propulsé par `laravel/mcp`. Il permet à vos IDE et agents IA (**Cursor**, **Claude Code**, **VS Code**, **Antigravity**, **Windsurf**, etc.) d'inspecter et de manipuler directement le backend de votre application Zenbase sans installer de binaire local.

> Consultez également la documentation des [Web Functions PHP Serverless](./web-functions.md) et le guide [Démarrage du SDK JS/TS](../sdks/js-ts/docs/getting-started.md).

---

## 1. Vue d'ensemble & Endpoint

Chaque application Zenbase expose son contexte isolé (base NoSQL SQLite JSON1, utilisateurs Auth, fichiers Storage, Web Functions PHP) sur un endpoint HTTP unique :

- **URL** : `POST /mcp` (transport **Streamable HTTP** JSON-RPC 2.0)
- **Identifiant serveur** : `zenbase-app` (`v1.0.0`)
- **Portée** : **une seule application** déterminée automatiquement par la clé secrète fournie dans les en-têtes HTTP (isolation multi-tenant stricte).
- **Rate limiting** : soumis au plafond configuré sur l'application (`rate_limit`, par défaut `120` requêtes/minute par application).

---

## 2. Activation & Authentification

Par sécurité, le serveur MCP est **désactivé par défaut** (`opt-in`) pour chaque application.

### Activer MCP depuis le Dashboard
1. Ouvrez votre application dans le **Dashboard Client**.
2. Ouvrez le menu **AI → Serveur MCP** dans la barre latérale.
3. Cochez **Activer le serveur MCP pour cette application**, choisissez le niveau de permissions souhaité (mode **Lecture seule** recommandé pour commencer), puis enregistrez.

### En-têtes d'authentification acceptés
Seule la **clé secrète (`zb_sec_...`)** de l'application est autorisée :

```http
Authorization: Bearer zb_sec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Ou via l'en-tête dédié Zenbase :

```http
X-Zenbase-Api-Key: zb_sec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Codes de réponse d'erreur

| Statut HTTP | Code JSON-RPC | Cause |
| :--- | :--- | :--- |
| `401 Unauthorized` | `-32001` | Clé API manquante ou clé secrète invalide. |
| `403 Forbidden` | `-32003` | Clé publique (`zb_pub_...`) utilisée, serveur MCP désactivé pour l'application, compte propriétaire suspendu/expiré, ou en-tête `Origin` non autorisé. |
| `429 Too Many Requests` | — | Plafond de requêtes par minute atteint (`throttle:zenbase-mcp`). |

> **Avertissement de sécurité :** ne partagez jamais votre clé `zb_sec_...` dans un dépôt Git public ou un code frontend. Utilisez un fichier de configuration local ignoré par Git ou une variable d'environnement.

---

## 3. Configuration des clients IA

Le Dashboard génère automatiquement ces blocs pré-remplis dans **AI → Serveur MCP** de chaque application, ainsi que les **Skills Agents IA** téléchargeables dans **AI → Skills**.

### Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "zenbase-mon-app": {
      "url": "https://votre-instance-zenbase.tld/mcp",
      "headers": {
        "Authorization": "Bearer zb_sec_VOTRE_CLE_SECRETE"
      }
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add --transport http zenbase-mon-app https://votre-instance-zenbase.tld/mcp \
  --header "Authorization: Bearer zb_sec_VOTRE_CLE_SECRETE"
```

### VS Code (`.vscode/mcp.json`)

```json
{
  "servers": {
    "zenbase-mon-app": {
      "type": "http",
      "url": "https://votre-instance-zenbase.tld/mcp",
      "headers": {
        "Authorization": "Bearer zb_sec_VOTRE_CLE_SECRETE"
      }
    }
  }
}
```

### Antigravity / Configuration générique (`mcp_config.json`)

```json
{
  "mcpServers": {
    "zenbase-mon-app": {
      "serverUrl": "https://votre-instance-zenbase.tld/mcp",
      "headers": {
        "X-Zenbase-Api-Key": "zb_sec_VOTRE_CLE_SECRETE"
      }
    }
  }
}
```

### Tester en local avec l'inspecteur MCP

En environnement de développement, vous pouvez inspecter les tools, resources et prompts avec la commande officielle Laravel MCP :

```bash
php artisan mcp:inspector /mcp
```

---

## 4. Permissions granulaires & Sécurité

Les réglages MCP sont stockés dans la configuration de chaque application (`settings.mcp`) et appliqués dynamiquement à chaque requête :

| Paramètre | Défaut | Effet |
| :--- | :--- | :--- |
| `enabled` | `false` | Active ou coupe totalement l'accès à `/mcp` pour l'application. |
| `read_only` | `true` | N'expose que les 9 tools d'inspection en lecture seule. Tant que `read_only` est actif, toutes les options d'écriture ci-dessous sont forcées à `false`. |
| `allow_functions` | `false` | Autorise `upsert_function` et `invoke_function` (le code PHP reste strictement vérifié par le sandbox `FunctionRunnerService`). |
| `allow_auth_management` | `false` | Autorise `manage_tenant_user` (bloquer, débloquer ou supprimer un utilisateur final). |
| `allow_storage_write` | `false` | Autorise `delete_storage_file` (suppression d'un fichier dans le stockage isolé). |

### Garanties de sécurité intégrées
- **Masquage effectif des outils** : un outil désactivé par les permissions de l'application n'apparaît pas dans `tools/list` et retourne une erreur JSON-RPC s'il est appelé directement via `tools/call`.
- **Annotations MCP standards** : chaque outil déclare son comportement (`readOnlyHint`, `idempotentHint`, `destructiveHint`) afin que votre IDE puisse demander une confirmation explicite avant toute action destructive.
- **Zéro fuite de secrets** : les outils, ressources et prompts MCP n'exposent jamais `secret_key`, les valeurs des variables d'environnement (`.env`, seuls les **noms des clés** sont visibles), ni les `password_hash`, `otp_code` ou `access_token` des utilisateurs tenant.

---

## 5. Comment utiliser les Tools, Resources et Prompts MCP ?

Dans le protocole MCP, les 3 primitives se complètent :

1. **Tools (19)** — Ce sont les *actions* appelées automatiquement par l'agent IA pour inspecter ou modifier votre application (requêter des documents, créer un schéma, déployer une Web Function…).
2. **Resources (8)** — Ce sont des *documents en lecture seule* identifiés par une URI `zenbase://...` que vous pouvez attacher directement à votre conversation comme contexte :
   - **En langage naturel (tous les clients : Antigravity, Cursor, Claude Code, VS Code)** : citez simplement l'URI dans votre message, ex. *« Lis `zenbase://app/overview` et résume l'état de mon backend »*.
   - **Dans Claude Code** : tapez `@` dans le chat pour auto-compléter et joindre directement une ressource (`@zenbase-mon-app:zenbase://app/overview`).
   - **Dans VS Code (Copilot Chat)** : cliquez sur **Add Context → MCP Resources** (ou utilisez `#`) pour attacher l'URI.
   - **Templates d'URI** : pour `zenbase://collections/{collection}/schema` et `zenbase://functions/{function}/code`, remplacez `{collection}` ou `{function}` par le nom réel de la ressource (ex. `zenbase://collections/orders/schema`).
3. **Prompts guidés (8)** — Ce sont des *commandes expertes* déclenchées par l'utilisateur (`/...` dans Claude Code, VS Code, Cursor…) qui **injectent automatiquement le contexte réel** de votre application (collections, schémas, code de fonction, logs d'erreurs, règles CORS, clés `.env`) avant que l'IA ne réponde.

---

## 6. Catalogue complet des Tools, Resources & Prompts

### Tools disponibles (19)

| Module | Nom du Tool | Accès | Permission requise | Description |
| :--- | :--- | :--- | :--- | :--- |
| **App** | `get_app_info` | Lecture | `enabled` | Métadonnées, taille SQLite, compteurs, CORS, noms des clés `.env`, usage Storage et permissions MCP. |
| **Database** | `list_collections` | Lecture | `enabled` | Liste les collections NoSQL, leur nombre de documents et leur schéma éventuel. |
| **Database** | `get_collection_schema` | Lecture | `enabled` | Retourne le schéma de validation d'une collection (`strict`, `fields`, types autorisés). |
| **Database** | `query_records` | Lecture | `enabled` | Requêtage avancé : filtres SQLite JSON1 (`=`, `!=`, `>`, `<`, `like`, `contains`, `in`), recherche, tri, pagination ou comptage (`count_only`). |
| **Database** | `get_record` | Lecture | `enabled` | Récupère un document JSON par son ID. |
| **Database** | `create_collection` | Écriture | `!read_only` | Crée une collection avec un schéma de validation optionnel. |
| **Database** | `update_collection_schema` | Écriture | `!read_only` | Définit, modifie ou supprime (`null`) le schéma d'une collection. |
| **Database** | `delete_collection` | Destructif | `!read_only` | Supprime définitivement une collection et tous ses documents. |
| **Database** | `create_record` | Écriture | `!read_only` | Insère un nouveau document JSON (validé contre le schéma de la collection). |
| **Database** | `update_record` | Écriture | `!read_only` | Met à jour un document (fusion par défaut ou remplacement complet avec `replace: true`). |
| **Database** | `delete_record` | Destructif | `!read_only` | Supprime définitivement un document par ID. |
| **Auth** | `list_tenant_users` | Lecture | `enabled` | Liste les utilisateurs finaux inscrits (filtrables par email et statut `is_blocked`). |
| **Auth** | `manage_tenant_user` | Destructif | `!read_only` + `allow_auth_management` | Bloque (en révoquant le token), débloque ou supprime un utilisateur tenant. |
| **Storage** | `list_storage_files` | Lecture | `enabled` | Liste les fichiers stockés (filtrables par dossier logique) et le résumé de quota. |
| **Storage** | `delete_storage_file` | Destructif | `!read_only` + `allow_storage_write` | Supprime un fichier isolé par UUID, chemin ou nom d'origine. |
| **Functions** | `list_functions` | Lecture | `enabled` | Liste les Web Functions PHP, leur statut actif, leurs noms de clés `.env` et leur dernier log. |
| **Functions** | `get_function_code` | Lecture | `enabled` | Lit le code source PHP et les derniers logs d'exécution d'une Web Function. |
| **Functions** | `upsert_function` | Destructif | `!read_only` + `allow_functions` | Crée ou met à jour une Web Function PHP après validation statique du sandbox. |
| **Functions** | `invoke_function` | Destructif | `!read_only` + `allow_functions` | Exécute une Web Function active dans le sandbox avec un payload JSON. |

### Resources en lecture seule (8)

| URI | Type | MIME | Contenu & Cas d'usage |
| :--- | :--- | :--- | :--- |
| `zenbase://app/overview` | Statique | `application/json` | Vue consolidée de l'application (collections, functions, origines CORS, noms de clés `.env`, quotas, permissions MCP). Utile en début de session pour donner le contexte global à l'agent. |
| `zenbase://app/security` | Statique | `application/json` | Posture de sécurité consolidée (CORS wildcard, collections sans schéma ou non strictes, fonctions actives et erreurs récentes, utilisateurs bloqués, permissions MCP). |
| `zenbase://collections/{collection}/schema` | Template URI | `application/json` | Schéma de validation et types autorisés d'une collection précise. Utile avant de générer des formulaires, des types ou des validations client. |
| `zenbase://functions/{function}/code` | Template URI | `text/x-php` | Code source PHP complet d'une Web Function déployée. Permet d'attacher directement une fonction au chat pour revue ou refactoring. |
| `zenbase://docs/function-stubs` | Statique | `text/x-php` | Stubs PHP officiels (`zenbase-stubs.php`) documentant les signatures exactes de `$event` et `$context`. |
| `zenbase://docs/web-functions` | Statique | `text/markdown` | Guide complet des Web Functions PHP (sandbox, en-têtes HTTP, codes retour, limites 5 s, exemples). |
| `zenbase://docs/sdk-js` | Statique | `text/markdown` | Guide officiel de démarrage rapide du package `@hacp0012/zenbase-sdk`. |
| `zenbase://docs/sdk-reference` | Statique | `text/markdown` | Référence API exhaustive de `@hacp0012/zenbase-sdk` (Database, `ZenbaseBlob`, Auth, Storage, Functions et types TS exportés). |

### Prompts guidés / Commandes (8)

| Commande | Arguments | Contexte injecté & Cas d'usage |
| :--- | :--- | :--- |
| `/generate-sdk-types` | `target_file` *(optionnel)* | Injecte toutes vos collections et schémas pour générer un fichier TypeScript strict + client `@hacp0012/zenbase-sdk` typé. |
| `/build-web-function` | `function_name` *(requis)*, `goal` *(requis)* | Injecte vos collections et noms de clés `.env` pour concevoir une Web Function PHP conforme aux stubs et au sandbox. |
| `/debug-web-function` | `function_name` *(requis)* | Injecte automatiquement le code source PHP actuel de la fonction, ses **10 derniers logs / erreurs** et ses clés `.env` pour diagnostiquer et corriger un bug sans copier-coller. |
| `/design-collection-schema` | `collection` *(requis)*, `requirements` *(requis)* | Analyse vos collections existantes et conçoit un schéma JSON Zenbase strict (`string`, `number`, `boolean`, `object`, `array`, `blob`) prêt pour `create_collection` / `update_collection_schema`. |
| `/scaffold-crud-module` | `collection` *(requis)*, `framework` *(optionnel)* | Lit le schéma réel et des exemples de documents d'une collection pour générer un module CRUD complet et typé avec `@hacp0012/zenbase-sdk` (pagination, filtres JSON1, mutations). |
| `/setup-auth-flow` | `method` *(optionnel : `password`, `otp`, `both`)*, `framework` *(optionnel)* | Génère un flux complet `zb.auth` (inscription, connexion, OTP 6 chiffres, `onAuthStateChange`, garde de routes) en utilisant strictement `zb_pub_...` côté client. |
| `/build-webhook-function` | `provider` *(requis)*, `function_name` *(optionnel)* | Génère une Web Function PHP de réception webhook (Stripe, GitHub, Resend…) avec vérification HMAC SHA-256 (`hash_equals`) via `$context->env` et journalisation idempotente. |
| `/audit-app-security` | *(aucun)* | Injecte la posture de sécurité complète (CORS, permissions MCP, collections sans schéma, fonctions actives, quotas) pour produire un plan d'action sécurité priorisé. |

---

## 7. Exemples concrets avec votre agent IA

- **Utiliser une Resource** : *« Lis `zenbase://collections/orders/schema` puis crée un formulaire React validé avec Zod et connecté à `@hacp0012/zenbase-sdk`. »*
- **Utiliser une Resource de code** : *« Attache `zenbase://functions/stripe-webhook/code` et vérifie si la signature HMAC est bien validée avec `hash_equals`. »*
- **Lancer une commande guidée** : `/debug-web-function function_name=create-order` ou *« Utilise le prompt `audit-app-security` pour vérifier mon application avant mise en production. »*
- **Combiner Skills + MCP** : téléchargez les 3 skills depuis **AI → Skills** (`zenbase-skills.zip`) dans `.agents/skills/` (ou `.cursor/skills/` / `.claude/skills/`) de votre projet client afin que votre agent applique automatiquement toutes les conventions Zenbase.
