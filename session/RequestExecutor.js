/**
 * SRM Academia+ - Session Management System
 * RequestExecutor: Resilient Data Fetching, Retry Engine & Stale Cache Fallback
 * 
 * Rules:
 * - Load account CookieJar -> Validate -> Request SRM -> Return data.
 * - On Network Failure: Retry once. Never delete cookies or log out. Return stale cache + isStale: true.
 * - On Auth Failure: Attempt ONE background re-authentication -> retry. If re-auth fails, return SessionExpired.
 */

const CookieStore = require('./CookieStore');
const CacheStore = require('./CacheStore');
const SessionValidator = require('./SessionValidator');
const AuthenticationManager = require('./AuthenticationManager');
const SessionLogger = require('./SessionLogger');
const { createSrmClient } = require('./SRMClient');

const TAG = 'RequestExecutor';

class RequestExecutor {
    /**
     * Executes data sync request for an account
     * @param {string} email 
     * @param {(client: any) => Promise<any>} scrapeFn 
     */
    async executeSync(email, scrapeFn, fallbackPassword = null) {
        try {
            const cleanEmail = CookieStore.normalizeEmail(email);
            if (!cleanEmail) {
                return { success: false, expired: true, error: "Invalid session email." };
            }

            let record = CookieStore.get(cleanEmail);

            // 1. If CookieJar is missing or invalid, attempt 1 background re-authentication first
            if (!record || !record.jar || record.isValid === false) {
                SessionLogger.info(TAG, `No active CookieJar for ${cleanEmail}. Attempting background re-authentication...`);
                try {
                    const reAuthRes = await AuthenticationManager.reauthenticate(cleanEmail, scrapeFn, fallbackPassword);
                    return { success: true, ...reAuthRes.payload };
                } catch (reAuthErr) {
                    SessionLogger.warn(TAG, `Background re-authentication failed for ${cleanEmail}: ${reAuthErr.message}`);
                    
                    // Return stale cached data if available
                    if (CacheStore.has(cleanEmail)) {
                        return CacheStore.get(cleanEmail, true, "SESSION_EXPIRED_STALE");
                    }
                    return { success: false, expired: true, error: "Session has expired. Please sign in again." };
                }
            }

            // 2. Execute Data Scraping using shared CookieJar
            try {
                const client = await createSrmClient(record.jar);
                const payload = await scrapeFn(client);

                // Validate scraped data payload
                const validation = SessionValidator.validateScrapedPayload(payload);
                if (!validation.valid) {
                    const authStr = validation.isAuthRelated === false ? '[NonAuth]' : '[Auth]';
                    throw new Error(`Scraped payload validation failed ${authStr}: ${validation.reason}`);
                }

                // Success! Update server-side cache
                CacheStore.set(cleanEmail, payload);
                CookieStore.touch(cleanEmail);

                return { success: true, isStale: false, ...payload };

            } catch (err) {
                SessionLogger.warn(TAG, `Primary request failed for ${cleanEmail}: ${err.message}`);

                // 3. HANDLE TRANSIENT NETWORK FAILURES (Timeouts, DNS, ECONNRESET)
                if (SessionValidator.isNetworkFailure(err)) {
                    SessionLogger.info(TAG, `Network error occurred for ${cleanEmail}. Executing 1 retry attempt...`);
                    try {
                        const clientRetry = await createSrmClient(record.jar);
                        const retryPayload = await scrapeFn(clientRetry);
                        CacheStore.set(cleanEmail, retryPayload);
                        return { success: true, isStale: false, ...retryPayload };
                    } catch (retryErr) {
                        SessionLogger.warn(TAG, `Network retry failed for ${cleanEmail}. Serving stale cache (isStale: true).`);
                        if (CacheStore.has(cleanEmail)) {
                            return CacheStore.get(cleanEmail, true, "PORTAL_TEMPORARILY_UNAVAILABLE");
                        }
                        return {
                            success: false,
                            networkError: true,
                            error: "SRM Academia portal is temporarily unreachable. Please check your internet connection or try again shortly."
                        };
                    }
                }

                // 4. HANDLE GENUINE AUTHENTICATION FAILURES (302 Redirect, 401/403, Signin HTML)
                if (SessionValidator.isAuthFailure(err) || String(err.message).includes('[Auth]')) {
                    SessionLogger.warn(TAG, `Genuine auth failure for ${cleanEmail}. Attempting ONE background re-authentication...`);
                    try {
                        const reAuthRes = await AuthenticationManager.reauthenticate(cleanEmail, scrapeFn, fallbackPassword);
                        return { success: true, isStale: false, ...reAuthRes.payload };
                    } catch (reAuthErr) {
                        SessionLogger.error(TAG, `Background re-authentication failed after auth error for ${cleanEmail}`, reAuthErr);
                        CookieStore.markInvalid(cleanEmail);

                        if (CacheStore.has(cleanEmail)) {
                            return CacheStore.get(cleanEmail, true, "SESSION_EXPIRED");
                        }
                        return { success: false, expired: true, error: "Session has expired. Please log in again." };
                    }
                }

                // Generic Portal Error
                if (CacheStore.has(cleanEmail)) {
                    return CacheStore.get(cleanEmail, true, "PORTAL_ERROR: " + err.message);
                }

                return { success: false, error: "SRM portal sync failed: " + err.message };
            }
        } catch (fatalErr) {
            SessionLogger.error(TAG, `Fatal unhandled exception in executeSync for ${email}`, fatalErr);
            if (CacheStore.has(email)) {
                return CacheStore.get(email, true, "INTERNAL_SYNC_ERROR: " + fatalErr.message);
            }
            return { success: false, error: "Sync error: " + (fatalErr.message || fatalErr) };
        }
    }
}

module.exports = new RequestExecutor();
