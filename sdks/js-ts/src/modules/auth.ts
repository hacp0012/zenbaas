import type { HttpClient } from '../core/http-client.js';
import type {
    ZenbaseAuthSession,
    ZenbaseOtpDispatchResult,
    ZenbaseResponse,
    ZenbaseUser,
} from '../types/index.js';

export class AuthModule {
    private currentUser: ZenbaseUser | null = null;

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
        }

        return response;
    }

    /**
     * Déconnecte l'utilisateur courant et révoque son token.
     */
    public async signOut(): Promise<ZenbaseResponse<{ signed_out: boolean }>> {
        const response = await this.http.request<{ signed_out: boolean }>('POST', '/auth/signout');
        this.http.setUserToken(null);
        this.currentUser = null;

        return response;
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
    }

    /**
     * Retourne le dernier utilisateur mis en cache en mémoire.
     */
    public getCachedUser(): ZenbaseUser | null {
        return this.currentUser;
    }
}
