export class FunctionsModule {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Invoque une Web Function PHP serverless déployée sur Zenbase.
     */
    async invoke(functionName, payload = {}) {
        return this.http.request('POST', `/functions/${encodeURIComponent(functionName)}/invoke`, {
            body: payload,
        });
    }
}
//# sourceMappingURL=functions.js.map