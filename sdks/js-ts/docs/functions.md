# Web Functions PHP — `@zenbase/sdk`

Le module `zb.functions` permet de découvrir et d'invoquer vos **Web Functions PHP Serverless** déployées dans le bac à sable isolé de votre application depuis le navigateur ou Node.js.

> Pour tout savoir sur l'écriture des fonctions PHP côté serveur (`$event`, `$context`, sécurité du sandbox et **stubs IDE `zenbase-stubs.php`**), consultez le guide plateforme [Web Functions (PHP Serverless)](../../../docs/web-functions.md).

---

## 1. Lister les fonctions actives (`list`)

Récupérez la liste des Web Functions actives disponibles pour l'application courante (sans exposer leur code source ni leurs variables d'environnement secrètes) :

```typescript
const { data: availableFunctions, error } = await zb.functions.list();

if (!error && availableFunctions) {
  for (const fn of availableFunctions) {
    console.log(fn.name, '—', fn.description);
  }
}
```

---

## 2. Invoquer une Web Function (`invoke`)

Invoquez une fonction par son slug en lui transmettant un payload JSON et des en-têtes HTTP personnalisés optionnels. Si un utilisateur est connecté via `zb.auth`, son token de session est automatiquement transmis et accessible via `$context->auth` dans la fonction PHP :

```typescript
interface WelcomeResponse {
  success: boolean;
  item_id: string;
  sender: string;
  caller: string | null;
}

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

---

## 3. Exemple de Web Function PHP correspondante

Voici la fonction PHP correspondante déployée dans le Dashboard Zenbase (avec l'annotation PHPDoc des stubs IDE `zenbase-stubs.php`) :

```php
<?php

return function ($event, $context) {
    /** @var \Zenbase\Context $context */

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

> Consultez la [documentation complète des Web Functions et des Stubs IDE](../../../docs/web-functions.md) pour la référence exhaustive de `$context` et du sandbox.
