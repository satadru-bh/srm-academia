/**
 * Vercel Serverless Function Entrypoint
 * Bridges all /api/* requests to the Express app in server.js
 */

let app;
let initError = null;

try {
    app = require("../server");
} catch (err) {
    initError = err;
    console.error("[FATAL] server.js failed to load:", err.message);
    console.error(err.stack);
}

module.exports = (req, res) => {
    // If the server module failed to load, return a diagnostic JSON error
    if (initError) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({
            success: false,
            error: "Server initialization failed: " + initError.message,
            stack: process.env.NODE_ENV !== "production" ? initError.stack : undefined
        }));
    }

    // Delegate to Express
    return app(req, res);
};
