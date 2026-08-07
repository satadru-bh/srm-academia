/**
 * SRM Academia+ - Session Management System
 * SessionValidator: Response Inspector & Error Classification Engine
 * 
 * Rules:
 * - Detects 302 login redirects, 401, 403, Signin page HTML, missing page elements.
 * - Crucial Rule: Network failures (timeouts, DNS, connection reset) are NOT auth failures.
 * - Timeouts must NEVER delete sessions or force re-authentication.
 */

const SessionLogger = require('./SessionLogger');
const TAG = 'SessionValidator';

class SessionValidator {
    /**
     * Inspects thrown error or HTTP response to determine if it is a genuine authentication failure
     */
    static isAuthFailure(err) {
        if (!err) return false;

        const msg = String(err.message || err.status || err || '').toLowerCase();
        const code = String(err.code || '');

        // 1. Explicit HTTP Auth Status Codes
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            SessionLogger.warn(TAG, `Auth failure detected: HTTP status ${err.response.status}`);
            return true;
        }

        // 2. SRM Redirect Chains to Login Portal
        if (msg.includes('signin') || msg.includes('redirectfromlogin') || msg.includes('blocksessions') || msg.includes('accounts/p/')) {
            SessionLogger.warn(TAG, `Auth failure detected: SRM SSO login redirect (${msg})`);
            return true;
        }

        // 3. Password or Auth Token Errors
        if (msg.includes('invalid password') || msg.includes('failed password check') || msg.includes('si302') || msg.includes('si303')) {
            SessionLogger.warn(TAG, `Auth failure detected: Credentials rejected (${msg})`);
            return true;
        }

        return false;
    }

    /**
     * Inspects thrown error to determine if it is a transient network/connection failure
     */
    static isNetworkFailure(err) {
        if (!err) return false;

        const msg = String(err.message || '').toLowerCase();
        const code = String(err.code || '').toUpperCase();

        if (
            code === 'ETIMEDOUT' ||
            code === 'ECONNRESET' ||
            code === 'ECONNREFUSED' ||
            code === 'ENOTFOUND' ||
            code === 'EHOSTUNREACH' ||
            msg.includes('timeout') ||
            msg.includes('econnreset') ||
            msg.includes('econnrefused') ||
            msg.includes('etimedout') ||
            msg.includes('network error')
        ) {
            SessionLogger.info(TAG, `Transient network failure detected (${code || msg}). Cookies PRESERVED.`);
            return true;
        }

        return false;
    }

    /**
     * Inspects scraped HTML payload to verify that valid data was returned instead of sign-in HTML
     */
    static validateScrapedPayload(payload) {
        if (!payload || typeof payload !== 'object') {
            return { valid: false, reason: 'Empty payload returned' };
        }

        // Check if studentInfo contains at least basic identifier
        const studentInfo = payload.studentInfo || {};
        if (!studentInfo.registrationNumber && !studentInfo.name && !studentInfo.netId) {
            // Check if HTML contains login form indicators
            return { valid: false, reason: 'Missing student profile structure' };
        }

        return { valid: true };
    }
}

module.exports = SessionValidator;
