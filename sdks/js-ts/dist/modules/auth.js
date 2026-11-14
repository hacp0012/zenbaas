export class AuthModule {
    http;
    currentUser = null;
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
        }
        return response;
    }
    /**
     * Déconnecte l'utilisateur courant et révoque son token.
     */
    async signOut() {
        const response = await this.http.request('POST', '/auth/signout');
        this.http.setUserToken(null);
        this.currentUser = null;
        return response;
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
    }
    /**
     * Retourne le dernier utilisateur mis en cache en mémoire.
     */
    getCachedUser() {
        return this.currentUser;
    }
}
//# sourceMappingURL=auth.js.map