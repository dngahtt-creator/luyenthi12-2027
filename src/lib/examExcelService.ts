import * as XLSX from "xlsx";

export interface ParsedExamExcel {
  success: boolean;
  error?: string;
  title?: string;
  subject?: string;
  subjectName?: string;
  grade?: string;
  timeMinutes?: number;
  difficulty?: string;
  part1Text?: string;
  part2Text?: string;
  part3Text?: string;
  part1Count: number;
  part2Count: number;
  part3Count: number;
  totalQuestions: number;
}

const SUBJECT_CODE_MAP: Record<string, { code: string; name: string }> = {
  toan: { code: "toan", name: "Toán học" },
  "toán": { code: "toan", name: "Toán học" },
  "toán học": { code: "toan", name: "Toán học" },
  tin: { code: "tin", name: "Tin học" },
  "tin học": { code: "tin", name: "Tin học" },
  ly: { code: "ly", name: "Vật lí" },
  "vật lí": { code: "ly", name: "Vật lí" },
  "vật lý": { code: "ly", name: "Vật lí" },
  hoa: { code: "hoa", name: "Hóa học" },
  "hóa": { code: "hoa", name: "Hóa học" },
  "hóa học": { code: "hoa", name: "Hóa học" },
  sinh: { code: "sinh", name: "Sinh học" },
  "sinh học": { code: "sinh", name: "Sinh học" },
  van: { code: "van", name: "Ngữ văn" },
  "ngữ văn": { code: "van", name: "Ngữ văn" },
  anh: { code: "anh", name: "Tiếng Anh" },
  "tiếng anh": { code: "anh", name: "Tiếng Anh" },
  su: { code: "su", name: "Lịch sử" },
  "lịch sử": { code: "su", name: "Lịch sử" },
  dia: { code: "dia", name: "Địa lí" },
  "địa lí": { code: "dia", name: "Địa lí" },
  ktpl: { code: "ktpl", name: "GDKT & PL" },
  "gdkt & pl": { code: "ktpl", name: "GDKT & PL" },
  "gdkt&pl": { code: "ktpl", name: "GDKT & PL" },
};

/**
 * Tải file mẫu Excel (.xlsx) chuẩn cấu trúc đề thi và đáp án 3 phần
 */
