import type { HttpClient } from '../core/http-client.js';
import type { ZenbaseResponse } from '../types/index.js';
export declare class FunctionsModule {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * Invoque une Web Function PHP serverless déployée sur Zenbase.
     */
    invoke<TResponse = Record<string, unknown>>(functionName: string, payload?: Record<string, unknown>): Promise<ZenbaseResponse<TResponse>>;
}
//# sourceMappingURL=functions.d.ts.map