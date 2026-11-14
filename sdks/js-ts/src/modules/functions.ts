import type { HttpClient } from '../core/http-client.js';
import type { ZenbaseResponse } from '../types/index.js';

export class FunctionsModule {
    constructor(private readonly http: HttpClient) {}

    /**
     * Invoque une Web Function PHP serverless déployée sur Zenbase.
     */
    public async invoke<TResponse = Record<string, unknown>>(
        functionName: string,
        payload: Record<string, unknown> = {},
    ): Promise<ZenbaseResponse<TResponse>> {
        return this.http.request<TResponse>(
            'POST',
            `/functions/${encodeURIComponent(functionName)}/invoke`,
            {
                body: payload,
            },
        );
    }
}
