const cheerio = require("cheerio");

function cleanCourseCode(code) {
    if (!code) return "";
    return code.replace(/(Regular|Practical|Theory|Project|Online)$/i, "").trim();
}

function parseAttendance(html) {
    console.log("[attendanceParser] parseAttendance START");
    if (!html) {
        console.log("[attendanceParser] HTML is empty/null");
        return [];
    }

    const $ = cheerio.load(html);
    let targetTable = null;
    let targetHeaders = [];

    // Diagnostic table count logging
    const tables = $("table");
    console.log(`[attendanceParser] Found ${tables.length} total tables on page.`);

    // Match the correct table based on specific attendance headers
    $("table").each((i, table) => {
        const headers = [];
        $(table).find("tr").first().find("td, th").each((j, el) => {
            headers.push($(el).text().trim().toLowerCase());
        });

        const isAttendance = headers.some(h => h.includes("code")) &&
            headers.some(h => h.includes("title") || h.includes("subject")) &&
            headers.some(h => h.includes("attn") || h.includes("attendance") || h.includes("%"));

        if (isAttendance) {
            targetTable = table;
            targetHeaders = headers;
            console.log(`[attendanceParser] Match success. Selecting Table Index: ${i}`);
        }
    });

    if (!targetTable) {
        console.log("[attendanceParser] Warning: Target table not found via header match.");
        return [];
    }

    const headers = [];
    $(targetTable).find("tr").first().find("td, th").each((idx, el) => {
        headers.push($(el).text().trim().toLowerCase());
    });

    const codeIdx = headers.findIndex(h => h.includes("code"));
    const titleIdx = headers.findIndex(h => h.includes("title") || h.includes("subject") || (h.includes("course") && !h.includes("code")));
    const creditIdx = headers.findIndex(h => h.includes("credit"));
    const catIdx = headers.findIndex(h => h.includes("category") || h.includes("type"));
    const facultyIdx = headers.findIndex(h => h.includes("faculty") || h.includes("teacher") || h.includes("staff"));
    const slotIdx = headers.findIndex(h => h.includes("slot"));
    const roomIdx = headers.findIndex(h => h.includes("room") || h.includes("class"));

    const pctIdx = headers.findIndex(h => h.includes("%") || h.includes("percentage") || h.includes("pct") || h.includes("attn %") || h.includes("att %"));
    const conductedIdx = headers.findIndex(h => h.includes("conducted") || h.includes("total hours") || h.includes("hours conducted"));
    const presentIdx = headers.findIndex((h, idx) => idx !== pctIdx && idx !== conductedIdx && (h.includes("present") || h.includes("attended") || h.includes("hours attended") || h.includes("hours present") || h.includes("att hours")));

    const attendanceRecords = [];

    $(targetTable).find("tr").slice(1).each((i, row) => {
        const cells = $(row).find("td");
        if (cells.length < 5) return;

        const getVal = (mappedIdx, defaultIdx) => {
            const idx = mappedIdx !== -1 ? mappedIdx : defaultIdx;
            return cells[idx] ? $(cells[idx]).text().trim() : "";
        };

        const rawCode = getVal(codeIdx, 1);
        if (!/^\d{2}[A-Z]/i.test(rawCode)) return;

        const code = cleanCourseCode(rawCode);
        const course = getVal(titleIdx, 2);

        let credit = 3;
        const creditStr = getVal(creditIdx, -1);
        if (creditStr && !isNaN(parseFloat(creditStr))) {
            credit = parseFloat(creditStr);
        }

        const category = getVal(catIdx, 3);

        let faculty = getVal(facultyIdx, 4);
        faculty = faculty.replace(/\(\d+\)/g, "").trim();

        const slot = getVal(slotIdx, 5);
        const room = getVal(roomIdx, 6);

        const conductedStr = getVal(conductedIdx, 7);
        const presentStr = getVal(presentIdx, 8);
        const pctStr = getVal(pctIdx, 10);

        let conducted = conductedStr ? parseInt(conductedStr.replace(/[^\d]/g, ""), 10) : null;
        if (isNaN(conducted)) conducted = null;

        let present = presentStr ? parseInt(presentStr.replace(/[^\d]/g, ""), 10) : null;
        if (isNaN(present)) present = null;

        let percentage = null;
        if (pctStr) {
            const match = pctStr.match(/(\d+(?:\.\d+)?)/);
            if (match) {
                let parsed = parseFloat(match[1]);
                if (!isNaN(parsed)) {
                    if (parsed > 100) {
                        parsed = parsed / 100;
                    }
                    percentage = Math.round(parsed * 100) / 100;
                }
            }
        }

        // Safety fix: If present count exceeds conducted count (e.g. if percentage column was erroneously parsed), sanitize present count
        if (conducted !== null && conducted >= 0) {
            if (present !== null && present > conducted && percentage !== null) {
                present = Math.round((percentage / 100) * conducted);
            }
        }

        if ((percentage === null || isNaN(percentage)) && conducted !== null && present !== null && conducted > 0) {
            percentage = Math.round((present / conducted) * 10000) / 100;
        }

        attendanceRecords.push({
            code,
            course,
            credit,
            category,
            faculty,
            slot,
            room,
            conducted,
            present,
            attendance: percentage
        });
    });

    console.log(`[attendanceParser] parseAttendance DONE. Extracted ${attendanceRecords.length} records.`);
    return attendanceRecords;
}

module.exports = { parseAttendance, cleanCourseCode };