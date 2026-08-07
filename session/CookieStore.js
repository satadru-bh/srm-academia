/**
 * SRM Academia+ - Session Management System
 * CookieStore: Single Source of Truth for Account CookieJars & Disk Persistence
 * 
 * Rules:
 * - Exactly ONE CookieJar per SRM account email.
 * - Restores CookieJars on startup without automatically initiating SRM logins.
 * - Stores credentials securely in memory/disk for transparent background re-authentication.
 */

const fs = require('fs');
const path = require('path');
const { CookieJar } = require('tough-cookie');
const SessionLogger = require('./SessionLogger');

const SESSIONS_STORE_PATH = path.join(__dirname, '..', 'srm_user_sessions.json');
const TAG = 'CookieStore';

class CookieStore {
    constructor() {
        /** @type {Map<string, { email: string, jar: CookieJar, credentials: { email: string, password: string } | null, lastUsed: number, isValid: boolean }>} */
        this.store = new Map();
        try {
            this.loadFromDisk();
        } catch (initErr) {
            SessionLogger.warn(TAG, 'CookieStore disk initialization skipped (serverless/read-only environment).', initErr.message || '');
        }
    }

    /**
     * Normalizes account email string
     */
    normalizeEmail(email) {
        if (!email) return '';
        let clean = String(email).toLowerCase().trim();
        if (!clean.includes('@')) {
            clean = `${clean}@srmist.edu.in`;
        }
        return clean;
    }

    static normalizeEmail(email) {
        if (!email) return '';
        let clean = String(email).toLowerCase().trim();
        if (!clean.includes('@')) {
            clean = `${clean}@srmist.edu.in`;
        }
        return clean;
    }

    /**
     * Loads persisted session jars from disk on backend startup
     */
    loadFromDisk() {
        if (!fs.existsSync(SESSIONS_STORE_PATH)) {
            SessionLogger.info(TAG, 'No existing session store found on disk. Initializing empty CookieStore.');
            return;
        }

        try {
            const raw = fs.readFileSync(SESSIONS_STORE_PATH, 'utf8');
            if (!raw || !raw.trim()) return;

            const data = JSON.parse(raw);
            let count = 0;

            Object.keys(data).forEach(key => {
                const item = data[key];
                if (item && item.cookieJar && item.email) {
                    const cleanEmail = CookieStore.normalizeEmail(item.email);
                    try {
                        const jar = CookieJar.deserializeSync(item.cookieJar);
                        this.store.set(cleanEmail, {
                            email: cleanEmail,
                            jar,
                            credentials: item.credentials || null,
                            lastUsed: item.lastUsed || Date.now(),
                            isValid: item.isValid !== false
                        });
                        count++;
                    } catch (jarErr) {
                        SessionLogger.warn(TAG, `Failed to deserialize CookieJar for ${cleanEmail}`, jarErr.message);
                    }
                }
            });

            SessionLogger.info(TAG, `Restored ${count} unique account CookieJar(s) from disk persistence.`);
        } catch (err) {
            SessionLogger.error(TAG, 'Error restoring sessions from disk', err);
        }
    }

    /**
     * Persists all active CookieJars to disk
     */
    saveToDisk() {
        try {
            const serializedObj = {};
            for (const [email, record] of this.store.entries()) {
                if (record && record.jar) {
                    serializedObj[email] = {
                        email: record.email,
                        cookieJar: record.jar.serializeSync(),
                        credentials: record.credentials || null,
                        lastUsed: record.lastUsed,
                        isValid: record.isValid
                    };
                }
            }
            fs.writeFileSync(SESSIONS_STORE_PATH, JSON.stringify(serializedObj, null, 2), 'utf8');
            SessionLogger.debug(TAG, `Persisted ${this.store.size} account session(s) to disk.`);
        } catch (err) {
            SessionLogger.error(TAG, 'Error persisting session store to disk', err);
        }
    }

