import { db } from "./firebase";
import * as XLSX from "xlsx";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  writeBatch,
} from "firebase/firestore";

import { ExamVariant } from "./examShuffleService";

// Interface definitions
export interface ExamItem {
  id: string;
  title: string;
  subject: string; // "toan" | "ly" | "hoa" | "sinh" | "anh" | "van"
  subjectName: string;
  badgeClass?: string;
  school: string;
  questions: number;
  timeMinutes: number;
  difficulty: string; // "Cơ bản" | "Vận dụng" | "Vận dụng cao" | "Khó (9+)"
  takers: string;
  avgScore: number;
  tag?: string;
  tagType?: "hot" | "new";
  fileUrl?: string;
  createdAt?: string | number;
  createdBy?: string;
  accessCode?: string;
  grade?: string;
  assignedClasses?: string[];
  assignedStudents?: string[];
  assignedStudentNames?: string[];
  assignType?: "all" | "class" | "student" | "homework";
  isHomework?: boolean;
  dueDate?: string;
  teacherNote?: string;
  status?: "ACTIVE" | "CLOSED" | string;
  variants?: ExamVariant[]; // Danh sách các mã đề thi đã trộn kèm đáp án tương ứng
  answerKey?: {
    part1?: string;
    part2?: string;
    part3?: string;
  };
  scoreConfig?: {
    p1Total?: number;
    p2Total?: number;
    p3Total?: number;
    p2_1?: number;
    p2_2?: number;
    p2_3?: number;
    p2_4?: number;
  };
  allowReview?: boolean; // Cho phép học sinh xem đáp án sau khi thi (mặc định true)
}

export interface DocumentItem {
  id: string;
  title: string;
  subject?: string;
  subjectName?: string;
  format: string; // "PDF" | "DOCX" | "PPTX" | "LINK" | "VIDEO"
  size?: string;
  downloads?: string;
  description?: string;
  fileUrl?: string;
  createdAt?: string | number;
  uploader?: string;
  assignedClasses?: string[];
  assignedStudents?: string[];
  assignedStudentNames?: string[];
  assignType?: "class" | "student";
}

export interface ExamSubmission {
  id?: string;
  examId: string;
  examTitle: string;
  studentName?: string;
  studentClass?: string;
  studentEmail?: string;
  score: number;
  totalQuestions: number;
  submittedAt?: unknown;
  formattedTime?: string;
  rank?: string;
  examCode?: string;
  studentId?: string;
  violation?: string;
  detailedResults?: {
    part1: { correct: number; total: number; score?: number };
    part2: { correct: number; total: number; score?: number };
    part3: { correct: number; total: number; score?: number };
  };
}

