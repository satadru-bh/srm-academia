/**
 * SRM Academia+ - Session Management System
 * SRMClient: Axios HTTP Client Factory with CookieJar Binding & Timeout Settings
 */

const axios = require('axios');

// axios-cookiejar-support v7 is ESM-only, so we use dynamic import()
let _wrapper = null;
async function getWrapper() {
    if (!_wrapper) {
        const mod = await import('axios-cookiejar-support');
        _wrapper = mod.wrapper;
    }
    return _wrapper;
}

async function createSrmClient(jar) {
    const wrapper = await getWrapper();
    return wrapper(axios.create({
        jar,
        timeout: 20000, // 20-second timeout
        withCredentials: true,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive'
        }
    }));
}

module.exports = { createSrmClient };
