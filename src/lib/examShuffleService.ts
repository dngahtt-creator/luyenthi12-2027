/**
 * EXAM SHUFFLE SERVICE (BỘ MÁY TỰ ĐỘNG TRỘN ĐỀ & ĐẢO ĐÁP ÁN CHUẨN 2026)
 *
 * Chức năng:
 * 1. Tự động xáo trộn thứ tự các câu hỏi Phần 1 (trắc nghiệm), Phần 2 (Đúng/Sai), Phần 3 (trả lời ngắn)
 * 2. Tự động tính toán khung đáp án mới khớp 100% với đề đã trộn
 * 3. Sinh đồng thời N mã đề thi (2, 3, 4... n mã đề) với các mã 4 chữ số ngẫu nhiên
 * 4. Chỉ áp dụng cho Thi thử & Vào thi (để chống gian lận).
 *    Bài tập về nhà (isHomework) giữ nguyên 100% để học sinh cùng trao đổi bài.
 */

export interface ShuffledMapping {
  part1Mapping?: number[]; // [origQ1, origQ2, ...] (1-based)
  part2Mapping?: number[];
  part3Mapping?: number[];
}

export interface ExamVariant {
  code: string; // Mã đề 4 chữ số, e.g. "9729", "1024"
  variantNumber: number; // 1, 2, 3...
  isOriginal?: boolean;
  answerKey: {
    part1?: string;
    part2?: string;
    part3?: string;
  };
  shuffledOrder?: ShuffledMapping;
}

/**
 * Fisher-Yates shuffle an array into a new shallow copy
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Parse Part 1 answer string: "1D 2B 3C 4C 5A..."
 */
export function parsePart1Answers(text: string): { qNum: number; answer: string }[] {
  if (!text) return [];
  const matches = text.match(/(\d+)\s*[:.]?\s*([A-D])/gi) || [];
  const list: { qNum: number; answer: string }[] = [];
  matches.forEach((m) => {
    const p = m.match(/(\d+)\s*[:.]?\s*([A-D])/i);
    if (p) {
      list.push({ qNum: Number(p[1]), answer: p[2].toUpperCase() });
    }
  });
  return list;
}

/**
 * Parse Part 2 answer string: "1: Đ Đ Đ S  2: Đ S S S..."
 */
export function parsePart2Answers(text: string): { qNum: number; answers: string[] }[] {
  if (!text) return [];
  const chunks = text.split(/(?=\d+\s*[:.])/).filter(Boolean);
  const list: { qNum: number; answers: string[] }[] = [];

  chunks.forEach((chunk) => {
    const qMatch = chunk.match(/^(\d+)\s*[:.]/);
    if (qMatch) {
      const qNum = Number(qMatch[1]);
      const rawAfter = chunk.replace(/^(\d+)\s*[:.]/, "").trim();
      // Match Đ, S, T, F, D, S
      const tokens = rawAfter.match(/[ĐDSSTTF]/gi) || [];
      const cleanTokens = tokens.slice(0, 4).map((t) => {
        const u = t.toUpperCase();
        return u === "Đ" || u === "D" || u === "T" ? "Đ" : "S";
      });
      // Fill to 4 if missing
      while (cleanTokens.length < 4) {
        cleanTokens.push("Đ");
      }
      list.push({ qNum, answers: cleanTokens });
    }
  });

  return list;
}

/**
 * Parse Part 3 answer string: "1: 1  2: 85  3: 0.31..."
 */
export function parsePart3Answers(text: string): { qNum: number; answer: string }[] {
  if (!text) return [];
  const chunks = text.split(/(?=\d+\s*[:.])/).filter(Boolean);
  const list: { qNum: number; answer: string }[] = [];

  chunks.forEach((chunk) => {
    const qMatch = chunk.match(/^(\d+)\s*[:.]\s*([^\d]*)([-+]?\d*\.?\d+(?:\/\d+)?|[a-zA-Z0-9.,/-]+)/i);
    if (qMatch) {
      const qNum = Number(qMatch[1]);
      const ans = qMatch[2] ? qMatch[2].trim() : (qMatch[3] ? qMatch[3].trim() : "");
      list.push({ qNum, answer: ans || "0" });
    } else {
      // Fallback simple token match
      const simple = chunk.match(/(\d+)\s*[:.]\s*([^\s]+)/);
      if (simple) {
        list.push({ qNum: Number(simple[1]), answer: simple[2].trim() });
      }
    }
  });

  return list;
}

/**
 * Xáo trộn Phần 1: Đảo thứ tự câu hỏi và re-index 1..N
 */