// Default initial Grade 12 exams
export const DEFAULT_EXAMS: ExamItem[] = [
  {
    id: "ex-1",
    title: "Đề phát triển đề minh họa THPT 2027 - Môn Toán (Chuẩn cấu trúc mới)",
    subject: "toan",
    subjectName: "Toán học",
    school: "Bộ Giáo Dục & Đào Tạo",
    questions: 34,
    timeMinutes: 90,
    difficulty: "Vận dụng cao",
    takers: "24.8k",
    avgScore: 7.4,
    tag: "🔥 Hot 2027",
    tagType: "hot",
    createdBy: "Bộ GD&ĐT",
    accessCode: "1024",
  },
  {
    id: "ex-2",
    title: "Đề thi thử lần 1 - THPT Chuyên Khoa Học Tự Nhiên Hà Nội",
    subject: "toan",
    subjectName: "Toán học",
    school: "Chuyên KHTN Hà Nội",
    questions: 34,
    timeMinutes: 90,
    difficulty: "Khó (9+)",
    takers: "18.3k",
    avgScore: 6.9,
    tag: "⭐ Đề Chuyên",
    tagType: "hot",
    createdBy: "Chuyên KHTN",
    accessCode: "2027",
  },
  {
    id: "ex-3",
    title: "Đề khảo sát chất lượng Vật Lí 12 - Dao động & Sóng điện từ",
    subject: "ly",
    subjectName: "Vật lí",
    school: "Sở GD&ĐT Nam Định",
    questions: 40,
    timeMinutes: 50,
    difficulty: "Vận dụng",
    takers: "15.1k",
    avgScore: 7.8,
    tag: "✨ Mới nhất",
    tagType: "new",
    createdBy: "Sở Nam Định",
    accessCode: "3012",
  },
  {
    id: "ex-4",
    title: "Đề thi thử THPT Quốc Gia - Hóa học Chuyên đề Este, Lipit & Hữu cơ",
    subject: "hoa",
    subjectName: "Hóa học",
    school: "Chuyên Lê Hồng Phong TP.HCM",
    questions: 40,
    timeMinutes: 50,
    difficulty: "Khó (8.5+)",
    takers: "12.7k",
    avgScore: 7.2,
    tag: "🎯 Trọng tâm",
    tagType: "hot",
    createdBy: "Chuyên LHP",
    accessCode: "4056",
  },
  {
    id: "ex-5",
    title: "Đề thi thử Tiếng Anh THPT 2027 - Đọc hiểu nâng cao & Ngữ pháp",
    subject: "anh",
    subjectName: "Tiếng Anh",
    school: "Chuyên Sư Phạm Hà Nội",
    questions: 50,
    timeMinutes: 60,
    difficulty: "Vận dụng cao",
    takers: "21.6k",
    avgScore: 7.5,
    tag: "✨ Mới nhất",
    tagType: "new",
    createdBy: "Chuyên ĐHSP",
    accessCode: "5088",
  },
  {
    id: "ex-6",
    title: "Đề thi thử Sinh học 12 - Di truyền học quần thể & Tiến hóa",
    subject: "sinh",
    subjectName: "Sinh học",
    school: "Sở GD&ĐT Nghệ An",
    questions: 40,
    timeMinutes: 50,
    difficulty: "Vận dụng",
    takers: "9.4k",
    avgScore: 7.6,
    tag: "💡 Hay & Lạ",
    tagType: "new",
    createdBy: "Sở Nghệ An",
    accessCode: "6120",
  },
  {
    id: "ex-7",
    title: "Đề thi thử Lịch Sử THPT 2027 - Chuyên đề Lịch sử Việt Nam hiện đại",
    subject: "su",
    subjectName: "Lịch sử",
    school: "Chuyên Quốc Học Huế",
    questions: 40,
    timeMinutes: 50,
    difficulty: "Vận dụng cao",
    takers: "11.2k",
    avgScore: 7.9,
    tag: "🔥 Hot 2027",
    tagType: "hot",
    createdBy: "Tổ Lịch Sử",
    accessCode: "7145",
  },
  {
    id: "ex-8",
    title: "Đề khảo sát năng lực Địa Lí 12 - Địa lí kinh tế và thực hành Atlat",
    subject: "dia",
    subjectName: "Địa lí",
    school: "Sở GD&ĐT Lâm Đồng",
    questions: 40,
    timeMinutes: 50,
    difficulty: "Vận dụng",
    takers: "10.5k",
    avgScore: 8.1,
    tag: "✨ Mới nhất",
    tagType: "new",
    createdBy: "Sở GD&ĐT",
    accessCode: "8230",
  },
  {
    id: "ex-9",
    title: "Đề thi thử GD Kinh tế & Pháp luật 12 - Chuẩn cấu trúc Bộ GD&ĐT",
    subject: "ktpl",
    subjectName: "GDKT & Pháp luật",
    school: "THPT Chuyên Chu Văn An",
    questions: 40,
    timeMinutes: 50,
    difficulty: "Vận dụng",
    takers: "8.7k",
    avgScore: 8.3,
    tag: "🎯 Trọng tâm",
    tagType: "hot",
    createdBy: "Tổ GDKT&PL",
    accessCode: "9310",
  },
  {
    id: "ex-10",
    title: "Đề thi thử Tin Học 12 - Lập trình Python & Hệ CSDL chuẩn format 2027",
    subject: "tin",
    subjectName: "Tin học",
    school: "Chuyên Tin ĐHQG Hà Nội",
    questions: 40,
    timeMinutes: 50,
    difficulty: "Khó (9+)",
    takers: "7.9k",
    avgScore: 7.8,
    tag: "⚡ Mới 2027",
    tagType: "new",
    createdBy: "Tổ Tin Học",
    accessCode: "1234",
  },
  {
    id: "ex-11",
    title: "Đề khảo sát Công Nghệ 12 - Công nghệ thông tin & Đổi mới kỹ thuật",
    subject: "congnghe",
    subjectName: "Công nghệ",
    school: "Sở GD&ĐT TP.HCM",
    questions: 40,
    timeMinutes: 50,
    difficulty: "Cơ bản - Vận dụng",
    takers: "6.4k",
    avgScore: 8.0,
    tag: "✨ Mới nhất",
    tagType: "new",
    createdBy: "Tổ Công Nghệ",
    accessCode: "5678",
  },
  {
    id: "ex-12",
    title: "Đề kiểm tra GD Quốc phòng & An ninh 12 - Chiến lược bảo vệ Tổ quốc",
    subject: "gdqp",
    subjectName: "GD Quốc phòng - An ninh",
    school: "THPT DTNT Tuy Đức",
    questions: 30,
    timeMinutes: 45,
    difficulty: "Cơ bản",
    takers: "5.8k",
    avgScore: 8.5,
    tag: "🎯 Trọng tâm",
    tagType: "new",
    createdBy: "Tổ Thể chất - GDQP",
    accessCode: "9999",
  },
];

