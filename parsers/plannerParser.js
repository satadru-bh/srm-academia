const cheerio = require("cheerio");

function parseAcademicPlanner(html) {
    console.log("[plannerParser] parseAcademicPlanner START");
    if (!html) {
        console.log("[plannerParser] HTML is empty/null, returning empty dataset.");
        return [];
    }

    const $outer = cheerio.load(html);
    let innerHtml = "";

    // Step 1: Detect and extract HTML encoded inside Zoho's zmlvalue attribute
    $outer(".zc-pb-embed-placeholder-content").each((i, el) => {
        const zml = $outer(el).attr("zmlvalue");
        if (zml) {
            innerHtml = zml;
        }
    });

    if (!innerHtml) {
        console.log("[plannerParser] zmlvalue element not detected. Fallback: scanning raw body.");
        innerHtml = html;
    }

    const $ = cheerio.load(innerHtml);
    const targetTable = $("table.planner_table");

    // Diagnostics requested by user
    console.log(`[plannerParser] Total table elements found in inner HTML: ${$("table").length}`);
    if (targetTable.length === 0) {
        console.log("[plannerParser] Warning: planner_table not found. Falling back to body search.");
    }

    const monthHeaders = [];
    const headerRow = targetTable.length ? targetTable.find("tr").first() : $("tr").first();

    // Step 2: Map monthly column offsets dynamically from the header row (e.g. "Jul '26", "Aug '26")
    headerRow.find("th, td").each((idx, el) => {
        const text = $(el).text().trim();
        const match = text.match(/([A-Za-z]{3})\s*'\s*(\d{2})/);
        if (match) {
            monthHeaders.push({
                cellIndex: idx, // The base cell index of this month block
                monthName: match[1],
                year: "20" + match[2]
            });
        }
    });

    console.log("[plannerParser] Mapped Month Columns:", monthHeaders);

    const events = [];
    const monthMap = { "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06", "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12" };
    const rows = targetTable.length ? targetTable.find("tr").slice(1) : $("tr").slice(1);

    // Step 3: Iterate through row blocks to extract events
    rows.each((i, row) => {
        const cells = $(row).find("td");
        if (cells.length < 15) return; // Skip non-data rows

        monthHeaders.forEach(meta => {
            const dateCol = meta.cellIndex - 2;
            const dayCol = meta.cellIndex - 1;
            const eventCol = meta.cellIndex;
            const doCol = meta.cellIndex + 1;

            const dayNumStr = cells.eq(dateCol).text().trim();
            const dayName = cells.eq(dayCol).text().trim();
            const rawEvent = cells.eq(eventCol).text().trim();
            const rawDo = cells.eq(doCol).text().trim();

            if (dayNumStr && /^\d+$/.test(dayNumStr)) {
                const dayNum = parseInt(dayNumStr, 10);
                const mm = monthMap[meta.monthName.toLowerCase()];
                const dd = String(dayNum).padStart(2, "0");
                const date = `${meta.year}-${mm}-${dd}`;

                const event = (rawEvent === "-" || !rawEvent) ? null : rawEvent.replace(/\s+/g, " ");

                let dayOrder = null;
                const cleanDo = rawDo.replace(/[^\d]/g, "");
                if (cleanDo) {
                    dayOrder = parseInt(cleanDo, 10);
                }

                // Type Classification matching Zoho planner indicators
                let type = "OTHER";
                if (event) {
                    const descLower = event.toLowerCase();
                    if (descLower.includes("holiday")) {
                        type = "HOLIDAY";
                    } else if (descLower.includes("last working day")) {
                        type = "LAST_WORKING_DAY";
                    } else if (descLower.includes("enrolment")) {
                        type = "ENROLMENT";
                    } else if (descLower.includes("commencement")) {
                        type = "COMMENCEMENT";
                    }
                } else if (dayOrder !== null) {
                    type = "WORKING_DAY";
                }

                // Exclude empty non-event entries to keep arrays clean
                if (event || dayOrder !== null) {
                    events.push({
                        date,
                        day: dayName,
                        event,
                        dayOrder,
                        type
                    });
                }
            }
        });
    });

    // Sort planner events chronologically
    events.sort((a, b) => a.date.localeCompare(b.date));

    console.log(`[plannerParser] parseAcademicPlanner DONE. Extracted ${events.length} unified records.`);
    return events;
}

module.exports = { parseAcademicPlanner };