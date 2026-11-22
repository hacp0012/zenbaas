import type { HttpClient } from '../core/http-client.js';
import type { ZenbaseAuthSession, ZenbaseAuthStateChangeCallback, ZenbaseOtpDispatchResult, ZenbaseResponse, ZenbaseUser } from '../types/index.js';
export declare class AuthModule {
    private readonly http;
    private currentUser;
    private readonly listeners;
    constructor(http: HttpClient);
    /**
     * Inscrit un nouvel utilisateur par e-mail et mot de passe dans la base SQLite de l'application.
     */
    signUp(email: string, password: string): Promise<ZenbaseAuthSession>;
    /**
     * Connecte un utilisateur avec son adresse e-mail et son mot de passe.
     */
    signInWithPassword(email: string, password: string): Promise<ZenbaseAuthSession>;
    /**
     * Alias de `signInWithPassword`.
     */
    signIn(email: string, password: string): Promise<ZenbaseAuthSession>;
    /**
     * Génère et envoie un code OTP à 6 chiffres par e-mail à l'utilisateur.
     */
    sendOtp(email: string): Promise<ZenbaseOtpDispatchResult>;
    /**
     * Vérifie le code OTP à 6 chiffres reçu par e-mail et ouvre une session authentifiée.
     */
    verifyOtp(email: string, code: string): Promise<ZenbaseAuthSession>;
    /**
     * Récupère le profil de l'utilisateur actuellement connecté.
     */
    getUser(): Promise<ZenbaseResponse<{
        user: ZenbaseUser;
    }>>;
    /**
     * Met à jour le mot de passe de l'utilisateur actuellement authentifié.
     */
    updatePassword(currentPassword: string | null, newPassword: string): Promise<ZenbaseResponse<{
        updated: boolean;
        user: ZenbaseUser;
    }>>;
    /**
     * Déconnecte l'utilisateur courant et révoque son token côté serveur.
     */
    signOut(): Promise<ZenbaseResponse<{
        signed_out: boolean;
    }>>;
    /**
     * Efface la session locale (token + utilisateur en cache) sans effectuer d'appel réseau.
     */
    clearSession(): void;
    /**
     * Indique si un token de session utilisateur est actuellement configuré dans le client.
     */
    isAuthenticated(): boolean;
    /**
     * Retourne le token de session actif en mémoire.
     */
    getToken(): string | null;
    /**
     * Restaure manuellement un token utilisateur existant.
     */
    setToken(token: string | null): void;
    /**
     * Retourne le dernier utilisateur mis en cache en mémoire.
     */
    getCachedUser(): ZenbaseUser | null;
    /**
     * S'abonne aux changements d'état d'authentification (`SIGNED_IN`, `SIGNED_UP`, `SIGNED_OUT`, `TOKEN_CHANGED`, `USER_UPDATED`).
     * Retourne une fonction de désabonnement `unsubscribe()`.
     */
    onAuthStateChange(callback: ZenbaseAuthStateChangeCallback): () => void;
    private emit;
}
//# sourceMappingURL=auth.d.ts.map