// Default initial study documents
export const DEFAULT_DOCUMENTS: DocumentItem[] = [
  {
    id: "doc-tich-phan-12",
    title: "Chương 3. Tích phân",
    subject: "toan",
    subjectName: "Toán học",
    format: "PDF",
    size: "3.2 MB",
    downloads: "14.5k",
    description: "Chuyên đề nguyên hàm, tích phân và ứng dụng hình học diện tích, thể tích.",
    uploader: "FC ZO ZO",
    assignedClasses: ["12"],
    assignType: "class",
    createdAt: "10/10/2026",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "doc-luyen-thi-chuong-1",
    title: "Luyện thi Chương 1",
    subject: "toan",
    subjectName: "Toán học",
    format: "PDF",
    size: "2.5 MB",
    downloads: "8.2k",
    description: "Tài liệu ôn tập và luyện giải các dạng bài trọng tâm Chương 1.",
    uploader: "FC ZO ZO",
    assignedClasses: ["12"],
    assignType: "class",
    createdAt: "21/9/2026",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "doc-2",
    title: "Bộ công thức trọng tâm Vật lí 12 thi THPT 2027",
    subject: "ly",
    subjectName: "Vật lí",
    format: "PDF",
    size: "2.8 MB",
    downloads: "28.4k",
    description: "Đầy đủ công thức Dao động cơ, Sóng cơ, Dòng điện xoay chiều và Sóng ánh sáng tinh gọn 8 trang.",
    uploader: "Tổ Vật Lí - Tuy Đức",
  },
  {
    id: "doc-3",
    title: "Phương pháp Dồn chất & Đồng đẳng hóa Hóa hữu cơ 9+",
    subject: "hoa",
    subjectName: "Hóa học",
    format: "PDF",
    size: "3.5 MB",
    downloads: "22.1k",
    description: "Bí quyết giải quyết nhanh các bài toán Este đa chức, Peptit và hợp chất tạp chức phân hóa cao.",
    uploader: "Tổ Hóa Học - Tuy Đức",
  },
  {
    id: "doc-4",
    title: "Tuyển tập 100 bài đọc hiểu phân loại 9+ Tiếng Anh THPT",
    subject: "anh",
    subjectName: "Tiếng Anh",
    format: "PDF",
    size: "5.1 MB",
    downloads: "19.6k",
    description: "Giải chi tiết từng câu bẫy từ vựng học thuật, liên từ và cấu trúc suy luận ngữ cảnh thực tế.",
    uploader: "Tổ Ngoại Ngữ - Tuy Đức",
  },
  {
    id: "doc-5",
    title: "Sơ đồ tư duy Di truyền học & Sinh thái học lớp 12",
    subject: "sinh",
    subjectName: "Sinh học",
    format: "PDF",
    size: "3.1 MB",
    downloads: "14.2k",
    description: "Mindmap hệ thống hóa toàn bộ lý thuyết chống sai ngu và mẹo tính nhanh xác suất phả hệ.",
    uploader: "Tổ Sinh Học - Tuy Đức",
  },
  {
    id: "doc-6",
    title: "Bộ 50 đoạn văn Nghị luận xã hội 200 chữ điểm 1.75/2.0",
    subject: "van",
    subjectName: "Ngữ văn",
    format: "PDF",
    size: "2.4 MB",
    downloads: "31.0k",
    description: "Dẫn chứng thời sự cập nhật mới nhất năm 2026, luận điểm sắc bén và cấu trúc mở rộng độc đáo.",
    uploader: "Tổ Ngữ Văn - Tuy Đức",
  },
  {
    id: "doc-7",
    title: "Sổ tay mốc thời gian & Từ khóa then chốt Lịch sử 12",
    subject: "su",
    subjectName: "Lịch sử",
    format: "PDF",
    size: "3.8 MB",
    downloads: "18.5k",
    description: "Hệ thống toàn bộ niên biểu lịch sử Việt Nam và thế giới, mẹo loại trừ phương án nhiễu 9+.",
    uploader: "Tổ Lịch Sử - Tuy Đức",
  },
  {
    id: "doc-8",
    title: "Kỹ năng khai thác Atlat Địa lí & Nhận dạng biểu đồ thi THPT",
    subject: "dia",
    subjectName: "Địa lí",
    format: "PDF",
    size: "4.5 MB",
    downloads: "17.2k",
    description: "Bí quyết ăn trọn 15 câu Atlat trong 5 phút và công thức tính nhanh số liệu bảng thống kê.",
    uploader: "Tổ Địa Lí - Tuy Đức",
  },
  {
    id: "doc-9",
    title: "Sơ đồ tư duy môn Giáo dục Kinh tế & Pháp luật 12",
    subject: "ktpl",
    subjectName: "GDKT & Pháp luật",
    format: "PDF",
    size: "3.2 MB",
    downloads: "12.8k",
    description: "Tóm tắt các quy định pháp luật và kiến thức kinh tế vi mô, vĩ mô dễ nhớ, chuẩn cấu trúc.",
    uploader: "Tổ GDKT & PL - Tuy Đức",
  },
  {
    id: "doc-10",
    title: "Cẩm nang ôn thi Tin học 12: Thuật toán & Câu hỏi trắc nghiệm CSDL",
    subject: "tin",
    subjectName: "Tin học",
    format: "PDF",
    size: "2.9 MB",
    downloads: "11.4k",
    description: "Tổng hợp lý thuyết Hệ quản trị CSDL, an toàn thông tin và kỹ thuật lập trình trắc nghiệm.",
    uploader: "Tổ Tin Học - Tuy Đức",
  },
];

