/**
 * SRM Academia+ - Frontend Logic Core (with Debug Deck, Rebuilt Calendar & GPA Calculation)
 */

// Global window properties for Debug Mode
window.DEBUG_MODE = false;

// Register Production PWA Service Worker for Web App Installation
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.log("ServiceWorker registration note:", err);
        });
    });
}

// Global PWA Deferred Install Prompt Container
let deferredPwaInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaInstallPrompt = e;
    try {
        const dismissed = localStorage.getItem('srm_pwa_banner_dismissed');
        const now = Date.now();
        if (!dismissed || (now - parseInt(dismissed, 10)) > 7 * 24 * 60 * 60 * 1000) {
            setTimeout(showPwaBanner, 3000);
        }
    } catch (_) {
        setTimeout(showPwaBanner, 3000);
    }
});

window.addEventListener('appinstalled', () => {
    deferredPwaInstallPrompt = null;
    hidePwaBanner();
    createToast("SRM Academia+ Web App Installed Successfully!", "success");
});

function isIosDevice() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
}

function isStandaloneApp() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function showPwaBanner() {
    if (isStandaloneApp()) return;
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.remove('hidden');
}

function hidePwaBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.add('hidden');
}

function triggerPwaInstallPrompt() {
    if (isStandaloneApp()) {
        createToast("SRM Academia+ is already running as an installed App!", "info");
        return;
    }

    if (deferredPwaInstallPrompt) {
        deferredPwaInstallPrompt.prompt();
        deferredPwaInstallPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                createToast("SRM Academia+ Web App Installed!", "success");
                hidePwaBanner();
            }
            deferredPwaInstallPrompt = null;
        });
    } else {
        openPwaInstallModal();
    }
}

function openPwaInstallModal() {
    const modal = document.getElementById('pwa-install-modal');
    const body = document.getElementById('pwa-install-modal-body');
    if (!modal || !body) return;

    let contentHtml = '';
    if (isIosDevice()) {
        contentHtml = `
            <div style="background: var(--bg-surface-elevated); padding: 14px; border-radius: 12px; border: 1px solid var(--border-subtle); display: flex; align-items: flex-start; gap: 12px;">
                <span style="background: var(--accent-primary-subtle); color: var(--accent-primary); font-weight: 900; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 13px;">1</span>
                <div style="font-size: 13px; color: var(--text-primary); line-height: 1.4;">
                    Tap the <strong>Share</strong> button <span style="font-size: 16px;">⎋</span> in the Safari bottom toolbar.
                </div>
            </div>
            <div style="background: var(--bg-surface-elevated); padding: 14px; border-radius: 12px; border: 1px solid var(--border-subtle); display: flex; align-items: flex-start; gap: 12px;">
                <span style="background: var(--accent-primary-subtle); color: var(--accent-primary); font-weight: 900; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 13px;">2</span>
                <div style="font-size: 13px; color: var(--text-primary); line-height: 1.4;">
                    Scroll down and tap <strong>"Add to Home Screen"</strong> <span style="font-size: 16px;">⊕</span>.
                </div>
            </div>
            <div style="background: var(--bg-surface-elevated); padding: 14px; border-radius: 12px; border: 1px solid var(--border-subtle); display: flex; align-items: flex-start; gap: 12px;">
                <span style="background: var(--accent-primary-subtle); color: var(--accent-primary); font-weight: 900; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 13px;">3</span>
                <div style="font-size: 13px; color: var(--text-primary); line-height: 1.4;">
                    Tap <strong>"Add"</strong> in top right. SRM Academia+ will open as an App!
                </div>
            </div>
        `;
    } else {
        contentHtml = `
            <div style="background: var(--bg-surface-elevated); padding: 14px; border-radius: 12px; border: 1px solid var(--border-subtle); display: flex; align-items: flex-start; gap: 12px;">
                <span style="background: var(--accent-primary-subtle); color: var(--accent-primary); font-weight: 900; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 13px;">1</span>
                <div style="font-size: 13px; color: var(--text-primary); line-height: 1.4;">
                    Click the <strong>Install Icon</strong> <span style="font-size: 15px;">⊕</span> in your browser address bar (or menu <strong>⋮</strong>).
                </div>
            </div>
            <div style="background: var(--bg-surface-elevated); padding: 14px; border-radius: 12px; border: 1px solid var(--border-subtle); display: flex; align-items: flex-start; gap: 12px;">
                <span style="background: var(--accent-primary-subtle); color: var(--accent-primary); font-weight: 900; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 13px;">2</span>
                <div style="font-size: 13px; color: var(--text-primary); line-height: 1.4;">
                    Select <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong>.
                </div>
            </div>
        `;
    }

    body.innerHTML = contentHtml;
    modal.classList.remove('hidden');
}

// Simulated Date & Day Order Storage
let simulatedDateTime = null; // String "YYYY-MM-DDTHH:MM" or null
let simulatedDayOrder = 'AUTO'; // 'AUTO' or 'DAY 1'-'DAY 5'

// Application State Container
const state = {
    studentInfo: {},
    attendance: [],
    marks: [],
    personalTimetable: [],
    unifiedTimetable: {},
    mergedTimetable: {},
    planner: [],
    activeTab: 'overview',
    selectedBunkCourse: '',
    timetableActiveDay: 'DAY 1',
    currentCalendarMonth: new Date(), // Tracks monthly navigation scope in Rebuilt Calendar
    selectedOverviewDay: null // Cycles day order on Overview focus grid
};

// Period timings index mapper (24-hour format for calculation, formatted for display)
const periodTimings = [
    { start: "08:00", end: "08:50", display: "08:00 - 08:50" }, // 1
    { start: "08:50", end: "09:40", display: "08:50 - 09:40" }, // 2
    { start: "09:45", end: "10:35", display: "09:45 - 10:35" }, // 3
    { start: "10:40", end: "11:30", display: "10:40 - 11:30" }, // 4
    { start: "11:35", end: "12:25", display: "11:35 - 12:25" }, // 5
    { start: "12:30", end: "13:20", display: "12:30 - 01:20" }, // 6
    { start: "13:25", end: "14:15", display: "01:25 - 02:15" }, // 7
    { start: "14:20", end: "15:10", display: "02:20 - 03:10" }, // 8
    { start: "15:10", end: "16:00", display: "03:10 - 04:00" }, // 9
    { start: "16:00", end: "16:50", display: "04:00 - 04:50" }, // 10
    { start: "16:50", end: "17:30", display: "04:50 - 05:30" }, // 11
    { start: "17:30", end: "18:10", display: "05:30 - 06:10" }  // 12
];

// Array of 32 Handcrafted Themes with color swatches in decreasing order of prominence:
// [0] Base Background, [1] Card Surface, [2] Primary Accent, [3] Secondary Accent
const AVAILABLE_THEMES = [
    // Sculpted Claymorphism
    { id: 'claymorphism', name: 'Claymorphism', tag: 'Sculpted Soft Ceramic & Matte Polymer', colors: ['#F7F4F0', '#FAF7F4', '#8B70F6', '#7BB8FF'] },

    // Neo-Brutalist & High Contrast
    { id: 'neo-brutalist', name: 'Neo-Brutalist Light', tag: 'Electric Lime & Thick Outlines', colors: ['#f4f4ee', '#ffffff', '#ccff00', '#000000'] },
    { id: 'retro-computing', name: 'Retro Computing', tag: 'NeXTSTEP & SGI Engineering Workstation', colors: ['#ECE9E1', '#F7F5F0', '#2D5B4F', '#1E1E1E'] },

    // Neutral & Monochrome
    { id: 'monochrome-dark', name: 'Monochrome Dark', tag: 'Pure Black & Silver', colors: ['#050505', '#121212', '#ffffff', '#a3a3a3'] },
    { id: 'monochrome-light', name: 'Monochrome Light', tag: 'Pure White & Onyx', colors: ['#fafafa', '#ffffff', '#0f172a', '#475569'] },
    { id: 'slate-neutral', name: 'Slate Neutral', tag: 'Cool Graphite Slate', colors: ['#0f172a', '#1e293b', '#6366f1', '#818cf8'] },
    { id: 'taupe-natural', name: 'Warm Taupe', tag: 'Natural Warm Greige', colors: ['#faf8f5', '#ffffff', '#786c5f', '#9a8b79'] },

    // Professional & Corporate
    { id: 'corporate-navy', name: 'Corporate Navy', tag: 'Professional Deep Blue', colors: ['#0a1120', '#111c33', '#2563eb', '#60a5fa'] },
    { id: 'executive-light', name: 'Executive Light', tag: 'Corporate Sapphire', colors: ['#f8fafc', '#ffffff', '#1e40af', '#0284c7'] },
    { id: 'enterprise-dark', name: 'Enterprise Slate', tag: 'Professional Dark Cyan', colors: ['#0f172a', '#1e293b', '#0d9488', '#14b8a6'] },
    { id: 'financial-green', name: 'Financial Emerald', tag: 'Corporate Forest Dark', colors: ['#061a14', '#0d2a20', '#059669', '#34d399'] },

    // OLED & Deep Dark
    { id: 'pitch-black', name: 'Pitch Black', tag: 'OLED Pure Black', colors: ['#000000', '#0a0a0a', '#f97316', '#38bdf8'] },
    { id: 'midnight-navy', name: 'Midnight Navy', tag: 'Deep Slate', colors: ['#070b19', '#0f172a', '#3b82f6', '#60a5fa'] },
    { id: 'dracula', name: 'Dracula', tag: 'Vampire Gothic', colors: ['#1e1f29', '#282a36', '#bd93f9', '#ff79c6'] },
    { id: 'emerald-mint', name: 'Emerald Mint', tag: 'Forest Dark', colors: ['#040d0a', '#0a1c16', '#10b981', '#34d399'] },
    { id: 'tokyo-night', name: 'Tokyo Night', tag: 'Neon Cyber City', colors: ['#1a1b26', '#24283b', '#7aa2f7', '#bb9af7'] },
    { id: 'nord-dark', name: 'Nordic Frost', tag: 'Arctic Slate', colors: ['#2e3440', '#3b4252', '#88c0d0', '#81a1c1'] },
    { id: 'monokai-pro', name: 'Monokai Pro', tag: 'Warm Charcoal', colors: ['#19181a', '#222125', '#ffd866', '#ff6188'] },
    { id: 'obsidian-purple', name: 'Obsidian Royal', tag: 'Imperial Amethyst', colors: ['#090514', '#130a24', '#a855f7', '#e9d5ff'] },

    // Vibrant & Creative
    { id: 'cyberpunk', name: 'Cyberpunk Neon', tag: 'High Voltage', colors: ['#0d0221', '#190a38', '#ff007f', '#00f0ff'] },
    { id: 'synthwave', name: 'Synthwave 80s', tag: 'Neon Sunset', colors: ['#170b28', '#24123e', '#f72585', '#4cc9f0'] },
    { id: 'sunset-horizon', name: 'Sunset Horizon', tag: 'Twilight Glow', colors: ['#12081f', '#210e38', '#ff6b6b', '#fca5a5'] },
    { id: 'matrix-green', name: 'Matrix Code', tag: 'Terminal Hacker', colors: ['#030a05', '#08170b', '#22c55e', '#4ade80'] },
    { id: 'crimson-velvet', name: 'Crimson Velvet', tag: 'Deep Ruby', colors: ['#140508', '#24090f', '#ef4444', '#fca5a5'] },
    { id: 'oceanic-deep', name: 'Oceanic Deep', tag: 'Abyss Cyan', colors: ['#05131a', '#0b202c', '#06b6d4', '#67e8f9'] },
    { id: 'solarized-dark', name: 'Solarized Dark', tag: 'Teal Amber', colors: ['#002b36', '#073642', '#b58900', '#2aa198'] },
    { id: 'catppuccin-mocha', name: 'Catppuccin Mocha', tag: 'Soft Lavender Dark', colors: ['#1e1e2e', '#2a2b3d', '#cba6f7', '#f5c2e7'] },

    // Light & Minimalist
    { id: 'clean-light', name: 'Clean Light', tag: 'Minimal Light', colors: ['#f8fafc', '#ffffff', '#f97316', '#0284c7'] },
    { id: 'sakura-rose', name: 'Sakura Rose', tag: 'Soft Pastel Light', colors: ['#fff5f7', '#ffffff', '#e11d48', '#f43f5e'] },
    { id: 'cream-latte', name: 'Cream Latte', tag: 'Warm Coffee', colors: ['#fdfbf7', '#f5efe6', '#d97706', '#b45309'] },
    { id: 'paper-minimal', name: 'Paper Minimal', tag: 'Warm Gray Notebook', colors: ['#f6f6f4', '#ffffff', '#2563eb', '#3b82f6'] },
    { id: 'mint-chocolat', name: 'Mint Pastel', tag: 'Soft Sage Light', colors: ['#f2faf6', '#ffffff', '#059669', '#10b981'] },
    { id: 'nord-light', name: 'Nordic Snow', tag: 'Ice Slate Light', colors: ['#f0f4f8', '#ffffff', '#0284c7', '#38bdf8'] },
    { id: 'solarized-light', name: 'Solarized Light', tag: 'Warm Cream Amber', colors: ['#fdf6e3', '#eee8d5', '#b58900', '#d33682'] },
    { id: 'lavender-bliss', name: 'Lavender Bliss', tag: 'Pastel Violet', colors: ['#f8f5ff', '#ffffff', '#7c3aed', '#a855f7'] }
];

// Document Event Handlers on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Clears sticky mobile focus/hover state on touch tap release
document.addEventListener('touchend', () => {
    if (document.activeElement && document.activeElement !== document.body && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'SELECT') {
        document.activeElement.blur();
    }
}, { passive: true });

/**
 * Resolves absolute API endpoints for both Web Browsers and Native Android App Containers
 */
function getApiEndpoint(path) {
    if (!path.startsWith('/')) path = '/' + path;
    if (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null') {
        const storedUrl = localStorage.getItem('srm_api_base_url');
        if (storedUrl && storedUrl.trim()) {
            return storedUrl.trim().replace(/\/$/, '') + path;
        }
    }
    return path;
}

/**
 * Generates persistent multi-device headers to guarantee session continuity
 */
function getApiHeaders(extraHeaders = {}) {
    let activeEmail = (localStorage.getItem('srm_academia_active_email') || '').trim();
    if (!activeEmail || /^ra\d+/i.test(activeEmail)) {
        try {
            const saved = JSON.parse(localStorage.getItem('srm_saved_accounts') || '[]');
            const netIdAcc = saved.find(a => a.email && !/^ra\d+/i.test(a.email));
            if (netIdAcc) {
                activeEmail = netIdAcc.email;
            } else if (state.studentInfo && (state.studentInfo.netId || state.studentInfo.email)) {
                activeEmail = state.studentInfo.netId || state.studentInfo.email;
            }
        } catch (e) {}
    }
    return {
        'Content-Type': 'application/json',
        'X-User-Email': activeEmail,
        ...extraHeaders
    };
}

// Window Focus Handler - Never logs out automatically; silently updates if session is live
window.addEventListener('focus', async () => {
    const isActive = localStorage.getItem('srm_academia_session_active') === 'true';
    if (isActive) {
        const lastCheck = parseInt(localStorage.getItem('srm_last_focus_check') || '0', 10);
        const now = Date.now();
        if (now - lastCheck < 10 * 60 * 1000) {
            return;
        }
        localStorage.setItem('srm_last_focus_check', now.toString());

        try {
            const res = await fetch(getApiEndpoint('/api/sync'), {
                method: 'POST',
                credentials: 'include',
                headers: getApiHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    updateApplicationState(data);
                }
            }
        } catch (e) {}
    }
});

/**
 * Initializes the application lifecycle
 */
async function initApp() {
    setupThemeSelector();
    setupNavigation();
    setupSwipeGestures();
    setupEventBindings();
    setupSavedAccountsAndBannerBindings();
    renderSavedAccounts();
    setupThemeWelcomeModal();
    setupSupportModal();

    // Check instant localStorage cache first to bypass login screen immediately
    let hasCache = false;
    try {
        const cachedStr = localStorage.getItem('srm_academia_cached_data');
        const isActive = localStorage.getItem('srm_academia_session_active') === 'true';

        if (cachedStr && isActive) {
            const cachedData = JSON.parse(cachedStr);
            if (cachedData && (cachedData.attendance || cachedData.mergedTimetable || cachedData.studentInfo)) {
                updateApplicationState(cachedData);
                showWorkspace();
                hasCache = true;
            }
        }
    } catch (err) {
        console.warn('Failed to parse instant cache:', err);
    }

    if (hasCache) {
        // Silent background sync attempt — keep workspace active using cache
        attemptAutomaticSync();
    } else {
        const restored = await attemptAutomaticSync();
        if (restored) {
            showWorkspace();
            updateStickySessionBanner(false);
        } else {
            showAuthScreen();
        }
    }
}

function openSmoothMenu(menu) {
    if (!menu) return;
    if (menu._closeTimer) { clearTimeout(menu._closeTimer); menu._closeTimer = null; }
    menu.classList.remove('hidden');
    void menu.offsetWidth;
    menu.classList.add('menu-active');
}

function closeSmoothMenu(menu) {
    if (!menu) return;
    menu.classList.remove('menu-active');
    if (menu._closeTimer) clearTimeout(menu._closeTimer);
    menu._closeTimer = setTimeout(() => {
        if (!menu.classList.contains('menu-active')) {
            menu.classList.add('hidden');
        }
        menu._closeTimer = null;
    }, 210);
}

/**
 * Global Backdrop & Unified Animated Popup Controller
 */
let _backdropCloseTimer = null;

function updateGlobalBackdrop() {
    const backdrop = document.getElementById('global-backdrop-overlay');
    if (!backdrop) return;

    // Check for modal dialogs that are open OR currently animating closed (Dropdown menus have background effects disabled)
    const activeOrClosingEl = document.querySelector(`
        #attendance-prediction-modal:not(.hidden),
        #calendar-event-modal:not(.hidden),
        #custom-class-modal:not(.hidden),
        #account-switcher-modal:not(.hidden),
        #add-account-modal:not(.hidden),
        #theme-welcome-modal:not(.hidden)
    `);

    // Check for modals that are truly active
    const trulyActiveEl = document.querySelector(`
        #attendance-prediction-modal:not(.hidden):not(.pop-closing),
        #calendar-event-modal:not(.hidden):not(.pop-closing),
        #custom-class-modal:not(.hidden):not(.pop-closing),
        #account-switcher-modal:not(.hidden):not(.pop-closing),
        #add-account-modal:not(.hidden):not(.pop-closing),
        #theme-welcome-modal:not(.hidden):not(.pop-closing)
    `);

    if (trulyActiveEl) {
        // A popup is fully open — show backdrop, cancel any pending close
        if (_backdropCloseTimer) { clearTimeout(_backdropCloseTimer); _backdropCloseTimer = null; }
        backdrop.classList.remove('hidden', 'closing');
        void backdrop.offsetWidth;
        backdrop.classList.add('active');
        document.body.classList.add('popup-backdrop-active');
    } else if (activeOrClosingEl) {
        // Something is mid-close animation — keep backdrop and scroll-lock alive
    } else {
        // Nothing open — start closing backdrop
        if (backdrop.classList.contains('active') || backdrop.classList.contains('closing')) {
            backdrop.classList.add('closing');
            backdrop.classList.remove('active');
            if (_backdropCloseTimer) clearTimeout(_backdropCloseTimer);
            _backdropCloseTimer = setTimeout(() => {
                backdrop.classList.add('hidden');
                backdrop.classList.remove('closing');
                document.body.classList.remove('popup-backdrop-active');
                _backdropCloseTimer = null;
            }, 220);
        } else {
            backdrop.classList.add('hidden');
            backdrop.classList.remove('active', 'closing');
            document.body.classList.remove('popup-backdrop-active');
        }
    }
}

/**
 * Universal Animated Opening Helper for all Popups, Dropdowns & Modals
 */
function animateOpenElement(el, callback) {
    if (!el) return;
    el.classList.remove('hidden', 'pop-closing');
    updateGlobalBackdrop();
    if (callback) callback();
}

/**
 * Universal Animated Closing Helper for all Popups, Dropdowns & Modals
 */
function animateCloseElement(el, callback) {
    if (!el || el.classList.contains('hidden') || el.classList.contains('pop-closing')) {
        if (callback && (!el || el.classList.contains('hidden'))) callback();
        return;
    }

    el.classList.add('pop-closing');
    updateGlobalBackdrop();

    setTimeout(() => {
        el.classList.add('hidden');
        el.classList.remove('pop-closing');
        updateGlobalBackdrop();
        if (callback) callback();
    }, 220);
}

/**
 * Closes whichever popup or modal is currently open with smooth exit animation
 */
function closeActivePopupOrModal() {
    const activeElements = document.querySelectorAll(`
        .theme-dropdown-menu:not(.hidden),
        .user-dropdown-menu:not(.hidden),
        #attendance-prediction-modal:not(.hidden),
        #calendar-event-modal:not(.hidden),
        #custom-class-modal:not(.hidden),
        #account-switcher-modal:not(.hidden),
        #add-account-modal:not(.hidden),
        #theme-welcome-modal:not(.hidden)
    `);

    activeElements.forEach(el => animateCloseElement(el));
}

/**
 * Interactive Theme Selector Handler with 12 Creative Themes & Prominence Previews
 */
