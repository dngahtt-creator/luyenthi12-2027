import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

export interface CurriculumLesson {
  id: string;
  lessonNumber: number;
  title: string;
  description?: string;
  durationMinutes?: number;
  materialsUrl?: string;
}

export interface CurriculumChapter {
  id: string;
  chapterNumber: number;
  title: string;
  description?: string;
  lessons: CurriculumLesson[];
}

export interface CurriculumItem {
  id: string;
  title: string;
  subject: string; // "toan", "tin", "ly", "hoa", "sinh", "van", "anh", etc.
  subjectName: string;
  grade: string; // "Lớp 12", "Lớp 11", "Lớp 10"
  school: string;
  author: string;
  academicYear: string;
  description: string;
  totalChapters: number;
  totalLessons: number;
  estimatedHours: number;
  fileUrl?: string; // File PDF giáo trình hoặc sách chuyên đề
  fileName?: string;
  assignedClasses: string[]; // Danh sách ID lớp học được giao
  status: "ACTIVE" | "DRAFT";
  chapters: CurriculumChapter[];
  createdAt: string;
  updatedAt: string;
}

const LOCAL_CURRICULUM_KEY = "school_curriculums_cache_v1";

function broadcastCurriculumUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("school_curriculum_updated"));
    window.dispatchEvent(new Event("school_data_updated"));
  }
}