    /**
     * Resolves identifier (NetID email or registration number like ra2511033010043)
     * to the primary account email saved in CookieStore with valid credentials.
     */
    resolveEmail(email) {
        const cleanEmail = CookieStore.normalizeEmail(email);
        if (!cleanEmail) {
            const recent = this.getMostRecent();
            return recent ? recent.email : '';
        }

        // 1. Direct match with saved credentials in CookieStore
        const exactRecord = this.store.get(cleanEmail);
        if (exactRecord && exactRecord.credentials && exactRecord.credentials.password) {
            return cleanEmail;
        }

        // 2. If cleanEmail is a registration number (ra...) or missing credentials, resolve to matching NetID account
        const isRegNum = /^ra\d+/i.test(cleanEmail);
        if (isRegNum || (!exactRecord || !exactRecord.credentials || !exactRecord.credentials.password)) {
            const CacheStore = require('./CacheStore');
            for (const [existingEmail, record] of this.store.entries()) {
                if (record && record.credentials && record.credentials.password && !/^ra\d+/i.test(existingEmail)) {
                    const cache = CacheStore.cache.get(existingEmail);
                    const regNo = cache?.studentInfo?.registrationNumber || cache?.studentInfo?.registerNo || '';
                    if (regNo && cleanEmail.toLowerCase().includes(regNo.toLowerCase())) {
                        SessionLogger.info(TAG, `Resolved registration number ${cleanEmail} -> NetID account ${existingEmail}`);
                        return existingEmail;
                    }
                }
            }
            // Fallback: If cleanEmail is a registration number and we have a valid NetID record, return the NetID email
            if (isRegNum) {
                const recent = this.getMostRecent();
                if (recent && recent.email && !/^ra\d+/i.test(recent.email)) {
                    SessionLogger.info(TAG, `Aliased registration number ${cleanEmail} -> active NetID session ${recent.email}`);
                    return recent.email;
                }
            }
        }

        return cleanEmail;
    }

    /**
     * Retrieves account session record
     */
    get(email) {
        const resolvedEmail = this.resolveEmail(email);
        if (!resolvedEmail) return null;

        const record = this.store.get(resolvedEmail);
        if (record) {
            record.lastUsed = Date.now();
            SessionLogger.debug(TAG, `Retrieved active CookieJar for ${resolvedEmail}`);
            return record;
        }
        return null;
    }

    /**
     * Stores or updates account session record
     */
    set(email, jar, credentials = null) {
        const cleanEmail = CookieStore.normalizeEmail(email);
        if (!cleanEmail || !jar) return;

        const existing = this.store.get(cleanEmail);
        const record = {
            email: cleanEmail,
            jar,
            credentials: credentials || (existing ? existing.credentials : null),
            lastUsed: Date.now(),
            isValid: true
        };

        this.store.set(cleanEmail, record);
        SessionLogger.info(TAG, `Updated shared CookieJar for account ${cleanEmail}`);
        this.saveToDisk();
    }

    /**
     * Updates last activity timestamp
     */
    touch(email) {
        const cleanEmail = CookieStore.normalizeEmail(email);
        const record = this.store.get(cleanEmail);
        if (record) {
            record.lastUsed = Date.now();
        }
    }

    /**
     * Marks session as invalidated on portal
     */
    markInvalid(email) {
        const cleanEmail = CookieStore.normalizeEmail(email);
        const record = this.store.get(cleanEmail);
        if (record) {
            record.isValid = false;
            SessionLogger.warn(TAG, `Marked CookieJar for ${cleanEmail} as INVALID`);
            this.saveToDisk();
        }
    }

    /**
     * Permanently deletes account session from memory and disk
     */
    delete(email) {
        const cleanEmail = CookieStore.normalizeEmail(email);
        if (!cleanEmail) return;

        if (this.store.has(cleanEmail)) {
            this.store.delete(cleanEmail);
            SessionLogger.info(TAG, `Deleted CookieJar and credentials for account ${cleanEmail}`);
            this.saveToDisk();
        }
    }

    /**
     * Returns most recently active session record (Fallback helper)
     */
    getMostRecent() {
        if (this.store.size === 0) return null;
        const sorted = Array.from(this.store.values()).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
        const netIdRecord = sorted.find(r => r && r.email && !/^ra\d+/i.test(r.email));
        return netIdRecord || sorted[0] || null;
    }

    /**
     * Checks if account exists in store
     */
    has(email) {
        const cleanEmail = CookieStore.normalizeEmail(email);
        return this.store.has(cleanEmail);
    }
}

module.exports = new CookieStore();
