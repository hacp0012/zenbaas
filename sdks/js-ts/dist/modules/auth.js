export class AuthModule {
    http;
    currentUser = null;
    listeners = new Set();
    constructor(http) {
        this.http = http;
    }
    /**
     * Inscrit un nouvel utilisateur par e-mail et mot de passe dans la base SQLite de l'application.
     */
    async signUp(email, password) {
        const response = await this.http.request('POST', '/auth/signup', {
            body: { email, password },
        });
        if (response.data?.token) {
            this.http.setUserToken(response.data.token);
            this.currentUser = response.data.user;
            this.emit('SIGNED_UP');
        }
        return {
            user: response.data?.user ?? null,
            token: response.data?.token ?? null,
            data: response.data,
            error: response.error,
        };
    }
    /**
     * Connecte un utilisateur avec son adresse e-mail et son mot de passe.
     */
    async signInWithPassword(email, password) {
        const response = await this.http.request('POST', '/auth/signin', {
            body: { email, password },
        });
        if (response.data?.token) {
            this.http.setUserToken(response.data.token);
            this.currentUser = response.data.user;
            this.emit('SIGNED_IN');
        }
        return {
            user: response.data?.user ?? null,
            token: response.data?.token ?? null,
            data: response.data,
            error: response.error,
        };
    }
    /**
     * Alias de `signInWithPassword`.
     */
    async signIn(email, password) {
        return this.signInWithPassword(email, password);
    }
    /**
     * Génère et envoie un code OTP à 6 chiffres par e-mail à l'utilisateur.
     */
    async sendOtp(email) {
        const response = await this.http.request('POST', '/auth/otp/send', {
            body: { email },
        });
        return {
            email: response.data?.email ?? null,
            expires_at: response.data?.expires_at ?? null,
            data: response.data,
            error: response.error,
        };
    }
    /**
     * Vérifie le code OTP à 6 chiffres reçu par e-mail et ouvre une session authentifiée.
     */
    async verifyOtp(email, code) {
        const response = await this.http.request('POST', '/auth/otp/verify', {
            body: { email, code },
        });
        if (response.data?.token) {
            this.http.setUserToken(response.data.token);
            this.currentUser = response.data.user;
            this.emit('SIGNED_IN');
        }
        return {
            user: response.data?.user ?? null,
            token: response.data?.token ?? null,
            data: response.data,
            error: response.error,
        };
    }
    /**
     * Récupère le profil de l'utilisateur actuellement connecté.
     */
    async getUser() {
        const response = await this.http.request('GET', '/auth/user');
        if (response.data?.user) {
            this.currentUser = response.data.user;
            this.emit('USER_UPDATED');
        }
        return response;
    }
    /**
     * Met à jour le mot de passe de l'utilisateur actuellement authentifié.
     */
    async updatePassword(currentPassword, newPassword) {
        const response = await this.http.request('PUT', '/auth/password', {
            body: {
                current_password: currentPassword,
                new_password: newPassword,
            },
        });
        if (response.data?.user) {
            this.currentUser = response.data.user;
            this.emit('USER_UPDATED');
        }
        return response;
    }
    /**
     * Déconnecte l'utilisateur courant et révoque son token côté serveur.
     */
    async signOut() {
        const response = await this.http.request('POST', '/auth/signout');
        this.http.setUserToken(null);
        this.currentUser = null;
        this.emit('SIGNED_OUT');
        return response;
    }
    /**
     * Efface la session locale (token + utilisateur en cache) sans effectuer d'appel réseau.
     */
    clearSession() {
        this.http.setUserToken(null);
        this.currentUser = null;
        this.emit('SIGNED_OUT');
    }
    /**
     * Indique si un token de session utilisateur est actuellement configuré dans le client.
     */
    isAuthenticated() {
        return Boolean(this.http.getUserToken());
    }
    /**
     * Retourne le token de session actif en mémoire.
     */
    getToken() {
        return this.http.getUserToken();
    }
    /**
     * Restaure manuellement un token utilisateur existant.
     */
    setToken(token) {
        this.http.setUserToken(token);
        if (!token) {
            this.currentUser = null;
        }
        this.emit('TOKEN_CHANGED');
    }
    /**
     * Retourne le dernier utilisateur mis en cache en mémoire.
     */
    getCachedUser() {
        return this.currentUser;
    }
    /**
     * S'abonne aux changements d'état d'authentification (`SIGNED_IN`, `SIGNED_UP`, `SIGNED_OUT`, `TOKEN_CHANGED`, `USER_UPDATED`).
     * Retourne une fonction de désabonnement `unsubscribe()`.
     */
    onAuthStateChange(callback) {
        this.listeners.add(callback);
        return () => {
            this.listeners.delete(callback);
        };
    }
    emit(event) {
        const session = {
            user: this.currentUser,
            token: this.http.getUserToken(),
        };
        for (const listener of this.listeners) {
            try {
                listener(event, session);
            }
            catch {
                // Ignore listener exceptions to avoid breaking auth flow
            }
        }
    }
}
//# sourceMappingURL=auth.js.map