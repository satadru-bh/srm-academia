const express = require("express");
const session = require("express-session");
const axios = require("axios");
const cheerio = require("cheerio");

const { CookieJar } = require("tough-cookie");
const path = require("path");

// Load modular parsers
const { parseAttendance } = require("./parsers/attendanceParser");
const { parseMarks } = require("./parsers/marksParser");
const { parsePersonalTimetable } = require("./parsers/personalTimetableParser");
const { parseUnifiedTimetable } = require("./parsers/unifiedTimetableParser");
const { parseAcademicPlanner } = require("./parsers/plannerParser");

const fs = require("fs");

const app = express();

// CORS Headers Middleware (Enables native Android App & WebView API access)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && origin !== "null") {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
        res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-User-Email, *");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// Parse JSON request bodies
app.use(express.json());

// Express Session Middleware - Secure Browser Session Management
app.use(session({
    secret: process.env.SESSION_SECRET || "srm-academia-plus-secure-session-key-2026",
    resave: true,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production" && process.env.ENABLE_HTTPS === "true",
        maxAge: 30 * 24 * 60 * 60 * 1000 // Persistent 30-day session cookie
    }
}));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, "public")));

// Import Modular Production-Grade Session Management Architecture
const {
    CookieStore,
    CacheStore,
    LoginMutex,
    SessionValidator,
    AuthenticationManager,
    RequestExecutor,
    DeviceSessionStore,
    SessionLogger,
    createSrmClient
} = require("./session");





/**
 * Universal Zoho HTML Decoder
 */
function decodeZohoHtml(html, pageName = "Unknown") {
    if (!html) return "";

    const match = html.match(/pageSanitizer\.sanitize\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*\)/s);

    if (match && match[2]) {
        const escapedContent = match[2];
        const decoded = escapedContent
            .replace(/\\x22/g, '"')
            .replace(/\\x27/g, "'")
            .replace(/\\\//g, "/")
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\r/g, "\r")
            .replace(/\\-/g, "-")
            .replace(/\\'/g, "'")
            .replace(/\\/g, "'")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");

        return decoded;
    }
    return html;
}

/**
 * Dynamic Schedule Merger Logic with Numerical Sorting
 */
function mergeTimetables(personal, unifiedBatch) {
    const merged = {};
    if (!unifiedBatch || !personal) return merged;

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
                        credit: match.credit !== undefined ? match.credit : 3,
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
                        credit: match.credit !== undefined ? match.credit : 3,
                        category: match.category || "",
                        faculty: match.faculty,
                        room: match.room
                    });
                }
            });
        }

        // Numeric chronological sort check
        merged[day].sort((a, b) => a.period - b.period);
    });

    return merged;
}

/**
 * Fetch helper with robust 20-second timeout
 */
async function fetchPage(client, pageName) {
    const url = `https://academia.srmist.edu.in/srm_university/academia-academic-services/page/${pageName}`;
    try {
        const response = await client.get(url, {
            headers: { "X-Requested-With": "XMLHttpRequest" },
            timeout: 20000
        });
        return response.data;
    } catch (err) {
        return null;
    }
}

/**
 * Scraper Execution Block
 */
async function scrapeAllData(client) {
    const [attendanceRaw, personalTTRaw, plannerRaw] = await Promise.all([
        fetchPage(client, "My_Attendance"),
        fetchPage(client, "My_Time_Table_2023_24"),
        fetchPage(client, "Academic_Planner_2026_27_ODD")
    ]);

    const attendanceDecoded = decodeZohoHtml(attendanceRaw, "My_Attendance");
    const personalTTDecoded = decodeZohoHtml(personalTTRaw, "My_Time_Table");
    const plannerDecoded = plannerRaw && plannerRaw.includes("pageSanitizer.sanitize")
        ? decodeZohoHtml(plannerRaw, "Academic_Planner")
        : plannerRaw;

    const parsedPersonal = parsePersonalTimetable(personalTTDecoded);
    const studentInfo = parsedPersonal.studentInfo || {};
    const personalTT = parsedPersonal.timetable || [];

    const activeBatchPage = studentInfo.batch === 1
        ? "Unified_Time_Table_2025_Batch_1"
        : "Unified_Time_Table_2025_batch_2";

    const unifiedTTRaw = await fetchPage(client, activeBatchPage);
    const unifiedTTDecoded = decodeZohoHtml(unifiedTTRaw, activeBatchPage);

    const attendance = parseAttendance(attendanceDecoded);
    const marks = parseMarks(attendanceDecoded);
    const unifiedTT = parseUnifiedTimetable(unifiedTTDecoded, activeBatchPage);
    const planner = parseAcademicPlanner(plannerDecoded);

    // Merge Timetable Slots
    const mergedTimetable = mergeTimetables(personalTT, unifiedTT);

    return {
        studentInfo,
        attendance,
        marks,
        personalTimetable: personalTT,
        unifiedTimetable: unifiedTT,
        mergedTimetable,
        planner
    };
}

