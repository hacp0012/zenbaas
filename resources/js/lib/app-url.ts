export function getAppUrl(serverAppUrl?: string): string {
    const configuredUrl =
        serverAppUrl?.trim() || import.meta.env.VITE_APP_URL?.trim();

    if (configuredUrl) {
        return configuredUrl.replace(/\/+$/, '');
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin.replace(/\/+$/, '');
    }

    return '';
}

export function getApiBaseUrl(
    apiBaseUrl?: string,
    serverAppUrl?: string,
): string {
    const trimmedBase = apiBaseUrl?.trim();

    if (trimmedBase) {
        return trimmedBase.replace(/\/+$/, '');
    }

    const base = getAppUrl(serverAppUrl);

    return base !== '' ? `${base}/api/v1` : '/api/v1';
}
