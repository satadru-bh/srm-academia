/**
 * SRM Academia+ - Session Management System
 * AuthenticationManager: SRM SSO Authentication Engine & Session Lifecycle Controller
 * 
 * Rules:
 * - Single source of truth for SRM authentication.
 * - Reuses existing valid CookieJar with ZERO login calls to SRM whenever possible.
 * - Acquires LoginMutex so ONLY ONE login reaches SRM simultaneously per account.
 * - Handles preannouncement/block-sessions eviction automatically when SRM 2-session limit is hit.
 */

const { CookieJar } = require('tough-cookie');
const CookieStore = require('./CookieStore');
const CacheStore = require('./CacheStore');
const LoginMutex = require('./LoginMutex');
const SessionValidator = require('./SessionValidator');
const SessionLogger = require('./SessionLogger');
const { createSrmClient } = require('./SRMClient');

const SIGNIN_REFERER_URL = "https://academia.srmist.edu.in/accounts/p/10002227248/signin?hide_fp=true&orgtype=40&service_language=en&css_url=/49910842/academia-academic-services/downloadPortalCustomCss/login&dcc=true&serviceurl=https%3A%2F%2Facademia.srmist.edu.in%2Fportal%2Facademia-academic-services%2FredirectFromLogin";
const TAG = 'AuthManager';