/**
 * EASTER EGG DEMO MODE DATA GENERATOR
 * Generates full, hyper-realistic placeholder data for design testing
 */
function generateDemoData() {
    const studentInfo = {
        name: "Alex Mercer (Demo)",
        registrationNumber: "RA2311003010999",
        department: "Computer Science & Engineering",
        program: "B.Tech Computer Science & Engineering w/ Spcl. in AI & Machine Learning",
        semester: "4",
        section: "A1",
        batch: 1,
        advisor: "Dr. Alan Turing (Demo)",
        email: "imnotfromsrm67@srmist.edu.in"
    };

    const attendance = [
        {
            code: "21CSC201J",
            title: "Data Structures and Algorithms",
            category: "Core Theory",
            slot: "D",
            hoursConducted: 40,
            hoursAttended: 36,
            hoursAbsent: 4,
            percentage: 90.0,
            requiredHours: 0,
            marginHours: 6,
            faculty: "Dr. Grace Hopper",
            room: "TP 706"
        },
        {
            code: "21CSC202J",
            title: "Computer Organization and Architecture",
            category: "Core Theory",
            slot: "B / X",
            hoursConducted: 36,
            hoursAttended: 28,
            hoursAbsent: 8,
            percentage: 77.78,
            requiredHours: 0,
            marginHours: 1,
            faculty: "Prof. John von Neumann",
            room: "TP 706"
        },
        {
            code: "21MAB201T",
            title: "Discrete Mathematics & Linear Algebra",
            category: "Basic Science",
            slot: "A",
            hoursConducted: 32,
            hoursAttended: 32,
            hoursAbsent: 0,
            percentage: 100.0,
            requiredHours: 0,
            marginHours: 8,
            faculty: "Dr. Srinivasa Ramanujan",
            room: "UB 502"
        },
        {
            code: "21LEM201T",
            title: "Professional Ethics and Values",
            category: "Humanities",
            slot: "E",
            hoursConducted: 24,
            hoursAttended: 18,
            hoursAbsent: 6,
            percentage: 75.0,
            requiredHours: 0,
            marginHours: 0,
            faculty: "Dr. Maya Angelou",
            room: "UB 301"
        },
        {
            code: "21CSS201T",
            title: "Software Engineering & Agile Methodology",
            category: "Core Specialization",
            slot: "C",
            hoursConducted: 32,
            hoursAttended: 22,
            hoursAbsent: 10,
            percentage: 68.75,
            requiredHours: 2,
            marginHours: 0,
            faculty: "Prof. Martin Fowler",
            room: "TP 706"
        },
        {
            code: "21CSP201J",
            title: "Object Oriented Programming in C++",
            category: "Core Practical",
            slot: "P1-P2",
            hoursConducted: 40,
            hoursAttended: 40,
            hoursAbsent: 0,
            percentage: 100.0,
            requiredHours: 0,
            marginHours: 10,
            faculty: "Dr. Bjarne Stroustrup",
            room: "Tech Park Lab 3"
        },
        {
            code: "21EES201T",
            title: "Environmental Science & Sustainability",
            category: "General Mandatory",
            slot: "F",
            hoursConducted: 16,
            hoursAttended: 15,
            hoursAbsent: 1,
            percentage: 93.75,
            requiredHours: 0,
            marginHours: 3,
            faculty: "Dr. Rachel Carson",
            room: "UB 204"
        },
        {
            code: "21GEB201T",
            title: "Indian Constitution & Society",
            category: "Mandatory Non-Credit",
            slot: "G",
            hoursConducted: 12,
            hoursAttended: 12,
            hoursAbsent: 0,
            percentage: 100.0,
            requiredHours: 0,
            marginHours: 3,
            faculty: "Prof. B.R. Ambedkar",
            room: "UB 101"
        }
    ];

    const marks = [
        {
            code: "21CSC201J",
            course: "Data Structures and Algorithms",
            assessments: [
                { name: "Cycle Test 1", score: 18.5, max: 20 },
                { name: "Cycle Test 2", score: 19.0, max: 20 },
                { name: "Assignment 1", score: 10.0, max: 10 },
                { name: "Lab Continuous Assessment", score: 48.0, max: 50 }
            ],
            totalScored: 95.5,
            totalMax: 100,
            percentage: 95.5
        },
        {
            code: "21CSC202J",
            course: "Computer Organization and Architecture",
            assessments: [
                { name: "Cycle Test 1", score: 15.0, max: 20 },
                { name: "Cycle Test 2", score: 16.5, max: 20 },
                { name: "Assignment 1", score: 9.0, max: 10 },
                { name: "Lab Continuous Assessment", score: 42.0, max: 50 }
            ],
            totalScored: 82.5,
            totalMax: 100,
            percentage: 82.5
        },
        {
            code: "21MAB201T",
            course: "Discrete Mathematics & Linear Algebra",
            assessments: [
                { name: "Cycle Test 1", score: 20.0, max: 20 },
                { name: "Cycle Test 2", score: 20.0, max: 20 },
                { name: "Assignment 1", score: 10.0, max: 10 }
            ],
            totalScored: 50.0,
            totalMax: 50,
            percentage: 100.0
        },
        {
            code: "21CSS201T",
            course: "Software Engineering & Agile Methodology",
            assessments: [
                { name: "Cycle Test 1", score: 13.0, max: 20 },
                { name: "Cycle Test 2", score: 14.0, max: 20 },
                { name: "Quiz 1", score: 8.0, max: 10 }
            ],
            totalScored: 35.0,
            totalMax: 50,
            percentage: 70.0
        }
    ];

    const personalTimetable = [
        { slot: "D", code: "21CSC201J", course: "Data Structures and Algorithms", credit: 4, category: "Core Theory", faculty: "Dr. Grace Hopper", room: "TP 706" },
        { slot: "B", code: "21CSC202J", course: "Computer Organization and Architecture", credit: 4, category: "Core Theory", faculty: "Prof. John von Neumann", room: "TP 706" },
        { slot: "A", code: "21MAB201T", course: "Discrete Mathematics & Linear Algebra", credit: 4, category: "Basic Science", faculty: "Dr. Srinivasa Ramanujan", room: "UB 502" },
        { slot: "E", code: "21LEM201T", course: "Professional Ethics and Values", credit: 2, category: "Humanities", faculty: "Dr. Maya Angelou", room: "UB 301" },
        { slot: "C", code: "21CSS201T", course: "Software Engineering & Agile Methodology", credit: 3, category: "Core Specialization", faculty: "Prof. Martin Fowler", room: "TP 706" },
        { slot: "P1-P2", code: "21CSP201J", course: "Object Oriented Programming in C++", credit: 2, category: "Core Practical", faculty: "Dr. Bjarne Stroustrup", room: "Tech Park Lab 3" }
    ];

    const unifiedTimetable = {
        "DAY 1": [
            { period: 1, time: "8:00 AM - 8:50 AM", slot: "A" },
            { period: 2, time: "8:50 AM - 9:40 AM", slot: "B" },
            { period: 3, time: "9:45 AM - 10:35 AM", slot: "C" },
            { period: 4, time: "10:40 AM - 11:30 AM", slot: "D" },
            { period: 7, time: "1:25 PM - 2:15 PM", slot: "P1-P2" },
            { period: 8, time: "2:20 PM - 3:10 PM", slot: "P1-P2" }
        ],
        "DAY 2": [
            { period: 1, time: "8:00 AM - 8:50 AM", slot: "B" },
            { period: 2, time: "8:50 AM - 9:40 AM", slot: "C" },
            { period: 3, time: "9:45 AM - 10:35 AM", slot: "D" },
            { period: 4, time: "10:40 AM - 11:30 AM", slot: "E" }
        ],
        "DAY 3": [
            { period: 1, time: "8:00 AM - 8:50 AM", slot: "C" },
            { period: 2, time: "8:50 AM - 9:40 AM", slot: "D" },
            { period: 3, time: "9:45 AM - 10:35 AM", slot: "E" },
            { period: 4, time: "10:40 AM - 11:30 AM", slot: "A" }
        ],
        "DAY 4": [
            { period: 1, time: "8:00 AM - 8:50 AM", slot: "D" },
            { period: 2, time: "8:50 AM - 9:40 AM", slot: "B" },
            { period: 3, time: "9:45 AM - 10:35 AM", slot: "C" },
            { period: 5, time: "11:35 AM - 12:25 PM", slot: "A" }
        ],
        "DAY 5": [
            { period: 1, time: "8:00 AM - 8:50 AM", slot: "E" },
            { period: 2, time: "8:50 AM - 9:40 AM", slot: "A" },
            { period: 3, time: "9:45 AM - 10:35 AM", slot: "B" },
            { period: 4, time: "10:40 AM - 11:30 AM", slot: "C" }
        ]
    };

    const mergedTimetable = mergeTimetables(personalTimetable, unifiedTimetable);

    const planner = [];
    const dayOrderSequence = ["DAY 1", "DAY 2", "DAY 3", "DAY 4", "DAY 5"];
    let dayOrderIdx = 0;

    for (let d = 1; d <= 31; d++) {
        const dateStr = `2026-07-${d < 10 ? '0' + d : d}`;
        const dayOfWeek = new Date(2026, 6, d).getDay();

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            planner.push({
                date: dateStr,
                dayOrder: "HOLIDAY",
                event: dayOfWeek === 6 ? "Weekend Off (Sat)" : "Weekend Off (Sun)",
                isHoliday: true
            });
        } else if (d === 2) {
            planner.push({
                date: dateStr,
                dayOrder: "HOLIDAY",
                event: "Gandhi Jayanthi - Holiday",
                isHoliday: true
            });
        } else if (d === 19) {
            planner.push({
                date: dateStr,
                dayOrder: "HOLIDAY",
                event: "Ayutha Pooja - Holiday",
                isHoliday: true
            });
        } else if (d === 20) {
            planner.push({
                date: dateStr,
                dayOrder: "HOLIDAY",
                event: "Vijaya Dasami - Holiday",
                isHoliday: true
            });
        } else {
            const currentDayOrder = dayOrderSequence[dayOrderIdx % 5];
            dayOrderIdx++;
            planner.push({
                date: dateStr,
                dayOrder: currentDayOrder,
                event: `Regular Academic Day (${currentDayOrder})`,
                isHoliday: false
            });
        }
    }

    return {
        isDemo: true,
        studentInfo,
        attendance,
        marks,
        personalTimetable,
        unifiedTimetable,
        mergedTimetable,
        planner
    };
}

