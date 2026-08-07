/**
 * SRM Academia+ - Session Management System
 * Central Module Export Facade
 */

const CookieStore = require('./CookieStore');
const CacheStore = require('./CacheStore');
const LoginMutex = require('./LoginMutex');
const SessionValidator = require('./SessionValidator');
const AuthenticationManager = require('./AuthenticationManager');
const RequestExecutor = require('./RequestExecutor');
const DeviceSessionStore = require('./DeviceSessionStore');
const SessionLogger = require('./SessionLogger');
const { createSrmClient } = require('./SRMClient');

module.exports = {
    CookieStore,
    CacheStore,
    LoginMutex,
    SessionValidator,
    AuthenticationManager,
    RequestExecutor,
    DeviceSessionStore,
    SessionLogger,
    createSrmClient
};