export function downloadExamExcelTemplate(currentSubject = "toan") {
  const isTin = currentSubject === "tin";

  // 1. Sheet Thông tin đề thi
  const infoData = [
    {
      "Thuộc tính": "Tên đề thi",
      "Giá trị": isTin ? "Đề kiểm tra Tin học 12 - Chuẩn cấu trúc GDPT 2018" : "Đề khảo sát chất lượng THPT 2026 - Môn Toán học",
      "Hướng dẫn": "Nhập tên bài tập hoặc đề thi",
    },
    {
      "Thuộc tính": "Môn học",
      "Giá trị": isTin ? "Tin học" : "Toán học",
      "Hướng dẫn": "Nhập tên môn: Toán học, Tin học, Vật lí, Hóa học, Sinh học, Ngữ văn, Tiếng Anh...",
    },
    {
      "Thuộc tính": "Khối lớp",
      "Giá trị": "Lớp 12",
      "Hướng dẫn": "Lớp 10, Lớp 11 hoặc Lớp 12",
    },
    {
      "Thuộc tính": "Thời gian (phút)",
      "Giá trị": 90,
      "Hướng dẫn": "Thời gian làm bài quy định (VD: 50 hoặc 90)",
    },
    {
      "Thuộc tính": "Mức độ",
      "Giá trị": "Vận dụng cao",
      "Hướng dẫn": "Cơ bản, Vận dụng, Vận dụng cao hoặc Khó (9+)",
    },
  ];

  // 2. Sheet Đáp án chi tiết
  const answerRows: Array<{
    "Phần": string;
    "Câu": number;
    "Đáp án": string;
    "Ghi chú": string;
  }> = [];

  // Phần I: 12 câu trắc nghiệm (Tin học hoặc các môn khác)
  const part1Answers = ["A", "B", "C", "C", "A", "D", "C", "A", "B", "D", "B", "B"];
  part1Answers.forEach((ans, idx) => {
    answerRows.push({
      "Phần": "Phần I",
      "Câu": idx + 1,
      "Đáp án": ans,
      "Ghi chú": idx === 0 ? "Trắc nghiệm 4 lựa chọn (A, B, C, D)" : "",
    });
  });

  // Phần II: 4 câu đúng sai
  const part2Answers = ["Đ Đ Đ S", "Đ S S S", "S S Đ Đ", "S Đ S S"];
  part2Answers.forEach((ans, idx) => {
    answerRows.push({
      "Phần": "Phần II",
      "Câu": idx + 1,
      "Đáp án": ans,
      "Ghi chú": idx === 0 ? "Câu đúng/sai (nhập 4 ý dạng: Đ Đ Đ S hoặc Đúng Đúng Đúng Sai)" : "",
    });
  });

  // Phần III: 6 câu trả lời ngắn (chỉ có khi không phải Tin học)
  if (!isTin) {
    const part3Answers = ["1", "85", "0.31", "136", "2.47", "32"];
    part3Answers.forEach((ans, idx) => {
      answerRows.push({
        "Phần": "Phần III",
        "Câu": idx + 1,
        "Đáp án": ans,
        "Ghi chú": idx === 0 ? "Điền số/chữ ngắn (Riêng môn Tin học không có phần này)" : "",
      });
    });
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1
  const wsInfo = XLSX.utils.json_to_sheet(infoData);
  wsInfo["!cols"] = [{ wch: 25 }, { wch: 45 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Thong_Tin_De");

  // Sheet 2
  const wsAnswers = XLSX.utils.json_to_sheet(answerRows);
  wsAnswers["!cols"] = [{ wch: 15 }, { wch: 8 }, { wch: 20 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsAnswers, "Dap_An");

  const fileName = isTin ? "Mau_De_Thi_Tin_Hoc.xlsx" : "Mau_De_Thi_Va_Dap_An.xlsx";
  XLSX.writeFile(wb, fileName);
}

/**
 * Đọc và phân tích file Excel đề thi & đáp án
 */
export async function parseExamExcelFile(file: File): Promise<ParsedExamExcel> {
  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return {
        success: false,
        error: "File Excel không chứa bất kỳ sheet dữ liệu nào.",
        part1Count: 0,
        part2Count: 0,
        part3Count: 0,
        totalQuestions: 0,
      };
    }

    let parsedTitle: string | undefined;
    let parsedSubject: string | undefined;
    let parsedSubjectName: string | undefined;
    let parsedGrade: string | undefined;
    let parsedTimeMinutes: number | undefined;
    let parsedDifficulty: string | undefined;

    const part1Map: Record<number, string> = {};
    const part2Map: Record<number, string> = {};
    const part3Map: Record<number, string> = {};

    // 1. Quét các sheet để tìm thông tin đề thi và đáp án
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const rawRows = (XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown) as unknown[][];

      if (!rawRows || rawRows.length === 0) continue;

      let dapanColIndex = -1;
      let cauColIndex = -1;
      let phanColIndex = -1;
      let currentPhanVal = "";

      for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r] || [];
        if (row.length === 0) continue;

        const firstCol = String(row[0] || "").trim();
        const secondCol = String(row[1] || "").trim();
        const lowerFirst = firstCol.toLowerCase();

        // 1. Kiểm tra thông tin metadata
        if (lowerFirst.includes("tên đề") || lowerFirst.includes("tên bài") || lowerFirst.includes("tiêu đề")) {
          if (secondCol) parsedTitle = secondCol;
        } else if (lowerFirst.includes("môn")) {
          if (secondCol) {
            const cleanSub = secondCol.toLowerCase().trim();
            const matched = SUBJECT_CODE_MAP[cleanSub];
            if (matched) {
              parsedSubject = matched.code;
              parsedSubjectName = matched.name;
            } else {
              parsedSubjectName = secondCol;
            }
          }
        } else if (lowerFirst.includes("khối") || lowerFirst.includes("lớp")) {
          if (secondCol) parsedGrade = secondCol;
        } else if (lowerFirst.includes("thời gian")) {
          const num = parseInt(secondCol.replace(/\D/g, ""), 10);
          if (!isNaN(num) && num > 0) parsedTimeMinutes = num;
        } else if (lowerFirst.includes("mức độ") || lowerFirst.includes("độ khó")) {
          if (secondCol) parsedDifficulty = secondCol;
        }

        // 2. Tìm Header
        let rowHasHeader = false;
        for (let c = 0; c < row.length; c++) {
          const cellVal = String(row[c] || "").toLowerCase().trim();
          if (cellVal.includes("đáp án") || cellVal.includes("dapan") || cellVal === "ans" || cellVal === "answer" || cellVal === "key") {
            dapanColIndex = c;
            rowHasHeader = true;
          }
          if (cellVal === "câu" || cellVal === "cau" || cellVal === "stt" || cellVal === "tt" || cellVal === "question" || cellVal === "q") {
            cauColIndex = c;
            rowHasHeader = true;
          }
          if (cellVal.includes("phần") || cellVal.includes("phan") || cellVal === "part" || cellVal === "section") {
            phanColIndex = c;
            rowHasHeader = true;
          }
        }

        if (!rowHasHeader && firstCol && lowerFirst.includes("phần") && firstCol.length < 20) {
          currentPhanVal = firstCol;
        }

        if (rowHasHeader) continue;

        // 3. Đọc đáp án
        let dapanVal = "";
        let cauVal = 0;
        let phanVal = currentPhanVal;

        if (dapanColIndex !== -1 && row[dapanColIndex] !== undefined && String(row[dapanColIndex]).trim() !== "") {
          dapanVal = String(row[dapanColIndex]).trim();
          if (cauColIndex !== -1 && row[cauColIndex] !== undefined) {
            cauVal = parseInt(String(row[cauColIndex]).replace(/\D/g, ""), 10) || 0;
          }
          if (phanColIndex !== -1 && row[phanColIndex] !== undefined) {
            phanVal = String(row[phanColIndex]).trim();
          }
        } else if (dapanColIndex === -1 && firstCol && secondCol && !lowerFirst.includes("môn") && !lowerFirst.includes("thời gian") && !lowerFirst.includes("tên") && !lowerFirst.includes("đáp án")) {
          // Fallback
          const num = parseInt(firstCol.replace(/\D/g, ""), 10);
          if (!isNaN(num) && num > 0 && secondCol.length > 0 && secondCol.length < 25) {
            cauVal = num;
            dapanVal = secondCol;
          }
        }

        if (dapanVal) {
          const phanLower = phanVal.toLowerCase();
          if (phanLower.includes("iii") || phanLower.includes("3") || phanLower.includes("ngắn") || phanLower.includes("điền")) {
            if (cauVal > 0) part3Map[cauVal] = dapanVal;
            else part3Map[Object.keys(part3Map).length + 1] = dapanVal;
          } else if (phanLower.includes("ii") || phanLower.includes("2") || phanLower.includes("đúng") || phanLower.includes("sai")) {
            const normAns = dapanVal.replace(/true|đúng/gi, "Đ").replace(/false|sai/gi, "S").replace(/[\s,\-]+/g, " ").trim();
            if (cauVal > 0) part2Map[cauVal] = normAns;
            else part2Map[Object.keys(part2Map).length + 1] = normAns;
          } else if (phanLower.includes("i") || phanLower.includes("1") || phanLower.includes("trắc nghiệm")) {
            const letter = dapanVal.toUpperCase().match(/[ABCD]/)?.[0] || dapanVal.toUpperCase();
            if (cauVal > 0) part1Map[cauVal] = letter;
            else part1Map[Object.keys(part1Map).length + 1] = letter;
          } else {
            const upper = dapanVal.toUpperCase();
            if (/^[ABCD]$/.test(upper)) {
              if (cauVal > 0) part1Map[cauVal] = upper;
              else part1Map[Object.keys(part1Map).length + 1] = upper;
            } else if (/^[ĐS\s,]{3,10}$/i.test(upper) || upper.includes("Đ") || upper.includes("S")) {
              const norm = upper.replace(/[\s,\-]+/g, " ").trim();
              if (cauVal > 0) part2Map[cauVal] = norm;
              else part2Map[Object.keys(part2Map).length + 1] = norm;
            } else {
              if (cauVal > 0) part3Map[cauVal] = dapanVal;
              else part3Map[Object.keys(part3Map).length + 1] = dapanVal;
            }
          }
        }
      }
    }

    // Nếu không có title, lấy tên file làm title
    if (!parsedTitle) {
      parsedTitle = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    }

    // Tạo chuỗi Text format cho Phần I: "1D 2B 3C..."
    const part1Entries = Object.entries(part1Map).sort((a, b) => Number(a[0]) - Number(b[0]));
    const part1Text = part1Entries.length > 0 
      ? part1Entries.map(([q, ans]) => `${q}${ans}`).join(" ")
      : "";

    // Tạo chuỗi Text format cho Phần II: "1: Đ Đ Đ S 2: Đ S S S..."
    const part2Entries = Object.entries(part2Map).sort((a, b) => Number(a[0]) - Number(b[0]));
    const part2Text = part2Entries.length > 0 
      ? part2Entries.map(([q, ans]) => `${q}: ${ans}`).join(" ")
      : "";

    // Tạo chuỗi Text format cho Phần III: "1: 1  2: 85  3: 0.31..."
    const part3Entries = Object.entries(part3Map).sort((a, b) => Number(a[0]) - Number(b[0]));
    const part3Text = part3Entries.length > 0 
      ? part3Entries.map(([q, ans]) => `${q}: ${ans}`).join("  ")
      : "";

    const part1Count = part1Entries.length;
    const part2Count = part2Entries.length;
    const part3Count = part3Entries.length;
    const totalQuestions = part1Count + part2Count + part3Count;

    return {
      success: true,
      title: parsedTitle,
      subject: parsedSubject,
      subjectName: parsedSubjectName,
      grade: parsedGrade,
      timeMinutes: parsedTimeMinutes,
      difficulty: parsedDifficulty,
      part1Text: part1Text || undefined,
      part2Text: part2Text || undefined,
      part3Text: part3Text || undefined,
      part1Count,
      part2Count,
      part3Count,
      totalQuestions,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Lỗi đọc file Excel: ${errorMsg}`,
      part1Count: 0,
      part2Count: 0,
      part3Count: 0,
      totalQuestions: 0,
    };
  }
}
