export class FunctionsModule {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Liste les Web Functions PHP actives disponibles pour l'application courante.
     */
    async list() {
        return this.http.request('GET', '/functions');
    }
    /**
     * Invoque une Web Function PHP serverless déployée sur Zenbase.
     */
    async invoke(functionName, payload = {}, options = {}) {
        return this.http.request('POST', `/functions/${encodeURIComponent(functionName)}/invoke`, {
            body: payload,
            headers: options.headers,
        });
    }
}
//# sourceMappingURL=functions.js.map