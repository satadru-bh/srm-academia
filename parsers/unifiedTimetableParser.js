const cheerio = require("cheerio");

const periodTimings = [
    "08:00 - 08:50", // 1
    "08:50 - 09:40", // 2
    "09:45 - 10:35", // 3
    "10:40 - 11:30", // 4
    "11:35 - 12:25", // 5
    "12:30 - 01:20", // 6
    "01:25 - 02:15", // 7
    "02:20 - 03:10", // 8
    "03:10 - 04:00", // 9
    "04:00 - 04:50", // 10
    "04:50 - 05:30", // 11
    "05:30 - 06:10"  // 12
];

function parseUnifiedTimetable(html, id = "unifiedTimetable") {
    if (!html) return {};

    const $ = cheerio.load(html);
    const dayMap = {};

    const rows = $("tr");

    rows.each((i, row) => {
        const cells = [];
        $(row).find("td, th").each((j, cell) => {
            cells.push($(cell).text().trim());
        });

        if (cells.length > 2 && /^Day\s*\d/i.test(cells[0])) {
            const day = cells[0].toUpperCase();
            dayMap[day] = [];

            cells.slice(1).forEach((slotCode, idx) => {
                const cleanSlot = slotCode.trim().toUpperCase();
                const timeRange = periodTimings[idx] || "Unknown";

                dayMap[day].push({
                    period: idx + 1,
                    time: timeRange,
                    slot: cleanSlot !== "-" ? cleanSlot : ""
                });
            });
        }
    });

    return dayMap;
}

module.exports = { parseUnifiedTimetable, periodTimings };