// Helper to notify other components/tabs that data changed
function broadcastDataUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("school_data_updated"));
    window.dispatchEvent(new Event("school_submissions_updated"));
  }
}

/* =========================================================
   1. EXAM & EXERCISE MANAGEMENT (GIAO BÀI TẬP VÀ ĐỀ THI)
========================================================= */

export async function getAllExams(): Promise<ExamItem[]> {
  try {
    // 1. Try fetching from Firestore collection 'exams'
    const colRef = collection(db, "exams");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const remoteExams: ExamItem[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ExamItem, "id">),
      }));

      // Cache to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("school_exams_cache", JSON.stringify(remoteExams));
      }
      return remoteExams;
    } else {
      // Khi Firestore chưa có đề thi, tự động ghi liên kết đề thi lên Firestore
      try {
        const batch = writeBatch(db);
        DEFAULT_EXAMS.forEach((exam) => {
          const docRef = doc(db, "exams", exam.id);
          batch.set(docRef, { ...exam, createdAt: serverTimestamp() }, { merge: true });
        });
        batch.commit().catch((err) => console.warn("Auto sync exams note:", err));
      } catch (e) {
        console.warn("Auto sync exams error:", e);
      }
    }
  } catch (err) {
    console.warn("Firestore fetch exams note (using local cache):", err);
  }

  // Fallback to localStorage or DEFAULT_EXAMS
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("school_exams_cache");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore parse error
      }
    }
  }

  return DEFAULT_EXAMS;
}

export async function getExamByCode(code: string): Promise<ExamItem | null> {
  const all = await getAllExams();
  const trimmed = (code || "").trim().toLowerCase();

  // 1. Direct match by primary accessCode or exam ID
  const directFound = all.find(
    (e) =>
      (e.accessCode && e.accessCode.trim().toLowerCase() === trimmed) ||
      e.id.toLowerCase() === trimmed
  );
  if (directFound) return directFound;

  // 2. Match by variant code inside exam.variants (Đề thi đã trộn)
  for (const ex of all) {
    if (ex.variants && ex.variants.length > 0) {
      const matchedVariant = ex.variants.find(
        (v) => (v.code || "").trim().toLowerCase() === trimmed
      );
      if (matchedVariant) {
        // Trả về bản sao đề thi được gán mã đề và khung đáp án chuẩn xác của variant đó
        return {
          ...ex,
          accessCode: matchedVariant.code,
          title: `${ex.title} (Mã đề: ${matchedVariant.code})`,
          answerKey: {
            part1: matchedVariant.answerKey?.part1 || ex.answerKey?.part1,
            part2: matchedVariant.answerKey?.part2 || ex.answerKey?.part2,
            part3: matchedVariant.answerKey?.part3 || ex.answerKey?.part3,
          },
        };
      }
    }
  }

  return null;
}

export async function saveNewExam(exam: Omit<ExamItem, "id">): Promise<{ success: boolean; id?: string }> {
  // Clean undefined values to prevent Firestore rejection
  const cleanPayload: Record<string, any> = {};
  for (const [key, value] of Object.entries(exam)) {
    if (value !== undefined) {
      cleanPayload[key] = value;
    }
  }

  try {
    // 1. Save to Firestore
    const colRef = collection(db, "exams");
    const docRef = await addDoc(colRef, {
      ...cleanPayload,
      createdAt: serverTimestamp(),
    });

    const newExamItem: ExamItem = {
      id: docRef.id,
      ...exam,
      createdAt: new Date().toISOString(),
    };

    // 2. Update local storage
    if (typeof window !== "undefined") {
      const current = await getAllExams();
      const updated = [newExamItem, ...current];
      localStorage.setItem("school_exams_cache", JSON.stringify(updated));
      broadcastDataUpdate();
    }

    return { success: true, id: docRef.id };
  } catch (error) {
    console.warn("Firestore save new exam error, storing locally:", error);
    // Local fallback
    const id = "exam_" + Date.now();
    const newExamItem: ExamItem = {
      id,
      ...exam,
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const current = await getAllExams();
      const updated = [newExamItem, ...current];
      localStorage.setItem("school_exams_cache", JSON.stringify(updated));
      broadcastDataUpdate();
    }

    return { success: true, id };
  }
}

export async function updateExam(examId: string, updates: Partial<ExamItem>): Promise<boolean> {
  const cleanUpdates: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  }

  try {
    const docRef = doc(db, "exams", examId);
    await updateDoc(docRef, cleanUpdates);
  } catch (err) {
    console.warn("Firestore update exam error, falling back to local:", err);
  }

  if (typeof window !== "undefined") {
    const current = await getAllExams();
    const updated = current.map((e) => (e.id === examId ? { ...e, ...updates } : e));
    localStorage.setItem("school_exams_cache", JSON.stringify(updated));
    broadcastDataUpdate();
  }
  return true;
}