function setupThemeSelector() {
    const triggerBtns = document.querySelectorAll('.theme-trigger-button');
    const dropdownMenus = document.querySelectorAll('.theme-dropdown-menu');
    const optionsGrids = document.querySelectorAll('.theme-options-grid');
    const activeLabels = document.querySelectorAll('.theme-trigger-label');
    const triggerSwatchesList = document.querySelectorAll('.theme-trigger-swatches');

    const backdrop = document.getElementById('global-backdrop-overlay');
    if (backdrop && !backdrop.dataset.bound) {
        backdrop.dataset.bound = 'true';
        backdrop.addEventListener('click', closeActivePopupOrModal);
    }

    // ESC key closes any open popup/modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeActivePopupOrModal();
    });

    const savedThemeId = localStorage.getItem('srm_theme') || 'pitch-black';
    applyTheme(savedThemeId);

    triggerBtns.forEach((triggerBtn, idx) => {
        const dropdownMenu = dropdownMenus[idx];
        if (triggerBtn && dropdownMenu) {
            triggerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownMenus.forEach(m => {
                    if (m !== dropdownMenu) closeSmoothMenu(m);
                });
                
                if (dropdownMenu.classList.contains('hidden') || !dropdownMenu.classList.contains('menu-active')) {
                    openSmoothMenu(dropdownMenu);
                } else {
                    closeSmoothMenu(dropdownMenu);
                }
            });
        }
    });

    document.addEventListener('click', (e) => {
        dropdownMenus.forEach(dropdownMenu => {
            if (dropdownMenu.classList.contains('menu-active')) {
                const container = dropdownMenu.closest('.theme-selector-container');
                if (container && !container.contains(e.target)) {
                    closeSmoothMenu(dropdownMenu);
                }
            }
        });
    });

    renderThemeOptions();

    function renderThemeOptions() {
        const currentActiveTheme = localStorage.getItem('srm_theme') || 'pitch-black';
        const html = AVAILABLE_THEMES.filter(theme => theme.id !== 'claymorphism').map(theme => {
            const isActive = theme.id === currentActiveTheme || (currentActiveTheme === 'dark' && theme.id === 'pitch-black') || (currentActiveTheme === 'light' && theme.id === 'clean-light');
            const activeClass = isActive ? 'active' : '';
            const checkIcon = isActive ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>` : '';

            return `
                <div class="theme-option-card ${activeClass}" data-theme-id="${theme.id}">
                    <div class="theme-card-info">
                        <div class="theme-card-name">
                            <span>${theme.name}</span>
                            ${checkIcon}
                        </div>
                    </div>
                    <div class="color-prominence-bar" title="Color prominence: Base, Card, Primary Accent, Secondary Accent">
                        <span class="color-segment segment-bg" style="background-color: ${theme.colors[0]}"></span>
                        <span class="color-segment segment-card" style="background-color: ${theme.colors[1]}"></span>
                        <span class="color-segment segment-accent" style="background-color: ${theme.colors[2]}"></span>
                        <span class="color-segment segment-sec" style="background-color: ${theme.colors[3]}"></span>
                    </div>
                </div>
            `;
        }).join('');

        optionsGrids.forEach(grid => {
            if (!grid) return;
            grid.innerHTML = html;
            grid.querySelectorAll('.theme-option-card').forEach(card => {
                card.addEventListener('click', () => {
                    const selectedId = card.getAttribute('data-theme-id');
                    applyTheme(selectedId);
                    localStorage.setItem('srm_theme', selectedId);
                    renderThemeOptions();
                    dropdownMenus.forEach(m => animateCloseElement(m));
                });
            });
        });
    }

    function applyTheme(themeId) {
        applyThemeGlobally(themeId);
    }
}

/**
 * Global Theme Application Helper
 */
function applyThemeGlobally(themeId) {
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('srm_theme', themeId);

    const currentThemeObj = (typeof AVAILABLE_THEMES !== 'undefined' ? AVAILABLE_THEMES.find(t => t.id === themeId) : null) || (typeof AVAILABLE_THEMES !== 'undefined' ? AVAILABLE_THEMES[0] : null);
    
    if (currentThemeObj) {
        document.querySelectorAll('.theme-trigger-label').forEach(lbl => {
            if (lbl) lbl.textContent = currentThemeObj.name;
        });

        document.querySelectorAll('.theme-trigger-swatches').forEach(swatches => {
            if (swatches) {
                swatches.innerHTML = `
                    <span class="swatch-pip" style="background-color: ${currentThemeObj.colors[0]}"></span>
                    <span class="swatch-pip" style="background-color: ${currentThemeObj.colors[1]}"></span>
                    <span class="swatch-pip" style="background-color: ${currentThemeObj.colors[2]}"></span>
                `;
            }
        });
    }

    updateLogoForTheme(themeId);

    setTimeout(() => {
        if (typeof renderOverviewPane === 'function') renderOverviewPane();
        if (typeof renderPerformanceTrends === 'function') renderPerformanceTrends();
        syncDataToAndroidWidgets();
    }, 50);
}

/**
 * Prompts first-time logged in users to explore our 2 flagship themes (Neo-Brutalist & Retro Compute)
 */
function checkAndShowThemeWelcomePrompt() {
    const seen = localStorage.getItem('srm_companion_theme_welcome_seen');
    if (!seen) {
        const modal = document.getElementById('theme-welcome-modal');
        if (modal) {
            setTimeout(() => {
                modal.classList.remove('hidden');
                updateGlobalBackdrop();
            }, 500);
        }
    }
}

function setupThemeWelcomeModal() {
    const modal = document.getElementById('theme-welcome-modal');
    if (!modal) return;

    const closeBtn = document.getElementById('close-theme-welcome-btn');
    const neobrutalBtn = document.getElementById('promo-select-neobrutal');
    const retroBtn = document.getElementById('promo-select-retro');
    const keepBtn = document.getElementById('promo-keep-default-btn');

    function hideWelcomeModal() {
        animateCloseElement(modal);
        localStorage.setItem('srm_companion_theme_welcome_seen', 'true');
    }

    if (closeBtn) closeBtn.addEventListener('click', hideWelcomeModal);
    if (keepBtn) keepBtn.addEventListener('click', hideWelcomeModal);

    if (neobrutalBtn) {
        neobrutalBtn.addEventListener('click', () => {
            hideWelcomeModal();
            applyThemeGlobally('neo-brutalist');
            createToast("Applied Neo-Brutalist Theme", "success");
        });
    }

    if (retroBtn) {
        retroBtn.addEventListener('click', () => {
            hideWelcomeModal();
            applyThemeGlobally('retro-computing');
            createToast("Applied Retro Compute Theme", "success");
        });
    }
}

function openSupportModal() {
    const modal = document.getElementById('support-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.style.pointerEvents = 'auto';
        updateGlobalBackdrop();
    }
}

function setupSupportModal() {
    const modal = document.getElementById('support-modal');
    const closeBtn = document.getElementById('close-support-modal-btn');
    const copyBtn = document.getElementById('copy-upi-btn');
    const upiIdEl = document.getElementById('support-upi-id');

    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('#btn-support-donate-upi, .support-donate-btn, .more-menu-item-support');
        if (trigger) {
            e.preventDefault();
            openSupportModal();
        }
    });

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            animateCloseElement(modal);
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                animateCloseElement(modal);
            }
        });
    }

    const copyBtn2 = document.getElementById('copy-upi-btn-2');
    const upiIdEl2 = document.getElementById('support-upi-id-2');

    const copyUpi = (upiStr) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(upiStr).then(() => {
                createToast("UPI ID Copied to Clipboard!", "success");
            }).catch(() => {
                createToast("Copied: " + upiStr, "info");
            });
        } else {
            createToast("Copied: " + upiStr, "info");
        }
    };

    const pageCopyBtn1 = document.getElementById('copy-page-upi-btn-1');
    const pageUpiEl1 = document.getElementById('page-upi-id-1');
    const pageCopyBtn2 = document.getElementById('copy-page-upi-btn-2');
    const pageUpiEl2 = document.getElementById('page-upi-id-2');

    if (copyBtn && upiIdEl) {
        copyBtn.addEventListener('click', () => copyUpi(upiIdEl.textContent.trim()));
    }
    if (copyBtn2 && upiIdEl2) {
        copyBtn2.addEventListener('click', () => copyUpi(upiIdEl2.textContent.trim()));
    }
    if (pageCopyBtn1 && pageUpiEl1) {
        pageCopyBtn1.addEventListener('click', () => copyUpi(pageUpiEl1.textContent.trim()));
    }
    if (pageCopyBtn2 && pageUpiEl2) {
        pageCopyBtn2.addEventListener('click', () => copyUpi(pageUpiEl2.textContent.trim()));
    }
}

const LIGHT_THEMES = new Set([
    'claymorphism',
    'neo-brutalist',
    'retro-computing',
    'monochrome-light',
    'taupe-natural',
    'executive-light',
    'clean-light',
    'sakura-rose',
    'cream-latte',
    'paper-minimal',
    'mint-chocolat',
    'nord-light',
    'solarized-light',
    'lavender-bliss'
]);

function isThemeLight(themeId) {
    return LIGHT_THEMES.has(themeId);
}

/**
 * Dynamically switches brand logos: logo_dark.png in light themes and logo_light.png in dark themes.
 */
function updateLogoForTheme(themeId) {
    const activeTheme = themeId || document.documentElement.getAttribute('data-theme') || 'pitch-black';
    const isLight = isThemeLight(activeTheme);
    const targetLogoSrc = isLight ? 'logo_dark.png' : 'logo_light.png';
    const fallbackLogoSrc = isLight ? 'logo_light.png' : 'logo_dark.png';

    const logoImgs = document.querySelectorAll('.brand-logo-img, .header-brand-logo-img, #header-brand-logo-img');
    logoImgs.forEach(img => {
        img.onerror = function() {
            this.onerror = null;
            this.src = fallbackLogoSrc;
        };
        img.src = targetLogoSrc;
    });
}

/**
 * Attaches UI Event Listeners
 */
function setupEventBindings() {
    // Mobile Navigation Handlers
    const mobileMenuBtn = document.getElementById('mobile-sidebar-toggle');
    const mobileCloseBtn = document.getElementById('mobile-sidebar-close');
    const sidebar = document.querySelector('.sidebar');

    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => sidebar.classList.add('open'));
    }
    if (mobileCloseBtn && sidebar) {
        mobileCloseBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    }

    // Sidebar Collapse Toggle (Desktop)
    const sidebarCollapseToggle = document.getElementById('sidebar-collapse-toggle');
    const appWorkspace = document.getElementById('app-workspace');
    if (sidebarCollapseToggle && sidebar && appWorkspace) {
        sidebarCollapseToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            appWorkspace.classList.toggle('sidebar-collapsed');
            
            // Re-scale charts dynamically on width transition
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 300);
        });
    }

    // Overview Day Order Cycle Buttons
    const btnPrev = document.getElementById('overview-prev-day-btn');
    const btnNext = document.getElementById('overview-next-day-btn');
    const btnToday = document.getElementById('overview-btn-today');

    // Universal PWA Install Buttons & Banner Bindings
    document.addEventListener('click', (e) => {
        const installBtn = e.target.closest('[data-pwa-install="true"], #pwa-banner-install-btn, .pwa-install-btn');
        if (installBtn) {
            e.preventDefault();
            triggerPwaInstallPrompt();
        }
    });

    const bannerDismissBtn = document.getElementById('pwa-banner-dismiss-btn');
    if (bannerDismissBtn) {
        bannerDismissBtn.addEventListener('click', () => {
            hidePwaBanner();
            try {
                localStorage.setItem('srm_pwa_banner_dismissed', String(Date.now()));
            } catch (_) {}
        });
    }

    const closePwaModalBtn = document.getElementById('close-pwa-modal-btn');
    const pwaModal = document.getElementById('pwa-install-modal');
    if (closePwaModalBtn && pwaModal) {
        closePwaModalBtn.addEventListener('click', () => {
            animateCloseElement(pwaModal);
        });
        pwaModal.addEventListener('click', (e) => {
            if (e.target === pwaModal) {
                animateCloseElement(pwaModal);
            }
        });
    }
/**
 * Setup Custom Class Modal Event Listeners
 */
function setupCustomClassModal() {
    const addBtn = document.getElementById('add-custom-class-btn');
    const modal = document.getElementById('custom-class-modal');
    const closeBtn = document.getElementById('close-custom-class-modal');
    const cancelBtn = document.getElementById('btn-cancel-custom-class');
    const form = document.getElementById('custom-class-form');

    if (!modal) return;

    const openModal = () => {
        modal.classList.remove('hidden');
        updateGlobalBackdrop();
    };

    const closeModal = () => {
        animateCloseElement(modal);
    };

    if (addBtn) addBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const dayOrder = document.getElementById('custom-class-day').value;
            const period = document.getElementById('custom-class-period').value;
            const typeRadio = document.querySelector('input[name="custom-class-type"]:checked');
            const type = typeRadio ? typeRadio.value : 'theory';
            const courseName = document.getElementById('custom-class-name').value.trim();
            const courseCode = document.getElementById('custom-class-code').value.trim();
            const room = document.getElementById('custom-class-room').value.trim();

            if (!courseName) {
                createToast("Please enter a course name.", "warning");
                return;
            }

            const classObj = {
                id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                dayOrder,
                period: parseInt(period, 10),
                course: courseName,
                code: courseCode || '',
                type, // 'theory' or 'lab'
                room: room || 'Custom',
                faculty: 'Custom'
            };

            addCustomClass(classObj);
            renderTimetablePane();
            closeModal();
            form.reset();
            createToast(`Added custom class "${courseName}" to ${dayOrder}.`, "success");
        });
    }
}

    const btnTomorrow = document.getElementById('overview-btn-tomorrow');
    
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            const dayCycle = ['DAY 1', 'DAY 2', 'DAY 3', 'DAY 4', 'DAY 5', 'FREE DAY'];
            let idx = dayCycle.indexOf(state.selectedOverviewDay);
            if (idx === -1) idx = 5;
            idx = (idx - 1 + 6) % 6;
            state.selectedOverviewDay = dayCycle[idx];
            renderOverviewPane();
        });
    }
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            const dayCycle = ['DAY 1', 'DAY 2', 'DAY 3', 'DAY 4', 'DAY 5', 'FREE DAY'];
            let idx = dayCycle.indexOf(state.selectedOverviewDay);
            if (idx === -1) idx = 5;
            idx = (idx + 1) % 6;
            state.selectedOverviewDay = dayCycle[idx];
            renderOverviewPane();
        });
    }
    if (btnToday) {
        btnToday.addEventListener('click', () => {
            state.selectedOverviewDay = getTodayDayOrder();
            renderOverviewPane();
        });
    }
    if (btnTomorrow) {
        btnTomorrow.addEventListener('click', () => {
            state.selectedOverviewDay = getTomorrowDayOrder();
            renderOverviewPane();
        });
    }

    // Attendance Prediction Calculator Listeners
    const btnRunPred = document.getElementById('btn-run-prediction');
    const btnClearPred = document.getElementById('btn-clear-prediction');
    if (btnRunPred) {
        btnRunPred.addEventListener('click', runAttendancePrediction);
    }
    if (btnClearPred) {
        btnClearPred.addEventListener('click', clearAttendancePrediction);
    }

    // Login Form Submission & Controls
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmission);
    }

    const togglePassBtn = document.getElementById('toggle-password-btn');
    const passInput = document.getElementById('password');
    if (togglePassBtn && passInput) {
        togglePassBtn.addEventListener('click', () => {
            const isPass = passInput.type === 'password';
            passInput.type = isPass ? 'text' : 'password';
            const eyeOpen = togglePassBtn.querySelector('.eye-open');
            const eyeClosed = togglePassBtn.querySelector('.eye-closed');
            if (eyeOpen && eyeClosed) {
                eyeOpen.classList.toggle('hidden', isPass);
                eyeClosed.classList.toggle('hidden', !isPass);
            }
        });
    }

    const emailInput = document.getElementById('email');
    const domainTag = document.getElementById('domain-tag');
    if (emailInput && domainTag) {
        const updateDomainTag = () => {
            const val = emailInput.value.trim();
            if (val.includes('@')) {
                domainTag.style.opacity = '0';
            } else {
                domainTag.style.opacity = '1';
            }
        };
        emailInput.addEventListener('input', () => {
            updateDomainTag();
            hideAuthError();
        });
        updateDomainTag();
    }

    if (passInput) {
        passInput.addEventListener('input', hideAuthError);
    }

    // Server URL Configurator (Legacy IP binding removed for web deployment)
    function updateServerUrlDisplay() {}

    // Log out Session
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', terminateLocalSession);
    }

    // Header User Profile Avatar & Dropdown Menu Listeners
    const avatarBtn = document.getElementById('header-user-avatar-btn');
    const dropdownMenu = document.getElementById('header-user-dropdown-menu');
    const dropdownLogoutBtn = document.getElementById('dropdown-logout-btn');
    const dropdownSwitchAccBtn = document.getElementById('dropdown-switch-account-btn');

    if (avatarBtn && dropdownMenu) {
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dropdownMenu.classList.contains('hidden') || !dropdownMenu.classList.contains('menu-active')) {
                openSmoothMenu(dropdownMenu);
            } else {
                closeSmoothMenu(dropdownMenu);
            }
        });

        document.addEventListener('click', (e) => {
            if (dropdownMenu.classList.contains('menu-active')) {
                const container = dropdownMenu.closest('.header-user-menu-container');
                if (container && !container.contains(e.target)) {
                    closeSmoothMenu(dropdownMenu);
                }
            }
        });
    }

    if (dropdownLogoutBtn) {
        dropdownLogoutBtn.addEventListener('click', () => {
            animateCloseElement(dropdownMenu, () => {
                terminateLocalSession("Signed out of SRM Academia+");
            });
        });
    }

    if (dropdownSwitchAccBtn) {
        dropdownSwitchAccBtn.addEventListener('click', () => {
            animateCloseElement(dropdownMenu, () => {
                openAccountSwitcherModal();
            });
        });
    }

    // Sync Data Handler
    const syncBtn = document.getElementById('sync-button');
    if (syncBtn) {
        syncBtn.addEventListener('click', handleSyncRequest);
    }

    // Timetable Export Image Handler
    const downloadTimetableBtn = document.getElementById('download-timetable-btn');
    if (downloadTimetableBtn) {
        downloadTimetableBtn.addEventListener('click', downloadTimetableImage);
    }
    const downloadTimetableMobileBtn = document.getElementById('download-timetable-mobile-btn');
    if (downloadTimetableMobileBtn) {
        downloadTimetableMobileBtn.addEventListener('click', downloadTimetableImage);
    }

    // Custom Timetable Class Modal Handler
    setupCustomClassModal();

    // Timetable Tab Listeners
    const timetableTabs = document.getElementById('timetable-day-tabs');
    if (timetableTabs) {
        timetableTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('.day-tab');
            if (!btn) return;

            document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');

            state.timetableActiveDay = btn.dataset.day;
            renderTimetablePane();
        });
    }

    // Bunk Calculator Select Listener
    const bunkSelect = document.getElementById('bunk-subject-select');
    if (bunkSelect) {
        bunkSelect.addEventListener('change', (e) => {
            state.selectedBunkCourse = e.target.value;
            calculateBunkSimulations();
        });
    }

    // Rebuilt Calendar Navigations
    const prevMonthBtn = document.getElementById('calendar-prev-month-btn');
    const nextMonthBtn = document.getElementById('calendar-next-month-btn');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            state.currentCalendarMonth.setMonth(state.currentCalendarMonth.getMonth() - 1);
            renderPlannerPane();
        });
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            state.currentCalendarMonth.setMonth(state.currentCalendarMonth.getMonth() + 1);
            renderPlannerPane();
        });
    }

    // Calendar Navigation & Modal Event Handlers
    const calTodayBtn = document.getElementById('calendar-today-btn');
    if (calTodayBtn) {
        calTodayBtn.addEventListener('click', () => {
            state.currentCalendarMonth = new Date();
            renderPlannerPane();
        });
    }

    const modalCloseBtn = document.getElementById('calendar-modal-close-btn');
    const modalOverlay = document.getElementById('calendar-event-modal');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeCalendarModal);
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeCalendarModal();
            }
        });
    }

    // Attendance Prediction Modal Listeners
    const btnOpenPredModal = document.getElementById('open-prediction-modal-btn');
    const btnClosePredModal = document.getElementById('prediction-modal-close-btn');
    const predModalOverlay = document.getElementById('attendance-prediction-modal');
    const btnApplyPred = document.getElementById('btn-modal-apply-prediction');
    const btnResetPredModal = document.getElementById('btn-modal-reset-prediction');
    const btnClearPredBanner = document.getElementById('btn-clear-prediction');

    if (btnOpenPredModal) btnOpenPredModal.addEventListener('click', openAttendancePredictionModal);
    if (btnClosePredModal) btnClosePredModal.addEventListener('click', closeAttendancePredictionModal);
    if (predModalOverlay) {
        predModalOverlay.addEventListener('click', (e) => {
            if (e.target === predModalOverlay) closeAttendancePredictionModal();
        });
    }

    if (btnApplyPred) btnApplyPred.addEventListener('click', applyAttendancePrediction);
    if (btnResetPredModal) {
        btnResetPredModal.addEventListener('click', () => {
            clearAttendancePrediction();
            closeAttendancePredictionModal();
        });
    }
    if (btnClearPredBanner) btnClearPredBanner.addEventListener('click', clearAttendancePrediction);

    // Predictor Mode Tab Binds
    const tabSingleDay = document.getElementById('tab-pred-single-day');
    const tabDateRange = document.getElementById('tab-pred-date-range');
    const paneSingleDay = document.getElementById('pred-mode-single-day');
    const paneDateRange = document.getElementById('pred-mode-date-range');

    if (tabSingleDay && tabDateRange && paneSingleDay && paneDateRange) {
        tabSingleDay.addEventListener('click', () => {
            tabSingleDay.classList.add('active');
            tabSingleDay.style.background = 'var(--bg-surface-solid)';
            tabSingleDay.style.color = 'var(--accent-primary)';
            tabSingleDay.style.boxShadow = 'var(--shadow-premium)';

            tabDateRange.classList.remove('active');
            tabDateRange.style.background = 'transparent';
            tabDateRange.style.color = 'var(--text-secondary)';
            tabDateRange.style.boxShadow = 'none';

            paneSingleDay.classList.remove('hidden');
            paneDateRange.classList.add('hidden');
        });

        tabDateRange.addEventListener('click', () => {
            tabDateRange.classList.add('active');
            tabDateRange.style.background = 'var(--bg-surface-solid)';
            tabDateRange.style.color = 'var(--accent-primary)';
            tabDateRange.style.boxShadow = 'var(--shadow-premium)';

            tabSingleDay.classList.remove('active');
            tabSingleDay.style.background = 'transparent';
            tabSingleDay.style.color = 'var(--text-secondary)';
            tabSingleDay.style.boxShadow = 'none';

            paneDateRange.classList.remove('hidden');
            paneSingleDay.classList.add('hidden');
        });
    }

    // Single Date Picker Change Listener
    const singleDateInput = document.getElementById('modal-pred-single-date');
    if (singleDateInput) {
        singleDateInput.addEventListener('change', (e) => {
            renderSingleDayClassesSelector(e.target.value);
        });
    }

    // Developer Panel apply binds
    const btnApplyDate = document.getElementById('dev-btn-apply-date');
    if (btnApplyDate) {
        btnApplyDate.addEventListener('click', applyDevModeOverrides);
    }
}

/**
 * Switch tabs dynamically
 */
/**
 * Global Tab Switcher Helper
 */
const MAIN_TAB_ORDER = ['overview', 'attendance', 'timetable', 'academics'];

function updateMobileNavActive(activeTarget) {
    const mobileItems = document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item');
    mobileItems.forEach(nav => {
        const mobileTarget = (nav.dataset.mobileTarget || '').replace('view-', '');
        if (mobileTarget === activeTarget) {
            nav.classList.add('active');
        } else {
            nav.classList.remove('active');
        }
    });
}

function switchTab(targetTab) {
    if (!targetTab) return;

    const currentTab = state.activeTab || 'overview';
    if (currentTab === targetTab && document.getElementById(`view-${targetTab}`)?.classList.contains('active')) {
        return;
    }

    const desktopItems = document.querySelectorAll('.sidebar-nav .nav-item');
    desktopItems.forEach(nav => {
        if (nav.dataset.tab === targetTab) nav.classList.add('active');
        else nav.classList.remove('active');
    });

    if (targetTab === 'planner' || targetTab === 'developer' || targetTab === 'support') {
        updateMobileNavActive('more');
    } else {
        updateMobileNavActive(targetTab);
    }

    document.querySelectorAll('.view-pane').forEach(view => {
        view.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${targetTab}`);
    if (targetView) {
        targetView.classList.add('active');
    }

    state.activeTab = targetTab;
    try {
        localStorage.setItem('srm_active_tab', targetTab);
    } catch (e) {}
    updateHeaderTitles(targetTab);

    const fabContainer = document.getElementById('attendance-fab-container');
    if (fabContainer) {
        if (targetTab === 'attendance') {
            fabContainer.classList.remove('hidden');
            document.body.classList.add('attendance-tab-active');
        } else {
            fabContainer.classList.add('hidden');
            document.body.classList.remove('attendance-tab-active');
        }
    }

    if (targetTab === 'overview') renderOverviewPane();
    if (targetTab === 'attendance') renderAttendancePane();
    if (targetTab === 'timetable') renderTimetablePane();
    if (targetTab === 'academics') renderAcademicsPane();
    if (targetTab === 'planner') renderPlannerPane();
    if (targetTab === 'developer') renderDeveloperPane();
    if (targetTab === 'support') renderSupportPane();

    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('open');

    window.scrollTo(0, 0);
}

function renderSupportPane() {
    const pane = document.getElementById('view-support');
    if (!pane) return;
    
    pane.innerHTML = `
        <div class="card support-card" style="display: block !important; visibility: visible !important; opacity: 1 !important; max-width: 860px; margin: 0 auto; padding: 32px; border-radius: var(--radius-xl);">
            <div class="support-header-row" style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 20px;">
                <div class="support-icon-badge" style="width: 48px; height: 48px; border-radius: 14px; background: #ef4444; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
                <div class="support-title-group">
                    <h2 class="support-title" style="font-size: 22px; font-weight: 800; margin: 0; color: var(--text-primary);">Support SRM Academia+</h2>
                    <span class="support-subtitle" style="font-size: 12px; color: var(--text-muted); font-weight: 700;">Independent Student Development</span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 28px; align-items: start;">
                <!-- Left Side: Message & UPI IDs -->
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div class="support-text-block" style="background: var(--bg-surface-elevated); padding: 18px; border-radius: 14px; border: 1px solid var(--border-subtle);">
                        <p class="support-p lead" style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0 0 8px 0;">
                            SRM Academia+ is built independently, by a student, for students.
                        </p>
                        <p class="support-p" style="font-size: 13px; color: var(--text-secondary); margin: 0 0 8px 0; line-height: 1.55;">
                            The app will always have a free version. Contributions help cover server costs, domain fees, and ongoing feature development.
                        </p>
                        <p class="support-p" style="font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.55;">
                            If the app has saved you time or made college life easier, any contribution is deeply appreciated! No pressure.
                        </p>
                    </div>

                    <!-- Primary UPI Box -->
                    <div style="background: var(--bg-surface-elevated); border: 1px dashed var(--border-subtle); border-radius: 12px; padding: 14px; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Primary UPI ID</span>
                            <span id="page-upi-id-1" style="font-family: monospace; font-size: 14px; font-weight: 800; color: var(--text-primary);">8017622902@hdfc</span>
                        </div>
                        <button id="copy-page-upi-btn-1" class="btn-secondary" style="padding: 6px 14px; font-size: 12px; font-weight: 800; border-radius: 8px; cursor: pointer;">Copy UPI</button>
                    </div>

                    <!-- Secondary UPI Box -->
                    <div style="background: var(--bg-surface-elevated); border: 1px dashed var(--border-subtle); border-radius: 12px; padding: 14px; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Secondary UPI ID</span>
                            <span id="page-upi-id-2" style="font-family: monospace; font-size: 12px; font-weight: 800; color: var(--text-primary); word-break: break-all;">satadrubhattacharya940-1@okhdfcbank</span>
                        </div>
                        <button id="copy-page-upi-btn-2" class="btn-secondary" style="padding: 6px 14px; font-size: 12px; font-weight: 800; border-radius: 8px; cursor: pointer; flex-shrink: 0; margin-left: 8px;">Copy UPI</button>
                    </div>
                </div>

                <!-- Right Side: QR Code -->
                <div style="text-align: center; padding: 22px; background: var(--bg-surface-elevated); border-radius: 16px; border: 1px solid var(--border-subtle); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <span style="font-size: 12px; font-weight: 800; color: var(--text-primary); display: block; margin-bottom: 12px;">Scan QR Code using GPay, PhonePe, or Paytm</span>
                    <div style="width: 210px; height: 210px; background: #ffffff; padding: 10px; border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 20px rgba(0,0,0,0.12);">
                        <img src="qr.png" alt="Donate QR Code" style="width: 100%; height: 100%; object-fit: contain; border-radius: 6px;" />
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted); font-weight: 700; margin-top: 12px;">Direct UPI Transfer</span>
                </div>
            </div>
        </div>
    `;

    const copyUpi = (upiStr) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(upiStr).then(() => {
                createToast("UPI ID Copied to Clipboard!", "success");
            }).catch(() => {
                createToast("Copied: " + upiStr, "info");
            });
        } else {
            createToast("Copied: " + upiStr, "info");
        }
    };

    const btn1 = document.getElementById('copy-page-upi-btn-1');
    const el1 = document.getElementById('page-upi-id-1');
    const btn2 = document.getElementById('copy-page-upi-btn-2');
    const el2 = document.getElementById('page-upi-id-2');

    if (btn1 && el1) btn1.addEventListener('click', () => copyUpi(el1.textContent.trim()));
    if (btn2 && el2) btn2.addEventListener('click', () => copyUpi(el2.textContent.trim()));
}

/**
 * Swipe Gestures Disabled by User Request
 */
function setupSwipeGestures() {
    // Disabled
}

function toggleMobileMoreMenu() {
    const menu = document.getElementById('mobile-more-menu');
    if (!menu) return;

    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
        const devBtn = document.getElementById('more-menu-dev-btn');
        if (devBtn) {
            if (typeof isUserAuthorizedForDevConsole === 'function' && isUserAuthorizedForDevConsole()) {
                devBtn.classList.remove('hidden');
                devBtn.style.display = 'flex';
            } else {
                devBtn.classList.add('hidden');
                devBtn.style.display = 'none';
            }
        }

        menu.classList.remove('hidden', 'pop-closing');
        menu.classList.add('active');
        updateMobileNavActive('more');
    } else {
        hideMobileMoreMenu();
    }
}

function hideMobileMoreMenu() {
    const menu = document.getElementById('mobile-more-menu');
    if (menu) {
        menu.classList.add('hidden');
        menu.classList.remove('active', 'pop-closing');
    }
    updateMobileNavActive(state.activeTab === 'planner' || state.activeTab === 'developer' || state.activeTab === 'support' ? 'more' : state.activeTab);
}

function setupMoreMenuEvents() {
    const menu = document.getElementById('mobile-more-menu');
    if (!menu || menu.dataset.bound) return;
    menu.dataset.bound = 'true';

    menu.querySelectorAll('[data-more-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.moreAction;
            hideMobileMoreMenu();
            if (action === 'planner') {
                switchTab('planner');
            } else if (action === 'developer') {
                switchTab('developer');
            } else if (action === 'support') {
                switchTab('support');
            }
        });
    });

    const closeHandler = (e) => {
        const moreBtn = document.getElementById('mobile-nav-more-btn');
        if (menu && !menu.classList.contains('hidden')) {
            if (!menu.contains(e.target) && (!moreBtn || !moreBtn.contains(e.target))) {
                hideMobileMoreMenu();
            }
        }
    };

    document.addEventListener('pointerdown', closeHandler, { passive: true });
    document.addEventListener('click', closeHandler);
}

function setupNavigation() {
    const desktopItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const mobileItems = document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item');

    desktopItems.forEach(item => {
        item.addEventListener('click', () => {
            hideMobileMoreMenu();
            switchTab(item.dataset.tab);
        });
    });

    mobileItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetTab = (item.dataset.mobileTarget || '').replace('view-', '');
            if (targetTab === 'more') {
                e.stopPropagation();
                toggleMobileMoreMenu();
            } else {
                hideMobileMoreMenu();
                switchTab(targetTab);
            }
        });
    });

    setupMoreMenuEvents();
}

// Window Resize Debounced Re-render for Responsive Canvas Charts
let resizeTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        updateHeaderTitles(state.activeTab || 'overview');
    }, 150);
});

/**
 * Gets time-of-day greeting
 */
function getOverviewGreeting() {
    const hour = new Date().getHours();
    let greeting = "Welcome back";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";
    else greeting = "Good evening";
    return greeting;
}

/**
 * Modifies Header Labels on tab transition select
 */
function updateHeaderTitles(tab) {
    const titleEls = document.querySelectorAll('#workspace-title, .workspace-title');
    if (!titleEls || titleEls.length === 0) return;

    const normalizedTab = (tab || '').toLowerCase().replace('view-', '');
    const isMobile = window.innerWidth < 992;
    let headingText = isMobile ? "Home" : "Overview Dashboard";

    switch (normalizedTab) {
        case 'overview':
            headingText = isMobile ? "Home" : "Overview Dashboard";
            break;
        case 'attendance':
            headingText = "Attendance";
            break;
        case 'timetable':
            headingText = "Timetable";
            break;
        case 'academics':
        case 'marks':
            headingText = "Internal Marks";
            break;
        case 'planner':
            headingText = "Academic Calendar";
            break;
        case 'developer':
            headingText = "Developer Console";
            break;
        case 'support':
            headingText = "Support SRM Academia+";
            break;
        case 'more':
            headingText = "More & Tools";
            break;
        default:
            headingText = normalizedTab ? normalizedTab.charAt(0).toUpperCase() + normalizedTab.slice(1) : (isMobile ? "Home" : "Overview Dashboard");
            break;
    }

    titleEls.forEach(el => {
        el.textContent = headingText;
    });

    const subtitle = document.getElementById('workspace-subtitle');
    if (subtitle) subtitle.textContent = "";

    // Set Dynamic Page Title for Every Tab / Page
    let pageTitleMap = {
        'overview': 'Overview Dashboard',
        'attendance': 'Attendance & Bunk Calculator',
        'timetable': 'Class Timetable',
        'academics': 'Internal Marks & Grades',
        'marks': 'Internal Marks & Grades',
        'planner': 'Academic Calendar & Events',
        'developer': 'Developer Console',
        'support': 'Support SRM Academia+',
        'more': 'More Tools'
    };
    let pageTitle = pageTitleMap[normalizedTab] || (headingText ? headingText : 'Dashboard');
    document.title = `${pageTitle} - SRM Academia+`;
}

