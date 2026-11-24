"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import {
  getAllExams,
  getAllDocuments,
  DEFAULT_EXAMS,
  DEFAULT_DOCUMENTS,
  ExamItem,
  DocumentItem,
} from "@/lib/examService";
import {
  LearningCategory,
  LearningItem,
  SectionCategoryType,
  DEFAULT_CATEGORIES,
  DEFAULT_ITEMS,
  getAllLearningCategories,
  getAllLearningItems,
  getYouTubeEmbedUrl,
  downloadDocxFile,
  downloadPdfFile,
} from "@/lib/learningCategoryService";
import {
  getAllCommunityDocs,
  CommunityDocumentItem,
} from "@/lib/communityDocService";
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogleFirebase,
  getAllRegisteredUsers,
  UserAccountData,
} from "@/lib/userService";
import {
  getAllClasses,
  getAllStudents,
  findTeacherByCode,
  setStudentPassword,
  SchoolClass,
  StudentItem,
  DEFAULT_STUDENTS,
} from "@/lib/classStudentService";
import {
  getCurrentAuthUser,
  setCurrentAuthUser,
  CurrentAuthUser,
  logoutAllSessions,
  logoutStudentSession,
  SUPER_ADMIN_EMAILS,
  UserRole,
  getDisplayedAccountName,
} from "@/lib/authService";

interface SimulatorQuestion {
  id: number;
  subject: string;
  title: string;
  difficultyTag: string;
  roomName: string;
  timer: string;
  questionTag: string;
  questionText: string;
  options: { letter: string; text: string }[];
  correctAnswerIndex: number;
  explanation: string;
  hint: string;
  targetScore: string;
  rankText: string;
}

const SIMULATOR_QUESTIONS: SimulatorQuestion[] = [
  {
    id: 1,
    subject: "Toán 12",
    title: "Toán 12: Khảo Sát Năng Lực Chuẩn Format 2027 📐",
    difficultyTag: "Đề Vận Dụng Cao",
    roomName: "PHÒNG THI #12A1 • THỰC CHIẾN 2027",
    timer: "48:20 còn lại",
    questionTag: "🎯 CÂU 28 / 34 • VẬN DỤNG CAO (MỤC TIÊU 9+)",
    questionText: "Cho hàm số y = f(x) có đạo hàm liên tục trên ℝ. Đồ thị hàm số y = f'(x) như hình vẽ. Hàm số g(x) = f(2 - x) đồng biến trên khoảng nào dưới đây?",
    options: [
      { letter: "A", text: "(1; 3)" },
      { letter: "B", text: "(-∞; -1)" },
      { letter: "C", text: "(0; 2)" },
      { letter: "D", text: "(2; +∞)" },
    ],
    correctAnswerIndex: 2,
    explanation: "Kỹ thuật: g'(x) = -f'(2 - x) > 0 ⇔ f'(2 - x) < 0. Bạn làm rất tốt!",
    hint: "Hãy tính đạo hàm g'(x) = (2 - x)' · f'(2 - x) = -f'(2 - x). Bấm đáp án C để thử lại nhé!",
    targetScore: "Mục tiêu: 9.6 / 10 🚀",
    rankText: "🥇 Top 5% Toàn Quốc",
  },
  {
    id: 2,
    subject: "Toán 12",
    title: "Toán 12: Hình Học Không Gian Oxyz Trọng Tâm 2027 📐",
    difficultyTag: "Vận Dụng Cao",
    roomName: "PHÒNG THI #12A2 • THỰC CHIẾN 2027",
    timer: "45:10 còn lại",
    questionTag: "🎯 CÂU 31 / 34 • PHÂN HÓA ĐIỂM 9+",
    questionText: "Trong không gian Oxyz, cho mặt phẳng (P): 2x - y + 2z - 6 = 0 và điểm M(1; 2; 3). Khoảng cách từ điểm M đến mặt phẳng (P) bằng bao nhiêu?",
    options: [
      { letter: "A", text: "4/3" },
      { letter: "B", text: "2" },
      { letter: "C", text: "1" },
      { letter: "D", text: "8/3" },
    ],
    correctAnswerIndex: 1,
    explanation: "Công thức: d(M, (P)) = |2(1) - 1(2) + 2(3) - 6| / √(2² + (-1)² + 2²) = 6/3 = 2. Tuyệt vời!",
    hint: "Áp dụng công thức d(M, P) = |Ax₀ + By₀ + Cz₀ + D| / √(A² + B² + C²). Bấm đáp án B để kiểm tra lại nhé!",
    targetScore: "Mục tiêu: 9.4 / 10 🚀",
    rankText: "🥈 Top 8% Toàn Quốc",
  },
  {
    id: 3,
    subject: "Vật lí 12",
    title: "Vật Lí 12: Đột Phá Điểm 10 Chuẩn Đề Minh Họa ⚡",
    difficultyTag: "Vận Dụng Cao",
    roomName: "PHÒNG THI CHUYÊN LÍ #12A1",
    timer: "42:50 còn lại",
    questionTag: "🎯 CÂU 36 / 40 • BỨT PHÁ TOP 1",
    questionText: "Một con lắc lò xo treo thẳng đứng dao động điều hòa với chu kỳ T = 0,4 s, biên độ A = 8 cm. Lấy g = π² = 10 m/s². Thời gian lò xo bị nén trong một chu kỳ là bao nhiêu?",
    options: [
      { letter: "A", text: "0,133 s" },
      { letter: "B", text: "0,200 s" },
      { letter: "C", text: "0,067 s" },
      { letter: "D", text: "0,267 s" },
    ],
    correctAnswerIndex: 0,
    explanation: "Độ dãn tại VTCB: Δl₀ = g·T² / (4π²) = 4 cm = A/2. Thời gian nén t = 2·(T/6) = T/3 ≈ 0,133 s. Quá xuất sắc!",
    hint: "Tìm độ giãn lò xo tại VTCB Δl₀ = g / ω², sau đó tính góc nén trên đường tròn lượng giác. Bấm đáp án A nhé!",
    targetScore: "Mục tiêu: 9.8 / 10 🚀",
    rankText: "🥇 Top 2% Toàn Quốc",
  },
  {
    id: 4,
    subject: "Hóa học 12",
    title: "Hóa Học 12: Tư Duy Dồn Chất & Đồng Đẳng Hóa 🧪",
    difficultyTag: "Mục Tiêu 9+",
    roomName: "PHÒNG THI CHUYÊN HÓA #12",
    timer: "39:15 còn lại",
    questionTag: "🎯 CÂU 35 / 40 • VẬN DỤNG CAO",
    questionText: "Thủy phân hoàn toàn 8,8 gam etyl axetat (CH₃COOC₂H₅) trong 150 ml dung dịch NaOH 1M, đun nóng. Sau phản ứng hoàn toàn, cô cạn dung dịch thu được m gam chất rắn khan. Giá trị của m là:",
    options: [
      { letter: "A", text: "8,2 gam" },
      { letter: "B", text: "10,2 gam" },
      { letter: "C", text: "12,2 gam" },
      { letter: "D", text: "14,8 gam" },
    ],
    correctAnswerIndex: 1,
    explanation: "n_este = 0,1 mol; n_NaOH = 0,15 mol (dư 0,05 mol). Chất rắn gồm CH₃COONa (8,2g) và NaOH dư (2,0g) => m = 10,2 gam. Chuẩn xác!",
    hint: "Lưu ý NaOH dùng dư! Chất rắn sau cô cạn gồm muối CH₃COONa và NaOH dư. Bấm đáp án B nhé!",
    targetScore: "Mục tiêu: 9.5 / 10 🚀",
    rankText: "🥇 Top 4% Toàn Quốc",
  },
  {
    id: 5,
    subject: "Tiếng Anh 12",
    title: "Tiếng Anh 12: Chinh Phục Điểm 9+ THPT Quốc Gia 🌐",
    difficultyTag: "Phân Hóa 9+",
    roomName: "PHÒNG THI TIẾNG ANH THPTQG",
    timer: "46:00 còn lại",
    questionTag: "🎯 CÂU 24 / 50 • TỪ VỰNG NÂNG CAO",
    questionText: 'Mark the letter A, B, C, or D to indicate the correct answer: "She decided to ______ the extra mile to assist her students with their university exam preparation."',
    options: [
      { letter: "A", text: "make" },
      { letter: "B", text: "turn" },
      { letter: "C", text: "go" },
      { letter: "D", text: "run" },
    ],
    correctAnswerIndex: 2,
    explanation: "Idiom: 'go the extra mile' mang ý nghĩa nỗ lực nhiều hơn bình thường để đạt kết quả tốt nhất. Bạn nhớ từ vựng rất đỉnh!",
    hint: "Cụm thành ngữ cố định (Idiom): 'go the extra mile' = làm nhiều hơn mong đợi. Bấm đáp án C nhé!",
    targetScore: "Mục tiêu: 9.6 / 10 🚀",
    rankText: "🥇 Top 3% Toàn Quốc",
  },
  {
    id: 6,
    subject: "Toán 12",
    title: "Toán 12: Xác Suất Có Điều Kiện Format 2027 🎲",
    difficultyTag: "Format Mới 2027",
    roomName: "PHÒNG THI TOÁN 2027 #12A1",
    timer: "35:40 còn lại",
    questionTag: "🎯 CÂU 29 / 34 • XÁC SUẤT ĐIỀU KIỆN",
    questionText: "Gieo một con xúc xắc cân đối và đồng chất hai lần liên tiếp. Biết rằng tổng số chấm xuất hiện trong hai lần gieo bằng 8. Tính xác suất để lần gieo thứ nhất xuất hiện mặt 5 chấm:",
    options: [
      { letter: "A", text: "1/6" },
      { letter: "B", text: "1/5" },
      { letter: "C", text: "5/36" },
      { letter: "D", text: "1/36" },
    ],
    correctAnswerIndex: 1,
    explanation: "Các cặp có tổng bằng 8: (2,6), (3,5), (4,4), (5,3), (6,2) (gồm 5 cặp). Cặp có lần 1 bằng 5 là (5,3). Xác suất điều kiện = 1/5. Rất sắc bén!",
    hint: "Liệt kê không gian mẫu biến cố điều kiện (tổng = 8), có đúng 5 cặp. Biến cố lần 1 ra 5 là (5,3). Bấm đáp án B nhé!",
    targetScore: "Mục tiêu: 9.7 / 10 🚀",
    rankText: "🥇 Top 3% Toàn Quốc",
  },
];

// =========================================================
// HELPER: HÌNH ẢNH BÌA SÁCH GIÁO KHOA MÔN HỌC & ĐỊNH DẠNG TÊN HIỂN THỊ
// =========================================================
function getSubjectCoverPath(name: string, type?: string): string {
  const lower = (name || "").toLowerCase();
  if (lower.includes("toán") || lower.includes("toan")) return "/subjects/toan.png";
  if (lower.includes("văn") || lower.includes("ngữ văn") || lower.includes("van")) return "/subjects/van.png";
  if (lower.includes("vật lí") || lower.includes("vật lý") || lower.includes("lí") || lower.includes("lý")) return "/subjects/vatli.png";
  if (lower.includes("hóa") || lower.includes("hoá")) return "/subjects/hoahoc.png";
  if (lower.includes("sinh")) return "/subjects/sinhhoc.png";
  if (lower.includes("sử") || lower.includes("lịch sử")) return "/subjects/lichsu.png";
  if (lower.includes("địa") || lower.includes("địa lí")) return "/subjects/diali.png";
  if (lower.includes("pháp luật") || lower.includes("gdkt") || lower.includes("kinh tế")) return "/subjects/gdktpl.png";
  if (lower.includes("tin") || lower.includes("python") || lower.includes("thuật toán") || lower.includes("website") || lower.includes("ai")) return "/subjects/tinhoc.png";
  if (lower.includes("anh") || lower.includes("tiếng anh") || lower.includes("english")) return "/subjects/tienganh.png";
  if (lower.includes("công nghệ")) return "/subjects/congnghe.png";
  if (lower.includes("quốc phòng") || lower.includes("an ninh")) return "/subjects/gdqp.png";
  if (lower.includes("khtn")) return "/subjects/vatli.png";
  if (lower.includes("khxh")) return "/subjects/lichsu.png";
  if (lower.includes("trải nghiệm") || lower.includes("hướng nghiệp")) return "/subjects/hdtn.png";
  return "/subjects/toan.png";
}

function renderSubjectCover(cat: LearningCategory) {
  const coverUrl = getSubjectCoverPath(cat.name, cat.type);
  return (
    <div
      style={{
        width: "100%",
        height: "148px",
        background: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: "10px 8px 4px 8px",
        boxSizing: "border-box",
      }}
    >
      <img
        src={coverUrl}
        alt={cat.name}
        style={{
          height: "100%",
          maxHeight: "135px",
          width: "auto",
          maxWidth: "100%",
          objectFit: "contain",
          borderRadius: "6px",
          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.14)",
          transition: "transform 0.22s ease",
        }}
      />
    </div>
  );
}

function formatDisplaySubjectName(name: string, isExam?: boolean): string {
  const lower = (name || "").toLowerCase();
  if (isExam) {
    if (lower.includes("vật lí") || lower.includes("vật lý") || lower.includes("lí") || lower.includes("lý")) return "Đề Vật lí";
    if (lower.includes("hóa") || lower.includes("hoá")) return "Đề Hoá học";
    if (lower.includes("văn") || lower.includes("ngữ văn")) return "Đề Ngữ văn";
    if (lower.includes("sử") || lower.includes("lịch sử")) return "Đề Lịch sử";
    if (lower.includes("địa") || lower.includes("địa lí")) return "Đề Địa lí";
    if (lower.includes("toán")) return "ĐỀ TOÁN THPT";
    if (lower.includes("sinh")) return "Đề Sinh học";
    if (lower.includes("anh")) return "Đề Tiếng Anh";
    if (lower.includes("khtn")) return "Đề Tổ hợp KHTN";
    if (lower.includes("khxh")) return "Đề Tổ hợp KHXH";
    if (lower.includes("tin")) return "Đề Tin học";
    return name.replace(/^\d+\s*-\s*/, "");
  }
  return name.replace(/^\d+\s*-\s*/, "").toUpperCase();
}

function formatDisplaySubtitle(cat: LearningCategory, isExam?: boolean): string {
  if (isExam) {
    const lower = (cat.name || "").toLowerCase();
    if (lower.includes("toán")) return "- Đề thi và đáp án kèm theo";
    if (lower.includes("sử")) return "Tổng hợp các đề thi TN THPT các năm";
    return "Tổng hợp đề thi TN THPT các năm";
  }
  return "Tổng hợp tài liệu THPT";
}