export async function deleteExam(examId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "exams", examId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore delete exam note:", err);
  }

  if (typeof window !== "undefined") {
    const current = await getAllExams();
    const updated = current.filter((e) => e.id !== examId);
    localStorage.setItem("school_exams_cache", JSON.stringify(updated));
    broadcastDataUpdate();
  }
  return true;
}

/* =========================================================
   2. DOCUMENT MANAGEMENT (GIAO TÀI LIỆU)
========================================================= */

export async function getAllDocuments(): Promise<DocumentItem[]> {
  try {
    const colRef = collection(db, "documents");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const remoteDocs: DocumentItem[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<DocumentItem, "id">),
      }));

      if (typeof window !== "undefined") {
        localStorage.setItem("school_documents_cache", JSON.stringify(remoteDocs));
      }
      return remoteDocs;
    } else {
      // Khi Firestore chưa có tài liệu, tự động ghi liên kết tài liệu lên Firestore
      try {
        const batch = writeBatch(db);
        DEFAULT_DOCUMENTS.forEach((docItem) => {
          const docRef = doc(db, "documents", docItem.id);
          batch.set(docRef, { ...docItem, createdAt: serverTimestamp() }, { merge: true });
        });
        batch.commit().catch((err) => console.warn("Auto sync documents note:", err));
      } catch (e) {
        console.warn("Auto sync documents error:", e);
      }
    }
  } catch (err) {
    console.warn("Firestore fetch documents note (using local cache):", err);
  }

  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("school_documents_cache");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore parse error
      }
    }
  }

  return DEFAULT_DOCUMENTS;
}

export async function saveNewDocument(
  docData: Omit<DocumentItem, "id">
): Promise<{ success: boolean; id?: string }> {
  try {
    const colRef = collection(db, "documents");
    const docRef = await addDoc(colRef, {
      ...docData,
      createdAt: serverTimestamp(),
    });

    const newDocItem: DocumentItem = {
      id: docRef.id,
      ...docData,
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const current = await getAllDocuments();
      const updated = [newDocItem, ...current];
      localStorage.setItem("school_documents_cache", JSON.stringify(updated));
      broadcastDataUpdate();
    }

    return { success: true, id: docRef.id };
  } catch (error) {
    console.warn("Firestore save document error, storing locally:", error);
    const id = "doc_" + Date.now();
    const newDocItem: DocumentItem = {
      id,
      ...docData,
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const current = await getAllDocuments();
      const updated = [newDocItem, ...current];
      localStorage.setItem("school_documents_cache", JSON.stringify(updated));
      broadcastDataUpdate();
    }

    return { success: true, id };
  }
}

export async function updateDocument(
  docId: string,
  data: Partial<DocumentItem>
): Promise<boolean> {
  try {
    const docRef = doc(db, "documents", docId);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  } catch (err) {
    console.warn("Firestore update document note:", err);
  }

  if (typeof window !== "undefined") {
    const current = await getAllDocuments();
    const updated = current.map((d) => (d.id === docId ? { ...d, ...data } : d));
    localStorage.setItem("school_documents_cache", JSON.stringify(updated));
    broadcastDataUpdate();
  }
  return true;
}

export async function deleteDocument(docId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "documents", docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore delete document note:", err);
  }

  if (typeof window !== "undefined") {
    const current = await getAllDocuments();
    const updated = current.filter((d) => d.id !== docId);
    localStorage.setItem("school_documents_cache", JSON.stringify(updated));
    broadcastDataUpdate();
  }
  return true;
}

/* =========================================================
   3. LEARNING MANAGEMENT (QUẢN LÝ HỌC TẬP & KẾT QUẢ)
========================================================= */

export async function saveExamSubmission(submission: ExamSubmission) {
  const classification = getScoreClassification(submission.score);
  const enrichedSubmission: ExamSubmission = {
    ...submission,
    rank: submission.rank || classification.label,
  };

  try {
    const colRef = collection(db, "submissions");
    const docRef = await addDoc(colRef, {
      ...enrichedSubmission,
      submittedAt: serverTimestamp(),
    });

    // Also store in localStorage history
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("school_submissions_cache");
      const list: ExamSubmission[] = cached ? JSON.parse(cached) : [];
      list.unshift({
        ...enrichedSubmission,
        id: docRef.id,
        formattedTime: new Date().toLocaleTimeString("vi-VN") + " " + new Date().toLocaleDateString("vi-VN"),
      });
      localStorage.setItem("school_submissions_cache", JSON.stringify(list.slice(0, 50)));
      broadcastDataUpdate();
    }

    return { success: true, id: docRef.id };
  } catch (error) {
    console.warn("Error saving submission to Firestore (using local):", error);
    const id = "sub_" + Date.now();
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("school_submissions_cache");
      const list: ExamSubmission[] = cached ? JSON.parse(cached) : [];
      list.unshift({
        ...enrichedSubmission,
        id,
        formattedTime: new Date().toLocaleTimeString("vi-VN") + " " + new Date().toLocaleDateString("vi-VN"),
      });
      localStorage.setItem("school_submissions_cache", JSON.stringify(list.slice(0, 50)));
      broadcastDataUpdate();
    }
    return { success: true, id };
  }
}