/**
 * Centralized Time/Date Helper (Replaces inline new Date() constructor)
 */
function getCurrentDateTime() {
    if (window.DEBUG_MODE && simulatedDateTime) {
        return new Date(simulatedDateTime);
    }
    return new Date();
}

/**
 * Attempts synchronization through active cookies
 */
async function attemptAutomaticSync() {
    try {
        const response = await fetch(getApiEndpoint('/api/sync'), {
            method: 'POST',
            credentials: 'include',
            headers: getApiHeaders()
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        if (data.success) {
            updateApplicationState(data);
            return true;
        }

        return false;
    } catch (err) {
        return false;
    }
}

function showAuthError(message) {
    const authError = document.getElementById('auth-error');
    const authErrorText = document.getElementById('auth-error-text');
    if (authError && authErrorText) {
        authErrorText.textContent = message;
        authError.classList.remove('hidden');
    }
}

function hideAuthError() {
    const authError = document.getElementById('auth-error');
    if (authError) {
        authError.classList.add('hidden');
    }
}

/**
 * Displays the Main Application Workspace and hides the Auth Screen
 */
function showWorkspace() {
    document.documentElement.classList.add('instant-workspace-active');
    const authScreen = document.getElementById('auth-screen');
    const appWorkspace = document.getElementById('app-workspace');
    if (authScreen) {
        authScreen.classList.add('hidden');
        authScreen.style.setProperty('display', 'none', 'important');
    }
    if (appWorkspace) {
        appWorkspace.classList.remove('hidden');
        appWorkspace.style.setProperty('display', 'flex', 'important');
    }
    const mobileNav = document.querySelector('.mobile-bottom-nav');
    if (mobileNav) {
        mobileNav.classList.remove('hidden');
        mobileNav.style.removeProperty('display');
    }
    const savedTab = localStorage.getItem('srm_active_tab') || 'overview';
    switchTab(savedTab);
}

/**
 * Displays the Auth Screen and hides the Main Workspace
 */
function showAuthScreen() {
    document.documentElement.classList.remove('instant-workspace-active');
    const authScreen = document.getElementById('auth-screen');
    const appWorkspace = document.getElementById('app-workspace');
    if (authScreen) {
        authScreen.classList.remove('hidden');
        authScreen.style.setProperty('display', 'flex', 'important');
    }
    if (appWorkspace) {
        appWorkspace.classList.add('hidden');
        appWorkspace.style.setProperty('display', 'none', 'important');
    }
    const mobileNav = document.querySelector('.mobile-bottom-nav');
    if (mobileNav) {
        mobileNav.classList.add('hidden');
        mobileNav.style.setProperty('display', 'none', 'important');
    }
    const mobileMore = document.getElementById('mobile-more-menu');
    if (mobileMore) {
        mobileMore.classList.add('hidden');
    }
    document.title = "Sign In - SRM Academia+";
}

/**
 * Sign In Form Submission Flow
 */
async function handleLoginSubmission(e) {
    e.preventDefault();

    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const btn = document.getElementById('auth-submit-btn');
    const loader = btn ? btn.querySelector('.btn-loader') : null;
    const text = btn ? btn.querySelector('.btn-text') : null;

    if (!emailInput || !passInput) return;

    hideAuthError();

    let email = emailInput.value.trim().toLowerCase();
    const password = passInput.value;

    if (!email) {
        showAuthError("Please enter your NetID or SRM email address.");
        emailInput.focus();
        return;
    }

    if (!password) {
        showAuthError("Please enter your account password.");
        passInput.focus();
        return;
    }

    // Automatically append domain if omitted by student
    if (!email.includes('@')) {
        email = `${email}@srmist.edu.in`;
    }

    try {
        if (btn) btn.disabled = true;
        if (loader) loader.classList.remove('hidden');
        if (text) text.classList.add('hidden');

        localStorage.setItem('srm_academia_active_email', email);

        const response = await fetch(getApiEndpoint('/api/login'), {
            method: 'POST',
            credentials: 'include',
            headers: getApiHeaders(),
            body: JSON.stringify({ email, password })
        });

        let data = {};
        try {
            const rawText = await response.text();
            data = JSON.parse(rawText);
        } catch (parseErr) {
            data = { success: false, error: response.status >= 500 ? "Server temporarily unavailable (500). Please try again shortly." : "Sign-in error. Please check your credentials." };
        }

        if (data.success) {
            const saveCheckbox = document.getElementById('save-account-checkbox');
            if (!saveCheckbox || saveCheckbox.checked) {
                saveAccountCredential(email, password, data.studentInfo || {});
            }
            updateApplicationState(data);
            showWorkspace();
            updateStickySessionBanner(false);

            // Automatically trigger live data sync right after login everytime
            attemptAutomaticSync();
        } else {
            showAuthError(data.error || "Unable to sign in. Please check your NetID and password.");
        }
    } catch (err) {
        showAuthError("Unable to connect to SRM server. Please check your network connection and try again.");
        console.error(err);
    } finally {
        if (btn) btn.disabled = false;
        if (loader) loader.classList.add('hidden');
        if (text) text.classList.remove('hidden');
    }
}

/**
 * Handle Live Synchronization Event Trigger
 */
async function handleSyncRequest() {
    const syncButton = document.getElementById('sync-button');
    const syncIcon = syncButton.querySelector('.sync-icon');

    try {
        syncButton.disabled = true;
        syncIcon.classList.add('loading');

        const response = await fetch(getApiEndpoint('/api/sync'), {
            method: 'POST',
            credentials: 'include',
            headers: getApiHeaders()
        });

        if (response.status === 401 || response.status === 403) {
            createToast("SRM portal session paused. Showing cached data.", "warning");
            return;
        }

        const data = await response.json();

        if (data.expired || (data.error && (data.error.includes('expired') || data.error.includes('Session')))) {
            createToast("SRM portal session paused. Showing cached data.", "warning");
            return;
        }

        if (data.success) {
            localStorage.setItem('srm_last_synced_time', Date.now().toString());
            updateApplicationState(data);
            updateLastSyncedDisplay();
            updateStickySessionBanner(false);

            // Reload active tab renders
            const activeTab = state.activeTab;
            if (activeTab === 'overview') renderOverviewPane();
            if (activeTab === 'attendance') renderAttendancePane();
            if (activeTab === 'timetable') renderTimetablePane();
            if (activeTab === 'academics') renderAcademicsPane();
            if (activeTab === 'planner') renderPlannerPane();
            if (activeTab === 'developer') renderDeveloperPane();
        } else {
            createToast(data.error || "Sync execution was aborted.", "danger");
        }
    } catch (err) {
        createToast("Sync operations failed network validation checks.", "danger");
        console.error(err);
    } finally {
        syncButton.disabled = false;
        syncIcon.classList.remove('loading');
    }
}

/**
 * Frontend Schedule Merger Safety Fallback
 */
function clientMergeTimetables(personal, unifiedBatch) {
    if (!personal || !unifiedBatch) return {};
    const merged = {};

    Object.keys(unifiedBatch).forEach(day => {
        merged[day] = [];
        const daySlots = unifiedBatch[day];

        if (Array.isArray(daySlots)) {
            daySlots.forEach(slotInfo => {
                const slotCode = slotInfo.slot || "";
                if (!slotCode || slotCode === "-") return;

                const periodNum = slotInfo.period;
                const timeRange = slotInfo.time;
                const unifiedSubcodes = slotCode.split("/").map(s => s.trim().toUpperCase());

                let match = null;
                for (const pCourse of personal) {
                    const personalSubcodes = (pCourse.slot || "")
                        .split("-")
                        .map(s => s.trim().toUpperCase())
                        .filter(s => s !== "");

                    const hasIntersection = unifiedSubcodes.some(code => personalSubcodes.includes(code));
                    if (hasIntersection) {
                        match = pCourse;
                        break;
                    }
                }

                if (match) {
                    merged[day].push({
                        period: periodNum,
                        time: timeRange,
                        slot: slotCode,
                        course: match.course,
                        code: match.code || "",
                        category: match.category || "",
                        faculty: match.faculty,
                        room: match.room
                    });
                }
            });
        } else if (typeof daySlots === 'object') {
            Object.keys(daySlots).forEach(slotCode => {
                const slotInfo = daySlots[slotCode];
                const timeRange = slotInfo.time;
                const periodNum = slotInfo.period;
                const unifiedSubcodes = slotCode.split("/").map(s => s.trim().toUpperCase());

                let match = null;
                for (const pCourse of personal) {
                    const personalSubcodes = (pCourse.slot || "")
                        .split("-")
                        .map(s => s.trim().toUpperCase())
                        .filter(s => s !== "");

                    const hasIntersection = unifiedSubcodes.some(code => personalSubcodes.includes(code));
                    if (hasIntersection) {
                        match = pCourse;
                        break;
                    }
                }

                if (match) {
                    merged[day].push({
                        period: periodNum,
                        time: timeRange,
                        slot: slotCode,
                        course: match.course,
                        code: match.code || "",
                        category: match.category || "",
                        faculty: match.faculty,
                        room: match.room
                    });
                }
            });
        }

        merged[day].sort((a, b) => a.period - b.period);
    });

    return merged;
}

/**
 * Central state storage mutation
 */
function updateApplicationState(payload) {
    state.studentInfo = payload.studentInfo || {};
    state.attendance = payload.attendance || [];
    state.marks = payload.marks || [];
    state.personalTimetable = payload.personalTimetable || [];
    state.unifiedTimetable = payload.unifiedTimetable || {};

    const reMerged = clientMergeTimetables(state.personalTimetable, state.unifiedTimetable);
    state.mergedTimetable = (reMerged && Object.keys(reMerged).length > 0) ? reMerged : (payload.mergedTimetable || {});
    state.planner = payload.planner || [];

    // Cache state to localStorage for instant 0ms app boot
    try {
        localStorage.setItem('srm_academia_cached_data', JSON.stringify({
            studentInfo: state.studentInfo,
            attendance: state.attendance,
            marks: state.marks,
            personalTimetable: state.personalTimetable,
            unifiedTimetable: state.unifiedTimetable,
            mergedTimetable: state.mergedTimetable,
            planner: state.planner
        }));
        localStorage.setItem('srm_academia_session_active', 'true');
    } catch (e) {
        console.warn("Unable to cache state to localStorage", e);
    }

    // Assign fallback selected course context
    if (state.attendance.length > 0 && !state.selectedBunkCourse) {
        state.selectedBunkCourse = state.attendance[0].code;
    }

    updateUserProfileData(state.studentInfo);
    updateDevNavVisibility();
    syncDataToAndroidWidgets();
}

/**
 * Synchronizes current Attendance, Timetable, Internal Marks, and Active Theme to Android Widgets
 */
function syncDataToAndroidWidgets() {
    if (window.AndroidWidgetBridge && typeof window.AndroidWidgetBridge.updateWidgetData === 'function') {
        try {
            const attendanceJson = JSON.stringify(state.attendance || []);
            const timetableJson = JSON.stringify(state.mergedTimetable || {});
            const marksJson = JSON.stringify(state.marks || []);
            const plannerJson = JSON.stringify(state.planner || []);
            const activeTheme = localStorage.getItem('srm_theme') || 'pitch-black';
            
            const todayDayOrder = getTodayDayOrder() || 'DAY 1';
            
            const tomorrowDate = new Date();
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);
            const tmrYear = tomorrowDate.getFullYear();
            const tmrMonth = String(tomorrowDate.getMonth() + 1).padStart(2, '0');
            const tmrDay = String(tomorrowDate.getDate()).padStart(2, '0');
            const tmrDateStr = `${tmrYear}-${tmrMonth}-${tmrDay}`;
            
            const tmrPlanner = (state.planner || []).find(p => p.date === tmrDateStr);
            let tomorrowDayOrder = 'DAY 1';
            if (tmrPlanner && tmrPlanner.dayOrder && tmrPlanner.dayOrder !== '-' && tmrPlanner.dayOrder !== 'HOLIDAY') {
                tomorrowDayOrder = `DAY ${tmrPlanner.dayOrder}`;
            } else {
                const dayOfWeek = tomorrowDate.getDay();
                const dayKeys = ["DAY 1", "DAY 2", "DAY 3", "DAY 4", "DAY 5"];
                tomorrowDayOrder = (dayOfWeek >= 1 && dayOfWeek <= 5) ? dayKeys[dayOfWeek - 1] : 'DAY 1';
            }

            window.AndroidWidgetBridge.updateWidgetData(
                attendanceJson,
                timetableJson,
                marksJson,
                activeTheme,
                todayDayOrder,
                tomorrowDayOrder,
                plannerJson
            );
        } catch (e) {
            console.error("Widget sync error:", e);
        }
    }
}

window.addEventListener('resize', () => {
    updateHeaderTitles();
    if (state.activeTab === 'timetable') renderTimetablePane();
    if (state.activeTab === 'planner') renderPlannerPane();
});

/**
 * Updates User Profile Info across Sidebar and Header Avatar Dropdown
 */
function updateUserProfileData(studentInfo) {
    const info = studentInfo || state.studentInfo || {};
    const name = info.studentName || info.name || 'Student Account';

    let regNo = info.registerNo || info.regNo || info.rollNo || info.registrationNo || info.studentId || '';
    if (!regNo || regNo === 'RA--------' || regNo.length < 4) {
        try {
            const saved = JSON.parse(localStorage.getItem('srm_saved_accounts') || '[]');
            if (saved.length > 0 && saved[0].studentInfo && (saved[0].studentInfo.registerNo || saved[0].studentInfo.regNo)) {
                regNo = saved[0].studentInfo.registerNo || saved[0].studentInfo.regNo;
            } else if (saved.length > 0 && saved[0].email && saved[0].email.includes('@')) {
                regNo = saved[0].email.split('@')[0].toUpperCase();
            } else if (info.email && info.email.includes('@')) {
                regNo = info.email.split('@')[0].toUpperCase();
            } else {
                regNo = 'RA--------';
            }
        } catch (e) {
            regNo = 'RA--------';
        }
    }

    const firstChar = name.trim().charAt(0).toUpperCase() || 'S';

    const avatarCharEl = document.getElementById('profile-avatar-char');
    const studentNameEl = document.getElementById('profile-student-name');
    const studentIdEl = document.getElementById('profile-student-id');

    if (avatarCharEl) avatarCharEl.textContent = firstChar;
    if (studentNameEl) studentNameEl.textContent = name;
    if (studentIdEl) studentIdEl.textContent = regNo;

    // Header Avatar & Dropdown Elements
    const headerAvatarCharEl = document.getElementById('header-avatar-char');
    const dropdownUserAvatarEl = document.getElementById('dropdown-user-avatar');
    const dropdownUserNameEl = document.getElementById('dropdown-user-name');
    const dropdownUserIdEl = document.getElementById('dropdown-user-id');

    if (headerAvatarCharEl) headerAvatarCharEl.textContent = firstChar;
    if (dropdownUserAvatarEl) dropdownUserAvatarEl.textContent = firstChar;
    if (dropdownUserNameEl) dropdownUserNameEl.textContent = name;
    if (dropdownUserIdEl) dropdownUserIdEl.textContent = regNo;
}

/**
 * Clears active local environment state parameters and logs out immediately
 */
function terminateLocalSession(reasonMessage) {
    state.studentInfo = {};
    state.attendance = [];
    state.marks = [];
    state.personalTimetable = [];
    state.unifiedTimetable = {};
    state.mergedTimetable = {};
    state.planner = [];
    state.selectedBunkCourse = '';

    try {
        localStorage.removeItem('srm_academia_cached_data');
        localStorage.removeItem('srm_academia_session_active');
    } catch (e) {}

    // Asynchronously inform backend to clear disk session file
    fetch(getApiEndpoint('/api/logout'), { method: 'POST', credentials: 'include' }).catch(() => {});

    showAuthScreen();
    createToast(reasonMessage || "Session terminated successfully.", "warning");
}

/* ---------------- RENDERING COMPONENT INTERACTION METRICS ---------------- */

/**
 * Calculates current aggregate internally evaluated marks & infers academic credit weighted GPA
 */
function calculateGpaAndTotalMarks() {
    let totalObtained = 0;
    let totalMax = 0;
    let totalCreditsWeightedGP = 0;
    let totalCreditsInferred = 0;

    if (state.marks.length === 0) {
        return { gpa: '0.00', obtained: 0, max: 0, percentage: 0 };
    }

    state.marks.forEach(course => {
        let courseObtained = 0;
        let courseMax = 0;
        const assessments = Object.keys(course.assessments);

        assessments.forEach(key => {
            const test = course.assessments[key];
            if (test.obtainedMarks !== null && !isNaN(test.obtainedMarks)) {
                courseObtained += test.obtainedMarks;
                courseMax += (test.maxMarks || 0);
            }
        });

        if (courseMax > 0) {
            totalObtained += courseObtained;
            totalMax += courseMax;

            const coursePercentage = (courseObtained / courseMax) * 100;

            // Map internal evaluation percentage to standard SRM 10-point GPA scale
            let gp = 0;
            if (coursePercentage >= 90) gp = 10;
            else if (coursePercentage >= 80) gp = 9;
            else if (coursePercentage >= 70) gp = 8;
            else if (coursePercentage >= 60) gp = 7;
            else if (coursePercentage >= 50) gp = 6;
            else if (coursePercentage >= 45) gp = 5;
            else gp = 0;

            // Inferred credit rating based on course parameters
            let credit = 3;
            const cleanCode = (course.courseCode || '').toUpperCase();
            const cleanType = (course.courseType || '').toUpperCase();

            if (cleanType.includes('PRACTICAL') || cleanType.includes('LAB') || cleanCode.includes('L') || cleanCode.includes('P')) {
                credit = 1.5; // Laboratory
            } else if (cleanCode.includes('PROJECT') || cleanType.includes('PROJECT')) {
                credit = 4; // Design / Project
            }

            totalCreditsWeightedGP += (gp * credit);
            totalCreditsInferred += credit;
        }
    });

    const computedGPA = totalCreditsInferred > 0
        ? (totalCreditsWeightedGP / totalCreditsInferred).toFixed(2)
        : '0.00';

    const computedPercentage = totalMax > 0
        ? Math.round((totalObtained / totalMax) * 100)
        : 0;

    return {
        gpa: computedGPA,
        obtained: Math.round(totalObtained * 100) / 100,
        max: Math.round(totalMax * 100) / 100,
        percentage: computedPercentage
    };
}

/**
 * Helper to parse time string like "08:50" or "08:50 AM" into total minutes from midnight
 */
function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const clean = timeStr.trim().toUpperCase();
    const parts = clean.split(/[:\s-]/);
    let hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    if (clean.includes('PM') && hours < 12) hours += 12;
    if (clean.includes('AM') && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

/**
 * Robustly finds the VERY NEXT UPCOMING CLASS across today and future days (up to 14 days)
 */
function findNextUpcomingClass() {
    const now = getCurrentDateTime();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + dayOffset);

        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Find day order from planner
        const plannerMatch = state.planner.find(p => p.date === dateStr);
        let dayOrderKey = '';

        if (plannerMatch && plannerMatch.dayOrder && plannerMatch.dayOrder !== '-' && plannerMatch.dayOrder !== 'HOLIDAY') {
            dayOrderKey = `DAY ${plannerMatch.dayOrder}`;
        } else if (state.mergedTimetable && Object.keys(state.mergedTimetable).length > 0) {
            const keys = ["DAY 1", "DAY 2", "DAY 3", "DAY 4", "DAY 5"];
            const dayOfWeek = targetDate.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                dayOrderKey = keys[dayOfWeek - 1];
            }
        }

        if (!dayOrderKey || !state.mergedTimetable[dayOrderKey]) continue;

        const dayClasses = state.mergedTimetable[dayOrderKey] || [];
        const validClasses = dayClasses.filter(c => c && (c.subjectTitle || c.course) && (c.subjectTitle || c.course).trim() !== '');

        if (validClasses.length === 0) continue;

        if (dayOffset === 0) {
            // EXPLICIT USER DIRECTIVE: After 4:50 PM (16:50 / 1010 mins), or for periods past 4:50 PM, do not show today's remaining classes. Show next day class.
            if (currentMinutes >= 1010) {
                continue; // Skip today, fall through to next day order
            }

            const upcomingToday = validClasses.filter(c => {
                const pNum = parseInt(c.period, 10);
                if (pNum > 10) return false; // Exclude P11 and P12 (past 4:50 PM)

                const timing = c.timing || (periodTimings[c.period - 1] ? `${periodTimings[c.period - 1].start}-${periodTimings[c.period - 1].end}` : '');
                if (!timing) return true;
                const parts = timing.split('-');
                const endPart = parts.length > 1 ? parts[1] : parts[0];
                const endMinutes = parseTimeToMinutes(endPart);
                return endMinutes > currentMinutes && endMinutes <= 1010;
            });

            if (upcomingToday.length > 0) {
                return {
                    classObj: upcomingToday[0],
                    dayLabel: 'Today',
                    dayOrder: dayOrderKey,
                    dateStr: dateStr
                };
            }
        } else {
            // Future Day: Return the first class of this day
            const label = dayOffset === 1 ? 'Tomorrow' : targetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return {
                classObj: validClasses[0],
                dayLabel: label,
                dayOrder: dayOrderKey,
                dateStr: dateStr
            };
        }
    }

    // Fallback: return first valid class in timetable matrix
    const keys = Object.keys(state.mergedTimetable || {});
    for (const k of keys) {
        const slots = state.mergedTimetable[k] || [];
        const valid = slots.filter(c => c && (c.subjectTitle || c.course) && (c.subjectTitle || c.course).trim() !== '');
        if (valid.length > 0) {
            return {
                classObj: valid[0],
                dayLabel: 'Upcoming',
                dayOrder: k,
                dateStr: ''
            };
        }
    }

    return null;
}

/**
 * Renders Overview Dashboard Data
 */
function renderOverviewPane() {
    // 1. Populate Sidebar profile fields
    const formattedName = parseStudentShortName(state.studentInfo.name);
    document.getElementById('profile-student-name').textContent = formattedName;
    document.getElementById('profile-student-id').textContent = state.studentInfo.registrationNumber || '';
    const avatar = document.getElementById('profile-avatar-char');
    if (avatar && formattedName) {
        avatar.textContent = formattedName.charAt(0);
    }

    // 2. Render Daily Focus Hero Module
    renderDailyFocusHero();

    // 3. Resolve Operational Day Order & overrides
    if (!state.selectedOverviewDay) {
        state.selectedOverviewDay = getTodayDayOrder();
    }

    const dayOrderTitle = document.getElementById('overview-today-dayorder-title');
    const dayOrderSub = document.getElementById('overview-today-dayorder-sub');
    if (dayOrderTitle) {
        dayOrderTitle.textContent = state.selectedOverviewDay;
    }
    if (dayOrderSub) {
        const now = getCurrentDateTime();
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthsOfYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dateStr = `${daysOfWeek[now.getDay()].toUpperCase()} • ${String(now.getDate()).padStart(2, '0')} ${monthsOfYear[now.getMonth()].toUpperCase()} ${now.getFullYear()}`;
        dayOrderSub.textContent = dateStr;
    }

    // 4. Render Smart Timetable Timeline
    renderFocusTimeline(state.selectedOverviewDay);

    // Update button states
    const btnToday = document.getElementById('overview-btn-today');
    const btnTomorrow = document.getElementById('overview-btn-tomorrow');
    if (btnToday && btnTomorrow) {
        const todayDay = getTodayDayOrder();
        const tomorrowDay = getTomorrowDayOrder();
        
        btnToday.style.backgroundColor = state.selectedOverviewDay === todayDay ? 'var(--accent-primary)' : 'var(--bg-surface-solid)';
        btnToday.style.color = state.selectedOverviewDay === todayDay ? 'var(--text-inverse)' : 'var(--text-secondary)';
        btnToday.style.borderColor = state.selectedOverviewDay === todayDay ? 'var(--accent-primary)' : 'var(--border-subtle)';
        
        btnTomorrow.style.backgroundColor = state.selectedOverviewDay === tomorrowDay ? 'var(--accent-primary)' : 'var(--bg-surface-solid)';
        btnTomorrow.style.color = state.selectedOverviewDay === tomorrowDay ? 'var(--text-inverse)' : 'var(--text-secondary)';
        btnTomorrow.style.borderColor = state.selectedOverviewDay === tomorrowDay ? 'var(--accent-primary)' : 'var(--border-subtle)';
    }

    // 5. Render Performance Trends (Micro Sparklines)
    renderPerformanceTrends();
}

/**
 * Renders the Daily Focus Hero Module (Today's Focus)
 */