/**
 * Authentication Entry Point - Single Source of Truth Session Architecture
 */
app.post(["/api/login", "/login"], async (req, res) => {
    let { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, error: "NetID / Email and Password are required." });
    }

    const rawEmail = String(email).toLowerCase().trim();
    const cleanPass = String(password).trim();
    const cleanEmail = CookieStore.normalizeEmail(rawEmail);

    // EASTER EGG DEMO MODE LOGIN CHECK - TOP PRIORITY GUARD
    if ((rawEmail === "imnotfromsrm67" || cleanEmail === "imnotfromsrm67@srmist.edu.in" || rawEmail.startsWith("imnotfromsrm67")) && cleanPass === "skibidi1234") {
        SessionLogger.info('Server', `Easter Egg Demo Mode activated for user ${cleanEmail}!`);
        req.session.authenticated = true;
        req.session.email = cleanEmail;
        req.session.isDemo = true;
        DeviceSessionStore.bindDevice(req.session.id, cleanEmail);

        const demoPayload = generateDemoData();
        return req.session.save(() => {
            res.json({
                success: true,
                ...demoPayload
            });
        });
    }

    try {
        // Authenticate via AuthenticationManager (reuses CookieJar if valid, locks Mutex if new login needed)
        const result = await AuthenticationManager.login(cleanEmail, cleanPass, scrapeAllData);

        // Bind App Device Session
        req.session.authenticated = true;
        req.session.email = cleanEmail;
        DeviceSessionStore.bindDevice(req.session.id, cleanEmail);

        req.session.save((saveErr) => {
            if (saveErr) SessionLogger.error('Server', 'Session save error', saveErr);
            res.json(result);
        });

    } catch (err) {
        let userMessage = "Authentication failed. Please check your credentials and try again.";
        const msg = err.message || "";

        if (msg.includes("User lookup response failed") || msg.includes("lookup")) {
            userMessage = "Account not found or SRM daily sign-in limit reached. Please verify your NetID or try again shortly.";
        } else if (msg.includes("limit") || msg.includes("rate") || msg.includes("maximum") || msg.includes("exceeded")) {
            userMessage = "SRM Portal daily sign-in limit reached for this account. Please wait or log in via SRM portal directly.";
        } else if (msg.includes("Invalid password") || msg.includes("Failed password check") || msg.includes("SI302") || msg.includes("SI303") || msg.includes("primary")) {
            userMessage = "Incorrect password or SRM daily sign-in limit reached. Please verify your password.";
        } else if (msg.includes("Domain is not trusted")) {
            userMessage = "Security validation triggered by SRM portal. Please verify your credentials or try logging in directly.";
        } else if (msg.includes("timeout") || msg.includes("ETIMEDOUT") || msg.includes("ECONNRESET") || msg.includes("ECONNREFUSED")) {
            userMessage = "Connection to SRM Academia timed out. Please try again shortly.";
        } else if (msg.includes("CSRF") || msg.includes("tokens")) {
            userMessage = "Sign-in session expired. Please attempt sign-in again.";
        }

        SessionLogger.error('Server', `Login failed for ${cleanEmail}: ${msg}`);
        return res.status(401).json({ success: false, error: userMessage, debug: msg });
    }
});