export async function saveStudentResult(resultData: {
  examId: string;
  examTitle: string;
  examCode: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  score: number;
  detailedResults: {
    part1: { correct: number; total: number; score?: number };
    part2: { correct: number; total: number; score?: number };
    part3: { correct: number; total: number; score?: number };
  };
  answers?: unknown;
  violation?: string;
}) {
  try {
    const colRef = collection(db, "student_results");
    const docRef = await addDoc(colRef, {
      ...resultData,
      submittedAt: serverTimestamp(),
    });

    // Also sync to submissions collection for admin learning dashboard
    await saveExamSubmission({
      examId: resultData.examId,
      examTitle: resultData.examTitle,
      examCode: resultData.examCode,
      studentId: resultData.studentId,
      studentName: resultData.studentName,
      studentClass: resultData.className,
      score: resultData.score,
      violation: resultData.violation,
      totalQuestions:
        resultData.detailedResults.part1.total +
        resultData.detailedResults.part2.total +
        resultData.detailedResults.part3.total,
      detailedResults: resultData.detailedResults,
    });

    return { success: true, id: docRef.id };
  } catch (err) {
    console.warn("Save student result error:", err);
    // Local fallback
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("school_student_results") || "[]";
      try {
        const list = JSON.parse(cached);
        list.unshift({ ...resultData, id: "res_" + Date.now(), submittedAt: new Date().toISOString() });
        localStorage.setItem("school_student_results", JSON.stringify(list));
      } catch (e) {
        console.warn("localStorage parse note:", e);
      }
    }
    await saveExamSubmission({
      examId: resultData.examId,
      examTitle: resultData.examTitle,
      examCode: resultData.examCode,
      studentId: resultData.studentId,
      studentName: resultData.studentName,
      studentClass: resultData.className,
      score: resultData.score,
      totalQuestions:
        resultData.detailedResults.part1.total +
        resultData.detailedResults.part2.total +
        resultData.detailedResults.part3.total,
      detailedResults: resultData.detailedResults,
    });
    return { success: true, id: "local_" + Date.now() };
  }
}

export async function getRecentSubmissions(count = 20): Promise<ExamSubmission[]> {
  try {
    const colRef = collection(db, "submissions");
    const q = query(colRef, orderBy("submittedAt", "desc"), limit(count));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        let formattedTime = "";
        if (d.submittedAt && typeof d.submittedAt === "object" && "toDate" in d.submittedAt) {
          const date = (d.submittedAt as { toDate: () => Date }).toDate();
          formattedTime = date.toLocaleTimeString("vi-VN") + " " + date.toLocaleDateString("vi-VN");
        }
        return {
          id: docSnap.id,
          ...d,
          formattedTime: formattedTime || "Vừa xong",
        } as ExamSubmission;
      });
    }
  } catch (error) {
    console.warn("Error fetching submissions from Firebase, using cache:", error);
  }

  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("school_submissions_cache");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
  }

  // Initial mock submissions for rich initial dashboard
  return [
    {
      id: "sub-1",
      examId: "ex-1",
      examTitle: "Đề phát triển đề minh họa THPT 2026 - Môn Toán",
      studentName: "Nguyễn Hoàng Nam",
      studentClass: "12A1",
      studentEmail: "hoangnam.tuyduc@gmail.com",
      score: 9.6,
      totalQuestions: 34,
      formattedTime: "15:42 29/09/2026",
      rank: "Xuất sắc",
    },
    {
      id: "sub-2",
      examId: "ex-2",
      examTitle: "Đề thi thử lần 1 - Chuyên KHTN Hà Nội",
      studentName: "Trần Mai Anh",
      studentClass: "12A1",
      studentEmail: "maianh.12a1@gmail.com",
      score: 9.2,
      totalQuestions: 34,
      formattedTime: "14:15 29/09/2026",
      rank: "Xuất sắc",
    },
    {
      id: "sub-3",
      examId: "ex-3",
      examTitle: "Đề khảo sát chất lượng Vật Lí 12 - Dao động & Sóng",
      studentName: "Lê Quốc Bảo",
      studentClass: "12A2",
      studentEmail: "quocbao.tuyduc@gmail.com",
      score: 8.8,
      totalQuestions: 40,
      formattedTime: "11:30 29/09/2026",
      rank: "Giỏi",
    },
    {
      id: "sub-4",
      examId: "ex-4",
      examTitle: "Đề thi thử THPT Quốc Gia - Hóa học Este, Lipit",
      studentName: "Phạm Thúy Hằng",
      studentClass: "12A3",
      studentEmail: "thuyhang.12a3@gmail.com",
      score: 8.5,
      totalQuestions: 40,
      formattedTime: "09:20 29/09/2026",
      rank: "Giỏi",
    },
    {
      id: "sub-5",
      examId: "ex-5",
      examTitle: "Đề thi thử Tiếng Anh THPT 2026 - Đọc hiểu nâng cao",
      studentName: "Vũ Hải Đăng",
      studentClass: "12A1",
      studentEmail: "haidang.tuyduc@gmail.com",
      score: 7.8,
      totalQuestions: 50,
      formattedTime: "08:05 29/09/2026",
      rank: "Khá",
    },
  ];
}

