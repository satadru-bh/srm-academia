/**
 * SRM Academia+ - Session Management System
 * SRMClient: Axios HTTP Client Factory with Manual CookieJar Management
 * 
 * Replaces axios-cookiejar-support (ESM-only) with a pure-CJS implementation
 * that handles cookie injection, extraction, and redirect following manually.
 */

const axios = require('axios');

const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive'
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 15;

/**
 * Creates an axios-compatible HTTP client that automatically manages cookies
 * via a tough-cookie CookieJar and follows redirects with cookie persistence.
 */
async function createSrmClient(jar) {

    async function request(method, url, data, config = {}) {
        let currentUrl = url;
        let currentMethod = method;
        let currentData = data;

        for (let i = 0; i <= MAX_REDIRECTS; i++) {
            // Inject cookies from jar into request headers
            const headers = { ...DEFAULT_HEADERS, ...(config.headers || {}) };
            try {
                const cookieString = await jar.getCookieString(currentUrl);
                if (cookieString) {
                    headers['Cookie'] = cookieString;
                }
            } catch (_) { /* ignore cookie read errors */ }

            // Execute request with auto-redirects disabled
            const response = await axios({
                method: currentMethod,
                url: currentUrl,
                data: currentData,
                headers,
                timeout: config.timeout || 20000,
                maxRedirects: 0,
                validateStatus: () => true, // Don't throw — we handle status ourselves
            });

            // Persist Set-Cookie headers from response into jar
            const setCookies = response.headers['set-cookie'];
            if (setCookies) {
                for (const raw of (Array.isArray(setCookies) ? setCookies : [setCookies])) {
                    try { await jar.setCookie(raw, currentUrl); } catch (_) { /* ignore malformed cookies */ }
                }
            }

            // Follow redirects with cookie persistence
            if (REDIRECT_STATUSES.has(response.status) && response.headers.location) {
                currentUrl = new URL(response.headers.location, currentUrl).toString();
                // 301/302/303 → convert to GET (RFC 7231)
                if (response.status === 301 || response.status === 302 || response.status === 303) {
                    currentMethod = 'GET';
                    currentData = undefined;
                }
                continue;
            }

            // Non-redirect response — return it (match default axios behavior)
            return response;
        }

        throw new Error('Maximum redirects exceeded');
    }

    return {
        get:    (url, config)       => request('GET', url, undefined, config),
        post:   (url, data, config) => request('POST', url, data, config),
        put:    (url, data, config) => request('PUT', url, data, config),
        delete: (url, config)       => request('DELETE', url, undefined, config),
    };
}

module.exports = { createSrmClient };