export function shufflePart1(text: string): { text: string; mapping: number[] } {
  const items = parsePart1Answers(text);
  if (items.length <= 1) return { text, mapping: items.map((i) => i.qNum) };

  // Đảo ngẫu nhiên các câu hỏi
  let shuffled = shuffleArray(items);
  // Đảm bảo không trùng 100% với thứ tự ban đầu nếu có từ 3 câu trở lên
  if (items.length >= 3 && shuffled.every((item, idx) => item.qNum === items[idx].qNum)) {
    shuffled = shuffleArray(items);
  }

  const mapping = shuffled.map((item) => item.qNum);
  const formattedText = shuffled
    .map((item, idx) => `${idx + 1}${item.answer}`)
    .join(" ");

  return { text: formattedText, mapping };
}

/**
 * Xáo trộn Phần 2: Đảo thứ tự các câu hỏi Đúng/Sai (1..4)
 */
export function shufflePart2(text: string): { text: string; mapping: number[] } {
  const items = parsePart2Answers(text);
  if (items.length <= 1) return { text, mapping: items.map((i) => i.qNum) };

  let shuffled = shuffleArray(items);
  if (items.length >= 3 && shuffled.every((item, idx) => item.qNum === items[idx].qNum)) {
    shuffled = shuffleArray(items);
  }

  const mapping = shuffled.map((item) => item.qNum);
  const formattedText = shuffled
    .map((item, idx) => `${idx + 1}: ${item.answers.join(" ")}`)
    .join("  ");

  return { text: formattedText, mapping };
}

/**
 * Xáo trộn Phần 3: Đảo thứ tự các câu trả lời ngắn
 */
export function shufflePart3(text: string): { text: string; mapping: number[] } {
  const items = parsePart3Answers(text);
  if (items.length <= 1) return { text, mapping: items.map((i) => i.qNum) };

  let shuffled = shuffleArray(items);
  if (items.length >= 3 && shuffled.every((item, idx) => item.qNum === items[idx].qNum)) {
    shuffled = shuffleArray(items);
  }

  const mapping = shuffled.map((item) => item.qNum);
  const formattedText = shuffled
    .map((item, idx) => `${idx + 1}: ${item.answer}`)
    .join("  ");

  return { text: formattedText, mapping };
}

/**
 * Sinh ngẫu nhiên mã đề 4 chữ số (VD: "5821") không trùng lặp
 */
export function generateRandomExamCode(excludeCodes: string[] = []): string {
  const set = new Set(excludeCodes.map((c) => c.trim()));
  for (let i = 0; i < 500; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    if (!set.has(code)) {
      return code;
    }
  }
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Tạo 1 bản trộn đề mới từ đáp án gốc kèm mã đề mới
 */
export function generateSingleShuffledVariant(
  base: { part1?: string; part2?: string; part3?: string },
  code: string,
  variantNumber: number = 1,
  isOriginal: boolean = false
): ExamVariant {
  if (isOriginal) {
    return {
      code,
      variantNumber,
      isOriginal: true,
      answerKey: {
        part1: base.part1 || "",
        part2: base.part2 || "",
        part3: base.part3 || "",
      },
    };
  }

  const p1 = base.part1 ? shufflePart1(base.part1) : { text: "", mapping: [] };
  const p2 = base.part2 ? shufflePart2(base.part2) : { text: "", mapping: [] };
  const p3 = base.part3 ? shufflePart3(base.part3) : { text: "", mapping: [] };

  return {
    code,
    variantNumber,
    isOriginal: false,
    answerKey: {
      part1: p1.text,
      part2: p2.text,
      part3: p3.text,
    },
    shuffledOrder: {
      part1Mapping: p1.mapping,
      part2Mapping: p2.mapping,
      part3Mapping: p3.mapping,
    },
  };
}

/**
 * Sinh chùm N mã đề thi trộn (2, 3, 4, ... n mã đề)
 * Mã đầu tiên có thể là đề gốc hoặc đề trộn 1
 */
export function generateMultipleExamVariants(
  base: { part1: string; part2: string; part3: string },
  count: number = 4,
  primaryCode?: string
): ExamVariant[] {
  const safeCount = Math.max(1, Math.min(count, 30));
  const variants: ExamVariant[] = [];
  const usedCodes: string[] = [];

  const firstCode = primaryCode && primaryCode.length === 4 ? primaryCode : generateRandomExamCode();
  usedCodes.push(firstCode);

  // Variant 1: Giữ nguyên đề gốc ban đầu để đối chiếu
  variants.push({
    code: firstCode,
    variantNumber: 1,
    isOriginal: true,
    answerKey: {
      part1: base.part1.trim(),
      part2: base.part2.trim(),
      part3: base.part3.trim(),
    },
  });

  // Variant 2..N: Các bản trộn ngẫu nhiên câu hỏi & đáp án
  for (let i = 2; i <= safeCount; i++) {
    const code = generateRandomExamCode(usedCodes);
    usedCodes.push(code);

    const shuffled = generateSingleShuffledVariant(base, code, i, false);
    variants.push(shuffled);
  }

  return variants;
}