/**
 * Data Refresh Sync Endpoint - Resilient Fetching & Stale Cache Fallback
 */
app.all(["/api/sync", "/sync", "/api/attendance", "/attendance"], async (req, res) => {
    try {
        if (req.session && req.session.isDemo) {
            SessionLogger.debug('Server', `Demo mode active for session ${req.session.id}. Returning mock placeholder payload.`);
            return res.json({ success: true, ...generateDemoData() });
        }

        const sessionId = req.session ? req.session.id : null;

        // Resolve target account email across Session, Device Sessions, Headers & Fallbacks
        let targetEmail = (req.session ? req.session.email : null) || req.headers['x-user-email'] || (req.body && req.body.email);
        if (!targetEmail && sessionId) {
            targetEmail = DeviceSessionStore.getAccountEmail(sessionId);
        }
        if (!targetEmail) {
            const recent = CookieStore.getMostRecent();
            if (recent) targetEmail = recent.email;
        }

        // Resolve registration numbers (e.g. ra2511033010043) to primary NetID email (e.g. sb7956@srmist.edu.in)
        targetEmail = CookieStore.resolveEmail(targetEmail);

        if (!targetEmail) {
            return res.status(401).json({ success: false, expired: true, error: "Session has expired." });
        }

        // Execute resilient data fetch via RequestExecutor
        const result = await RequestExecutor.executeSync(targetEmail, scrapeAllData);

        if (result && result.expired) {
            // Unbind invalid/expired device session binding so device doesn't get trapped with stale binding
            if (sessionId) {
                DeviceSessionStore.logoutDevice(sessionId);
            }
            return res.status(401).json(result);
        }

        // Bind current device session ONLY on successful sync
        if (sessionId && result && result.success) {
            DeviceSessionStore.bindDevice(sessionId, targetEmail);
        }

        return res.json(result || { success: false, error: "Sync returned empty result." });
    } catch (err) {
        SessionLogger.error('Server', 'Unhandled exception in /api/sync', err);
        return res.status(500).json({ success: false, error: "SRM Sync Error: " + (err.message || err) });
    }
});