function renderDailyFocusHero() {
    const todayDayOrder = getTodayDayOrder();
    const now = getCurrentDateTime();
    
    // Live Clock & Academic Day Badge
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthsOfYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDayName = daysOfWeek[now.getDay()];
    const dateStr = `${String(now.getDate()).padStart(2, '0')} ${monthsOfYear[now.getMonth()].toUpperCase()} ${now.getFullYear()}`;
    const clockStr = `${String(now.getHours() % 12 || 12).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
    
    const dayBadgeEl = document.getElementById('hero-academic-day-badge');
    const weekdayLabelEl = document.getElementById('hero-academic-weekday-label');
    const dateLabelEl = document.getElementById('hero-academic-date-label');
    const liveClockEl = document.getElementById('hero-live-clock');
    
    if (dayBadgeEl) {
        dayBadgeEl.textContent = todayDayOrder;
    }
    if (weekdayLabelEl) {
        weekdayLabelEl.textContent = currentDayName.toUpperCase();
    }
    if (dateLabelEl) {
        dateLabelEl.textContent = dateStr;
    }
    if (liveClockEl) {
        liveClockEl.textContent = `${clockStr}`;
    }

    const currentMinuteVal = now.getHours() * 60 + now.getMinutes();
    const todaySchedule = (state.mergedTimetable[todayDayOrder] || []).filter(s => s && s.course);

    // Determine current active period & next period
    let activeSlot = null;
    let nextSlot = null;
    let minsUntilNext = null;

    periodTimings.slice(0, 10).forEach((pt, idx) => {
        const [sH, sM] = pt.start.split(':').map(Number);
        const [eH, eM] = pt.end.split(':').map(Number);
        const startMins = sH * 60 + sM;
        const endMins = eH * 60 + eM;

        const slotForPeriod = todaySchedule.find(s => parseInt(s.period, 10) === (idx + 1));

        if (currentMinuteVal >= startMins && currentMinuteVal <= endMins) {
            activeSlot = slotForPeriod ? { ...slotForPeriod, timing: `${pt.start} - ${pt.end}` } : { course: 'Free Window', room: 'Campus', timing: `${pt.start} - ${pt.end}` };
        } else if (currentMinuteVal < startMins && !nextSlot && slotForPeriod) {
            nextSlot = { ...slotForPeriod, timing: `${pt.start} - ${pt.end}` };
            minsUntilNext = startMins - currentMinuteVal;
        }
    });

    // Col 1: Total Internal Marks Summary
    const internalsBadge = document.getElementById('hero-internals-badge');
    const internalsTitle = document.getElementById('hero-internals-title');
    const internalsSub = document.getElementById('hero-internals-sub');

    let totalObtained = 0;
    let totalMax = 0;
    let totalAssessmentsCount = 0;
    let totalCoursesWithMarks = 0;

    (state.marks || []).forEach(item => {
        if (!item || !item.assessments) return;
        const keys = Object.keys(item.assessments);
        let courseHasMarks = false;
        keys.forEach(k => {
            const test = item.assessments[k];
            if (test && test.status !== "ABSENT") {
                const obt = parseFloat(test.obtainedMarks);
                const max = parseFloat(test.maxMarks);
                if (!isNaN(obt) && !isNaN(max) && max > 0) {
                    totalObtained += obt;
                    totalMax += max;
                    totalAssessmentsCount++;
                    courseHasMarks = true;
                }
            }
        });
        if (courseHasMarks) totalCoursesWithMarks++;
    });

    if (totalMax > 0) {
        const overallPct = ((totalObtained / totalMax) * 100).toFixed(1);
        if (internalsTitle) {
            internalsTitle.textContent = `${totalObtained.toFixed(1)} / ${totalMax}`;
        }
        if (internalsSub) {
            internalsSub.textContent = `${overallPct}% avg across ${totalCoursesWithMarks} course${totalCoursesWithMarks === 1 ? '' : 's'} (${totalAssessmentsCount} test${totalAssessmentsCount === 1 ? '' : 's'})`;
        }
        if (internalsBadge) {
            internalsBadge.textContent = `${overallPct}% AVG`;
        }
    } else {
        if (internalsTitle) internalsTitle.textContent = '-- / --';
        if (internalsSub) internalsSub.textContent = 'No internal evaluation records recorded';
        if (internalsBadge) internalsBadge.textContent = 'NO DATA';
    }

    // Col 2: Next Class (Redesigned per Image 3: Date, Time, Room, Attendance %, Margin/Required)
    const nextCountdown = document.getElementById('hero-next-countdown');
    const nextTitle = document.getElementById('hero-next-title');
    const timingTextEl = document.getElementById('hero-next-timing-text');
    const roomTextEl = document.getElementById('hero-next-room-text');
    const nextAttnMargin = document.getElementById('hero-next-attn-margin');

    const nextResult = findNextUpcomingClass();
    if (nextResult && nextResult.classObj) {
        const item = nextResult.classObj;
        const title = item.subjectTitle || item.course || 'Class';
        const code = item.courseCode || item.code || '';
        
        if (nextCountdown) nextCountdown.textContent = (nextResult.dayLabel === 'Today' ? (minsUntilNext !== null ? `IN ${minsUntilNext}M` : 'TODAY') : nextResult.dayLabel).toUpperCase();
        if (nextTitle) nextTitle.textContent = title;
        
        const timing = item.timing || (periodTimings[item.period - 1] ? `${periodTimings[item.period - 1].start} - ${periodTimings[item.period - 1].end}` : 'Scheduled');
        const room = item.room ? item.room.replace(/^Room\s+/i, '') : 'Classroom';
        if (timingTextEl) timingTextEl.textContent = timing;
        if (roomTextEl) roomTextEl.textContent = room;
        
        // Find matching course attendance object
        const attnObj = (state.attendance || []).find(a => {
            const aCode = (a.code || '').trim().toUpperCase();
            const aTitle = (a.course || '').trim().toUpperCase();
            const cCode = (code || '').trim().toUpperCase();
            const cTitle = (title || '').trim().toUpperCase();
            return (cCode && aCode && (aCode.includes(cCode) || cCode.includes(aCode))) ||
                   (cTitle && aTitle && (aTitle.includes(cTitle) || cTitle.includes(aTitle)));
        });

        if (attnObj && nextAttnMargin) {
            let pct = attnObj.attendance !== null && attnObj.attendance !== undefined ? parseFloat(attnObj.attendance) : 0;
            if (pct > 100) pct = Math.round(pct / 100);
            const conducted = parseInt(attnObj.conducted, 10) || 0;
            let present = parseInt(attnObj.present, 10) || 0;
            if (present > conducted) present = Math.round((pct / 100) * conducted);

            let marginStr = '';
            let statusColor = 'var(--accent-primary)';
            if (conducted > 0) {
                if (pct >= 75) {
                    const margin = Math.max(0, Math.floor((4 * present - 3 * conducted) / 3));
                    marginStr = `Margin: +${margin} classes`;
                    statusColor = 'var(--accent-success)';
                } else {
                    const required = Math.max(0, Math.ceil(3 * conducted - 4 * present));
                    marginStr = `Required: +${required} classes`;
                    statusColor = 'var(--accent-danger)';
                }
            }
            nextAttnMargin.innerHTML = `Current: <span style="color: ${statusColor}; font-weight: 800;">${pct.toFixed(2).replace(/\.00$/, '')}%</span> &nbsp;|&nbsp; <span style="color: ${statusColor}; font-weight: 800;">${marginStr || 'Margin: 0'}</span>`;
        } else if (nextAttnMargin) {
            nextAttnMargin.innerHTML = 'Current: --% &nbsp;|&nbsp; Required: --';
        }
    } else {
        if (nextCountdown) nextCountdown.textContent = 'NONE';
        if (nextTitle) nextTitle.textContent = 'No Upcoming Classes';
        if (timingTextEl) timingTextEl.textContent = '--:--';
        if (roomTextEl) roomTextEl.textContent = 'Campus';
        if (nextAttnMargin) nextAttnMargin.innerHTML = 'Current: --% &nbsp;|&nbsp; Margin: Clear';
    }

    // Col 3: Estimated GPA (SRM 10-Point System based on Internals & Credits)
    const gpaBadge = document.getElementById('hero-gpa-badge');
    const gpaVal = document.getElementById('hero-gpa-val');
    const gpaSub = document.getElementById('hero-gpa-sub');
    const gpaGaugeArc = document.getElementById('gpa-gauge-arc');
    const gpaGaugeText = document.getElementById('gpa-gauge-text');

    let totalWeightedPoints = 0;
    let totalCredits = 0;
    let evaluatedCourseCount = 0;

    (state.marks || []).forEach(item => {
        if (!item || !item.assessments) return;
        const keys = Object.keys(item.assessments);
        let courseObtained = 0;
        let courseMax = 0;
        let hasValidTest = false;

        keys.forEach(k => {
            const test = item.assessments[k];
            if (test && test.status !== "ABSENT") {
                const obt = parseFloat(test.obtainedMarks);
                const max = parseFloat(test.maxMarks);
                if (!isNaN(obt) && !isNaN(max) && max > 0) {
                    courseObtained += obt;
                    courseMax += max;
                    hasValidTest = true;
                }
            }
        });

        if (hasValidTest && courseMax > 0) {
            const coursePct = (courseObtained / courseMax) * 100;
            const courseCredit = getCourseCredit(item.courseTitle || item.courseCode, item.courseCode);
            
            // SRM 10-Point Scale Grade Point Conversion
            let gp = 0;
            if (coursePct >= 90) gp = 10;      // O Grade
            else if (coursePct >= 80) gp = 9;  // A+ Grade
            else if (coursePct >= 70) gp = 8;  // A Grade
            else if (coursePct >= 60) gp = 7;  // B+ Grade
            else if (coursePct >= 50) gp = 6;  // B Grade
            else if (coursePct >= 40) gp = 5;  // C Grade
            else gp = 0;                        // F Grade

            totalWeightedPoints += (gp * courseCredit);
            totalCredits += courseCredit;
            evaluatedCourseCount++;
        }
    });

    if (totalCredits > 0) {
        const estGPA = (totalWeightedPoints / totalCredits).toFixed(2);
        const estGPANum = parseFloat(estGPA);
        
        let gradeLetter = 'O';
        if (estGPANum < 5.0) gradeLetter = 'F';
        else if (estGPANum < 6.0) gradeLetter = 'B';
        else if (estGPANum < 7.0) gradeLetter = 'B+';
        else if (estGPANum < 8.0) gradeLetter = 'A';
        else if (estGPANum < 9.0) gradeLetter = 'A+';
        else gradeLetter = 'O';

        if (gpaVal) gpaVal.textContent = `${estGPA}`;
        if (gpaSub) gpaSub.textContent = `Projected ${gradeLetter} Grade (${evaluatedCourseCount} course${evaluatedCourseCount === 1 ? '' : 's'}, ${totalCredits} credits)`;
        if (gpaBadge) gpaBadge.textContent = `${gradeLetter} GRADE`;
        if (gpaGaugeText) gpaGaugeText.textContent = `${estGPA}`;

        // Animate stroke-dasharray (percentage of 10-point scale)
        const pctOfTen = Math.min(100, Math.max(0, (estGPANum / 10) * 100));
        if (gpaGaugeArc) {
            gpaGaugeArc.setAttribute('stroke-dasharray', `${pctOfTen.toFixed(1)} 100`);
        }
    } else {
        if (gpaVal) gpaVal.textContent = '--';
        if (gpaSub) gpaSub.textContent = 'Sync internal marks to calculate GPA';
        if (gpaBadge) gpaBadge.textContent = 'ESTIMATED';
        if (gpaGaugeText) gpaGaugeText.textContent = '--';
        if (gpaGaugeArc) gpaGaugeArc.setAttribute('stroke-dasharray', '0 100');
    }
}

function getTodayDayOrder() {
    if (window.DEBUG_MODE) {
        const todayStr = getLocalIsoDate();
        const plannerEvent = state.planner.find(p => p.date === todayStr);
        let simDay = null;
        if (window.simulatedDayOrder !== 'AUTO') {
            simDay = window.simulatedDayOrder;
        } else if (plannerEvent && plannerEvent.dayOrder) {
            simDay = `DAY ${plannerEvent.dayOrder}`;
        }
        return simDay ? simDay : "FREE DAY";
    }
    const todayStr = getLocalIsoDate();
    const plannerEvent = state.planner.find(p => p.date === todayStr);
    return plannerEvent && plannerEvent.dayOrder ? `DAY ${plannerEvent.dayOrder}` : "FREE DAY";
}

function getTomorrowDayOrder() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    const plannerMatch = state.planner.find(p => p.date === tomorrowStr);
    return plannerMatch && plannerMatch.dayOrder ? `DAY ${plannerMatch.dayOrder}` : "FREE DAY";
}

/**
 * Renders Smart Timetable timeline with intelligent visual states (past, current, next, future, lunch break)
 */
/**
 * Renders Smart Timetable Timeline for Overview Page
 * Desktop (>= 992px): Horizontal 10-Column Grid Matrix
 * Mobile/Tablet (< 992px): Vertical Timeline Cards Stack
 */
function renderFocusTimeline(dayOrder) {
    const listContainer = document.getElementById('overview-timeline-focused');
    if (!listContainer) return;

    if (!dayOrder || dayOrder === 'FREE DAY' || !state.mergedTimetable[dayOrder] || state.mergedTimetable[dayOrder].length === 0) {
        listContainer.innerHTML = `
            <div class="vertical-empty-timetable-card">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <circle cx="9" cy="9" r="1" fill="var(--accent-primary)" stroke="none"></circle>
                    <circle cx="15" cy="9" r="1" fill="var(--accent-primary)" stroke="none"></circle>
                </svg>
                <h4>Holiday / Free Day</h4>
                <p>No scheduled classes on this day order. Enjoy your day!</p>
            </div>
        `;
        return;
    }

    const now = getCurrentDateTime();
    const currentMinuteVal = now.getHours() * 60 + now.getMinutes();
    const isTodaySelected = (dayOrder === getTodayDayOrder());

    const activeTimeline = state.mergedTimetable[dayOrder] || [];
    const isMobileTablet = window.innerWidth < 992;

    if (isMobileTablet) {
        // --- MOBILE / TABLET (< 992px): VERTICAL TIMELINE CARDS STACK ---
        const validClassSlots = activeTimeline.filter(s => (s.subjectTitle || s.course) && (s.subjectTitle || s.course).trim() !== '');
        const maxClassPeriod = validClassSlots.length > 0 ? Math.max(...validClassSlots.map(s => parseInt(s.period, 10) || 1)) : 0;

        let cardsHtml = '';
        let isNextFound = false;
        for (let p = 1; p <= maxClassPeriod; p++) {
            const slot = activeTimeline.find(s => parseInt(s.period, 10) === p);
            const pt = periodTimings[p - 1] || { start: '08:00', end: '08:50' };
            const timingStr = slot ? (slot.timing || `${pt.start} - ${pt.end}`) : `${pt.start} - ${pt.end}`;

            if (slot && (slot.subjectTitle || slot.course) && (slot.subjectTitle || slot.course).trim() !== '') {
                const periodNum = parseInt(slot.period, 10) || p;
                let stateClass = '';
                let isNext = false;
                if (isTodaySelected) {
                    const [sH, sM] = pt.start.split(':').map(Number);
                    const [eH, eM] = pt.end.split(':').map(Number);
                    const startMins = sH * 60 + sM;
                    const endMins = eH * 60 + eM;

                    if (currentMinuteVal >= startMins && currentMinuteVal <= endMins) {
                        stateClass = 'slot-current';
                    } else if (currentMinuteVal > endMins) {
                        stateClass = 'slot-past';
                    } else {
                        stateClass = 'slot-future';
                    }
                    if (!isNextFound && currentMinuteVal < endMins) {
                        isNext = true;
                        isNextFound = true;
                    }
                }

                const isLab = isSlotLab(slot);
                const typeClass = isLab ? 'lab' : 'theory';
                const tlLetter = isLab ? 'L' : 'T';
                const title = slot.subjectTitle || slot.course || 'Scheduled Class';
                const code = slot.courseCode || slot.slot || `P${periodNum}`;

                let nodeState = 'upcoming';
                let segmentClass = 'dashed';
                if (stateClass === 'slot-current') {
                    nodeState = 'current active';
                    segmentClass = 'solid';
                } else if (stateClass === 'slot-past') {
                    nodeState = 'completed';
                    segmentClass = 'solid';
                }

                let nodeHtml = '';
                if (nodeState.includes('completed')) {
                    nodeHtml = `<div class="timeline-checkpoint-node completed"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>`;
                } else if (nodeState.includes('current')) {
                    nodeHtml = `<div class="timeline-checkpoint-node current"><div class="current-inner-dot"></div></div>`;
                } else {
                    nodeHtml = `<div class="timeline-checkpoint-node upcoming ${typeClass}"></div>`;
                }

                const isFirst = (p === 1);
                const lineSegmentHtml = isFirst ? '' : `<div class="timeline-line-segment ${segmentClass}"></div>`;

                cardsHtml += `
                    <div class="vertical-timeline-card ${typeClass} ${stateClass}" style="position: relative;">
                        ${lineSegmentHtml}
                        ${nodeHtml}
                        ${isNext ? '<span class="badge-next-slot">NEXT</span>' : ''}
                        <div class="vertical-timeline-badge-col">
                            <span class="period-pill">P${periodNum}</span>
                            <span class="time-range-label">${timingStr}</span>
                        </div>
                        <div class="vertical-timeline-info-col">
                            <div class="vertical-timeline-header-row">
                                <span class="course-code-tag">${code}</span>
                            </div>
                            <h4 class="vertical-timeline-title">${title}</h4>
                            <div class="vertical-timeline-footer-row">
                                <span class="room-tag">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    ${slot.room || 'Room TBA'}
                                </span>
                                ${slot.faculty ? `<span>• ${slot.faculty}</span>` : ''}
                            </div>
                        </div>
                        <span class="card-tl-indicator">${tlLetter}</span>
                    </div>
                `;
            } else {
                // SLEEK NARROW FREE PERIOD CARD ON MOBILE
                const [sH, sM] = pt.start.split(':').map(Number);
                const [eH, eM] = pt.end.split(':').map(Number);
                const startMins = sH * 60 + sM;
                const endMins = eH * 60 + eM;

                let isPastFree = false;
                let isCurrentFree = false;

                if (isTodaySelected) {
                    if (currentMinuteVal > endMins) isPastFree = true;
                    else if (currentMinuteVal >= startMins && currentMinuteVal <= endMins) isCurrentFree = true;
                }

                const isFirst = (p === 1);
                const freeSegmentClass = (isPastFree || isCurrentFree) ? 'solid' : 'dashed';
                const lineSegmentHtml = isFirst ? '' : `<div class="timeline-line-segment ${freeSegmentClass}"></div>`;

                let freeDotHtml = `<div class="timeline-checkpoint-node free"></div>`;
                if (isPastFree) {
                    freeDotHtml = `<div class="timeline-checkpoint-node free completed"></div>`;
                } else if (isCurrentFree) {
                    freeDotHtml = `<div class="timeline-checkpoint-node free current"><div class="current-inner-dot"></div></div>`;
                }

                cardsHtml += `
                    <div class="vertical-timeline-card free-period-card">
                        ${lineSegmentHtml}
                        ${freeDotHtml}
                        <div class="free-period-badge-col">
                            <span class="period-pill free-period-pill">P${p}</span>
                            <span class="time-range-label free-period-time">${timingStr}</span>
                        </div>
                        <div class="free-period-content">
                            <span class="free-period-label">FREE PERIOD</span>
                        </div>
                    </div>
                `;
            }
        }

        listContainer.innerHTML = `
            <div class="vertical-timeline-list flex-col gap-8">
                ${cardsHtml}
            </div>
        `;
        setTimeout(() => {
            adjustTimelineLineBounds(listContainer);
        }, 0);
    } else {
        // --- DESKTOP (>= 992px): HORIZONTAL 10-COLUMN GRID MATRIX ---
        const timelineSlots = Array(10).fill(null);
        activeTimeline.forEach(slot => {
            if (slot.period && slot.period >= 1 && slot.period <= 10) {
                timelineSlots[slot.period - 1] = slot;
            }
        });

        let currentPeriodIdx = -1;
        let nextPeriodIdx = -1;

        if (isTodaySelected) {
            periodTimings.forEach((pt, idx) => {
                const [sH, sM] = pt.start.split(':').map(Number);
                const [eH, eM] = pt.end.split(':').map(Number);
                const startMins = sH * 60 + sM;
                const endMins = eH * 60 + eM;

                if (currentMinuteVal >= startMins && currentMinuteVal <= endMins) {
                    currentPeriodIdx = idx;
                } else if (currentMinuteVal < startMins && nextPeriodIdx === -1) {
                    nextPeriodIdx = idx;
                }
            });
        }

        let headerRowHtml = '';
        periodTimings.slice(0, 10).forEach((pt, idx) => {
            headerRowHtml += `
                <div class="grid-header-cell">
                    <span>P${idx + 1}</span>
                    <span class="time-lbl">${pt.start} - ${pt.end}</span>
                </div>
            `;
        });

        let cardsRowHtml = '';
        const processedIndices = new Set();

        // Find the last period index that has an actual filled class
        let lastFilledIdx = -1;
        timelineSlots.forEach((s, i) => { if (s) lastFilledIdx = i; });

        timelineSlots.forEach((slot, idx) => {
            if (processedIndices.has(idx)) return;

            let stateClass = '';
            if (isTodaySelected) {
                // Only apply CURRENT/NEXT/PAST highlights up to (and including) the last filled slot
                if (currentPeriodIdx !== -1 && idx <= lastFilledIdx) {
                    if (idx < currentPeriodIdx) stateClass = 'slot-past';
                    else if (idx === currentPeriodIdx) stateClass = 'slot-current';
                    else if (idx === currentPeriodIdx + 1) stateClass = 'slot-next';
                    else stateClass = 'slot-future';
                } else if (nextPeriodIdx !== -1 && idx <= lastFilledIdx) {
                    if (idx < nextPeriodIdx) stateClass = 'slot-past';
                    else if (idx === nextPeriodIdx) stateClass = 'slot-next';
                    else stateClass = 'slot-future';
                }
            }

            if (slot) {
                let colspan = 1;
                for (let checkIdx = idx + 1; checkIdx < timelineSlots.length; checkIdx++) {
                    const nextSlot = timelineSlots[checkIdx];
                    if (nextSlot) {
                        const sameCourse = (nextSlot.course || '').trim().toUpperCase() === (slot.course || '').trim().toUpperCase();
                        const sameRoom = (nextSlot.room || '').trim().toUpperCase() === (slot.room || '').trim().toUpperCase();
                        const sameLab = isSlotLab(nextSlot) === isSlotLab(slot);

                        if (sameCourse && sameRoom && sameLab) {
                            colspan++;
                            processedIndices.add(checkIdx);
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                }

                const isLab = isSlotLab(slot);
                const typeClass = isLab ? 'lab' : 'theory';
                const tlLetter = isLab ? 'L' : 'T';
                const colSpanStyle = colspan > 1 ? `grid-column: span ${colspan};` : '';

                cardsRowHtml += `
                    <div class="grid-class-cell filled ${typeClass} ${stateClass}" style="${colSpanStyle}">
                        <span class="grid-class-code">${slot.slot || 'N/A'}</span>
                        <h5 class="grid-class-title" title="${slot.course}">${slot.course}</h5>
                        <div class="grid-class-footer">
                            <span class="grid-class-room">${slot.room || 'N/A'}</span>
                        </div>
                        <span class="card-tl-indicator">${tlLetter}</span>
                    </div>
                `;
            } else {
                cardsRowHtml += `
                    <div class="grid-class-cell free ${stateClass}"></div>
                `;
            }
        });

        listContainer.innerHTML = `
            <div class="overview-timeline-grid-container" style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
                <div class="overview-timeline-header-row" style="display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px;">
                    ${headerRowHtml}
                </div>
                <div class="overview-timeline-cards-row" style="display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px;">
                    ${cardsRowHtml}
                </div>
            </div>
        `;
    }
}

/**
 * Renders Performance Trends: Attendance Trend & Internal Marks Trend
 */
let sparklineCharts = {};

function renderPerformanceTrends() {
    if (typeof Chart === 'undefined') return;

    const computedStyle = getComputedStyle(document.body);
    const rawAccent = computedStyle.getPropertyValue('--accent-primary').trim() || '#6366f1';
    const activeTheme = document.documentElement.getAttribute('data-theme') || 'pitch-black';
    const isLight = isThemeLight(activeTheme);
    const sparklineColor = isLight ? (activeTheme === 'neo-brutalist' ? '#15803d' : rawAccent) : rawAccent;

    const validCourses = (state.attendance || []).filter(c => (parseInt(c.conducted, 10) || 0) > 0);
    
    // Trend 1: Attendance Distribution Across Courses
    const overallPctVal = document.getElementById('trend-val-overall-pct');
    const overallSubVal = document.getElementById('trend-sub-overall');
    const attnPercentages = validCourses.map(c => {
        let p = c.attendance !== null && c.attendance !== undefined ? parseFloat(c.attendance) : 0;
        return p > 100 ? Math.round(p / 100) : p;
    });

    const avgPct = attnPercentages.length > 0 ? Math.round(attnPercentages.reduce((a, b) => a + b, 0) / attnPercentages.length) : 0;
    if (overallPctVal) overallPctVal.textContent = `${avgPct}%`;
    if (overallSubVal) overallSubVal.textContent = `${validCourses.length} Active Courses`;

    createMicroSparkline('sparkline-overall-attn', {
        labels: validCourses.map(c => c.code || 'Course'),
        data: attnPercentages.length > 0 ? attnPercentages : [75, 80, 85, 90],
        borderColor: sparklineColor,
        unit: '%'
    });

    // Trend 2: Internal Marks Trend (or Graceful Empty Message if missing)
    const marksVal = document.getElementById('trend-val-internal-marks');
    const marksSub = document.getElementById('trend-sub-marks');
    const canvasWrapper = document.getElementById('sparkline-marks-wrapper');
    const emptyMsgEl = document.getElementById('marks-empty-state-msg');

    const marksData = (state.marks || []).filter(m => m && (m.score !== undefined || m.marks !== undefined || m.totalMarks !== undefined));

    if (marksData.length > 0) {
        if (canvasWrapper) canvasWrapper.style.display = 'block';
        if (emptyMsgEl) emptyMsgEl.classList.add('hidden');

        const markScores = marksData.map(m => parseFloat(m.score || m.marks || m.totalMarks || 0));
        const avgScore = Math.round(markScores.reduce((a, b) => a + b, 0) / markScores.length * 10) / 10;
        if (marksVal) marksVal.textContent = `${avgScore} Avg`;
        if (marksSub) marksSub.textContent = `${marksData.length} Evaluated Courses`;

        createMicroSparkline('sparkline-internal-marks', {
            labels: marksData.map(m => m.subject || m.code || 'Sub'),
            data: markScores,
            borderColor: isLight ? '#059669' : '#10b981',
            unit: ' Marks'
        });
    } else {
        if (canvasWrapper) canvasWrapper.style.display = 'none';
        if (emptyMsgEl) emptyMsgEl.classList.remove('hidden');
        if (marksVal) marksVal.textContent = 'Pending';
        if (marksSub) marksSub.textContent = 'Academic Assessment';
    }
}

function createMicroSparkline(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (sparklineCharts[canvasId]) {
        sparklineCharts[canvasId].destroy();
    }

    const ctx = canvas.getContext('2d');
    const chartHeight = canvas.offsetHeight || 120;
    
    // Create soft ambient gradient fill matching active theme accent color
    const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
    let borderColor = config.borderColor || '#6366f1';
    
    if (borderColor.startsWith('#')) {
        const hex = borderColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) || 99;
        const g = parseInt(hex.substring(2, 4), 16) || 102;
        const b = parseInt(hex.substring(4, 6), 16) || 241;
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.28)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.0)`);
    } else {
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.28)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
    }

    sparklineCharts[canvasId] = new Chart(ctx, {
        type: config.type || 'line',
        data: {
            labels: config.labels,
            datasets: [{
                data: config.data,
                borderColor: borderColor,
                borderWidth: 2.8,
                backgroundColor: gradient,
                pointRadius: 3.5,
                pointBackgroundColor: borderColor,
                pointBorderColor: 'transparent',
                pointHoverRadius: 6,
                pointHoverBackgroundColor: borderColor,
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2,
                cubicInterpolationMode: 'monotone', // PREVENTS DIP BETWEEN 100% POINTS
                tension: 0.4,
                fill: true,
                clip: false // PREVENTS 100% LINE & DOTS FROM BEING CUT OFF
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 16,
                    bottom: 6,
                    left: 6,
                    right: 8
                }
            },
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    titleFont: { size: 11, weight: '800' },
                    bodyFont: { size: 12, weight: '800' },
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.data[context.dataIndex]}${config.unit || '%'}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: false // REMOVE COURSE CODES FROM X-AXIS
                },
                y: {
                    display: true,
                    grid: {
                        color: 'rgba(128, 128, 128, 0.15)',
                        drawBorder: false,
                        borderDash: [3, 3]
                    },
                    ticks: {
                        font: { size: 10, weight: '700' },
                        color: 'var(--text-muted)',
                        stepSize: 50,
                        callback: function(value) {
                            return value;
                        }
                    },
                    min: 0,
                    max: 100,
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            }
        }
    });
}

/**
 * Renders Attendance list rows, top summary counters, and prediction results
 */