// Dữ liệu giáo trình mẫu chuẩn theo chương trình GDPT 2018 / 2026
export const DEFAULT_CURRICULUMS: CurriculumItem[] = [
  {
    id: "curr-toan-12-ham-so",
    title: "Giáo trình Chuyên đề Hàm số & Ứng dụng Đạo hàm 12",
    subject: "toan",
    subjectName: "Toán học",
    grade: "Lớp 12",
    school: "THPT DTNT THCS & THPT Tuy Đức",
    author: "Cô Đặng Anh Thư",
    academicYear: "2025 - 2026",
    description: "Giáo trình hệ thống hóa toàn bộ kiến thức tính đơn điệu, cực trị, tiệm cận và khảo sát vẽ đồ thị hàm số chuẩn cấu trúc Bộ GD&ĐT 2026.",
    totalChapters: 3,
    totalLessons: 8,
    estimatedHours: 24,
    fileUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    fileName: "Giao_Trinh_Ham_So_Lop_12_Co_Dang_Anh_Thu.pdf",
    assignedClasses: ["cls-12a1", "cls-12a2"],
    status: "ACTIVE",
    chapters: [
      {
        id: "chap-1",
        chapterNumber: 1,
        title: "Chương I. Tính đơn điệu & Cực trị của hàm số",
        description: "Phương pháp xét dấu đạo hàm, điều kiện đủ cực trị và các dạng toán tham số m.",
        lessons: [
          {
            id: "les-1-1",
            lessonNumber: 1,
            title: "Bài 1: Sự đồng biến, nghịch biến của hàm số",
            description: "Định lý mở rộng về dấu đạo hàm cấp 1, tìm khoảng đơn điệu.",
            durationMinutes: 90,
          },
          {
            id: "les-1-2",
            lessonNumber: 2,
            title: "Bài 2: Cực trị của hàm số và bài toán chứa tham số m",
            description: "Cực đại, cực tiểu, điều kiện có n điểm cực trị thỏa mãn hệ thức.",
            durationMinutes: 90,
          },
          {
            id: "les-1-3",
            lessonNumber: 3,
            title: "Bài 3: Giá trị lớn nhất và nhỏ nhất trên đoạn [a; b]",
            description: "Quy tắc tìm GTLN, GTNN và ứng dụng giải bài toán thực tế.",
            durationMinutes: 90,
          },
        ],
      },
      {
        id: "chap-2",
        chapterNumber: 2,
        title: "Chương II. Đường tiệm cận & Khảo sát đồ thị hàm số",
        description: "Tiệm cận đứng, tiệm cận ngang, tiệm cận xiên và tâm đối xứng.",
        lessons: [
          {
            id: "les-2-1",
            lessonNumber: 4,
            title: "Bài 4: Đường tiệm cận đứng, tiệm cận ngang và tiệm cận xiên",
            description: "Khái niệm tiệm cận xiên theo chương trình mới 2026.",
            durationMinutes: 90,
          },
          {
            id: "les-2-2",
            lessonNumber: 5,
            title: "Bài 5: Khảo sát và vẽ đồ thị hàm số phân thức bậc nhất / bậc nhất",
            description: "Bảng biến thiên, tâm đối xứng và giao điểm với trục tọa độ.",
            durationMinutes: 90,
          },
          {
            id: "les-2-3",
            lessonNumber: 6,
            title: "Bài 6: Khảo sát đồ thị hàm phân thức bậc hai / bậc nhất",
            description: "Nhận dạng đồ thị, tiệm cận xiên và bài toán tương giao.",
            durationMinutes: 90,
          },
        ],
      },
      {
        id: "chap-3",
        chapterNumber: 3,
        title: "Chương III. Ứng dụng thực tế & Tối ưu hóa",
        description: "Mô hình hóa bài toán kinh tế, sản xuất, hình học tối ưu diện tích và thể tích.",
        lessons: [
          {
            id: "les-3-1",
            lessonNumber: 7,
            title: "Bài 7: Bài toán tối ưu hóa kinh tế & sản xuất",
            description: "Tìm chi phí tối thiểu, doanh thu tối đa bằng đạo hàm.",
            durationMinutes: 90,
          },
          {
            id: "les-3-2",
            lessonNumber: 8,
            title: "Bài 8: Ôn tập tổng kết chuyên đề & Đề kiểm tra đánh giá năng lực",
            description: "Kiểm tra trắc nghiệm 3 phần chuẩn định dạng kỳ thi tốt nghiệp THPT.",
            durationMinutes: 90,
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "curr-tin-12-csdl",
    title: "Giáo trình Tin học 12 - Hệ Cơ sở dữ liệu & Ngôn ngữ SQL",
    subject: "tin",
    subjectName: "Tin học",
    grade: "Lớp 12",
    school: "THPT DTNT THCS & THPT Tuy Đức",
    author: "Tổ Tin Học - THPT Tuy Đức",
    academicYear: "2025 - 2026",
    description: "Giáo trình hướng dẫn thiết kế cơ sở dữ liệu quan hệ, truy vấn dữ liệu SQL và bảo mật thông tin chuẩn định hướng Khoa học máy tính.",
    totalChapters: 2,
    totalLessons: 6,
    estimatedHours: 18,
    fileUrl: "",
    fileName: "Giao_Trinh_Tin_Hoc_12_CSDL.pdf",
    assignedClasses: ["cls-12a1", "cls-12a2"],
    status: "ACTIVE",
    chapters: [
      {
        id: "chap-tin-1",
        chapterNumber: 1,
        title: "Chương I. Cơ sở dữ liệu quan hệ",
        description: "Khái niệm bảng, khóa chính, khóa ngoại và liên kết dữ liệu.",
        lessons: [
          {
            id: "les-t-1",
            lessonNumber: 1,
            title: "Bài 1: Khái niệm hệ cơ sở dữ liệu quan hệ",
            description: "Thực thể, thuộc tính và cấu trúc bảng quan hệ.",
            durationMinutes: 90,
          },
          {
            id: "les-t-2",
            lessonNumber: 2,
            title: "Bài 2: Khóa chính, khóa ngoại và toàn vẹn dữ liệu",
            description: "Xác định khóa và thiết lập quan hệ 1 - nhiều.",
            durationMinutes: 90,
          },
          {
            id: "les-t-3",
            lessonNumber: 3,
            title: "Bài 3: Thiết kế mô hình ERD và chuẩn hóa dữ liệu",
            description: "Chuẩn 1NF, 2NF, 3NF trong phân tích hệ thống.",
            durationMinutes: 90,
          },
        ],
      },
      {
        id: "chap-tin-2",
        chapterNumber: 2,
        title: "Chương II. Ngôn ngữ truy vấn SQL",
        description: "Các câu lệnh SELECT, WHERE, JOIN, GROUP BY và cập nhật dữ liệu.",
        lessons: [
          {
            id: "les-t-4",
            lessonNumber: 4,
            title: "Bài 4: Truy vấn cơ bản với SELECT và WHERE",
            description: "Lọc dữ liệu, sắp xếp ORDER BY và toán tử logic.",
            durationMinutes: 90,
          },
          {
            id: "les-t-5",
            lessonNumber: 5,
            title: "Bài 5: Gom nhóm dữ liệu GROUP BY và hàm tổng hợp",
            description: "COUNT, SUM, AVG, MAX, MIN và điều kiện HAVING.",
            durationMinutes: 90,
          },
          {
            id: "les-t-6",
            lessonNumber: 6,
            title: "Bài 6: Kết nối nhiều bảng với INNER JOIN & LEFT JOIN",
            description: "Trích xuất thông tin liên bảng từ mô hình CSDL trường học.",
            durationMinutes: 90,
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 1. LẤY TOÀN BỘ GIÁO TRÌNH
export async function getAllCurriculums(): Promise<CurriculumItem[]> {
  try {
    const colRef = collection(db, "curriculums");
    const q = query(colRef, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const list: CurriculumItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || "",
          subject: data.subject || "toan",
          subjectName: data.subjectName || "Toán học",
          grade: data.grade || "Lớp 12",
          school: data.school || "THPT Tuy Đức",
          author: data.author || "Cô Đặng Anh Thư",
          academicYear: data.academicYear || "2025 - 2026",
          description: data.description || "",
          totalChapters: data.totalChapters || 0,
          totalLessons: data.totalLessons || 0,
          estimatedHours: data.estimatedHours || 0,
          fileUrl: data.fileUrl || "",
          fileName: data.fileName || "",
          assignedClasses: Array.isArray(data.assignedClasses) ? data.assignedClasses : [],
          status: data.status || "ACTIVE",
          chapters: Array.isArray(data.chapters) ? data.chapters : [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_CURRICULUM_KEY, JSON.stringify(list));
      }
      return list;
    }
  } catch (err) {
    console.warn("Firestore fetch curriculums note, using local fallback:", err);
  }

  // Local storage fallback
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_CURRICULUM_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
      // Initialize with defaults
      localStorage.setItem(LOCAL_CURRICULUM_KEY, JSON.stringify(DEFAULT_CURRICULUMS));
      return DEFAULT_CURRICULUMS;
    } catch (e) {
      console.warn("Error reading local curriculums:", e);
    }
  }
  return DEFAULT_CURRICULUMS;
}

// 2. LẤY GIÁO TRÌNH PHÙ HỢP VỚI LỚP HỌC (CHO TRANG HỌC SINH)
export async function getCurriculumsForClass(classId?: string, className?: string): Promise<CurriculumItem[]> {
  const all = await getAllCurriculums();
  if (!classId && !className) return all;

  const cleanClassId = (classId || "").trim().toLowerCase();
  const cleanClassName = (className || "").trim().toLowerCase();

  return all.filter((c) => {
    if (c.status !== "ACTIVE") return false;
    if (!c.assignedClasses || c.assignedClasses.length === 0) return true; // Giao cho tất cả nếu rỗng
    return c.assignedClasses.some((id) => {
      const clean = id.trim().toLowerCase();
      return clean === "all" || clean === cleanClassId || clean === cleanClassName;
    });
  });
}

// 3. TẠO MỚI GIÁO TRÌNH
export async function saveNewCurriculum(
  curriculum: Omit<CurriculumItem, "id" | "createdAt" | "updatedAt">
): Promise<{ success: boolean; id: string }> {
  const id = `curr_${Date.now()}`;
  const now = new Date().toISOString();

  const totalChapters = curriculum.chapters ? curriculum.chapters.length : 0;
  const totalLessons = curriculum.chapters
    ? curriculum.chapters.reduce((sum, ch) => sum + (ch.lessons ? ch.lessons.length : 0), 0)
    : 0;

  const newCurriculum: CurriculumItem = {
    ...curriculum,
    id,
    totalChapters,
    totalLessons,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, "curriculums", id);
    await setDoc(docRef, {
      ...newCurriculum,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Firestore save curriculum note, saving locally:", err);
  }

  if (typeof window !== "undefined") {
    const current = await getAllCurriculums();
    const updated = [newCurriculum, ...current];
    localStorage.setItem(LOCAL_CURRICULUM_KEY, JSON.stringify(updated));
    broadcastCurriculumUpdate();
  }

  return { success: true, id };
}

// 4. CẬP NHẬT GIÁO TRÌNH
export async function updateCurriculum(
  id: string,
  updates: Partial<CurriculumItem>
): Promise<boolean> {
  const current = await getAllCurriculums();
  const target = current.find((c) => c.id === id);
  if (!target) return false;

  const chapters = updates.chapters || target.chapters;
  const totalChapters = chapters ? chapters.length : 0;
  const totalLessons = chapters
    ? chapters.reduce((sum, ch) => sum + (ch.lessons ? ch.lessons.length : 0), 0)
    : 0;

  const updatedCurriculum: CurriculumItem = {
    ...target,
    ...updates,
    totalChapters,
    totalLessons,
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, "curriculums", id);
    await setDoc(docRef, {
      ...updatedCurriculum,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Firestore update curriculum note:", err);
  }

  if (typeof window !== "undefined") {
    const updated = current.map((c) => (c.id === id ? updatedCurriculum : c));
    localStorage.setItem(LOCAL_CURRICULUM_KEY, JSON.stringify(updated));
    broadcastCurriculumUpdate();
  }

  return true;
}

// 5. XÓA GIÁO TRÌNH
export async function deleteCurriculum(id: string): Promise<boolean> {
  try {
    const docRef = doc(db, "curriculums", id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore delete curriculum note:", err);
  }

  if (typeof window !== "undefined") {
    const current = await getAllCurriculums();
    const updated = current.filter((c) => c.id !== id);
    localStorage.setItem(LOCAL_CURRICULUM_KEY, JSON.stringify(updated));
    broadcastCurriculumUpdate();
  }

  return true;
}

// 6. 🤖 BỘ MÁY AI TẠO KHUNG GIÁO TRÌNH TỰ ĐỘNG CHUẨN BỘ GIÁO DỤC 2026
export function generateAICurriculum(params: {
  subject: string;
  grade: string;
  topicTitle: string;
}): {
  title: string;
  description: string;
  estimatedHours: number;
  chapters: CurriculumChapter[];
} {
  const { subject, grade, topicTitle } = params;
  const title = topicTitle.trim() || `Giáo trình Chuyên đề ${subject === "tin" ? "Tin học" : "Toán học"} - ${grade}`;

  if (subject === "tin") {
    return {
      title,
      description: `Khung giáo trình Tin học ${grade} theo định hướng Khoa học máy tính và Ứng dụng công nghệ thông tin chuẩn GDPT 2018/2026.`,
      estimatedHours: 24,
      chapters: [
        {
          id: `ai_chap_1_${Date.now()}`,
          chapterNumber: 1,
          title: "Chương I: Lập trình nâng cao & Cấu trúc dữ liệu",
          description: "Phương pháp thiết kế thuật toán, tối ưu hóa thời gian và không gian bộ nhớ.",
          lessons: [
            {
              id: `ai_les_1_1_${Date.now()}`,
              lessonNumber: 1,
              title: "Bài 1: Cấu trúc dữ liệu mảng và danh sách liên kết",
              description: "Thao tác chèn, xóa, tìm kiếm và phân tích độ phức tạp O(n).",
              durationMinutes: 90,
            },
            {
              id: `ai_les_1_2_${Date.now()}`,
              lessonNumber: 2,
              title: "Bài 2: Kỹ thuật đệ quy và giải thuật quay lui (Backtracking)",
              description: "Ứng dụng giải bài toán tổ hợp, xếp hậu và sinh chuỗi.",
              durationMinutes: 90,
            },
            {
              id: `ai_les_1_3_${Date.now()}`,
              lessonNumber: 3,
              title: "Bài 3: Quy hoạch động (Dynamic Programming)",
              description: "Bảng phương án, công thức truy hồi và bài toán cái túi.",
              durationMinutes: 90,
            },
          ],
        },
        {
          id: `ai_chap_2_${Date.now()}`,
          chapterNumber: 2,
          title: "Chương II: Hệ thống cơ sở dữ liệu & An toàn thông tin",
          description: "Mô hình quan hệ, bảo mật dữ liệu và chuẩn hóa thông tin.",
          lessons: [
            {
              id: `ai_les_2_1_${Date.now()}`,
              lessonNumber: 4,
              title: "Bài 4: Thiết kế cơ sở dữ liệu quan hệ và chỉ mục (Index)",
              description: "Tối ưu hóa câu lệnh truy vấn và lược đồ quan hệ.",
              durationMinutes: 90,
            },
            {
              id: `ai_les_2_2_${Date.now()}`,
              lessonNumber: 5,
              title: "Bài 5: An toàn dữ liệu, phòng chống SQL Injection",
              description: "Nguyên lý bảo mật và phân quyền người dùng trong CSDL.",
              durationMinutes: 90,
            },
          ],
        },
      ],
    };
  }

  // Mặc định Toán hoặc các môn khác
  return {
    title,
    description: `Khung giáo trình chuẩn Bộ GD&ĐT bám sát cấu trúc đề thi tốt nghiệp THPT 2026, phân hóa năng lực và rèn luyện tư duy toán học.`,
    estimatedHours: 28,
    chapters: [
      {
        id: `ai_chap_1_${Date.now()}`,
        chapterNumber: 1,
        title: "Chương I: Kiến thức trọng tâm & Phương pháp giải toán",
        description: "Hệ thống hóa định lý, công thức và kỹ năng biến đổi cơ bản.",
        lessons: [
          {
            id: `ai_les_1_1_${Date.now()}`,
            lessonNumber: 1,
            title: "Bài 1: Khái niệm cơ bản & Các dạng toán nhận biết - thông hiểu",
            description: "Nắm vững lý thuyết và áp dụng giải nhanh trắc nghiệm 4 đáp án.",
            durationMinutes: 90,
          },
          {
            id: `ai_les_1_2_${Date.now()}`,
            lessonNumber: 2,
            title: "Bài 2: Kỹ năng xử lý bài toán trắc nghiệm Đúng / Sai",
            description: "Phân tích 4 ý con a, b, c, d chuẩn format mới 2026.",
            durationMinutes: 90,
          },
        ],
      },
      {
        id: `ai_chap_2_${Date.now()}`,
        chapterNumber: 2,
        title: "Chương II: Vận dụng & Bài toán phân loại 8+",
        description: "Rèn luyện bài toán tham số, cực trị và hình học không gian phức tạp.",
        lessons: [
          {
            id: `ai_les_2_1_${Date.now()}`,
            lessonNumber: 3,
            title: "Bài 3: Phương pháp giải nhanh bài toán chứa tham số m",
            description: "Cô lập tham số, lập bảng biến thiên và sử dụng đồ thị hàm số.",
            durationMinutes: 90,
          },
          {
            id: `ai_les_2_2_${Date.now()}`,
            lessonNumber: 4,
            title: "Bài 4: Kỹ thuật trả lời ngắn dạng số thập phân và phân số",
            description: "Thao tác bấm máy tính cầm tay Casio chính xác tuyệt đối.",
            durationMinutes: 90,
          },
        ],
      },
      {
        id: `ai_chap_3_${Date.now()}`,
        chapterNumber: 3,
        title: "Chương III: Ứng dụng thực tế & Đề kiểm tra tổng kết",
        description: "Bài toán thực tiễn tối ưu hóa và đề thi tổng hợp đánh giá chuẩn đầu ra.",
        lessons: [
          {
            id: `ai_les_3_1_${Date.now()}`,
            lessonNumber: 5,
            title: "Bài 5: Mô hình hóa các bài toán thực tiễn cuộc sống",
            description: "Ứng dụng trong vật lý, kinh tế và sinh học.",
            durationMinutes: 90,
          },
          {
            id: `ai_les_3_2_${Date.now()}`,
            lessonNumber: 6,
            title: "Bài 6: Kiểm tra khảo sát chất lượng chuyên đề",
            description: "Đề thi thử chuẩn cấu trúc 3 phần với thời gian 90 phút.",
            durationMinutes: 90,
          },
        ],
      },
    ],
  };
}