/**
 * Logout Endpoint - Independent Device & All-Devices Logout Engine
 */
app.post(["/api/logout", "/logout"], (req, res) => {
    try {
        const sessionId = req.session ? req.session.id : null;
        const targetEmail = req.headers['x-user-email'] || (req.session ? req.session.email : null) || (sessionId ? DeviceSessionStore.getAccountEmail(sessionId) : null);
        const logoutAll = req.body && (req.body.allDevices === true || req.body.allDevices === 'true');

        if (logoutAll && targetEmail) {
            // Logout account from ALL devices & destroy shared SRM CookieJar
            DeviceSessionStore.logoutAllDevices(targetEmail);
        } else if (sessionId) {
            // Logout ONLY this device's app session. Shared SRM CookieJar remains intact.
            DeviceSessionStore.logoutDevice(sessionId);
        }

        if (req.session) {
            req.session.destroy(err => {
                if (err) {
                    SessionLogger.error('Server', `Error destroying Express session ${sessionId}`, err);
                    return res.status(500).json({ success: false, error: "Could not log out." });
                }
                res.clearCookie("connect.sid");
                SessionLogger.info('Server', `Successfully logged out device session ${sessionId}.`);
                res.json({ success: true, message: "Logged out successfully" });
            });
        } else {
            res.clearCookie("connect.sid");
            res.json({ success: true, message: "Logged out successfully" });
        }
    } catch (err) {
        SessionLogger.error('Server', 'Unhandled exception in /api/logout', err);
        return res.status(500).json({ success: false, error: "Logout Error: " + (err.message || err) });
    }
});

const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`SRM Academia+ Server running on port ${PORT}`);
    });
}


module.exports = app;