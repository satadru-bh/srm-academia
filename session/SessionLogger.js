/**
 * SRM Academia+ - Session Management System
 * SessionLogger: Centralized Structured Logger for Observability & Audit Trails
 */

class SessionLogger {
    static sanitize(msg) {
        if (typeof msg !== 'string') return msg;
        // Never log raw passwords or authorization secret tokens
        return msg
            .replace(/passwordauth":\s*\{\s*"password":\s*"[^"]*"/gi, 'passwordauth":{"password":"[REDACTED]"')
            .replace(/password=([^&]*)/gi, 'password=[REDACTED]');
    }

    static info(tag, message, meta = '') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [INFO] [${tag}] ${this.sanitize(message)}`, meta ? this.sanitize(JSON.stringify(meta)) : '');
    }

    static warn(tag, message, meta = '') {
        const timestamp = new Date().toISOString();
        console.warn(`[${timestamp}] [WARN] [${tag}] ${this.sanitize(message)}`, meta ? this.sanitize(JSON.stringify(meta)) : '');
    }

    static error(tag, message, err = null) {
        const timestamp = new Date().toISOString();
        const errDetail = err ? (err.stack || err.message || String(err)) : '';
        console.error(`[${timestamp}] [ERROR] [${tag}] ${this.sanitize(message)} ${this.sanitize(errDetail)}`);
    }

    static debug(tag, message, meta = '') {
        if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_SESSION === 'true') {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [DEBUG] [${tag}] ${this.sanitize(message)}`, meta ? this.sanitize(JSON.stringify(meta)) : '');
        }
    }
}

module.exports = SessionLogger;
