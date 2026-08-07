/**
 * SRM Academia+ - Session Management System
 * LoginMutex: Per-Account Concurrency Lock & Single-Promise Gatekeeper
 * 
 * Rules:
 * - Only ONE login request may ever reach SRM simultaneously for the same account.
 * - When parallel requests hit the backend, everyone else awaits the in-progress login Promise.
 * - Prevents race conditions and hitting SRM's 2-concurrent session limit.
 */

const SessionLogger = require('./SessionLogger');
const CookieStore = require('./CookieStore');
const TAG = 'LoginMutex';

class LoginMutex {
    constructor() {
        /** @type {Map<string, Promise<any>>} */
        this.locks = new Map();
    }

    /**
     * Executes an async operation with per-account single-promise mutex locking
     * @template T
     * @param {string} email - Account email
     * @param {() => Promise<T>} asyncFn - Async login function to execute
     * @returns {Promise<T>}
     */
    async execute(email, asyncFn) {
        const cleanEmail = CookieStore.normalizeEmail(email);
        if (!cleanEmail) {
            return asyncFn();
        }

        // If a login for this account is ALREADY in progress, attach to the existing Promise
        if (this.locks.has(cleanEmail)) {
            SessionLogger.info(TAG, `Account ${cleanEmail} is ALREADY logging in. Parallel request waiting for mutex lock.`);
            return this.locks.get(cleanEmail);
        }

        SessionLogger.info(TAG, `Acquired login mutex for account ${cleanEmail}`);

        const promise = (async () => {
            try {
                return await asyncFn();
            } finally {
                this.locks.delete(cleanEmail);
                SessionLogger.info(TAG, `Released login mutex for account ${cleanEmail}`);
            }
        })();

        this.locks.set(cleanEmail, promise);
        return promise;
    }

    /**
     * Checks if account currently has an active login in progress
     */
    isLocked(email) {
        const cleanEmail = CookieStore.normalizeEmail(email);
        return this.locks.has(cleanEmail);
    }
}

module.exports = new LoginMutex();