class AuthenticationManager {
    /**
     * Performs full SRM SSO authentication sequence with CSRF token exchange & block-session eviction
     */
    async performSrmSSO(cleanEmail, password, jar, client) {
        SessionLogger.info(TAG, `Initiating SRM SSO authentication sequence for ${cleanEmail}`);
        
        await client.get(SIGNIN_REFERER_URL);

        const cookies = await jar.getCookies("https://academia.srmist.edu.in");
        const iamcsrCookie = cookies.find(c => c.key === "iamcsr");
        if (!iamcsrCookie) {
            throw new Error("Unable to retrieve CSRF validation tokens.");
        }
        const iamcsrValue = iamcsrCookie.value;

        const timestamp = Date.now();

        const lookupResponse = await client.post(
            `https://academia.srmist.edu.in/accounts/p/40-10002227248/signin/v2/lookup/${encodeURIComponent(cleanEmail)}`,
            `mode=primary&cli_time=${timestamp}&orgtype=40&service_language=en&serviceurl=https://academia.srmist.edu.in/portal/academia-academic-services/redirectFromLogin`,
            {
                headers: {
                    "X-ZCSRF-TOKEN": `iamcsrcoo=${iamcsrValue}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Referer": SIGNIN_REFERER_URL,
                    "Origin": "https://academia.srmist.edu.in"
                }
            }
        );

        const lookupData = lookupResponse.data;
        if (!lookupData || !lookupData.lookup) {
            throw new Error("User lookup response failed.");
        }
        const { identifier, digest } = lookupData.lookup;

        const passwordUrl = `https://academia.srmist.edu.in/accounts/p/40-10002227248/signin/v2/primary/${identifier}/password?digest=${digest}`;
        const passwordBody = { passwordauth: { password: password } };

        const passwordResponse = await client.post(passwordUrl, passwordBody, {
            headers: {
                "X-ZCSRF-TOKEN": `iamcsrcoo=${iamcsrValue}`,
                "Content-Type": "application/json",
                "Referer": SIGNIN_REFERER_URL,
                "Origin": "https://academia.srmist.edu.in"
            }
        });

        const passwordData = passwordResponse.data;
        if (passwordData.code !== "SI303" && passwordData.code !== "SI302") {
            if (passwordData.message && passwordData.message.includes("Domain is not trusted")) {
                throw new Error("Domain is not trusted");
            }
            throw new Error(passwordData.message || "Failed password check.");
        }

        const redirectUri = passwordData.passwordauth?.redirect_uri || "";

        // Handle SRM 2-concurrent session limit block eviction
        if (redirectUri.includes("preannouncement/block-sessions")) {
            SessionLogger.info(TAG, `SRM 2-concurrent session block detected for ${cleanEmail}. Evicting blocked session...`);
            try {
                const deleteUrl = "https://academia.srmist.edu.in/accounts/p/40-10002227248/webclient/v1/announcement/pre/blocksessions";
                await client.delete(deleteUrl, {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                        "X-ZCSRF-TOKEN": `iamcsrcoo=${iamcsrValue}`
                    }
                });
            } catch (deleteError) {
                SessionLogger.warn(TAG, `Non-fatal block-session eviction notice: ${deleteError.message}`);
            }
            await client.get(redirectUri, { maxRedirects: 10, validateStatus: () => true });
        } else {
            if (redirectUri) {
                await client.get(redirectUri, { maxRedirects: 10, validateStatus: () => true });
            }
        }

        await client.get("https://academia.srmist.edu.in/portal/academia-academic-services/redirectFromLogin");
        SessionLogger.info(TAG, `SRM SSO authentication successful for ${cleanEmail}`);
    }

    /**
     * Public Login Flow
     * @param {string} email 
     * @param {string} password 
     * @param {(client: any) => Promise<any>} scrapeFn 
     */
    async login(email, password, scrapeFn) {
        const cleanEmail = CookieStore.normalizeEmail(email);
        if (!cleanEmail || !password) {
            throw new Error("NetID / Email and Password are required.");
        }

        // 1. CHECK IF ACTIVE VALID COOKIEJAR ALREADY EXISTS (ZERO UNNECESSARY LOGINS)
        const existingRecord = CookieStore.get(cleanEmail);
        if (existingRecord && existingRecord.jar && existingRecord.isValid !== false) {
            try {
                SessionLogger.info(TAG, `Attempting CookieJar reuse for ${cleanEmail} (ZERO login calls to SRM)`);
                const client = await createSrmClient(existingRecord.jar);
                const payload = await scrapeFn(client);
                
                const validation = SessionValidator.validateScrapedPayload(payload);
                if (validation.valid) {
                    CookieStore.set(cleanEmail, existingRecord.jar, { email: cleanEmail, password });
                    CacheStore.set(cleanEmail, payload);
                    SessionLogger.info(TAG, `Successfully re-used active SRM CookieJar for ${cleanEmail} (saved 1 portal login)`);
                    return { success: true, ...payload };
                }
            } catch (scrapeErr) {
                SessionLogger.warn(TAG, `Stored CookieJar for ${cleanEmail} requires refresh on portal: ${scrapeErr.message}`);
            }
        }

        // 2. ACQUIRE PER-ACCOUNT LOGIN MUTEX (Only 1 login request reaches SRM simultaneously)
        return LoginMutex.execute(cleanEmail, async () => {
            const jar = new CookieJar();
            const client = await createSrmClient(jar);

            await this.performSrmSSO(cleanEmail, password, jar, client);
            const payload = await scrapeFn(client);

            // Store CookieJar & credentials securely
            CookieStore.set(cleanEmail, jar, { email: cleanEmail, password });
            CacheStore.set(cleanEmail, payload);

            return { success: true, ...payload };
        });
    }

    /**
     * Silent Background Re-authentication Flow
     * @param {string} email 
     * @param {(client: any) => Promise<any>} scrapeFn 
     */
    async reauthenticate(email, scrapeFn) {
        const cleanEmail = CookieStore.normalizeEmail(email);
        const record = CookieStore.get(cleanEmail);
        if (!record || !record.credentials || !record.credentials.password) {
            throw new Error(`No saved credentials available for background re-authentication of ${cleanEmail}`);
        }

        SessionLogger.info(TAG, `Executing 1 silent background re-authentication for ${cleanEmail}`);

        return LoginMutex.execute(cleanEmail, async () => {
            const freshJar = new CookieJar();
            const freshClient = await createSrmClient(freshJar);

            await this.performSrmSSO(cleanEmail, record.credentials.password, freshJar, freshClient);
            const payload = await scrapeFn(freshClient);

            CookieStore.set(cleanEmail, freshJar, record.credentials);
            CacheStore.set(cleanEmail, payload);

            SessionLogger.info(TAG, `Background re-authentication successful for ${cleanEmail}`);
            return { success: true, payload, jar: freshJar };
        });
    }
}

module.exports = new AuthenticationManager();