function renderAttendancePane(customDataset) {
    const listContainer = document.getElementById('attendance-card-list');
    if (!listContainer) return;

    const fabContainer = document.getElementById('attendance-fab-container');
    if (fabContainer && state.activeTab === 'attendance') {
        fabContainer.classList.remove('hidden');
    }

    const dataset = customDataset || (state.predictionActive && state.predictedAttendance.length > 0 ? state.predictedAttendance : state.attendance);

    if (!dataset || dataset.length === 0) {
        listContainer.innerHTML = `<div class="text-center py-24 text-muted">No attendance metrics detected.</div>`;
        return;
    }

    // 1. Update Top Total Summary Counter Metrics
    let totalConducted = 0;
    let totalAttended = 0;
    dataset.forEach(item => {
        const conducted = parseInt(item.conducted, 10) || 0;
        let present = parseInt(item.present, 10) || 0;
        let val = item.attendance !== null && item.attendance !== undefined ? parseFloat(item.attendance) : 0;
        if (val > 100) val = val / 100;
        if (present > conducted) {
            present = Math.round((val / 100) * conducted);
        }
        if (conducted > 0) {
            totalConducted += conducted;
            totalAttended += present;
        }
    });

    const totalAbsent = Math.max(0, totalConducted - totalAttended);
    const totalPct = totalConducted > 0 ? Math.round((totalAttended / totalConducted) * 100) : 0;

    const sumConductedEl = document.getElementById('total-summary-conducted');
    const sumAttendedEl = document.getElementById('total-summary-attended');
    const sumAbsentEl = document.getElementById('total-summary-absent');
    const sumPctEl = document.getElementById('total-summary-pct');

    if (sumConductedEl) sumConductedEl.textContent = `${totalConducted}`;
    if (sumAttendedEl) sumAttendedEl.textContent = `${totalAttended}`;
    if (sumAbsentEl) sumAbsentEl.textContent = `${totalAbsent}`;
    if (sumPctEl) sumPctEl.textContent = `${totalPct}%`;

    // Update Prediction Indicator Banner
    const predBanner = document.getElementById('attendance-prediction-banner');
    const predText = document.getElementById('prediction-summary-text');
    if (predBanner && predText) {
        if (state.predictionActive) {
            predBanner.classList.remove('hidden');
            const actionText = state.predictionAction === 'ATTEND' ? 'Attend' : 'Bunk';
            const rangeText = state.predictionStartDate === state.predictionEndDate || !state.predictionEndDate ? state.predictionStartDate : `${state.predictionStartDate} to ${state.predictionEndDate}`;
            predText.textContent = `• Simulating: ${actionText} all scheduled classes (${rangeText})`;
        } else {
            predBanner.classList.add('hidden');
        }
    }

    // 2. Segregate Theory vs Practical Courses
    const theoryCourses = [];
    const practicalCourses = [];

    dataset.forEach(item => {
        const cat = (item.category || '').toUpperCase().trim();
        const code = (item.code || '').toUpperCase().trim();
        const isLabOrPractical = cat.includes('PRACTICAL') || cat.includes('LAB') || cat.includes('PROJECT') || (cat === '' && code.endsWith('P'));

        if (isLabOrPractical) {
            practicalCourses.push(item);
        } else {
            theoryCourses.push(item);
        }
    });

    const createRowHtml = (item) => {
        let percent = item.attendance !== null && item.attendance !== undefined ? item.attendance : 0;
        if (percent > 100) percent = Math.round((percent / 100) * 100) / 100;

        let conducted = item.conducted !== null && item.conducted !== undefined ? item.conducted : null;
        let present = item.present !== null && item.present !== undefined ? item.present : null;

        if (conducted !== null && present !== null && present > conducted) {
            present = Math.round((percent / 100) * conducted);
        }

        let statusColor = 'var(--accent-success)';
        if (percent < 75) {
            statusColor = 'var(--accent-danger)';
        } else if (percent < 80) {
            statusColor = 'var(--accent-warning)';
        }

        const catUpper = (item.category || '').toUpperCase().trim();
        let typePillText = 'Theory';
        let typePillClass = 'theory';

        if (catUpper.includes('PRACTICAL') || catUpper.includes('LAB')) {
            typePillText = 'Practical';
            typePillClass = 'practical';
        } else if (catUpper.includes('INTEGRATED')) {
            typePillText = 'Integrated';
            typePillClass = 'practical';
        }

        let marginRequiredLabel = 'Margin';
        let marginRequiredVal = '0';
        let calloutClass = 'safe';

        if (conducted !== null && present !== null && conducted > 0) {
            if (percent >= 75) {
                const margin = Math.max(0, Math.floor((4 * present - 3 * conducted) / 3));
                marginRequiredLabel = 'Margin';
                marginRequiredVal = `${margin}`;
                calloutClass = 'safe';
            } else {
                const required = Math.max(0, Math.ceil(3 * conducted - 4 * present));
                marginRequiredLabel = 'Required';
                marginRequiredVal = `${required}`;
                calloutClass = 'danger';
            }
        } else {
            marginRequiredLabel = 'Margin';
            marginRequiredVal = '--';
            calloutClass = 'neutral';
        }

        let displayPercent = `${percent}%`;
        if (conducted === 0 || conducted === null) {
            displayPercent = '--';
            statusColor = 'var(--text-muted)';
        }

        // Remove "Room" text before actual room name
        const cleanRoom = item.room ? item.room.replace(/^Room\s+/i, '').trim() : '';
        const attendedText = `Attended: ${present !== null ? present : '--'} / ${conducted !== null ? conducted : '--'} hrs`;

        return `
            <div class="attendance-grid-row">
                <div class="attn-card-top-flex">
                    <div class="attn-card-left-info">
                        <h4 class="attn-course-title">${item.course || item.code || 'Course'}</h4>
                        <div class="attendance-subline">
                            <span class="attendance-code-tag">${item.code}</span>
                            <span>•</span>
                            <span class="type-pill ${typePillClass}">${typePillText}</span>
                            ${cleanRoom ? `<span>•</span><span class="attendance-room-tag">${cleanRoom}</span>` : ''}
                        </div>
                        ${item.faculty ? `<div class="attendance-faculty attn-desktop-faculty">${item.faculty}</div>` : ''}
                    </div>

                    <div class="attn-card-right-highlights">
                        <div class="attn-highlights-row">
                            <div class="attn-highlight-box ${calloutClass}">
                                <span class="attn-highlight-label">${marginRequiredLabel}</span>
                                <span class="attn-highlight-number ${calloutClass}">${marginRequiredVal}</span>
                            </div>
                            <div class="attn-highlight-box pct-box">
                                <span class="attn-highlight-label">ATTENDANCE</span>
                                <span class="attn-highlight-number pct-val" style="color: ${statusColor}">${displayPercent}</span>
                            </div>
                        </div>
                        <div class="attn-desktop-attended-text">${attendedText}</div>
                    </div>
                </div>

                <div class="attn-mobile-faculty-row">
                    <span class="attendance-faculty attn-mobile-faculty">${item.faculty || ''}</span>
                    <span class="attn-mobile-attended-text">${attendedText}</span>
                </div>

                <div class="attendance-progress-track-wrapper">
                    <div class="attendance-progress-fill" style="width: ${Math.min(100, Math.max(0, percent))}%; background-color: ${statusColor};"></div>
                </div>
            </div>
        `;
    };

    let fullHtml = '<div class="attendance-sections-container">';

    if (theoryCourses.length > 0) {
        fullHtml += `
            <div class="attendance-section">
                <div class="attendance-section-header">
                    <h3>Theory Attendance</h3>
                    <span class="attendance-section-count">${theoryCourses.length} ${theoryCourses.length === 1 ? 'Course' : 'Courses'}</span>
                </div>
                <div class="attendance-grid-list">
                    ${theoryCourses.map(createRowHtml).join('')}
                </div>
            </div>
        `;
    }

    if (practicalCourses.length > 0) {
        fullHtml += `
            <div class="attendance-section" style="${theoryCourses.length > 0 ? 'margin-top: 32px;' : ''}">
                <div class="attendance-section-header">
                    <h3>Lab & Practical Attendance</h3>
                    <span class="attendance-section-count">${practicalCourses.length} ${practicalCourses.length === 1 ? 'Course' : 'Courses'}</span>
                </div>
                <div class="attendance-grid-list">
                    ${practicalCourses.map(createRowHtml).join('')}
                </div>
            </div>
        `;
    }

    fullHtml += '</div>';
    listContainer.innerHTML = fullHtml;
}

/**
 * Opens Attendance Predictor Pop-up Modal
 */
function openAttendancePredictionModal() {
    const modal = document.getElementById('attendance-prediction-modal');
    const singleDateInput = document.getElementById('modal-pred-single-date');
    if (!modal) return;

    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    if (singleDateInput) {
        singleDateInput.value = dateStr;
        renderSingleDayClassesSelector(dateStr);
    }

    const startDateInput = document.getElementById('modal-pred-start-date');
    const endDateInput = document.getElementById('modal-pred-end-date');
    if (startDateInput) startDateInput.value = dateStr;
    if (endDateInput) endDateInput.value = dateStr;

    // Show modal with animation & global darkened backdrop
    document.body.classList.add('modal-open');
    modal.classList.remove('hidden');
    updateGlobalBackdrop();
}

function closeAttendancePredictionModal() {
    const modal = document.getElementById('attendance-prediction-modal');
    if (!modal) return;

    document.body.classList.remove('modal-open');
    animateCloseElement(modal);
}

/**
 * Renders individual classes with action dropdowns for a single date
 */
