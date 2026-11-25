# Authentification — `@zenbase/sdk`

Le module `zb.auth` gère les utilisateurs finaux propres à votre application (stockés de manière isolée dans la table `auth_users` de la base SQLite de l'application).

Dès qu'un utilisateur s'inscrit ou se connecte, le SDK conserve automatiquement son token Bearer (`zb_token_...`) et l'attache à toutes les requêtes suivantes (y compris les appels aux [Web Functions](./functions.md)).

> Voir aussi : [Démarrage & Initialisation](./getting-started.md) · [Référence API `AuthModule`](./reference.md).

---

## 1. Inscription et connexion par E-mail / Mot de passe

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

> **Alias :** `zb.auth.signIn(email, password)` est un raccourci équivalent à `zb.auth.signInWithPassword(email, password)`.

---

## 2. Connexion sans mot de passe par Code OTP E-mail

Zenbase intègre un système d'OTP à **6 chiffres** envoyé par e-mail (valable **10 minutes** et à **usage unique**) :

```typescript
// Étape 1 : Demander l'envoi d'un code à 6 chiffres par e-mail
const { email, expires_at, error: sendError } = await zb.auth.sendOtp('bob@exemple.com');

// Étape 2 : Valider le code saisi par l'utilisateur
const { user, token, error: verifyError } = await zb.auth.verifyOtp(
  'bob@exemple.com',
  '123456'
);
```

---

## 3. Profil utilisateur et changement de mot de passe

```typescript
// Vérifier si un token de session est actif
if (zb.auth.isAuthenticated()) {
  const { data } = await zb.auth.getUser();
  console.log('Profil actuel :', data?.user);
}

// Lire le profil en cache sans appel réseau
const cachedUser = zb.auth.getCachedUser();

// Modifier le mot de passe de l'utilisateur authentifié
const { data: pwdResult, error: pwdError } = await zb.auth.updatePassword(
  'monSuperMotDePasse',
  'nouveauMotDePasseTresSecurise'
);
```

---

## 4. Écouteurs d'état d'authentification (`onAuthStateChange`)

Abonnez vos composants frontend (React, Vue, Svelte) aux changements de session en temps réel (`SIGNED_UP`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_CHANGED`, `USER_UPDATED`) :

```typescript
const unsubscribe = zb.auth.onAuthStateChange((event, session) => {
  console.log('Événement auth :', event, session.user?.email);
});

// Se désabonner lors du démontage du composant
unsubscribe();
```

---

## 5. Restauration de token et déconnexion

```typescript
// Restaurer manuellement un token sauvegardé (ex. depuis localStorage)
zb.auth.setToken(savedToken);

// Consulter le token actif
const currentToken = zb.auth.getToken();

// Révoquer le token côté serveur et déconnecter l'utilisateur
await zb.auth.signOut();

// Ou effacer la session uniquement en mémoire locale (sans requête HTTP)
zb.auth.clearSession();
```
