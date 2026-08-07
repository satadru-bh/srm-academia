/**
 * SRM Academia+ - Session Management System
 * CacheStore: Server-Side Per-Account Data Cache & Stale Fallback Engine
 * 
 * Purpose:
 * Provides immediate response cache and graceful stale data fallbacks (isStale: true)
 * whenever SRM is offline, timing out, or undergoing portal maintenance.
 */

const SessionLogger = require('./SessionLogger');
const CookieStore = require('./CookieStore');
const TAG = 'CacheStore';

class CacheStore {
    constructor() {
        /** @type {Map<string, { studentInfo: object, attendance: array, marks: array, personalTimetable: array, unifiedTimetable: object, mergedTimetable: object, planner: array, updatedAt: number }>} */
        this.cache = new Map();
    }

    /**
     * Caches complete payload for an account
     */
    set(email, payload) {
        const cleanEmail = CookieStore.normalizeEmail(email);
        if (!cleanEmail || !payload) return;

        const cacheEntry = {
            studentInfo: payload.studentInfo || {},
            attendance: payload.attendance || [],
            marks: payload.marks || [],
            personalTimetable: payload.personalTimetable || [],
            unifiedTimetable: payload.unifiedTimetable || {},
            mergedTimetable: payload.mergedTimetable || {},
            planner: payload.planner || [],
            updatedAt: Date.now()
        };

        this.cache.set(cleanEmail, cacheEntry);
        SessionLogger.debug(TAG, `Updated server-side cache for account ${cleanEmail}`);
    }

    /**
     * Retrieves fresh or stale cache entry for an account
     */
    get(email, isStale = false, staleReason = '') {
        const cleanEmail = CookieStore.normalizeEmail(email);
        if (!cleanEmail) return null;

        const entry = this.cache.get(cleanEmail);
        if (!entry) {
            SessionLogger.debug(TAG, `Cache miss for account ${cleanEmail}`);
            return null;
        }

        SessionLogger.info(TAG, `Cache hit for account ${cleanEmail} (isStale: ${isStale})`);

        return {
            success: true,
            isStale,
            staleReason: staleReason || undefined,
            studentInfo: entry.studentInfo,
            attendance: entry.attendance,
            marks: entry.marks,
            personalTimetable: entry.personalTimetable,
            unifiedTimetable: entry.unifiedTimetable,
            mergedTimetable: entry.mergedTimetable,
            planner: entry.planner,
            lastSyncedAt: entry.updatedAt
        };
    }

    /**
     * Checks if account has cached data
     */
    has(email) {
        const cleanEmail = CookieStore.normalizeEmail(email);
        return this.cache.has(cleanEmail);
    }

    /**
     * Deletes account cache
     */
    delete(email) {
        const cleanEmail = CookieStore.normalizeEmail(email);
        if (cleanEmail && this.cache.has(cleanEmail)) {
            this.cache.delete(cleanEmail);
            SessionLogger.info(TAG, `Cleared server cache for account ${cleanEmail}`);
        }
    }
}

module.exports = new CacheStore();
