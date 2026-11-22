import type { HttpClient } from '../core/http-client.js';
import type { ZenbaseFunctionSummary, ZenbaseInvokeOptions, ZenbaseResponse } from '../types/index.js';
export declare class FunctionsModule {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * Liste les Web Functions PHP actives disponibles pour l'application courante.
     */
    list(): Promise<ZenbaseResponse<ZenbaseFunctionSummary[]>>;
    /**
     * Invoque une Web Function PHP serverless déployée sur Zenbase.
     */
    invoke<TResponse = Record<string, unknown>>(functionName: string, payload?: Record<string, unknown>, options?: ZenbaseInvokeOptions): Promise<ZenbaseResponse<TResponse>>;
}
//# sourceMappingURL=functions.d.ts.map