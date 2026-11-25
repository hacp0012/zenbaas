# Web Functions (PHP Serverless)

Les **Web Functions** (également appelées *Edge Functions* dans le Dashboard) vous permettent d'exécuter du code métier **PHP Serverless** côté serveur, dans un bac à sable isolé propre à chaque application Zenbase.

Chaque fonction dispose d'un accès natif à la **base de données NoSQL SQLite**, au **stockage de fichiers**, au **contexte d'authentification utilisateur** ainsi qu'aux **variables d'environnement secrètes** de votre application.

> Consultez également le guide [Web Functions du SDK JS/TS](../sdks/js-ts/docs/functions.md) et la [Référence API du SDK JS/TS](../sdks/js-ts/docs/reference.md) pour invoquer vos fonctions depuis vos applications frontend ou Node.js.

---

## 1. Architecture et cycle d'exécution

Lorsqu'une Web Function est invoquée via la passerelle `/api/v1` ou depuis le testeur intégré du Dashboard, le moteur `FunctionRunnerService` applique systématiquement le cycle suivant :

1. **Résolution & statut** : vérifie que la fonction existe pour l'application courante (`404` sinon) et qu'elle est active (`is_active = true`, sinon `403`).
2. **Validation statique (Sandbox)** : analyse lexicale du code PHP (`token_get_all`) pour bloquer toute fonction ou instruction système interdite.
3. **Isolation du tenant** : connexion automatique au fichier SQLite isolé de l'application courante.
4. **Injection du contexte** : fusion des variables d'environnement globales de l'application avec celles spécifiques à la fonction, puis instanciation de `$context` (`ZenbaseFunctionContext`).
5. **Exécution encadrée** : exécution de la closure PHP avec un **timeout strict de 5 secondes** et capture de la sortie standard (`stdout`).
6. **Journalisation** : enregistrement automatique dans l'historique d'exécution de la fonction (les **50 dernières exécutions** sont conservées).

---

## 2. Anatomie d'une Web Function

Une Web Function Zenbase est un script PHP retournant une **fonction anonyme (closure)** recevant deux paramètres : `$event` et `$context`.

```php
<?php

return function ($event, $context) {
    /** @var \Zenbase\Context $context */

    // 1. Lire le payload JSON entrant
    $name = $event['payload']['name'] ?? 'Développeur Zenbase';

    // 2. Interagir avec la base NoSQL isolée de l'application
    $record = $context->database->collection('events')->create([
        'greeting' => "Bonjour, {$name} !",
        'user_id' => $context->auth->id(),
        'timestamp' => time(),
    ]);

    // 3. Lire un secret configuré dans le Dashboard
    $appEnv = $context->env['APP_ENV'] ?? 'production';

    // 4. Retourner une réponse HTTP structurée
    return [
        'status' => 201,
        'data' => [
            'success' => true,
            'environment' => $appEnv,
            'record' => $record,
        ],
    ];
};
```

### Règles de syntaxe importantes

- **Balise `<?php` optionnelle** : elle est nettoyée automatiquement lors de la compilation.
- **Démarrer directement par `return function (...)`** : après l'éventuelle balise `<?php`, le script doit commencer immédiatement par `return function ($event, $context)`. Ne placez pas d'instruction `use`, ni de bloc commentaire PHPDoc avant `return` ; placez vos annotations `/** @var ... */` **à l'intérieur** de la closure.
- **Nommage (slug)** : le nom d'une fonction est unique par application, limité à **64 caractères** et doit correspondre à l'expression `^[a-zA-Z0-9_-]+$` (ex. `send-welcome-email`, `stripe_webhook`).

---

## 3. L'objet `$event` (Données entrantes)

Le premier argument `$event` est un tableau associatif contenant les données envoyées par le client ainsi que les en-têtes HTTP de la requête :

