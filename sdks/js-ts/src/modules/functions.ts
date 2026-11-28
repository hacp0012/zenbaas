import type { HttpClient } from '../core/http-client.js';
import type {
    ZenbaseFunctionSummary,
    ZenbaseInvokeOptions,
    ZenbaseResponse,
} from '../types/index.js';

export class FunctionsModule {
    constructor(private readonly http: HttpClient) {}

    /**
     * Liste les Web Functions PHP actives disponibles pour l'application courante.
     */
    public async list(): Promise<ZenbaseResponse<ZenbaseFunctionSummary[]>> {
        return this.http.request<ZenbaseFunctionSummary[]>('GET', '/functions');
    }

    /**
     * Invoque une Web Function PHP serverless déployée sur Zenbase.
     */
    public async invoke<TResponse = Record<string, unknown>>(
        functionName: string,
        payload: Record<string, unknown> = {},
        options: ZenbaseInvokeOptions = {},
    ): Promise<ZenbaseResponse<TResponse>> {
        return this.http.request<TResponse>(
            'POST',
            `/functions/${encodeURIComponent(functionName)}/invoke`,
            {
                body: payload,
                headers: options.headers,
            },
        );
    }
}