export interface ScoreClassification {
  code: "xuat_sac" | "gioi" | "kha" | "dat" | "chua_dat" | "chua_thi";
  label: "Xuất sắc" | "Giỏi" | "Khá" | "Đạt" | "Chưa đạt" | "Chưa thi";
  icon: string;
  bg: string;
  color: string;
  border: string;
  gradeText: string;
}

/**
 * Xếp loại thành tích học sinh chuẩn theo yêu cầu:
 * - Dưới 3.5 điểm: Chưa đạt
 * - Từ 3.5 điểm đến dưới 6.5 điểm: Đạt
 * - 6.5 điểm đến 7.9 điểm: Khá
 * - 8 điểm đến 8.9 điểm: Giỏi
 * - 9 điểm trở lên: Xuất sắc
 */
export function getScoreClassification(score: number | null | undefined): ScoreClassification {
  if (score === null || score === undefined || isNaN(score)) {
    return {
      code: "chua_thi",
      label: "Chưa thi",
      icon: "⏳",
      bg: "#f8fafc",
      color: "#64748b",
      border: "#cbd5e1",
      gradeText: "Chưa làm bài",
    };
  }

  // 1. 9 điểm trở lên là xuất sắc (>= 9.0)
  if (score >= 9.0) {
    return {
      code: "xuat_sac",
      label: "Xuất sắc",
      icon: "🌟",
      bg: "#ecfdf5",
      color: "#047857",
      border: "#a7f3d0",
      gradeText: "Từ 9.0 điểm trở lên",
    };
  }

  // 2. 8 điểm đến 8.9 điểm là giỏi (8.0 <= score < 9.0)
  if (score >= 8.0) {
    return {
      code: "gioi",
      label: "Giỏi",
      icon: "💎",
      bg: "#eff6ff",
      color: "#1d4ed8",
      border: "#bfdbfe",
      gradeText: "8.0 - 8.9 điểm",
    };
  }

  // 3. 6.5 điểm đến 7.9 điểm là khá (6.5 <= score < 8.0)
  if (score >= 6.5) {
    return {
      code: "kha",
      label: "Khá",
      icon: "✨",
      bg: "#f5f3ff",
      color: "#6d28d9",
      border: "#ddd6fe",
      gradeText: "6.5 - 7.9 điểm",
    };
  }

  // 4. từ 3.5 điểm đến dưới 6.5 điểm là đạt (3.5 <= score < 6.5)
  if (score >= 3.5) {
    return {
      code: "dat",
      label: "Đạt",
      icon: "📘",
      bg: "#fefce8",
      color: "#a16207",
      border: "#fef08a",
      gradeText: "3.5 - 6.4 điểm",
    };
  }

  // 5. dưới 3.5 điểm là chưa đạt (< 3.5)
  return {
    code: "chua_dat",
    label: "Chưa đạt",
    icon: "⚠️",
    bg: "#fef2f2",
    color: "#b91c1c",
    border: "#fecaca",
    gradeText: "Dưới 3.5 điểm",
  };
}

/**
 * Xuất danh sách kết quả thi & rèn luyện của học sinh ra Excel
 */