| Clé | Type | Description |
| :--- | :--- | :--- |
| `$event['payload']` | `array<string, mixed>` | Corps JSON / paramètres de la requête entrante (`$request->all()` via l'API ou JSON saisi dans le testeur du Dashboard). |
| `$event['headers']` | `array<string, mixed>` | En-têtes HTTP de la requête entrante (`$request->headers->all()` via l'API, ou `['X-Zenbase-Dashboard-Test' => '1']` depuis le Dashboard). |
| `$event['<cle>']` | `mixed` | Raccourci : les clés de premier niveau du payload sont également décompressées à la racine de `$event`. Préférez `$event['payload']['<cle>']` pour éviter toute collision avec `'payload'` ou `'headers'`. |

> **Note sur les en-têtes HTTP :** via la passerelle API `/api/v1`, `$event['headers']` provient de `$request->headers->all()`, où les noms d'en-têtes sont en minuscules et chaque valeur est un tableau de chaînes (ex. `$event['headers']['x-signature'][0] ?? null`).

---

## 4. Format de réponse, codes HTTP et journaux

### A. Retourner un code HTTP personnalisé

Pour contrôler le statut HTTP renvoyé par l'API, retournez un tableau contenant à la fois une clé numérique `'status'` (entre `100` et `599`) et une clé `'data'` :

```php
return [
    'status' => 422,
    'data' => [
        'message' => 'Le champ email est requis.',
    ],
];
```

Si la valeur retournée ne contient pas la paire `['status' => int, 'data' => ...]`, Zenbase renvoie automatiquement le statut HTTP **`200`** avec la valeur retournée placée dans `'data'`.

### B. Enveloppe JSON renvoyée au client

La passerelle `/api/v1/functions/{functionName}/invoke` encapsule toujours la réponse dans le format standard Zenbase :

```json
{
  "data": {
    "success": true,
    "record": { "id": "550e8400-e29b-41d4-a716-446655440000" }
  },
  "error": null,
  "meta": {
    "duration_ms": 8.42,
    "status": 201
  }
}
```

En cas d'exception PHP non attrapée ou de violation du sandbox, le serveur retourne HTTP **`500`** avec `"data": null` et le message d'erreur dans `"error"`.

### C. Capture des logs (`echo` / `print`)

Toute sortie écrite sur `stdout` (via `echo` ou `print`) pendant l'exécution est interceptée via tampon de sortie (`ob_start`) afin de ne pas corrompre la réponse JSON. Elle est enregistrée dans le champ `output` du journal d'exécution, consultable dans l'onglet **Logs** de l'IDE du Dashboard. Si rien n'est affiché sur `stdout`, la représentation JSON de `data` est enregistrée à la place.

---

## 5. Référence de l'objet `$context`

Le second argument `$context` est une instance de `ZenbaseFunctionContext` exposant 4 propriétés isolées pour l'application courante :

- `$context->database` — Moteur NoSQL SQLite JSON1 (`NoSqlDatabaseEngine`)
- `$context->storage` — Gestionnaire de fichiers isolé de l'application
- `$context->auth` — Contexte de l'utilisateur final authentifié
- `$context->env` — Variables d'environnement secrètes fusionnées

### A. Base de données NoSQL (`$context->database`)

`$context->database` expose le constructeur de requêtes fluide `collection($name)` ainsi que les méthodes de gestion des collections :

```php
// Créer un document (crée la collection automatiquement si besoin)
$order = $context->database->collection('orders')->create([
    'customer' => 'Alice',
    'total' => 149.90,
    'status' => 'pending',
]);

// Filtrer, trier et paginer via SQLite JSON1
$pendingOrders = $context->database->collection('orders')
    ->where('status', '==', 'pending')
    ->where('total', '>=', 50)
    ->orderBy('created_at', 'desc')
    ->limit(20)
    ->offset(0)
    ->get();

// Récupérer par UUID
$found = $context->database->collection('orders')->find($order['id']);

// Mise à jour partielle (merge des clés JSON de premier niveau)
$updated = $context->database->collection('orders')->update($order['id'], [
    'status' => 'paid',
]);

// Supprimer un document
$deleted = $context->database->collection('orders')->delete($order['id']);

// Lister toutes les collections de l'application
$collections = $context->database->listCollections();
```

#### Méthodes disponibles sur `$context->database->collection($name)`

| Méthode | Signature | Retour | Description |
| :--- | :--- | :--- | :--- |
| `where` | `where(string $field, string $operator, mixed $value = null)` | `self` | Ajoute un filtre JSON1 (supporte aussi la notation pointée `author.name` et la forme courte à 2 arguments `where('active', true)`). |
| `orderBy` | `orderBy(string $field, string $direction = 'asc')` | `self` | Trie sur un champ JSON ou une colonne système (`id`, `created_at`, `updated_at`). |
| `limit` | `limit(int $limit)` | `self` | Limite le nombre de résultats (plafonné à `1000`). |
| `offset` | `offset(int $offset)` | `self` | Ignore les `N` premiers résultats. |
| `get` | `get()` | `array<int, array<string, mixed>>` | Exécute la requête et retourne les documents correspondants. |
| `select` | `select()` | `array<int, array<string, mixed>>` | Alias de `get()`. |
| `find` | `find(string $id)` | `array<string, mixed>\|null` | Récupère un document par son identifiant ou `null`. |
| `create` | `create(array $data)` | `array<string, mixed>` | Insère un document JSON (valide le schéma de collection s'il existe et normalise les champs BLOB). |
| `update` | `update(string $id, array $data)` | `array<string, mixed>\|null` | Met à jour partiellement un document existant (fusion des clés de premier niveau). |
| `delete` | `delete(string $id)` | `bool` | Supprime le document par son identifiant. |
| `getSchema` | `getSchema()` | `array<string, mixed>\|null` | Retourne le schéma de validation de la collection, ou `null` si Schema-less. |
| `setSchema` | `setSchema(?array $schema)` | `array<string, mixed>\|null` | Définit ou supprime (`null`) le schéma de validation de la collection. |

#### Opérateurs acceptés dans `->where()`

- `'='`, `'=='` : égalité stricte
- `'!='`, `'<>'` : différence
- `'>'`, `'>='`, `'<'`, `'<='` : comparaisons numériques ou dates ISO-8601
- `'contains'`, `'like'` : recherche de sous-chaîne
- `'in'` : appartenance à un tableau de valeurs (ex. `->where('role', 'in', ['admin', 'editor'])`)

#### Structure d'un document retourné

Chaque document retourné par `create()`, `find()`, `update()` ou `get()` possède le format suivant :

```php
[
    'id' => '550e8400-e29b-41d4-a716-446655440000',
    'collection' => 'orders',
    'customer' => 'Alice',          // Champs JSON à la racine
    'total' => 149.90,
    'data' => [                     // Copie complète du payload JSON
        'customer' => 'Alice',
        'total' => 149.90,
    ],
    'created_at' => '2026-11-24T12:00:00+00:00',
    'updated_at' => '2026-11-24T12:00:00+00:00',
]
```

> **Méthodes avancées du moteur :** `$context->database` étant directement l'instance `NoSqlDatabaseEngine`, vous pouvez également appeler `$context->database->count('orders', $filters)`, `$context->database->paginate('orders', 1, 25)` ou `$context->database->createCollection('logs')`.

### B. Stockage de fichiers (`$context->storage`)

`$context->storage` permet d'écrire, lister et supprimer des fichiers dans l'espace de stockage isolé de l'application (`tenants/{app_id}/`), tout en respectant le quota de stockage attribué au compte :

| Méthode | Signature | Retour | Description |
| :--- | :--- | :--- | :--- |
| `upload` | `upload(string $path, string $contents, string $mimeType = 'text/plain')` | `array{id: string, url: string, path: string, original_name: string, size: int}` | Enregistre un contenu texte ou binaire dans le stockage isolé et retourne ses métadonnées dont son URL publique. |
| `put` | `put(string $path, string $contents, string $mimeType = 'text/plain')` | `array{id: string, url: string, path: string, original_name: string, size: int}` | Alias exact de `upload()`. |
| `list` | `list(?string $folder = null)` | `array<int, array<string, mixed>>` | Liste les fichiers de l'application, optionnellement filtrés par dossier logique (ex. `'/exports'`). |
| `delete` | `delete(string $fileIdOrPath)` | `bool` | Supprime un fichier par son UUID, son chemin relatif ou son nom original. |

```php
$payload = json_encode(['generated_at' => date('c'), 'count' => 42], JSON_PRETTY_PRINT);

$file = $context->storage->upload(
    'exports/rapport-mensuel.json',
    $payload,
    'application/json'
);

// $file['url'] contient l'URL publique d'accès au fichier
```

### C. Utilisateur authentifié (`$context->auth`)

Lorsque le client transmet un token de session utilisateur (`zb_token_...`) via l'en-tête `X-Zenbase-User-Token` ou `Authorization: Bearer zb_token_...` (ce que le SDK `@zenbase/sdk` fait automatiquement après connexion), Zenbase résout automatiquement l'utilisateur et l'injecte dans `$context->auth` :

| Méthode | Signature | Retour | Description |
| :--- | :--- | :--- | :--- |
| `check` | `check()` | `bool` | Retourne `true` si la requête provient d'un utilisateur authentifié valide. |
| `user` | `user()` | `array{id: string, email: string, auth_method: string, created_at: string\|null}\|null` | Retourne le profil de l'utilisateur authentifié, ou `null`. |
| `id` | `id()` | `string\|null` | Retourne l'UUID de l'utilisateur authentifié, ou `null`. |
| `email` | `email()` | `string\|null` | Retourne l'adresse e-mail de l'utilisateur authentifié, ou `null`. |

```php
if (! $context->auth->check()) {
    return [
        'status' => 401,
        'data' => ['message' => 'Authentification requise.'],
    ];
}

$currentUser = $context->auth->user();
```

### D. Variables d'environnement et secrets (`$context->env`)

`$context->env` est un tableau associatif (`array<string, string>`) contenant vos clés secrètes et paramètres de configuration.

Deux portées coexistent et sont fusionnées automatiquement à l'exécution :
1. **Variables globales de l'application** : partagées entre toutes les Web Functions de l'application.
2. **Variables locales de la fonction** : propres à une fonction précise ; **elles surchargent les variables globales** portant le même nom.

```php
$stripeSecret = $context->env['STRIPE_SECRET_KEY'] ?? null;
$mode = $context->env['APP_ENV'] ?? 'production';
```

- **Gestion dans le Dashboard** : rendez-vous dans **Edge Functions → Secrets** (`/dashboard/apps/{app}/functions/env`) pour ajouter, masquer/révéler, copier, **importer** ou **exporter** vos variables au format `.env`.
- **Convention de nommage** : seules les clés correspondant à `^[a-zA-Z_][a-zA-Z0-9_]*$` sont enregistrées.
- **Confidentialité** : les variables d'environnement et le code source des fonctions ne sont jamais renvoyés par `GET /api/v1/functions`.

---

## 6. Stubs IDE (`zenbase-stubs.php`) et développement local

Pour écrire vos Web Functions localement dans **VS Code** ou **PhpStorm** avec une autocomplétion complète (IntelliSense) sur `$context->database`, `$context->storage`, `$context->auth` et `$context->env`, Zenbase fournit un fichier de déclarations dédié : **`zenbase-stubs.php`**.

> **Bon à savoir :** l'éditeur Monaco intégré au Dashboard Zenbase embarque déjà l'autocomplétion native pour `$context->`, `$event` ainsi que pour toutes vos clés `$context->env['...']` configurées. Le fichier `zenbase-stubs.php` est conçu pour votre environnement de développement local.

### A. Télécharger `zenbase-stubs.php`

Vous pouvez récupérer le fichier de stubs de trois façons :
1. **Depuis le Dashboard Zenbase** : ouvrez l'onglet **Edge Functions (PHP Serverless)** de votre application, cliquez sur **Stubs IDE**, puis sur **Télécharger `zenbase-stubs.php`**.
2. **Via la route directe du Dashboard** (session authentifiée) : `GET /dashboard/stubs/zenbase-stubs.php`.
3. **Depuis le dépôt du projet** : le fichier source se trouve dans `resources/stubs/zenbase-stubs.php`.

### B. Configurer votre IDE local (VS Code & PhpStorm)

1. Créez un dossier dédié à vos fonctions locales dans votre projet (ex. `zenbase-functions/`) et placez-y le fichier `zenbase-stubs.php` :

```bash
zenbase-functions/
├── stubs/
│   └── zenbase-stubs.php
├── send-welcome-email.php
└── process-order.php
```

2. **VS Code (PHP Intelephense / PHP Tools)** : Intelephense indexe automatiquement tout fichier `.php` présent dans le workspace. Aucune configuration supplémentaire n'est nécessaire.
3. **PhpStorm** : le fichier est automatiquement indexé s'il est dans le projet, ou vous pouvez l'ajouter comme bibliothèque externe via *Settings → PHP → Include Path*.
4. Ne déployez **jamais** `zenbase-stubs.php` lui-même en tant que Web Function : il sert uniquement d'aide au typage local.

### C. Annoter vos fonctions avec les stubs (Point critique)

Utilisez une annotation PHPDoc `/** @var \Zenbase\Context $context */` **à l'intérieur** de la closure :

```php
<?php

return function ($event, $context) {
    /** @var \Zenbase\Context $context */
    /** @var array{payload: array<string, mixed>, headers: array<string, mixed>} $event */

    $items = $context->database
        ->collection('products')
        ->where('inStock', '==', true)
        ->orderBy('price', 'asc')
        ->limit(10)
        ->get();

    return [
        'status' => 200,
        'data' => [
            'count' => count($items),
            'items' => $items,
            'caller' => $context->auth->email(),
        ],
    ];
};
```

> **Attention — Deux erreurs à éviter avec les stubs :**
> 1. **N'utilisez pas de type-hint PHP natif** comme `return function ($event, \Zenbase\Context $context)` dans la signature : la classe `\Zenbase\Context` n'existe que dans le fichier de stub local. Au runtime sur Zenbase, l'objet injecté est `App\Modules\Functions\Services\ZenbaseFunctionContext`, ce qui provoquerait une `TypeError`. Utilisez toujours la PHPDoc `/** @var \Zenbase\Context $context */`.
> 2. **Ne placez pas de PHPDoc ni d'instruction `use Zenbase\Context;` avant `return function(...)`** : le compilateur du sandbox attend que le script démarre directement par `return`.

### D. Classes déclarées dans `zenbase-stubs.php`

Le fichier `zenbase-stubs.php` déclare les 5 classes suivantes sous le namespace `Zenbase` :

| Classe Stub | Propriété / Rôle | Méthodes & Propriétés exposées |
| :--- | :--- | :--- |
| `Zenbase\Context` | Objet `$context` injecté | `$database`, `$storage`, `$env`, `$auth` |
| `Zenbase\DatabaseManager` | `$context->database` | `collection(string $name)`, `listCollections()` |
| `Zenbase\CollectionQueryBuilder` | Retour de `collection()` | `where()`, `orderBy()`, `limit()`, `offset()`, `get()`, `find()`, `create()`, `update()`, `delete()` |
| `Zenbase\StorageManager` | `$context->storage` | `upload()`, `put()`, `list()`, `delete()` |
| `Zenbase\AuthContext` | `$context->auth` | `check()`, `user()`, `id()`, `email()` |

### E. Contenu complet de `zenbase-stubs.php`

Voici le contenu complet de référence du fichier `resources/stubs/zenbase-stubs.php` :

```php
<?php

/**
 * Fichier de stub pour l'autocomplétion (IntelliSense) dans l'éditeur de code
 * lors de l'écriture des Web Functions PHP sur Zenbase.
 */

namespace Zenbase;

class CollectionQueryBuilder
{
    public function where(string $field, string $operator, mixed $value = null): self
    {
        return $this;
    }

    public function orderBy(string $field, string $direction = 'asc'): self
    {
        return $this;
    }

    public function limit(int $limit): self
    {
        return $this;
    }

    public function offset(int $offset): self
    {
        return $this;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function get(): array
    {
        return [];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function find(string $id): ?array
    {
        return null;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(array $data): array
    {
        return [];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>|null
     */
    public function update(string $id, array $data): ?array
    {
        return null;
    }

    public function delete(string $id): bool
    {
        return true;
    }
}

class DatabaseManager
{
    public function collection(string $name): CollectionQueryBuilder
    {
        return new CollectionQueryBuilder;
    }

    /**
     * @return array<int, array{name: string, count: int, created_at: string|null}>
     */
    public function listCollections(): array
    {
        return [];
    }
}

class StorageManager
{
    /**
     * @return array{id: string, url: string, path: string, original_name: string, size: int}
     */
    public function upload(string $path, string $contents, string $mimeType = 'text/plain'): array
    {
        return ['id' => '', 'url' => '', 'path' => '', 'original_name' => '', 'size' => 0];
    }

    /**
     * @return array{id: string, url: string, path: string, original_name: string, size: int}
     */
    public function put(string $path, string $contents, string $mimeType = 'text/plain'): array
    {
        return ['id' => '', 'url' => '', 'path' => '', 'original_name' => '', 'size' => 0];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function list(?string $folder = null): array
    {
        return [];
    }

    public function delete(string $fileIdOrPath): bool
    {
        return true;
    }
}

class AuthContext
{
    public function check(): bool
    {
        return false;
    }

    /**
     * @return array{id: string, email: string, auth_method: string, created_at: string|null}|null
     */
    public function user(): ?array
    {
        return null;
    }

    public function id(): ?string
    {
        return null;
    }

    public function email(): ?string
    {
        return null;
    }
}

class Context
{
    public DatabaseManager $database;

    public StorageManager $storage;

    /**
     * @var array<string, string>
     */
    public array $env;

    public AuthContext $auth;
}
```

### F. Déployer vos fichiers `.php` locaux vers le Dashboard

Une fois votre fonction rédigée et vérifiée dans votre IDE local :
- **Importer un fichier `.php`** : depuis la liste des Edge Functions, cliquez sur **Importer `.php`** (taille maximale : **1 Mo**). Le nom est déduit automatiquement du fichier (ou personnalisable). Si une fonction porte déjà ce nom dans l'application, son code est automatiquement mis à jour.
- **Charger dans l'éditeur** : depuis l'IDE intégré, utilisez le bouton **Charger `.php`** pour charger le contenu d'un fichier local dans l'éditeur avant déploiement.
- **Exporter vers votre machine** : cliquez sur l'icône de téléchargement (`.php`) pour sauvegarder une fonction déployée sous forme de fichier `<nom>.php`.

---

## 7. Sécurité et limites du Sandbox

Afin de garantir l'isolation stricte entre les applications et la sécurité du serveur hôte, chaque script est validé par le scanner lexical PHP (`FunctionRunnerService::validateCode`) lors de l'enregistrement, de l'import et avant chaque exécution.

### A. Instructions et fonctions PHP interdites

| Catégorie | Éléments bloqués par le sandbox |
| :--- | :--- |
| **Opérateur shell** | Opérateur backtick (`` `...` ``) |
| **Instructions de langage** | `eval`, `include`, `include_once`, `require`, `require_once`, `exit`, `die` |
| **Exécution de commandes & processus** | `exec`, `shell_exec`, `system`, `passthru`, `proc_open`, `popen`, `pcntl_exec`, `pcntl_fork`, `posix_kill`, `posix_mkfifo`, `posix_setpgid`, `posix_setsid`, `posix_setuid` |
| **Évaluation & extensions dynamiques** | `assert`, `create_function`, `dl` |
| **Accès au système de fichiers serveur** | `file_get_contents`, `file_put_contents`, `fopen`, `fwrite`, `unlink`, `rmdir`, `mkdir`, `chmod`, `chown`, `symlink`, `link` |
| **Sockets & cURL bas niveau** | `fsockopen`, `pfsockopen`, `stream_socket_client`, `stream_socket_server`, `curl_exec`, `curl_multi_exec` |
| **Configuration & environnement serveur** | `phpinfo`, `getenv`, `putenv`, `ini_set`, `ini_alter`, `apache_setenv` |

> Pour lire/écrire des fichiers ou consulter des secrets, utilisez exclusivement les APIs isolées **`$context->storage`** et **`$context->env`**.

### B. Limites techniques

| Paramètre | Limite |
| :--- | :--- |
| **Durée maximale d'exécution** | **5 secondes** par invocation (`max_execution_time`) |
| **Taille d'un fichier `.php` importé** | **1 Mo** maximum |
| **Historique des journaux conservés** | **50 dernières exécutions** par fonction |
| **Résultats d'une requête NoSQL (`limit`)** | **1 000 documents** maximum par requête |
| **Protection réseau & abus** | Soumis aux règles **CORS** de l'application (avec clé publique `zb_pub_...`) et au rate limiting (`throttle:zenbase-api`) |

---

## 8. Invoquer vos Web Functions

### A. Endpoints API REST (`/api/v1`)

| Méthode | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/functions` | Liste les Web Functions **actives** de l'application (`name`, `description`, `is_active`, `created_at`, `updated_at`). |
| `POST` | `/api/v1/functions/{functionName}/invoke` | Invoque la Web Function `functionName` avec le corps JSON fourni. |
| `POST` | `/api/v1/functions/{functionName}` | Alias raccourci exact de `/invoke`. |

**En-têtes d'authentification supportés :**
- **Clé d'API (obligatoire)** : `X-Zenbase-Api-Key: zb_pub_...` (ou `zb_sec_...`), `X-API-Key`, ou `Authorization: Bearer zb_pub_...`.
- **Session utilisateur (optionnelle, alimente `$context->auth`)** : `X-Zenbase-User-Token: zb_token_...` ou `Authorization: Bearer zb_token_...`.

### B. Invocation via `@zenbase/sdk` (JS / TS / Node.js)

```typescript
import { Zenbase } from '@zenbase/sdk';

const zb = new Zenbase({
  endpoint: 'https://api.votre-domaine.com',
  apiKey: 'zb_pub_votre_cle_publique',
});

// Lister les fonctions actives
const { data: functionsList } = await zb.functions.list();

// Invoquer une fonction avec payload et en-têtes personnalisés
const { data, error, meta } = await zb.functions.invoke<{
  success: boolean;
  record_id: string;
}>(
  'create-order',
  { product_id: 'prod_123', quantity: 2 },
  { headers: { 'X-Idempotency-Key': 'ord-2026-001' } }
);

if (!error) {
  console.log('Commande créée :', data?.record_id, `(${meta?.duration_ms} ms)`);
}
```

### C. Invocation via cURL

```bash
curl -X POST 'https://api.votre-domaine.com/api/v1/functions/create-order/invoke' \
  -H 'Content-Type: application/json' \
  -H 'X-Zenbase-Api-Key: zb_pub_votre_cle_publique' \
  -H 'X-Zenbase-User-Token: zb_token_session_utilisateur' \
  -d '{"product_id": "prod_123", "quantity": 2}'
```

---

## 9. Exemples complets prêts à l'emploi

### A. Endpoint protégé par authentification avec écriture NoSQL

```php
<?php

return function ($event, $context) {
    /** @var \Zenbase\Context $context */

    if (! $context->auth->check()) {
        return [
            'status' => 401,
            'data' => ['message' => 'Veuillez vous connecter pour créer un ticket.'],
        ];
    }

    $subject = trim((string) ($event['payload']['subject'] ?? ''));
    $body = trim((string) ($event['payload']['body'] ?? ''));

    if ($subject === '' || $body === '') {
        return [
            'status' => 422,
            'data' => ['message' => 'Les champs subject et body sont obligatoires.'],
        ];
    }

    $ticket = $context->database->collection('support_tickets')->create([
        'subject' => $subject,
        'body' => $body,
        'status' => 'open',
        'author_id' => $context->auth->id(),
        'author_email' => $context->auth->email(),
    ]);

    return [
        'status' => 201,
        'data' => [
            'ticket' => $ticket,
        ],
    ];
};
```

### B. Export d'une collection vers le Stockage Zenbase

```php
<?php

return function ($event, $context) {
    /** @var \Zenbase\Context $context */

    $collection = (string) ($event['payload']['collection'] ?? 'orders');
    $records = $context->database->collection($collection)
        ->orderBy('created_at', 'desc')
        ->limit(500)
        ->get();

    $json = json_encode([
        'collection' => $collection,
        'exported_at' => date('c'),
        'count' => count($records),
        'items' => $records,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    $filename = sprintf('exports/%s-%s.json', $collection, date('Ymd-His'));
    $stored = $context->storage->upload($filename, (string) $json, 'application/json');

    return [
        'status' => 201,
        'data' => [
            'count' => count($records),
            'file' => $stored,
        ],
    ];
};
```

### C. Validation d'une signature Webhook HMAC SHA-256

```php
<?php

return function ($event, $context) {
    /** @var \Zenbase\Context $context */

    $secret = $context->env['WEBHOOK_SECRET'] ?? '';
    if ($secret === '') {
        return [
            'status' => 500,
            'data' => ['message' => 'WEBHOOK_SECRET non configuré dans les secrets.'],
        ];
    }

    $providedSig = $event['headers']['x-webhook-signature'][0] ?? '';
    $expectedSig = hash_hmac('sha256', json_encode($event['payload']), $secret);

    if (! hash_equals($expectedSig, (string) $providedSig)) {
        return [
            'status' => 401,
            'data' => ['message' => 'Signature webhook invalide.'],
        ];
    }

    $log = $context->database->collection('webhook_events')->create([
        'type' => $event['payload']['type'] ?? 'unknown',
        'payload' => $event['payload'],
        'received_at' => date('c'),
    ]);

    return [
        'status' => 200,
        'data' => ['received' => true, 'event_id' => $log['id']],
    ];
};
```
