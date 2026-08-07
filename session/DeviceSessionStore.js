/**
 * SRM Academia+ - Session Management System
 * DeviceSessionStore: Device App Session Registry & Independent Logout Engine
 * 
 * Rules:
 * - Decouples client device authentication (Express sessions / device tokens) from SRM SSO CookieJars.
 * - Single Device Logout: Destroys ONLY that device's app session. The shared SRM CookieJar remains intact for other devices.
 * - All Devices Logout: Destroys all device sessions, deletes shared SRM CookieJar, and clears server cache.
 */

const CookieStore = require('./CookieStore');
const CacheStore = require('./CacheStore');
const SessionLogger = require('./SessionLogger');
const TAG = 'DeviceSessionStore';

class DeviceSessionStore {
    constructor() {
        /** @type {Map<string, string>} Mapping: sessionId -> cleanEmail */
        this.deviceMap = new Map();
    }

    /**
     * Binds a device session ID to an SRM account email
     */
    bindDevice(sessionId, email) {
        const cleanEmail = CookieStore.normalizeEmail(email);
        if (!sessionId || !cleanEmail) return;

        this.deviceMap.set(sessionId, cleanEmail);
        SessionLogger.info(TAG, `Bound device session ${sessionId} to account ${cleanEmail}`);
    }

    /**
     * Resolves SRM account email from a device session ID
     */
    getAccountEmail(sessionId) {
        if (!sessionId) return null;
        return this.deviceMap.get(sessionId) || null;
    }

    /**
     * Logout Single Device
     * Destroys ONLY that device's app session mapping. Does NOT delete shared SRM CookieJar.
     */
    logoutDevice(sessionId) {
        if (!sessionId) return;
        const email = this.deviceMap.get(sessionId);
        if (email) {
            this.deviceMap.delete(sessionId);
            SessionLogger.info(TAG, `Unbound device session ${sessionId} for ${email}. Shared SRM CookieJar remains ACTIVE for other devices.`);
        }
    }

    /**
     * Logout All Devices & Destroy Shared SRM Session
     * Destroys all app device sessions, deletes shared SRM CookieJar, and clears server cache.
     */
    logoutAllDevices(email) {
        const cleanEmail = CookieStore.normalizeEmail(email);
        if (!cleanEmail) return;

        // Remove all device session mappings for this email
        for (const [sessId, mappedEmail] of this.deviceMap.entries()) {
            if (mappedEmail === cleanEmail) {
                this.deviceMap.delete(sessId);
            }
        }

        // Delete shared SRM CookieJar & credentials from memory and disk
        CookieStore.delete(cleanEmail);

        // Clear server data cache
        CacheStore.delete(cleanEmail);

        SessionLogger.info(TAG, `Logged out account ${cleanEmail} from ALL devices and destroyed shared SRM CookieJar.`);
    }
}

module.exports = new DeviceSessionStore();