export default function Home() {
  const [activeNav, setActiveNav] = useState<string>("trang-chu");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [selectedExam, setSelectedExam] = useState<ExamItem | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);
  const [firebaseSaveFeedback, setFirebaseSaveFeedback] = useState<string | null>(null);

  // Document Library & Preview Modal State (Chỉ hiển thị khi bấm nút Tài liệu ôn thi)
  const [showDocLibraryModal, setShowDocLibraryModal] = useState<boolean>(false);
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);
  const [docModalSubject, setDocModalSubject] = useState<string>("all");
  const [docModalSearch, setDocModalSearch] = useState<string>("");

  // Authentication State
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authName, setAuthName] = useState<string>("");
  const [authClass, setAuthClass] = useState<string>("12A1");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<CurrentAuthUser | null>(null);

  // Admin Firebase Users State
  const [adminUsersList, setAdminUsersList] = useState<UserAccountData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  const router = useRouter();

  // Student Login Popup State
  const [showStudentLoginModal, setShowStudentLoginModal] = useState<boolean>(false);
  const [studentClassesList, setStudentClassesList] = useState<SchoolClass[]>([]);
  const [studentStudentsList, setStudentStudentsList] = useState<StudentItem[]>([]);
  const [studentSelectedClassId, setStudentSelectedClassId] = useState<string>("");
  const [studentSelectedStudentId, setStudentSelectedStudentId] = useState<string>("");
  const [studentInputTeacherCode, setStudentInputTeacherCode] = useState<string>("");
  const [studentMatchedTeacher, setStudentMatchedTeacher] = useState<{
    fullName: string;
    teacherCode: string;
    schoolName?: string;
  } | null>(null);
  const [studentInputPassword, setStudentInputPassword] = useState<string>("");
  const [studentInputConfirmPassword, setStudentInputConfirmPassword] = useState<string>("");
  const [studentLoginError, setStudentLoginError] = useState<string | null>(null);
  const [studentLoginLoading, setStudentLoginLoading] = useState<boolean>(false);
  const [savedStudentSession, setSavedStudentSession] = useState<{
    studentName: string;
    className: string;
    teacherName: string;
  } | null>(null);
  const [isSwitchingStudent, setIsSwitchingStudent] = useState<boolean>(false);

  // CÁC BƯỚC POPUP THEO YÊU CẦU: 1. Mã GV -> 2. Chọn Lớp & Tên -> 3. Mật khẩu lần đầu
  const [popupStep, setPopupStep] = useState<1 | 2 | 3>(1);
  const [rememberOnDevice, setRememberOnDevice] = useState<boolean>(true);

  // Open Student Login Modal
  const openStudentLoginModal = async () => {
    setShowStudentLoginModal(true);
    setPopupStep(1);
    setStudentLoginError(null);
    setIsSwitchingStudent(false);
    setStudentInputTeacherCode("");
    setStudentMatchedTeacher(null);
    setStudentSelectedClassId("");
    setStudentSelectedStudentId("");
    setStudentInputPassword("");
    setStudentInputConfirmPassword("");
    setRememberOnDevice(true);

    try {
      if (typeof window !== "undefined") {
        const rawSession =
          sessionStorage.getItem("student_portal_session") ||
          localStorage.getItem("student_portal_session");
        if (rawSession) {
          try {
            setSavedStudentSession(JSON.parse(rawSession));
          } catch { }
        }
      }

      const [classes, students] = await Promise.all([
        getAllClasses(),
        getAllStudents(),
      ]);

      setStudentClassesList(classes);
      setStudentStudentsList(students);
    } catch (err) {
      console.warn("Lỗi tải dữ liệu đăng nhập học sinh:", err);
    }
  };

  const handleStudentTeacherCodeChange = (val: string) => {
    const cleanDigits = val.replace(/\D/g, "").slice(0, 6);
    setStudentInputTeacherCode(cleanDigits);
    setStudentLoginError(null);
  };

  // Bước 1: Xác thực mã giáo viên (bắt buộc đúng 6 chữ số) trước khi cho qua Bước 2
  const handleVerifyTeacherCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStudentLoginError(null);
    const code = studentInputTeacherCode.trim().replace(/\D/g, "");
    if (!code) {
      setStudentLoginError("Vui lòng nhập mã giáo viên gồm 6 chữ số của bạn");
      return;
    }
    if (code.length !== 6) {
      setStudentLoginError(`Mã giáo viên phải gồm đúng 6 chữ số (hiện tại em đã nhập ${code.length}/6 số)`);
      return;
    }

    setStudentLoginLoading(true);
    try {
      const teacher = await findTeacherByCode(code);
      if (!teacher) {
        setStudentLoginError("Mã giáo viên không chính xác hoặc chưa được kích hoạt. Vui lòng kiểm tra lại");
        setStudentLoginLoading(false);
        return;
      }
      setStudentMatchedTeacher(teacher);
      setPopupStep(2);
    } catch {
      setStudentLoginError("Không thể xác thực mã giáo viên lúc này. Vui lòng thử lại");
    } finally {
      setStudentLoginLoading(false);
    }
  };

  // Filter students for chosen class
  const popupClassStudents = useMemo(() => {
    if (!studentSelectedClassId) return [];
    const listToFilter = studentStudentsList.length > 0 ? studentStudentsList : DEFAULT_STUDENTS;
    const currentClass = studentClassesList.find((c) => c.id === studentSelectedClassId);
    if (!currentClass) return [];

    const targetId = (currentClass.id || "").trim().toLowerCase();
    const targetName = (currentClass.name || "").trim().toLowerCase();
    const cleanTargetName = targetName.replace(/^(lớp|lop)\s*/i, "").trim();

    const matched = listToFilter.filter((s) => {
      const sClassId = (s.classId || "").trim().toLowerCase();
      const sClassName = (s.className || "").trim().toLowerCase();
      const cleanSClassName = sClassName.replace(/^(lớp|lop)\s*/i, "").trim();

      return (
        (sClassId && (sClassId === targetId || sClassId === targetName || sClassId === cleanTargetName)) ||
        (sClassName && (sClassName === targetName || sClassName === targetId || cleanSClassName === cleanTargetName)) ||
        (cleanSClassName && cleanTargetName && cleanSClassName === cleanTargetName)
      );
    });

    return matched.length > 0 ? matched.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0)) : [];
  }, [studentStudentsList, studentClassesList, studentSelectedClassId]);

  // Selected student
  const popupSelectedStudent = useMemo(() => {
    if (!studentSelectedStudentId) return null;
    return (
      popupClassStudents.find((s) => s.id === studentSelectedStudentId) ||
      studentStudentsList.find((s) => s.id === studentSelectedStudentId) ||
      null
    );
  }, [popupClassStudents, studentStudentsList, studentSelectedStudentId]);

  // Reset inputs when student changes
  useEffect(() => {
    setStudentInputPassword("");
    setStudentInputConfirmPassword("");
    setStudentLoginError(null);
  }, [studentSelectedClassId, studentSelectedStudentId]);

  // Has password check
  const popupStudentHasPassword = useMemo(() => {
    if (!popupSelectedStudent) return false;
    const pwd = (
      popupSelectedStudent.password ||
      (typeof window !== "undefined"
        ? localStorage.getItem(`std_pwd_${popupSelectedStudent.id}`)
        : "") ||
      ""
    ).trim();
    return Boolean(pwd.length > 0);
  }, [popupSelectedStudent]);

  // Kiểm tra học sinh đã được ghi nhớ mật khẩu trên hệ thống / thiết bị này chưa
  const isPasswordRemembered = false;

  // Bước 2: Chuyển sang bước 3 (mật khẩu)
  const handleProceedToPasswordStep = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStudentLoginError(null);
    setStudentInputPassword("");
    setStudentInputConfirmPassword("");
    if (!studentSelectedClassId) {
      setStudentLoginError("Vui lòng chọn lớp học");
      return;
    }
    if (!studentSelectedStudentId || !popupSelectedStudent) {
      setStudentLoginError("Vui lòng chọn tên học sinh");
      return;
    }
    setPopupStep(3);
  };

  // Bước 3: Hoàn tất đăng nhập học sinh và vào trang cá nhân (BẮT BUỘC NHẬP MẬT KHẨU)
  const handlePopupStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentLoginError(null);

    if (!studentSelectedClassId) {
      setStudentLoginError("Vui lòng chọn lớp học");
      setPopupStep(2);
      return;
    }
    if (!popupSelectedStudent) {
      setStudentLoginError("Vui lòng chọn học sinh");
      setPopupStep(2);
      return;
    }

    const currentClass =
      studentClassesList.find((c) => c.id === studentSelectedClassId) ||
      studentClassesList[0];

    const student = popupSelectedStudent;
    const resolvedTeacher =
      studentMatchedTeacher ||
      (await findTeacherByCode(studentInputTeacherCode.trim())) || {
        fullName: studentInputTeacherCode.trim(),
        teacherCode: studentInputTeacherCode.trim(),
      };

    const savedPassword = (
      student.password ||
      (typeof window !== "undefined" ? localStorage.getItem(`std_pwd_${student.id}`) : "") ||
      ""
    ).trim();

    setStudentLoginLoading(true);
    try {
      if (!savedPassword) {
        // Lần đầu: Đặt mật khẩu lần đầu + Xác nhận
        if (!studentInputPassword.trim()) {
          setStudentLoginError("Vui lòng đặt mật khẩu lần đầu cho học sinh");
          setStudentLoginLoading(false);
          return;
        }
        if (studentInputPassword.trim().length < 4) {
          setStudentLoginError("Mật khẩu phải có ít nhất 4 ký tự");
          setStudentLoginLoading(false);
          return;
        }
        if (studentInputPassword.trim() !== studentInputConfirmPassword.trim()) {
          setStudentLoginError("Mật khẩu xác nhận không khớp");
          setStudentLoginLoading(false);
          return;
        }

        // Lưu mật khẩu vào Firestore & LocalStorage
        await setStudentPassword(student.id, studentInputPassword.trim(), student.fullName);
        if (typeof window !== "undefined") {
          localStorage.setItem(`std_pwd_${student.id}`, studentInputPassword.trim());
          localStorage.setItem(`std_pwd_${student.fullName}`, studentInputPassword.trim());
          localStorage.setItem(`std_pwd_${student.fullName.toLowerCase()}`, studentInputPassword.trim());
        }
        student.password = studentInputPassword.trim();
        setStudentStudentsList((prev) =>
          prev.map((s) => (s.id === student.id ? { ...s, password: studentInputPassword.trim() } : s))
        );
      } else {
        // Bắt buộc nhập mật khẩu để đăng nhập (yêu cầu từ người dùng)
        if (!studentInputPassword.trim()) {
          setStudentLoginError("Vui lòng nhập mật khẩu học sinh để tiếp tục");
          setStudentLoginLoading(false);
          return;
        }
        if (studentInputPassword.trim() !== savedPassword) {
          setStudentLoginError("Mật khẩu không chính xác. Vui lòng kiểm tra lại");
          setStudentLoginLoading(false);
          return;
        }
      }

      // Tạo phiên đăng nhập cho học sinh
      const newSession = {
        studentId: student.id,
        studentName: student.fullName,
        studentOrder: student.orderNumber,
        dob: student.dob,
        classId: currentClass.id,
        className: currentClass.name,
        grade: currentClass.grade || "12",
        teacherCode: resolvedTeacher.teacherCode,
        teacherName: resolvedTeacher.fullName,
        loggedInAt: Date.now(),
      };

      try {
        sessionStorage.setItem("student_portal_session", JSON.stringify(newSession));
        sessionStorage.setItem(
          "school_current_user",
          JSON.stringify({
            name: student.fullName,
            studentClass: currentClass.name,
            studentId: student.id,
            role: "student",
          })
        );
      } catch {}
      localStorage.setItem("student_portal_session", JSON.stringify(newSession));
      const studentAuthUser: CurrentAuthUser = {
        uid: student.id,
        name: student.fullName,
        fullName: student.fullName,
        role: "student",
        studentClass: currentClass.name,
        studentId: student.id,
        schoolName: "THPT DTNT THCS & THPT Tuy Đức",
      };
      setCurrentAuthUser(studentAuthUser);
      setCurrentUser(studentAuthUser);

      setShowStudentLoginModal(false);
      // Chuyển thẳng vào trang cá nhân của học sinh
      router.push("/student");
    } catch (err: any) {
      console.error("Lỗi đăng nhập học sinh:", err);
      setStudentLoginError("Có lỗi xảy ra: " + (err.message || "Vui lòng thử lại"));
    } finally {
      setStudentLoginLoading(false);
    }
  };

  // Interactive Simulator Quiz on Hero - Multi-questions Bank
  const [simQuestionIndex, setSimQuestionIndex] = useState<number>(0);
  const [simAnswers, setSimAnswers] = useState<Record<number, number>>({});

  const currentSimQ = SIMULATOR_QUESTIONS[simQuestionIndex] || SIMULATOR_QUESTIONS[0];
  const currentSimAnswer = simAnswers[simQuestionIndex] ?? null;

  const handleSelectSimAnswer = (optIdx: number) => {
    setSimAnswers((prev) => ({ ...prev, [simQuestionIndex]: optIdx }));
  };

  const handleNextSimQuestion = () => {
    setSimQuestionIndex((prev) => (prev + 1) % SIMULATOR_QUESTIONS.length);
  };

  const handlePrevSimQuestion = () => {
    setSimQuestionIndex((prev) => (prev - 1 + SIMULATOR_QUESTIONS.length) % SIMULATOR_QUESTIONS.length);
  };

  const handleRandomSimQuestion = () => {
    const nextIdx = (simQuestionIndex + Math.floor(Math.random() * (SIMULATOR_QUESTIONS.length - 1)) + 1) % SIMULATOR_QUESTIONS.length;
    setSimQuestionIndex(nextIdx);
  };

  const handleRetrySimQuestion = () => {
    setSimAnswers((prev) => {
      const next = { ...prev };
      delete next[simQuestionIndex];
      return next;
    });
  };

  // Live Countdown to THPT 2027 Exam & Real-time Clock (Năm 2027, Giờ, Phút, Giây)
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 267, hours: 8, minutes: 30, seconds: 45 });
  const [currentClockStr, setCurrentClockStr] = useState<string>("15:30:00");

  useEffect(() => {
    // Thời điểm bắt đầu kỳ thi tốt nghiệp THPT Quốc Gia năm 2027 (Ngày 25/06/2027)
    const targetDate = new Date("2027-06-25T07:30:00+07:00").getTime();

    const tick = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      setCurrentClockStr(`${hh}:${mm}:${ss}`);

      let diff = targetDate - now.getTime();
      if (diff <= 0) {
        const altTarget = new Date("2027-12-31T23:59:59+07:00").getTime();
        diff = Math.max(0, altTarget - now.getTime());
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Lắng nghe trạng thái đăng nhập tài khoản (Super Admin / Giáo viên / Học sinh)
  useEffect(() => {
    const initialUser = getCurrentAuthUser();
    if (initialUser) {
      setCurrentUser(initialUser);
    }
    const handleAuthChange = (e: any) => {
      setCurrentUser(e.detail || null);
    };
    window.addEventListener("school_auth_changed", handleAuthChange);
    return () => window.removeEventListener("school_auth_changed", handleAuthChange);
  }, []);

  // Scroll dynamics & effects (Parallax, Progress Bar, Active Nav, Back to top)
  const [scrollY, setScrollY] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setShowBackToTop(currentScrollY > 350);

      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = Math.min(100, Math.max(0, (currentScrollY / totalHeight) * 100));
        setScrollProgress(progress);
      }

      // Auto update active navigation based on scroll position (Scrollspy)
      const sections = [
        { id: "trang-chu", key: "trang-chu" },
        { id: "vao-thi-ngay", key: "vao-thi-ngay" },
        { id: "de-thi", key: "de-thi" },
        { id: "tai-lieu", key: "tai-lieu" },
      ];

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 240) {
            setActiveNav(sections[i].key);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Subjects filter list
  const subjects = [
    { id: "all", name: "Tất cả môn", icon: "🌐" },
    { id: "toan", name: "Toán học", icon: "📐" },
    { id: "van", name: "Ngữ văn", icon: "📖" },
    { id: "anh", name: "Tiếng Anh", icon: "🌍" },
    { id: "ly", name: "Vật lí", icon: "⚡" },
    { id: "hoa", name: "Hóa học", icon: "🧪" },
    { id: "sinh", name: "Sinh học", icon: "🧬" },
    { id: "su", name: "Lịch sử", icon: "📜" },
    { id: "dia", name: "Địa lí", icon: "🗺️" },
    { id: "ktpl", name: "GDKT & PL", icon: "⚖️" },
    { id: "tin", name: "Tin học", icon: "💻" },
    { id: "congnghe", name: "Công nghệ", icon: "⚙️" },
    { id: "gdqp", name: "GDQP-AN", icon: "🛡️" },
  ];

  // Dynamic Grade 12 Exams Dataset synced with Admin portal
  const [examsList, setExamsList] = useState<ExamItem[]>(DEFAULT_EXAMS);

  // Dynamic Documents Library Dataset synced with Admin portal
  const [documentsList, setDocumentsList] = useState<DocumentItem[]>([]);

  // DỮ LIỆU CÁC MỤC HỌC LIỆU TRÊN TRANG CHỦ (TÀI LIỆU, VIDEO, ĐỀ THI - CHUẨN HÌNH 2)
  const [learningCategories, setLearningCategories] = useState<LearningCategory[]>(DEFAULT_CATEGORIES);
  const [learningItems, setLearningItems] = useState<LearningItem[]>(DEFAULT_ITEMS);
  const [activeCategoryModal, setActiveCategoryModal] = useState<LearningCategory | null>(null);
  const [activeSubfolder, setActiveSubfolder] = useState<string>("all");
  const [filterItemType, setFilterItemType] = useState<"all" | "read" | "exam">("all");
  const [readingDocItem, setReadingDocItem] = useState<LearningItem | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<LearningItem | null>(null);

  // Xử lý mở giao diện học tập khi bấm nút "Vào Học Ngay ➔" (giống như nút VÀO HỌC, không vào trang cá nhân học sinh)
  const handleOpenDocumentSection = () => {
    setActiveCategoryModal({
      id: "all_document",
      name: "TÀI LIỆU HỌC TẬP & ÔN THI",
      description: "Tổng hợp tất cả tài liệu đọc, chuyên đề ôn thi và bài học chi tiết chuẩn cấu trúc Bộ GD&ĐT.",
      type: "document",
      createdAt: new Date().toISOString(),
      thumbnailUrl: documentCategories[0]?.thumbnailUrl,
    });
    setActiveSubfolder("all");
    setFilterItemType("all");
  };

  const handleOpenVideoSection = () => {
    setActiveCategoryModal({
      id: "all_video",
      name: "VIDEO BÀI GIẢNG TRỰC TUYẾN",
      description: "Tổng hợp toàn bộ video bài giảng lý thuyết và kỹ thuật giải nhanh 30 giây.",
      type: "video",
      createdAt: new Date().toISOString(),
      thumbnailUrl: videoCategories[0]?.thumbnailUrl,
    });
    setActiveSubfolder("all");
    setFilterItemType("all");
  };

  const handleOpenExamSection = () => {
    setActiveCategoryModal({
      id: "all_exam",
      name: "BỘ ĐỀ THI & THI THỬ TRỰC TUYẾN",
      description: "Kho đề thi thử bấm giờ tự động, cập nhật đáp án và lời giải chi tiết sau thi.",
      type: "exam",
      createdAt: new Date().toISOString(),
      thumbnailUrl: examCategories[0]?.thumbnailUrl,
    });
    setActiveSubfolder("all");
    setFilterItemType("all");
  };

  // Scroll reveal observer for elements
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );

    const elements = document.querySelectorAll(`.${styles.revealOnScroll}`);
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [examsList, documentsList]);

  // Real-time listener: Load exams & docs from Firestore & Admin changes
  useEffect(() => {
    const loadDynamicSchoolData = async () => {
      try {
        const liveExams = await getAllExams();
        if (liveExams && liveExams.length > 0) {
          setExamsList(liveExams);
        }
        const [liveCats, liveItems] = await Promise.all([
          getAllLearningCategories(),
          getAllLearningItems(),
        ]);
        if (liveCats && liveCats.length > 0) setLearningCategories(liveCats);
        if (liveItems && liveItems.length > 0) setLearningItems(liveItems);

        const liveDocs = await getAllDocuments();
        const liveCommDocs = await getAllCommunityDocs();

        // CHỈ HIỂN THỊ TÀI LIỆU CÔNG KHAI TRÊN TRANG CHỦ
        // Tài liệu giao riêng cho lớp hoặc từng học sinh sẽ KHÔNG hiển thị ra trang chủ, chỉ hiển thị trong trang học sinh
        const publicLiveDocs = (liveDocs && liveDocs.length > 0)
          ? liveDocs.filter((d) => {
            const hasClass = Array.isArray(d.assignedClasses) && d.assignedClasses.length > 0;
            const hasStudent = Array.isArray(d.assignedStudents) && d.assignedStudents.length > 0;
            const isSpecific = d.assignType === "class" || d.assignType === "student" || hasClass || hasStudent;
            return !isSpecific;
          })
          : [];

        const baseDocs = publicLiveDocs.length > 0 ? [...publicLiveDocs] : [];

        // Merge approved Grade 12 community documents
        if (liveCommDocs && liveCommDocs.length > 0) {
          const commGrade12 = liveCommDocs.filter(
            (cd) => cd.status === "APPROVED" && (cd.grade === "Lớp 12" || cd.grade === "Toàn cấp THPT")
          );
          commGrade12.forEach((cd) => {
            if (!baseDocs.some((d) => d.id === cd.id || d.title.trim() === cd.title.trim())) {
              baseDocs.push({
                id: cd.id,
                title: cd.title,
                subject: cd.subject,
                subjectName: cd.subjectName,
                format: cd.format,
                size: cd.fileSize,
                downloads: `${cd.downloads || "1.5k"}`,
                description: cd.description,
                fileUrl: cd.fileUrl,
                uploader: `${cd.author} (${cd.authorRole})`,
                createdAt: cd.createdAt,
              });
            }
          });
        }

        setDocumentsList(baseDocs);
      } catch (err) {
        console.warn("Syncing dynamic exams & docs error:", err);
      }
    };

    loadDynamicSchoolData();

    // Listen to cross-component and cross-tab storage changes from Admin
    window.addEventListener("school_data_updated", loadDynamicSchoolData);
    window.addEventListener("school_community_docs_updated", loadDynamicSchoolData);
    window.addEventListener("school_learning_updated", loadDynamicSchoolData);
    window.addEventListener("storage", loadDynamicSchoolData);

    return () => {
      window.removeEventListener("school_data_updated", loadDynamicSchoolData);
      window.removeEventListener("school_community_docs_updated", loadDynamicSchoolData);
      window.removeEventListener("school_learning_updated", loadDynamicSchoolData);
      window.removeEventListener("storage", loadDynamicSchoolData);
    };
  }, []);

  const [showMoreDocs, setShowMoreDocs] = useState(false);
  const [showMoreExams, setShowMoreExams] = useState(false);

  // 3 Mục chính theo chuẩn hình 2: Mỗi loại chỉ hiển thị 1 trang bìa duy nhất
  const documentCategories = useMemo(() => {
    const list = learningCategories.filter((c) => c.type === "document");
    const docPriority = (name: string) => {
      const l = name.toLowerCase();
      if (l.includes("11")) return 100;
      if (l.includes("hoá") || l.includes("hoahoc") || l.includes("hóa")) return 1;
      if (l.includes("lịch sử") || l.includes("sử")) return 2;
      if (l.includes("địa")) return 3;
      if (l.includes("văn") || l.includes("ngữ văn")) return 4;
      if (l.includes("toán")) return 5;
      if (l.includes("tin")) return 6;
      if (l.includes("vật lí") || l.includes("vật lý") || l.includes("lí") || l.includes("lý")) return 7;
      if (l.includes("sinh")) return 8;
      if (l.includes("anh") || l.includes("tiếng anh")) return 9;
      if (l.includes("gdkt") || l.includes("pháp luật")) return 10;
      if (l.includes("công nghệ")) return 11;
      return 50;
    };
    const sorted = [...list].sort((a, b) => docPriority(a.name) - docPriority(b.name));
    // DEDUPLICATE: Mỗi loại chỉ hiển thị 1 trang bìa
    const seenCovers = new Set<string>();
    return sorted.filter((cat) => {
      const cover = getSubjectCoverPath(cat.name, cat.type);
      if (seenCovers.has(cover)) return false;
      seenCovers.add(cover);
      return true;
    });
  }, [learningCategories]);

  const examCategories = useMemo(() => {
    const list = learningCategories.filter((c) => c.type === "exam");
    const examPriority = (name: string) => {
      const l = name.toLowerCase();
      if (l.includes("11")) return 100;
      if (l.includes("vật lí") || l.includes("vật lý") || l.includes("lí") || l.includes("lý")) return 1;
      if (l.includes("hoá") || l.includes("hoahoc") || l.includes("hóa")) return 2;
      if (l.includes("văn") || l.includes("ngữ văn")) return 3;
      if (l.includes("lịch sử") || l.includes("sử")) return 4;
      if (l.includes("địa")) return 5;
      if (l.includes("toán")) return 6;
      if (l.includes("sinh")) return 7;
      if (l.includes("anh") || l.includes("tiếng anh")) return 8;
      if (l.includes("khtn")) return 9;
      if (l.includes("khxh")) return 10;
      return 50;
    };
    const sorted = [...list].sort((a, b) => examPriority(a.name) - examPriority(b.name));
    // DEDUPLICATE: Mỗi loại chỉ hiển thị 1 trang bìa (loại bỏ lặp bìa Đề Vật lí)
    const seenCovers = new Set<string>();
    return sorted.filter((cat) => {
      const cover = getSubjectCoverPath(cat.name, cat.type);
      if (seenCovers.has(cover)) return false;
      seenCovers.add(cover);
      return true;
    });
  }, [learningCategories]);

  const videoCategories = useMemo(() => {
    const list = learningCategories.filter((c) => c.type === "video");
    const videoPriority = (name: string) => {
      const l = name.toLowerCase();
      if (l.includes("toán")) return 1;
      if (l.includes("văn") || l.includes("ngữ văn")) return 2;
      if (l.includes("anh") || l.includes("tiếng anh")) return 3;
      if (l.includes("tin") || l.includes("python") || l.includes("website")) return 4;
      if (l.includes("lí") || l.includes("vật lí")) return 5;
      if (l.includes("hóa") || l.includes("hoá")) return 6;
      if (l.includes("sinh")) return 7;
      if (l.includes("sử")) return 8;
      if (l.includes("địa")) return 9;
      return 50;
    };
    const sorted = [...list].sort((a, b) => videoPriority(a.name) - videoPriority(b.name));
    // DEDUPLICATE: Mỗi loại chỉ hiển thị 1 trang bìa
    const seenCovers = new Set<string>();
    return sorted.filter((cat) => {
      const cover = getSubjectCoverPath(cat.name, cat.type);
      if (seenCovers.has(cover)) return false;
      seenCovers.add(cover);
      return true;
    });
  }, [learningCategories]);

  // Filtered exams
  const filteredExams = useMemo(() => {
    return examsList.filter((exam) => {
      const matchSubject = selectedSubject === "all" || exam.subject === selectedSubject;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        exam.title.toLowerCase().includes(q) ||
        exam.school.toLowerCase().includes(q) ||
        (Boolean(exam.accessCode) && exam.accessCode!.toLowerCase().includes(q)) ||
        (exam.variants && exam.variants.some((v) => (v.code || "").toLowerCase().includes(q)));
      return matchSubject && matchSearch;
    });
  }, [selectedSubject, searchQuery]);

  // Filtered documents inside the Modal (Chỉ hiện tài liệu công khai, ẩn tài liệu giao lớp/HS)
  const modalFilteredDocuments = useMemo(() => {
    return documentsList.filter((doc) => {
      const hasClass = Array.isArray(doc.assignedClasses) && doc.assignedClasses.length > 0;
      const hasStudent = Array.isArray(doc.assignedStudents) && doc.assignedStudents.length > 0;
      const isSpecific = doc.assignType === "class" || doc.assignType === "student" || hasClass || hasStudent;
      if (isSpecific) return false;

      const matchSubject = docModalSubject === "all" || doc.subject === docModalSubject;
      const q = docModalSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        (doc.description && doc.description.toLowerCase().includes(q)) ||
        (doc.subjectName && doc.subjectName.toLowerCase().includes(q));
      return matchSubject && matchSearch;
    });
  }, [documentsList, docModalSubject, docModalSearch]);

  // Smooth scroll helper
  const scrollToSection = (id: string, navKey: string) => {
    setActiveNav(navKey);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const getBadgeClass = (subject: string, defaultClass?: string) => {
    if (defaultClass) return defaultClass;
    switch (subject) {
      case "toan": return styles.toanBadge;
      case "van": return styles.vanBadge;
      case "anh": return styles.anhBadge;
      case "ly": return styles.lyBadge;
      case "hoa": return styles.hoaBadge;
      case "sinh": return styles.sinhBadge;
      case "su": return styles.suBadge;
      case "dia": return styles.diaBadge;
      case "ktpl": return styles.ktplBadge;
      case "tin": return styles.tinBadge;
      case "congnghe": return styles.congngheBadge;
      case "gdqp": return styles.gdqpBadge;
      default: return styles.toanBadge;
    }
  };

  // Trình tải file PDF thật xuống máy tính
  const handleDownloadDoc = (doc: DocumentItem) => {
    if (doc.fileUrl && doc.fileUrl.startsWith("http") && !doc.fileUrl.includes("dummy.pdf")) {
      const a = document.createElement("a");
      a.href = doc.fileUrl;
      a.target = "_blank";
      a.download = `[TaiLieu12]_${doc.title.replace(/[\s/\\?%*:|"<>]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadSuccessMsg(`✅ Đang tải xuống tài liệu: "${doc.title}" (${doc.size})`);
      setTimeout(() => setDownloadSuccessMsg(null), 4000);
      return;
    }

    const safeTitle = (doc.title || "Tai lieu").replace(/[()\\]/g, "");
    const safeSub = (doc.subjectName || "Chuyen de").replace(/[()\\]/g, "");
    const safeAuthor = (doc.uploader || "To Chuyen Mon Tuy Duc").replace(/[()\\]/g, "");
    const safeDesc = (doc.description || "Tai lieu on thi THPT 2026 - 2027").replace(/[()\\]/g, "");

    const pdfRaw = [
      "%PDF-1.4",
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
      "4 0 obj << /Length 480 >> stream",
      "BT",
      "/F1 18 Tf",
      "50 790 Td",
      "(TRUONG THPT DTNT THCS & THPT TUY DUC) Tj",
      "0 -28 Td",
      "/F1 13 Tf",
      "(HE THONG ON THI VA BOI DUONG DIEM 9+ THPT QUOC GIA 2026 - 2027) Tj",
      "0 -40 Td",
      "/F1 16 Tf",
      "(" + safeTitle + ") Tj",
      "0 -28 Td",
      "/F1 12 Tf",
      "(Mon: " + safeSub + " - Nguoi bien soan: " + safeAuthor + ") Tj",
      "0 -28 Td",
      "/F1 11 Tf",
      "(" + safeDesc + ") Tj",
      "0 -35 Td",
      "(Dac diem: Tai lieu chuan cau truc Bo GD&DT - Mien phi 100%) Tj",
      "0 -25 Td",
      "(Chuc cac em hoc sinh on luyen tot va dat diem cao nhat!) Tj",
      "ET",
      "endstream",
      "endobj",
      "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
      "xref",
      "0 6",
      "0000000000 65535 f ",
      "0000000009 00000 n ",
      "0000000058 00000 n ",
      "0000000115 00000 n ",
      "0000000244 00000 n ",
      "0000000776 00000 n ",
      "trailer << /Size 6 /Root 1 0 R >>",
      "startxref",
      "846",
      "%%EOF"
    ].join("\n");

    const blob = new Blob([pdfRaw], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `[TuyDuc]_Tai_Lieu_${doc.title.replace(/[\s/\\?%*:|"<>]/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setDownloadSuccessMsg(`✅ Đã tải xuống thành công tài liệu: "${doc.title}" (${doc.size})`);
    setTimeout(() => setDownloadSuccessMsg(null), 4000);
  };

  // Helper xác định vai trò khi đăng nhập: đăng nhập Google luôn là Giáo viên (riêng Super Admin giữ nguyên)
  const resolveAuthRole = (u: any): UserRole => {
    const emailNorm = (u.email || "").toLowerCase().trim();
    if (
      SUPER_ADMIN_EMAILS.includes(emailNorm) ||
      emailNorm.includes("danganhthu") ||
      u.role === "super_admin" ||
      (u.role === "admin" && !u.studentClass?.includes("Học sinh"))
    ) {
      return "super_admin";
    }
    // Đăng nhập Google hoặc tài khoản giáo viên: luôn là giáo viên
    if (u.authProvider === "google" || u.authProvider === "google.com") {
      return "teacher";
    }
    if (u.role === "student" && !u.teacherCode) return "student";
    return "teacher";
  };

  // Google Sign In handler with Firebase Firestore saving
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const res = await loginWithGoogleFirebase();
      if (res.success && res.user) {
        const authUser: CurrentAuthUser = {
          uid: res.user.uid,
          email: res.user.email,
          name: res.user.fullName,
          fullName: res.user.fullName,
          role: resolveAuthRole(res.user),
          teacherCode: res.user.teacherCode,
          studentClass: res.user.studentClass,
          avatarUrl: res.user.avatarUrl,
          schoolName: res.user.schoolName,
        };
        setCurrentAuthUser(authUser);
        setCurrentUser(authUser);
        setShowLoginModal(false);
        setFirebaseSaveFeedback(
          `☁️ Đăng nhập thành công tài khoản "${res.user.fullName}" (${authUser.role === "super_admin" ? "👑 Super Admin" : "👨‍🏫 Giáo viên"})!`
        );
        setTimeout(() => setFirebaseSaveFeedback(null), 5000);
      } else {
        alert(res.error || "Đăng nhập Google thất bại. Vui lòng thử lại!");
      }
    } catch (err: unknown) {
      console.error("Google Auth Error:", err);
      alert("Lỗi khi kết nối Google Authentication.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Email / Password Form Submit with Firebase Firestore saving
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      alert("Vui lòng điền đầy đủ Email và Mật khẩu!");
      return;
    }

    setAuthLoading(true);
    if (authTab === "register") {
      const res = await registerWithEmail({
        email: authEmail,
        password: authPassword,
        fullName: authName,
        studentClass: authClass,
      });
      setAuthLoading(false);
      if (res.success && res.user) {
        const authUser: CurrentAuthUser = {
          uid: res.user.uid,
          email: res.user.email,
          name: res.user.fullName,
          fullName: res.user.fullName,
          role: resolveAuthRole(res.user),
          teacherCode: res.user.teacherCode,
          studentClass: res.user.studentClass,
          avatarUrl: res.user.avatarUrl,
          schoolName: res.user.schoolName,
        };
        setCurrentAuthUser(authUser);
        setCurrentUser(authUser);
        setShowLoginModal(false);
        setFirebaseSaveFeedback(
          `☁️ Đã đăng ký thành công "${res.user.fullName}"! Mã GV: ${res.user.teacherCode || "Chưa cấp"} - Ngày ĐK: ${res.user.registeredDate || "Hôm nay"} (Lưu Firebase Firestore)`
        );
        setTimeout(() => setFirebaseSaveFeedback(null), 6000);
      } else {
        alert("Lỗi đăng ký: " + (res.error || "Không thể tạo tài khoản"));
      }
    } else {
      const res = await loginWithEmail(authEmail, authPassword);
      setAuthLoading(false);
      if (res.success && res.user) {
        const authUser: CurrentAuthUser = {
          uid: res.user.uid,
          email: res.user.email,
          name: res.user.fullName,
          fullName: res.user.fullName,
          role: resolveAuthRole(res.user),
          teacherCode: res.user.teacherCode,
          studentClass: res.user.studentClass,
          avatarUrl: res.user.avatarUrl,
          schoolName: res.user.schoolName,
        };
        setCurrentAuthUser(authUser);
        setCurrentUser(authUser);
        setShowLoginModal(false);
        setFirebaseSaveFeedback(
          `☁️ Đăng nhập thành công! Tài khoản "${res.user.email}" (${authUser.role === "super_admin" ? "👑 Super Admin" : "👨‍🏫 Giáo viên"})`
        );
        setTimeout(() => setFirebaseSaveFeedback(null), 5000);
      } else {
        alert("Lỗi đăng nhập: " + (res.error || "Tài khoản hoặc mật khẩu không chính xác"));
      }
    }
  };

// Open Admin & Fetch Users from Firebase
const handleOpenAdmin = async () => {
  setShowAdminModal(true);
  setLoadingUsers(true);
  const users = await getAllRegisteredUsers();
  setAdminUsersList(users);
  setLoadingUsers(false);
};

return (
  <div className={styles.appContainer}>
    {/* Thanh tiến trình cuộn trang động (Scroll Progress Bar) */}
    <div className={styles.scrollProgressBar} style={{ width: `${scrollProgress}%` }} />

    {/* =========================================================
          THANH ĐẦU DÒNG (TOP BAR): TÊN TRƯỜNG THPT DTNT THCS & THPT TUY ĐỨC
      ========================================================= */}
    <div className={styles.topSchoolBar}>
      <div className={styles.topSchoolContainer}>
        <div className={styles.topSchoolLeft}>
          <span className={styles.topSchoolBadge}>TRƯỜNG</span>
          <span className={styles.topSchoolName}>THPT DTNT THCS & THPT Tuy Đức</span>
          <span className={styles.topSchoolDivider}>•</span>
          <span className={styles.topSchoolTagline}>Hệ thống ôn luyện trực tuyến THPT Quốc Gia 2026</span>
        </div>
        <div className={styles.topSchoolRight}>
          <span className={styles.topSchoolItem}>📍 Tuy Đức, Lâm Đồng</span>
          <span className={styles.topSchoolDivider}>•</span>
          <span className={styles.topSchoolItem}>📞 Hotline: 0914905774</span>
        </div>
      </div>
    </div>

    {/* =========================================================
          1. PHẦN HEADER: LOGO, LUYỆN THI 12, SLOGAN: BỨT PHÁ ĐIỂM SỐ,
             NÚT QUẢN TRỊ & NÚT ĐĂNG NHẬP/ĐĂNG KÝ Ở GÓC PHẢI
      ========================================================= */}
    <header className={`${styles.header} ${scrollY > 20 ? styles.headerScrolled : ""}`}>
      <div className={styles.navContainer}>
        {/* Logo & Tiêu đề & Slogan */}
        <div
          className={styles.brand}
          onClick={() => scrollToSection("trang-chu", "trang-chu")}
        >
          <div className={styles.logoIcon}>🎓</div>
          <div className={styles.brandInfo}>
            <div className={styles.brandHeaderRow}>
              <span className={styles.brandTitle}>Luyện Thi 12</span>
              <span className={styles.brandBadge}>THPT 2026</span>
            </div>
            <span className={styles.brandSlogan}>Bứt phá điểm số</span>
          </div>
        </div>

        {/* Menu Điều Hướng Nhanh */}
        <nav className={styles.navLinks}>
          <button
            id="nav-trang-chu"
            className={`${styles.navLink} ${activeNav === "trang-chu" ? styles.navLinkActive : ""}`}
            onClick={() => scrollToSection("trang-chu", "trang-chu")}
          >
            <span>🏠</span> Trang chủ
          </button>
          <button
            id="nav-vao-thi-ngay"
            className={`${styles.navLink} ${activeNav === "vao-thi-ngay" ? styles.navLinkActive : ""}`}
            onClick={() => scrollToSection("vao-thi-ngay", "vao-thi-ngay")}
          >
            <span>⚡</span> Vào thi ngay
          </button>
          <button
            id="nav-de-thi"
            className={`${styles.navLink} ${activeNav === "de-thi" ? styles.navLinkActive : ""}`}
            onClick={() => scrollToSection("de-thi", "de-thi")}
          >
            <span>📝</span> Đề thi
          </button>
          <button
            id="nav-tai-lieu"
            className={`${styles.navLink} ${showDocLibraryModal ? styles.navLinkActive : ""}`}
            onClick={() => setShowDocLibraryModal(true)}
          >
            <span>📚</span> Tài liệu
          </button>
          <Link
            href="/community-docs"
            id="nav-tai-lieu-cong-dong"
            className={styles.navLink}
            style={{ textDecoration: "none" }}
            title="Kho Học Liệu Mở & Tài Liệu Cộng Đồng"
          >
            <span>🌐</span> Tài liệu cộng đồng
          </Link>
        </nav>

        {/* Góc Phải: Nút Quản Trị, Đăng Nhập & Nút Vào Học Nổi Bật Ngoài Cùng Bên Phải */}
        <div className={styles.navRightActions}>
          {/* Nút Quản Trị: ẨN ĐỐI VỚI HỌC SINH (chỉ hiển thị cho Khách, Giáo viên và Super Admin) */}
          {(!currentUser || currentUser.role !== "student") && (
            <Link
              href="/admin"
              id="btn-quan-tri"
              className={styles.adminBtn}
              style={{ textDecoration: "none" }}
              title="Cổng Quản Trị Hệ Thống (Cấu hình Cloudinary, Tài Khoản, Giao Đề Thi & Tài Liệu)"
            >
              <span>⚙️</span> Quản trị
            </Link>
          )}

          {currentUser ? (
            <div
              className={styles.userLoggedInBadge}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                border: "1.5px solid #60a5fa",
                padding: "6px 14px",
                borderRadius: "10px",
                boxShadow: "0 3px 10px rgba(37, 99, 235, 0.25)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#ffffff",
                    fontWeight: 700,
                    letterSpacing: "0.2px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Chào, {getDisplayedAccountName(currentUser)}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#facc15",
                    fontWeight: 800,
                    letterSpacing: "0.4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentUser.role === "student"
                    ? (currentUser.studentClass
                        ? (currentUser.studentClass.toLowerCase().includes("lớp")
                            ? currentUser.studentClass
                            : `Lớp: ${currentUser.studentClass}`)
                        : "Lớp: 12A1")
                    : currentUser.role === "teacher"
                      ? `Mã GV: ${currentUser.teacherCode || "628842"}`
                      : "👑 Super Admin"}
                </div>
              </div>

              <button
                type="button"
                className={styles.logoutBtn}
                onClick={async () => {
                  if (currentUser?.role === "student") {
                    logoutStudentSession();
                  } else {
                    await logoutAllSessions();
                  }
                  setCurrentUser(null);
                  alert("Đã đăng xuất tài khoản!");
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#ef4444")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")}
                title="Đăng xuất khỏi tài khoản"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <button
              id="btn-dang-nhap"
              className={styles.loginBtn}
              onClick={() => {
                setAuthTab("login");
                setShowLoginModal(true);
              }}
            >
              <span>👤</span> Đăng nhập / Đăng ký
            </button>
          )}

          {/* Nút Vào Học Nổi Bật Dễ Thấy Nhất Ở Góc Trên Cùng Bên Phải */}
          <button
            type="button"
            id="btn-vao-hoc-header"
            className={styles.prominentVaoHocBtn}
            onClick={openStudentLoginModal}
            title="Cổng Vào Học Dành Cho Học Sinh: Nhập mã giáo viên, chọn lớp, chọn tên và đặt mật khẩu"
          >
            <span className={styles.prominentVaoHocIcon}>🎓</span>
            <span className={styles.prominentVaoHocText}>
              <span>Vào</span>
              <span>học</span>
            </span>
          </button>
        </div>
      </div>
    </header>

    {/* Thông báo đồng bộ dữ liệu vào Firebase */}
    {firebaseSaveFeedback && (
      <div style={{
        position: "fixed",
        top: "80px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        background: "#065f46",
        color: "#ffffff",
        padding: "12px 24px",
        borderRadius: "14px",
        boxShadow: "0 10px 30px rgba(6, 95, 70, 0.45)",
        fontSize: "14px",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        border: "1.5px solid #34d399",
      }}>
        <span style={{ fontSize: "18px" }}>☁️</span>
        <span>{firebaseSaveFeedback}</span>
      </div>
    )}

    {/* Thông báo tải tài liệu */}
    {downloadSuccessMsg && (
      <div style={{
        position: "fixed",
        top: "80px",
        right: "24px",
        zIndex: 9999,
        background: "#10b981",
        color: "#ffffff",
        padding: "12px 20px",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(16, 185, 129, 0.35)",
        fontSize: "13.5px",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        <span>📥</span> {downloadSuccessMsg}
      </div>
    )}

    {/* =========================================================
          2. PHẦN NỘI DUNG (PHẦN GIỮA):
             - MỤC VÀO THI NGAY (HÌNH ẢNH ĐẶC SẮC THU HÚT NGƯỜI XEM)
             - MỤC ĐỀ THI
             - MỤC TÀI LIỆU
      ========================================================= */}
    <main id="trang-chu">
      {/* MỤC 1: VÀO THI NGAY VỚI HÌNH ẢNH ĐẶC SẮC */}
      <section id="vao-thi-ngay" className={styles.sectionHero}>
        <div className={styles.heroGlow1}></div>
        <div className={styles.heroGlow2}></div>

        <div className={styles.heroContainer}>
          {/* Banner Đồ Họa Đặc Sắc Thu Hút Thí Sinh Với Ánh Sáng & Đồng Hồ Đếm Ngược 2026 */}
          <div className={`${styles.vividBannerWrapper} ${styles.revealOnScroll}`}>
            {/* Điểm nhấn đường viền phát sáng tinh tế trên cùng */}
            <div className={styles.bannerTopAccent}></div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/exam_hero_banner_2027.jpg"
              alt="Ôn thi THPT Quốc Gia Năm 2027 - Bứt phá điểm 9+"
              className={styles.bannerImg}
              style={{
                transform: `translate3d(0, ${Math.min(45, scrollY * 0.1)}px, 0)`,
              }}
            />
            <div className={styles.bannerOverlay}>
              <div className={styles.bannerGridTwoCol}>
                {/* CỘT TRÁI: TIÊU ĐỀ, ĐẾM NGƯỢC & HÀNH ĐỘNG */}
                <div className={styles.bannerLeftCol}>
                  <div className={styles.bannerBadgeTop}>
                    <span className={styles.pulseIcon}>✨</span>
                    <span>KỲ THI THPT QUỐC GIA 2027 • BỨT PHÁ ĐIỂM 9+</span>
                  </div>

                  <h2 className={styles.bannerHeadline}>
                    Vào Thi Ngay – Đấu Trường Trực Tuyến Lớp 12
                  </h2>
                  <p className={styles.bannerSubtext}>
                    Hệ thống thi thử chuẩn cấu trúc Bộ GD&ĐT dành cho học sinh trường <strong>THPT DTNT THCS & THPT Tuy Đức</strong>. Luyện đề bấm giờ, tự động chấm điểm và xếp hạng trực tiếp toàn trường!
                  </p>

                  {/* KHUNG ĐẾM NGƯỢC THỜI GIAN GỌN GÀNG */}
                  <div className={styles.countdownBannerContainer}>
                    <div className={styles.countdownTitle}>
                      <span>⏳</span>
                      <span>Đếm ngược ngày thi THPT 2027:</span>
                    </div>

                    <div className={styles.countdownGrid}>
                      <div className={styles.countdownBox}>
                        <span className={styles.countdownVal}>{timeLeft.days}</span>
                        <span className={styles.countdownUnit}>ngày</span>
                      </div>
                      <span className={styles.countdownColon}>:</span>

                      <div className={styles.countdownBox}>
                        <span className={styles.countdownVal}>{String(timeLeft.hours).padStart(2, "0")}</span>
                        <span className={styles.countdownUnit}>giờ</span>
                      </div>
                      <span className={styles.countdownColon}>:</span>

                      <div className={styles.countdownBox}>
                        <span className={styles.countdownVal}>{String(timeLeft.minutes).padStart(2, "0")}</span>
                        <span className={styles.countdownUnit}>phút</span>
                      </div>
                      <span className={styles.countdownColon}>:</span>

                      <div className={`${styles.countdownBox} ${styles.countdownBoxActive}`}>
                        <span className={styles.countdownVal}>{String(timeLeft.seconds).padStart(2, "0")}</span>
                        <span className={styles.countdownUnit}>giây</span>
                      </div>
                    </div>
                  </div>

                  {/* HÀNG HÀNH ĐỘNG */}
                  <div className={styles.bannerActionRow}>
                    <button
                      className={styles.bannerFastBtn}
                      onClick={() => {
                        if (examsList.length > 0) {
                          setSelectedExam(examsList[0]);
                        } else {
                          scrollToSection("de-thi", "de-thi");
                        }
                      }}
                    >
                      <span>⚡</span> Vào thi ngay
                    </button>

                    <button
                      type="button"
                      className={styles.bannerDocBtn}
                      onClick={() => setShowDocLibraryModal(true)}
                      title="Kho Tài Liệu Ôn Thi 12 Trọng Tâm Điểm 9+"
                    >
                      <span>🧾</span> Tài liệu ôn thi
                    </button>
                  </div>
                </div>

                {/* CỘT PHẢI: TRẠNG THÁI & CỤM ICON CÁC MÔN HỌC LƠ LỬNG ĐÁNG YÊU */}
                <div className={styles.bannerRightCol}>
                  <div className={styles.bannerLiveIndicator}>
                    <span className={styles.liveDotPulse}></span>
                    <span><strong>24.850</strong> thí sinh đang trực tuyến</span>
                  </div>

                  <div className={styles.cuteClusterWrap}>
                    {/* Thẻ trung tâm lớn: Mũ tốt nghiệp & Bứt phá 9+ */}
                    <div
                      className={`${styles.cuteTile} ${styles.cuteTileCenter}`}
                      onClick={() => scrollToSection("de-thi", "de-thi")}
                      title="Luyện thi THPT Quốc Gia Điểm 9+"
                    >
                      <span className={styles.cuteTileEmoji}>🎓</span>
                      <span className={styles.cuteTilePill}>Ôn Thi 9+ 🚀</span>
                    </div>

                    {/* 4 Thẻ bo góc 4 hướng: Toán 12, Hoá học, Ngữ văn, Vật lí */}
                    <div
                      className={`${styles.cuteTile} ${styles.cuteTileTL}`}
                      onClick={() => { setSelectedSubject("toan"); scrollToSection("de-thi", "de-thi"); }}
                      title="Môn Toán 12"
                    >
                      <span className={styles.cuteTileEmoji}>📐</span>
                      <span className={styles.cuteTileLabel}>Toán 12</span>
                    </div>

                    <div
                      className={`${styles.cuteTile} ${styles.cuteTileTR}`}
                      onClick={() => { setSelectedSubject("hoa"); scrollToSection("de-thi", "de-thi"); }}
                      title="Môn Hoá học 12"
                    >
                      <span className={styles.cuteTileEmoji}>🧪</span>
                      <span className={styles.cuteTileLabel}>Hoá học</span>
                    </div>

                    <div
                      className={`${styles.cuteTile} ${styles.cuteTileBL}`}
                      onClick={() => { setSelectedSubject("van"); scrollToSection("de-thi", "de-thi"); }}
                      title="Môn Ngữ văn 12"
                    >
                      <span className={styles.cuteTileEmoji}>📖</span>
                      <span className={styles.cuteTileLabel}>Ngữ văn</span>
                    </div>

                    <div
                      className={`${styles.cuteTile} ${styles.cuteTileBR}`}
                      onClick={() => { setSelectedSubject("ly"); scrollToSection("de-thi", "de-thi"); }}
                      title="Môn Vật lí 12"
                    >
                      <span className={styles.cuteTileEmoji}>⚡</span>
                      <span className={styles.cuteTileLabel}>Vật lí</span>
                    </div>

                    {/* Các vệ tinh môn học nhỏ xinh xung quanh */}
                    <div
                      className={`${styles.cuteTileMini} ${styles.cuteMini1}`}
                      onClick={() => { setSelectedSubject("sinh"); scrollToSection("de-thi", "de-thi"); }}
                      title="Môn Sinh học 12"
                    >
                      <span>🧬</span>
                      <span className={styles.miniTag}>Sinh</span>
                    </div>

                    <div
                      className={`${styles.cuteTileMini} ${styles.cuteMini2}`}
                      onClick={() => { setSelectedSubject("anh"); scrollToSection("de-thi", "de-thi"); }}
                      title="Môn Tiếng Anh 12"
                    >
                      <span>🇬🇧</span>
                      <span className={styles.miniTag}>Anh</span>
                    </div>

                    <div
                      className={`${styles.cuteTileMini} ${styles.cuteMini3}`}
                      onClick={() => scrollToSection("de-thi", "de-thi")}
                      title="Mục tiêu Điểm 9+"
                    >
                      <span>🏆</span>
                      <span className={styles.miniTag}>9+</span>
                    </div>

                    <div
                      className={`${styles.cuteTileMini} ${styles.cuteMini4}`}
                      onClick={() => { setSelectedSubject("tin"); scrollToSection("de-thi", "de-thi"); }}
                      title="Môn Tin học 12"
                    >
                      <span>💻</span>
                      <span className={styles.miniTag}>Tin</span>
                    </div>

                    {/* Hạt sao & tên lửa lơ lửng trang trí */}
                    <div className={styles.cuteSparkle1}>✨</div>
                    <div className={styles.cuteSparkle2}>⭐</div>
                    <div className={styles.cuteSparkle3}>🚀</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Khung Thông Tin & Mô Phỏng Làm Bài Thi Tương Tác Cấp Độ Cao */}
          <div className={`${styles.heroGridTwoCol} ${styles.revealOnScroll}`}>
            <div className={styles.heroTextCol}>
              {/* Dải chứng nhận học sinh xuất sắc */}
              <div className={styles.heroStudentProof}>
                <div className={styles.avatarStack}>
                  <span className={styles.proofAvatar} style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>T</span>
                  <span className={styles.proofAvatar} style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>H</span>
                  <span className={styles.proofAvatar} style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>N</span>
                  <span className={styles.proofAvatar} style={{ background: "linear-gradient(135deg, #ec4899, #be185d)" }}>D</span>
                  <span className={styles.proofAvatarCount}>+50k</span>
                </div>
                <div className={styles.proofText}>
                  <div className={styles.proofStars}>⭐⭐⭐⭐⭐ <span>(4.9/5 Điểm Đánh Giá)</span></div>
                  <div className={styles.proofLabel}>Hơn 50.000+ học sinh THPT Tuy Đức & cả nước tham gia luyện thi</div>
                </div>
              </div>

              <div className={styles.heroBadge}>
                <span className={styles.badgePulse}></span>
                <span>🎯 CHUẨN ĐỀ THI BỘ GD&ĐT 2027 • CAM KẾT ĐIỂM 9+ 🚀</span>
              </div>

              <h1 className={styles.heroTitle}>
                Luyện thi THPT 2027 - <span className={styles.gradientText}>Bứt Phá Điểm Số 🎯</span>
              </h1>

              <p className={styles.heroDesc}>
                Hệ thống ôn luyện trực tuyến chuyên sâu lớp 12 trường <strong>THPT DTNT THCS & THPT Tuy Đức</strong> đồng hành cùng <strong>Đặng Anh Thư</strong> 🎓.
                Làm chủ kỹ thuật giải nhanh 30 giây, bứt phá tư duy vận dụng cao và thực chiến hơn <strong>1.200+</strong> đề thi thử bấm giờ tự động chuẩn format 2027!
              </p>

              <div className={styles.heroButtons}>
                <button
                  className={styles.ctaPrimaryGlow}
                  onClick={() => scrollToSection("de-thi", "de-thi")}
                >
                  <span>🔥</span> VÀO THI THỬ NGAY (MIỄN PHÍ) 🚀
                </button>
                <button
                  type="button"
                  id="btn-vao-hoc-hero"
                  className={styles.heroVaoHocCta}
                  onClick={openStudentLoginModal}
                  title="Cổng Vào Học Dành Cho Học Sinh: Nhập mã giáo viên, chọn lớp, chọn học sinh và mật khẩu"
                >
                  <span style={{ fontSize: "20px" }}>🎓</span> VÀO HỌC NGAY
                </button>
                <button
                  id="btn-tai-kho-tai-lieu-12"
                  className={styles.ctaSecondaryModern}
                  onClick={() => {
                    setDocModalSubject("all");
                    setDocModalSearch("");
                    setShowDocLibraryModal(true);
                  }}
                  title="Mở Kho Tài Liệu Ôn & Luyện Thi 12 (PDF)"
                >
                  <span>📚</span> Tải Kho Tài Liệu 12 (PDF)
                </button>
                <div id="tai-lieu" style={{ display: "none" }} />
              </div>

              <div className={styles.statsBar}>
                <div className={styles.statItem}>
                  <div className={styles.statIconBadge}>👨‍🎓</div>
                  <span className={styles.statValue}>50.000+</span>
                  <span className={styles.statLabel}>Học sinh theo học</span>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statIconBadge}>📑</div>
                  <span className={styles.statValue}>1.200+</span>
                  <span className={styles.statLabel}>Đề thi chuẩn 2027</span>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statIconBadge}>📈</div>
                  <span className={styles.statValue}>98.5%</span>
                  <span className={styles.statLabel}>Tăng 2 - 3 điểm</span>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statIconBadge}>🏆</div>
                  <span className={styles.statValue}>Top 1</span>
                  <span className={styles.statLabel}>Đấu trường Tuy Đức</span>
                </div>
              </div>
            </div>

            {/* Interactive Exam Simulator Card - Thẻ Đấu Trường Tương Tác Nhiều Câu Hỏi Linh Hoạt */}
            <div className={styles.simulatorCard}>
              <div className={styles.simCardShine}></div>

              <div className={styles.simHeader}>
                <div className={styles.simBadge}>
                  <span className={styles.livePulseDot}></span>
                  <span>{currentSimQ.roomName}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    className={styles.simRandomBtn}
                    onClick={handleRandomSimQuestion}
                    title="Chuyển sang câu hỏi ngẫu nhiên khác"
                  >
                    <span>🎲</span> Đổi câu
                  </button>
                  <div className={styles.simTimer}>
                    <span>⏱️</span> {currentSimQ.timer}
                  </div>
                </div>
              </div>

              {/* Thanh điều hướng chuyển đổi linh hoạt nhiều câu hỏi */}
              <div className={styles.simSwitcherRow}>
                <div className={styles.simQuestionPills}>
                  <button
                    type="button"
                    className={styles.simPillBtn}
                    onClick={handlePrevSimQuestion}
                    title="Câu trước"
                  >
                    ◀
                  </button>
                  {SIMULATOR_QUESTIONS.map((q, idx) => {
                    const isActive = idx === simQuestionIndex;
                    const hasAnswered = simAnswers[idx] !== undefined;
                    const isCorrect = hasAnswered && simAnswers[idx] === q.correctAnswerIndex;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        className={`${styles.simPillBtn} ${isActive ? styles.simPillBtnActive : ""} ${hasAnswered ? styles.simPillBtnAnswered : ""}`}
                        onClick={() => setSimQuestionIndex(idx)}
                      >
                        {isCorrect ? "✓ " : ""}Câu {idx + 1}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className={styles.simPillBtn}
                    onClick={handleNextSimQuestion}
                    title="Câu sau"
                  >
                    ▶
                  </button>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>
                  {simQuestionIndex + 1} / {SIMULATOR_QUESTIONS.length} ({currentSimQ.subject})
                </span>
              </div>

              <div className={styles.simExamInfoRow}>
                <h3 className={styles.simExamTitle}>
                  {currentSimQ.title}
                </h3>
                <span className={styles.simDifficultyTag}>{currentSimQ.difficultyTag}</span>
              </div>

              <div className={styles.simQuestionBox}>
                <div className={styles.simQuestionTag}>
                  {currentSimQ.questionTag}
                </div>
                <p className={styles.simQuestionText}>
                  {currentSimQ.questionText}
                </p>
              </div>

              <div className={styles.simOptions}>
                {currentSimQ.options.map((opt, idx) => {
                  const isSelected = currentSimAnswer === idx;
                  const isCorrect = isSelected && idx === currentSimQ.correctAnswerIndex;
                  const isWrong = isSelected && idx !== currentSimQ.correctAnswerIndex;
                  return (
                    <button
                      key={idx}
                      className={`${styles.simOptionBtn} ${isCorrect ? styles.simOptionCorrect : isWrong ? styles.simOptionWrong : ""}`}
                      onClick={() => handleSelectSimAnswer(idx)}
                    >
                      <span className={styles.simOptionLetter}>{opt.letter}</span>
                      <span>{opt.text}</span>
                      {isCorrect && <span style={{ marginLeft: "auto", fontSize: "14px" }}>✅</span>}
                      {isWrong && <span style={{ marginLeft: "auto", fontSize: "14px" }}>❌</span>}
                    </button>
                  );
                })}
              </div>

              {/* Phản hồi tức thì khi chọn đáp án */}
              {currentSimAnswer !== null && currentSimAnswer === currentSimQ.correctAnswerIndex && (
                <div className={styles.simFeedbackSuccess}>
                  <span style={{ fontSize: "20px" }}>🎉</span>
                  <div style={{ flex: 1 }}>
                    <strong>Chính xác 100%! (+100 Điểm)</strong>
                    <div style={{ fontSize: "12px", opacity: 0.9, marginTop: "2px" }}>
                      {currentSimQ.explanation}
                    </div>
                    <div>
                      <button
                        type="button"
                        className={styles.simNextBtn}
                        onClick={handleNextSimQuestion}
                      >
                        <span>✨</span> Tiếp tục sang câu tiếp theo ➔
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {currentSimAnswer !== null && currentSimAnswer !== currentSimQ.correctAnswerIndex && (
                <div className={styles.simFeedbackError}>
                  <span style={{ fontSize: "20px" }}>💡</span>
                  <div style={{ flex: 1 }}>
                    <strong>Chưa chính xác!</strong> {currentSimQ.hint}
                    <div>
                      <button
                        type="button"
                        className={styles.simRetryBtn}
                        onClick={handleRetrySimQuestion}
                      >
                        🔄 Chọn lại đáp án
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.simScoreRow}>
                <div className={styles.simScoreInfo}>
                  <span className={styles.simScoreIcon}>🏆</span>
                  <div>
                    <div className={styles.simScoreLabel}>Dự đoán điểm thi thử</div>
                    <div className={styles.simScoreVal}>{currentSimQ.targetScore}</div>
                  </div>
                </div>
                <span className={styles.simScoreRank}>{currentSimQ.rankText}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
            3 MỤC CHÍNH TRÊN TRANG CHỦ: BÀI GIẢNG & TÀI LIỆU, ĐỀ THI, VIDEO BÀI HỌC (CHUẨN HÌNH 2)
        ========================================================= */}
      <section id="muc-hoc-lieu" className={styles.sectionWrap} style={{ paddingTop: "16px", paddingBottom: "16px" }}>
        {/* MỤC 1: BÀI GIẢNG & TÀI LIỆU */}
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>📄</span>
              <h3
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#1d4ed8",
                  letterSpacing: "-0.2px",
                }}
              >
                Bài giảng &amp; Tài liệu
              </h3>
            </div>

            <button
              type="button"
              className={styles.zoomBtn}
              onClick={handleOpenDocumentSection}
              title="Xem tất cả tài liệu học tập"
              style={{
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
              }}
            >
              XEM TẤT CẢ &gt;
            </button>
          </div>

          {/* Grid of Subject Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "14px",
            }}
          >
            {(showMoreDocs ? documentCategories : documentCategories.slice(0, 6)).map((cat) => (
              <div
                key={cat.id}
                className={styles.zoomCard}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.22s ease, box-shadow 0.22s ease",
                }}
              >
                <div>
                  {renderSubjectCover(cat)}
                  <div style={{ padding: "8px 10px 4px 10px" }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 800,
                        color: "#1e293b",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={cat.name}
                    >
                      {formatDisplaySubjectName(cat.name, false)}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        margin: "2px 0 6px 0",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {formatDisplaySubtitle(cat, false)}
                    </div>
                  </div>
                </div>

                <div style={{ padding: "0 10px 10px 10px" }}>
                  <button
                    type="button"
                    className={styles.zoomBtn}
                    onClick={() => {
                      setActiveCategoryModal(cat);
                      setActiveSubfolder("all");
                      setFilterItemType("all");
                    }}
                    style={{
                      width: "100%",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      borderRadius: "8px",
                      padding: "6px 0",
                      fontSize: "12px",
                      fontWeight: 800,
                      cursor: "pointer",
                      letterSpacing: "0.3px",
                    }}
                  >
                    VÀO HỌC
                  </button>
                </div>
              </div>
            ))}
          </div>

          {documentCategories.length > 6 && (
            <div style={{ textAlign: "center", marginTop: "10px" }}>
              <button
                type="button"
                onClick={() => setShowMoreDocs(!showMoreDocs)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#2563eb",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {showMoreDocs ? "Thu gọn ▲" : `Xem thêm ${documentCategories.length - 6} môn khác ▼`}
              </button>
            </div>
          )}
        </div>

        {/* MỤC 2: ĐỀ THI (CHUẨN HÌNH 2) */}
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>📝</span>
              <h3
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#1d4ed8",
                  letterSpacing: "-0.2px",
                }}
              >
                Đề thi
              </h3>
            </div>

            <button
              type="button"
              className={styles.zoomBtn}
              onClick={handleOpenExamSection}
              title="Xem tất cả đề thi"
              style={{
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
              }}
            >
              XEM TẤT CẢ &gt;
            </button>
          </div>

          {/* Grid of Exam Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "14px",
            }}
          >
            {(showMoreExams ? examCategories : examCategories.slice(0, 6)).map((cat) => (
              <div
                key={cat.id}
                className={styles.zoomCard}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.22s ease, box-shadow 0.22s ease",
                }}
              >
                <div>
                  {renderSubjectCover(cat)}
                  <div style={{ padding: "8px 10px 4px 10px" }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 800,
                        color: "#1e293b",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={cat.name}
                    >
                      {formatDisplaySubjectName(cat.name, true)}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#64748b",
                        margin: "2px 0 6px 0",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {formatDisplaySubtitle(cat, true)}
                    </div>
                  </div>
                </div>

                <div style={{ padding: "0 10px 10px 10px" }}>
                  <button
                    type="button"
                    className={styles.zoomBtn}
                    onClick={() => setActiveCategoryModal(cat)}
                    style={{
                      width: "100%",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      borderRadius: "8px",
                      padding: "6px 0",
                      fontSize: "12px",
                      fontWeight: 800,
                      cursor: "pointer",
                      letterSpacing: "0.3px",
                    }}
                  >
                    VÀO HỌC
                  </button>
                </div>
              </div>
            ))}
          </div>

          {examCategories.length > 6 && (
            <div style={{ textAlign: "center", marginTop: "10px" }}>
              <button
                type="button"
                onClick={() => setShowMoreExams(!showMoreExams)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#2563eb",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {showMoreExams ? "Thu gọn ▲" : `Xem thêm ${examCategories.length - 6} bộ đề khác ▼`}
              </button>
            </div>
          )}
        </div>

        {/* MỤC 3: VIDEO BÀI HỌC & TIN TỨC (CHUẨN HÌNH 2) */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>🎬</span>
              <h3
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#1d4ed8",
                  letterSpacing: "-0.2px",
                }}
              >
                Video Bài học &amp; Tin tức
              </h3>
            </div>

            <button
              type="button"
              className={styles.zoomBtn}
              onClick={handleOpenVideoSection}
              title="Xem tất cả video bài giảng"
              style={{
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
              }}
            >
              XEM TẤT CẢ &gt;
            </button>
          </div>

          {videoCategories.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 16px",
                background: "#ffffff",
                border: "1px dashed #cbd5e1",
                borderRadius: "12px",
                color: "#64748b",
                fontSize: "13.5px",
                fontWeight: 600,
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
              }}
            >
              🎬 Chưa có video bài học.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: "14px",
              }}
            >
              {videoCategories.slice(0, 6).map((cat) => (
                <div
                  key={cat.id}
                  className={styles.zoomCard}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.22s ease, box-shadow 0.22s ease",
                  }}
                >
                  <div>
                    {renderSubjectCover(cat)}
                    <div style={{ padding: "8px 10px 4px 10px" }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 800,
                          color: "#1e293b",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={cat.name}
                      >
                        {cat.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 6px 0" }}>
                        🎬 Video bài giảng
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "0 10px 10px 10px" }}>
                    <button
                      type="button"
                      className={styles.zoomBtn}
                      onClick={() => {
                        setActiveCategoryModal(cat);
                        setActiveSubfolder("all");
                        setFilterItemType("all");
                      }}
                      style={{
                        width: "100%",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        borderRadius: "8px",
                        padding: "6px 0",
                        fontSize: "12px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      VÀO HỌC
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

    </main>

    {/* =========================================================
          3. PHẦN CHÂN (FOOTER): THÔNG TIN LIÊN HỆ, ĐỊA CHỈ, EMAIL,
             HOTLINE VÀ CÁC LOGO DỄ NHÌN, NHẬN BIẾT
      ========================================================= */}
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        {/* Cột 1: Logo & Giới thiệu & Logo Mạng Xã Hội */}
        <div className={styles.footerBrandSection}>
          <div className={styles.footerBrandHeader}>
            <div className={styles.footerLogoIcon}>🎓</div>
            <div>
              <div className={styles.footerBrandName}>Luyện Thi 12</div>
              <div className={styles.footerBrandSlogan}>Bứt phá điểm số</div>
            </div>
          </div>

          <div className={styles.socialLogosTitle} style={{ marginTop: "12px" }}>Kết Nối Cùng Chúng Tôi:</div>
          <div className={styles.socialLogosRow}>
            {/* Facebook Logo */}
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className={`${styles.socialLogoBtn} ${styles.socialFb}`} title="Facebook">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>

            {/* YouTube Logo */}
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className={`${styles.socialLogoBtn} ${styles.socialYt}`} title="YouTube">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>

            {/* Zalo Logo */}
            <a href="https://zalo.me" target="_blank" rel="noreferrer" className={`${styles.socialLogoBtn} ${styles.socialZalo}`} title="Zalo">
              <span style={{ fontWeight: 900, fontSize: "11px", letterSpacing: "-0.5px" }}>Zalo</span>
            </a>

            {/* TikTok Logo */}
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" className={`${styles.socialLogoBtn} ${styles.socialTiktok}`} title="TikTok">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
            </a>

            {/* Telegram Logo */}
            <a href="https://t.me" target="_blank" rel="noreferrer" className={`${styles.socialLogoBtn} ${styles.socialTele}`} title="Telegram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Cột 3: Môn Thi 12 Trọng Tâm */}
        <div>
          <h4 className={styles.footerHeading}>Môn Thi Lớp 12</h4>
          <ul className={styles.footerLinks}>
            <li><a href="#de-thi"><span>📐</span> Toán học 12 (Giải nhanh 30s)</a></li>
            <li><a href="#de-thi"><span>⚡</span> Vật lí 12 (Chuẩn hóa số liệu)</a></li>
            <li><a href="#de-thi"><span>🧪</span> Hóa học 12 (Dồn chất 9+)</a></li>
            <li><a href="#de-thi"><span>🧬</span> Sinh học 12 (Di truyền học)</a></li>
            <li><a href="#de-thi"><span>🌍</span> Tiếng Anh & Ngữ văn 12</a></li>
          </ul>
        </div>

        {/* Cột 4: Thông Tin Liên Hệ Chi Tiết Có Logo Nhận Diện */}
        <div>
          <h4 className={styles.footerHeading}>Thông Tin Liên Hệ</h4>
          <ul className={styles.contactList}>
            <li className={styles.contactItem}>
              <div className={styles.contactLogoBadge}>🏫</div>
              <div>
                <strong>Trường THPT DTNT THCS & THPT Tuy Đức:</strong>
                <span>Xã Tuy Đức, Tỉnh Lâm Đồng</span>
              </div>
            </li>

            <li className={styles.contactItem}>
              <div className={styles.contactLogoBadge}>📞</div>
              <div>
                <strong>Tổng đài tư vấn & hỗ trợ thi:</strong>
                <span>Hotline: 0914905774</span>
              </div>
            </li>

            <li className={styles.contactItem}>
              <div className={styles.contactLogoBadge}>✉️</div>
              <div>
                <strong>Hộp thư điện tử hỗ trợ:</strong>
                <span>dngatt@gmail.com</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <span>© 2026 Hệ thống Luyện Thi 12 • THPT DTNT THCS & THPT Tuy Đức • Bản quyền thuộc về Đặng Anh Thư 🎓</span>
        <span>Chinh phục 9+ • Vững bước cánh cổng Đại học mơ ước 🚀</span>
      </div>
    </footer>

    {/* =========================================================
          MODAL 1: ĐĂNG NHẬP / ĐĂNG KÝ TÀI KHOẢN HỌC SINH
      ========================================================= */}
    {showLoginModal && (
      <div className={styles.modalOverlay} onClick={() => setShowLoginModal(false)}>
        <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
          <button className={styles.modalClose} onClick={() => setShowLoginModal(false)}>
            ✕
          </button>

          <div className={styles.loginHeader}>
            <div className={styles.loginLogoWrap}>🎓</div>
            <h3 className={styles.loginTitle}>
              {authTab === "login" ? "Đăng Nhập Tài Khoản" : "Đăng Ký Tài Khoản Học Sinh"}
            </h3>
            <p className={styles.loginSub}>
              Cổng thi trực tuyến • THPT DTNT THCS & THPT Tuy Đức
            </p>
          </div>

          {/* Switch Tab Đăng Nhập / Đăng Ký */}
          <div className={styles.loginTabs}>
            <button
              className={`${styles.loginTabBtn} ${authTab === "login" ? styles.loginTabActive : ""}`}
              onClick={() => setAuthTab("login")}
            >
              🔐 Đăng Nhập
            </button>
            <button
              className={`${styles.loginTabBtn} ${authTab === "register" ? styles.loginTabActive : ""}`}
              onClick={() => setAuthTab("register")}
            >
              📝 Đăng Ký
            </button>
          </div>

          {/* Form Submit */}
          <form onSubmit={handleEmailAuthSubmit}>
            {authTab === "register" && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Họ và tên học sinh:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn An"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Lớp (Trường Tuy Đức):</label>
                  <select
                    value={authClass}
                    onChange={(e) => setAuthClass(e.target.value)}
                    className={styles.formInput}
                    style={{ cursor: "pointer" }}
                  >
                    <option value="12A1">Lớp 12A1</option>
                    <option value="12A2">Lớp 12A2</option>
                    <option value="12A3">Lớp 12A3</option>
                    <option value="12A4">Lớp 12A4</option>
                    <option value="khac">Khác (Học sinh tự do)</option>
                  </select>
                </div>
              </>
            )}

            {/* Tên đăng nhập là địa chỉ Email */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Tên đăng nhập (Địa chỉ Email):
              </label>
              <input
                type="email"
                required
                placeholder="nhap.email.hocsinh@gmail.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className={styles.formInput}
              />
            </div>

            {/* Mật khẩu (Password) */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Mật khẩu (Password):
              </label>
              <div className={styles.passwordInputWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder={authTab === "login" ? "Nhập mật khẩu của bạn..." : "Tạo mật khẩu (tối thiểu 6 ký tự)..."}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className={styles.formInput}
                />
                <button
                  type="button"
                  className={styles.passwordToggleBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? "👁️" : "🙈"}
                </button>
              </div>
            </div>

            {authTab === "login" && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#64748b" }}>
                  <input type="checkbox" defaultChecked /> Ghi nhớ đăng nhập
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Vui lòng liên hệ Văn phòng trường THPT Tuy Đức hoặc Hotline 0914905774 để cấp lại mật khẩu.");
                  }}
                  style={{ color: "#2563eb", fontWeight: 600 }}
                >
                  Quên mật khẩu?
                </a>
              </div>
            )}

            <button type="submit" className={styles.formSubmitBtn} disabled={authLoading}>
              {authLoading ? "Đang xử lý..." : authTab === "login" ? "Đăng Nhập Ngay 🚀" : "Hoàn Tất Đăng Ký 🎓"}
            </button>
          </form>

          {/* Phân cách */}
          <div className={styles.orDivider}>
            <span>Hoặc tiếp tục với</span>
          </div>

          {/* Nút Đăng Nhập Bằng Google */}
          <button
            type="button"
            className={styles.googleBtn}
            onClick={handleGoogleSignIn}
            disabled={authLoading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z" />
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
            </svg>
            <span>{authTab === "login" ? "Đăng nhập bằng Google" : "Đăng ký nhanh bằng Google"}</span>
          </button>
        </div>
      </div>
    )}

    {/* =========================================================
          MODAL 2: QUẢN TRỊ (ADMIN MODAL & FIREBASE ACCOUNTS VIEW)
      ========================================================= */}
    {showAdminModal && (
      <div className={styles.modalOverlay} onClick={() => setShowAdminModal(false)}>
        <div className={`${styles.modalBox} ${styles.adminModalBox}`} onClick={(e) => e.stopPropagation()}>
          <button className={styles.modalClose} onClick={() => setShowAdminModal(false)}>
            ✕
          </button>

          <div className={styles.loginHeader}>
            <div className={styles.loginLogoWrap} style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e40af 100%)" }}>
              ⚙️
            </div>
            <h3 className={styles.loginTitle}>Bảng Quản Trị Hệ Thống</h3>
            <p className={styles.loginSub}>Admin Portal • THPT DTNT THCS & THPT Tuy Đức</p>
          </div>

          <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
            <div style={{ fontSize: "13px", color: "#1e40af", fontWeight: 700, marginBottom: "6px" }}>
              ☁️ Cơ sở dữ liệu Firebase (Project: luyenthi12-4fb8c):
            </div>
            <div style={{ fontSize: "12.5px", color: "#475569", lineHeight: "1.6" }}>
              Tất cả thông tin tài khoản học sinh đăng ký hoặc đăng nhập (bằng Email hoặc Google) đều được lưu trữ trực tiếp và tự động đồng bộ vào collection <strong>&apos;users&apos;</strong> trên Firebase Firestore.
            </div>
          </div>

          {/* Bảng Hiển Thị Dữ Liệu Tài Khoản Trực Tiếp Từ Firebase */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>
                📋 Danh Sách Tài Khoản Học Sinh Trên Firebase ({adminUsersList.length}):
              </strong>
              <button
                type="button"
                onClick={async () => {
                  setLoadingUsers(true);
                  const users = await getAllRegisteredUsers();
                  setAdminUsersList(users);
                  setLoadingUsers(false);
                }}
                style={{
                  fontSize: "12px",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                🔄 Làm mới dữ liệu
              </button>
            </div>

            {loadingUsers ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontSize: "13px", background: "#f8fafc", borderRadius: "10px" }}>
                ⏳ Đang tải danh sách tài khoản từ Firestore (collection &apos;users&apos;)...
              </div>
            ) : adminUsersList.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "13px", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1" }}>
                Chưa có tài khoản nào được đăng ký trong phiên này hoặc đang tải dữ liệu. Bạn hãy bấm nút &quot;Đăng nhập / Đăng ký&quot; để tạo một tài khoản mới và dữ liệu sẽ xuất hiện ngay tại đây!
              </div>
            ) : (
              <div className={styles.accountTableWrap}>
                <table className={styles.accountTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Họ và tên</th>
                      <th>Email</th>
                      <th style={{ textAlign: "center" }}>Mã GV (6 số)</th>
                      <th style={{ textAlign: "center" }}>Ngày ĐK</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsersList.map((u, idx) => (
                      <tr key={u.uid || idx}>
                        <td style={{ fontWeight: 700, color: "#64748b" }}>{idx + 1}</td>
                        <td style={{ fontWeight: 700 }}>{u.fullName || "---"}</td>
                        <td style={{ color: "#2563eb", fontWeight: 600 }}>{u.email}</td>
                        <td style={{ textAlign: "center" }}>
                          {u.teacherCode ? (
                            <span style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 800, fontFamily: "monospace" }}>
                              {u.teacherCode}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center", fontSize: "12px", color: "#475569" }}>
                          {u.registeredDate || "19/9/2026"}
                        </td>
                        <td>
                          <span style={{
                            background: u.status === "active" ? "#dcfce7" : "#f1f5f9",
                            color: u.status === "active" ? "#166534" : "#64748b",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700
                          }}>
                            {u.status === "active" ? "ĐÃ KÍCH HOẠT" : "CHƯA KÍCH HOẠT"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className={styles.ctaPrimary}
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => {
                alert("Đã kết nối trực tiếp với Firebase Firestore và Authentication!");
                setShowAdminModal(false);
              }}
            >
              Xác Nhận & Đóng
            </button>
            <button
              className={styles.ctaSecondary}
              onClick={() => setShowAdminModal(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    )}

    {/* =========================================================
          MODAL: CHI TIẾT MỤC HỌC LIỆU (CÁC THƯ MỤC NHỎ, CHỌN BÀI ĐỌC/THI, TẢI DOCX/PDF)
      ========================================================= */}
    {activeCategoryModal && (() => {
      const isAllSection = activeCategoryModal.id.startsWith("all_");
      const sectionType = isAllSection
        ? (activeCategoryModal.id.replace("all_", "") as SectionCategoryType)
        : activeCategoryModal.type;
      const isDocCategory = sectionType === "document";
      const isExamCategory = sectionType === "exam";

      const catItems = learningItems.filter((i) => {
        if (isAllSection) {
          const validCatIds = new Set(learningCategories.filter((c) => c.type === sectionType).map((c) => c.id));
          if (!validCatIds.has(i.categoryId) && i.itemType !== sectionType) return false;
        } else {
          if (i.categoryId !== activeCategoryModal.id) return false;
        }
        // Trong mục Tài liệu: CHỈ HIỆN ĐỌC (không hiện thi)
        if (isDocCategory) return i.itemType !== "exam";
        // Trong mục Đề thi: HIỆN THI
        if (isExamCategory) return true;
        return true;
      });

      const subfolderSet = new Set<string>();
      catItems.forEach((i) => {
        if (i.subfolder) {
          subfolderSet.add(i.subfolder);
        } else if (isAllSection) {
          const parentCat = learningCategories.find((c) => c.id === i.categoryId);
          if (parentCat) subfolderSet.add(parentCat.name);
        }
      });
      const subfoldersList = Array.from(subfolderSet);

      const displayedItems = catItems.filter((item) => {
        if (activeSubfolder === "all") return true;
        if (item.subfolder === activeSubfolder) return true;
        if (isAllSection) {
          const parentCat = learningCategories.find((c) => c.id === item.categoryId);
          if (parentCat && parentCat.name === activeSubfolder) return true;
        }
        return false;
      });

      return (
        <div
          className={styles.modalOverlay}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => {
            setActiveCategoryModal(null);
            setActiveSubfolder("all");
            setFilterItemType("all");
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "880px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
              display: "flex",
              flexDirection: "column",
              animation: "fadeIn 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)",
                padding: "22px 26px",
                borderRadius: "20px 20px 0 0",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
                position: "relative",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "28px" }}>
                    {activeCategoryModal.type === "video" ? "🎥" : activeCategoryModal.type === "exam" ? "📝" : "📚"}
                  </span>
                  <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 900, letterSpacing: "-0.01em" }}>
                    {activeCategoryModal.name}
                  </h2>
                  <span
                    style={{
                      background: "rgba(255, 255, 255, 0.2)",
                      border: "1px solid rgba(255, 255, 255, 0.35)",
                      padding: "2px 10px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {activeCategoryModal.type === "video" ? "VIDEO BÀI GIẢNG" : activeCategoryModal.type === "exam" ? "BỘ ĐỀ THI" : "TÀI LIỆU ÔN THI"}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#e0e7ff", maxWidth: "680px", lineHeight: 1.5 }}>
                  {activeCategoryModal.description || "Danh sách các thư mục bài học, đề thi thử và tài liệu tải về chuẩn cấu trúc Bộ Giáo Dục."}
                </p>
                <div style={{ fontSize: "12px", color: "#bfdbfe", marginTop: "6px" }}>
                  Tác giả / Nguồn: <strong>{activeCategoryModal.author || "Nguồn internet"}</strong> • Tổng số: <strong>{catItems.length} nội dung</strong>
                </div>
              </div>

              <button
                type="button"
                className={styles.zoomBtn}
                onClick={() => {
                  setActiveCategoryModal(null);
                  setActiveSubfolder("all");
                  setFilterItemType("all");
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  color: "#ffffff",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  fontSize: "16px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Subfolder & Filters Toolbar */}
            <div
              style={{
                padding: "16px 24px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {/* 1. Thanh Thư Mục Nhỏ (Subfolders) */}
              <div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>📁</span> CÁC THƯ MỤC NHỎ TRONG MỤC:
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className={`${styles.zoomFolder} ${styles.zoomBtn}`}
                    onClick={() => setActiveSubfolder("all")}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "10px",
                      fontSize: "13px",
                      fontWeight: 700,
                      border: "1.5px solid",
                      borderColor: activeSubfolder === "all" ? "#2563eb" : "#cbd5e1",
                      background: activeSubfolder === "all" ? "#eff6ff" : "#ffffff",
                      color: activeSubfolder === "all" ? "#1d4ed8" : "#475569",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>📂</span>
                    <span>Tất cả thư mục</span>
                    <span
                      style={{
                        background: activeSubfolder === "all" ? "#2563eb" : "#e2e8f0",
                        color: activeSubfolder === "all" ? "#ffffff" : "#64748b",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        fontSize: "11px",
                        fontWeight: 800,
                      }}
                    >
                      {catItems.length}
                    </span>
                  </button>

                  {subfoldersList.map((folder) => {
                    const countInFolder = catItems.filter((i) => i.subfolder === folder).length;
                    const isSelected = activeSubfolder === folder;
                    return (
                      <button
                        key={folder}
                        type="button"
                        className={`${styles.zoomFolder} ${styles.zoomBtn}`}
                        onClick={() => setActiveSubfolder(folder)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: 700,
                          border: "1.5px solid",
                          borderColor: isSelected ? "#2563eb" : "#cbd5e1",
                          background: isSelected ? "#eff6ff" : "#ffffff",
                          color: isSelected ? "#1d4ed8" : "#475569",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>📁</span>
                        <span>{folder}</span>
                        <span
                          style={{
                            background: isSelected ? "#2563eb" : "#e2e8f0",
                            color: isSelected ? "#ffffff" : "#64748b",
                            padding: "1px 6px",
                            borderRadius: "10px",
                            fontSize: "11px",
                            fontWeight: 800,
                          }}
                        >
                          {countInFolder}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Trạng thái số lượng bài hiển thị */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", paddingTop: "8px", borderTop: "1px dashed #e2e8f0" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#1e3a8a", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <span>{isDocCategory ? "📖 DANH SÁCH TÀI LIỆU ĐỌC" : isExamCategory ? "📝 DANH SÁCH ĐỀ THI TRỰC TUYẾN" : "🎬 DANH SÁCH VIDEO"}</span>
                  </span>
                </div>

                <span style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                  Hiển thị <strong>{displayedItems.length}</strong> {isDocCategory ? "tài liệu đọc" : isExamCategory ? "đề thi" : "video"}
                </span>
              </div>
            </div>

            {/* Items List */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {displayedItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>📭</div>
                  <div style={{ fontSize: "15px", fontWeight: 700 }}>Chưa có nội dung trong thư mục này</div>
                  <p style={{ fontSize: "13px", marginTop: "4px" }}>
                    Vui lòng chọn thư mục khác hoặc chuyển bộ lọc sang "Tất cả".
                  </p>
                </div>
              ) : (
                displayedItems.map((item) => {
                  const isExam = item.itemType === "exam" || activeCategoryModal.type === "exam";
                  return (
                    <div
                      key={item.id}
                      className={styles.zoomCard}
                      style={{
                        background: "#ffffff",
                        border: isExam ? "1.5px solid #a7f3d0" : "1.5px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "16px 18px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "8px",
                              background: isExam ? "#d1fae5" : "#dbeafe",
                              color: isExam ? "#047857" : "#1d4ed8",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "18px",
                              flexShrink: 0,
                            }}
                          >
                            {isExam ? "📝" : "📄"}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                              <span
                                style={{
                                  background: isExam ? "#059669" : "#2563eb",
                                  color: "#ffffff",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                }}
                              >
                                {isExam ? "ĐỀ THI" : `BÀI ${item.lessonNumber}`}
                              </span>
                              {item.subfolder && (
                                <span
                                  style={{
                                    background: "#f1f5f9",
                                    color: "#475569",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                  }}
                                >
                                  📁 {item.subfolder}
                                </span>
                              )}
                              {isAllSection && (
                                <span
                                  style={{
                                    background: "#fef3c7",
                                    color: "#92400e",
                                    fontSize: "11px",
                                    fontWeight: 800,
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid #fde68a",
                                  }}
                                >
                                  {learningCategories.find((c) => c.id === item.categoryId)?.name || "Môn học"}
                                </span>
                              )}
                            </div>
                            <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#1e293b", lineHeight: 1.4 }}>
                              {item.title}
                            </h4>
                            {item.description && (
                              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "8px",
                          paddingTop: "10px",
                          borderTop: "1px dashed #f1f5f9",
                          flexWrap: "wrap",
                        }}
                      >
                        {/* Nút Vào Thi (Chỉ hiện trong mục ĐỀ THI) hoặc Đọc Bài Này (Chỉ hiện trong mục TÀI LIỆU) */}
                        {isExam ? (
                          <Link
                            href={item.contentUrl?.startsWith("/mock-exams") ? item.contentUrl : `/mock-exams/${item.id}`}
                            className={styles.zoomBtn}
                            style={{
                              background: "#059669",
                              color: "#ffffff",
                              textDecoration: "none",
                              padding: "7px 18px",
                              borderRadius: "8px",
                              fontSize: "12.5px",
                              fontWeight: 800,
                              boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
                            }}
                          >
                            <span>📝</span> Vào Thi Ngay
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className={styles.zoomBtn}
                            onClick={() => setReadingDocItem(item)}
                            style={{
                              background: "#2563eb",
                              color: "#ffffff",
                              border: "none",
                              padding: "7px 16px",
                              borderRadius: "8px",
                              fontSize: "12.5px",
                              fontWeight: 800,
                              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
                            }}
                          >
                            <span>📖</span> Đọc Bài Này
                          </button>
                        )}

                        {/* Nút Tải DOCX */}
                        <button
                          type="button"
                          className={styles.zoomBtn}
                          onClick={() => downloadDocxFile(item.title, item.description, activeCategoryModal.name, item.contentBody)}
                          style={{
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1.5px solid #bfdbfe",
                            padding: "6px 14px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                          title="Tải về file Microsoft Word (.docx)"
                        >
                          <span>⬇️</span> Tải DOCX
                        </button>

                        {/* Nút Tải PDF */}
                        <button
                          type="button"
                          className={styles.zoomBtn}
                          onClick={() => downloadPdfFile(item.title, item.description, activeCategoryModal.name, item.contentBody)}
                          style={{
                            background: "#fef2f2",
                            color: "#b91c1c",
                            border: "1.5px solid #fecaca",
                            padding: "6px 14px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                          title="Tải về hoặc in file PDF"
                        >
                          <span>📄</span> Tải PDF
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      );
    })()}

    {/* =========================================================
          MODAL: ĐỌC TÀI LIỆU TRỰC TUYẾN (ONLINE READER)
      ========================================================= */}
    {readingDocItem && (
      <div
        className={styles.modalOverlay}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(8px)",
          zIndex: 100000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
        onClick={() => setReadingDocItem(null)}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "800px",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
            display: "flex",
            flexDirection: "column",
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Reader Header */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8fafc",
              borderRadius: "20px 20px 0 0",
            }}
          >
            <div>
              <span
                style={{
                  background: "#dbeafe",
                  color: "#1d4ed8",
                  padding: "3px 10px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                {readingDocItem.categoryName} • {readingDocItem.subfolder || "Chuyên đề trọng tâm"}
              </span>
              <h3 style={{ margin: "6px 0 0 0", fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                {readingDocItem.title}
              </h3>
            </div>

            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => setReadingDocItem(null)}
              style={{
                background: "#e2e8f0",
                border: "none",
                color: "#475569",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                fontSize: "16px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          {/* Quick Action Toolbar */}
          <div
            style={{
              padding: "12px 24px",
              background: "#ffffff",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => downloadDocxFile(readingDocItem.title, readingDocItem.description, readingDocItem.categoryName, readingDocItem.contentBody)}
              style={{
                background: "#eff6ff",
                color: "#1d4ed8",
                border: "1.5px solid #bfdbfe",
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "12.5px",
                fontWeight: 700,
              }}
            >
              <span>📥</span> Tải Về DOCX (.docx)
            </button>

            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => downloadPdfFile(readingDocItem.title, readingDocItem.description, readingDocItem.categoryName, readingDocItem.contentBody)}
              style={{
                background: "#fef2f2",
                color: "#b91c1c",
                border: "1.5px solid #fecaca",
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "12.5px",
                fontWeight: 700,
              }}
            >
              <span>📄</span> In / Tải PDF (.pdf)
            </button>

            {readingDocItem.contentUrl && readingDocItem.contentUrl.startsWith("http") && (
              <a
                href={readingDocItem.contentUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.zoomBtn}
                style={{
                  background: "#f1f5f9",
                  color: "#334155",
                  textDecoration: "none",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  border: "1px solid #cbd5e1",
                }}
              >
                <span>🔗</span> Mở Liên Kết Nguồn ↗
              </a>
            )}
          </div>

          {/* Reader Content Body */}
          <div style={{ padding: "24px 28px", lineHeight: 1.7, color: "#1e293b", fontSize: "14.5px" }}>
            <div
              style={{
                background: "#f8fafc",
                borderLeft: "4px solid #2563eb",
                padding: "14px 18px",
                borderRadius: "6px",
                marginBottom: "20px",
              }}
            >
              <div style={{ fontWeight: 800, color: "#1e40af", marginBottom: "4px", fontSize: "13px", textTransform: "uppercase" }}>
                Mục tiêu & Tóm tắt kiến thức:
              </div>
              <div>{readingDocItem.description}</div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#0369a1", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" }}>
                I. HỆ THỐNG TRỌNG TÂM LÝ THUYẾT & PHƯƠNG PHÁP
              </h4>
              <div style={{ whiteSpace: "pre-line", marginTop: "8px" }}>
                {readingDocItem.contentBody || "1. Nắm chắc định nghĩa, quy tắc và bản chất các công thức trọng tâm.\n2. Rèn luyện tư duy loại trừ đáp án nhiễu trong 30 giây.\n3. Ghi nhớ các lưu ý quan trọng để không mất điểm oan ở câu hỏi cơ bản."}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#0369a1", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" }}>
                II. HƯỚNG DẪN ÔN TẬP VÀ THI THỬ
              </h4>
              <p>
                Sau khi đọc xong bài học, học sinh nên nhấp vào nút <strong>Tải DOCX</strong> hoặc <strong>Tải PDF</strong> để lưu về máy tính hoặc in ra ôn luyện. Đồng thời, hãy thực hiện bài thi thử trực tuyến tương ứng để củng cố kiến thức và đo lường sự tiến bộ.
              </p>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* =========================================================
          MODAL 3: PHÒNG THI (EXAM MODAL DIALOG)
      ========================================================= */}
    {selectedExam && (
      <div className={styles.modalOverlay} onClick={() => setSelectedExam(null)}>
        <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
          <button className={styles.modalClose} onClick={() => setSelectedExam(null)}>
            ✕
          </button>

          <span className={`${styles.examSubjectBadge} ${getBadgeClass(selectedExam.subject, selectedExam.badgeClass)}`} style={{ marginBottom: 12 }}>
            {selectedExam.subjectName}
          </span>

          <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 12, lineHeight: 1.35 }}>
            {selectedExam.title}
          </h3>

          <div style={{ background: "#f8fafc", padding: 14, borderRadius: 12, marginBottom: 18, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
              <span style={{ color: "#64748b" }}>🏫 Nguồn đề:</span>
              <strong>{selectedExam.school}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
              <span style={{ color: "#64748b" }}>⏱️ Thời gian làm bài:</span>
              <strong>{selectedExam.timeMinutes} phút</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
              <span style={{ color: "#64748b" }}>📝 Số lượng câu hỏi:</span>
              <strong>{selectedExam.questions} câu trắc nghiệm</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
              <span style={{ color: "#64748b" }}>📊 Độ khó:</span>
              <strong style={{ color: "#1d4ed8" }}>{selectedExam.difficulty}</strong>
            </div>
          </div>

          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
            ⚠️ <strong>Quy chế phòng thi:</strong> Đồng hồ sẽ tự động đếm ngược khi bắt đầu. Không chuyển tab trong quá trình làm bài để đảm bảo tính khách quan và xếp hạng chuẩn xác.
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              className={styles.ctaPrimary}
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => {
                const targetCode = selectedExam.id;
                setSelectedExam(null);
                window.location.href = `/mock-exams/${encodeURIComponent(targetCode)}`;
              }}
            >
              Bắt Đầu Làm Bài Ngay 🚀
            </button>
            <button
              className={styles.ctaSecondary}
              onClick={() => setSelectedExam(null)}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    )}

    {/* =========================================================
          POPUP MODAL: VÀO HỌC CỦA HỌC SINH (NHẬP MÃ GV, LỚP, HS, MK LẦN ĐẦU)
      ========================================================= */}
    {showStudentLoginModal && (
      <div
        className={styles.modalOverlay}
        onClick={() => setShowStudentLoginModal(false)}
      >
        <div
          className={styles.studentLoginModalBox}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={styles.modalClose}
            onClick={() => setShowStudentLoginModal(false)}
            title="Đóng"
          >
            ✕
          </button>

          <div className={styles.studentModalHeader}>
            <div className={styles.studentModalBadge}>🎓</div>
            <h2 className={styles.studentModalTitle}>
              {popupStep === 1
                ? "Cổng Vào Học - Nhập Mã Giáo Viên"
                : popupStep === 2
                  ? "Chọn Lớp & Học Sinh"
                  : "Mật Khẩu & Vào Trang Cá Nhân"}
            </h2>
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "8px" }}>
              <span
                style={{
                  padding: "3px 12px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: 800,
                  background: popupStep === 1 ? "#2563eb" : "#e2e8f0",
                  color: popupStep === 1 ? "#ffffff" : "#64748b",
                }}
              >
                1. Mã GV (6 số)
              </span>
              <span
                style={{
                  padding: "3px 12px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: 800,
                  background: popupStep === 2 ? "#2563eb" : "#e2e8f0",
                  color: popupStep === 2 ? "#ffffff" : "#64748b",
                }}
              >
                2. Lớp & Tên HS
              </span>
              <span
                style={{
                  padding: "3px 12px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: 800,
                  background: popupStep === 3 ? "#2563eb" : "#e2e8f0",
                  color: popupStep === 3 ? "#ffffff" : "#64748b",
                }}
              >
                3. Mật khẩu
              </span>
            </div>
          </div>

          {/* Khung hướng dẫn Đăng nhập 4 bước thông minh không cần email */}
          <div
            style={{
              background: "#f0fdfa",
              border: "1.5px solid #99f6e4",
              borderRadius: "10px",
              padding: "10px 14px",
              margin: "12px 0 16px 0",
              color: "#134e4a",
              fontSize: "12.5px",
              lineHeight: "1.5",
            }}
          >
            <div style={{ fontWeight: 800, color: "#0f766e", fontSize: "13px", marginBottom: "4px" }}>
              BƯỚC 2: ĐĂNG NHẬP 4 BƯỚC THÔNG MINH (KHÔNG CẦN EMAIL)
            </div>
            <div style={{ fontWeight: 600 }}>
              1. Nhập Mã GV (6 số) ➔ 2. Chọn Lớp ➔ 3. Chọn Tên Học Sinh ➔ 4. Nhập Mật khẩu cá nhân
            </div>
            <div style={{ fontStyle: "italic", fontSize: "11.5px", color: "#0d9488", marginTop: "4px" }}>
              (Lần đầu học sinh tự đặt mật khẩu; Giáo viên có thể reset mật khẩu bất kỳ lúc nào nếu học sinh quên)
            </div>
          </div>

          {/* BƯỚC 1: NHẬP MÃ GIÁO VIÊN (6 SỐ) */}
          {popupStep === 1 && (
            <form onSubmit={handleVerifyTeacherCode} style={{ animation: "fadeIn 0.25s ease-out" }}>
              <div className={styles.studentFormGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className={styles.studentFormLabel} style={{ marginBottom: 0 }}>
                    <span>🔑 1. Nhập Mã Giáo Viên (6 số):</span>
                  </label>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: studentInputTeacherCode.length === 6 ? "#16a34a" : "#64748b",
                    }}
                  >
                    {studentInputTeacherCode.length}/6 số
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "center", width: "100%", margin: "4px 0" }}>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={studentInputTeacherCode}
                    onChange={(e) => handleStudentTeacherCodeChange(e.target.value)}
                    className={styles.studentFormInput}
                    required
                    autoFocus
                    style={{
                      fontFamily: "monospace",
                      fontSize: "22px",
                      letterSpacing: "10px",
                      paddingLeft: "10px",
                      fontWeight: 800,
                      textAlign: "center",
                      height: "48px",
                      width: "100%",
                      maxWidth: "380px",
                      boxSizing: "border-box",
                      borderRadius: "12px",
                    }}
                  />
                </div>
                <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#64748b", textAlign: "center" }}>
                  💡 Nhập mã giáo viên gồm đúng 6 chữ số do thầy/cô cung cấp để xác thực và tải danh sách lớp học.
                </p>
              </div>

              {studentLoginError && (
                <div style={{ color: "#ef4444", fontSize: "13px", fontWeight: 700, margin: "10px 0" }}>
                  ⚠️ {studentLoginError}
                </div>
              )}

              <button
                type="submit"
                className={styles.studentSubmitBtn}
                disabled={studentLoginLoading}
              >
                {studentLoginLoading ? "Đang xác thực..." : "Xác thực mã giáo viên ➔"}
              </button>
            </form>
          )}

          {/* BƯỚC 2: CHỌN LỚP VÀ CHỌN TÊN HỌC SINH */}
          {popupStep === 2 && (
            <form onSubmit={handleProceedToPasswordStep} style={{ animation: "fadeIn 0.25s ease-out" }}>
              {/* Thẻ giáo viên phụ trách đã nhận diện */}
              {studentMatchedTeacher && (
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "20px" }}>👨‍🏫</span>
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#166534" }}>
                        {studentMatchedTeacher.fullName}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#15803d" }}>
                        Mã GV: <strong>{studentMatchedTeacher.teacherCode}</strong> • {studentMatchedTeacher.schoolName || "THPT Tuy Đức"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPopupStep(1);
                      setStudentLoginError(null);
                    }}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #86efac",
                      color: "#166534",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Đổi mã GV
                  </button>
                </div>
              )}

              {/* Chọn Lớp Học */}
              <div className={styles.studentFormGroup}>
                <label className={styles.studentFormLabel}>
                  <span>🏫 2. Chọn Lớp Học:</span>
                </label>
                <select
                  value={studentSelectedClassId}
                  onChange={(e) => {
                    setStudentSelectedClassId(e.target.value);
                    setStudentSelectedStudentId("");
                    setStudentInputPassword("");
                    setStudentInputConfirmPassword("");
                  }}
                  className={styles.studentFormSelect}
                  required
                  autoFocus
                >
                  <option value="">-- Chọn lớp học của em --</option>
                  {studentClassesList.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name.toLowerCase().startsWith("lớp") ? cls.name : `Lớp ${cls.name}`} (Khối {cls.grade || "12"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn Tên Học Sinh */}
              <div className={styles.studentFormGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className={styles.studentFormLabel} style={{ marginBottom: 0 }}>
                    <span>👤 3. Chọn Tên Học Sinh:</span>
                  </label>
                  {studentSelectedClassId && (
                    <span style={{ fontSize: "12px", color: popupClassStudents.length > 0 ? "#16a34a" : "#f59e0b", fontWeight: 700 }}>
                      ({popupClassStudents.length} học sinh)
                    </span>
                  )}
                </div>

                <select
                  value={studentSelectedStudentId}
                  onChange={(e) => {
                    setStudentSelectedStudentId(e.target.value);
                    setStudentInputPassword("");
                    setStudentInputConfirmPassword("");
                  }}
                  className={styles.studentFormSelect}
                  disabled={!studentSelectedClassId}
                  required
                >
                  <option value="">
                    {studentSelectedClassId ? "-- Chọn tên em trong danh sách --" : "-- Hãy chọn lớp ở trên trước --"}
                  </option>
                  {popupClassStudents.map((std, idx) => (
                    <option key={std.id} value={std.id}>
                      {std.orderNumber || idx + 1}. {std.fullName} {std.dob ? `(${std.dob})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {studentLoginError && (
                <div style={{ color: "#ef4444", fontSize: "13px", fontWeight: 700, margin: "10px 0" }}>
                  ⚠️ {studentLoginError}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setPopupStep(1);
                    setStudentLoginError(null);
                  }}
                  style={{
                    height: "46px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ◀ Quay lại
                </button>

                <button
                  type="submit"
                  className={styles.studentSubmitBtn}
                  style={{ height: "46px" }}
                >
                  Tiếp tục ➔
                </button>
              </div>
            </form>
          )}

          {/* BƯỚC 3: MẬT KHẨU LẦN ĐẦU / MẬT KHẨU ĐÃ LƯU & VÀO TRANG CÁ NHÂN */}
          {popupStep === 3 && popupSelectedStudent && (
            <form onSubmit={handlePopupStudentLogin} style={{ animation: "fadeIn 0.25s ease-out" }}>
              {/* Thẻ học sinh đã chọn */}
              <div
                style={{
                  background: "#eff6ff",
                  border: "1.5px solid #bfdbfe",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "15px",
                    }}
                  >
                    {popupSelectedStudent.fullName.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#1e3a8a" }}>
                      {popupSelectedStudent.fullName}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Lớp {studentClassesList.find((c) => c.id === studentSelectedClassId)?.name} • GV: {studentMatchedTeacher?.fullName}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPopupStep(2);
                    setStudentLoginError(null);
                  }}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #93c5fd",
                    color: "#1d4ed8",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Đổi học sinh
                </button>
              </div>

              {!popupStudentHasPassword ? (
                /* TRƯỜNG HỢP 1: LẦN ĐẦU TIÊN - ĐẶT MẬT KHẨU LẦN ĐẦU & XÁC NHẬN */
                <>
                  <div className={styles.studentFirstTimeAlert}>
                    <span style={{ fontSize: "18px" }}>💡</span>
                    <div>
                      <strong>Nhập mật khẩu lần đầu:</strong> Em hãy đặt mật khẩu lần đầu (tối thiểu 4 ký tự) và ghi nhớ để đăng nhập các lần sau!
                    </div>
                  </div>

                  <div className={styles.studentFormGroup}>
                    <label className={styles.studentFormLabel}>
                      <span>🔐 Đặt Mật Khẩu Lần Đầu:</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Nhập mật khẩu của em (tối thiểu 4 ký tự)..."
                      value={studentInputPassword}
                      onChange={(e) => setStudentInputPassword(e.target.value)}
                      className={styles.studentFormInput}
                      required
                      autoFocus
                    />
                  </div>

                  <div className={styles.studentFormGroup}>
                    <label className={styles.studentFormLabel}>
                      <span>🔐 Xác Nhận Lại Mật Khẩu:</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Nhập lại mật khẩu để xác nhận..."
                      value={studentInputConfirmPassword}
                      onChange={(e) => setStudentInputConfirmPassword(e.target.value)}
                      className={styles.studentFormInput}
                      required
                    />
                  </div>
                </>
              ) : (
                /* TRƯỜNG HỢP 2: HỌC SINH ĐÃ CÓ MẬT KHẨU - BẮT BUỘC NHẬP MẬT KHẨU ĐỂ ĐĂNG NHẬP */
                <>
                  <div className={styles.studentExistingAlert}>
                    <span style={{ fontSize: "16px" }}>🔐</span>
                    <div>
                      <strong>Cần nhập mật khẩu:</strong> Vui lòng nhập mật khẩu học sinh đã đặt để đăng nhập vào trang học tập.
                    </div>
                  </div>

                  <div className={styles.studentFormGroup}>
                    <label className={styles.studentFormLabel}>
                      <span>🔐 Mật Khẩu Học Sinh:</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Nhập mật khẩu học sinh của em..."
                      value={studentInputPassword}
                      onChange={(e) => setStudentInputPassword(e.target.value)}
                      className={styles.studentFormInput}
                      required
                      autoFocus
                    />
                  </div>
                </>
              )}

              {studentLoginError && (
                <div style={{ color: "#ef4444", fontSize: "13px", fontWeight: 700, margin: "10px 0" }}>
                  ⚠️ {studentLoginError}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setPopupStep(2);
                    setStudentLoginError(null);
                  }}
                  style={{
                    height: "48px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "12px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ◀ Chọn lại HS
                </button>

                <button
                  type="submit"
                  className={styles.studentSubmitBtn}
                  disabled={studentLoginLoading}
                >
                  {studentLoginLoading
                    ? "Đang xác thực..."
                    : !popupStudentHasPassword
                      ? "LƯU MẬT KHẨU & VÀO HỌC 🚀"
                      : "ĐĂNG NHẬP VÀO HỌC 🚀"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )}

    {/* =========================================================
          POPUP MODAL: KHO TÀI LIỆU ÔN THI 12 (CHỈ HIỂN THỊ KHI ẤN NÚT Ở HÌNH 2)
      ========================================================= */}
    {showDocLibraryModal && (
      <div
        className={styles.modalOverlay}
        onClick={() => setShowDocLibraryModal(false)}
      >
        <div
          className={styles.docLibraryModalBox}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={styles.modalClose}
            onClick={() => setShowDocLibraryModal(false)}
            title="Đóng Kho Tài Liệu"
          >
            ✕
          </button>

          <div className={styles.docLibraryHeader}>
            <span className={styles.sectionTag}>📚 KHO TÀI LIỆU ÔN & LUYỆN THI 12</span>
            <h2 className={styles.sectionHeading} style={{ marginTop: 8 }}>
              Kho Tài Liệu Ôn & Luyện Thi 12 Trọng Tâm Điểm 9+ (PDF) 📖
            </h2>
            <p className={styles.sectionSub}>
              Tuyển tập sổ tay Casio, sơ đồ tư duy, công thức giải nhanh và chuyên đề Vận dụng cao lớp 12 chuẩn cấu trúc mới nhất.
            </p>
          </div>

          {/* Thanh công cụ tìm kiếm và lọc môn học */}
          <div className={styles.docModalToolbar}>
            <input
              type="text"
              placeholder="🔍 Tìm kiếm tài liệu, chuyên đề, dạng bài tập..."
              value={docModalSearch}
              onChange={(e) => setDocModalSearch(e.target.value)}
              className={styles.docModalSearchInput}
            />

            <div className={styles.docModalSubjectPills}>
              {subjects.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  className={`${styles.docModalSubjectPill} ${docModalSubject === sub.id ? styles.docModalSubjectPillActive : ""}`}
                  onClick={() => setDocModalSubject(sub.id)}
                >
                  <span>{sub.icon}</span> {sub.name}
                </button>
              ))}
            </div>
          </div>

          {/* Lưới các thẻ tài liệu (Đúng chuẩn mẫu hình 1) */}
          <div className={styles.docGrid}>
            {modalFilteredDocuments.length > 0 ? (
              modalFilteredDocuments.map((doc) => (
                <div key={doc.id} className={styles.docCard}>
                  <div>
                    <div className={styles.docMetaRow}>
                      <span className={styles.docFormatBadge}>
                        📄 {doc.format} • {doc.size}
                      </span>
                      <span className={styles.docSubjectBadge}>{doc.subjectName}</span>
                      <span
                        style={{
                          background: "#fef3c7",
                          color: "#b45309",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          display: "inline-block",
                        }}
                      >
                        🎯 Ôn thi 12
                      </span>
                    </div>

                    <h3 className={styles.docTitle}>{doc.title}</h3>
                    <p className={styles.docDesc}>{doc.description}</p>
                  </div>

                  <div className={styles.docFooter}>
                    <div className={styles.docStats}>
                      <span>📥 {doc.downloads} lượt tải</span>
                      <span style={{ color: "#10b981", fontWeight: 700 }}>Miễn phí 100%</span>
                    </div>

                    <div className={styles.docActionBtns}>
                      <button
                        type="button"
                        className={styles.docViewBtn}
                        onClick={() => setViewingDoc(doc)}
                        title="Xem trước nội dung chi tiết của tài liệu"
                      >
                        <span>👁️</span> Xem
                      </button>
                      <button
                        type="button"
                        className={styles.docDownloadBtn}
                        onClick={() => handleDownloadDoc(doc)}
                        title="Tải file PDF trực tiếp về máy"
                      >
                        <span>📥</span> Tải Tài Liệu
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", gridColumn: "1 / -1", padding: "40px 20px", color: "#64748b" }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>🔍</div>
                <div style={{ fontSize: "16px", fontWeight: 700 }}>Không tìm thấy tài liệu phù hợp</div>
                <div style={{ fontSize: "13px", marginTop: "4px" }}>Vui lòng chọn môn khác hoặc đổi từ khóa tìm kiếm.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* =========================================================
          POPUP MODAL: TRÌNH XEM CHI TIẾT TÀI LIỆU PDF TRỰC TUYẾN
      ========================================================= */}
    {viewingDoc && (
      <div
        className={styles.modalOverlay}
        style={{ zIndex: 10001 }}
        onClick={() => setViewingDoc(null)}
      >
        <div
          className={styles.docPreviewModalBox}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={styles.modalClose}
            onClick={() => setViewingDoc(null)}
            title="Đóng xem tài liệu"
          >
            ✕
          </button>

          <div className={styles.docPreviewHeader}>
            <div className={styles.docPreviewIcon}>📕</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                <span className={styles.docFormatBadge}>
                  📄 {viewingDoc.format} • {viewingDoc.size}
                </span>
                <span className={styles.docSubjectBadge}>{viewingDoc.subjectName}</span>
              </div>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>
                {viewingDoc.title}
              </h3>
              <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px" }}>
                Biên soạn: <strong>{viewingDoc.uploader || "Tổ Chuyên Môn THPT Tuy Đức"}</strong> • 📥 {viewingDoc.downloads} lượt tải
              </div>
            </div>
          </div>

          {/* Nội dung xem tài liệu chuyên sâu */}
          <div className={styles.docPreviewContentBox}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, color: "#1e40af", marginBottom: "10px", fontSize: "15px" }}>
              <span>🎯</span> TỔNG QUAN CHUYÊN ĐỀ & MỤC TIÊU ĐIỂM 9+
            </div>
            <p style={{ margin: "0 0 14px 0", lineHeight: 1.6 }}>
              {viewingDoc.description || "Tài liệu hệ thống hóa toàn bộ kiến thức trọng tâm, công thức giải nhanh và sơ đồ tư duy phương pháp giải chuẩn format Bộ Giáo Dục & Đào Tạo."}
            </p>

            <div style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "14px 16px", marginBottom: "14px" }}>
              <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>⚡</span> BẢNG CÔNG THỨC & MẸO BẤM MÁY CASIO:
              </div>
              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13.5px", color: "#334155", lineHeight: 1.6 }}>
                <li>Công thức then chốt giúp tối ưu 100% thời gian xử lý các câu phân hóa mức 3 và mức 4.</li>
                <li>Kỹ thuật loại trừ 2 phương án nhiễu ngay từ bước đọc đề trong vòng 10 giây.</li>
                <li>Trình tự bấm phím Casio 580VNX/880BTG cho bài toán tích hợp thực tế.</li>
                <li>Phân tích ma trận đề thi các năm gần nhất của trường THPT Tuy Đức và Bộ GD&ĐT.</li>
              </ul>
            </div>

            {viewingDoc.fileUrl && !viewingDoc.fileUrl.includes("dummy.pdf") && (
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>
                  📄 Bản xem PDF trực tiếp từ hệ thống:
                </div>
                <iframe
                  src={viewingDoc.fileUrl}
                  width="100%"
                  height="420px"
                  style={{ border: "1.5px solid #cbd5e1", borderRadius: "10px" }}
                  title={viewingDoc.title}
                />
              </div>
            )}
          </div>

          {/* Chân trang modal xem */}
          <div className={styles.docPreviewFooter}>
            <div style={{ fontSize: "13px", color: "#16a34a", fontWeight: 700 }}>
              ✓ Bản quyền học tập THPT Tuy Đức - Miễn phí 100%
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className={styles.docDownloadBtn}
                onClick={() => handleDownloadDoc(viewingDoc)}
                style={{ padding: "10px 20px", fontSize: "14px" }}
              >
                <span>📥</span> Tải Xuống Tài Liệu PDF
              </button>
              <button
                type="button"
                className={styles.docViewBtn}
                onClick={() => window.print()}
              >
                <span>🖨️</span> In / Lưu PDF
              </button>
              <button
                type="button"
                className={styles.docViewBtn}
                onClick={() => setViewingDoc(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Nút Cuộn Lên Đầu Trang Bắt Mắt */}
    {showBackToTop && (
      <button
        type="button"
        className={styles.backToTopBtn}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        title="Cuộn lên đầu trang"
        aria-label="Cuộn lên đầu trang"
      >
        <span className={styles.backToTopArrow}>↑</span>
        <span className={styles.backToTopLabel}>Đầu trang</span>
      </button>
    )}
  </div>
);
}