export function exportExamResultsToExcel(
  title: string,
  className: string,
  rows: Array<{
    rank: string | number;
    fullName: string;
    className: string;
    examTitle: string;
    hasSubmitted: boolean;
    score: number | null;
    correctText: string;
    submittedTime: string;
    trainingClassification: string;
  }>
) {
  const exportData = rows.map((r, idx) => ({
    "Hạng / STT": r.rank || idx + 1,
    "Họ và tên": r.fullName,
    "Lớp": r.className,
    "Bài thi / Đề thi": r.examTitle,
    "Trạng thái": r.hasSubmitted ? "Đã nộp bài" : "Chưa làm bài",
    "Điểm số": r.score !== null ? Number(r.score.toFixed(2)) : "—",
    "Số câu đúng": r.correctText,
    "Thời gian nộp": r.submittedTime,
    "Kết quả rèn luyện": r.trainingClassification,
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws["!cols"] = [
    { wch: 12 }, // Hạng / STT
    { wch: 28 }, // Họ và tên
    { wch: 12 }, // Lớp
    { wch: 35 }, // Bài thi
    { wch: 16 }, // Trạng thái
    { wch: 12 }, // Điểm số
    { wch: 14 }, // Số câu đúng
    { wch: 22 }, // Thời gian nộp
    { wch: 20 }, // Kết quả rèn luyện
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "KetQuaLamBai");
  const filename = `Bang_Diem_Ren_Luyen_${className ? className.replace(/\s+/g, "_") : "ToanTruong"}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Xóa một bài nộp thi theo ID khỏi Firestore và LocalStorage
 */
export async function deleteSubmission(submissionId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "submissions", submissionId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Delete submission from firestore note:", err);
  }

  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("school_submissions_cache");
    if (cached) {
      try {
        const list: ExamSubmission[] = JSON.parse(cached);
        const filtered = list.filter((s) => s.id !== submissionId);
        localStorage.setItem("school_submissions_cache", JSON.stringify(filtered));
      } catch (e) {
        console.warn("localStorage parse note:", e);
      }
    }
    broadcastDataUpdate();
  }
  return true;
}

/**
 * Xóa sạch toàn bộ những bài nộp của học sinh KHÔNG có trong danh sách chính thức
 * (hoặc học sinh ẩn danh/mẫu 'Học sinh THPT Tuy Đức')
 */
export async function purgeInvalidSubmissions(validStudentNames: string[]): Promise<{ deletedCount: number }> {
  let count = 0;
  const normalizedValid = new Set(
    validStudentNames.map((n) => (n || "").trim().toLowerCase()).filter(Boolean)
  );

  // 1. Quét và xóa khỏi Firestore collection 'submissions'
  try {
    const colRef = collection(db, "submissions");
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    let batchHasDocs = false;

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const rawName = (data.studentName || "").trim();
      const nameLower = rawName.toLowerCase();
      const isPlaceholder = nameLower.includes("học sinh thpt tuy đức") || nameLower === "thí sinh" || !nameLower;
      const isNotInList = normalizedValid.size > 0 && !normalizedValid.has(nameLower);

      if (isPlaceholder || isNotInList) {
        batch.delete(docSnap.ref);
        batchHasDocs = true;
        count++;
      }
    });

    if (batchHasDocs) {
      await batch.commit();
    }
  } catch (err) {
    console.warn("Purge firestore submissions note:", err);
  }

  // 2. Quét và xóa khỏi Firestore collection 'student_results'
  try {
    const colRef = collection(db, "student_results");
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    let batchHasDocs = false;

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const rawName = (data.studentName || "").trim();
      const nameLower = rawName.toLowerCase();
      const isPlaceholder = nameLower.includes("học sinh thpt tuy đức") || nameLower === "thí sinh" || !nameLower;
      const isNotInList = normalizedValid.size > 0 && !normalizedValid.has(nameLower);

      if (isPlaceholder || isNotInList) {
        batch.delete(docSnap.ref);
        batchHasDocs = true;
      }
    });

    if (batchHasDocs) {
      await batch.commit();
    }
  } catch (err) {
    console.warn("Purge firestore student_results note:", err);
  }

  // 3. Xóa khỏi localStorage
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("school_submissions_cache");
    if (cached) {
      try {
        const list: ExamSubmission[] = JSON.parse(cached);
        const filtered = list.filter((s) => {
          const rawName = (s.studentName || "").trim();
          const nameLower = rawName.toLowerCase();
          const isPlaceholder = nameLower.includes("học sinh thpt tuy đức") || nameLower === "thí sinh" || !nameLower;
          const isNotInList = normalizedValid.size > 0 && !normalizedValid.has(nameLower);
          return !isPlaceholder && !isNotInList;
        });
        localStorage.setItem("school_submissions_cache", JSON.stringify(filtered));
      } catch (e) {
        console.warn("localStorage parse note:", e);
      }
    }

    const cachedResults = localStorage.getItem("school_student_results");
    if (cachedResults) {
      try {
        const list: any[] = JSON.parse(cachedResults);
        const filtered = list.filter((s) => {
          const rawName = (s.studentName || "").trim();
          const nameLower = rawName.toLowerCase();
          const isPlaceholder = nameLower.includes("học sinh thpt tuy đức") || nameLower === "thí sinh" || !nameLower;
          const isNotInList = normalizedValid.size > 0 && !normalizedValid.has(nameLower);
          return !isPlaceholder && !isNotInList;
        });
        localStorage.setItem("school_student_results", JSON.stringify(filtered));
      } catch (e) {
        console.warn("localStorage parse note:", e);
      }
    }

    broadcastDataUpdate();
  }

  return { deletedCount: count };
}

/**
 * Lấy lịch sử nộp bài và kết quả chi tiết của học sinh
 */
export async function getStudentSubmissions(studentId?: string, studentName?: string): Promise<any[]> {
  const results: any[] = [];
  if (typeof window !== "undefined") {
    try {
      const rawRes = localStorage.getItem("school_student_results");
      if (rawRes) {
        const list = JSON.parse(rawRes);
        if (Array.isArray(list)) {
          list.forEach((item) => {
            const matchId = studentId && item.studentId === studentId;
            const matchName =
              studentName &&
              item.studentName &&
              item.studentName.toLowerCase().trim() === studentName.toLowerCase().trim();
            if (matchId || matchName) {
              results.push(item);
            }
          });
        }
      }
    } catch (e) {
      console.warn("Parse student results note:", e);
    }
  }
  return results;
}