function renderSingleDayClassesSelector(dateStr) {
    const container = document.getElementById('single-day-classes-container');
    if (!container) return;

    if (!dateStr) {
        container.innerHTML = `<div class="text-center py-16 text-muted">Please select a valid date.</div>`;
        return;
    }

    const dateObj = new Date(dateStr + 'T00:00:00');
    const plannerEvent = state.planner.find(p => p.date === dateStr);

    let dayOrderKey = '';
    if (plannerEvent && plannerEvent.dayOrder && plannerEvent.dayOrder !== '-' && plannerEvent.dayOrder !== 'HOLIDAY') {
        dayOrderKey = `DAY ${plannerEvent.dayOrder}`;
    } else {
        const dayOfWeek = dateObj.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            const keys = ["DAY 1", "DAY 2", "DAY 3", "DAY 4", "DAY 5"];
            dayOrderKey = keys[dayOfWeek - 1];
        }
    }

    const scheduledClasses = dayOrderKey ? (state.mergedTimetable[dayOrderKey] || []) : [];
    const validClasses = scheduledClasses.filter(c => c && (c.subjectTitle || c.course) && (c.subjectTitle || c.course).trim() !== '');

    if (validClasses.length === 0) {
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; background: var(--bg-surface-elevated); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
                <span style="font-size: 13px; font-weight: 700; color: var(--text-muted); display: block;">No scheduled classes on this date</span>
                <span style="font-size: 11px; color: var(--text-secondary);">${plannerEvent ? plannerEvent.event || 'Free Day' : 'Free Day / Holiday'}</span>
            </div>
        `;
        return;
    }

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--accent-primary); letter-spacing: 0.05em;">Scheduled Classes (${dayOrderKey})</span>
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">${validClasses.length} Classes</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
    `;

    validClasses.forEach((slot) => {
        const isLab = isSlotLab(slot.slot);
        const typeTag = isLab ? 'Practical' : 'Theory';
        const typeClass = isLab ? 'practical' : 'theory';
        const courseTitle = slot.subjectTitle || slot.course || 'Course';
        const timing = slot.timing || (periodTimings[slot.period - 1] ? `${periodTimings[slot.period - 1].start} - ${periodTimings[slot.period - 1].end}` : `Slot ${slot.period}`);

        html += `
            <div class="single-class-pred-row" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface-elevated); padding: 14px 16px; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); gap: 12px;">
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                        <h4 style="font-size: 13px; font-weight: 800; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${courseTitle}</h4>
                        <span class="type-pill ${typeClass}" style="font-size: 9px; padding: 1px 6px;">${slot.slot || typeTag}</span>
                    </div>
                    <span style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">${timing} ${slot.room ? `• Room ${slot.room}` : ''}</span>
                </div>
                <select class="single-class-action-select" data-course="${courseTitle}" data-code="${slot.courseCode || ''}" style="padding: 8px 12px; font-size: 12px; font-weight: 800; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); background: var(--bg-surface-solid); color: var(--text-primary); cursor: pointer;">
                    <option value="BUNK" selected>Bunk (Skip)</option>
                    <option value="ATTEND">Attend</option>
                </select>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

/**
 * Runs Prediction Logic (Single Day Specific Classes or Date Range)
 */
function applyAttendancePrediction() {
    const singleTabActive = document.getElementById('tab-pred-single-day').classList.contains('active');
    const predicted = JSON.parse(JSON.stringify(state.attendance));

    if (singleTabActive) {
        const dateInput = document.getElementById('modal-pred-single-date');
        const dateStr = dateInput ? dateInput.value : '';

        if (!dateStr) {
            alert('Please select a valid date.');
            return;
        }

        const selectEls = document.querySelectorAll('.single-class-action-select');
        if (selectEls.length === 0) {
            alert('No classes scheduled for the selected date to predict.');
            return;
        }

        selectEls.forEach(sel => {
            const courseTitle = sel.dataset.course;
            const action = sel.value; // 'ATTEND' or 'BUNK'

            const matchCourse = predicted.find(c => {
                const cTitle = (c.course || '').toUpperCase().trim();
                const cCode = (c.code || '').toUpperCase().trim();
                const title = courseTitle.toUpperCase().trim();
                return (cTitle && (title.includes(cTitle) || cTitle.includes(title))) ||
                       (cCode && (title.includes(cCode) || cCode.includes(title)));
            });

            if (matchCourse) {
                matchCourse.conducted = (parseInt(matchCourse.conducted, 10) || 0) + 1;
                if (action === 'ATTEND') {
                    matchCourse.present = (parseInt(matchCourse.present, 10) || 0) + 1;
                }
                matchCourse.attendance = matchCourse.conducted > 0 ? Math.round((matchCourse.present / matchCourse.conducted) * 100) : 0;
            }
        });

        state.predictionActive = true;
        state.predictionStartDate = dateStr;
        state.predictionEndDate = dateStr;
        state.predictionAction = 'CUSTOM';
        state.predictedAttendance = predicted;

    } else {
        const startInput = document.getElementById('modal-pred-start-date');
        const endInput = document.getElementById('modal-pred-end-date');
        const actionSelect = document.getElementById('modal-pred-range-action');

        if (!startInput || !startInput.value) {
            alert('Please select a Start Date.');
            return;
        }

        const startDateStr = startInput.value;
        const endDateStr = endInput && endInput.value ? endInput.value : startDateStr;
        const action = actionSelect ? actionSelect.value : 'ATTEND';

        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        if (endDate < startDate) {
            alert('End Date cannot be earlier than Start Date.');
            return;
        }

        const current = new Date(startDate);
        while (current <= endDate) {
            const dStr = current.toISOString().split('T')[0];
            const plannerEvent = state.planner.find(p => p.date === dStr);

            if (plannerEvent && plannerEvent.dayOrder && plannerEvent.dayOrder !== '-' && plannerEvent.dayOrder !== 'HOLIDAY') {
                const dayOrder = `DAY ${plannerEvent.dayOrder}`;
                const daySlots = state.mergedTimetable[dayOrder] || [];

                daySlots.forEach(slot => {
                    const title = (slot.course || slot.subjectTitle || '').toUpperCase().trim();
                    if (!title) return;

                    const matchCourse = predicted.find(c => {
                        const cTitle = (c.course || '').toUpperCase().trim();
                        const cCode = (c.code || '').toUpperCase().trim();
                        return (cTitle && (title.includes(cTitle) || cTitle.includes(title))) ||
                               (cCode && (title.includes(cCode) || cCode.includes(title)));
                    });

                    if (matchCourse) {
                        matchCourse.conducted = (parseInt(matchCourse.conducted, 10) || 0) + 1;
                        if (action === 'ATTEND') {
                            matchCourse.present = (parseInt(matchCourse.present, 10) || 0) + 1;
                        }
                        matchCourse.attendance = matchCourse.conducted > 0 ? Math.round((matchCourse.present / matchCourse.conducted) * 100) : 0;
                    }
                });
            }
            current.setDate(current.getDate() + 1);
        }

        state.predictionActive = true;
        state.predictionStartDate = startDateStr;
        state.predictionEndDate = endDateStr;
        state.predictionAction = action;
        state.predictedAttendance = predicted;
    }

    closeAttendancePredictionModal();
    renderAttendancePane();
}

function clearAttendancePrediction() {
    state.predictionActive = false;
    state.predictionStartDate = null;
    state.predictionEndDate = null;
    state.predictionAction = 'ATTEND';
    state.predictedAttendance = [];

    renderAttendancePane();
}

/**
 * Runs structural bunk calculator calculations
 */
function calculateBunkSimulations() {
    const resultBox = document.getElementById('calc-simulation-result');
    if (!resultBox) return;

    if (!state.selectedBunkCourse) {
        resultBox.className = "calc-simulation-result";
        resultBox.innerHTML = `Choose a subject context from above to calculate threshold buffers.`;
        return;
    }

    const course = state.attendance.find(a => a.code === state.selectedBunkCourse);
    if (!course) return;

    const present = course.present || 0;
    const conducted = course.conducted || 0;
    let percentage = course.attendance || 0;
    if (percentage > 100) percentage = Math.round((percentage / 100) * 100) / 100;

    document.getElementById('calc-val-present').textContent = present;
    document.getElementById('calc-val-conducted').textContent = conducted;

    const pctEl = document.getElementById('calc-val-percentage');
    pctEl.textContent = `${percentage}%`;
    if (percentage < 75) {
        pctEl.style.color = 'var(--accent-danger)';
    } else if (percentage < 80) {
        pctEl.style.color = 'var(--accent-warning)';
    } else {
        pctEl.style.color = 'var(--accent-success)';
    }

    if (conducted === 0) {
        resultBox.className = "calc-simulation-result";
        resultBox.innerHTML = `No classes have been registered as conducted yet. Cannot calculate simulator metrics safely.`;
        return;
    }

    const target = 0.75;

    if (percentage >= 75) {
        let skipSimulator = 0;
        let projectedPct = percentage;

        while (projectedPct >= 75) {
            skipSimulator++;
            projectedPct = Math.floor((present / (conducted + skipSimulator)) * 100);
        }

        const finalBunkAllowance = Math.max(0, skipSimulator - 1);

        resultBox.className = "calc-simulation-result safe";
        resultBox.innerHTML = `
            <span>Margin: <strong>+${finalBunkAllowance}</strong> class${finalBunkAllowance === 1 ? '' : 'es'} available to skip.</span>
        `;
    } else {
        let requiredAttendanceCount = 0;
        let simulatedPresent = present;
        let simulatedConducted = conducted;
        let projectedPct = percentage;

        while (projectedPct < 75) {
            requiredAttendanceCount++;
            simulatedPresent++;
            simulatedConducted++;
            projectedPct = Math.round((simulatedPresent / simulatedConducted) * 100);
        }

        resultBox.className = "calc-simulation-result danger";
        resultBox.innerHTML = `
            <span>Required: <strong>+${requiredAttendanceCount}</strong> consecutive class${requiredAttendanceCount === 1 ? '' : 'es'} to reach 75%.</span>
        `;
    }
}

/**
 * Determines whether a timetable slot represents a Lab/Practical session or a Theory session.
 * EXPLICIT DIRECTIVE: Only P slots are practical/lab.
 */
function isSlotLab(slot) {
    if (!slot) return false;
    const slotCode = (slot.slot || '').trim().toUpperCase();

    // Strictly ONLY P slots (e.g. P1, P2, P31, P32, P1-P2, P31-P32, P15-P16) are practical/lab
    return /^P\d/i.test(slotCode) || slotCode.startsWith('P');
}

/**
 * User-isolated localStorage helper for custom classes
 */
function getUserCustomStorageKey() {
    const reg = (state.studentInfo.registrationNumber || state.studentInfo.netId || state.studentInfo.email || 'default_user').trim().toUpperCase();
    return `srm_custom_classes_${reg}`;
}

function getCustomClasses() {
    try {
        const key = getUserCustomStorageKey();
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveCustomClasses(list) {
    try {
        const key = getUserCustomStorageKey();
        localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {}
}

function addCustomClass(classObj) {
    const list = getCustomClasses();
    const filtered = list.filter(c => !(c.dayOrder === classObj.dayOrder && parseInt(c.period, 10) === parseInt(classObj.period, 10)));
    filtered.push(classObj);
    saveCustomClasses(filtered);
}

function deleteCustomClass(classId) {
    const list = getCustomClasses();
    const filtered = list.filter(c => c.id !== classId);
    saveCustomClasses(filtered);
    renderTimetablePane();
    createToast("Custom class removed.", "info");
}

/**
 * Renders Timetable Screen
 * Desktop (>= 992px): 5-Day Matrix Table
 * Mobile (< 992px): 1 Day Order at a time vertical schedule
 */
function renderTimetablePane() {
    const isMobile = window.innerWidth < 992;
    const mobileControls = document.getElementById('timetable-mobile-day-controls');
    const mobileWrapper = document.getElementById('timetable-mobile-timeline-wrapper');
    const matrixCard = document.getElementById('timetable-matrix-card');

    if (isMobile) {
        if (mobileControls) mobileControls.classList.remove('hidden');
        if (mobileWrapper) mobileWrapper.classList.remove('hidden');
        if (matrixCard) matrixCard.classList.add('hidden');

        // Always default to today's current day order when opening timetable on mobile
        const todayDay = getTodayDayOrder();
        let currentDay = (todayDay && todayDay.startsWith('DAY')) ? todayDay : (state.timetableActiveDay || 'DAY 1');
        state.timetableActiveDay = currentDay;

        renderMobileTimetableDay(currentDay);
        bindMobileTimetableDayHandlers();
    } else {
        if (mobileControls) mobileControls.classList.add('hidden');
        if (mobileWrapper) mobileWrapper.classList.add('hidden');
        if (matrixCard) matrixCard.classList.remove('hidden');

        renderTimetableMatrixTable();
    }
}

function renderMobileTimetableDay(dayOrder) {
    const titleEl = document.getElementById('timetable-mobile-dayorder-title');
    const wrapper = document.getElementById('timetable-mobile-timeline-wrapper');

    if (titleEl) titleEl.textContent = dayOrder;
    if (!wrapper) return;

    const slots = state.mergedTimetable[dayOrder] || [];

    if (slots.length === 0) {
        wrapper.innerHTML = `
            <div class="card p-24 text-center">
                <h4 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 800; color: var(--text-primary);">No Classes Scheduled</h4>
                <p style="margin: 0; font-size: 12px; color: var(--text-muted);">${dayOrder} has no active class slots.</p>
            </div>
        `;
        return;
    }

    const now = getCurrentDateTime();
    const currentMinuteVal = now.getHours() * 60 + now.getMinutes();
    const isTodaySelected = (dayOrder === getTodayDayOrder());

    const validClassSlots = slots.filter(s => (s.course || s.subjectTitle) && (s.course || s.subjectTitle).trim() !== '');
    const maxClassPeriod = validClassSlots.length > 0 ? Math.max(...validClassSlots.map(s => parseInt(s.period, 10) || 1)) : 0;

    if (maxClassPeriod === 0) {
        wrapper.innerHTML = `
            <div class="card p-24 text-center">
                <h4 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 800; color: var(--text-primary);">No Classes Scheduled</h4>
                <p style="margin: 0; font-size: 12px; color: var(--text-muted);">${dayOrder} has no active class slots.</p>
            </div>
        `;
        return;
    }

    let html = '<div class="vertical-timeline-list flex-col gap-8">';
    let isNextFound = false;

    for (let p = 1; p <= maxClassPeriod; p++) {
        const slot = slots.find(s => parseInt(s.period, 10) === p);
        const pt = periodTimings[p - 1] || { start: '08:00', end: '08:50' };
        const timingStr = slot ? (slot.time || `${pt.start} - ${pt.end}`) : `${pt.start} - ${pt.end}`;

        if (slot && (slot.course || slot.subjectTitle)) {
            const isLab = isSlotLab(slot);
            const typeClass = isLab ? 'lab' : 'theory';
            const tlLetter = isLab ? 'L' : 'T';

            let stateClass = '';
            let isNext = false;
            if (isTodaySelected) {
                const [sH, sM] = pt.start.split(':').map(Number);
                const [eH, eM] = pt.end.split(':').map(Number);
                const startMins = sH * 60 + sM;
                const endMins = eH * 60 + eM;
                if (currentMinuteVal >= startMins && currentMinuteVal <= endMins) {
                    stateClass = 'slot-current';
                }
                if (!isNextFound && currentMinuteVal < endMins) {
                    isNext = true;
                    isNextFound = true;
                }
            }

            let nodeState = 'upcoming';
            let segmentClass = 'dashed';
            if (stateClass === 'slot-current') {
                nodeState = 'current active';
                segmentClass = 'solid';
            } else if (isTodaySelected) {
                const [eH, eM] = pt.end.split(':').map(Number);
                const endMins = eH * 60 + eM;
                if (currentMinuteVal > endMins) {
                    nodeState = 'completed';
                    segmentClass = 'solid';
                }
            }

            let nodeHtml = '';
            if (nodeState.includes('completed')) {
                nodeHtml = `<div class="timeline-checkpoint-node completed"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>`;
            } else if (nodeState.includes('current')) {
                nodeHtml = `<div class="timeline-checkpoint-node current"><div class="current-inner-dot"></div></div>`;
            } else {
                nodeHtml = `<div class="timeline-checkpoint-node upcoming ${typeClass}"></div>`;
            }

            html += `
                <div class="vertical-timeline-card ${typeClass} ${stateClass}" style="position: relative;">
                    ${isNext ? '<span class="badge-next-slot">NEXT</span>' : ''}
                    <div class="vertical-timeline-badge-col">
                        <span class="period-pill">P${slot.period}</span>
                        <span class="time-range-label">${timingStr}</span>
                    </div>
                    <div class="vertical-timeline-info-col">
                        <div class="vertical-timeline-header-row">
                            <span class="course-code-tag">${slot.slot || slot.code || ''}</span>
                        </div>
                        <h4 class="vertical-timeline-title">${slot.course || 'Class Session'}</h4>
                        ${slot.faculty ? `<div class="attendance-faculty">${slot.faculty}</div>` : ''}
                        <div class="vertical-timeline-footer-row">
                            ${slot.room ? `<span class="room-tag"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${slot.room.replace(/^Room\s+/i, '')}</span>` : ''}
                        </div>
                    </div>
                    <span class="card-tl-indicator">${tlLetter}</span>
                </div>
            `;
        } else {
            // SLEEK NARROW FREE PERIOD CARD ON MOBILE REGULAR TIMETABLE TAB
            html += `
                <div class="vertical-timeline-card free-period-card">
                    <div class="free-period-badge-col">
                        <span class="period-pill free-period-pill">P${p}</span>
                        <span class="time-range-label free-period-time">${timingStr}</span>
                    </div>
                    <div class="free-period-content">
                        <span class="free-period-label">FREE PERIOD</span>
                    </div>
                </div>
            `;
        }
    }
    html += '</div>';

    wrapper.innerHTML = html;
    setTimeout(() => {
        adjustTimelineLineBounds(wrapper);
    }, 0);
}

function adjustTimelineLineBounds(containerEl) {
    if (!containerEl) return;
    const timelineList = containerEl.classList.contains('vertical-timeline-list') ? containerEl : containerEl.querySelector('.vertical-timeline-list');
    if (!timelineList) return;

    const cards = timelineList.querySelectorAll('.vertical-timeline-card');
    if (cards.length === 0) return;

    const firstCard = cards[0];
    const lastCard = cards[cards.length - 1];

    const firstDot = firstCard.querySelector('.timeline-checkpoint-node');
    const lastDot = lastCard.querySelector('.timeline-checkpoint-node');

    if (firstDot && lastDot) {
        const listRect = timelineList.getBoundingClientRect();
        const firstDotRect = firstDot.getBoundingClientRect();
        const lastDotRect = lastDot.getBoundingClientRect();

        const topPx = Math.round(firstDotRect.top + firstDotRect.height / 2 - listRect.top);
        const bottomPx = Math.round(listRect.bottom - (lastDotRect.top + lastDotRect.height / 2));

        timelineList.style.setProperty('--line-top', `${topPx}px`);
        timelineList.style.setProperty('--line-bottom', `${bottomPx}px`);
    }
}

window.addEventListener('resize', () => {
    const mobileWrapper = document.getElementById('timetable-mobile-timeline-wrapper');
    const focusContainer = document.getElementById('focus-timeline-container');
    if (mobileWrapper) adjustTimelineLineBounds(mobileWrapper);
    if (focusContainer) adjustTimelineLineBounds(focusContainer);
});

function bindMobileTimetableDayHandlers() {
    const prevBtn = document.getElementById('timetable-prev-day-btn');
    const nextBtn = document.getElementById('timetable-next-day-btn');

    const days = ['DAY 1', 'DAY 2', 'DAY 3', 'DAY 4', 'DAY 5'];

    if (prevBtn) {
        prevBtn.onclick = () => {
            let idx = days.indexOf(state.timetableActiveDay || 'DAY 1');
            if (idx === -1) idx = 0;
            const newIdx = (idx - 1 + days.length) % days.length;
            state.timetableActiveDay = days[newIdx];
            renderMobileTimetableDay(state.timetableActiveDay);
        };
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            let idx = days.indexOf(state.timetableActiveDay || 'DAY 1');
            if (idx === -1) idx = 0;
            const newIdx = (idx + 1) % days.length;
            state.timetableActiveDay = days[newIdx];
            renderMobileTimetableDay(state.timetableActiveDay);
        };
    }
}

function renderTimetableMatrixTable() {
    const container = document.getElementById('timetable-matrix-container');
    if (!container) return;

    const customClasses = getCustomClasses();

    const matrixSlots = [
        { period: 1, name: 'Slot 1', time: '8:00 AM - 8:50 AM' },
        { period: 2, name: 'Slot 2', time: '8:50 AM - 9:40 AM' },
        { period: 3, name: 'Slot 3', time: '9:45 AM - 10:35 AM' },
        { period: 4, name: 'Slot 4', time: '10:40 AM - 11:30 AM' },
        { period: 5, name: 'Slot 5', time: '11:35 AM - 12:25 PM' },
        { period: 6, name: 'Slot 6', time: '12:30 PM - 1:20 PM' },
        { period: 7, name: 'Slot 7', time: '1:25 PM - 2:15 PM' },
        { period: 8, name: 'Slot 8', time: '2:20 PM - 3:10 PM' },
        { period: 9, name: 'Slot 9', time: '3:10 PM - 4:00 PM' },
        { period: 10, name: 'Slot 10', time: '4:00 PM - 4:50 PM' },
        { period: 11, name: 'Slot 11', time: '4:50 PM - 5:30 PM' },
        { period: 12, name: 'Slot 12', time: '5:30 PM - 6:10 PM' }
    ];

    const dayOrders = ["DAY 1", "DAY 2", "DAY 3", "DAY 4", "DAY 5"];

    let tableHtml = `
        <div class="timetable-matrix-scroll-wrapper">
            <table class="timetable-matrix-table">
                <thead>
                    <tr>
                        <th class="matrix-th-time">Time</th>
                        ${matrixSlots.map(s => `
                            <th class="matrix-th-slot">
                                <span class="slot-name">${s.name}</span>
                                <span class="slot-time">${s.time}</span>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    dayOrders.forEach(dayKey => {
        const daySchedule = state.mergedTimetable[dayKey] || [];
        const isToday = (dayKey === state.activeDayOrder);
        const rowClass = isToday ? 'active-today-row' : '';

        tableHtml += `<tr class="${rowClass}">`;
        tableHtml += `
            <td class="matrix-td-day">
                <span>${dayKey.replace('DAY ', 'Day ')}</span>
                ${isToday ? '<span class="today-tag">Today</span>' : ''}
            </td>
        `;

        let periodNum = 1;
        while (periodNum <= 12) {
            const srmMatch = daySchedule.find(s => parseInt(s.period, 10) === periodNum);
            const customMatch = customClasses.find(c => c.dayOrder === dayKey && parseInt(c.period, 10) === periodNum);

            const slotMatch = srmMatch || customMatch;

            if (slotMatch) {
                const isCustom = !!customMatch && !srmMatch;
                const isLab = isCustom ? (slotMatch.type === 'lab') : isSlotLab(slotMatch);
                const tlLetter = isLab ? 'L' : 'T';

                let typeClass = isLab ? 'lab' : 'theory';

                if (isCustom) {
                    typeClass = isLab ? 'custom-lab' : 'custom-theory';
                }

                // Check how many CONSECUTIVE subsequent periods have the exact same class
                let colspan = 1;
                for (let checkP = periodNum + 1; checkP <= 12; checkP++) {
                    const nextSrm = daySchedule.find(s => parseInt(s.period, 10) === checkP);
                    const nextCustom = customClasses.find(c => c.dayOrder === dayKey && parseInt(c.period, 10) === checkP);
                    const nextMatch = nextSrm || nextCustom;

                    if (nextMatch) {
                        const nextIsCustom = !!nextCustom && !nextSrm;
                        const nextIsLab = nextIsCustom ? (nextMatch.type === 'lab') : isSlotLab(nextMatch);

                        const sameCourse = (nextMatch.course || '').trim().toUpperCase() === (slotMatch.course || '').trim().toUpperCase();
                        const sameRoom = (nextMatch.room || '').trim().toUpperCase() === (slotMatch.room || '').trim().toUpperCase();

                        if (sameCourse && sameRoom && nextIsLab === isLab && nextIsCustom === isCustom) {
                            colspan++;
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                }

                const deleteBtnHtml = isCustom ? `
                    <button class="matrix-cell-delete-btn" onclick="deleteCustomClass('${slotMatch.id}')" title="Delete Custom Class">✕</button>
                ` : '';

                const colspanAttr = colspan > 1 ? ` colspan="${colspan}"` : '';
                const mergedClass = colspan > 1 ? ' merged-cell' : '';

                tableHtml += `
                    <td class="matrix-td-cell filled ${typeClass}${mergedClass}"${colspanAttr}>
                        <span class="card-tl-indicator">${tlLetter}</span>
                        ${deleteBtnHtml}
                        <div class="matrix-cell-content">
                            <span class="matrix-cell-course" title="${slotMatch.course}">${slotMatch.course}</span>
                            <div class="matrix-cell-footer">
                                <span class="matrix-cell-room">${slotMatch.room || ''}</span>
                            </div>
                        </div>
                    </td>
                `;

                periodNum += colspan;
            } else {
                tableHtml += `<td class="matrix-td-cell empty"></td>`;
                periodNum++;
            }
        }

        tableHtml += `</tr>`;
    });

    tableHtml += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = tableHtml;
}

/**
 * Captures and exports the exact weekly timetable matrix as a high-resolution PNG image, preserving theme styling and colors.
 */
function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

async function downloadTimetableImage() {
    const btn = document.getElementById('download-timetable-btn');
    const mobileBtn = document.getElementById('download-timetable-mobile-btn');
    const card = document.getElementById('timetable-matrix-card') || document.querySelector('.timetable-matrix-card');
    const scrollWrapper = document.querySelector('.timetable-matrix-scroll-wrapper');
    const table = document.querySelector('.timetable-matrix-table');
    if (!card) return;

    const originalHtml = btn ? btn.innerHTML : '';
    const originalMobileHtml = mobileBtn ? mobileBtn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="btn-loader"></span> Exporting...`;
    }
    if (mobileBtn) {
        mobileBtn.disabled = true;
    }

    const wasCardHidden = card.classList.contains('hidden');
    if (wasCardHidden) {
        card.classList.remove('hidden');
        renderTimetableMatrixTable();
    }

    const originalCardStyle = card.getAttribute('style') || '';
    const originalScrollStyle = scrollWrapper ? (scrollWrapper.getAttribute('style') || '') : '';
    const originalTableStyle = table ? (table.getAttribute('style') || '') : '';
    let watermark = null;

    try {
        if (typeof html2canvas === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        if (btn) btn.style.display = 'none';

        const fullTableWidth = table ? Math.max(table.scrollWidth, 1350) : 1350;

        // Temporarily unclip and expand card width to full table scrollWidth so all 12 slots are captured cleanly without side cutoffs
        card.style.width = `${fullTableWidth + 60}px`;
        card.style.maxWidth = 'none';
        card.style.overflow = 'visible';

        if (scrollWrapper) {
            scrollWrapper.style.overflow = 'visible';
            scrollWrapper.style.width = '100%';
        }
        if (table) {
            table.style.width = '100%';
        }

        // Faint watermark in corner with theme responsive logo PNG
        const studentInfoStr = state.studentInfo.name || state.studentInfo.registrationNumber || 'SRM Student';
        const activeTheme = document.documentElement.getAttribute('data-theme') || 'pitch-black';
        const isLight = isThemeLight(activeTheme);
        const watermarkLogoSrc = isLight ? 'logo_dark.png' : 'logo_light.png';

        watermark = document.createElement('div');
        watermark.style.cssText = 'display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 14px 24px; font-size: 11px; font-weight: 800; color: var(--text-secondary); opacity: 0.85; border-top: 1px dashed var(--border-subtle); background: var(--bg-surface-solid); font-family: var(--font-sans, sans-serif);';
        watermark.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
                <img src="${watermarkLogoSrc}" alt="SRM Academia+" style="height: 24px; width: auto; max-height: 24px; flex-shrink: 0; object-fit: contain; display: block;" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline-flex';" />
                <div style="display: none; align-items: center; justify-content: center; width: 24px; height: 24px; flex-shrink: 0;">
                    <svg width="20" height="20" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="36" height="36" rx="8" fill="var(--accent-primary-subtle)" stroke="var(--accent-primary)" stroke-width="2"/>
                        <path d="M11 26L17.5 9.5L24 26" stroke="var(--accent-primary)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M13.5 19.5H27.5" stroke="var(--accent-primary)" stroke-width="3.2" stroke-linecap="round"/>
                        <path d="M24.5 16.5V22.5" stroke="var(--accent-primary)" stroke-width="3.2" stroke-linecap="round"/>
                    </svg>
                </div>
                <span style="font-size: 12px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.01em; white-space: nowrap;">Academia<span style="color: var(--accent-primary);">+</span> • Weekly Timetable for ${studentInfoStr}</span>
            </div>
        `;
        card.appendChild(watermark);

        const wmImg = watermark.querySelector('img');
        if (wmImg && !wmImg.complete) {
            await new Promise(resolve => {
                wmImg.onload = resolve;
                wmImg.onerror = resolve;
                setTimeout(resolve, 300);
            });
        }

        const bgColor = getComputedStyle(document.body).backgroundColor || '#ffffff';

        const canvas = await html2canvas(card, {
            backgroundColor: bgColor,
            scale: 2.5,
            useCORS: true,
            logging: false,
            allowTaint: true,
            windowWidth: fullTableWidth + 100,
            onclone: (clonedDoc) => {
                clonedDoc.querySelectorAll('.matrix-cell-delete-btn').forEach(el => el.remove());
                const clonedHeader = clonedDoc.querySelector('#timetable-matrix-card .card-header');
                if (clonedHeader) clonedHeader.remove();

                const origCard = document.getElementById('timetable-matrix-card') || document.querySelector('.timetable-matrix-card');
                const clonedCard = clonedDoc.querySelector('#timetable-matrix-card') || clonedDoc.querySelector('.timetable-matrix-card');
                
                if (origCard && clonedCard) {
                    const csCard = window.getComputedStyle(origCard);
                    clonedCard.style.backgroundColor = csCard.backgroundColor || '#ffffff';
                    clonedCard.style.color = csCard.color || '#000000';
                    clonedCard.style.border = csCard.border || '2px solid #000000';
                    clonedCard.style.boxShadow = csCard.boxShadow || 'none';
                    clonedCard.style.borderRadius = csCard.borderRadius || '16px';

                    const origCells = origCard.querySelectorAll('.matrix-td-cell, .matrix-th-slot, .matrix-th-time, .matrix-td-day, .grid-header-cell');
                    const clonedCells = clonedCard.querySelectorAll('.matrix-td-cell, .matrix-th-slot, .matrix-th-time, .matrix-td-day, .grid-header-cell');

                    origCells.forEach((origCell, i) => {
                        const clonedCell = clonedCells[i];
                        if (clonedCell) {
                            const cs = window.getComputedStyle(origCell);
                            clonedCell.style.backgroundColor = cs.backgroundColor;
                            clonedCell.style.borderColor = cs.borderColor;
                            clonedCell.style.borderStyle = cs.borderStyle;
                            clonedCell.style.borderWidth = cs.borderWidth;
                            clonedCell.style.color = cs.color;
                            clonedCell.style.boxShadow = cs.boxShadow;
                            clonedCell.style.borderRadius = cs.borderRadius;
                            clonedCell.style.borderTopColor = cs.borderTopColor;
                            clonedCell.style.borderTopWidth = cs.borderTopWidth;
                            clonedCell.style.borderTopStyle = cs.borderTopStyle;

                            origCell.querySelectorAll('*').forEach((origChild, j) => {
                                const clonedChild = clonedCell.querySelectorAll('*')[j];
                                if (clonedChild) {
                                    const cChild = window.getComputedStyle(origChild);
                                    clonedChild.style.color = cChild.color;
                                    clonedChild.style.backgroundColor = cChild.backgroundColor;
                                    clonedChild.style.borderColor = cChild.borderColor;
                                    clonedChild.style.borderStyle = cChild.borderStyle;
                                    clonedChild.style.borderWidth = cChild.borderWidth;
                                    clonedChild.style.fontWeight = cChild.fontWeight;
                                    clonedChild.style.fontFamily = cChild.fontFamily;
                                }
                            });
                        }
                    });
                }
            }
        });

        const image = canvas.toDataURL('image/png');
        const sanitizedName = studentInfoStr.replace(/\s+/g, '_');
        const fileName = `Academia_Timetable_${sanitizedName}.png`;

        // Create Blob and blob URL for robust mobile WebView downloading
        const blob = dataURItoBlob(image);
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.download = fileName;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
        }, 30000);

        // Show interactive export preview modal with WebShare & long-press download support for native Android apps
        showExportedImageModal(image, fileName, blob);

        createToast("Full Timetable image exported successfully!", "success");
    } catch (err) {
        console.error("Timetable image export error:", err);
        createToast("Unable to export timetable image. Please try again.", "danger");
    } finally {
        if (watermark && watermark.parentNode) {
            watermark.parentNode.removeChild(watermark);
        }
        if (card) card.setAttribute('style', originalCardStyle);
        if (scrollWrapper) scrollWrapper.setAttribute('style', originalScrollStyle);
        if (table) table.setAttribute('style', originalTableStyle);
        if (wasCardHidden && card) {
            card.classList.add('hidden');
        }

        if (btn) {
            btn.style.display = 'flex';
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
        if (mobileBtn) {
            mobileBtn.disabled = false;
            mobileBtn.innerHTML = originalMobileHtml;
        }
    }
}

/**
 * Interactive Export Modal for Android WebView / Mobile devices
 */
function showExportedImageModal(dataUrl, fileName, blob) {
    let modal = document.getElementById('timetable-export-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'timetable-export-modal';
        modal.className = 'modal-backdrop hidden';
        modal.style.cssText = 'position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.82); backdrop-filter: blur(8px); padding: 16px;';
        document.body.appendChild(modal);
    }

    const canShare = Boolean(navigator.canShare && blob && navigator.canShare({ files: [new File([blob], fileName, { type: 'image/png' })] }));

    modal.innerHTML = `
        <div class="card" style="max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 20px; border-radius: 16px; background: var(--bg-surface-solid); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: var(--text-primary);">Timetable Export Ready</h3>
                    <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-secondary);">Long-press the image below to save to gallery</p>
                </div>
                <button id="close-timetable-export-modal-btn" class="btn-icon" style="border: none; background: transparent; cursor: pointer; color: var(--text-muted); font-size: 20px;">✕</button>
            </div>
            
            <div style="width: 100%; border-radius: 12px; overflow: hidden; border: 1px solid var(--border-subtle); background: var(--bg-surface-elevated); padding: 8px;">
                <img src="${dataUrl}" alt="SRM Weekly Timetable" style="width: 100%; height: auto; border-radius: 8px; display: block; object-fit: contain;" />
            </div>

            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${canShare ? `
                <button id="share-timetable-image-btn" class="btn-primary" style="flex: 1; padding: 10px 16px; font-size: 13px; font-weight: 800; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    Share / Save
                </button>
                ` : ''}
                <a href="${dataUrl}" download="${fileName}" target="_blank" class="btn-secondary" style="flex: 1; padding: 10px 16px; font-size: 13px; font-weight: 800; border-radius: 10px; text-decoration: none; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Open Image
                </a>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');

    const closeBtn = modal.querySelector('#close-timetable-export-modal-btn');
    if (closeBtn) {
        closeBtn.onclick = () => modal.classList.add('hidden');
    }

    const shareBtn = modal.querySelector('#share-timetable-image-btn');
    if (shareBtn && canShare) {
        shareBtn.onclick = async () => {
            try {
                const file = new File([blob], fileName, { type: 'image/png' });
                await navigator.share({
                    title: 'SRM Timetable',
                    text: 'My SRM Weekly Timetable',
                    files: [file]
                });
            } catch (sErr) {
                console.log("Share skipped:", sErr);
            }
        };
    }
}

/**
 * Renders Internal Performance Assessment View
 */
function renderAcademicsPane() {
    const container = document.getElementById('marks-subject-container');
    if (!container) return;

    if (!state.marks || state.marks.length === 0) {
        container.innerHTML = `
            <div class="text-center py-48" style="grid-column: 1 / -1;">
                <div style="color: var(--text-muted); margin-bottom: 12px; display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background-color: var(--bg-surface-elevated);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path>
                    </svg>
                </div>
                <h4 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">No Internal Marks Data</h4>
                <p style="font-size: 13px; color: var(--text-secondary);">No assessment records published yet.</p>
            </div>
        `;
        return;
    }

    let html = '';
    state.marks.forEach(item => {
        let assessmentsHtml = '';
        const keys = Object.keys(item.assessments || {});

        if (keys.length === 0) {
            assessmentsHtml = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; background-color: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
                    <span style="font-size: 12px; font-weight: 600; color: var(--text-muted);">No evaluation components recorded yet</span>
                </div>
            `;
        } else {
            keys.forEach(k => {
                const test = item.assessments[k];
                const obtainedText = test.status === "ABSENT" ? "ABSENT" : test.obtainedMarks;
                assessmentsHtml += `
                    <div class="assessment-item" style="display: flex; align-items: center; justify-content: space-between; background-color: var(--bg-surface-elevated); border-radius: var(--radius-md); padding: 12px 16px; border: 1px solid var(--border-subtle);">
                        <span class="assessment-name" style="font-size: 13px; font-weight: 700; color: var(--text-secondary);">${test.assessment}</span>
                        <div class="assessment-scores">
                            <span class="assessment-obtained" style="font-size: 14px; font-weight: 800; color: ${test.status === "ABSENT" ? 'var(--accent-danger)' : 'var(--text-primary)'}">${obtainedText}</span>
                            <span class="assessment-total" style="font-size: 11px; color: var(--text-muted);">/ ${test.maxMarks || '--'}</span>
                        </div>
                    </div>
                `;
            });
        }

        const matchingAttn = (state.attendance || []).find(a => (a.code || '').toUpperCase().trim() === (item.courseCode || '').toUpperCase().trim());
        const fullCourseName = matchingAttn ? (matchingAttn.course || item.courseCode) : item.courseCode;
        const credits = getCourseCredit(fullCourseName, item.courseCode);

        html += `
            <div class="card marks-card">
                <div class="card-header" style="display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 18px 20px; border-bottom: 1px solid var(--border-subtle); min-height: 104px; box-sizing: border-box;">
                    <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 800; color: var(--text-primary); line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; max-height: 2.7em;" title="${fullCourseName}">${fullCourseName}</h3>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span class="marks-course-code-badge" style="font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 12px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-secondary); font-family: var(--font-mono, monospace); display: inline-block;">${item.courseCode}</span>
                        <span class="marks-course-credit-badge" style="font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 12px; background: var(--accent-primary-subtle); border: 1px solid var(--border-subtle); color: var(--accent-primary); font-family: var(--font-mono, monospace); display: inline-block;">${credits} Credit${credits === 1 ? '' : 's'}</span>
                    </div>
                </div>
                <div class="card-body" style="padding: 20px;">
                    <div class="marks-list" style="display: flex; flex-direction: column; gap: 10px;">
                        ${assessmentsHtml}
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * REBUILT: Renders Full Screen Academic Calendar / Planner View
 * Desktop (>= 992px): 7-Column Monthly Matrix Grid
 * Mobile (< 992px): Vertical Scrolling Event List with Month Transitions
 */
function renderPlannerPane() {
    const datesGrid = document.getElementById('calendar-dates-grid');
    const monthLabel = document.getElementById('calendar-month-label');
    const mobileListWrapper = document.getElementById('planner-mobile-list-wrapper');
    const weekdayHeader = document.querySelector('.calendar-weekday-grid');
    if (!datesGrid || !monthLabel) return;

    const calendarScope = state.currentCalendarMonth;
    const year = calendarScope.getFullYear();
    const month = calendarScope.getMonth();

    monthLabel.textContent = calendarScope.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const isMobile = window.innerWidth < 992;

    if (isMobile) {
        if (weekdayHeader) weekdayHeader.classList.add('hidden');
        if (datesGrid) datesGrid.classList.add('hidden');
        if (mobileListWrapper) {
            mobileListWrapper.classList.remove('hidden');
            renderMobilePlannerList(year, month);
        }
    } else {
        if (weekdayHeader) weekdayHeader.classList.remove('hidden');
        if (datesGrid) datesGrid.classList.remove('hidden');
        if (mobileListWrapper) mobileListWrapper.classList.add('hidden');

        renderDesktopPlannerGrid(year, month);
    }
}

function renderMobilePlannerList(year, month) {
    const wrapper = document.getElementById('planner-mobile-list-wrapper');
    if (!wrapper) return;

    const lastDay = new Date(year, month + 1, 0).getDate();
    const todayObject = new Date();
    const eventsForMonth = [];

    for (let d = 1; d <= lastDay; d++) {
        const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const plannerMatch = state.planner.find(p => p.date === currentDateStr);
        const dateObj = new Date(currentDateStr + 'T00:00:00');
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isToday = todayObject.getFullYear() === year && todayObject.getMonth() === month && todayObject.getDate() === d;

        eventsForMonth.push({
            day: d,
            dayName: dayName,
            dateStr: currentDateStr,
            isToday: isToday,
            isWeekend: isWeekend,
            planner: plannerMatch
        });
    }

    let html = '<div class="mobile-planner-scrolling-list flex-col gap-14" style="display: flex; flex-direction: column; gap: 14px;">';
    eventsForMonth.forEach(item => {
        const p = item.planner;
        const isPlannerHoliday = p && (p.type === 'HOLIDAY' || p.dayOrder === 'HOLIDAY' || p.dayOrder === '-' || p.dayOrder === 'OFF');
        const isHoliday = item.isWeekend || isPlannerHoliday;

        let dayOrderTag = '';
        let eventTag = '';
        let cardClass = 'planner-mobile-card';

        if (item.isToday) cardClass += ' today';
        if (isHoliday) cardClass += ' holiday';

        if (p && p.dayOrder && p.dayOrder !== '-' && p.dayOrder !== 'HOLIDAY' && !item.isWeekend) {
            dayOrderTag = `<span class="planner-dayorder-pill">DAY ${p.dayOrder}</span>`;
        } else if (isHoliday) {
            dayOrderTag = `<span class="planner-dayorder-pill holiday">HOLIDAY</span>`;
        }

        if (p && p.event && p.event.trim() !== '') {
            eventTag = `<div class="planner-mobile-event-desc">${p.event}</div>`;
        } else if (item.isWeekend) {
            eventTag = `<div class="planner-mobile-event-desc" style="opacity: 0.85;">Weekend Off (${item.dayName})</div>`;
        }

        html += `
            <div class="${cardClass}" id="planner-card-${item.dateStr}" onclick="handleCalendarDateClick('${item.dateStr}')">
                <div class="planner-mobile-date-badge">
                    <span class="planner-date-num">${item.day}</span>
                    <span class="planner-date-day">${item.dayName}</span>
                </div>
                <div class="planner-mobile-details">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                        <span style="font-size: 13px; font-weight: 800; color: inherit;">${item.dateStr}</span>
                        ${dayOrderTag}
                    </div>
                    ${eventTag || `<div style="font-size: 11px; opacity: 0.75; margin-top: 2px;">Regular Academic Day</div>`}
                </div>
            </div>
        `;
    });
    html += '</div>';

    wrapper.innerHTML = html;

    setTimeout(() => {
        const todayCard = wrapper.querySelector('.planner-mobile-card.today');
        if (todayCard) {
            todayCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 150);
}

function renderDesktopPlannerGrid(year, month) {
    const datesGrid = document.getElementById('calendar-dates-grid');
    if (!datesGrid) return;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    let html = '';

    for (let i = 0; i < startDayOfWeek; i++) {
        html += `<div class="calendar-day-cell empty" style="border: none; background: transparent; cursor: default; pointer-events: none;"></div>`;
    }

    const todayObject = new Date();
    const mockDateTime = getCurrentDateTime();

    for (let d = 1; d <= totalDays; d++) {
        const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const plannerMatch = state.planner.find(p => p.date === currentDateStr);
        const dateObj = new Date(currentDateStr + 'T00:00:00');
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isPlannerHoliday = plannerMatch && (plannerMatch.type === 'HOLIDAY' || plannerMatch.dayOrder === 'HOLIDAY' || plannerMatch.dayOrder === '-');
        const isHoliday = isWeekend || isPlannerHoliday;

        let cellClasses = 'calendar-day-cell';
        if (isHoliday) cellClasses += ' holiday';

        let dayOrderBadge = '';
        let eventSnippetHtml = '';

        const isPhysicalToday = todayObject.getFullYear() === year && todayObject.getMonth() === month && todayObject.getDate() === d;
        const isSimulatedToday = window.DEBUG_MODE && mockDateTime.getFullYear() === year && mockDateTime.getMonth() === month && mockDateTime.getDate() === d;

        if (isPhysicalToday) {
            cellClasses += ' today';
        }
        if (isSimulatedToday) {
            cellClasses += ' simulated-today';
        }

        if (plannerMatch) {
            if (plannerMatch.dayOrder && plannerMatch.dayOrder !== '-' && plannerMatch.dayOrder !== 'HOLIDAY' && !isWeekend) {
                dayOrderBadge = `<span class="calendar-cell-day-order" style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; background: var(--accent-primary-subtle); color: var(--accent-primary);">D${plannerMatch.dayOrder}</span>`;
            } else if (isHoliday) {
                dayOrderBadge = `<span class="calendar-cell-day-order" style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; background: rgba(239, 68, 68, 0.15); color: #ef4444;">OFF</span>`;
            }

            if (plannerMatch.event && plannerMatch.event.trim() !== '') {
                let badgeColor = 'var(--accent-primary)';
                if (plannerMatch.type === 'HOLIDAY') badgeColor = '#ef4444';
                else if (plannerMatch.type === 'ENROLMENT') badgeColor = '#10b981';
                else if (plannerMatch.type === 'COMMENCEMENT') badgeColor = '#a855f7';

                eventSnippetHtml = `
                    <div style="font-size: 11px; font-weight: 700; color: ${badgeColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; min-width: 0; width: 100%; margin-top: 6px; box-sizing: border-box;" title="${plannerMatch.event}">
                        • ${plannerMatch.event}
                    </div>
                `;
            }
        } else if (isWeekend) {
            dayOrderBadge = `<span class="calendar-cell-day-order" style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; background: rgba(239, 68, 68, 0.15); color: #ef4444;">OFF</span>`;
        }

        html += `
            <div class="${cellClasses}" data-date="${currentDateStr}" onclick="handleCalendarDateClick('${currentDateStr}')">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; min-width: 0;">
                    <span class="day-number" style="font-size: 14px; font-weight: 800; color: var(--text-primary);">${d}</span>
                    ${dayOrderBadge}
                </div>
                <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: flex-end; min-width: 0; max-width: 100%; overflow: hidden;">
                    ${eventSnippetHtml}
                </div>
            </div>
        `;
    }

    datesGrid.innerHTML = html;
}

/**
 * Opens Pop-up Modal with Date Details, Planner Events & Scheduled Classes
 */
function handleCalendarDateClick(dateStr) {
    const modal = document.getElementById('calendar-event-modal');
    const modalCard = document.getElementById('calendar-modal-card');
    const titleEl = document.getElementById('modal-date-title');
    const contentEl = document.getElementById('modal-events-content');
    if (!modal || !contentEl) return;

    document.querySelectorAll('.calendar-day-cell').forEach(cell => {
        cell.classList.remove('selected');
        if (cell.dataset.date === dateStr) {
            cell.classList.add('selected');
        }
    });

    const dateObj = new Date(dateStr + 'T00:00:00');
    if (titleEl) {
        titleEl.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }

    const plannerEvent = state.planner.find(p => p.date === dateStr);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPlannerHoliday = plannerEvent && (plannerEvent.type === 'HOLIDAY' || plannerEvent.dayOrder === 'HOLIDAY' || plannerEvent.dayOrder === '-' || plannerEvent.dayOrder === 'OFF');
    const isHoliday = isWeekend || isPlannerHoliday;

    let html = '';

    // 1. Planner Event Info
    if (plannerEvent) {
        let badgeBg = 'var(--accent-primary-subtle)';
        let badgeColor = 'var(--accent-primary)';
        if (isHoliday) {
            badgeBg = 'rgba(239, 68, 68, 0.15)';
            badgeColor = '#ef4444';
        } else if (plannerEvent.type === 'ENROLMENT') {
            badgeBg = 'rgba(16, 185, 129, 0.15)';
            badgeColor = '#10b981';
        } else if (plannerEvent.type === 'COMMENCEMENT') {
            badgeBg = 'rgba(168, 85, 247, 0.15)';
            badgeColor = '#a855f7';
        }

        const typeText = formatEventType(plannerEvent.type);

        html += `
            <div style="background: var(--bg-surface-elevated); padding: 18px; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Academic Planner Event</span>
                    <span style="font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 12px; background: ${badgeBg}; color: ${badgeColor};">${typeText}</span>
                </div>
                <h4 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">${plannerEvent.event || (isHoliday ? 'Academic Holiday / Off Day' : 'Working Day')}</h4>
                <span style="font-size: 12px; font-weight: 700; color: ${isHoliday ? '#ef4444' : 'var(--accent-primary)'};">${isHoliday ? 'Academic Holiday / Non-Working Day' : (plannerEvent.dayOrder && plannerEvent.dayOrder !== '-' && plannerEvent.dayOrder !== 'HOLIDAY' ? `Day Order: DAY ${plannerEvent.dayOrder}` : 'Working Day')}</span>
            </div>
        `;
    } else if (isWeekend) {
        html += `
            <div style="background: var(--bg-surface-elevated); padding: 18px; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Weekend Off Day</span>
                    <span style="font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 12px; background: rgba(239, 68, 68, 0.15); color: #ef4444;">HOLIDAY</span>
                </div>
                <h4 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 6px 0;">Weekend Off Day (${dateObj.toLocaleDateString('en-US', { weekday: 'long' })})</h4>
                <span style="font-size: 12px; font-weight: 700; color: #ef4444;">Non-Working Day</span>
            </div>
        `;
    }

    // 2. Scheduled Classes for mapped Day Order (HOLIDAYS & WEEKENDS DO NOT SHOW CLASSES!)
    let dayOrderKey = '';
    if (!isHoliday) {
        // ONLY use the planner-provided day order. Do NOT guess day order from day-of-week.
        // If SRM hasn't assigned a day order for this date, don't show any classes.
        if (plannerEvent && plannerEvent.dayOrder && plannerEvent.dayOrder !== '-' && plannerEvent.dayOrder !== 'HOLIDAY' && plannerEvent.dayOrder !== 'OFF') {
            dayOrderKey = `DAY ${plannerEvent.dayOrder}`;
        }
    }

    if (!isHoliday && dayOrderKey) {
        const srmScheduled = state.mergedTimetable[dayOrderKey] || [];
        const customForDay = getCustomClasses().filter(c => c.dayOrder === dayOrderKey);

        const mergedScheduled = [...srmScheduled];
        customForDay.forEach(c => {
            if (!mergedScheduled.some(s => parseInt(s.period, 10) === parseInt(c.period, 10))) {
                mergedScheduled.push({
                    period: c.period,
                    course: c.course,
                    code: c.code,
                    room: c.room,
                    slot: c.type === 'lab' ? 'P-CUSTOM' : 'T-CUSTOM'
                });
            }
        });

        if (mergedScheduled.length > 0) {
            mergedScheduled.sort((a, b) => parseInt(a.period, 10) - parseInt(b.period, 10));

            html += `
                <div style="margin-top: 16px;">
                    <h5 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin: 0 0 10px 0; letter-spacing: 0.05em;">Scheduled Classes (${dayOrderKey})</h5>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
            `;

            mergedScheduled.forEach(cls => {
                const isLab = isSlotLab(cls);
                const tlLetter = isLab ? 'L' : 'T';
                const typeClass = isLab ? 'lab' : 'theory';

                html += `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--bg-surface-solid); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); position: relative;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 12px; font-weight: 800; color: var(--accent-primary); width: 28px;">P${cls.period}</span>
                            <div>
                                <h6 style="margin: 0; font-size: 13px; font-weight: 700; color: var(--text-primary);">${cls.course}</h6>
                                <span style="font-size: 11px; color: var(--text-muted);">${cls.code} ${cls.room ? `• ${cls.room.replace(/^Room\s+/i, '')}` : ''}</span>
                            </div>
                        </div>
                        <span class="card-tl-indicator" style="position: static; opacity: 0.55; font-size: 11px; font-weight: 800; font-family: var(--font-mono, monospace);">${tlLetter}</span>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        } else {
            html += `
                <div style="margin-top: 16px; text-align: center; padding: 20px; background: var(--bg-surface-solid); border: 1px dashed var(--border-subtle); border-radius: var(--radius-lg);">
                    <span style="font-size: 13px; font-weight: 700; color: var(--text-muted);">No classes scheduled for ${dayOrderKey}.</span>
                </div>
            `;
        }
    } else {
        html += `
            <div style="margin-top: 16px; text-align: center; padding: 20px; background: rgba(239, 68, 68, 0.06); border: 1px dashed rgba(239, 68, 68, 0.25); border-radius: var(--radius-lg);">
                <h5 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 800; color: #ef4444;">No Classes Scheduled</h5>
                <span style="font-size: 12px; color: var(--text-muted);">Academic Holiday / Weekend Off Day — Enjoy your break!</span>
            </div>
        `;
    }

    contentEl.innerHTML = html;

    modal.classList.remove('hidden');
    updateGlobalBackdrop();
}

function closeCalendarModal() {
    const modal = document.getElementById('calendar-event-modal');
    if (!modal) return;

    animateCloseElement(modal);
}

function formatEventType(typeStr) {
    if (!typeStr) return 'N/A';
    return typeStr.toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Authorized Whitelist Registration Numbers / NetIDs for Developer Console Access
const ALLOWED_DEV_NETIDS = [
    'SB7956',
    'SB7956@SRMIST.EDU.IN'
];

function isUserAuthorizedForDevConsole() {
    return true;
}

/**
 * Mobile & Desktop System Notification Manager
 */
async function requestNotificationPermission() {
    if (window.AndroidNotificationBridge && typeof window.AndroidNotificationBridge.requestPermission === 'function') {
        window.AndroidNotificationBridge.requestPermission();
        return true;
    }
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    return false;
}

function sendSystemNotification(title, body, tag = 'srm_alert') {
    // 1. Android Native Notification Bridge
    if (window.AndroidNotificationBridge && typeof window.AndroidNotificationBridge.sendNativeNotification === 'function') {
        window.AndroidNotificationBridge.sendNativeNotification(title, body, tag);
    }
    // 2. Browser HTML5 System Notification Fallback
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body: body,
                icon: 'favicon.png',
                badge: 'favicon.png',
                tag: tag
            });
        } catch (e) {
            console.error("Browser notification creation failed:", e);
        }
    }
}

function getCourseAttendancePct(c) {
    if (!c) return 100;
    if (typeof c.attendance === 'number') return c.attendance;
    if (typeof c.percentage === 'number') return c.percentage;
    if (typeof c.attendancePercentage === 'number') return c.attendancePercentage;
    if (c.attendance && !isNaN(parseFloat(c.attendance))) return parseFloat(c.attendance);
    if (c.percentage && !isNaN(parseFloat(c.percentage))) return parseFloat(c.percentage);
    if (c.attendancePercentage && !isNaN(parseFloat(c.attendancePercentage))) return parseFloat(c.attendancePercentage);
    
    // Calculate from hoursAttended / hoursConducted
    const conducted = parseFloat(c.hoursConducted || c.totalClasses || c.conducted || 0);
    const attended = parseFloat(c.hoursAttended || c.attendedClasses || c.attended || 0);
    if (conducted > 0) {
        return Math.round((attended / conducted) * 1000) / 10;
    }
    return 100;
}

function triggerNextClassNotification(forceManual = false) {
    requestNotificationPermission();

    const nextInfo = getNextUpcomingClass();
    let title = "Upcoming Class Schedule";
    let body = "No remaining classes scheduled for today or upcoming days. Enjoy your break!";

    if (nextInfo && nextInfo.classObj) {
        const c = nextInfo.classObj;
        const name = c.subjectTitle || c.course || c.courseCode || 'Scheduled Lecture';
        const code = c.subjectCode || c.courseCode || '';
        const room = c.roomNo || c.room || 'Main Block';
        const time = c.timing || (c.period ? `Period P${c.period}` : 'Scheduled');
        
        title = `Next Class (${nextInfo.dayLabel}): ${name}`;
        body = `${code ? code + ' • ' : ''}Room: ${room} • Slot: ${time} (${nextInfo.dayOrder})`;
    }

    sendSystemNotification(title, body, 'srm_next_class');

    if (forceManual) {
        createToast(`Next Class Alert: ${title}`, "info");
    }
}

function triggerLowAttendanceNotification(forceManual = false) {
    requestNotificationPermission();

    const attendance = state.attendance || [];
    const lowAttnCourses = attendance.map(c => {
        const pct = getCourseAttendancePct(c);
        const code = c.subjectCode || c.courseCode || c.code || 'Course';
        const title = c.subjectTitle || c.courseName || c.course || code;
        return { course: c, pct: pct, code: code, title: title };
    }).filter(item => item.pct < 75);

    let title = "Attendance Status: Healthy";
    let body = "All enrolled courses are above the 75% attendance threshold.";

    if (lowAttnCourses.length > 0) {
        lowAttnCourses.sort((a, b) => a.pct - b.pct);
        const count = lowAttnCourses.length;
        const lowest = lowAttnCourses[0];

        if (count === 1) {
            title = `⚠️ Low Attendance Alert (${lowest.pct}%): ${lowest.code}`;
            body = `${lowest.title} is at ${lowest.pct}% (below 75% threshold). Additional classes required!`;
        } else {
            const listStr = lowAttnCourses.slice(0, 3).map(i => `${i.code}: ${i.pct}%`).join(', ');
            title = `⚠️ Attendance Alert: ${count} Courses Below 75%`;
            body = `Low Attendance in: ${listStr}. Attend upcoming classes to avoid margin drop!`;
        }
    }

    sendSystemNotification(title, body, 'srm_low_attendance');

    if (forceManual) {
        createToast(`Attendance Alert: ${title}`, lowAttnCourses.length > 0 ? "warning" : "success");
    }
}

function updateDevNavVisibility() {
    const isAuthorized = isUserAuthorizedForDevConsole();
    
    // Sidebar Nav Item (Desktop)
    const devNavItem = document.querySelector('.sidebar-nav .nav-item[data-tab="developer"]');
    if (devNavItem) {
        devNavItem.style.display = isAuthorized ? 'flex' : 'none';
    }

    // Profile Dropdown Menu Item on Mobile (Below Switch Account button)
    const dropdownDevBtn = document.getElementById('dropdown-dev-console-btn');
    if (dropdownDevBtn) {
        if (isAuthorized) {
            dropdownDevBtn.classList.remove('hidden');
            dropdownDevBtn.style.display = 'flex';
        } else {
            dropdownDevBtn.classList.add('hidden');
            dropdownDevBtn.style.display = 'none';
        }

        if (!dropdownDevBtn.dataset.bound) {
            dropdownDevBtn.dataset.bound = 'true';
            dropdownDevBtn.addEventListener('click', () => {
                const headerDropdown = document.getElementById('header-user-dropdown-menu');
                animateCloseElement(headerDropdown, () => {
                    showWorkspace();
                    switchTab('developer');
                });
            });
        }
    }
}

/**
 * Renders Dev Mode Simulation Controls and collapsible raw JSON Inspect stacks
 */
function renderDeveloperPane() {
    const container = document.getElementById('developer-pane-content');
    if (!container) return;

    if (!isUserAuthorizedForDevConsole()) {
        const userReg = state.studentInfo.registrationNumber || 'UNAUTHORIZED';
        container.innerHTML = `
            <div class="card p-36 text-center" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; min-height: 380px; background: var(--bg-surface-solid); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); box-shadow: var(--shadow-premium);">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(239, 68, 68, 0.12); color: #ef4444; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <h2 style="font-size: 22px; font-weight: 800; color: var(--text-primary); margin: 0;">Developer Access Restricted</h2>
                <p style="font-size: 13px; color: var(--text-secondary); max-width: 440px; line-height: 1.5; margin: 0;">
                    The Developer Console is restricted and accessible only to authorized system administrator registration numbers.
                </p>
                <div style="padding: 8px 18px; border-radius: 20px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); font-size: 11px; font-weight: 800; color: var(--text-muted); font-family: var(--font-mono, monospace);">
                    STUDENT REG NO: ${userReg}
                </div>
            </div>
        `;
        return;
    }

    const payloadSize = Math.round((JSON.stringify(state).length / 1024) * 10) / 10;
    const activeTheme = (localStorage.getItem('srm_theme') || 'pitch-black').toUpperCase();

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 24px;">

            <!-- Top System Health Header Card -->
            <div class="card p-24" style="background: var(--bg-surface-solid); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); box-shadow: var(--shadow-premium);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 16px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--accent-primary-subtle); color: var(--accent-primary); display: flex; align-items: center; justify-content: center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 style="font-size: 18px; font-weight: 800; margin: 0; color: var(--text-primary);">Developer Command Center</h3>
                            <span style="font-size: 11px; font-weight: 700; color: var(--accent-primary);">ADMINISTRATOR CONSOLE</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; background: var(--accent-primary-subtle); color: var(--accent-primary);">AUTHORIZED: ${state.studentInfo.registrationNumber || 'DEV'}</span>
                    </div>
                </div>

                <!-- 4 Quick Health Badges -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                    <div style="background: var(--bg-surface-elevated); padding: 12px 16px; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
                        <span style="font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Runtime State</span>
                        <h4 style="font-size: 14px; font-weight: 800; color: var(--text-primary); margin: 2px 0 0 0;">${window.DEBUG_MODE ? 'DEBUG SIMULATION' : 'LIVE PRODUCTION'}</h4>
                    </div>
                    <div style="background: var(--bg-surface-elevated); padding: 12px 16px; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
                        <span style="font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Active Theme</span>
                        <h4 style="font-size: 14px; font-weight: 800; color: var(--accent-primary); margin: 2px 0 0 0;">${activeTheme}</h4>
                    </div>
                    <div style="background: var(--bg-surface-elevated); padding: 12px 16px; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
                        <span style="font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Cached Payload</span>
                        <h4 style="font-size: 14px; font-weight: 800; color: var(--text-primary); margin: 2px 0 0 0;">${payloadSize} KB</h4>
                    </div>
                    <div style="background: var(--bg-surface-elevated); padding: 12px 16px; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
                        <span style="font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">API Health</span>
                        <h4 style="font-size: 14px; font-weight: 800; color: #10b981; margin: 2px 0 0 0;">ONLINE (200)</h4>
                    </div>
                </div>
            </div>

            <!-- Simulation Deck & System Action Controls Grid -->
            <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 24px;">

                <!-- Deck 1: Time Travel & Day Order Simulation -->
                <div class="card p-24" style="background: var(--bg-surface-solid); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); box-shadow: var(--shadow-premium);">
                    <h4 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0 0 16px 0; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">Simulation & Time Travel Engine</h4>
                    
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div>
                            <label class="switch-container">
                                <input type="checkbox" id="dev-toggle-debug">
                                <span class="switch-slider"></span>
                                <span class="switch-label">Enable Simulation Override System (DEBUG_MODE)</span>
                            </label>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                            <div>
                                <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px;">Simulated Date</label>
                                <input type="date" id="dev-override-date" style="width: 100%; padding: 10px 12px; font-size: 13px; font-weight: 700; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); background: var(--bg-surface-elevated); color: var(--text-primary); box-sizing: border-box;">
                            </div>
                            <div>
                                <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px;">Simulated Clock Time</label>
                                <input type="time" id="dev-override-time" style="width: 100%; padding: 10px 12px; font-size: 13px; font-weight: 700; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); background: var(--bg-surface-elevated); color: var(--text-primary); box-sizing: border-box;">
                            </div>
                        </div>

                        <div>
                            <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px;">Force Day Order Sequence</label>
                            <select id="dev-override-day" style="width: 100%; padding: 10px 12px; font-size: 13px; font-weight: 700; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); background: var(--bg-surface-elevated); color: var(--text-primary); box-sizing: border-box;">
                                <option value="AUTO">AUTO (Rely on Calendar Plan)</option>
                                <option value="DAY 1">DAY 1</option>
                                <option value="DAY 2">DAY 2</option>
                                <option value="DAY 3">DAY 3</option>
                                <option value="DAY 4">DAY 4</option>
                                <option value="DAY 5">DAY 5</option>
                                <option value="FREE DAY">FREE DAY (Holiday / Weekend)</option>
                            </select>
                        </div>

                        <button id="dev-btn-apply-date" style="padding: 12px; border-radius: var(--radius-md); background: var(--accent-primary); color: var(--text-inverse); border: none; font-size: 13px; font-weight: 800; cursor: pointer; transition: var(--transition-smooth); width: 100%; text-align: center;">
                            Apply Simulation Settings
                        </button>
                    </div>
                </div>

                <!-- Deck 2: System Diagnostic & Trigger Actions -->
                <div class="card p-24" style="background: var(--bg-surface-solid); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); box-shadow: var(--shadow-premium);">
                    <h4 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0 0 16px 0; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">Diagnostic Actions</h4>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <button id="dev-action-sync" style="padding: 12px 16px; border-radius: var(--radius-md); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: var(--transition-smooth);">
                            <span>Force Portal Sync</span>
                            <span style="font-size: 10px; color: var(--accent-primary);">POST /api/sync</span>
                        </button>

                        <button id="dev-action-purge-cache" style="padding: 12px 16px; border-radius: var(--radius-md); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: var(--transition-smooth);">
                            <span>Purge Local Storage Cache</span>
                            <span style="font-size: 10px; color: var(--accent-warning);">CLEAR CACHE</span>
                        </button>

                        <button id="dev-action-trigger-theme-promo" style="padding: 12px 16px; border-radius: var(--radius-md); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: var(--transition-smooth);">
                            <span>Trigger Theme Promotion Popup</span>
                            <span style="font-size: 10px; color: var(--accent-primary);">FLAGSHIP MODAL</span>
                        </button>

                        <button id="dev-action-notif-perm" style="padding: 12px 16px; border-radius: var(--radius-md); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: var(--transition-smooth);">
                            <span>Request Notification Permission</span>
                            <span style="font-size: 10px; color: var(--accent-primary);">PERMISSION PROMPT</span>
                        </button>

                        <button id="dev-action-notif-next-class" style="padding: 12px 16px; border-radius: var(--radius-md); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: var(--transition-smooth);">
                            <span>Trigger Upcoming Class Notification</span>
                            <span style="font-size: 10px; color: var(--accent-primary);">TIMETABLE ALERT</span>
                        </button>

                        <button id="dev-action-notif-low-attn" style="padding: 12px 16px; border-radius: var(--radius-md); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: var(--transition-smooth);">
                            <span>Trigger Low Attendance Alert</span>
                            <span style="font-size: 10px; color: var(--accent-warning);">ATTENDANCE ALERT</span>
                        </button>

                        <button id="dev-action-notif-marks" style="padding: 12px 16px; border-radius: var(--radius-md); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: var(--transition-smooth);">
                            <span>Trigger Internal Marks Notification</span>
                            <span style="font-size: 10px; color: var(--accent-primary);">MARKS ALERT</span>
                        </button>

                        <button id="dev-action-notif-event" style="padding: 12px 16px; border-radius: var(--radius-md); background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: var(--transition-smooth);">
                            <span>Trigger Upcoming Event Notification</span>
                            <span style="font-size: 10px; color: var(--accent-primary);">EVENT ALERT</span>
                        </button>

                        <button id="dev-action-test-401" style="padding: 12px 16px; border-radius: var(--radius-md); background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); color: #ef4444; font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: var(--transition-smooth);">
                            <span>Simulate Expired Session (401)</span>
                            <span style="font-size: 10px; font-weight: 900;">LOGOUT FLOW</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Raw Parsed Workspace JSON Accordion Inspector -->
            <div class="card p-24" style="background: var(--bg-surface-solid); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); box-shadow: var(--shadow-premium);">
                <h4 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0 0 16px 0; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">Raw Parsed Workspace Structures</h4>
                
                <div class="json-inspector-stack" style="display: flex; flex-direction: column; gap: 12px;">
                    <details class="json-details">
                        <summary class="json-summary">studentInfo</summary>
                        <pre class="json-pre"><code id="raw-json-studentInfo">No data cached in runtime.</code></pre>
                    </details>
                    <details class="json-details">
                        <summary class="json-summary">attendance</summary>
                        <pre class="json-pre"><code id="raw-json-attendance">No data cached in runtime.</code></pre>
                    </details>
                    <details class="json-details">
                        <summary class="json-summary">marks</summary>
                        <pre class="json-pre"><code id="raw-json-marks">No data cached in runtime.</code></pre>
                    </details>
                    <details class="json-details">
                        <summary class="json-summary">mergedTimetable</summary>
                        <pre class="json-pre"><code id="raw-json-mergedTimetable">No data cached in runtime.</code></pre>
                    </details>
                    <details class="json-details">
                        <summary class="json-summary">planner</summary>
                        <pre class="json-pre"><code id="raw-json-planner">No data cached in runtime.</code></pre>
                    </details>
                </div>
            </div>
        </div>
    `;

    // Bind action buttons
    const btnApplyDate = document.getElementById('dev-btn-apply-date');
    if (btnApplyDate) btnApplyDate.addEventListener('click', applyDevModeOverrides);

    const btnSync = document.getElementById('dev-action-sync');
    if (btnSync) btnSync.addEventListener('click', handleSyncRequest);

    const btnPurge = document.getElementById('dev-action-purge-cache');
    if (btnPurge) btnPurge.addEventListener('click', () => {
        localStorage.clear();
        createToast("Local storage cache purged. Reloading...", "warning");
        setTimeout(() => location.reload(), 800);
    });

    const btnTriggerPromo = document.getElementById('dev-action-trigger-theme-promo');
    if (btnTriggerPromo) {
        btnTriggerPromo.addEventListener('click', () => {
            const modal = document.getElementById('theme-welcome-modal');
            if (modal) {
                modal.classList.remove('hidden');
                createToast("Triggered Theme Promotion Popup.", "info");
            }
        });
    }

    const btnNotifPerm = document.getElementById('dev-action-notif-perm');
    if (btnNotifPerm) {
        btnNotifPerm.addEventListener('click', () => {
            requestNotificationPermission();
        });
    }

    const btnNotifNextClass = document.getElementById('dev-action-notif-next-class');
    if (btnNotifNextClass) {
        btnNotifNextClass.addEventListener('click', () => {
            triggerAppNotification({
                title: "Upcoming Class • P4 (10:40 AM)",
                body: "Data Structures & Algorithms in TP 706 in 10 mins",
                tag: "class_p4"
            });
        });
    }

    const btnNotifLowAttn = document.getElementById('dev-action-notif-low-attn');
    if (btnNotifLowAttn) {
        btnNotifLowAttn.addEventListener('click', () => {
            triggerAppNotification({
                title: "Attendance Warning • Operating Systems",
                body: "Currently at 73.5% (17/23). 2 classes needed to reach 75% target.",
                tag: "att_os"
            });
        });
    }

    const btnNotifMarks = document.getElementById('dev-action-notif-marks');
    if (btnNotifMarks) {
        btnNotifMarks.addEventListener('click', () => {
            triggerAppNotification({
                title: "Internal Marks Published • CT-1",
                body: "Database Management Systems: 24/25 (Highest in batch)",
                tag: "marks_dbms"
            });
        });
    }

    const btnNotifEvent = document.getElementById('dev-action-notif-event');
    if (btnNotifEvent) {
        btnNotifEvent.addEventListener('click', () => {
            triggerAppNotification({
                title: "Upcoming Campus Event",
                body: "Technical Symposium tomorrow at 10:00 AM in Main Auditorium",
                tag: "event_symposium"
            });
        });
    }

    const btnTest401 = document.getElementById('dev-action-test-401');
    if (btnTest401) btnTest401.addEventListener('click', () => {
        terminateLocalSession("Simulated developer session expiry (HTTP 401).");
    });

    // Bind Controls
    const toggleDebug = document.getElementById('dev-toggle-debug');
    const overrideDate = document.getElementById('dev-override-date');
    const overrideTime = document.getElementById('dev-override-time');
    const overrideDay = document.getElementById('dev-override-day');

    if (toggleDebug) toggleDebug.checked = window.DEBUG_MODE;

    if (simulatedDateTime) {
        const parts = simulatedDateTime.split('T');
        if (overrideDate) overrideDate.value = parts[0];
        if (overrideTime) overrideTime.value = parts[1];
    } else {
        const now = new Date();
        if (overrideDate) overrideDate.value = now.toISOString().split('T')[0];
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        if (overrideTime) overrideTime.value = `${hh}:${mm}`;
    }

    if (overrideDay) overrideDay.value = simulatedDayOrder;

    document.getElementById('raw-json-studentInfo').textContent = JSON.stringify(state.studentInfo, null, 2);
    document.getElementById('raw-json-attendance').textContent = JSON.stringify(state.attendance, null, 2);
    document.getElementById('raw-json-marks').textContent = JSON.stringify(state.marks, null, 2);
    document.getElementById('raw-json-mergedTimetable').textContent = JSON.stringify(state.mergedTimetable, null, 2);
    document.getElementById('raw-json-planner').textContent = JSON.stringify(state.planner, null, 2);
}

/**
 * Applies Developer simulation changes configured in the Settings UI panel
 */
function applyDevModeOverrides() {
    const isDebugEnabled = document.getElementById('dev-toggle-debug')?.checked || false;
    const dateVal = document.getElementById('dev-override-date')?.value || '';
    const timeVal = document.getElementById('dev-override-time')?.value || '';
    const dayVal = document.getElementById('dev-override-day')?.value || 'AUTO';

    window.DEBUG_MODE = isDebugEnabled;
    simulatedDayOrder = dayVal;

    if (isDebugEnabled && dateVal && timeVal) {
        simulatedDateTime = `${dateVal}T${timeVal}`;
    } else {
        simulatedDateTime = null;
    }

    const debugIndicator = document.getElementById('debug-indicator');
    if (debugIndicator) {
        if (window.DEBUG_MODE) {
            debugIndicator.classList.remove('hidden');
        } else {
            debugIndicator.classList.add('hidden');
        }
    }

    createToast("Developer Simulation applied to runtime calculations.", "warning");

    renderOverviewPane();
    renderDeveloperPane();
}

/* ---------------- APPLICATION VIEWPORT CONTROL FUNCTIONS ---------------- */

/* showWorkspace() is defined once at L972 with !important display overrides.
   Duplicate removed to prevent JS function hoisting issues. */

/* showAuthScreen() is defined once at the top of the file (L931) with !important display overrides.
   Duplicate removed to prevent JS function hoisting from silently overriding the correct version. */

/**
 * Toggles skeleton loads or spinner overlays
 */
function showAppLoader(show) {
    const syncBtn = document.getElementById('sync-button');
    if (!syncBtn) return;
    const syncIcon = syncBtn.querySelector('.sync-icon');
    if (show) {
        syncIcon.classList.add('loading');
        syncBtn.disabled = true;
    } else {
        syncIcon.classList.remove('loading');
        syncBtn.disabled = false;
    }
}

/**
 * Visual Toast Alert Notification Framework
 */
function createToast(message, type = 'info') {
    if (!message || typeof message !== 'string' || message.includes('PointerEvent') || message.includes('[object') || message.includes('object Event')) {
        return;
    }
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'warning') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else if (type === 'danger') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    }

    toast.innerHTML = `
        ${iconSvg}
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        toast.style.transition = 'all 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/* ---------------- UTILITY DATA-PROCESSING HELPER BLOCKS ---------------- */

/**
 * Cleans user name profiles
 */
function parseStudentShortName(fullName) {
    if (!fullName) return "Student Profile";
    const parts = fullName.split(' ');
    return parts.slice(0, 2).join(' ');
}

/**
 * Returns ISO calendar dates in local Timezones
 */
function getLocalIsoDate() {
    const d = getCurrentDateTime();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Renders user-friendly date blocks
 */
function formatCalendarDateStr(isoString) {
    if (!isoString) return '';
    try {
        const parts = isoString.split('-');
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (err) {
        return isoString;
    }
}

/**
 * Evaluates standard active time slot indexes
 */
function isPeriodTimeMatch(timeRangeStr, activeTimeStr) {
    if (!timeRangeStr || !activeTimeStr) return false;

    const parts = timeRangeStr.split('-');
    if (parts.length !== 2) return false;

    const startVal = convertTimeToMinutes(parts[0].trim());
    const endVal = convertTimeToMinutes(parts[1].trim());
    const targetVal = convertTimeToMinutes(activeTimeStr);

    return targetVal >= startVal && targetVal <= endVal;
}

/**
 * Helper to convert hh:mm clock times into minutes relative to midnight
 */
function convertTimeToMinutes(timeStr) {
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;

    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    return hours * 60 + minutes;
}

/* ---------------- INTERACTIVE CHART.JS HELPER FUNCTIONS ---------------- */

// Global Chart instances tracking
window.charts = {};

function destroyChart(id) {
    if (window.charts && window.charts[id]) {
        window.charts[id].destroy();
        delete window.charts[id];
    }
}

function renderMiniProgressRing(id, value, maxVal, color) {
    destroyChart(id);
    const canvas = document.getElementById(id);
    if (!canvas) return;
    
    const percentage = maxVal > 0 ? (value / maxVal) * 100 : 0;
    const ctx = canvas.getContext('2d');
    
    window.charts[id] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [percentage, Math.max(0, 100 - percentage)],
                backgroundColor: [color, 'rgba(0, 0, 0, 0.03)'],
                borderWidth: 0,
                weight: 0.5
            }]
        },
        options: {
            cutout: '82%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
}

function renderOverviewMarksSummaryChart() {
    const id = 'chart-overview-marks-summary';
    destroyChart(id);
    const canvas = document.getElementById(id);
    if (!canvas) return;
    
    if (state.marks.length === 0) return;
    
    const labels = [];
    const percentageData = [];
    
    state.marks.forEach(item => {
        let courseObtained = 0;
        let courseMax = 0;
        const assessments = Object.keys(item.assessments);
        
        assessments.forEach(key => {
            const test = item.assessments[key];
            if (test.obtainedMarks !== null && !isNaN(test.obtainedMarks)) {
                courseObtained += test.obtainedMarks;
                courseMax += (test.maxMarks || 0);
            }
        });
        
        if (courseMax > 0) {
            labels.push(item.courseCode);
            const percentage = Math.round((courseObtained / courseMax) * 100);
            percentageData.push(percentage);
        }
    });
    
    const ctx = canvas.getContext('2d');
    window.charts[id] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Internal Marks %',
                    data: percentageData,
                    backgroundColor: '#f97316',
                    hoverBackgroundColor: '#ea580c',
                    borderRadius: 4,
                    borderWidth: 0,
                    barPercentage: 0.35
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    padding: 12,
                    titleFont: { family: 'Plus Jakarta Sans', weight: '700', size: 13 },
                    bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
                    callbacks: {
                        label: (context) => `Percentage: ${context.parsed.y}%`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 },
                        color: 'var(--text-secondary)'
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: 'rgba(0, 0, 0, 0.03)' },
                    ticks: {
                        font: { family: 'Plus Jakarta Sans', size: 11 },
                        color: 'var(--text-secondary)',
                        callback: (value) => `${value}%`
                    }
                }
            }
        }
    });
}

function renderOverviewAttendanceSummaryChart() {
    const id = 'chart-overview-attendance-summary';
    destroyChart(id);
    const canvas = document.getElementById(id);
    if (!canvas) return;
    
    if (state.attendance.length === 0) return;
    
    const labels = [];
    const attendanceData = [];
    
    state.attendance.forEach(item => {
        labels.push(item.code);
        let percent = item.attendance || 0;
        if (percent > 100) percent = Math.round((percent / 100) * 100) / 100;
        attendanceData.push(percent);
    });
    
    const ctx = canvas.getContext('2d');
    window.charts[id] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Attendance %',
                    data: attendanceData,
                    backgroundColor: '#475569',
                    hoverBackgroundColor: '#334155',
                    borderRadius: 4,
                    borderWidth: 0,
                    barPercentage: 0.35
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    padding: 12,
                    titleFont: { family: 'Plus Jakarta Sans', weight: '700', size: 13 },
                    bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
                    callbacks: {
                        label: (context) => `Attendance: ${context.parsed.y}%`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 },
                        color: 'var(--text-secondary)'
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: 'rgba(0, 0, 0, 0.03)' },
                    ticks: {
                        font: { family: 'Plus Jakarta Sans', size: 11 },
                        color: 'var(--text-secondary)',
                        callback: (value) => `${value}%`
                    }
                }
            }
        }
    });
}

function renderAttendanceSummaryCharts() {
    const barId = 'chart-attendance-bar';
    destroyChart(barId);
    const barCanvas = document.getElementById(barId);
    if (barCanvas && state.attendance.length > 0) {
        const labels = state.attendance.map(item => item.code);
        const data = state.attendance.map(item => {
            let pct = item.attendance || 0;
            return pct > 100 ? Math.round((pct / 100) * 100) / 100 : pct;
        });
        const colors = data.map(val => val < 75 ? 'rgba(244, 63, 94, 0.85)' : 'rgba(16, 185, 129, 0.85)');
        
        const ctx = barCanvas.getContext('2d');
        window.charts[barId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Attendance %',
                    data: data,
                    backgroundColor: colors,
                    borderRadius: 8,
                    barPercentage: 0.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        padding: 12,
                        callbacks: {
                            label: (context) => `Attendance: ${context.parsed.y}%`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 }, color: 'var(--text-secondary)' }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        grid: { color: 'rgba(0, 0, 0, 0.03)' },
                        ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: 'var(--text-secondary)' }
                    }
                }
            }
        });
    }

    const donutId = 'chart-attendance-donut';
    destroyChart(donutId);
    const donutCanvas = document.getElementById(donutId);
    if (donutCanvas && state.attendance.length > 0) {
        let totalPresent = 0;
        let totalConducted = 0;
        state.attendance.forEach(item => {
            totalPresent += (item.present || 0);
            totalConducted += (item.conducted || 0);
        });
        
        const totalAbsent = Math.max(0, totalConducted - totalPresent);
        
        const ctx = donutCanvas.getContext('2d');
        window.charts[donutId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Hours Attended', 'Hours Bunked'],
                datasets: [{
                    data: [totalPresent, totalAbsent],
                    backgroundColor: ['rgba(16, 185, 129, 0.85)', 'rgba(244, 63, 94, 0.85)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 }, color: 'var(--text-secondary)' }
                    },
                    tooltip: { padding: 12 }
                }
            }
        });
    }
}

function renderSubjectMarksCharts() {
    if (state.marks.length === 0) return;
    
    state.marks.forEach(item => {
        const id = `chart-marks-${item.courseCode}`;
        destroyChart(id);
        const canvas = document.getElementById(id);
        if (!canvas) return;
        
        const keys = Object.keys(item.assessments);
        if (keys.length === 0) return;
        
        const labels = [];
        const obtained = [];
        const maxVals = [];
        
        keys.forEach(k => {
            const test = item.assessments[k];
            labels.push(test.assessment);
            obtained.push(test.status === "ABSENT" ? 0 : (test.obtainedMarks || 0));
            maxVals.push(test.maxMarks || 0);
        });
        
        const ctx = canvas.getContext('2d');
        window.charts[id] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Score',
                        data: obtained,
                        backgroundColor: 'rgba(249, 115, 22, 0.85)',
                        borderRadius: 4,
                        barPercentage: 0.5
                    },
                    {
                        label: 'Max',
                        data: maxVals,
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        borderRadius: 4,
                        barPercentage: 0.5
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { padding: 10 }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Plus Jakarta Sans', size: 10 }, color: 'var(--text-muted)' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { family: 'Plus Jakarta Sans', weight: '600', size: 10 }, color: 'var(--text-secondary)' }
                    }
                }
            }
        });
    });
}

function getCourseCredit(courseTitle, courseCode) {
    if (!courseTitle && !courseCode) return 3;
    
    const cleanTitle = (courseTitle || '').toUpperCase().trim();
    const cleanCode = (courseCode || '').toUpperCase().trim();

    // 1. Check personalTimetable for official credit
    let match = (state.personalTimetable || []).find(p => {
        const pCode = (p.code || '').toUpperCase().trim();
        const pTitle = (p.course || '').toUpperCase().trim();
        return (cleanCode && pCode === cleanCode) || 
               (cleanTitle && pTitle && (cleanTitle.includes(pTitle) || pTitle.includes(cleanTitle)));
    });

    if (match && match.credit !== undefined && match.credit !== null && !isNaN(parseFloat(match.credit))) {
        return parseFloat(match.credit);
    }

    // 2. Check attendance for parsed credit
    match = (state.attendance || []).find(a => {
        const aCode = (a.code || '').toUpperCase().trim();
        const aTitle = (a.course || '').toUpperCase().trim();
        return (cleanCode && aCode === cleanCode) || 
               (cleanTitle && aTitle && (cleanTitle.includes(aTitle) || aTitle.includes(cleanTitle)));
    });

    if (match && match.credit !== undefined && match.credit !== null && !isNaN(parseFloat(match.credit))) {
        return parseFloat(match.credit);
    }

    // 3. Fallback heuristics for custom/unmapped subjects
    const targetText = (cleanCode + ' ' + cleanTitle).trim();
    if (targetText.includes('LAB') || targetText.includes('PRACTICAL') || targetText.includes('WORKSHOP') || cleanCode.endsWith('L') || cleanCode.endsWith('P')) {
        return 1.5;
    }
    if (targetText.includes('PROJECT') || targetText.includes('THESIS')) {
        return 4;
    }
    
    return 3;
}

function createToast(message, type) {
    // Disabled all popup notification toasts as per explicit user request
    return;
}

// ==========================================
// AUTOMATIC DATA SYNC & LIVE CLOCK TIMERS
// ==========================================
function updateLastSyncedDisplay() {
    const text = document.getElementById('sync-status-text');
    if (!text) return;
    const stored = parseInt(localStorage.getItem('srm_last_synced_time') || '0', 10);
    const timeToUse = stored > 0 ? stored : Date.now();
    const now = new Date(timeToUse);
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMins = String(minutes).padStart(2, '0');
    text.textContent = `Synced ${formattedHours}:${formattedMins} ${ampm}`;
}

function updateLiveClockAndSchedule() {
    renderDailyFocusHero();
    updateLastSyncedDisplay();
}

function triggerBackgroundDataRefresh() {
    const dot = document.getElementById('sync-status-dot');
    const text = document.getElementById('sync-status-text');

    if (dot) {
        dot.style.background = 'var(--accent-primary)';
        dot.style.boxShadow = '0 0 8px var(--accent-primary)';
    }
    if (text) text.textContent = 'Syncing...';

    fetch(getApiEndpoint('/api/sync'), {
        method: 'POST',
        credentials: 'include',
        headers: getApiHeaders()
    })
        .then(res => {
            if (!res.ok) {
                // Silent failure — never show expired banner from background sync
                return null;
            }
            return res.json();
        })
        .then(data => {
            if (data && data.success) {
                localStorage.setItem('srm_last_synced_time', Date.now().toString());
                updateApplicationState(data);
                updateStickySessionBanner(false);
            }
            // Silently ignore expired/stale — user has cached data displayed
        })
        .catch(err => {
            // Network error — silent. Never show banner from background sync.
            console.log('Background sync silent fallback:', err.message || err);
        })
        .finally(() => {
            if (dot) {
                dot.style.background = '#22c55e';
                dot.style.boxShadow = 'none';
            }
            updateLastSyncedDisplay();
        });
}

// 1. Live minute clock & schedule ticker (Every 1 Minute / 60,000ms)
setInterval(updateLiveClockAndSchedule, 60000);

// 2. Automatic data refresh (Every 3 Minutes / 180,000ms)
setInterval(triggerBackgroundDataRefresh, 180000);

// Initialize display
updateLastSyncedDisplay();

// ==========================================
// SAVED ACCOUNTS & QUICK SWITCHER SYSTEM
// ==========================================
function getSavedAccounts() {
    try {
        const raw = localStorage.getItem('srm_saved_accounts');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveAccountCredential(email, password, profile) {
    if (!email || !password) return;
    const accounts = getSavedAccounts();
    const cleanEmail = email.trim().toLowerCase();
    
    // Remove existing if matching email
    const filtered = accounts.filter(a => a.email.toLowerCase() !== cleanEmail);
    
    // Max 5 accounts: if 5 exist, remove oldest
    if (filtered.length >= 5) {
        filtered.shift();
    }

    const name = (profile && profile.name) ? profile.name : cleanEmail.split('@')[0];
    const regNo = (profile && profile.registerNumber) ? profile.registerNumber : '';
    const avatarChar = name ? name[0].toUpperCase() : 'S';

    filtered.push({
        id: Date.now().toString(),
        email: cleanEmail,
        password: password,
        name: name,
        regNo: regNo,
        avatarChar: avatarChar,
        lastUsed: new Date().toISOString()
    });

    try {
        localStorage.setItem('srm_saved_accounts', JSON.stringify(filtered));
        renderSavedAccounts();
    } catch (e) {
        console.warn('Failed to save account credential', e);
    }
}

function removeSavedAccount(id, event) {
    if (event) event.stopPropagation();
    let accounts = getSavedAccounts();
    accounts = accounts.filter(a => a.id !== id);
    try {
        localStorage.setItem('srm_saved_accounts', JSON.stringify(accounts));
        renderSavedAccounts();
    } catch (e) {
        console.warn('Failed to remove saved account', e);
    }
}

function loginWithSavedAccount(id) {
    const accounts = getSavedAccounts();
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;

    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const form = document.getElementById('login-form');

    if (emailInput && passInput && form) {
        emailInput.value = acc.email;
        passInput.value = acc.password;
        
        closeAccountSwitcherModal();
        showAuthScreen();
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
}

function renderSavedAccounts() {
    const accounts = getSavedAccounts();
    
    // 1. Render on Login Screen
    const section = document.getElementById('saved-accounts-section');
    const grid = document.getElementById('saved-accounts-grid');
    const countBadge = document.getElementById('saved-accounts-count-badge');

    if (countBadge) countBadge.textContent = `${accounts.length}/5 Saved`;

    if (accounts.length === 0) {
        if (section) section.classList.add('hidden');
    } else {
        if (section) section.classList.remove('hidden');
        if (grid) {
            grid.innerHTML = accounts.map(acc => `
                <div class="saved-account-card">
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                        <div class="saved-account-avatar">${acc.avatarChar}</div>
                        <div class="saved-account-info">
                            <span class="saved-account-name">${acc.name}</span>
                            <span class="saved-account-email">${acc.email}</span>
                        </div>
                    </div>
                    <div class="saved-account-actions">
                        <button type="button" class="btn-quick-login" onclick="loginWithSavedAccount('${acc.id}')">Sign In</button>
                        <button type="button" class="btn-remove-account" title="Remove saved account" onclick="removeSavedAccount('${acc.id}', event)">&times;</button>
                    </div>
                </div>
            `).join('');
        }
    }

    // 2. Render on In-App Switcher Modal
    const modalList = document.getElementById('app-saved-accounts-list');
    if (modalList) {
        if (accounts.length === 0) {
            modalList.innerHTML = `<div class="text-center py-16 text-muted font-sm">No saved accounts on this device yet.</div>`;
        } else {
            modalList.innerHTML = accounts.map(acc => `
                <div class="saved-account-card">
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                        <div class="saved-account-avatar">${acc.avatarChar}</div>
                        <div class="saved-account-info">
                            <span class="saved-account-name">${acc.name}</span>
                            <span class="saved-account-email">${acc.email}</span>
                        </div>
                    </div>
                    <div class="saved-account-actions">
                        <button type="button" class="btn-quick-login" onclick="loginWithSavedAccount('${acc.id}')">Switch</button>
                        <button type="button" class="btn-remove-account" title="Remove saved account" onclick="removeSavedAccount('${acc.id}', event)">&times;</button>
                    </div>
                </div>
            `).join('');
        }
    }
}

function openAccountSwitcherModal() {
    renderSavedAccounts();
    const modal = document.getElementById('account-switcher-modal');
    if (modal) {
        modal.classList.remove('hidden');
        updateGlobalBackdrop();
    }
}

function closeAccountSwitcherModal() {
    const modal = document.getElementById('account-switcher-modal');
    if (modal) {
        animateCloseElement(modal);
    }
}

function openAddNewAccountModal() {
    closeAccountSwitcherModal();
    showAuthScreen();
}

function setupSavedAccountsAndBannerBindings() {
    const switchBtn = document.getElementById('switch-accounts-btn');
    if (switchBtn) {
        switchBtn.addEventListener('click', openAccountSwitcherModal);
    }

    const closeBtn = document.getElementById('close-account-switcher-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAccountSwitcherModal);
    }

    const addAccountBtn = document.getElementById('btn-add-another-account');
    if (addAccountBtn) {
        addAccountBtn.addEventListener('click', openAddNewAccountModal);
    }

    const reauthBtn = document.getElementById('sticky-banner-reauth-btn');
    if (reauthBtn) {
        reauthBtn.addEventListener('click', openAuthModalForReauth);
    }

    const modal = document.getElementById('account-switcher-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAccountSwitcherModal();
        });
    }
}

// ==========================================
// STICKY SESSION EXPIRED BANNER SYSTEM
// ==========================================
function updateStickySessionBanner(isExpired) {
    const banner = document.getElementById('session-expired-sticky-banner');
    if (!banner) return;
    if (isExpired) {
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
}

function openAuthModalForReauth() {
    closeActivePopupOrModal();
    updateStickySessionBanner(false);

    // Pre-fill NetID if active student account exists
    const activeAcc = (typeof getActiveAccount === 'function') ? getActiveAccount() : null;
    const emailInput = document.getElementById('email');
    if (emailInput && activeAcc && activeAcc.id) {
        emailInput.value = activeAcc.id;
        const domainTag = document.getElementById('domain-tag');
        if (domainTag) domainTag.style.opacity = '0';
    }

    showAuthScreen();
}

// ==========================================
// MINIMAL & INFORMATIVE NOTIFICATION SYSTEM
// ==========================================
function triggerAppNotification({ title, body, tag = 'general' }) {
    if (!title || !body) return;

    // 1. Android Native Bridge
    if (window.AndroidNotificationBridge && typeof window.AndroidNotificationBridge.sendNativeNotification === 'function') {
        try {
            window.AndroidNotificationBridge.sendNativeNotification(title, body, tag);
        } catch (e) {
            console.warn('Native notification bridge failed', e);
        }
    }

    // 2. Web Browser Notification API
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            try {
                new Notification(title, { body, icon: 'icon-192.png', tag });
            } catch (e) {
                console.warn('Web notification failed', e);
            }
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    // 3. In-App Minimal Toast Fallback
    createToast(`${title}: ${body}`, 'info');
}

/**
 * Calculates the exact next upcoming class session for Today or Tomorrow from real state
 */
function getRealNextUpcomingClass() {
    if (!state.mergedTimetable || Object.keys(state.mergedTimetable).length === 0) return null;

    const now = getCurrentDateTime();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    // 1. Check Today's Day Order
    const todayDayOrder = getTodayDayOrder();
    const todaySlots = state.mergedTimetable[todayDayOrder] || [];

    for (let slot of todaySlots) {
        const pIndex = (slot.period || 1) - 1;
        const pt = periodTimings[pIndex];
        if (pt && pt.start) {
            const [sH, sM] = pt.start.split(':').map(Number);
            const startMins = sH * 60 + sM;

            if (startMins >= currentMins - 5) {
                return {
                    slot,
                    dayOrder: todayDayOrder,
                    dayLabel: 'Today',
                    startTime: pt.start,
                    minsLeft: Math.max(0, startMins - currentMins)
                };
            }
        }
    }

    // 2. Check Tomorrow's Day Order
    const tomorrowDayOrder = getTomorrowDayOrder();
    const tomorrowSlots = state.mergedTimetable[tomorrowDayOrder] || [];

    if (tomorrowSlots.length > 0) {
        const firstSlot = tomorrowSlots[0];
        const pIndex = (firstSlot.period || 1) - 1;
        const pt = periodTimings[pIndex];
        return {
            slot: firstSlot,
            dayOrder: tomorrowDayOrder,
            dayLabel: 'Tomorrow',
            startTime: pt ? pt.start : 'Morning',
            minsLeft: null
        };
    }

    return null;
}

/**
 * Evaluates and delivers informative notifications for upcoming classes, low attendance, marks & events using REAL DATA ONLY
 */
function evaluateAndSendSmartNotifications() {
    // 1. Next Class Reminder (Real Data Only)
    const nextClassData = getRealNextUpcomingClass();
    if (nextClassData && nextClassData.slot) {
        const s = nextClassData.slot;
        const courseName = s.course || s.code || 'Class Session';
        const room = s.room ? s.room.replace(/^Room\s+/i, '') : 'Room TBA';
        const periodStr = `P${s.period}`;
        
        let timeDesc = nextClassData.startTime;
        if (nextClassData.minsLeft !== null && nextClassData.minsLeft <= 20) {
            timeDesc = `in ${nextClassData.minsLeft} mins (${nextClassData.startTime})`;
        } else if (nextClassData.dayLabel === 'Tomorrow') {
            timeDesc = `Tomorrow at ${nextClassData.startTime}`;
        }

        const title = `Upcoming Class • ${periodStr} (${nextClassData.dayLabel})`;
        const body = `${courseName} ${timeDesc} • Room: ${room}`;
        
        const notifTag = `next_class_${nextClassData.dayOrder}_p${s.period}`;
        const lastSent = localStorage.getItem(`srm_notif_sent_${notifTag}`);
        if (!lastSent || (Date.now() - parseInt(lastSent, 10)) > 3600000) {
            triggerAppNotification({ title, body, tag: notifTag });
            localStorage.setItem(`srm_notif_sent_${notifTag}`, Date.now().toString());
        }
    }

    // 2. Low Attendance Warning (Real Data Only - Only if percentage < 75.0%)
    if (state.attendance && state.attendance.length > 0) {
        const lowAttnCourses = state.attendance.map(a => {
            const pct = getCourseAttendancePct(a);
            const code = a.subjectCode || a.courseCode || a.code || 'Course';
            const title = a.subjectTitle || a.courseName || a.course || code;
            const conducted = parseFloat(a.hoursConducted || a.totalClasses || a.conducted || 0);
            const attended = parseFloat(a.hoursAttended || a.attendedClasses || a.attended || 0);
            const marginTo75 = conducted > 0 ? Math.max(1, Math.ceil((0.75 * conducted - attended) / 0.25)) : 1;
            return { pct, code, title, conducted, attended, marginTo75 };
        }).filter(item => item.pct < 75.0);

        if (lowAttnCourses.length > 0) {
            lowAttnCourses.sort((a, b) => a.pct - b.pct);
            const worst = lowAttnCourses[0];
            const title = `Attendance Warning • ${worst.code}`;
            const body = `${worst.title} is at ${worst.pct}% (${worst.attended}/${worst.conducted}). ${worst.marginTo75} consecutive class(es) needed to reach 75%.`;
            
            const notifTag = `att_warning_${worst.code}`;
            const lastSent = localStorage.getItem(`srm_notif_sent_${notifTag}`);
            if (!lastSent || (Date.now() - parseInt(lastSent, 10)) > 14400000) {
                triggerAppNotification({ title, body, tag: notifTag });
                localStorage.setItem(`srm_notif_sent_${notifTag}`, Date.now().toString());
            }
        }
    }

    // 3. Newly Published Internal Marks (Real Data Only - Detects changes against local storage cache)
    if (state.marks && state.marks.length > 0) {
        let prevMarksHash = {};
        try {
            prevMarksHash = JSON.parse(localStorage.getItem('srm_notif_marks_cache') || '{}');
        } catch (e) {}

        const currentMarksHash = {};
        const newMarksPublished = [];

        state.marks.forEach(item => {
            const courseCode = item.courseCode || 'Course';
            const assessments = item.assessments || {};
            Object.keys(assessments).forEach(k => {
                const test = assessments[k];
                if (test && test.obtainedMarks !== null && test.obtainedMarks !== undefined && !isNaN(test.obtainedMarks)) {
                    const key = `${courseCode}_${k}`;
                    const scoreVal = `${test.obtainedMarks}/${test.maxMarks || 0}`;
                    currentMarksHash[key] = scoreVal;

                    if (prevMarksHash[key] === undefined && Object.keys(prevMarksHash).length > 0) {
                        newMarksPublished.push({
                            courseCode,
                            assessmentName: test.assessment || k,
                            scoreStr: scoreVal
                        });
                    }
                }
            });
        });

        localStorage.setItem('srm_notif_marks_cache', JSON.stringify(currentMarksHash));

        newMarksPublished.forEach(m => {
            const title = `Internal Marks Published • ${m.courseCode}`;
            const body = `${m.assessmentName}: Score ${m.scoreStr}`;
            triggerAppNotification({ title, body, tag: `marks_${m.courseCode}_${m.assessmentName}` });
        });
    }

    // 4. Upcoming Academic Planner Events (Real Data Only)
    if (state.planner && state.planner.length > 0) {
        const todayIso = getLocalIsoDate();
        const upcomingEvents = state.planner.filter(p => {
            return p.date >= todayIso && p.event && p.event.trim() !== '' && p.type !== 'OFF';
        });

        if (upcomingEvents.length > 0) {
            const nextEvent = upcomingEvents[0];
            const eventDateStr = formatCalendarDateStr(nextEvent.date);
            const title = `Academic Event • ${nextEvent.event}`;
            const body = `${formatEventType(nextEvent.type)} on ${eventDateStr} ${nextEvent.dayOrder && nextEvent.dayOrder !== '-' ? `(Day Order: DAY ${nextEvent.dayOrder})` : ''}`;
            
            const notifTag = `event_${nextEvent.date}_${nextEvent.event.substring(0, 10)}`;
            const lastSent = localStorage.getItem(`srm_notif_sent_${notifTag}`);
            if (!lastSent || (Date.now() - parseInt(lastSent, 10)) > 86400000) {
                triggerAppNotification({ title, body, tag: notifTag });
                localStorage.setItem(`srm_notif_sent_${notifTag}`, Date.now().toString());
            }
        }
    }
}