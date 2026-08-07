const cheerio = require("cheerio");
const { cleanCourseCode } = require("./attendanceParser");

function parseMarks(html) {
    console.log("[marksParser] parseMarks START");
    if (!html) {
        console.log("[marksParser] HTML is empty/null, returning empty array.");
        return [];
    }

    const $ = cheerio.load(html);
    let targetTable = null;

    // Locate the Internal Marks Table dynamically (Table C)
    $("table").each((i, table) => {
        const headers = [];
        $(table).find("tr").first().children("td, th").each((j, el) => {
            headers.push($(el).text().trim().toLowerCase());
        });

        const isMarks = headers.some(h => h.includes("course code")) &&
            headers.some(h => h.includes("course type") || h.includes("type")) &&
            headers.some(h => h.includes("performance") || h.includes("test"));

        if (isMarks) {
            targetTable = table;
        }
    });

    if (!targetTable) {
        targetTable = $("table");
    }

    const marksMap = {};
    const courseCodeRegex = /^\d{2}[A-Z0-9]{5,15}$/i;

    $(targetTable).find("tr").slice(1).each((i, row) => {
        const cells = $(row).children("td");
        if (cells.length < 3) return;

        const rawCode = $(cells[0]).text().trim();
        if (!courseCodeRegex.test(rawCode)) return;

        const code = cleanCourseCode(rawCode);
        const courseType = $(cells[1]).text().trim();

        if (!marksMap[code]) {
            marksMap[code] = {
                courseCode: code,
                courseType,
                assessments: {}
            };
        }

        // Search for all cell blocks containing strong elements inside the row descendants
        $(row).find("td").each((j, td) => {
            const strongTag = $(td).find("strong");
            if (strongTag.length > 0) {
                const strongText = strongTag.text().trim();

                if (strongText && strongText.includes("/")) {
                    const parts = strongText.split("/");
                    const assessment = parts[0].trim();
                    const maxMarks = parseFloat(parts[1]) || null;

                    // Clone the wrapper element, discard strong tags, and extract only sibling text nodes
                    const obtainedText = $(td)
                        .clone()
                        .find("strong")
                        .remove()
                        .end()
                        .text()
                        .trim();

                    let obtainedMarks = null;
                    let status = "PRESENT";

                    if (obtainedText) {
                        if (obtainedText.toLowerCase().includes("abs") || obtainedText.toLowerCase().includes("ab")) {
                            status = "ABSENT";
                        } else {
                            obtainedMarks = parseFloat(obtainedText);
                            if (isNaN(obtainedMarks)) {
                                obtainedMarks = null;
                            }
                        }
                    }

                    if (assessment) {
                        marksMap[code].assessments[assessment] = {
                            assessment,
                            maxMarks,
                            obtainedMarks,
                            status
                        };
                    }
                }
            }
        });
    });

    return Object.values(marksMap);
}

module.exports = { parseMarks };