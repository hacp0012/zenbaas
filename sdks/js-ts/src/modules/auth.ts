import type { HttpClient } from '../core/http-client.js';
import type {
    ZenbaseAuthEvent,
    ZenbaseAuthSession,
    ZenbaseAuthStateChangeCallback,
    ZenbaseOtpDispatchResult,
    ZenbaseResponse,
    ZenbaseUser,
} from '../types/index.js';

export class AuthModule {
    private currentUser: ZenbaseUser | null = null;
    private readonly listeners = new Set<ZenbaseAuthStateChangeCallback>();

    constructor(private readonly http: HttpClient) {}

    /**
     * Inscrit un nouvel utilisateur par e-mail et mot de passe dans la base SQLite de l'application.
     */
    public async signUp(email: string, password: string): Promise<ZenbaseAuthSession> {
        const response = await this.http.request<{ user: ZenbaseUser; token: string }>(
            'POST',
            '/auth/signup',
            {
                body: { email, password },
            },
        );

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
    public async signInWithPassword(
        email: string,
        password: string,
    ): Promise<ZenbaseAuthSession> {
        const response = await this.http.request<{ user: ZenbaseUser; token: string }>(
            'POST',
            '/auth/signin',
            {
                body: { email, password },
            },
        );

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
    public async signIn(email: string, password: string): Promise<ZenbaseAuthSession> {
        return this.signInWithPassword(email, password);
    }

    /**
     * Génère et envoie un code OTP à 6 chiffres par e-mail à l'utilisateur.
     */
    public async sendOtp(email: string): Promise<ZenbaseOtpDispatchResult> {
        const response = await this.http.request<{ email: string; expires_at: string }>(
            'POST',
            '/auth/otp/send',
            {
                body: { email },
            },
        );

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
    public async verifyOtp(email: string, code: string): Promise<ZenbaseAuthSession> {
        const response = await this.http.request<{ user: ZenbaseUser; token: string }>(
            'POST',
            '/auth/otp/verify',
            {
                body: { email, code },
            },
        );

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
    public async getUser(): Promise<ZenbaseResponse<{ user: ZenbaseUser }>> {
        const response = await this.http.request<{ user: ZenbaseUser }>('GET', '/auth/user');
        if (response.data?.user) {
            this.currentUser = response.data.user;
            this.emit('USER_UPDATED');
        }

        return response;
    }

    /**
     * Met à jour le mot de passe de l'utilisateur actuellement authentifié.
     */
    public async updatePassword(
        currentPassword: string | null,
        newPassword: string,
    ): Promise<ZenbaseResponse<{ updated: boolean; user: ZenbaseUser }>> {
        const response = await this.http.request<{ updated: boolean; user: ZenbaseUser }>(
            'PUT',
            '/auth/password',
            {
                body: {
                    current_password: currentPassword,
                    new_password: newPassword,
                },
            },
        );

        if (response.data?.user) {
            this.currentUser = response.data.user;
            this.emit('USER_UPDATED');
        }

        return response;
    }

    /**
     * Déconnecte l'utilisateur courant et révoque son token côté serveur.
     */
    public async signOut(): Promise<ZenbaseResponse<{ signed_out: boolean }>> {
        const response = await this.http.request<{ signed_out: boolean }>('POST', '/auth/signout');
        this.http.setUserToken(null);
        this.currentUser = null;
        this.emit('SIGNED_OUT');

        return response;
    }

    /**
     * Efface la session locale (token + utilisateur en cache) sans effectuer d'appel réseau.
     */
    public clearSession(): void {
        this.http.setUserToken(null);
        this.currentUser = null;
        this.emit('SIGNED_OUT');
    }

    /**
     * Indique si un token de session utilisateur est actuellement configuré dans le client.
     */
    public isAuthenticated(): boolean {
        return Boolean(this.http.getUserToken());
    }

    /**
     * Retourne le token de session actif en mémoire.
     */
    public getToken(): string | null {
        return this.http.getUserToken();
    }

    /**
     * Restaure manuellement un token utilisateur existant.
     */
    public setToken(token: string | null): void {
        this.http.setUserToken(token);
        if (!token) {
            this.currentUser = null;
        }
        this.emit('TOKEN_CHANGED');
    }

    /**
     * Retourne le dernier utilisateur mis en cache en mémoire.
     */
    public getCachedUser(): ZenbaseUser | null {
        return this.currentUser;
    }

    /**
     * S'abonne aux changements d'état d'authentification (`SIGNED_IN`, `SIGNED_UP`, `SIGNED_OUT`, `TOKEN_CHANGED`, `USER_UPDATED`).
     * Retourne une fonction de désabonnement `unsubscribe()`.
     */
    public onAuthStateChange(callback: ZenbaseAuthStateChangeCallback): () => void {
        this.listeners.add(callback);

        return () => {
            this.listeners.delete(callback);
        };
    }

    private emit(event: ZenbaseAuthEvent): void {
        const session = {
            user: this.currentUser,
            token: this.http.getUserToken(),
        };

        for (const listener of this.listeners) {
            try {
                listener(event, session);
            } catch {
                // Ignore listener exceptions to avoid breaking auth flow
            }
        }
    }
}
