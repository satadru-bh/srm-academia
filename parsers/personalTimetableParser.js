const cheerio = require("cheerio");
const { cleanCourseCode } = require("./attendanceParser");

function parsePersonalTimetable(html) {
    if (!html) {
        return { studentInfo: {}, timetable: [] };
    }

    const $ = cheerio.load(html);

    // Extraction of profile attributes matching exact layout metrics
    const pageText = $("body").text().replace(/\s+/g, " ");

    const registrationNumber = (pageText.match(/Registration\s*Number\s*:\s*(RA\d+)/i) || [])[1] || "";
    const name = ((pageText.match(/Name\s*:\s*([A-Z\s]+?)(?=Combo|Batch|Mobile|Program|Semester|$)/i) || [])[1] || "").trim();
    const combo = (pageText.match(/Combo\s*\/\s*Batch\s*:\s*([0-9/]+)/i) || [])[1] || "1/1";
    const departmentRaw = ((pageText.match(/Department\s*:\s*([^-(]+)/i) || [])[1] || "").trim();

    const sectionRaw = pageText.match(/\((AN\d|FN\d|.*?Section)\)/i) || pageText.match(/Department\s*:\s*.*?-\s*\(([^)]+)\)/i);
    let section = sectionRaw ? sectionRaw[1].trim() : "";
    section = section.replace(/\s*Section/i, "").trim();

    let department = departmentRaw;
    if (pageText.includes("(SE)") && section) {
        section = `SE-${section}`;
    }

    const semester = parseInt((pageText.match(/Semester\s*:\s*(\d+)/i) || [])[1], 10) || null;
    const classRoom = (pageText.match(/Class\s*Room\s*:\s*(\d+)/i) || [])[1] || "";

    let batch = 1;
    if (combo && combo.includes("/")) {
        const parts = combo.split("/");
        batch = parseInt(parts[1], 10) || 1;
    }

    const studentInfo = {
        registrationNumber,
        name,
        combo,
        batch,
        department,
        section,
        semester,
        classRoom
    };

    const list = [];
    const courseCodeRegex = /^\d{2}[A-Z]/i;

    // Detect column indexes from table header row dynamically
    let targetTable = null;
    let codeIdx = -1;
    let titleIdx = -1;
    let creditIdx = -1;
    let regnIdx = -1;
    let categoryIdx = -1;
    let typeIdx = -1;
    let facultyIdx = -1;
    let slotIdx = -1;
    let roomIdx = -1;
    let yearIdx = -1;

    $("table").each((tblIdx, tbl) => {
        $(tbl).find("tr").each((rIdx, tr) => {
            const headers = [];
            $(tr).find("th, td").each((cIdx, cell) => {
                headers.push($(cell).text().trim().toLowerCase());
            });

            if (headers.some(h => h.includes("code")) && headers.some(h => h.includes("title") || h.includes("subject"))) {
                targetTable = tbl;
                codeIdx = headers.findIndex(h => h.includes("code"));
                titleIdx = headers.findIndex(h => h.includes("title") || h.includes("subject"));
                creditIdx = headers.findIndex(h => h.includes("credit"));
                regnIdx = headers.findIndex(h => h.includes("regn"));
                categoryIdx = headers.findIndex(h => h.includes("category"));
                typeIdx = headers.findIndex(h => h.includes("type") && !h.includes("regn"));
                facultyIdx = headers.findIndex(h => h.includes("faculty") || h.includes("teacher"));
                slotIdx = headers.findIndex(h => h.includes("slot"));
                roomIdx = headers.findIndex(h => h.includes("room"));
                yearIdx = headers.findIndex(h => h.includes("year"));
                return false;
            }
        });
        if (targetTable) return false;
    });

    const processRowCells = (cells) => {
        if (cells.length < 5) return;

        let rawCode = "";
        let course = "";
        let credit = 3;
        let regnType = "";
        let category = "";
        let courseType = "";
        let faculty = "";
        let slot = "";
        let room = "";
        let academicYear = "";

        if (codeIdx !== -1 && cells[codeIdx]) {
            rawCode = cells[codeIdx];
            course = titleIdx !== -1 && cells[titleIdx] ? cells[titleIdx] : "";
            
            if (creditIdx !== -1 && cells[creditIdx]) {
                const parsed = parseFloat(cells[creditIdx]);
                if (!isNaN(parsed)) credit = parsed;
            }
            if (regnIdx !== -1 && cells[regnIdx]) regnType = cells[regnIdx];
            if (categoryIdx !== -1 && cells[categoryIdx]) category = cells[categoryIdx];
            if (typeIdx !== -1 && cells[typeIdx]) courseType = cells[typeIdx];
            if (facultyIdx !== -1 && cells[facultyIdx]) faculty = cells[facultyIdx];
            if (slotIdx !== -1 && cells[slotIdx]) slot = cells[slotIdx];
            if (roomIdx !== -1 && cells[roomIdx]) room = cells[roomIdx];
            if (yearIdx !== -1 && cells[yearIdx]) academicYear = cells[yearIdx];
        } else {
            // Fallback matching when headers are not found
            let offset = -1;
            if (courseCodeRegex.test(cells[0])) {
                offset = 0;
            } else if (courseCodeRegex.test(cells[1])) {
                offset = 1;
            }

            if (offset !== -1) {
                rawCode = cells[offset];
                course = cells[offset + 1] || "";
                
                // Credit is column 3 (offset + 2 when offset = 1)
                const creditCell = cells[offset + 2];
                if (creditCell && !isNaN(parseFloat(creditCell))) {
                    credit = parseFloat(creditCell);
                    regnType = cells[offset + 3] || "";
                    category = cells[offset + 4] || "";
                    courseType = cells[offset + 5] || "";
                    faculty = cells[offset + 6] || "";
                    slot = cells[offset + 7] || "";
                    room = cells[offset + 8] || "";
                    academicYear = cells[offset + 9] || "";
                } else {
                    category = cells[offset + 2] || "";
                    faculty = cells[offset + 6] || "";
                    slot = cells[offset + 7] || "";
                    room = cells[offset + 8] || "";
                }
            }
        }

        if (courseCodeRegex.test(rawCode)) {
            const code = cleanCourseCode(rawCode);
            faculty = faculty.replace(/\(\d+\)/g, "").trim();
            slot = slot.replace(/Slot\s+/i, "").trim().toUpperCase();
            room = room.replace(/Room\s+/i, "").trim();

            list.push({
                code,
                course,
                credit,
                regnType,
                category,
                courseType,
                faculty,
                slot,
                room,
                academicYear
            });
        }
    };

    $("tr").each((i, row) => {
        const cells = [];
        $(row).find("td").each((j, cell) => {
            cells.push($(cell).text().trim());
        });

        processRowCells(cells);
    });

    return { studentInfo, timetable: list };
}

module.exports = { parsePersonalTimetable };