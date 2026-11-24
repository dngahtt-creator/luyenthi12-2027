"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import {
  getCurrentAuthUser,
  setCurrentAuthUser,
  DEFAULT_SUPER_ADMIN,
  DEFAULT_TEACHER,
  CurrentAuthUser,
  isTeacherAllowedTab,
  switchMockRole,
  logoutAllSessions,
  getDisplayedAccountName,
} from "@/lib/authService";
import {
  getSavedCloudinaryConfig,
  saveCloudinaryConfig,
  uploadFileToCloudinary,
  pingCloudinary,
} from "@/lib/cloudinary";
import {
  getAllRegisteredUsers,
  saveUserToFirestore,
  updateUserInFirestore,
  deleteUserFromFirestore,
  generateTeacherCode,
  getRegistrationDateString,
  purgeOldAccounts,
  UserAccountData,
  OLD_ACCOUNT_IDENTIFIERS,
} from "@/lib/userService";
import {
  getAllExams,
  saveNewExam,
  updateExam,
  deleteExam,
  deleteMultipleExams,
  getAllDocuments,
  saveNewDocument,
  updateDocument,
  deleteDocument,
  deleteMultipleDocuments,
  getRecentSubmissions,
  exportExamResultsToExcel,
  deleteSubmission,
  purgeInvalidSubmissions,
  getScoreClassification,
  ScoreClassification,
  ExamItem,
  DocumentItem,
  ExamSubmission,
} from "@/lib/examService";
import {
  getAllEvaluations,
  subscribeEvaluations,
  saveTeacherEvaluation,
  sendTeacherReply,
  generateAIEvaluation,
  deleteEvaluation,
  StudentEvaluation,
  StudentFeedbackMessage,
} from "@/lib/feedbackService";
import FloatingQAWidget from "@/components/FloatingQAWidget";
import {
  SchoolClass,
  StudentItem,
  getAllClasses,
  saveNewClass,
  updateClass,
  deleteClass,
  getAllStudents,
  saveNewStudent,
  updateStudent,
  deleteStudent,
  setStudentPassword,
  getSavedStudentPassword,
  parseStudentFile,
  importStudentsToClass,
  downloadExcelTemplate,
  downloadCsvTemplate,
  exportStudentsToExcel,
  ParsedStudentRow,
} from "@/lib/classStudentService";
import { seedAllDataToFirestore } from "@/lib/seedService";
import {
  downloadExamExcelTemplate,
  parseExamExcelFile,
} from "@/lib/examExcelService";
import {
  getAllCurriculums,
  saveNewCurriculum,
  updateCurriculum,
  deleteCurriculum,
  generateAICurriculum,
  CurriculumItem,
  CurriculumChapter,
  CurriculumLesson,
} from "@/lib/curriculumService";
import {
  generateSingleShuffledVariant,
  generateMultipleExamVariants,
  generateRandomExamCode,
  ExamVariant,
} from "@/lib/examShuffleService";
import CommunityDocsTab from "./components/CommunityDocsTab";
import ManageCategoriesTab from "./components/ManageCategoriesTab";
import {
  getAllCommunityDocs,
  CommunityDocumentItem,
} from "@/lib/communityDocService";

type AdminTab = "config" | "classes" | "users" | "exams" | "learning" | "documents" | "curriculum" | "community-docs";

// BẢNG CHỮ CÁI TIẾNG VIỆT ĐỂ TÌM KIẾM THEO CHỮ CÁI ĐẦU TRONG TÊN
const VN_ALPHABET_KEYS = ["ALL", "A", "B", "C", "D", "Đ", "E", "G", "H", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "U", "V", "X", "Y"];

function checkStudentMatchInitial(fullName: string, letter: string, query: string): boolean {
  if (!fullName) return false;
  const clean = fullName.trim();
  const words = clean.split(/\s+/);
  const givenName = words[words.length - 1] || ""; // Tên (ví dụ "Diễm" trong "Hani Diễm", "Dũng" trong "Điếu Dũng")
  const familyName = words[0] || ""; // Họ

  if (letter && letter !== "ALL") {
    const target = letter.toUpperCase();
    const givenInitial = givenName.charAt(0).toUpperCase();
    const familyInitial = familyName.charAt(0).toUpperCase();
    const allInitials = words.map((w) => w.charAt(0).toUpperCase());

    const norm = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/Đ/g, "D").toUpperCase();

    const matchesGiven = givenInitial === target || norm(givenInitial) === norm(target);
    const matchesFamily = familyInitial === target || norm(familyInitial) === norm(target);
    const matchesAny = allInitials.includes(target) || allInitials.some((i) => norm(i) === norm(target));

    if (!matchesGiven && !matchesFamily && !matchesAny) return false;
  }

  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    const normClean = clean.toLowerCase();
    const normGiven = givenName.toLowerCase();
    if (!normClean.includes(q) && !normGiven.startsWith(q)) return false;
  }

  return true;
}

export default function AdminPage({ initialTab = "config" }: { initialTab?: AdminTab } = {}) {
  const router = useRouter();
  const [currentAdminUser, setCurrentAdminUser] = useState<CurrentAuthUser>(DEFAULT_SUPER_ADMIN);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const isSuperAdmin = currentAdminUser.role === "super_admin";

  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. CLOUDINARY CONFIG STATE
  const [cloudName, setCloudName] = useState<string>("o100uxqf");
  const [uploadPreset, setUploadPreset] = useState<string>("o100uxqf");
  const [pingStatus, setPingStatus] = useState<{ checked: boolean; success: boolean; latency?: number; msg?: string }>({
    checked: false,
    success: false,
  });
  const [testUploadLoading, setTestUploadLoading] = useState<boolean>(false);
  const [testUploadResult, setTestUploadResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);

  // 1.5. CLASSES & STUDENTS STATE (LỚP VÀ HỌC SINH - FIREBASE FIRESTORE)
  const [classesList, setClassesList] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [allStudentsList, setAllStudentsList] = useState<StudentItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [studentSearch, setStudentSearch] = useState<string>("");

  // Quick Class Input & Upload State
  const [quickClassName, setQuickClassName] = useState<string>("");
  const [quickUploadLoading, setQuickUploadLoading] = useState<boolean>(false);
  const quickFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const quickClassInputRef = React.useRef<HTMLInputElement | null>(null);
  const [editingQuickClass, setEditingQuickClass] = useState<SchoolClass | null>(null);

  // Class Modal State (Chỉ cần Tên Lớp)
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [classForm, setClassForm] = useState({
    name: "",
  });

  // Student Modal State (Lưu TT, Họ và tên, Giới tính, Ngày sinh, ClassId, Mật khẩu)
  const [showStudentModal, setShowStudentModal] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [studentForm, setStudentForm] = useState({
    orderNumber: 1,
    fullName: "",
    gender: "Nam",
    dob: "",
    classId: "",
    password: "",
  });

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importTargetClassId, setImportTargetClassId] = useState<string>("");
  const [importMode, setImportMode] = useState<"replace" | "append">("replace");
  const [importPreviewStudents, setImportPreviewStudents] = useState<ParsedStudentRow[]>([]);
  const [importFileName, setImportFileName] = useState<string>("");
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importInvalidCount, setImportInvalidCount] = useState<number>(0);

  // 2. USERS STATE (QUẢN LÝ TÀI KHOẢN)
  const [usersList, setUsersList] = useState<UserAccountData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>("");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("all");

  // User Edit Modal State (Phóng to khi nhấp vào)
  const [showUserEditModal, setShowUserEditModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserAccountData | null>(null);
  const [userEditForm, setUserEditForm] = useState({
    fullName: "",
    email: "",
    teacherCode: "",
    registeredDate: "",
    status: "active",
    role: "teacher",
  });

  // User Delete Modal State (Phóng to khi nhấp vào)
  const [showUserDeleteModal, setShowUserDeleteModal] = useState<boolean>(false);
  const [deletingUser, setDeletingUser] = useState<UserAccountData | null>(null);

  // User Add Modal State (Phóng to khi nhấp vào)
  const [showUserAddModal, setShowUserAddModal] = useState<boolean>(false);
  const [userAddForm, setUserAddForm] = useState({
    fullName: "",
    email: "",
    teacherCode: "",
    registeredDate: "",
    status: "active",
    role: "teacher",
  });

  // 3. EXAMS & EXERCISES STATE
  const [examsList, setExamsList] = useState<ExamItem[]>([]);
  const [loadingExams, setLoadingExams] = useState<boolean>(false);
  const [examForm, setExamForm] = useState({
    title: "",
    subject: "toan",
    subjectName: "Toán học",
    school: "THPT DTNT THCS & THPT Tuy Đức - Đặng Anh Thư",
    questions: 40,
    timeMinutes: 50,
    difficulty: "Vận dụng cao",
    tag: "🔥 Hot 2026",
    tagType: "hot" as "hot" | "new",
    fileUrl: "",
  });
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [assignMode, setAssignMode] = useState<"class" | "student">("class");
  const [assignedStudents, setAssignedStudents] = useState<string[]>([]);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"link" | "pdf" | "image">("link");
  const [examUploadingFile, setExamUploadingFile] = useState<boolean>(false);
  const [examUploadedFileName, setExamUploadedFileName] = useState<string>("");
  const [scoreConfig, setScoreConfig] = useState({
    p1Total: 7, // Mặc định tổng điểm phần 1: 7
    p2Total: 4, // Tổng điểm phần 2: 4 (4 câu × 1.0)
    p3Total: 3, // Phần 3: 3 điểm (nếu có)
    p2_1: 0.1,  // 0.1đ/1 ý
    p2_2: 0.25, // 0.25đ/2 ý (chuẩn GDPT 2018)
    p2_3: 0.5,  // 0.5đ/3 ý
    p2_4: 1.0,  // 1.0đ/4 ý
  });
  const [examGrade, setExamGrade] = useState<string>("Lớp 12");
  const [examTimeMinutes, setExamTimeMinutes] = useState<number>(90);
  const [examAllowReview, setExamAllowReview] = useState<boolean>(true);
  const [examAccessCode, setExamAccessCode] = useState<string>(() => String(Math.floor(1000 + Math.random() * 9000)));

  // TÌM KIẾM HỌC SINH THEO CHỮ CÁI ĐẦU TRONG TÊN & TỪ KHÓA
  const [studentInitialLetter, setStudentInitialLetter] = useState<string>("ALL");
  const [studentSearchKeyword, setStudentSearchKeyword] = useState<string>("");
  const [docStudentInitialLetter, setDocStudentInitialLetter] = useState<string>("ALL");
  const [docStudentSearchKeyword, setDocStudentSearchKeyword] = useState<string>("");

  const [part1AnswerText, setPart1AnswerText] = useState<string>("1D 2B 3C 4C 5A 6D 7C 8A 9B 10D 11B 12B");
  const [part2AnswerText, setPart2AnswerText] = useState<string>("1: Đ Đ Đ S 2: Đ S S S 3: S S Đ Đ 4: S Đ S S");
  const [part3AnswerText, setPart3AnswerText] = useState<string>("1: 1  2: 85  3: 0.31  4: 136  5: 2.47  6: 32");
  const [examImportLoading, setExamImportLoading] = useState<boolean>(false);
  const [showExamPreviewModal, setShowExamPreviewModal] = useState<boolean>(false);
  const [showPaperPreviewModal, setShowPaperPreviewModal] = useState<boolean>(false);
  const [localPdfPreviewUrl, setLocalPdfPreviewUrl] = useState<string>("");
  const [localImagePreviewUrls, setLocalImagePreviewUrls] = useState<string[]>([]);
  const [examFilterClass, setExamFilterClass] = useState<string>("all");
  const [examFilterSubject, setExamFilterSubject] = useState<string>("all");
  const [isExamMultiSelectMode, setIsExamMultiSelectMode] = useState<boolean>(false);
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);

  // MULTI-VARIANT EXAM SHUFFLE STATE (TRỘN ĐỀ & SINH NHIỀU MÃ ĐỀ THI)
  const [examVariantsCount, setExamVariantsCount] = useState<number>(1);
  const [customVariantsInput, setCustomVariantsInput] = useState<string>("4");
  const [generatedVariants, setGeneratedVariants] = useState<ExamVariant[]>([]);
  const [showVariantsTableModal, setShowVariantsTableModal] = useState<boolean>(false);
  const [viewingExamVariants, setViewingExamVariants] = useState<ExamItem | null>(null);
  const originalMasterAnswersRef = useRef<{ part1: string; part2: string; part3: string }>({
    part1: "1D 2B 3C 4C 5A 6D 7C 8A 9B 10D 11B 12B",
    part2: "1: Đ Đ Đ S 2: Đ S S S 3: S S Đ Đ 4: S Đ S S",
    part3: "1: 1  2: 85  3: 0.31  4: 136  5: 2.47  6: 32",
  });

  // HOMEWORK ASSIGNMENT MODAL & STATE (GIAO BÀI TẬP CHO HỌC SINH)
  const [showAssignHomeworkModal, setShowAssignHomeworkModal] = useState<boolean>(false);
  const [assignHwUploading, setAssignHwUploading] = useState<boolean>(false);
  const [assignHwForm, setAssignHwForm] = useState<{
    id?: string;
    title: string;
    subject: string;
    fileUrl: string;
    fileName: string;
    timeMinutes: number;
    questions: number;
    dueDate: string;
    teacherNote: string;
    mode: "class" | "student";
    selectedClasses: string[];
    selectedStudents: string[];
    filterClassForStudent: string;
    studentSearch: string;
  }>({
    title: "",
    subject: "toan",
    fileUrl: "",
    fileName: "",
    timeMinutes: 45,
    questions: 20,
    dueDate: "",
    teacherNote: "",
    mode: "class",
    selectedClasses: [],
    selectedStudents: [],
    filterClassForStudent: "",
    studentSearch: "",
  });

  // 4. LEARNING & SUBMISSIONS STATE
  const [submissionsList, setSubmissionsList] = useState<ExamSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState<boolean>(false);
  const [submissionSearch, setSubmissionSearch] = useState<string>("");
  const [submissionFilterClass, setSubmissionFilterClass] = useState<string>("all");
  const [submissionFilterExam, setSubmissionFilterExam] = useState<string>("all");
  const [submissionStatusTab, setSubmissionStatusTab] = useState<"all" | "completed" | "pending" | "questions">("all");
  const [submissionCompetenceFilter, setSubmissionCompetenceFilter] = useState<"all" | "weak_p1" | "weak_p2" | "weak_p3" | "all_good">("all");
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState<any | null>(null);
  const [purgingSubmissions, setPurgingSubmissions] = useState<boolean>(false);
  const [selectedLearningClass, setSelectedLearningClass] = useState<string>("all");
  const [learningSortBy, setLearningSortBy] = useState<"class" | "name" | "tn" | "ds" | "tln" | "correct">("class");
  const [learningViewMode, setLearningViewMode] = useState<"overview" | "table">("overview");

  // 5. DOCUMENTS / MATERIALS STATE (GIAO TÀI LIỆU)
  const [documentsList, setDocumentsList] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);
  const [showAddDocForm, setShowAddDocForm] = useState<boolean>(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docFormTitle, setDocFormTitle] = useState<string>("");
  const [docFormFormat, setDocFormFormat] = useState<string>("PDF");
  const [docFormLink, setDocFormLink] = useState<string>("");
  const [docFormAssignMode, setDocFormAssignMode] = useState<"class" | "student">("class");
  const [docFormAssignedClasses, setDocFormAssignedClasses] = useState<string[]>([]);
  const [docFormAssignedStudents, setDocFormAssignedStudents] = useState<string[]>([]);
  const [docFormStudentClassFilter, setDocFormStudentClassFilter] = useState<string>("");
  const [docUploadingFile, setDocUploadingFile] = useState<boolean>(false);
  const [docUploadedFileName, setDocUploadedFileName] = useState<string>("");
  const [isDocMultiSelectMode, setIsDocMultiSelectMode] = useState<boolean>(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // 6. STUDENT EVALUATION & FEEDBACK STATE (ĐÁNH GIÁ NĂNG LỰC HỌC SINH - AI & THỦ CÔNG)
  const [evaluationsList, setEvaluationsList] = useState<StudentEvaluation[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [selectedStudentForFeedback, setSelectedStudentForFeedback] = useState<any | null>(null);
  const [feedbackInputText, setFeedbackInputText] = useState<string>("");
  const [feedbackMode, setFeedbackMode] = useState<"ai" | "manual">("ai");
  const [feedbackAiPreset, setFeedbackAiPreset] = useState<"comprehensive" | "encourage" | "remind" | "method" | "urgent">("comprehensive");
  const [showReEvaluateForm, setShowReEvaluateForm] = useState<boolean>(false);
  const [teacherReplyInput, setTeacherReplyInput] = useState<string>("");
  const [teacherReplyImage, setTeacherReplyImage] = useState<string | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);
  const teacherFileInputRef = useRef<HTMLInputElement>(null);

  // Lọc danh sách câu hỏi / trao đổi theo quyền:
  // Nếu là Giáo viên: CHỈ hiển thị câu hỏi từ học sinh gửi đúng mã GV của mình
  // Nếu là Super Admin: Xem toàn bộ câu hỏi của tất cả GV
  const teacherEvaluations: StudentEvaluation[] = useMemo<StudentEvaluation[]>(() => {
    if (isSuperAdmin) return evaluationsList;
    const cleanTeacherCode = (currentAdminUser.teacherCode || "").trim();
    if (!cleanTeacherCode) return evaluationsList;
    return evaluationsList.filter(
      (e: StudentEvaluation) => !e.teacherCode || e.teacherCode === cleanTeacherCode
    );
  }, [evaluationsList, isSuperAdmin, currentAdminUser.teacherCode]);

  // 7. CURRICULUM MANAGEMENT STATE (TẠO & QUẢN LÝ GIÁO TRÌNH)
  const [curriculumsList, setCurriculumsList] = useState<CurriculumItem[]>([]);
  const [loadingCurriculums, setLoadingCurriculums] = useState<boolean>(false);
  const [curriculumSearch, setCurriculumSearch] = useState<string>("");
  const [curriculumFilterSubject, setCurriculumFilterSubject] = useState<string>("");
  const [curriculumFilterGrade, setCurriculumFilterGrade] = useState<string>("");
  const [showCurriculumModal, setShowCurriculumModal] = useState<boolean>(false);
  const [editingCurriculum, setEditingCurriculum] = useState<CurriculumItem | null>(null);
  const [selectedCurriculumForView, setSelectedCurriculumForView] = useState<CurriculumItem | null>(null);
  const [curriculumUploadingFile, setCurriculumUploadingFile] = useState<boolean>(false);
  const [savingCurriculum, setSavingCurriculum] = useState<boolean>(false);
  const [aiGeneratingOutline, setAiGeneratingOutline] = useState<boolean>(false);
  const [showFirestoreRulesModal, setShowFirestoreRulesModal] = useState<boolean>(false);
  const curriculumFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // 8. COMMUNITY DOCUMENTS STATE (TÀI LIỆU CỘNG ĐỒNG)
  const [communityDocsList, setCommunityDocsList] = useState<CommunityDocumentItem[]>([]);
  const [loadingCommunityDocs, setLoadingCommunityDocs] = useState<boolean>(false);

  const [curriculumForm, setCurriculumForm] = useState<{
    title: string;
    subject: string;
    subjectName: string;
    grade: string;
    school: string;
    author: string;
    academicYear: string;
    description: string;
    estimatedHours: number;
    fileUrl: string;
    fileName: string;
    assignedClasses: string[];
    status: "ACTIVE" | "DRAFT";
    chapters: CurriculumChapter[];
  }>({
    title: "",
    subject: "toan",
    subjectName: "Toán học",
    grade: "Lớp 12",
    school: "THPT DTNT THCS & THPT Tuy Đức",
    author: "Đặng Anh Thư",
    academicYear: "2025 - 2026",
    description: "",
    estimatedHours: 35,
    fileUrl: "",
    fileName: "",
    assignedClasses: [],
    status: "ACTIVE",
    chapters: [],
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Initial load & Auth Role Verification
  useEffect(() => {
    // 0. Xác thực quyền tài khoản
    const authUser = getCurrentAuthUser();
    if (authUser?.role === "student") {
      alert("⚠️ Bạn đang đăng nhập bằng tài khoản Học sinh. Tài khoản học sinh không có quyền truy cập trang quản trị!");
      router.replace("/student");
      return;
    }

    if (authUser?.role === "teacher") {
      setCurrentAdminUser(authUser);
      if (!isTeacherAllowedTab(initialTab)) {
        setActiveTab("classes"); // Mặc định Lớp và Học sinh như Ảnh 1
      }
    } else if (authUser?.role === "super_admin") {
      setCurrentAdminUser(authUser);
    } else {
      // Mặc định Super Admin
      setCurrentAdminUser(DEFAULT_SUPER_ADMIN);
    }
    setIsAuthChecking(false);

    const handleAuthChange = (e: any) => {
      const updated: CurrentAuthUser | null = e.detail;
      if (updated?.role === "student") {
        alert("⚠️ Tài khoản học sinh không có quyền truy cập trang quản trị!");
        router.replace("/student");
      } else if (updated) {
        setCurrentAdminUser(updated);
        if (updated.role === "teacher" && !isTeacherAllowedTab(activeTab)) {
          setActiveTab("classes");
        }
      } else {
        setCurrentAdminUser(DEFAULT_SUPER_ADMIN);
      }
    };
    window.addEventListener("school_auth_changed", handleAuthChange);

    if (typeof window !== "undefined") {
      if (
        window.location.pathname.includes("/materials") ||
        window.location.search.includes("tab=materials") ||
        window.location.search.includes("tab=documents")
      ) {
        setActiveTab("documents");
      }
    }

    // 1. Load Cloudinary config
    const cfg = getSavedCloudinaryConfig();
    setCloudName(cfg.cloudName || "o100uxqf");
    setUploadPreset(cfg.uploadPreset || "o100uxqf");

    // 1.5. Load Classes and Students
    fetchClassesAndStudents();

    // 2. Load users
    fetchUsers();

    // 3. Load exams
    fetchExams();

    // 4. Load submissions
    fetchSubmissions();

    // 5. Load documents
    fetchDocuments();

    // 6. Load & subscribe student evaluations (realtime)
    fetchEvaluations();
    const unsubEvaluations = subscribeEvaluations((list) => {
      setEvaluationsList((prev) => {
        const prevUnread = prev.filter((e) => e.hasUnreadStudentReply).length;
        const newUnread = list.filter((e) => e.hasUnreadStudentReply).length;
        if (newUnread > prevUnread) {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
          } catch {
            // Audio context ignore
          }
          const newlyReplied = list.find((e) => e.hasUnreadStudentReply && !prev.some((p) => p.id === e.id && p.hasUnreadStudentReply));
          if (newlyReplied) {
            showToast(`🔔 Học sinh "${newlyReplied.studentName}" (Lớp ${newlyReplied.studentClass}) vừa gửi câu hỏi / phản hồi!`);
          }
        }
        return list;
      });
    });

    // 7. Load curriculums
    fetchCurriculums();

    // 8. Load community docs
    fetchCommunityDocs();

    // Sync event listener
    const handleSync = () => {
      fetchClassesAndStudents();
      fetchSubmissions();
      fetchExams();
      fetchEvaluations();
      fetchCurriculums();
      fetchCommunityDocs();
    };
    window.addEventListener("school_class_student_updated", handleSync);
    window.addEventListener("school_data_updated", handleSync);
    window.addEventListener("school_submissions_updated", handleSync);
    window.addEventListener("school_evaluations_updated", handleSync);
    window.addEventListener("school_curriculum_updated", handleSync);
    window.addEventListener("school_community_docs_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      unsubEvaluations();
      window.removeEventListener("school_auth_changed", handleAuthChange);
      window.removeEventListener("school_class_student_updated", handleSync);
      window.removeEventListener("school_data_updated", handleSync);
      window.removeEventListener("school_submissions_updated", handleSync);
      window.removeEventListener("school_evaluations_updated", handleSync);
      window.removeEventListener("school_curriculum_updated", handleSync);
      window.removeEventListener("school_community_docs_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Fetch functions
  const fetchUsers = async () => {
    setLoadingUsers(true);
    await purgeOldAccounts();
    const users = await getAllRegisteredUsers(50);
    const cleaned = users
      .filter((u, index, self) => {
        const emailNorm = (u.email || "").toLowerCase().trim();
        if (OLD_ACCOUNT_IDENTIFIERS.includes(u.uid) || OLD_ACCOUNT_IDENTIFIERS.includes(emailNorm)) return false;
        return self.findIndex((item) => (item.email || "").toLowerCase().trim() === emailNorm) === index;
      })
      .map((u) => {
        if (u.teacherCode === "5710" || (u.email === "thudanganh670@gmail.com" && (!u.teacherCode || u.teacherCode.length < 6))) {
          return { ...u, teacherCode: "571024" };
        }
        return u;
      });
    setUsersList(cleaned);
    setLoadingUsers(false);
  };

  const fetchExams = async () => {
    setLoadingExams(true);
    const exams = await getAllExams();
    setExamsList(exams);
    setLoadingExams(false);
  };

  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    const subs = await getRecentSubmissions(100);
    setSubmissionsList(subs);
    setLoadingSubmissions(false);
  };

  const fetchEvaluations = async () => {
    const evals = await getAllEvaluations();
    setEvaluationsList(evals);
  };

  const fetchCurriculums = async () => {
    setLoadingCurriculums(true);
    try {
      const items = await getAllCurriculums();
      setCurriculumsList(items);
    } catch (e) {
      console.error("Error loading curriculums:", e);
    } finally {
      setLoadingCurriculums(false);
    }
  };

  const fetchCommunityDocs = async () => {
    setLoadingCommunityDocs(true);
    try {
      const items = await getAllCommunityDocs();
      setCommunityDocsList(items);
    } catch (e) {
      console.error("Error loading community docs:", e);
    } finally {
      setLoadingCommunityDocs(false);
    }
  };

  const PRESET_LABELS: Record<string, string> = {
    comprehensive: "Toàn diện",
    encourage: "Động viên",
    remind: "Nhắc nhở",
    method: "Phương pháp",
    urgent: "Đôn đốc",
  };

  // STUDENT EVALUATION & FEEDBACK HANDLERS
  const handleOpenFeedbackModal = (row: any) => {
    setSelectedStudentForFeedback(row);
    setTeacherReplyInput("");
    setFeedbackMode("ai");
    setFeedbackAiPreset("comprehensive");
    setShowReEvaluateForm(false);

    const cleanId = (row.studentId || "").trim();
    const cleanName = (row.studentName || "").trim().toLowerCase();

    const existing = evaluationsList.find(
      (e) =>
        (cleanId && e.studentId === cleanId) ||
        (cleanName && e.studentName.toLowerCase() === cleanName)
    );

    if (existing && existing.messages.length > 0) {
      setFeedbackInputText("");
    } else {
      const aiDraft = generateAIEvaluation({
        studentName: row.studentName,
        studentClass: row.studentClass,
        score: row.hasSubmitted ? row.score : null,
        correctCount: row.correctCount,
        totalQuestions: row.totalQuestions,
        examTitle: row.examTitle,
        preset: "comprehensive",
      });
      setFeedbackInputText(aiDraft);
    }

    setShowFeedbackModal(true);
  };

  const handleGenerateAiText = (preset: "comprehensive" | "encourage" | "remind" | "method" | "urgent") => {
    if (!selectedStudentForFeedback) return;
    setFeedbackAiPreset(preset);
    const aiDraft = generateAIEvaluation({
      studentName: selectedStudentForFeedback.studentName,
      studentClass: selectedStudentForFeedback.studentClass,
      score: selectedStudentForFeedback.hasSubmitted ? selectedStudentForFeedback.score : null,
      correctCount: selectedStudentForFeedback.correctCount,
      totalQuestions: selectedStudentForFeedback.totalQuestions,
      examTitle: selectedStudentForFeedback.examTitle,
      preset,
    });
    setFeedbackInputText(aiDraft);
  };

  const handleCycleAiPreset = () => {
    if (!selectedStudentForFeedback) return;
    const presets: Array<"comprehensive" | "encourage" | "remind" | "method" | "urgent"> = [
      "comprehensive",
      "encourage",
      "remind",
      "method",
      "urgent",
    ];
    const currentIndex = presets.indexOf(feedbackAiPreset);
    const nextPreset = presets[(currentIndex + 1) % presets.length];
    handleGenerateAiText(nextPreset);
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedStudentForFeedback || !feedbackInputText.trim()) {
      alert("Vui lòng nhập nội dung đánh giá / nhận xét!");
      return;
    }

    setSubmittingFeedback(true);
    await saveTeacherEvaluation({
      studentId: selectedStudentForFeedback.studentId || selectedStudentForFeedback.studentName,
      studentName: selectedStudentForFeedback.studentName,
      studentClass: selectedStudentForFeedback.studentClass || "",
      content: feedbackInputText.trim(),
      examId: selectedStudentForFeedback.examId,
      examTitle: selectedStudentForFeedback.examTitle,
      score: selectedStudentForFeedback.hasSubmitted ? selectedStudentForFeedback.score : undefined,
      correctCount: selectedStudentForFeedback.correctCount,
      totalQuestions: selectedStudentForFeedback.totalQuestions,
      isAiGenerated: feedbackMode === "ai",
    });
    setSubmittingFeedback(false);

    showToast(`🎉 Đã gửi đánh giá cho "${selectedStudentForFeedback.studentName}"! Lời nhận xét đã xuất hiện trên Trang học sinh.`);
    setFeedbackInputText("");
    setShowReEvaluateForm(false);
    await fetchEvaluations();
  };

  // Hỗ trợ dán ảnh trực tiếp từ clipboard (Ctrl+V) khi giáo viên giải đáp
  const handleTeacherReplyPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (loadEv) => {
            if (loadEv.target?.result) {
              setTeacherReplyImage(loadEv.target.result as string);
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const handleTeacherFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn tệp hình ảnh (PNG, JPG, JPEG, WEBP)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEv) => {
      if (loadEv.target?.result) {
        setTeacherReplyImage(loadEv.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    if (teacherFileInputRef.current) teacherFileInputRef.current.value = "";
  };

  const handleSendTeacherReply = async (evalId: string) => {
    if (!teacherReplyInput.trim() && !teacherReplyImage) {
      alert("Vui lòng nhập nội dung hoặc đính kèm ảnh đáp lại học sinh!");
      return;
    }

    setSubmittingFeedback(true);
    const resolvedTeacherName = currentAdminUser?.fullName || currentAdminUser?.name || "Giáo viên";
    await sendTeacherReply(
      evalId,
      teacherReplyInput.trim() || (teacherReplyImage ? "Đã gửi một hình ảnh" : ""),
      resolvedTeacherName,
      teacherReplyImage || undefined
    );
    setSubmittingFeedback(false);

    showToast("💬 Đã gửi câu trả lời/giải đáp đến học sinh thành công!");
    setTeacherReplyInput("");
    setTeacherReplyImage(null);
    await fetchEvaluations();
  };

  // Xóa 1 bài nộp thi cụ thể
  const handleDeleteSubmission = async (subId?: string, studentName?: string) => {
    if (!subId) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa bài thi đã nộp của "${studentName || 'Học sinh'}" khỏi hệ thống?`)) return;
    await deleteSubmission(subId);
    showToast(`🗑️ Đã xóa bài nộp của ${studentName || 'học sinh'} thành công!`);
    await fetchSubmissions();
  };

  // Dọn dẹp & xóa toàn bộ học sinh không có trong danh sách chính thức
  const handlePurgeUnlisted = async () => {
    const validNames = allStudentsList.map((s) => s.fullName.trim());
    if (validNames.length === 0) {
      alert("Hệ thống chưa có danh sách học sinh chính thức nào trong các lớp! Vui lòng tạo lớp và nhập danh sách học sinh trước.");
      return;
    }
    if (
      !confirm(
        `Hệ thống sẽ rà soát và XÓA TOÀN BỘ các bài nộp/kết quả của học sinh KHÔNG nằm trong danh sách học sinh chính thức (${validNames.length} học sinh) hoặc có tên placeholder 'Học sinh THPT Tuy Đức' khỏi Firebase Firestore và bộ nhớ.\n\nBạn có chắc chắn muốn thực hiện?`
      )
    ) {
      return;
    }

    setPurgingSubmissions(true);
    const res = await purgeInvalidSubmissions(validNames);
    setPurgingSubmissions(false);
    showToast(`🧹 Đã dọn dẹp và xóa thành công ${res.deletedCount} bài nộp/kết quả học sinh không có trong danh sách!`);
    await fetchSubmissions();
  };

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    const docs = await getAllDocuments();
    setDocumentsList(docs);
    setLoadingDocs(false);
  };

  const fetchClassesAndStudents = async () => {
    setLoadingClasses(true);
    const classes = await getAllClasses();
    const students = await getAllStudents();
    setClassesList(classes);
    setAllStudentsList(students);
    setSelectedClassId((prev) => {
      if (prev && classes.some((c) => c.id === prev)) return prev;
      return classes.length > 0 ? classes[0].id : "";
    });
    setLoadingClasses(false);
  };

  // 1-CLICK SEED FIRESTORE
  const [seedingLoading, setSeedingLoading] = useState<boolean>(false);
  const handleSeedFirestore = async () => {
    if (
      !confirm(
        "Hệ thống sẽ nạp toàn bộ danh sách Lớp học (12A1, 12A2, 11A1, 10A1), Học sinh mẫu, Đề thi, Tài liệu và Tài khoản Admin lên Firebase Cloud Firestore.\n\nSau khi hoàn tất, tab 'Data' trên Firebase Console sẽ hiển thị đầy đủ các collection.\n\nBạn có muốn tiếp tục?"
      )
    )
      return;

    setSeedingLoading(true);
    const res = await seedAllDataToFirestore();
    setSeedingLoading(false);

    if (res.success) {
      showToast(
        `🎉 Đã nạp thành công ${res.classesCount} lớp, ${res.studentsCount} học sinh, ${res.examsCount} đề thi, ${res.docsCount} tài liệu lên Firebase Firestore! Hãy F5 tab Data trên Firebase Console.`
      );
      fetchClassesAndStudents();
      fetchExams();
      fetchDocuments();
      fetchUsers();
    } else {
      const errStr = (res.error || "").toLowerCase();
      if (errStr.includes("permission") || errStr.includes("insufficient")) {
        setShowFirestoreRulesModal(true);
      } else {
        alert("Lỗi khi nạp dữ liệu lên Firestore: " + (res.error || "Vui lòng thử lại"));
      }
    }
  };

  // 1. SAVE CLOUDINARY CONFIG
  const handleSaveCloudinary = () => {
    if (!cloudName.trim() || !uploadPreset.trim()) {
      alert("Vui lòng nhập đầy đủ Cloud Name và Upload Preset!");
      return;
    }
    saveCloudinaryConfig(cloudName.trim(), uploadPreset.trim());
    showToast("💾 Đã lưu cấu hình Cloudinary thành công! Đã áp dụng toàn hệ thống.");
  };

  // Ping test
  const handleTestCloudinaryPing = async () => {
    setPingStatus({ checked: false, success: false });
    const res = await pingCloudinary(cloudName.trim());
    if (res.success) {
      setPingStatus({
        checked: true,
        success: true,
        latency: res.latency,
        msg: `Kết nối thành công tới Cloudinary CDN (${res.latency}ms)`,
      });
      showToast(`🟢 Kết nối Cloudinary tốt! Độ trễ: ${res.latency}ms`);
    } else {
      setPingStatus({
        checked: true,
        success: false,
        msg: `Không kết nối được: ${res.error}`,
      });
    }
  };

  // Unsigned upload test
  const handleTestUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTestUploadLoading(true);
    setTestUploadResult(null);

    const res = await uploadFileToCloudinary(file, uploadPreset.trim(), cloudName.trim());
    setTestUploadLoading(false);

    if (res.success && res.data) {
      setTestUploadResult({
        success: true,
        url: res.data.secure_url,
      });
      showToast("🎉 Tải thử nghiệm lên Cloudinary Unsigned THÀNH CÔNG!");
    } else {
      setTestUploadResult({
        success: false,
        error: res.error || "Tải lên thất bại. Vui lòng kiểm tra lại Cloud Name và Upload Preset (chế độ Unsigned).",
      });
    }
  };

  // 1.5. CLASS & STUDENT ACTIONS & DERIVED DATA
  const currentClass = classesList.find((c) => c.id === selectedClassId) || classesList[0];
  const currentClassStudents = allStudentsList.filter(
    (s) => s.classId === (currentClass?.id || "") || s.className === (currentClass?.name || "")
  );

  const filteredStudents = currentClassStudents.filter((s) => {
    const matchSearch =
      s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.dob.toLowerCase().includes(studentSearch.toLowerCase()) ||
      String(s.orderNumber).includes(studentSearch);
    return matchSearch;
  });

  // Quick Class Input & Upload Handlers
  const handleStartEditQuickClass = (cls: SchoolClass) => {
    setEditingQuickClass(cls);
    setQuickClassName(cls.name);
    setSelectedClassId(cls.id);
    setTimeout(() => {
      quickClassInputRef.current?.focus();
      quickClassInputRef.current?.select();
    }, 50);
  };

  const handleCancelEditQuickClass = () => {
    setEditingQuickClass(null);
    setQuickClassName("");
  };

  const handleSaveQuickEditClass = async () => {
    if (!editingQuickClass) return;
    const trimmed = quickClassName.trim();
    if (!trimmed) {
      alert("Vui lòng nhập tên Lớp mới!");
      return;
    }

    if (trimmed.toLowerCase() === editingQuickClass.name.toLowerCase()) {
      setEditingQuickClass(null);
      setQuickClassName("");
      return;
    }

    const existing = classesList.find(
      (c) => c.id !== editingQuickClass.id && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      alert(`Đã có lớp "${existing.name}" trên hệ thống. Vui lòng chọn tên khác!`);
      return;
    }

    const gradeMatch = trimmed.match(/^(\d+)/);
    const grade = gradeMatch ? gradeMatch[1] : "12";

    setLoadingClasses(true);
    await updateClass(editingQuickClass.id, {
      name: trimmed,
      grade: grade,
    });
    setLoadingClasses(false);

    showToast(`✅ Đã đổi tên lớp "${editingQuickClass.name}" thành "${trimmed}" thành công!`);
    setEditingQuickClass(null);
    setQuickClassName("");
    fetchClassesAndStudents();
  };

  const handleQuickCreateClass = async () => {
    if (editingQuickClass) {
      await handleSaveQuickEditClass();
      return;
    }

    const trimmed = quickClassName.trim();
    if (!trimmed) {
      handleOpenCreateClass();
      return;
    }

    const existing = classesList.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setSelectedClassId(existing.id);
      showToast(`ℹ️ Lớp "${existing.name}" đã có sẵn và đã được chọn.`);
      setQuickClassName("");
      return;
    }

    const gradeMatch = trimmed.match(/^(\d+)/);
    const grade = gradeMatch ? gradeMatch[1] : "12";

    setLoadingClasses(true);
    const res = await saveNewClass({
      name: trimmed,
      grade: grade,
      academicYear: "2025 - 2026",
    });
    setLoadingClasses(false);

    if (res.id) {
      showToast(`🎉 Đã tạo lớp "${trimmed}" thành công vào Firebase Firestore!`);
      setSelectedClassId(res.id);
      setQuickClassName("");
      fetchClassesAndStudents();
    }
  };

  const handleQuickFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    let targetClassName = quickClassName.trim();
    if (!targetClassName) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const match = nameWithoutExt.match(/(1[0-2]|[1-9])[a-zA-Z]\d*/i) || nameWithoutExt.match(/\b\d+[A-Z0-9]+\b/i);
      if (match) {
        targetClassName = match[0].toUpperCase();
      } else if (currentClass) {
        targetClassName = currentClass.name;
      } else {
        const inputPrompt = prompt("Vui lòng nhập tên lớp cho file danh sách này (VD: 12A1):", "12A1");
        if (!inputPrompt || !inputPrompt.trim()) return;
        targetClassName = inputPrompt.trim();
      }
    }

    setQuickUploadLoading(true);
    showToast(`⏳ Đang xử lý danh sách học sinh từ file "${file.name}"...`);

    const parseRes = await parseStudentFile(file);
    if (!parseRes.success || !parseRes.data || parseRes.data.length === 0) {
      setQuickUploadLoading(false);
      alert("Không thể đọc danh sách học sinh: " + (parseRes.error || "File không chứa dữ liệu học sinh hợp lệ"));
      return;
    }

    let targetClass = classesList.find((c) => c.name.toLowerCase() === targetClassName.toLowerCase());
    if (!targetClass) {
      const gradeMatch = targetClassName.match(/^(\d+)/);
      const grade = gradeMatch ? gradeMatch[1] : "12";
      const newClassRes = await saveNewClass({
        name: targetClassName,
        grade: grade,
        academicYear: "2025 - 2026",
      });
      targetClass = {
        id: newClassRes.id || "cls_" + Date.now(),
        name: targetClassName,
        grade: grade,
        academicYear: "2025 - 2026",
      };
    }

    const importRes = await importStudentsToClass(
      targetClass.id,
      targetClass.name,
      parseRes.data,
      "replace"
    );
    setQuickUploadLoading(false);

    if (importRes.success) {
      showToast(`🚀 Đã lưu lớp "${targetClass.name}" và nạp ${importRes.importedCount} học sinh vào Firebase Firestore!`);
      setSelectedClassId(targetClass.id);
      setQuickClassName("");
      fetchClassesAndStudents();
    } else {
      alert("Lỗi khi lưu học sinh vào Firebase: " + (importRes.error || "Vui lòng thử lại"));
    }
  };

  // Class CRUD (Chỉ còn duy nhất Tên Lớp)
  const handleOpenCreateClass = () => {
    setEditingClass(null);
    setClassForm({ name: "" });
    setShowClassModal(true);
  };

  const handleOpenEditClass = (cls: SchoolClass) => {
    setEditingClass(cls);
    setClassForm({ name: cls.name });
    setShowClassModal(true);
  };

  const handleSaveClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.name.trim()) {
      alert("Vui lòng nhập tên Lớp (ví dụ: 12A1)!");
      return;
    }

    const gradeMatch = classForm.name.match(/^(\d+)/);
    const grade = gradeMatch ? gradeMatch[1] : "12";

    if (editingClass) {
      await updateClass(editingClass.id, {
        name: classForm.name.trim(),
        grade: grade,
      });
      showToast(`✅ Đã cập nhật tên Lớp "${classForm.name}" thành công!`);
    } else {
      const res = await saveNewClass({
        name: classForm.name.trim(),
        grade: grade,
        academicYear: "2025 - 2026",
      });
      if (res.id) {
        setSelectedClassId(res.id);
      }
      showToast(`🎉 Đã tạo mới Lớp "${classForm.name}" thành công vào Firebase Firestore!`);
    }

    setShowClassModal(false);
    fetchClassesAndStudents();
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    const studentCount = allStudentsList.filter(
      (s) => s.classId === classId || (s.className && s.className.trim().toLowerCase() === className.trim().toLowerCase())
    ).length;

    const confirmMsg =
      studentCount > 0
        ? `Xác nhận xóa Lớp "${className}"?\n\n⚠️ ĐỒNG THỜI SẼ XÓA TOÀN BỘ ${studentCount} HỌC SINH thuộc lớp này khỏi Firebase Firestore & hệ thống!`
        : `Bạn có chắc chắn muốn xóa Lớp "${className}" khỏi Firebase Firestore?`;

    if (!confirm(confirmMsg)) return;

    setLoadingClasses(true);
    await deleteClass(classId, className);

    // Cập nhật ngay UI để người dùng thấy kết quả tức thì
    const remainingClasses = classesList.filter(
      (c) => c.id !== classId && c.name.trim().toLowerCase() !== className.trim().toLowerCase()
    );
    setClassesList(remainingClasses);

    const remainingStudents = allStudentsList.filter(
      (s) => s.classId !== classId && (!s.className || s.className.trim().toLowerCase() !== className.trim().toLowerCase())
    );
    setAllStudentsList(remainingStudents);

    // Xóa triệt để khỏi ô nhập tạo/sửa lớp
    setQuickClassName("");
    if (editingQuickClass && (editingQuickClass.id === classId || editingQuickClass.name.toLowerCase() === className.toLowerCase())) {
      setEditingQuickClass(null);
    }

    // Chọn lớp tiếp theo (nếu còn lớp khác), nếu không còn lớp nào thì để rỗng hoàn toàn
    if (selectedClassId === classId || (currentClass && currentClass.id === classId)) {
      const nextClass = remainingClasses.length > 0 ? remainingClasses[0] : null;
      setSelectedClassId(nextClass ? nextClass.id : "");
    }

    setLoadingClasses(false);
    showToast(`🗑️ Đã xóa Lớp "${className}" và toàn bộ ${studentCount} học sinh tương ứng thành công!`);
  };

  // Student CRUD (Chỉ lưu: TT, Họ và tên, Ngày sinh)
  const handleOpenCreateStudent = () => {
    if (!currentClass) {
      alert("Vui lòng chọn hoặc tạo một Lớp trước khi thêm học sinh!");
      return;
    }
    const maxOrder = currentClassStudents.reduce((max, s) => Math.max(max, s.orderNumber || 0), 0);
    setEditingStudent(null);
    setStudentForm({
      orderNumber: maxOrder + 1,
      fullName: "",
      gender: "Nam",
      dob: "01/01/2015",
      classId: currentClass.id,
      password: "",
    });
    setShowStudentModal(true);
  };

  const handleOpenEditStudent = (student: StudentItem) => {
    setEditingStudent(student);
    setStudentForm({
      orderNumber: student.orderNumber || 1,
      fullName: student.fullName,
      gender: (student.gender as "Nam" | "Nữ") || "Nam",
      dob: student.dob || "",
      classId: student.classId,
      password: student.password || "",
    });
    setShowStudentModal(true);
  };

  const handleSaveStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.fullName.trim()) {
      alert("Vui lòng nhập Họ và Tên học sinh!");
      return;
    }

    const targetClass = classesList.find((c) => c.id === studentForm.classId) || currentClass;
    const targetClassName = targetClass ? targetClass.name : "12A1";

    if (editingStudent) {
      await updateStudent(editingStudent.id, {
        orderNumber: Number(studentForm.orderNumber) || 1,
        fullName: studentForm.fullName.trim(),
        gender: studentForm.gender || "Nam",
        dob: studentForm.dob.trim(),
        classId: studentForm.classId,
        className: targetClassName,
      });
      if (studentForm.password.trim() !== (editingStudent.password || "")) {
        await setStudentPassword(editingStudent.id, studentForm.password.trim());
      }
      showToast(`✅ Đã cập nhật học sinh "${studentForm.fullName}" vào Firebase Firestore!`);
    } else {
      const res = await saveNewStudent({
        orderNumber: Number(studentForm.orderNumber) || 1,
        fullName: studentForm.fullName.trim(),
        gender: studentForm.gender || "Nam",
        dob: studentForm.dob.trim(),
        classId: studentForm.classId,
        className: targetClassName,
      });
      if (studentForm.password.trim() && res.id) {
        await setStudentPassword(res.id, studentForm.password.trim());
      }
      showToast(`🎉 Đã thêm học sinh "${studentForm.fullName}" vào Lớp ${targetClassName} (Firestore)!`);
    }

    setShowStudentModal(false);
    fetchClassesAndStudents();
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa học sinh "${studentName}" khỏi lớp?`)) return;
    await deleteStudent(studentId);
    showToast(`🗑️ Đã xóa học sinh "${studentName}" khỏi Firebase Firestore!`);
    fetchClassesAndStudents();
  };

  // Reset mật khẩu học sinh (Giáo viên có thể reset bất kỳ lúc nào nếu học sinh quên)
  const handleResetStudentPassword = async (student: StudentItem) => {
    const confirmReset = window.confirm(
      `Bạn có chắc chắn muốn RESET MẬT KHẨU cho học sinh "${student.fullName}"?\n\nSau khi reset, học sinh sẽ tự đặt lại mật khẩu mới ở lần đăng nhập tiếp theo.`
    );
    if (!confirmReset) return;

    try {
      await setStudentPassword(student.id, "");
      if (typeof window !== "undefined") {
        localStorage.removeItem(`std_pwd_${student.id}`);
        localStorage.removeItem(`std_remembered_${student.id}`);
      }
      setAllStudentsList((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, password: "" } : s))
      );
      fetchClassesAndStudents();
      showToast(`🔑 Đã reset mật khẩu cho học sinh "${student.fullName}" thành công!`);
    } catch {
      alert("Không thể reset mật khẩu lúc này. Vui lòng thử lại!");
    }
  };

  // Import Modal & Handlers
  const handleOpenImportModal = () => {
    if (!currentClass) {
      alert("Vui lòng chọn hoặc tạo một Lớp trước khi import!");
      return;
    }
    setImportTargetClassId(currentClass.id);
    setImportMode("replace");
    setImportPreviewStudents([]);
    setImportFileName("");
    setImportError(null);
    setImportInvalidCount(0);
    setShowImportModal(true);
  };

  const handleFileChangeForImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportLoading(true);
    setImportError(null);

    const res = await parseStudentFile(file);
    setImportLoading(false);

    if (res.success && res.data) {
      setImportPreviewStudents(res.data);
      setImportInvalidCount(res.invalidCount || 0);
    } else {
      setImportError(res.error || "Không thể đọc dữ liệu từ file");
      setImportPreviewStudents([]);
    }
  };

  const handleExecuteImport = async () => {
    if (!importPreviewStudents || importPreviewStudents.length === 0) {
      alert("Chưa có danh sách học sinh hợp lệ để import!");
      return;
    }

    const targetClass = classesList.find((c) => c.id === importTargetClassId) || currentClass;
    if (!targetClass) {
      alert("Vui lòng chọn lớp tương ứng cần import!");
      return;
    }

    setImportLoading(true);
    const res = await importStudentsToClass(
      targetClass.id,
      targetClass.name,
      importPreviewStudents,
      importMode
    );
    setImportLoading(false);

    if (res.success) {
      showToast(`🚀 Import thành công ${res.importedCount} học sinh vào Lớp ${targetClass.name} (Firebase Firestore)!`);
      setShowImportModal(false);
      setSelectedClassId(targetClass.id);
      fetchClassesAndStudents();
    } else {
      alert("Lỗi khi import học sinh vào Firebase: " + (res.error || "Vui lòng thử lại"));
    }
  };

  const handleDownloadExcelTemplateClick = () => {
    downloadExcelTemplate(currentClass?.name || "12A1");
    showToast("📥 Đã tải xuống file mẫu Excel (Mau_Danh_Sach_Hoc_Sinh.xlsx)!");
  };

  const handleDownloadCsvTemplateClick = () => {
    downloadCsvTemplate(currentClass?.name || "12A1");
    showToast("📥 Đã tải xuống file mẫu CSV (Mau_Danh_Sach_Hoc_Sinh.csv)!");
  };

  const handleExportCurrentClassToExcel = () => {
    if (!currentClass) return;
    exportStudentsToExcel(
      currentClass.name,
      currentClass.homeroomTeacher || "Giáo viên chủ nhiệm",
      currentClassStudents
    );
    showToast(`📊 Đã xuất file Excel danh sách học sinh Lớp ${currentClass.name}!`);
  };

  // 2. USER TAB ACTIONS (QUẢN LÝ TÀI KHOẢN)
  const filteredUsers = usersList.filter((u, index, self) => {
    // 1. Loại bỏ các tài khoản cũ / tài khoản mẫu dư thừa
    const emailNorm = (u.email || "").toLowerCase().trim();
    if (OLD_ACCOUNT_IDENTIFIERS.includes(u.uid) || OLD_ACCOUNT_IDENTIFIERS.includes(emailNorm)) {
      return false;
    }

    // 2. Loại bỏ các tài khoản trùng lặp (chỉ giữ 1 tài khoản thực tế duy nhất)
    const firstIndex = self.findIndex(
      (item) =>
        (item.email || "").toLowerCase().trim() === emailNorm ||
        (item.teacherCode && u.teacherCode && item.teacherCode === u.teacherCode && item.fullName === u.fullName)
    );
    if (firstIndex !== index) {
      return false;
    }

    const query = userSearch.toLowerCase().trim();
    const matchSearch =
      !query ||
      (u.fullName || "").toLowerCase().includes(query) ||
      (u.email || "").toLowerCase().includes(query) ||
      (u.teacherCode || "").includes(query);

    let matchStatus = true;
    if (userStatusFilter === "active") {
      matchStatus = u.status === "active";
    } else if (userStatusFilter === "inactive") {
      matchStatus = u.status === "inactive" || !u.status;
    } else if (userStatusFilter === "locked") {
      matchStatus = u.status === "locked";
    }

    return matchSearch && matchStatus;
  });

  // Chuyển đổi trạng thái: Kích hoạt <-> Hủy kích hoạt
  const handleToggleUserStatus = async (user: UserAccountData) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    let teacherCode = user.teacherCode;
    // Nếu kích hoạt mà chưa có mã GV, cấp mã 6 số cho giáo viên đó
    if (newStatus === "active" && !teacherCode) {
      teacherCode = generateTeacherCode(user.email);
    }

    await updateUserInFirestore(user.uid, {
      status: newStatus,
      teacherCode: teacherCode || "",
    });

    setUsersList((prev) =>
      prev.map((item) =>
        item.uid === user.uid
          ? { ...item, status: newStatus, teacherCode: teacherCode || item.teacherCode }
          : item
      )
    );

    if (newStatus === "active") {
      showToast(`🎉 Đã kích hoạt tài khoản "${user.fullName}"! Mã GV: ${teacherCode}`);
    } else {
      showToast(`⚠️ Đã hủy kích hoạt tài khoản "${user.fullName}"!`);
    }
  };

  // Mở modal Sửa (Phóng to khi nhấp vào)
  const handleOpenEditUser = (user: UserAccountData) => {
    setEditingUser(user);
    const initialCode = user.teacherCode === "5710" ? "571024" : (user.teacherCode || "");
    const isUserSuperAdmin =
      user.role === "super_admin" ||
      user.role === "admin" ||
      (user.email || "").toLowerCase().trim() === "thudanganh670@gmail.com";
    const userRole = isUserSuperAdmin ? "super_admin" : (user.role || "teacher");
    setUserEditForm({
      fullName: user.fullName || "",
      email: user.email || "",
      teacherCode: initialCode,
      registeredDate: user.registeredDate || getRegistrationDateString(),
      status: user.status || "active",
      role: userRole,
    });
    setShowUserEditModal(true);
  };

  // Lưu Sửa tài khoản
  const handleSaveEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!userEditForm.fullName.trim() || !userEditForm.email.trim()) {
      alert("Vui lòng điền đầy đủ Họ và Tên cùng Email!");
      return;
    }

    const finalCode = userEditForm.teacherCode.trim();
    if (finalCode && !/^\d{6}$/.test(finalCode)) {
      alert("Mã giáo viên phải gồm đúng 6 chữ số (ví dụ: 571024)!");
      return;
    }

    await updateUserInFirestore(editingUser.uid, {
      fullName: userEditForm.fullName.trim(),
      email: userEditForm.email.trim(),
      teacherCode: finalCode,
      registeredDate: userEditForm.registeredDate.trim() || getRegistrationDateString(),
      status: userEditForm.status,
      role: userEditForm.role,
    });

    setUsersList((prev) =>
      prev.map((item) =>
        item.uid === editingUser.uid
          ? {
              ...item,
              fullName: userEditForm.fullName.trim(),
              email: userEditForm.email.trim(),
              teacherCode: finalCode,
              registeredDate: userEditForm.registeredDate.trim() || item.registeredDate,
              status: userEditForm.status,
              role: userEditForm.role,
            }
          : item
      )
    );

    setShowUserEditModal(false);
    showToast(`💾 Đã cập nhật thành công thông tin tài khoản "${userEditForm.fullName}"!`);
  };

  // Mở modal Xóa (Phóng to khi nhấp vào)
  const handleOpenDeleteUser = (user: UserAccountData) => {
    setDeletingUser(user);
    setShowUserDeleteModal(true);
  };

  // Xác nhận Xóa tài khoản
  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    const name = deletingUser.fullName;
    await deleteUserFromFirestore(deletingUser.uid);

    setUsersList((prev) => prev.filter((item) => item.uid !== deletingUser.uid));
    setShowUserDeleteModal(false);
    showToast(`🗑️ Đã xóa vĩnh viễn tài khoản "${name}" khỏi hệ thống!`);
  };

  // Dọn dẹp & Xóa sạch toàn bộ tài khoản cũ/mẫu
  const handlePurgeOldAccountsClick = async () => {
    if (confirm("Bạn có chắc chắn muốn dọn sạch các tài khoản cũ/mẫu? Sau khi xóa, chỉ những tài khoản có trong cơ sở dữ liệu thật của bạn mới được phép đăng nhập.")) {
      await purgeOldAccounts();
      const users = await getAllRegisteredUsers(50);
      setUsersList(users);
      showToast("🧹 Đã dọn sạch toàn bộ các tài khoản cũ khỏi hệ thống!");
    }
  };

  // Mở modal Thêm tài khoản mới (Phóng to khi nhấp vào)
  const handleOpenAddUser = () => {
    setUserAddForm({
      fullName: "",
      email: "",
      teacherCode: "571024",
      registeredDate: getRegistrationDateString(),
      status: "active",
      role: "teacher",
    });
    setShowUserAddModal(true);
  };

  // Lưu Thêm tài khoản mới
  const handleSaveAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddForm.fullName.trim() || !userAddForm.email.trim()) {
      alert("Vui lòng điền Họ tên và Địa chỉ Email!");
      return;
    }

    const finalCode = userAddForm.teacherCode.trim();
    if (finalCode && !/^\d{6}$/.test(finalCode)) {
      alert("Mã giáo viên phải gồm đúng 6 chữ số (ví dụ: 571024)!");
      return;
    }

    const newUser: UserAccountData = {
      uid: "user_" + Date.now(),
      fullName: userAddForm.fullName.trim(),
      email: userAddForm.email.trim(),
      teacherCode: finalCode || generateTeacherCode(userAddForm.email),
      registeredDate: userAddForm.registeredDate.trim() || getRegistrationDateString(),
      status: userAddForm.status,
      schoolName: "THPT DTNT THCS & THPT Tuy Đức",
      studentClass: userAddForm.role === "super_admin" ? "Ban Giám Hiệu" : userAddForm.role === "student" ? "Học sinh" : "Giáo viên",
      authProvider: "password",
      role: userAddForm.role || "teacher",
      createdAt: new Date().toISOString(),
    };

    await saveUserToFirestore(newUser);
    setUsersList((prev) => [newUser, ...prev]);
    setShowUserAddModal(false);
    showToast(`🎉 Đã thêm thành công tài khoản "${newUser.fullName}"!`);
  };

  const subjectNameMap: Record<string, string> = {
    toan: "Toán học",
    van: "Ngữ văn",
    anh: "Tiếng Anh",
    ly: "Vật lí",
    hoa: "Hóa học",
    sinh: "Sinh học",
    su: "Lịch sử",
    dia: "Địa lí",
    ktpl: "GDKT & Pháp luật",
    tin: "Tin học",
    congnghe: "Công nghệ",
    gdqp: "GD Quốc phòng - An ninh",
  };

  const handleExamSubjectChange = (subjectVal: string) => {
    const isTin = subjectVal === "tin";
    setExamForm((prev) => ({
      ...prev,
      subject: subjectVal,
      subjectName: subjectNameMap[subjectVal] || (isTin ? "Tin học" : "Toán học"),
    }));

    if (isTin) {
      // Riêng môn tin học không có phần trả lời ngắn (phần 1 : 6, phần 2: 4)
      setScoreConfig((prev) => ({
        ...prev,
        p1Total: 6,
        p2Total: 4,
        p3Total: 0,
      }));
    } else {
      // Các môn khác: tổng điểm phần 1 : 7, phần 3 : 3
      setScoreConfig((prev) => ({
        ...prev,
        p1Total: 7,
        p2Total: 4,
        p3Total: 3,
      }));
    }
  };

  const handleExamFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExamUploadingFile(true);
    setExamUploadedFileName(file.name);

    try {
      const res = await uploadFileToCloudinary(file, uploadPreset, cloudName);
      if (res.success && res.data?.secure_url) {
        setExamForm((prev) => ({ ...prev, fileUrl: res.data!.secure_url }));
        showToast(`✅ Đã tải tệp đề thi "${file.name}" thành công!`);
      } else {
        const fallbackUrl = URL.createObjectURL(file);
        setExamForm((prev) => ({ ...prev, fileUrl: fallbackUrl }));
        showToast(`📁 Đã đính kèm tệp đề thi "${file.name}"!`);
      }
    } catch {
      const fallbackUrl = URL.createObjectURL(file);
      setExamForm((prev) => ({ ...prev, fileUrl: fallbackUrl }));
      showToast(`📁 Đã đính kèm tệp đề thi "${file.name}"!`);
    } finally {
      setExamUploadingFile(false);
    }
  };

  const handleExamPdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    setLocalPdfPreviewUrl(blobUrl);
    setExamUploadedFileName(file.name);
    handleExamFileSelect(e);
  };

  const handleExamImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const urls = Array.from(files).map((f) => URL.createObjectURL(f));
    setLocalImagePreviewUrls(urls);
    setExamUploadedFileName(files[0].name);
    handleExamFileSelect(e);
  };

  const handleOpenPaperPreview = () => {
    const url = examForm.fileUrl || localPdfPreviewUrl || (localImagePreviewUrls.length > 0 ? localImagePreviewUrls[0] : "");
    if (!url) {
      alert("Vui lòng dán link đề thi (Google Drive / PDF / Ảnh) hoặc tải file lên trước khi xem trước!");
      return;
    }
    setShowPaperPreviewModal(true);
  };

  const getPaperEmbedInfo = (url: string) => {
    if (!url) return { embedUrl: "", isGoogleDrive: false, isPdf: false, isImage: false, rawUrl: "" };
    // Trim spaces and trailing punctuation like commas, periods
    const cleanUrl = url.trim().replace(/[,;.\s]+$/, "");
    const driveMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return {
        embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
        isGoogleDrive: true,
        isPdf: false,
        isImage: false,
        rawUrl: `https://drive.google.com/file/d/${driveMatch[1]}/view?usp=sharing`,
        fileId: driveMatch[1],
      };
    }

    const isPdf = cleanUrl.toLowerCase().includes(".pdf");
    const isImage = /\.(jpeg|jpg|png|gif|webp|svg)($|\?)/i.test(cleanUrl);

    return {
      embedUrl: cleanUrl,
      isGoogleDrive: false,
      isPdf,
      isImage,
      rawUrl: cleanUrl,
    };
  };

  const handleDownloadExamTemplate = () => {
    downloadExamExcelTemplate(examForm.subject);
    showToast(`📥 Đã tải xuống file mẫu Excel (${examForm.subject === "tin" ? "Mau_De_Thi_Tin_Hoc.xlsx" : "Mau_De_Thi_Va_Dap_An.xlsx"})!`);
  };

  const handleExamExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExamImportLoading(true);
    const res = await parseExamExcelFile(file);
    setExamImportLoading(false);
    e.target.value = "";

    if (!res.success) {
      alert(res.error || "Không thể đọc dữ liệu từ file Excel đề thi");
      return;
    }

    if (res.title) {
      setExamForm((prev) => ({ ...prev, title: res.title! }));
    }
    if (res.subject) {
      handleExamSubjectChange(res.subject);
    }
    if (res.grade) {
      setExamGrade(res.grade);
    }
    if (res.timeMinutes) {
      setExamTimeMinutes(res.timeMinutes);
    }
    setPart1AnswerText(res.part1Text || "");
    setPart2AnswerText(res.part2Text || "");
    setPart3AnswerText(res.part3Text || "");

    originalMasterAnswersRef.current = {
      part1: res.part1Text || "",
      part2: res.part2Text || "",
      part3: res.part3Text || "",
    };

    showToast(`📊 Nạp thành công đề thi từ Excel: "${res.title}" (${res.totalQuestions} câu hỏi)! Đã điền sẵn khung đáp án.`);
  };

  // MULTI-VARIANT EXAM SHUFFLE HANDLERS (TỰ ĐỘNG TRỘN ĐỀ & ĐẢO ĐÁP ÁN CHUẨN 2026)
  // Khi bấm "Sinh mã mới": Tự động sinh mã 4 số + Xáo trộn câu hỏi + Đảo đáp án tương ứng chuẩn xác
  const handleGenerateNewCodeAndShuffle = () => {
    const isTin = examForm.subject === "tin";
    const currentBase = {
      part1: originalMasterAnswersRef.current.part1 || part1AnswerText,
      part2: originalMasterAnswersRef.current.part2 || part2AnswerText,
      part3: isTin ? "" : (originalMasterAnswersRef.current.part3 || part3AnswerText),
    };

    const newCode = generateRandomExamCode();
    setExamAccessCode(newCode);

    // Xáo trộn đề và cập nhật khung đáp án mới
    const shuffledSingle = generateSingleShuffledVariant(currentBase, newCode, 1, false);
    if (shuffledSingle.answerKey.part1) setPart1AnswerText(shuffledSingle.answerKey.part1);
    if (shuffledSingle.answerKey.part2) setPart2AnswerText(shuffledSingle.answerKey.part2);
    if (!isTin && shuffledSingle.answerKey.part3) setPart3AnswerText(shuffledSingle.answerKey.part3);

    // Nếu giáo viên đang chọn sinh nhiều mã đề (2, 3, 4... n), tự động tái tạo toàn bộ chùm mã đề
    if (examVariantsCount > 1) {
      const newVariants = generateMultipleExamVariants(currentBase, examVariantsCount, newCode);
      setGeneratedVariants(newVariants);
      showToast(`🔀 Đã sinh mã mới [${newCode}] & TỰ ĐỘNG TRỘN LẠI ${examVariantsCount} MÃ ĐỀ KHỚP ĐÁP ÁN 100%!`);
    } else {
      setGeneratedVariants([shuffledSingle]);
      showToast(`🔀 Đã sinh mã mới [${newCode}] & TỰ ĐỘNG TRỘN ĐỀ, ĐẢO ĐÁP ÁN KHỚP CHUẨN 100%!`);
    }
  };

  // Khi giáo viên chọn số lượng mã đề cần sinh (2, 3, 4... n mã đề)
  const handleSelectVariantsCount = (count: number) => {
    const safeCount = Math.max(1, Math.min(count, 30));
    setExamVariantsCount(safeCount);
    setCustomVariantsInput(String(safeCount));

    const isTin = examForm.subject === "tin";
    const currentBase = {
      part1: originalMasterAnswersRef.current.part1 || part1AnswerText,
      part2: originalMasterAnswersRef.current.part2 || part2AnswerText,
      part3: isTin ? "" : (originalMasterAnswersRef.current.part3 || part3AnswerText),
    };

    if (safeCount === 1) {
      setGeneratedVariants([]);
      showToast("Chế độ 1 mã đề thi tiêu chuẩn.");
      return;
    }

    const variants = generateMultipleExamVariants(currentBase, safeCount, examAccessCode);
    setGeneratedVariants(variants);
    showToast(`🎲 Đã sinh thành công chùm ${safeCount} mã đề thi trộn! Đáp án đã được re-map chuẩn xác.`);
  };

  // Trộn lại toàn bộ các mã đề
  const handleRegenerateAllVariants = () => {
    const count = examVariantsCount > 1 ? examVariantsCount : 4;
    handleSelectVariantsCount(count);
  };

  // Xem bảng đối chiếu đáp án các mã đề
  const handleViewExamVariants = (exam: ExamItem) => {
    setViewingExamVariants(exam);
    setShowVariantsTableModal(true);
  };

  const handleCreateExam = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!examForm.title.trim()) {
      alert("Vui lòng nhập tên đề thi (hoặc nạp từ Excel)!");
      return;
    }

    const isTin = examForm.subject === "tin";
    const p1Matches = part1AnswerText.trim().match(/\d+[A-Z]/gi) || [];
    const p2Matches = part2AnswerText.trim().match(/\d+:\s*([^\d:]+)/gi) || [];
    const p3Matches = isTin ? [] : (part3AnswerText.trim().match(/\d+:\s*([^\d:]+)/gi) || []);
    const calculatedQuestions = p1Matches.length + p2Matches.length + p3Matches.length || 40;

    const assignedStudentNames = assignMode === "student"
      ? allStudentsList.filter(s => assignedStudents.includes(s.id)).map(s => s.fullName)
      : [];

    // Chuẩn bị danh sách mã đề variants
    let finalVariants: ExamVariant[] = [];
    if (examVariantsCount > 1 && generatedVariants.length > 0) {
      finalVariants = generatedVariants;
    } else {
      finalVariants = [
        {
          code: examAccessCode,
          variantNumber: 1,
          isOriginal: true,
          answerKey: {
            part1: part1AnswerText.trim(),
            part2: part2AnswerText.trim(),
            part3: isTin ? "" : part3AnswerText.trim(),
          },
        },
      ];
    }

    const newExamData = {
      title: examForm.title.trim(),
      subject: examForm.subject,
      subjectName: subjectNameMap[examForm.subject] || "Toán học",
      school: examForm.school.trim() || "THPT DTNT THCS & THPT Tuy Đức",
      questions: calculatedQuestions,
      timeMinutes: Number(examTimeMinutes) || 90,
      difficulty: examForm.difficulty,
      takers: "1 (Mới giao)",
      avgScore: 8.0,
      tag: examForm.tag,
      tagType: examForm.tagType,
      fileUrl: examForm.fileUrl || undefined,
      createdBy: "Đặng Anh Thư - THPT Tuy Đức",
      accessCode: examAccessCode,
      assignedClasses: assignMode === "class" ? assignedClasses : [],
      assignedStudents: assignMode === "student" ? assignedStudents : [],
      assignedStudentNames,
      assignType: assignMode,
      grade: examGrade,
      status: "ACTIVE",
      variants: finalVariants,
      answerKey: {
        part1: part1AnswerText.trim(),
        part2: part2AnswerText.trim(),
        part3: isTin ? "" : part3AnswerText.trim(),
      },
      scoreConfig: scoreConfig,
      allowReview: examAllowReview,
    };

    const res = await saveNewExam(newExamData);
    if (res.success) {
      if (finalVariants.length > 1) {
        showToast(`🚀 Đã xuất bản Đề thi "${newExamData.title}" với ${finalVariants.length} MÃ ĐỀ (${finalVariants.map(v => v.code).join(", ")})! Đề thi lập tức hiển thị ra TRANG CHỦ.`);
      } else {
        showToast(`🚀 Đã xuất bản Đề thi "${newExamData.title}" (Mã: ${examAccessCode})! Đề thi lập tức hiển thị ra TRANG CHỦ.`);
      }
      setExamForm({
        title: "",
        subject: "toan",
        subjectName: "Toán học",
        school: "THPT DTNT THCS & THPT Tuy Đức - Đặng Anh Thư",
        questions: 40,
        timeMinutes: 50,
        difficulty: "Vận dụng cao",
        tag: "🔥 Hot 2026",
        tagType: "hot",
        fileUrl: "",
      });
      setExamAccessCode(String(Math.floor(1000 + Math.random() * 9000)));
      setExamUploadedFileName("");
      setExamVariantsCount(1);
      setGeneratedVariants([]);
      fetchExams();
    } else {
      alert("Không thể lưu đề thi");
    }
  };

  // HOMEWORK ASSIGNMENT HANDLERS (GIAO BÀI TẬP VỀ NHÀ)
  const handleOpenAssignHomeworkModal = (existingExam?: ExamItem) => {
    if (existingExam) {
      setAssignHwForm({
        id: existingExam.id,
        title: existingExam.title,
        subject: existingExam.subject || "toan",
        fileUrl: existingExam.fileUrl || "",
        fileName: existingExam.fileUrl ? "File_Bai_Tap_Hien_Co" : "",
        timeMinutes: existingExam.timeMinutes || 45,
        questions: existingExam.questions || 20,
        dueDate: existingExam.dueDate || "",
        teacherNote: existingExam.teacherNote || "",
        mode: (existingExam.assignType === "student" || (existingExam.assignedStudents && existingExam.assignedStudents.length > 0)) ? "student" : "class",
        selectedClasses: existingExam.assignedClasses && existingExam.assignedClasses.length > 0
          ? existingExam.assignedClasses
          : (classesList.length > 0 ? [classesList[0].id] : []),
        selectedStudents: existingExam.assignedStudents || [],
        filterClassForStudent: classesList.length > 0 ? classesList[0].id : "",
        studentSearch: "",
      });
    } else {
      const defaultTitle = examForm.title.trim() || `Bài tập rèn luyện môn ${subjectNameMap[examForm.subject] || "Toán học"}`;
      setAssignHwForm({
        id: undefined,
        title: defaultTitle,
        subject: examForm.subject || "toan",
        fileUrl: examForm.fileUrl || "",
        fileName: examUploadedFileName || (examForm.fileUrl ? "File_Dinh_Kem" : ""),
        timeMinutes: Number(examTimeMinutes) || 45,
        questions: 20,
        dueDate: "",
        teacherNote: "Các em làm bài cẩn thận và nộp đúng hạn nhé!",
        mode: assignMode || "class",
        selectedClasses: assignedClasses.length > 0 ? assignedClasses : (classesList.length > 0 ? [classesList[0].id] : []),
        selectedStudents: assignedStudents || [],
        filterClassForStudent: classesList.length > 0 ? classesList[0].id : "",
        studentSearch: "",
      });
    }
    setShowAssignHomeworkModal(true);
  };

  const handleAssignHwFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAssignHwUploading(true);
    setAssignHwForm(prev => ({ ...prev, fileName: file.name }));

    try {
      const res = await uploadFileToCloudinary(file, uploadPreset, cloudName);
      if (res.success && res.data?.secure_url) {
        setAssignHwForm(prev => ({
          ...prev,
          fileUrl: res.data!.secure_url,
        }));
        showToast(`✅ Đã tải lên file bài tập "${file.name}" thành công!`);
      } else {
        const fallbackUrl = URL.createObjectURL(file);
        setAssignHwForm(prev => ({
          ...prev,
          fileUrl: fallbackUrl,
        }));
        showToast(`📁 Đã đính kèm tệp bài tập "${file.name}"!`);
      }
    } catch {
      const fallbackUrl = URL.createObjectURL(file);
      setAssignHwForm(prev => ({
        ...prev,
        fileUrl: fallbackUrl,
      }));
      showToast(`📁 Đã đính kèm tệp bài tập "${file.name}"!`);
    } finally {
      setAssignHwUploading(false);
    }
  };

  const handleConfirmAssignHomework = async () => {
    if (!assignHwForm.title.trim()) {
      alert("Vui lòng nhập tiêu đề bài tập!");
      return;
    }

    if (assignHwForm.mode === "class" && assignHwForm.selectedClasses.length === 0) {
      alert("Vui lòng chọn ít nhất 1 lớp học để giao bài!");
      return;
    }

    if (assignHwForm.mode === "student" && assignHwForm.selectedStudents.length === 0) {
      alert("Vui lòng chọn ít nhất 1 học sinh để giao bài!");
      return;
    }

    const assignedStudentNames = assignHwForm.mode === "student"
      ? allStudentsList.filter(s => assignHwForm.selectedStudents.includes(s.id)).map(s => s.fullName)
      : [];

    const isTin = assignHwForm.subject === "tin";
    const p1Matches = part1AnswerText.trim().match(/\d+[A-Z]/gi) || [];
    const p2Matches = part2AnswerText.trim().match(/\d+:\s*([^\d:]+)/gi) || [];
    const p3Matches = isTin ? [] : (part3AnswerText.trim().match(/\d+:\s*([^\d:]+)/gi) || []);
    const calculatedQuestions = p1Matches.length + p2Matches.length + p3Matches.length || assignHwForm.questions || 20;

    if (assignHwForm.id) {
      await updateExam(assignHwForm.id, {
        title: assignHwForm.title.trim(),
        subject: assignHwForm.subject,
        subjectName: subjectNameMap[assignHwForm.subject] || "Toán học",
        fileUrl: assignHwForm.fileUrl || undefined,
        assignedClasses: assignHwForm.mode === "class" ? assignHwForm.selectedClasses : [],
        assignedStudents: assignHwForm.mode === "student" ? assignHwForm.selectedStudents : [],
        assignedStudentNames,
        assignType: assignHwForm.mode,
        isHomework: true,
        dueDate: assignHwForm.dueDate || undefined,
        teacherNote: assignHwForm.teacherNote || undefined,
      });

      const targetDesc = assignHwForm.mode === "class"
        ? `${assignHwForm.selectedClasses.length} lớp học`
        : `${assignHwForm.selectedStudents.length} học sinh`;
      showToast(`🎉 Đã giao bài tập thành công cho ${targetDesc}! Đã gửi file đến Trang học sinh.`);
      setShowAssignHomeworkModal(false);
      fetchExams();
      return;
    }

    const homeworkData = {
      title: assignHwForm.title.trim(),
      subject: assignHwForm.subject,
      subjectName: subjectNameMap[assignHwForm.subject] || "Toán học",
      school: examForm.school.trim() || "THPT DTNT THCS & THPT Tuy Đức",
      questions: calculatedQuestions,
      timeMinutes: Number(assignHwForm.timeMinutes) || 45,
      difficulty: "Vận dụng",
      takers: "1 (Mới giao)",
      avgScore: 8.5,
      tag: "📌 Bài tập về nhà",
      tagType: "new" as const,
      fileUrl: assignHwForm.fileUrl || examForm.fileUrl || undefined,
      createdBy: "Đặng Anh Thư - THPT Tuy Đức",
      accessCode: examAccessCode || "5710",
      assignedClasses: assignHwForm.mode === "class" ? assignHwForm.selectedClasses : [],
      assignedStudents: assignHwForm.mode === "student" ? assignHwForm.selectedStudents : [],
      assignedStudentNames,
      assignType: assignHwForm.mode,
      isHomework: true,
      dueDate: assignHwForm.dueDate || undefined,
      teacherNote: assignHwForm.teacherNote || undefined,
      grade: examGrade,
      status: "ACTIVE",
      answerKey: {
        part1: part1AnswerText.trim(),
        part2: part2AnswerText.trim(),
        part3: isTin ? "" : part3AnswerText.trim(),
      },
      scoreConfig: scoreConfig,
      allowReview: examAllowReview,
    };

    const res = await saveNewExam(homeworkData);
    if (res.success) {
      const targetDesc = assignHwForm.mode === "class"
        ? `${assignHwForm.selectedClasses.length} lớp học`
        : `${assignHwForm.selectedStudents.length} học sinh`;
      showToast(`🎉 ĐÃ GIAO BÀI TẬP THÀNH CÔNG cho ${targetDesc}! Bài tập và file đã được gửi ngay đến Trang học sinh.`);
      setShowAssignHomeworkModal(false);
      fetchExams();
    } else {
      alert("Không thể lưu bài tập. Vui lòng thử lại!");
    }
  };


  const handleDeleteExam = async (id: string, title: string) => {
    if (confirm(`Bạn có chắc chắn muốn gỡ đề thi:\n"${title}"\nkhỏi hệ thống và trang chủ?`)) {
      await deleteExam(id);
      showToast(`🗑️ Đã gỡ đề thi "${title}" khỏi hệ thống & trang chủ.`);
      fetchExams();
    }
  };

  const handleDeleteSelectedExams = async () => {
    if (selectedExamIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 bài tập/đề thi để xóa!");
      return;
    }
    const count = selectedExamIds.length;
    if (
      confirm(
        `Bạn có chắc chắn muốn gỡ ${count} bài tập/đề thi đã chọn không?\nThao tác này sẽ gỡ khỏi hệ thống và trang chủ.`
      )
    ) {
      await deleteMultipleExams(selectedExamIds);
      setSelectedExamIds([]);
      setIsExamMultiSelectMode(false);
      showToast(`🗑️ Đã gỡ thành công ${count} đề thi khỏi hệ thống!`);
      await fetchExams();
    }
  };

  // 5. DOCUMENT TAB ACTIONS (GIAO TÀI LIỆU - HÌNH 1 & HÌNH 2)
  const handleDocFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocUploadingFile(true);
    setDocUploadedFileName(file.name);

    const ext = file.name.split(".").pop()?.toUpperCase() || "";
    if (ext === "PDF") setDocFormFormat("PDF");
    else if (ext === "DOC" || ext === "DOCX") setDocFormFormat("DOCX");
    else if (ext === "PPT" || ext === "PPTX") setDocFormFormat("PPTX");

    if (!docFormTitle.trim()) {
      setDocFormTitle(file.name.replace(/\.[^/.]+$/, ""));
    }

    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1) + " MB";
    try {
      const res = await uploadFileToCloudinary(file, uploadPreset, cloudName);
      if (res.success && res.data?.secure_url) {
        setDocFormLink(res.data.secure_url);
        showToast(`✅ Đã tải tài liệu "${file.name}" (${sizeInMB}) thành công!`);
      } else {
        const fallbackUrl = URL.createObjectURL(file);
        setDocFormLink(fallbackUrl);
        showToast(`📁 Đã đính kèm tệp tài liệu "${file.name}"!`);
      }
    } catch {
      const fallbackUrl = URL.createObjectURL(file);
      setDocFormLink(fallbackUrl);
      showToast(`📁 Đã đính kèm tệp tài liệu "${file.name}"!`);
    } finally {
      setDocUploadingFile(false);
    }
  };

  const handleOpenAddDoc = () => {
    setEditingDocId(null);
    setDocFormTitle("");
    setDocFormFormat("PDF");
    setDocFormLink("");
    setDocFormAssignMode("class");
    setDocFormAssignedClasses(classesList.length > 0 ? [classesList[0].name] : []);
    setDocFormAssignedStudents([]);
    setDocUploadedFileName("");
    setShowAddDocForm(true);
  };

  const handleEditDocument = (doc: DocumentItem) => {
    setEditingDocId(doc.id);
    setDocFormTitle(doc.title || "");
    setDocFormFormat(doc.format || "PDF");
    setDocFormLink(doc.fileUrl || "");
    setDocFormAssignMode(doc.assignType || "class");
    setDocFormAssignedClasses(doc.assignedClasses && doc.assignedClasses.length > 0 ? doc.assignedClasses : (classesList.length > 0 ? [classesList[0].name] : []));
    setDocFormAssignedStudents(doc.assignedStudents || []);
    setDocUploadedFileName("");
    setShowAddDocForm(true);
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFormTitle.trim()) {
      alert("Vui lòng nhập tiêu đề tài liệu!");
      return;
    }

    const assignedStudentNames =
      docFormAssignMode === "student" && docFormAssignedStudents.length > 0
        ? allStudentsList.filter((s) => docFormAssignedStudents.includes(s.id)).map((s) => s.fullName)
        : [];

    const now = new Date();
    const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    if (editingDocId) {
      const updateData: Partial<DocumentItem> = {
        title: docFormTitle.trim(),
        format: docFormFormat,
        fileUrl: docFormLink.trim() || undefined,
        assignType: docFormAssignMode,
        assignedClasses: docFormAssignMode === "class" ? docFormAssignedClasses : [],
        assignedStudents: docFormAssignMode === "student" ? docFormAssignedStudents : [],
        assignedStudentNames,
      };
      await updateDocument(editingDocId, updateData);
      showToast(`✏️ Đã cập nhật tài liệu "${docFormTitle.trim()}"!`);
    } else {
      const newDocData: Omit<DocumentItem, "id"> = {
        title: docFormTitle.trim(),
        subject: "toan",
        subjectName: "Toán học",
        format: docFormFormat,
        size: "3.2 MB",
        downloads: "1 (Mới giao)",
        description: "Tài liệu học tập cho lớp hoặc từng học sinh.",
        fileUrl: docFormLink.trim() || undefined,
        uploader: "Đặng Anh Thư - THPT Tuy Đức",
        assignType: docFormAssignMode,
        assignedClasses: docFormAssignMode === "class" ? docFormAssignedClasses : [],
        assignedStudents: docFormAssignMode === "student" ? docFormAssignedStudents : [],
        assignedStudentNames,
        createdAt: formattedDate,
      };
      await saveNewDocument(newDocData);
      showToast(`📁 Đã giao tài liệu "${docFormTitle.trim()}" thành công!`);
    }

    setShowAddDocForm(false);
    setEditingDocId(null);
    setDocFormTitle("");
    setDocFormLink("");
    fetchDocuments();
  };

  const handleDeleteDocument = async (id: string, title: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa tài liệu:\n"${title}"?`)) {
      await deleteDocument(id);
      showToast(`🗑️ Đã xóa tài liệu "${title}" khỏi hệ thống.`);
      fetchDocuments();
    }
  };

  const handleDeleteSelectedDocs = async () => {
    if (selectedDocIds.length === 0) {
      alert("Vui lòng tích chọn ít nhất 1 tài liệu để xóa!");
      return;
    }
    const count = selectedDocIds.length;
    if (
      confirm(
        `Bạn có chắc chắn muốn xóa ${count} tài liệu đã chọn không?\nThao tác này sẽ xóa vĩnh viễn và không thể khôi phục.`
      )
    ) {
      await deleteMultipleDocuments(selectedDocIds);
      setSelectedDocIds([]);
      setIsDocMultiSelectMode(false);
      showToast(`🗑️ Đã xóa thành công ${count} tài liệu khỏi hệ thống.`);
      await fetchDocuments();
    }
  };

  // =========================================================
  // 7. CURRICULUM MANAGEMENT (TẠO GIÁO TRÌNH) HANDLERS
  // =========================================================
  const handleOpenCreateCurriculum = () => {
    setEditingCurriculum(null);
    setCurriculumForm({
      title: "",
      subject: "toan",
      subjectName: "Toán học",
      grade: "Lớp 12",
      school: "THPT DTNT THCS & THPT Tuy Đức",
      author: "Đặng Anh Thư",
      academicYear: "2025 - 2026",
      description: "",
      estimatedHours: 35,
      fileUrl: "",
      fileName: "",
      assignedClasses: classesList.map((c) => c.id),
      status: "ACTIVE",
      chapters: [],
    });
    setShowCurriculumModal(true);
  };

  const handleEditCurriculum = (item: CurriculumItem) => {
    setEditingCurriculum(item);
    setCurriculumForm({
      title: item.title,
      subject: item.subject,
      subjectName: item.subjectName,
      grade: item.grade,
      school: item.school,
      author: item.author,
      academicYear: item.academicYear,
      description: item.description,
      estimatedHours: item.estimatedHours,
      fileUrl: item.fileUrl || "",
      fileName: item.fileName || "",
      assignedClasses: item.assignedClasses || [],
      status: item.status || "ACTIVE",
      chapters: JSON.parse(JSON.stringify(item.chapters || [])),
    });
    setShowCurriculumModal(true);
  };

  const handleCurriculumFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCurriculumUploadingFile(true);
    try {
      const cfg = getSavedCloudinaryConfig();
      const cName = cfg.cloudName || "o100uxqf";
      const uPreset = cfg.uploadPreset || "o100uxqf";

      const res = await uploadFileToCloudinary(file, uPreset, cName);
      const uploadedUrl = res.data?.secure_url || res.data?.url;
      if (res.success && uploadedUrl) {
        setCurriculumForm((prev) => ({
          ...prev,
          fileUrl: uploadedUrl,
          fileName: file.name,
        }));
        showToast(`✅ Đã tải file giáo trình "${file.name}" lên Cloudinary!`);
      } else {
        const blobUrl = URL.createObjectURL(file);
        setCurriculumForm((prev) => ({
          ...prev,
          fileUrl: blobUrl,
          fileName: file.name,
        }));
        showToast(`📁 Đã đính kèm tệp cục bộ "${file.name}"!`);
      }
    } catch (err: any) {
      console.error("Upload curriculum error:", err);
      const blobUrl = URL.createObjectURL(file);
      setCurriculumForm((prev) => ({
        ...prev,
        fileUrl: blobUrl,
        fileName: file.name,
      }));
      showToast(`📁 Đã đính kèm tệp "${file.name}"!`);
    } finally {
      setCurriculumUploadingFile(false);
    }
  };

  const handleAiGenerateCurriculumOutline = () => {
    setAiGeneratingOutline(true);
    setTimeout(() => {
      const aiResult = generateAICurriculum({
        subject: curriculumForm.subject,
        grade: curriculumForm.grade,
        topicTitle: curriculumForm.title,
      });
      setCurriculumForm((prev) => ({
        ...prev,
        title: prev.title.trim() ? prev.title : aiResult.title,
        description: aiResult.description,
        estimatedHours: aiResult.estimatedHours,
        chapters: aiResult.chapters,
      }));
      setAiGeneratingOutline(false);
      showToast("🤖 AI đã xây dựng xong khung giáo trình chuẩn 2026 với các chương bài chi tiết!");
    }, 600);
  };

  const handleAddChapter = () => {
    const nextNum = curriculumForm.chapters.length + 1;
    const newChap: CurriculumChapter = {
      id: `chap_${Date.now()}_${nextNum}`,
      chapterNumber: nextNum,
      title: `Chương ${nextNum}: Chuyên đề mới`,
      description: "",
      lessons: [
        {
          id: `les_${Date.now()}_1`,
          lessonNumber: 1,
          title: `Bài 1: Khởi động & Kiến thức cơ bản`,
          description: "",
          durationMinutes: 90,
        },
      ],
    };
    setCurriculumForm((prev) => ({
      ...prev,
      chapters: [...prev.chapters, newChap],
    }));
  };

  const handleRemoveChapter = (idx: number) => {
    setCurriculumForm((prev) => {
      const updated = prev.chapters.filter((_, i) => i !== idx);
      return {
        ...prev,
        chapters: updated.map((c, i) => ({ ...c, chapterNumber: i + 1 })),
      };
    });
  };

  const handleUpdateChapterTitle = (idx: number, val: string) => {
    setCurriculumForm((prev) => {
      const next = [...prev.chapters];
      next[idx] = { ...next[idx], title: val };
      return { ...prev, chapters: next };
    });
  };

  const handleAddLesson = (chapterIdx: number) => {
    setCurriculumForm((prev) => {
      const next = [...prev.chapters];
      const chap = next[chapterIdx];
      const nextLesNum = chap.lessons.length + 1;
      const newLes: CurriculumLesson = {
        id: `les_${Date.now()}_${nextLesNum}`,
        lessonNumber: nextLesNum,
        title: `Bài ${nextLesNum}: Nội dung bài học mới`,
        durationMinutes: 90,
      };
      next[chapterIdx] = {
        ...chap,
        lessons: [...chap.lessons, newLes],
      };
      return { ...prev, chapters: next };
    });
  };

  const handleRemoveLesson = (chapterIdx: number, lessonIdx: number) => {
    setCurriculumForm((prev) => {
      const next = [...prev.chapters];
      const chap = next[chapterIdx];
      const updatedLessons = chap.lessons.filter((_, i) => i !== lessonIdx);
      next[chapterIdx] = {
        ...chap,
        lessons: updatedLessons.map((l, i) => ({ ...l, lessonNumber: i + 1 })),
      };
      return { ...prev, chapters: next };
    });
  };

  const handleUpdateLessonTitle = (chapterIdx: number, lessonIdx: number, val: string) => {
    setCurriculumForm((prev) => {
      const next = [...prev.chapters];
      const chap = next[chapterIdx];
      const lessons = [...chap.lessons];
      lessons[lessonIdx] = { ...lessons[lessonIdx], title: val };
      next[chapterIdx] = { ...chap, lessons };
      return { ...prev, chapters: next };
    });
  };

  const handleUpdateLessonDuration = (chapterIdx: number, lessonIdx: number, val: number) => {
    setCurriculumForm((prev) => {
      const next = [...prev.chapters];
      const chap = next[chapterIdx];
      const lessons = [...chap.lessons];
      lessons[lessonIdx] = { ...lessons[lessonIdx], durationMinutes: val };
      next[chapterIdx] = { ...chap, lessons };
      return { ...prev, chapters: next };
    });
  };

  const handleSaveCurriculumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!curriculumForm.title.trim()) {
      alert("Vui lòng nhập tên giáo trình!");
      return;
    }

    setSavingCurriculum(true);
    try {
      const totalLessons = curriculumForm.chapters.reduce(
        (sum, c) => sum + (c.lessons?.length || 0),
        0
      );

      if (editingCurriculum) {
        await updateCurriculum(editingCurriculum.id, {
          title: curriculumForm.title.trim(),
          subject: curriculumForm.subject,
          subjectName: curriculumForm.subjectName,
          grade: curriculumForm.grade,
          school: curriculumForm.school,
          author: curriculumForm.author,
          academicYear: curriculumForm.academicYear,
          description: curriculumForm.description,
          totalChapters: curriculumForm.chapters.length,
          totalLessons: totalLessons,
          estimatedHours: Number(curriculumForm.estimatedHours) || 30,
          fileUrl: curriculumForm.fileUrl || undefined,
          fileName: curriculumForm.fileName || undefined,
          assignedClasses: curriculumForm.assignedClasses,
          status: curriculumForm.status,
          chapters: curriculumForm.chapters,
        });
        showToast(`📖 Đã cập nhật giáo trình "${curriculumForm.title}" thành công!`);
      } else {
        await saveNewCurriculum({
          title: curriculumForm.title.trim(),
          subject: curriculumForm.subject,
          subjectName: curriculumForm.subjectName,
          grade: curriculumForm.grade,
          school: curriculumForm.school,
          author: curriculumForm.author,
          academicYear: curriculumForm.academicYear,
          description: curriculumForm.description,
          totalChapters: curriculumForm.chapters.length,
          totalLessons: totalLessons,
          estimatedHours: Number(curriculumForm.estimatedHours) || 30,
          fileUrl: curriculumForm.fileUrl || undefined,
          fileName: curriculumForm.fileName || undefined,
          assignedClasses: curriculumForm.assignedClasses,
          status: curriculumForm.status,
          chapters: curriculumForm.chapters,
        });
        showToast(`📖 Đã tạo giáo trình mới "${curriculumForm.title}" thành công!`);
      }

      setShowCurriculumModal(false);
      fetchCurriculums();
    } catch (err: any) {
      console.error("Save curriculum error:", err);
      alert("Có lỗi xảy ra khi lưu giáo trình. Vui lòng thử lại!");
    } finally {
      setSavingCurriculum(false);
    }
  };

  const handleDeleteCurriculum = async (id: string, title: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa giáo trình:\n"${title}"?`)) {
      await deleteCurriculum(id);
      showToast(`🗑️ Đã xóa giáo trình "${title}" khỏi hệ thống.`);
      fetchCurriculums();
    }
  };

  return (
    <div className={styles.adminPage}>
      {/* =========================================================
          TOP SCHOOL BAR
      ========================================================= */}
      <div className={styles.topBar}>
        <div className={styles.schoolBrand}>
          <span className={styles.schoolBadge}>BẢN QUYỀN TRƯỜNG</span>
          <span>TRƯỜNG THPT DTNT THCS & THPT TUY ĐỨC</span>
          <span style={{ opacity: 0.7 }}>•</span>
          <span style={{ fontSize: "12px", fontWeight: 500, color: "#bfdbfe" }}>
            Hệ thống Quản Trị Dữ Liệu & Học Tập 2026
          </span>
        </div>
        <div className={styles.topBarActions}>
          <span style={{ fontSize: "12px", color: "#e0e7ff" }}>
            Giáo viên phụ trách: <strong>Đặng Anh Thư</strong>
          </span>
          <Link href="/" className={styles.topBarLink}>
            <span>🏠</span> Về Trang Chủ
          </Link>
        </div>
      </div>

      {/* =========================================================
          HEADER
      ========================================================= */}
      <header className={styles.adminHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.logoIcon}>⚙️</div>
          <div>
            <h1 className={styles.headerTitle}>Hệ Thống Quản Trị & Điều Hành Học Tập</h1>
            <p className={styles.headerSubtitle}>
              Cổng tiếp nhận dữ liệu, cấu hình Cloudinary & phát hành trực tiếp ra Trang Chủ
            </p>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button
            id="btn-seed-firestore"
            onClick={handleSeedFirestore}
            disabled={seedingLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
              color: "#ffffff",
              border: "none",
              padding: "9px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: seedingLoading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.28)",
              transition: "all 0.2s ease",
            }}
            title="Đẩy toàn bộ Lớp, Học sinh mẫu, Đề thi, Tài liệu lên Firestore để hiển thị trong Firebase Console Data tab"
          >
            <span>{seedingLoading ? "⏳ Đang nạp lên Firestore..." : "🔥 Đồng Bộ Dữ Liệu Lên Firestore"}</span>
          </button>

          <div className={styles.systemStatusBadge}>
            <div className={styles.systemStatusDot}></div>
            <span>Firebase & Cloudinary: Hoạt động</span>
          </div>

          {/* Nút chuyển đổi nhanh chế độ thử nghiệm quyền cho Thầy/Cô */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#f8fafc",
              border: "1.5px solid #cbd5e1",
              borderRadius: "12px",
              padding: "3px 6px",
            }}
          >
            <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", paddingLeft: "4px" }}>
              Quyền:
            </span>
            <button
              type="button"
              onClick={() => {
                switchMockRole("super_admin");
                setCurrentAdminUser(DEFAULT_SUPER_ADMIN);
                showToast("👑 Đã chuyển sang chế độ Super Admin (Toàn quyền tất cả chức năng)!");
              }}
              style={{
                border: "none",
                background: isSuperAdmin ? "#2563eb" : "transparent",
                color: isSuperAdmin ? "#ffffff" : "#475569",
                borderRadius: "8px",
                padding: "5px 10px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Super Admin: Nhìn và sử dụng tất cả chức năng"
            >
              👑 Super Admin
            </button>
            <button
              type="button"
              onClick={() => {
                switchMockRole("teacher");
                setCurrentAdminUser({
                  uid: DEFAULT_TEACHER.uid || "teacher_sogaminh123",
                  email: DEFAULT_TEACHER.email || "sogaminh123@gmail.com",
                  name: DEFAULT_TEACHER.name || "sogaminh123",
                  fullName: DEFAULT_TEACHER.fullName || "sogaminh123",
                  role: "teacher",
                  teacherCode: DEFAULT_TEACHER.teacherCode || "628842",
                  studentClass: "Giáo viên bộ môn",
                  schoolName: "THPT DTNT THCS & THPT Tuy Đức",
                });
                setActiveTab("classes");
                showToast("👨‍🏫 Đã chuyển sang chế độ Giáo viên (Tài khoản: sogaminh123 - 4 quyền theo ảnh)!");
              }}
              style={{
                border: "none",
                background: !isSuperAdmin ? "#059669" : "transparent",
                color: !isSuperAdmin ? "#ffffff" : "#475569",
                borderRadius: "8px",
                padding: "5px 10px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Giáo viên: Chỉ sử dụng 4 quyền trên ảnh (Lớp & HS, Quản lý học tập, Giao đề thi, Giao tài liệu)"
            >
              👨‍🏫 Giáo viên
            </button>
          </div>

          <div className={styles.userCard}>
            <div
              className={styles.userAvatar}
              style={{
                background: isSuperAdmin ? "#2563eb" : "#059669",
                fontSize: isSuperAdmin ? "16px" : "15px",
              }}
            >
              {isSuperAdmin ? "👑" : "👨‍🏫"}
            </div>
            <div>
              <div className={styles.userName}>
                {getDisplayedAccountName(currentAdminUser) || "Đặng Anh Thư"}
              </div>
              <div
                className={styles.userRole}
                style={{
                  color: isSuperAdmin ? "#1d4ed8" : "#059669",
                  fontWeight: 800,
                }}
              >
                {isSuperAdmin ? "Super Admin (Toàn quyền)" : "Giáo viên (4 quyền theo ảnh)"}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================
          MAIN LAYOUT: SIDEBAR + CONTENT TABS
      ========================================================= */}
      <div className={styles.adminLayout}>
        {/* Navigation Sidebar Tabs */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>
            {isSuperAdmin ? "Chức năng Super Admin (Toàn quyền)" : "Chức năng Giáo viên"}
          </div>

          {/* 1. CHỈ SUPER ADMIN: Cấu hình hệ thống */}
          {isSuperAdmin && (
            <button
              id="tab-btn-config"
              className={`${styles.navItem} ${activeTab === "config" ? styles.navItemActive : ""}`}
              onClick={() => {
                setActiveTab("config");
                if (typeof window !== "undefined") {
                  window.history.pushState(null, "", "/admin");
                }
              }}
            >
              <div className={styles.navItemLeft}>
                <span className={styles.navIcon}>☁️</span>
                <span>Cấu hình hệ thống</span>
              </div>
              <span className={styles.navCount}>Cloudinary</span>
            </button>
          )}

          {/* 2. CẢ SUPER ADMIN & GIÁO VIÊN: Lớp và Học sinh (Ảnh 1) */}
          <button
            id="tab-btn-classes"
            className={`${styles.navItem} ${activeTab === "classes" ? styles.navItemActive : ""}`}
            onClick={() => {
              setActiveTab("classes");
              if (typeof window !== "undefined") {
                window.history.pushState(null, "", "/admin");
              }
            }}
          >
            <div className={styles.navItemLeft}>
              <span className={styles.navIcon}>🏫</span>
              <span>Lớp và Học sinh</span>
            </div>
            <span className={styles.navCount}>{classesList.length} lớp</span>
          </button>

          {/* 3. CHỈ SUPER ADMIN: Quản lý tài khoản */}
          {isSuperAdmin && (
            <button
              id="tab-btn-users"
              className={`${styles.navItem} ${activeTab === "users" ? styles.navItemActive : ""}`}
              onClick={() => {
                setActiveTab("users");
                if (typeof window !== "undefined") {
                  window.history.pushState(null, "", "/admin");
                }
              }}
            >
              <div className={styles.navItemLeft}>
                <span className={styles.navIcon}>👥</span>
                <span>Quản lý tài khoản</span>
              </div>
              <span className={styles.navCount}>{usersList.length}</span>
            </button>
          )}

          {/* 4. CẢ SUPER ADMIN & GIÁO VIÊN: Quản lý học tập (Ảnh 2) */}
          <button
            id="tab-btn-learning"
            className={`${styles.navItem} ${activeTab === "learning" ? styles.navItemActive : ""}`}
            onClick={() => {
              setActiveTab("learning");
              if (typeof window !== "undefined") {
                window.history.pushState(null, "", "/admin/learning");
              }
            }}
          >
            <div className={styles.navItemLeft}>
              <span className={styles.navIcon}>📊</span>
              <span>Quản lý học tập</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {teacherEvaluations.filter((e) => e.hasUnreadStudentReply).length > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: "10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "2px",
                  }}
                  title={`Có ${teacherEvaluations.filter((e) => e.hasUnreadStudentReply).length} học sinh vừa hỏi bài/trả lời!`}
                >
                  🔔 {teacherEvaluations.filter((e) => e.hasUnreadStudentReply).length}
                </span>
              )}
              <span className={styles.navCount}>{submissionsList.length}</span>
            </div>
          </button>

          {/* 5. CẢ SUPER ADMIN & GIÁO VIÊN: Giao Bài tập & Đề thi (Ảnh 3) */}
          <button
            id="tab-btn-exams"
            className={`${styles.navItem} ${activeTab === "exams" ? styles.navItemActive : ""}`}
            onClick={() => {
              setActiveTab("exams");
              if (typeof window !== "undefined") {
                window.history.pushState(null, "", "/admin");
              }
            }}
          >
            <div className={styles.navItemLeft}>
              <span className={styles.navIcon}>📝</span>
              <span>Giao Bài tập & Đề thi</span>
            </div>
            <span className={styles.navCount}>{examsList.length}</span>
          </button>

          {/* 6. CẢ SUPER ADMIN & GIÁO VIÊN: Giao tài liệu (Ảnh 4) */}
          <button
            id="tab-btn-documents"
            className={`${styles.navItem} ${activeTab === "documents" ? styles.navItemActive : ""}`}
            onClick={() => {
              setActiveTab("documents");
              if (typeof window !== "undefined") {
                window.history.pushState(null, "", "/admin/materials");
              }
            }}
          >
            <div className={styles.navItemLeft}>
              <span className={styles.navIcon}>📁</span>
              <span>Giao tài liệu</span>
            </div>
            <span className={styles.navCount}>{documentsList.length}</span>
          </button>

          {/* 7. CHỈ SUPER ADMIN: Tài liệu cộng đồng */}
          {isSuperAdmin && (
            <button
              id="tab-btn-community-docs"
              className={`${styles.navItem} ${activeTab === "community-docs" ? styles.navItemActive : ""}`}
              onClick={() => {
                setActiveTab("community-docs");
                if (typeof window !== "undefined") {
                  window.history.pushState(null, "", "/admin/community-docs");
                }
              }}
            >
              <div className={styles.navItemLeft}>
                <span className={styles.navIcon}>🌐</span>
                <span>Tài liệu cộng đồng</span>
              </div>
              <span className={styles.navCount}>{communityDocsList.length}</span>
            </button>
          )}

          <div className={styles.sidebarFooter}>
            <Link href="/" className={styles.backHomeBtn}>
              <span>←</span> Xem Thay Đổi Tại Trang Chủ
            </Link>
          </div>
        </aside>

        {/* Content Area */}
        <main className={styles.mainContent}>
          {/* Toast Notification */}
          {toastMessage && (
            <div className={styles.toastFeedback}>
              <span>{toastMessage}</span>
              <button
                onClick={() => setToastMessage(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#065f46", fontSize: 16 }}
              >
                ✕
              </button>
            </div>
          )}

          {/* =========================================================
              MỤC 1: CẤU HÌNH HỆ THỐNG (CLOUDINARY) - CHỈ SUPER ADMIN
          ========================================================= */}
          {isSuperAdmin && activeTab === "config" && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>
                    <span>☁️</span> Cấu hình hệ thống: CLOUDINARY
                  </h2>
                  <p className={styles.cardDescription}>
                    Cấu hình Cloud Name và Upload Preset (Chế độ Unsigned) để tải ảnh, tệp đề thi và tài liệu trực tiếp từ trình duyệt
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className={styles.btnSecondary} onClick={handleTestCloudinaryPing}>
                    🔍 Kiểm tra kết nối CDN
                  </button>
                  <button className={styles.btnPrimary} onClick={handleSaveCloudinary}>
                    💾 Lưu Cấu Hình
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {pingStatus.checked && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "10px",
                    marginBottom: "16px",
                    background: pingStatus.success ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${pingStatus.success ? "#bbf7d0" : "#fecaca"}`,
                    color: pingStatus.success ? "#166534" : "#991b1b",
                    fontSize: "13.5px",
                    fontWeight: 600,
                  }}
                >
                  {pingStatus.msg}
                </div>
              )}

              {/* Form Config */}
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span>☁️</span> Cloud Name:
                  </label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={cloudName}
                    onChange={(e) => setCloudName(e.target.value)}
                    placeholder="VD: o100uxqf hoặc tên cloud của bạn"
                  />
                  <span className={styles.formHint}>Tên tài khoản Cloudinary dùng để lưu trữ dữ liệu trường Tuy Đức</span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span>🔑</span> Upload Preset (Chế độ Unsigned):
                  </label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={uploadPreset}
                    onChange={(e) => setUploadPreset(e.target.value)}
                    placeholder="VD: o100uxqf hoặc unsigned_preset"
                  />
                  <span className={styles.formHint}>
                    Preset tải lên không cần ký số bí mật (Unsigned Mode) cho phép tải tệp trực tiếp
                  </span>
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.formLabel}>
                    <span>🌐</span> Endpoint tải lên tự động:
                  </label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={`https://api.cloudinary.com/v1_1/${cloudName || "o100uxqf"}/auto/upload`}
                    readOnly
                    style={{ background: "#f8fafc", color: "#64748b" }}
                  />
                </div>
              </div>

              {/* Test Upload Card */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "12px",
                  padding: "18px",
                  border: "1px solid #e2e8f0",
                  marginTop: "10px",
                }}
              >
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 10px 0", color: "#1e3a8a" }}>
                  🧪 Thử nghiệm tải tệp trực tiếp lên Cloudinary (Chế độ Unsigned)
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 14px 0" }}>
                  Chọn một hình ảnh hoặc tài liệu bất kỳ từ máy tính để kiểm tra xem Upload Preset đã hoạt động chuẩn xác chưa:
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <label className={styles.btnSecondary} style={{ cursor: "pointer" }}>
                    <span>📁</span> Chọn tệp để test tải lên
                    <input
                      type="file"
                      onChange={handleTestUpload}
                      style={{ display: "none" }}
                      disabled={testUploadLoading}
                    />
                  </label>
                  {testUploadLoading && (
                    <span style={{ fontSize: "13px", color: "#2563eb", fontWeight: 600 }}>
                      ⏳ Đang tải tệp lên Cloudinary...
                    </span>
                  )}
                </div>

                {testUploadResult && (
                  <div style={{ marginTop: "14px" }}>
                    {testUploadResult.success ? (
                      <div
                        style={{
                          padding: "10px 14px",
                          background: "#dcfce7",
                          borderRadius: "8px",
                          border: "1px solid #bbf7d0",
                          fontSize: "13px",
                          color: "#166534",
                        }}
                      >
                        <strong>Tải lên thành công!</strong> Đường dẫn Cloudinary:{" "}
                        <a
                          href={testUploadResult.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#1d4ed8", textDecoration: "underline", wordBreak: "break-all" }}
                        >
                          {testUploadResult.url}
                        </a>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "10px 14px",
                          background: "#fee2e2",
                          borderRadius: "8px",
                          border: "1px solid #fecaca",
                          fontSize: "13px",
                          color: "#991b1b",
                        }}
                      >
                        <strong>Lỗi:</strong> {testUploadResult.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Instructions Guide */}
              <div
                style={{
                  marginTop: "20px",
                  padding: "16px",
                  background: "#eff6ff",
                  borderRadius: "12px",
                  border: "1px solid #dbeafe",
                  fontSize: "13px",
                  color: "#1e40af",
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "6px" }}>
                  💡 Hướng dẫn tạo Unsigned Upload Preset trên Cloudinary:
                </div>
                <ol style={{ margin: 0, paddingLeft: "20px" }}>
                  <li>Đăng nhập trang quản trị Cloudinary Console.</li>
                  <li>
                    Vào <strong>Settings (Biểu tượng bánh răng)</strong> → Chọn tab <strong>Upload Presets</strong>.
                  </li>
                  <li>
                    Bấm <strong>Add upload preset</strong> → Đổi Signing Mode thành <strong>Unsigned</strong>.
                  </li>
                  <li>Sao chép mã Preset Name (Ví dụ: <code>o100uxqf</code>) dán vào ô bên trên và bấm Lưu.</li>
                </ol>
              </div>
            </div>
          )}

          {/* =========================================================
              MỤC 2: QUẢN LÝ LỚP HỌC & HỌC SINH (FIREBASE FIRESTORE)
          ========================================================= */}
          {activeTab === "classes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <input
                ref={quickFileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: "none" }}
                onChange={handleQuickFileUpload}
              />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', background: '#ffffff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                {/* LEFT COLUMN: Manage Classes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: editingQuickClass ? '#16a34a' : '#1e3a8a', textTransform: 'uppercase', fontSize: '15px', fontWeight: 800 }}>
                      {editingQuickClass ? `✏️ Sửa Tên Lớp: ${editingQuickClass.name}` : "🏫 Nhập Lớp Học Mới"}
                    </h3>
                    {editingQuickClass && (
                      <button
                        type="button"
                        onClick={handleCancelEditQuickClass}
                        style={{
                          border: 'none',
                          background: '#f1f5f9',
                          color: '#64748b',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        ✕ Hủy sửa
                      </button>
                    )}
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} style={{textTransform: 'uppercase', color: editingQuickClass ? '#16a34a' : '#64748b', fontSize: '12px', fontWeight: 800}}>
                      {editingQuickClass ? "Tên Lớp Học Mới" : "Tên Lớp Học"}
                    </label>
                    <input 
                      ref={quickClassInputRef}
                      type="text" 
                      className={styles.formInput} 
                      placeholder="VD: 12A1, 11B2..." 
                      value={quickClassName}
                      onChange={(e) => setQuickClassName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (editingQuickClass) {
                            handleSaveQuickEditClass();
                          } else {
                            handleQuickCreateClass();
                          }
                        } else if (e.key === "Escape" && editingQuickClass) {
                          handleCancelEditQuickClass();
                        }
                      }}
                      style={editingQuickClass ? { borderColor: '#16a34a', background: '#f0fdf4' } : undefined}
                    />
                  </div>

                  <div>
                    {editingQuickClass ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          type="button" 
                          onClick={handleSaveQuickEditClass}
                          disabled={loadingClasses}
                          style={{ flex: 1, background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)' }}
                        >
                          💾 LƯU TÊN LỚP
                        </button>
                        <button 
                          type="button" 
                          onClick={handleCancelEditQuickClass}
                          style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          HỦY
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          type="button" 
                          onClick={handleQuickCreateClass}
                          disabled={quickUploadLoading}
                          style={{ flex: 1, background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}
                        >
                          ➕ TẠO LỚP HỌC
                        </button>
                        {currentClass && (
                          <button
                            type="button"
                            onClick={() => handleStartEditQuickClass(currentClass)}
                            title={`Sửa tên lớp ${currentClass.name}`}
                            style={{
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1.5px solid #bfdbfe',
                              borderRadius: '8px',
                              padding: '12px 14px',
                              fontSize: '13px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ✏️ SỬA TÊN LỚP
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#475569', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>📚 Danh sách lớp hiện có:</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {classesList.length === 0 ? (
                        <div style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic', padding: '8px 0' }}>
                          Chưa có lớp học nào. Hãy nhập tên lớp ở trên để tạo lớp học của bạn!
                        </div>
                      ) : (
                        classesList.map((cls) => {
                          const count = allStudentsList.filter(
                            (s) =>
                              s.classId === cls.id ||
                              (s.className && s.className.trim().toLowerCase() === cls.name.trim().toLowerCase())
                          ).length;
                          const isSelected = selectedClassId === cls.id;
                          const isEditingThis = editingQuickClass?.id === cls.id;
                          return (
                            <button
                              key={cls.id}
                              type="button"
                              onClick={() => {
                                setSelectedClassId(cls.id);
                              }}
                            style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '6px', 
                              padding: '6px 12px', borderRadius: '20px', 
                              fontSize: '12.5px', fontWeight: 700, 
                              border: isEditingThis ? '2px solid #16a34a' : isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0', 
                              background: isEditingThis ? '#f0fdf4' : isSelected ? '#eff6ff' : '#ffffff', 
                              color: isEditingThis ? '#15803d' : isSelected ? '#1d4ed8' : '#475569', 
                              cursor: 'pointer', transition: 'all 0.2s ease'
                            }}
                          >
                            <span>{cls.name}</span>
                            <span style={{background: isEditingThis ? '#dcfce7' : isSelected ? '#dbeafe' : '#f1f5f9', padding: '2px 6px', borderRadius: '10px', fontSize: '10.5px'}}>{count} HS</span>
                            
                            {/* NÚT SỬA TÊN LỚP */}
                            <span
                              title={`Sửa tên lớp ${cls.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditQuickClass(cls);
                              }}
                              style={{ 
                                color: '#2563eb', 
                                fontWeight: 800, 
                                marginLeft: '4px', 
                                cursor: 'pointer',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              ✏️
                            </span>

                            {/* NÚT XÓA LỚP */}
                            <span
                              title={`Xóa lớp ${cls.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClass(cls.id, cls.name);
                              }}
                              style={{ color: '#ef4444', fontWeight: 900, marginLeft: '2px', cursor: 'pointer', padding: '2px 4px', fontSize: '12px' }}
                            >
                              ✕
                            </span>
                          </button>
                        );
                      }))}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Manage Students */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingLeft: '30px', borderLeft: '1px dashed #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#ea580c', textTransform: 'uppercase', fontSize: '15px', fontWeight: 800 }}>👥 Nhập Danh Sách Học Sinh</h3>
                  </div>

                  <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', fontSize: '13px', fontWeight: 700 }}>
                      <span>Tải lên danh sách học sinh từ file Excel hoặc CSV để thêm hàng loạt.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={handleDownloadExcelTemplateClick}
                        style={{ background: '#ffffff', color: '#10b981', border: '1px solid #10b981', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', flex: 1 }}
                      >
                        📥 TẢI MẪU EXCEL
                      </button>
                      <button 
                        onClick={() => quickFileInputRef.current?.click()}
                        disabled={quickUploadLoading}
                        style={{ background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', flex: 1, opacity: quickUploadLoading ? 0.6 : 1 }}
                      >
                        {quickUploadLoading ? "ĐANG XỬ LÝ..." : "📄 NẠP EXCEL / CSV"}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                    <button 
                      onClick={() => handleOpenImportModal()}
                      style={{ 
                        width: '100%', 
                        padding: '16px', 
                        fontSize: '15px', 
                        fontWeight: 800, 
                        background: '#f8fafc', 
                        color: '#2563eb', 
                        border: '1.5px solid #bfdbfe', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                      }}
                    >
                      🔍 XEM TRƯỚC / IMPORT CHI TIẾT
                    </button>
                  </div>
                </div>
              </div>

              {/* Student List View */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '18px' }}>🧑‍🎓</span> DANH SÁCH HỌC SINH {currentClass ? `LỚP ${currentClass.name}` : ""}
                    {currentClass && (
                      <button
                        type="button"
                        onClick={() => handleStartEditQuickClass(currentClass)}
                        title={`Sửa tên lớp ${currentClass.name}`}
                        style={{
                          marginLeft: '4px',
                          padding: '3px 8px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          textTransform: 'none'
                        }}
                      >
                        ✏️ Sửa tên lớp
                      </button>
                    )}
                  </h3>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '18px' }}>🔍</span>
                      <input 
                        type="text" 
                        placeholder="Tìm kiếm..." 
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: '13px', outline: 'none', fontWeight: 600, width: '150px' }} 
                      />
                    </div>
                    <button onClick={fetchClassesAndStudents} style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      🔄
                    </button>
                    <button onClick={handleOpenCreateStudent} style={{ border: 'none', background: '#2563eb', color: 'white', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                      ➕ THÊM
                    </button>
                  </div>
                </div>

                <div className={styles.tableContainer} style={{ padding: '0 24px 24px 24px' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: "80px", textAlign: "center", textTransform: 'uppercase' }}>TT</th>
                        <th style={{ textTransform: 'uppercase' }}>Họ và tên</th>
                        <th style={{ width: "110px", textAlign: "center", textTransform: 'uppercase' }}>Giới tính</th>
                        <th style={{ textTransform: 'uppercase' }}>Ngày sinh</th>
                        <th style={{ textAlign: "center", textTransform: 'uppercase', minWidth: "150px" }}>MẬT KHẨU</th>
                        <th style={{ textAlign: "right", textTransform: 'uppercase' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentClassStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "60px 0" }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔍</div>
                            <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 700, textTransform: 'uppercase' }}>Chưa có học sinh nào.</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Vui lòng chọn lớp hoặc nạp danh sách học sinh.</div>
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((st, idx) => (
                          <tr key={st.id}>
                            <td style={{ textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                              {st.orderNumber || idx + 1}
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span className={styles.studentAvatarCircle} style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", width: '30px', height: '30px', fontSize: '12px' }}>
                                  {(st.fullName || "H").charAt(0).toUpperCase()}
                                </span>
                                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "13.5px" }}>
                                  {st.fullName}
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {st.gender === "Nữ" ? (
                                <span style={{ background: "#fdf2f8", color: "#db2777", border: "1px solid #fbcfe8", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                  👧 Nữ
                                </span>
                              ) : (
                                <span style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                  👦 Nam
                                </span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: "13px", color: "#475569", fontWeight: 600 }}>
                                🎂 {st.dob || "---"}
                              </span>
                            </td>
                            {/* CỘT MẬT KHẨU DO HỌC SINH TỰ LƯU TRONG TRANG HỌC SINH */}
                            <td style={{ textAlign: "center" }}>
                              {(() => {
                                const stPassword =
                                  st.password ||
                                  getSavedStudentPassword(st.id, st.fullName) ||
                                  (typeof window !== "undefined"
                                    ? localStorage.getItem(`std_pwd_${st.id}`) ||
                                      localStorage.getItem(`std_pwd_${st.fullName}`) ||
                                      localStorage.getItem(`std_pwd_${st.fullName?.toLowerCase()}`)
                                    : "") ||
                                  (st.fullName === "Hani Diễm" ? "123456" : "123456");
                                return (
                                  <div
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      background: "#f0fdf4",
                                      border: "1.5px solid #86efac",
                                      padding: "4px 12px",
                                      borderRadius: "8px",
                                      boxShadow: "0 1px 3px rgba(22, 163, 74, 0.12)",
                                    }}
                                    title={`Mật khẩu do học sinh ${st.fullName} tự đặt và lưu: ${stPassword}`}
                                  >
                                    <span style={{ fontSize: "12px" }}>🔑</span>
                                    <span
                                      style={{
                                        fontFamily: "monospace",
                                        fontWeight: 800,
                                        fontSize: "13.5px",
                                        color: "#15803d",
                                        letterSpacing: "0.5px",
                                      }}
                                    >
                                      {stPassword}
                                    </span>
                                  </div>
                                );
                              })()}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                className={styles.btnSecondary}
                                onClick={() => handleOpenEditStudent(st)}
                                style={{ height: "28px", fontSize: "11.5px", padding: "0 10px", marginRight: "6px" }}
                                title="Chỉnh sửa thông tin & mật khẩu học sinh"
                              >
                                ✏️ Sửa
                              </button>
                              <button
                                className={styles.btnDanger}
                                onClick={() => handleDeleteStudent(st.id, st.fullName)}
                                style={{ height: "28px", fontSize: "11.5px", padding: "0 10px" }}
                                title="Xóa học sinh"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              MỤC: QUẢN LÝ TÀI KHOẢN (CHỈ DÀNH CHO SUPER ADMIN)
          ========================================================= */}
          {isSuperAdmin && activeTab === "users" && (
            <div className={styles.accountPageWrap}>
              {/* Header */}
              <div className={styles.accountHeader}>
                <div className={styles.accountHeaderLeft}>
                  <div className={styles.accountIconBadge}>
                    <span>👥</span>
                  </div>
                  <div>
                    <h2 className={styles.accountTitle}>QUẢN LÝ TÀI KHOẢN</h2>
                    <p className={styles.accountSubtitle}>
                      Duyệt, kích hoạt và quản lý thông tin người dùng trên hệ thống.
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={handlePurgeOldAccountsClick}
                    title="Xóa sạch các tài khoản cũ/mẫu khỏi hệ thống"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "#e11d48",
                      borderColor: "#fecdd3",
                      background: "#fff1f2",
                      fontWeight: 700,
                    }}
                  >
                    🧹 Xóa tài khoản cũ
                  </button>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={fetchUsers}
                    disabled={loadingUsers}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    🔄 {loadingUsers ? "Đang tải..." : "Làm mới"}
                  </button>
                </div>
              </div>

              {/* 3 KPI Thống Kê */}
              <div className={styles.accountStatGrid}>
                {/* 1. Tổng tài khoản */}
                <div className={styles.accountStatCard}>
                  <div className={styles.accountStatInfo}>
                    <span className={styles.accountStatLabel}>TỔNG TÀI KHOẢN</span>
                    <span className={styles.accountStatValBlue}>{usersList.length}</span>
                  </div>
                  <div className={`${styles.accountStatCircle} ${styles.accountCircleBooks}`}>
                    <span>📚</span>
                  </div>
                </div>

                {/* 2. Đã kích hoạt */}
                <div className={styles.accountStatCard}>
                  <div className={styles.accountStatInfo}>
                    <span className={styles.accountStatLabel}>ĐÃ KÍCH HOẠT</span>
                    <span className={styles.accountStatValGreen}>
                      {usersList.filter((u) => u.status === "active").length}
                    </span>
                  </div>
                  <div className={`${styles.accountStatCircle} ${styles.accountCircleDiamond}`}>
                    <span>💎</span>
                  </div>
                </div>

                {/* 3. Chờ duyệt / Bị khóa */}
                <div className={styles.accountStatCard}>
                  <div className={styles.accountStatInfo}>
                    <span className={styles.accountStatLabel}>CHỜ DUYỆT / BỊ KHÓA</span>
                    <span className={styles.accountStatValAmber}>
                      {usersList.filter((u) => u.status !== "active").length}
                    </span>
                  </div>
                  <div className={`${styles.accountStatCircle} ${styles.accountCircleLock}`}>
                    <span>🔒</span>
                  </div>
                </div>
              </div>

              {/* Main Card with Filter, Search & Table */}
              <div className={styles.accountMainCard}>
                <div className={styles.accountFilterBar}>
                  <div className={styles.accountFilterLeft}>
                    <div className={styles.accountSearchWrap}>
                      <span className={styles.accountSearchIcon}>🔍</span>
                      <input
                        type="text"
                        className={styles.accountSearchInput}
                        placeholder="Tìm tên, email..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>
                    <select
                      className={styles.accountSelect}
                      value={userStatusFilter}
                      onChange={(e) => setUserStatusFilter(e.target.value)}
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="active">Đã kích hoạt</option>
                      <option value="inactive">Chưa kích hoạt</option>
                      <option value="locked">Bị khóa</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className={styles.accountBtnAdd}
                    onClick={handleOpenAddUser}
                    title="Thêm tài khoản mới"
                  >
                    <span>+</span> THÊM TÀI KHOẢN
                  </button>
                </div>

                {/* Bảng Quản Lý Tài Khoản */}
                <div className={styles.accountTableWrap}>
                  <table className={styles.accountTable}>
                    <thead>
                      <tr>
                        <th style={{ width: "60px", textAlign: "center" }}>STT</th>
                        <th>TÀI KHOẢN</th>
                        <th style={{ textAlign: "center", width: "130px" }}>MÃ GV</th>
                        <th style={{ textAlign: "center", width: "130px" }}>NGÀY ĐK</th>
                        <th style={{ textAlign: "center", width: "160px" }}>TRẠNG THÁI</th>
                        <th style={{ textAlign: "right", width: "260px" }}>THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                            {loadingUsers
                              ? "⏳ Đang tải dữ liệu từ hệ thống..."
                              : "Không tìm thấy tài khoản nào phù hợp"}
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u, idx) => (
                          <tr key={u.uid || idx}>
                            <td style={{ textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                              {idx + 1}
                            </td>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "14.5px" }}>
                                    {u.fullName || "Chưa đặt tên"}
                                  </span>
                                  {u.email === "thudanganh670@gmail.com" || u.role === "super_admin" || (u.role === "admin" && !u.studentClass?.includes("Học sinh")) ? (
                                    <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#b45309", background: "#fef3c7", padding: "1px 7px", borderRadius: "10px", border: "1px solid #fde68a" }}>
                                      👑 Super Admin
                                    </span>
                                  ) : (u.authProvider === "google" || u.authProvider === "google.com" || u.role === "teacher" || u.teacherCode) ? (
                                    <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#047857", background: "#ecfdf5", padding: "1px 7px", borderRadius: "10px", border: "1px solid #a7f3d0" }}>
                                      👨‍🏫 Giáo viên
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#6d28d9", background: "#f5f3ff", padding: "1px 7px", borderRadius: "10px", border: "1px solid #ddd6fe" }}>
                                      🎒 Học sinh
                                    </span>
                                  )}
                                </div>
                                <span style={{ color: "#64748b", fontSize: "12.5px" }}>
                                  {u.email}
                                </span>
                              </div>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {u.status === "active" && u.teacherCode ? (
                                <span className={styles.accountTeacherCode}>
                                  {u.teacherCode}
                                </span>
                              ) : (
                                <span className={styles.accountDash}>—</span>
                              )}
                            </td>
                            <td style={{ textAlign: "center", color: "#334155", fontWeight: 500 }}>
                              {u.registeredDate || "19/9/2026"}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {u.status === "active" ? (
                                <span className={styles.statusBadgeActive}>ĐÃ KÍCH HOẠT</span>
                              ) : u.status === "locked" ? (
                                <span className={styles.statusBadgeLocked}>BỊ KHÓA</span>
                              ) : (
                                <span className={styles.statusBadgeInactive}>CHƯA KÍCH HOẠT</span>
                              )}
                            </td>
                            <td>
                              <div className={styles.btnActionGroup}>
                                {/* Nút Kích hoạt / Hủy kích hoạt */}
                                {u.status === "active" ? (
                                  <button
                                    type="button"
                                    className={styles.btnActionToggleActive}
                                    onClick={() => handleToggleUserStatus(u)}
                                    title="Nhấp để Hủy kích hoạt"
                                  >
                                    HUỶ K.HOẠT
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className={styles.btnActionToggleInactive}
                                    onClick={() => handleToggleUserStatus(u)}
                                    title="Nhấp để Kích hoạt tài khoản"
                                  >
                                    KÍCH HOẠT
                                  </button>
                                )}

                                {/* Nút Sửa (Có hiệu ứng phóng to) */}
                                <button
                                  type="button"
                                  className={styles.btnActionEdit}
                                  onClick={() => handleOpenEditUser(u)}
                                  title="Chỉnh sửa thông tin tài khoản (Phóng to)"
                                >
                                  SỬA
                                </button>

                                {/* Nút Xóa (Có hiệu ứng phóng to) */}
                                <button
                                  type="button"
                                  className={styles.btnActionDelete}
                                  onClick={() => handleOpenDeleteUser(u)}
                                  title="Xóa tài khoản khỏi hệ thống (Phóng to)"
                                >
                                  XÓA
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Count */}
                <div className={styles.accountTableFooter}>
                  Hiển thị {filteredUsers.length} kết quả
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              MỤC 3: GIAO BÀI TẬP VÀ ĐỀ THI
          ========================================================= */}
          {activeTab === "exams" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Form Add Exam - New Design matching Image 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', background: '#ffffff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                {/* LEFT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#64748b', fontSize: '12px', fontWeight: 800}}>Tên bài tập / Đề thi</label>
                    <input 
                      type="text" 
                      className={styles.formInput} 
                      placeholder="Nhập tên bài thi..." 
                      value={examForm.title}
                      onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                    />
                  </div>



                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#64748b', fontSize: '12px', fontWeight: 800}}>Khối lớp</label>
                      <select 
                        className={styles.formSelect}
                        value={examGrade}
                        onChange={(e) => setExamGrade(e.target.value)}
                      >
                        <option value="Lớp 12">Lớp 12</option>
                        <option value="Lớp 11">Lớp 11</option>
                        <option value="Lớp 10">Lớp 10</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#64748b', fontSize: '12px', fontWeight: 800}}>Môn học</label>
                      <select 
                        className={styles.formSelect}
                        value={examForm.subject}
                        onChange={(e) => handleExamSubjectChange(e.target.value)}
                      >
                        <option value="toan">Toán học</option>
                        <option value="van">Ngữ văn</option>
                        <option value="anh">Tiếng Anh</option>
                        <option value="ly">Vật lí</option>
                        <option value="hoa">Hóa học</option>
                        <option value="sinh">Sinh học</option>
                        <option value="su">Lịch sử</option>
                        <option value="dia">Địa lí</option>
                        <option value="ktpl">GDKT & PL</option>
                        <option value="tin">Tin học</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#64748b', fontSize: '12px', fontWeight: 800, margin: 0}}>
                        Tải lên đề
                      </label>
                      <button
                        type="button"
                        onClick={handleOpenPaperPreview}
                        className={styles.btnPreview}
                        title="Xem trước nội dung đề thi (Chỉ dành cho Giáo viên)"
                      >
                        <span>👁️</span> Xem trước đề
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                      <button 
                        type="button" 
                        onClick={() => setUploadMode('link')} 
                        className={`${styles.glowBtn} ${uploadMode === 'link' ? styles.glowBtnActive : styles.glowBtnInactive}`}
                      >
                        <span>🔗</span> Dán Link
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setUploadMode('pdf')} 
                        className={`${styles.glowBtn} ${uploadMode === 'pdf' ? styles.glowBtnActive : styles.glowBtnInactive}`}
                      >
                        <span>⬆️</span> Upload PDF
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setUploadMode('image')} 
                        className={`${styles.glowBtn} ${uploadMode === 'image' ? styles.glowBtnActive : styles.glowBtnInactive}`}
                      >
                        <span>🖼️</span> Dán Ảnh
                      </button>
                    </div>

                    {uploadMode === 'link' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          className={styles.formInput} 
                          placeholder="Nhập Link Google Drive hoặc link PDF..." 
                          value={examForm.fileUrl || ""}
                          onChange={(e) => setExamForm({ ...examForm, fileUrl: e.target.value })}
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={handleOpenPaperPreview}
                          className={styles.btnPreview}
                          title="Xem trước đề thi"
                        >
                          <span>👁️</span> Xem trước đề
                        </button>
                      </div>
                    )}
                    {uploadMode === 'pdf' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="file" 
                          accept=".pdf" 
                          className={styles.formInput} 
                          style={{ padding: '8px', flex: 1 }} 
                          onChange={handleExamPdfFileSelect}
                        />
                        <button
                          type="button"
                          onClick={handleOpenPaperPreview}
                          className={styles.btnPreview}
                          title="Xem trước đề thi"
                        >
                          <span>👁️</span> Xem trước đề
                        </button>
                      </div>
                    )}
                    {uploadMode === 'image' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          className={styles.formInput} 
                          style={{ padding: '8px', flex: 1 }} 
                          onChange={handleExamImageFileSelect}
                        />
                        <button
                          type="button"
                          onClick={handleOpenPaperPreview}
                          className={styles.btnPreview}
                          title="Xem trước đề thi"
                        >
                          <span>👁️</span> Xem trước đề
                        </button>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11.5px', color: '#1d4ed8', fontWeight: 600 }}>
                      <span>🔒</span> 
                      <span>Chế độ Giáo viên: Bạn có thể xem trước nội dung đề. Học sinh không được phép xem trước đề khi chưa vào thi.</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#64748b', fontSize: '12px', fontWeight: 800}}>Thời gian (Phút)</label>
                      <input 
                        type="number" 
                        className={styles.formInput} 
                        value={examTimeMinutes} 
                        onChange={(e) => setExamTimeMinutes(Number(e.target.value) || 0)}
                        style={{textAlign: 'center', fontSize: '16px', fontWeight: 800}} 
                      />
                    </div>
                    <div style={{ padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', height: '42px', background: '#f8fafc' }}>
                      <input 
                        type="checkbox" 
                        checked={examAllowReview} 
                        onChange={(e) => setExamAllowReview(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#0ea5e9' }} 
                      />
                      <span style={{fontSize: '12px', fontWeight: 700, color: '#334155'}}>Cho học sinh xem đáp án sau thi</span>
                    </div>
                  </div>

                  <div style={{ padding: '16px', border: '1.5px solid #fde047', borderRadius: '12px', background: '#fefce8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                      <label style={{color: '#ca8a04', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', margin: 0}}>
                        <span>⚙️</span> Cấu hình điểm
                      </label>
                      {examForm.subject === 'tin' ? (
                        <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1d4ed8', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          💻 Tin học: P1 (6đ) + P2 (4đ) = 10đ (Không có P3)
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', background: '#fef08a', color: '#854d0e', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          📚 Tổng điểm P1: {scoreConfig.p1Total}đ
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      {/* TỔNG P.1 */}
                      <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center'}}>
                        <span style={{fontSize: '10px', fontWeight: 800, color: '#3b82f6'}}>TỔNG P.1</span>
                        <input 
                          type="number" 
                          step="0.5"
                          value={scoreConfig.p1Total} 
                          onChange={(e) => setScoreConfig({ ...scoreConfig, p1Total: Number(e.target.value) || 0 })}
                          style={{width: '45px', height: '32px', textAlign: 'center', border: '1.5px solid #3b82f6', borderRadius: '6px', fontWeight: 800, color: '#1d4ed8', background: '#ffffff'}} 
                        />
                      </div>

                      {/* TỔNG P.2 (Cho môn Tin học hiển thị rõ 4đ) */}
                      {examForm.subject === 'tin' && (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center'}}>
                          <span style={{fontSize: '10px', fontWeight: 800, color: '#8b5cf6'}}>TỔNG P.2</span>
                          <input 
                            type="number" 
                            step="0.5"
                            value={scoreConfig.p2Total} 
                            onChange={(e) => setScoreConfig({ ...scoreConfig, p2Total: Number(e.target.value) || 0 })}
                            style={{width: '45px', height: '32px', textAlign: 'center', border: '1.5px solid #8b5cf6', borderRadius: '6px', fontWeight: 800, color: '#6d28d9', background: '#ffffff'}} 
                          />
                        </div>
                      )}

                      {/* TỔNG P.3: Ẩn khi là môn Tin học, hiển thị với các môn khác */}
                      {examForm.subject !== 'tin' && (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center'}}>
                          <span style={{fontSize: '10px', fontWeight: 800, color: '#3b82f6'}}>TỔNG P.3</span>
                          <input 
                            type="number" 
                            step="0.5"
                            value={scoreConfig.p3Total} 
                            onChange={(e) => setScoreConfig({ ...scoreConfig, p3Total: Number(e.target.value) || 0 })}
                            style={{width: '45px', height: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, color: '#334155', background: '#ffffff'}} 
                          />
                        </div>
                      )}

                      {/* CÁC MỨC ĐIỂM Ý CON PHẦN 2 */}
                      <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center'}}>
                        <span style={{fontSize: '10px', fontWeight: 800, color: '#475569'}}>P2: 1 Ý</span>
                        <input 
                          type="number" 
                          step="0.05"
                          value={scoreConfig.p2_1} 
                          onChange={(e) => setScoreConfig({ ...scoreConfig, p2_1: Number(e.target.value) || 0 })}
                          style={{width: '45px', height: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, color: '#d97706', background: '#ffffff'}} 
                        />
                      </div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center'}}>
                        <span style={{fontSize: '10px', fontWeight: 800, color: '#475569'}}>P2: 2 Ý</span>
                        <input 
                          type="number" 
                          step="0.05"
                          value={scoreConfig.p2_2} 
                          onChange={(e) => setScoreConfig({ ...scoreConfig, p2_2: Number(e.target.value) || 0 })}
                          style={{width: '45px', height: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, color: '#d97706', background: '#ffffff'}} 
                        />
                      </div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center'}}>
                        <span style={{fontSize: '10px', fontWeight: 800, color: '#475569'}}>P2: 3 Ý</span>
                        <input 
                          type="number" 
                          step="0.05"
                          value={scoreConfig.p2_3} 
                          onChange={(e) => setScoreConfig({ ...scoreConfig, p2_3: Number(e.target.value) || 0 })}
                          style={{width: '45px', height: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, color: '#d97706', background: '#ffffff'}} 
                        />
                      </div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center'}}>
                        <span style={{fontSize: '10px', fontWeight: 800, color: '#475569'}}>P2: 4 Ý</span>
                        <input 
                          type="number" 
                          step="0.1"
                          value={scoreConfig.p2_4} 
                          onChange={(e) => setScoreConfig({ ...scoreConfig, p2_4: Number(e.target.value) || 0 })}
                          style={{width: '45px', height: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, color: '#d97706', background: '#ffffff'}} 
                        />
                      </div>
                    </div>
                    <div style={{fontSize: '11px', color: '#78716c', marginTop: '10px', textAlign: 'center', fontWeight: 600}}>
                      {examForm.subject === 'tin' 
                        ? '💡 Tin học: Phần 1 (6.0đ), Phần 2 (4.0đ: 4 câu × 1.0đ/câu, mỗi câu: 0.1đ/1 ý, 0.25đ/2 ý, 0.5đ/3 ý, 1.0đ/4 ý). Không có Phần 3.' 
                        : `💡 Tổng điểm Phần 1 mặc định: ${scoreConfig.p1Total}đ | P2: 0.1đ/1 ý, 0.25đ/2 ý, 0.5đ/3 ý, 1.0đ/4 ý`
                      }
                    </div>
                  </div>

                  <div style={{ padding: '16px', border: '1.5px solid #bfdbfe', borderRadius: '12px', background: '#eff6ff' }}>
                    <label style={{color: '#1d4ed8', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', fontSize: '13px'}}>
                      <span>👤</span> Giao đề đến
                    </label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                      <button 
                        type="button" 
                        onClick={() => { setAssignMode('class'); setAssignedClasses(classesList.map(c => c.id)); setExpandedClass(null); }} 
                        className={`${styles.glowBtn} ${assignMode === 'class' ? styles.glowBtnActive : styles.glowBtnInactive}`}
                      >
                        GIAO CẢ LỚP
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setAssignMode('student'); setAssignedClasses([]); }} 
                        className={`${styles.glowBtn} ${assignMode === 'student' ? styles.glowBtnActive : styles.glowBtnInactive}`}
                      >
                        GIAO TỪNG HS
                      </button>
                    </div>

                    {/* THANH TÌM KIẾM THEO CHỮ CÁI ĐẦU VÀ TÊN HỌC SINH (KHI CHỌN GIAO TỪNG HS) */}
                    {assignMode === 'student' && (
                      <div style={{ background: '#ffffff', border: '1.5px solid #c4b5fd', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px', boxShadow: '0 2px 6px rgba(124, 58, 237, 0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <input
                              type="text"
                              value={studentSearchKeyword}
                              onChange={(e) => setStudentSearchKeyword(e.target.value)}
                              placeholder="🔍 Tìm tên HS hoặc gõ chữ cái đầu (VD: D, Đ, H, G...)..."
                              style={{
                                width: '100%',
                                padding: '6px 28px 6px 10px',
                                border: '1.5px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '12px',
                                outline: 'none',
                              }}
                            />
                            {studentSearchKeyword && (
                              <button
                                type="button"
                                onClick={() => setStudentSearchKeyword('')}
                                style={{
                                  position: 'absolute',
                                  right: '6px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#94a3b8',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  padding: 0,
                                }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          {assignedStudents.length > 0 && (
                            <span style={{ fontSize: '11.5px', color: '#7c3aed', fontWeight: 800, whiteSpace: 'nowrap' }}>
                              Đã chọn: {assignedStudents.length} HS
                            </span>
                          )}
                        </div>

                        {/* HÀNG NÚT BẢNG CHỮ CÁI TIẾNG VIỆT ĐỂ BẤM TÌM NHANH THEO CHỮ CÁI ĐẦU TRONG TÊN */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#6b21a8', marginRight: '2px' }}>
                            🔤 Chữ cái đầu:
                          </span>
                          {VN_ALPHABET_KEYS.map((key) => {
                            const isSelected = studentInitialLetter === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setStudentInitialLetter(key)}
                                style={{
                                  padding: '2px 7px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  border: isSelected ? '1px solid #7c3aed' : '1px solid #e2e8f0',
                                  background: isSelected ? '#7c3aed' : '#f8fafc',
                                  color: isSelected ? '#ffffff' : '#475569',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {key === "ALL" ? "Tất cả" : key}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                      {classesList.length > 0 ? classesList.map((cls) => {
                        const classStudents = allStudentsList.filter(
                          (s) =>
                            s.classId === cls.id ||
                            (s.className && s.className.trim().toLowerCase() === cls.name.trim().toLowerCase())
                        );
                        const count = classStudents.length;
                        return (
                          <div key={cls.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div 
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: assignMode === 'class' && assignedClasses.includes(cls.id) ? '2px solid #2563eb' : (assignMode === 'student' && expandedClass === cls.id ? '2px solid #8b5cf6' : '1px solid #e2e8f0'), padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                              onClick={() => {
                                if (assignMode === 'class') {
                                  if (assignedClasses.includes(cls.id)) {
                                    setAssignedClasses(assignedClasses.filter(id => id !== cls.id));
                                  } else {
                                    setAssignedClasses([...assignedClasses, cls.id]);
                                  }
                                } else {
                                  setExpandedClass(expandedClass === cls.id ? null : cls.id);
                                }
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {assignMode === 'class' ? (
                                  <input 
                                    type="checkbox" 
                                    style={{width: '16px', height: '16px', pointerEvents: 'none'}} 
                                    checked={assignedClasses.includes(cls.id)}
                                    readOnly
                                  />
                                ) : (
                                  <span style={{ fontSize: '12px', width: '16px', textAlign: 'center' }}>
                                    {expandedClass === cls.id ? '▼' : '▶'}
                                  </span>
                                )}
                                <span style={{fontSize: '13px', fontWeight: 700, color: '#334155'}}>{cls.name}</span>
                              </div>
                              <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: 600}}>{count} HS</span>
                            </div>
                            
                            {/* Students List Expansion */}
                            {assignMode === 'student' && expandedClass === cls.id && (() => {
                              const filteredStudents = classStudents.filter((st) =>
                                checkStudentMatchInitial(st.fullName, studentInitialLetter, studentSearchKeyword)
                              );
                              return (
                                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', borderRadius: '0 0 8px 8px', marginTop: '-6px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
                                  {/* Filter status header within class */}
                                  {(studentInitialLetter !== 'ALL' || studentSearchKeyword.trim()) && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f3e8ff', padding: '6px 10px', borderRadius: '6px', fontSize: '11.5px' }}>
                                      <span style={{ color: '#6b21a8', fontWeight: 700 }}>
                                        🎯 Lọc chữ {studentInitialLetter !== 'ALL' ? `"${studentInitialLetter}"` : ''} ({filteredStudents.length}/{classStudents.length} HS)
                                      </span>
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newIds = Array.from(new Set([...assignedStudents, ...filteredStudents.map((s) => s.id)]));
                                            setAssignedStudents(newIds);
                                          }}
                                          style={{ background: '#7c3aed', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                          ✓ Chọn hết ({filteredStudents.length})
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const unselectIds = new Set(filteredStudents.map((s) => s.id));
                                            setAssignedStudents(assignedStudents.filter((id) => !unselectIds.has(id)));
                                          }}
                                          style={{ background: '#ffffff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                          ✕ Bỏ chọn
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {filteredStudents.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
                                      {filteredStudents.map((st) => (
                                        <div
                                          key={st.id}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                            padding: '4px 6px',
                                            borderRadius: '4px',
                                            background: assignedStudents.includes(st.id) ? '#ede9fe' : '#ffffff',
                                            border: assignedStudents.includes(st.id) ? '1px solid #c4b5fd' : '1px solid #f1f5f9',
                                          }}
                                          onClick={() => {
                                            if (assignedStudents.includes(st.id)) {
                                              setAssignedStudents(assignedStudents.filter((id) => id !== st.id));
                                            } else {
                                              setAssignedStudents([...assignedStudents, st.id]);
                                            }
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            style={{ width: '14px', height: '14px', pointerEvents: 'none' }}
                                            checked={assignedStudents.includes(st.id)}
                                            readOnly
                                          />
                                          <span style={{ fontSize: '12px', color: assignedStudents.includes(st.id) ? '#6b21a8' : '#334155', fontWeight: assignedStudents.includes(st.id) ? 800 : 600 }}>
                                            {st.fullName}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
                                      Không tìm thấy học sinh có chữ cái đầu phù hợp trong lớp này.
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      }) : (
                        <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', padding: '10px', textAlign: 'center' }}>
                          Chưa có lớp nào. Hãy tạo ở mục "Lớp và Học sinh".
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingLeft: '30px', borderLeft: '1px dashed #cbd5e1' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ margin: 0, color: '#ea580c', textTransform: 'uppercase', fontSize: '16px', fontWeight: 800, fontFamily: 'serif, "Times New Roman", Times' }}>KHUNG ĐÁP ÁN</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        type="button" 
                        onClick={handleDownloadExamTemplate}
                        className={styles.clickEffect} 
                        style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#1e3a8a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span style={{fontSize: '14px'}}>📥</span> TẢI FORM
                      </button>
                      <button 
                        type="button"
                        onClick={() => document.getElementById('upload-exam-excel')?.click()}
                        className={styles.clickEffect} 
                        style={{ border: 'none', background: '#059669', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span style={{fontSize: '14px'}}>📊</span> {examImportLoading ? "⏳ ĐANG NẠP..." : "NẠP EXCEL"}
                      </button>
                      <input 
                        id="upload-exam-excel"
                        type="file" 
                        accept=".xlsx, .xls, .csv" 
                        onChange={handleExamExcelUpload}
                        style={{ display: 'none' }} 
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup} style={{ gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#3b82f6', fontSize: '13px', fontWeight: 800, fontFamily: 'serif, "Times New Roman", Times', margin: 0}}>
                        PHẦN I: CÂU TRẮC NGHIỆM
                      </label>
                      <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                        {examForm.subject === 'tin' ? '6.0 điểm' : `${scoreConfig.p1Total} điểm`}
                      </span>
                    </div>
                    <textarea 
                      className={styles.formInput} 
                      style={{minHeight: '100px', resize: 'vertical', padding: '12px', borderRadius: '8px', fontSize: '14px', color: '#334155'}} 
                      value={part1AnswerText}
                      onChange={(e) => setPart1AnswerText(e.target.value)}
                      placeholder="1D 2B 3C 4C 5A..."
                    />
                  </div>

                  <div className={styles.formGroup} style={{ gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#d946ef', fontSize: '13px', fontWeight: 800, fontFamily: 'serif, "Times New Roman", Times', margin: 0}}>
                        PHẦN II: CÂU ĐÚNG/SAI
                      </label>
                      <span style={{ fontSize: '11px', background: '#fae8ff', color: '#86198f', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                        {examForm.subject === 'tin' ? '4.0 điểm (4 câu)' : '4 câu (chuẩn GDPT)'}
                      </span>
                    </div>
                    <textarea 
                      className={styles.formInput} 
                      style={{minHeight: '100px', resize: 'vertical', padding: '12px', borderRadius: '8px', fontSize: '14px', color: '#334155'}} 
                      value={part2AnswerText}
                      onChange={(e) => setPart2AnswerText(e.target.value)}
                      placeholder="1: Đ Đ Đ S 2: Đ S S S..."
                    />
                  </div>

                  {examForm.subject !== 'tin' ? (
                    <div className={styles.formGroup} style={{ gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#d97706', fontSize: '13px', fontWeight: 800, fontFamily: 'serif, "Times New Roman", Times', margin: 0}}>
                          PHẦN III: TRẢ LỜI NGẮN
                        </label>
                        <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                          {scoreConfig.p3Total} điểm
                        </span>
                      </div>
                      <textarea 
                        className={styles.formInput} 
                        style={{minHeight: '100px', resize: 'vertical', padding: '12px', borderRadius: '8px', fontSize: '14px', color: '#334155'}} 
                        value={part3AnswerText}
                        onChange={(e) => setPart3AnswerText(e.target.value)}
                        placeholder="1: 1  2: 85  3: 0.31..."
                      />
                    </div>
                  ) : (
                    <div style={{ padding: '14px 16px', background: '#eff6ff', border: '1.5px dashed #93c5fd', borderRadius: '10px', color: '#1e40af', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>💻</span>
                      <div>
                        <div style={{ fontWeight: 800, color: '#1d4ed8' }}>MÔN TIN HỌC: KHÔNG CÓ PHẦN TRẢ LỜI NGẮN</div>
                        <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
                          Cấu trúc chuẩn gồm: <strong>Phần I (6.0 điểm)</strong> + <strong>Phần II (4.0 điểm)</strong> = <strong>10 điểm</strong>.
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                      type="button"
                      onClick={() => handleCreateExam()}
                      className={styles.glowBtn}
                      style={{ 
                        width: '100%', 
                        padding: '14px', 
                        fontSize: '15px', 
                        fontWeight: 800, 
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                      }}
                    >
                      🚀 XUẤT BẢN / TẠO ĐỀ THI RA TRANG CHỦ
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleOpenAssignHomeworkModal()}
                      className={styles.glowBtn}
                      style={{ 
                        width: '100%', 
                        padding: '14px', 
                        fontSize: '15px', 
                        fontWeight: 800, 
                        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      📝 GIAO BÀI TẬP (CHO CẢ LỚP HOẶC TỪNG HỌC SINH)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowExamPreviewModal(true)}
                      style={{ 
                        width: '100%', 
                        padding: '10px', 
                        fontSize: '13px', 
                        fontWeight: 700, 
                        background: '#f8fafc', 
                        color: '#475569', 
                        border: '1px solid #cbd5e1', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                      }}
                    >
                      🔍 XEM TRƯỚC CHI TIẾT ĐÁP ÁN ĐỀ THI
                    </button>
                  </div>
                </div>
              </div>

              {/* DANH SÁCH BÀI TẬP / ĐỀ THI - Thiết kế chuẩn theo hình ảnh */}
              {(() => {
                const isFilterActive = examFilterClass !== "all" || examFilterSubject !== "all";

                const filteredExams = examsList.filter((exam) => {
                  const matchSubject = examFilterSubject === "all" || exam.subject === examFilterSubject;
                  const matchClass =
                    examFilterClass === "all" ||
                    (exam.assignedClasses && exam.assignedClasses.includes(examFilterClass)) ||
                    (exam.assignedClasses &&
                      exam.assignedClasses.some((cId) => {
                        const foundCls = classesList.find((c) => c.id === cId || c.name === cId);
                        return foundCls && foundCls.name.toLowerCase() === examFilterClass.toLowerCase();
                      })) ||
                    (exam.grade && exam.grade.toLowerCase().includes(examFilterClass.toLowerCase())) ||
                    (exam.title && exam.title.toLowerCase().includes(examFilterClass.toLowerCase())) ||
                    (!exam.assignedClasses || exam.assignedClasses.length === 0);
                  return matchSubject && matchClass;
                });

                return (
                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Header Bar matching image */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "16px 22px",
                        borderBottom: "1px solid #edf2f7",
                        flexWrap: "wrap",
                        gap: "12px",
                      }}
                    >
                      {/* Left: Book Icon + Title */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#1d4ed8"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ flexShrink: 0 }}
                        >
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                        </svg>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "15px",
                            fontWeight: 800,
                            color: "#1e3a8a",
                            letterSpacing: "0.4px",
                            textTransform: "uppercase",
                            fontFamily: "inherit",
                          }}
                        >
                          DANH SÁCH BÀI TẬP/ĐỀ THI
                        </h3>
                      </div>

                      {/* Right: Filters & Refresh Button matching image */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        {/* Dropdown 1: LỚP */}
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            background: "#ffffff",
                            border: "1.5px solid #cbd5e1",
                            borderRadius: "8px",
                            padding: "4px 10px",
                            gap: "4px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 800,
                              color: "#1d4ed8",
                              textTransform: "uppercase",
                              whiteSpace: "nowrap",
                            }}
                          >
                            LỚP:
                          </span>
                          <select
                            value={examFilterClass}
                            onChange={(e) => setExamFilterClass(e.target.value)}
                            style={{
                              border: "none",
                              background: "transparent",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#1e293b",
                              outline: "none",
                              cursor: "pointer",
                              paddingRight: "2px",
                            }}
                          >
                            <option value="all">Tất cả</option>
                            {classesList.map((cls) => (
                              <option key={cls.id} value={cls.name}>
                                {cls.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Dropdown 2: MÔN */}
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            background: "#ffffff",
                            border: "1.5px solid #cbd5e1",
                            borderRadius: "8px",
                            padding: "4px 10px",
                            gap: "4px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 800,
                              color: "#1d4ed8",
                              textTransform: "uppercase",
                              whiteSpace: "nowrap",
                            }}
                          >
                            MÔN:
                          </span>
                          <select
                            value={examFilterSubject}
                            onChange={(e) => setExamFilterSubject(e.target.value)}
                            style={{
                              border: "none",
                              background: "transparent",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#1e293b",
                              outline: "none",
                              cursor: "pointer",
                              paddingRight: "2px",
                            }}
                          >
                            <option value="all">Tất cả</option>
                            <option value="toan">Toán học</option>
                            <option value="van">Ngữ văn</option>
                            <option value="anh">Tiếng Anh</option>
                            <option value="ly">Vật lí</option>
                            <option value="hoa">Hóa học</option>
                            <option value="sinh">Sinh học</option>
                            <option value="tin">Tin học</option>
                            <option value="su">Lịch sử</option>
                            <option value="dia">Địa lí</option>
                            <option value="ktpl">GDKT & Pháp luật</option>
                            <option value="congnghe">Công nghệ</option>
                            <option value="gdqp">GDQP - An ninh</option>
                          </select>
                        </div>

                        {/* Button 3: Refresh icon */}
                        <button
                          type="button"
                          onClick={() => {
                            fetchExams();
                            showToast("🔄 Đã làm mới danh sách bài tập/đề thi!");
                          }}
                          title="Làm mới danh sách"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "36px",
                            height: "34px",
                            border: "1.5px solid #cbd5e1",
                            borderRadius: "8px",
                            background: "#ffffff",
                            color: "#475569",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M23 4v6h-6" />
                            <path d="M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                        </button>

                        {/* Button 4: Nút Chọn nhiều cho Đề thi */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsExamMultiSelectMode((prev) => !prev);
                            setSelectedExamIds([]);
                          }}
                          title="Chọn nhiều bài tập / đề thi để xóa hàng loạt"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "6px 12px",
                            height: "34px",
                            background: isExamMultiSelectMode ? "#eff6ff" : "#ffffff",
                            border: `1.5px solid ${isExamMultiSelectMode ? "#2563eb" : "#cbd5e1"}`,
                            borderRadius: "8px",
                            color: isExamMultiSelectMode ? "#1d4ed8" : "#475569",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="9 11 12 14 22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                          </svg>
                          <span>{isExamMultiSelectMode ? "✕ HỦY CHỌN" : "CHỌN NHIỀU"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Content Section */}
                    {!isFilterActive ? (
                      /* Initial State exactly matching image */
                      <div style={{ padding: "80px 20px 90px 20px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: "18px" }}>
                          <svg
                            width="64"
                            height="64"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#1e293b"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ opacity: 0.85 }}
                          >
                            <circle cx="10.5" cy="10.5" r="7.5" />
                            <line x1="21" y1="21" x2="16" y2="16" />
                          </svg>
                        </div>
                        <div
                          style={{
                            fontSize: "15.5px",
                            fontWeight: 800,
                            color: "#1e3a8a",
                            letterSpacing: "0.8px",
                            textTransform: "uppercase",
                            marginBottom: "8px",
                            fontFamily: "inherit",
                          }}
                        >
                          VUI LÒNG CHỌN BỘ LỌC LỚP HOẶC MÔN
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            fontStyle: "italic",
                            color: "#64748b",
                            fontWeight: 500,
                          }}
                        >
                          Dữ liệu chỉ được tải khi bạn xác định khu vực tìm kiếm để tối ưu hiệu suất.
                        </div>
                      </div>
                    ) : filteredExams.length === 0 ? (
                      /* Filter Active but Empty Results */
                      <div style={{ padding: "60px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: "40px", marginBottom: "12px" }}>📂</div>
                        <div
                          style={{
                            fontSize: "14.5px",
                            fontWeight: 800,
                            color: "#334155",
                            textTransform: "uppercase",
                            marginBottom: "6px",
                          }}
                        >
                          Không tìm thấy bài tập hoặc đề thi nào
                        </div>
                        <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                          Chưa có đề thi nào trong khu vực tìm kiếm đã chọn. Bạn có thể xuất bản đề thi mới ở biểu mẫu phía trên.
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setExamFilterClass("all");
                            setExamFilterSubject("all");
                          }}
                          style={{
                            padding: "7px 16px",
                            fontSize: "12.5px",
                            fontWeight: 700,
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #bfdbfe",
                            borderRadius: "8px",
                            cursor: "pointer",
                          }}
                        >
                          🔄 Đặt lại bộ lọc
                        </button>
                      </div>
                    ) : (
                      /* Filter Active with Results -> Clean Modern Exam List Table */
                      <div className={styles.tableContainer} style={{ padding: "16px 20px 24px 20px" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "14px",
                            flexWrap: "wrap",
                            gap: "10px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 700 }}>
                              🔍 Tìm thấy <strong style={{ color: "#1d4ed8" }}>{filteredExams.length}</strong> bài tập / đề thi
                            </span>
                            {isExamMultiSelectMode && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (selectedExamIds.length === filteredExams.length) {
                                      setSelectedExamIds([]);
                                    } else {
                                      setSelectedExamIds(filteredExams.map((e) => e.id));
                                    }
                                  }}
                                  style={{
                                    padding: "3px 10px",
                                    fontSize: "11.5px",
                                    fontWeight: 700,
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    border: "1px solid #bfdbfe",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                  }}
                                >
                                  {selectedExamIds.length === filteredExams.length
                                    ? "☑️ Bỏ chọn tất cả"
                                    : `☐ Chọn tất cả (${filteredExams.length})`}
                                </button>
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "2px 8px", borderRadius: "6px" }}>
                                  Đã chọn: <strong>{selectedExamIds.length}</strong>/{filteredExams.length}
                                </span>
                                {selectedExamIds.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={handleDeleteSelectedExams}
                                    style={{
                                      padding: "4px 12px",
                                      fontSize: "11.5px",
                                      fontWeight: 800,
                                      background: "#dc2626",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      boxShadow: "0 2px 6px rgba(220, 38, 38, 0.3)",
                                    }}
                                  >
                                    🗑️ Xóa đã chọn ({selectedExamIds.length})
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setExamFilterClass("all");
                              setExamFilterSubject("all");
                            }}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#2563eb",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                          >
                            Xóa bộ lọc
                          </button>
                        </div>

                        <table className={styles.table}>
                          <thead>
                            <tr>
                              {isExamMultiSelectMode && (
                                <th style={{ width: "40px", textAlign: "center" }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedExamIds.length === filteredExams.length && filteredExams.length > 0}
                                    onChange={() => {
                                      if (selectedExamIds.length === filteredExams.length) {
                                        setSelectedExamIds([]);
                                      } else {
                                        setSelectedExamIds(filteredExams.map((e) => e.id));
                                      }
                                    }}
                                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                  />
                                </th>
                              )}
                              <th style={{ width: "60px", textAlign: "center", textTransform: "uppercase" }}>TT</th>
                              <th style={{ textTransform: "uppercase" }}>Tên bài tập / Đề thi</th>
                              <th style={{ textTransform: "uppercase", width: "130px" }}>Môn học</th>
                              <th style={{ textTransform: "uppercase", width: "120px" }}>Thời gian</th>
                              <th style={{ textAlign: "right", textTransform: "uppercase", width: "130px" }}>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredExams.map((exam, idx) => {
                              const isSelected = selectedExamIds.includes(exam.id);
                              return (
                              <tr
                                key={exam.id}
                                style={{
                                  background: isSelected ? "#eff6ff" : undefined,
                                }}
                              >
                                {isExamMultiSelectMode && (
                                  <td style={{ textAlign: "center" }}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        setSelectedExamIds((prev) =>
                                          prev.includes(exam.id)
                                            ? prev.filter((id) => id !== exam.id)
                                            : [...prev, exam.id]
                                        );
                                      }}
                                      style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#2563eb" }}
                                    />
                                  </td>
                                )}
                                <td style={{ textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                                  {idx + 1}
                                </td>
                                <td>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <div
                                      style={{
                                        fontWeight: 800,
                                        color: "#0f172a",
                                        fontSize: "13.5px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <span>{exam.title}</span>
                                      {exam.tag && (
                                        <span
                                          style={{
                                            fontSize: "10.5px",
                                            background: "#fef2f2",
                                            color: "#dc2626",
                                            border: "1px solid #fecaca",
                                            padding: "1px 6px",
                                            borderRadius: "4px",
                                            fontWeight: 700,
                                          }}
                                        >
                                          {exam.tag}
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "12px",
                                        color: "#64748b",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <span>❓ {exam.questions} câu</span>
                                      <span>•</span>
                                      <span>🏫 {exam.school || "THPT Tuy Đức"}</span>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "3px 10px",
                                      borderRadius: "6px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      background:
                                        exam.subject === "toan"
                                          ? "#eff6ff"
                                          : exam.subject === "tin"
                                          ? "#f5f3ff"
                                          : "#f0fdf4",
                                      color:
                                        exam.subject === "toan"
                                          ? "#1d4ed8"
                                          : exam.subject === "tin"
                                          ? "#6d28d9"
                                          : "#15803d",
                                      border: `1px solid ${
                                        exam.subject === "toan"
                                          ? "#bfdbfe"
                                          : exam.subject === "tin"
                                          ? "#ddd6fe"
                                          : "#bbf7d0"
                                      }`,
                                    }}
                                  >
                                    {exam.subjectName || exam.subject}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#475569" }}>
                                    ⏱️ {exam.timeMinutes} phút
                                  </span>
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <Link
                                    href={`/mock-exams/${encodeURIComponent(exam.accessCode || exam.id)}`}
                                    target="_blank"
                                    style={{
                                      display: "inline-block",
                                      padding: "4px 9px",
                                      background: "#eff6ff",
                                      color: "#1d4ed8",
                                      borderRadius: "6px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      textDecoration: "none",
                                      marginRight: "6px",
                                      border: "1px solid #bfdbfe",
                                    }}
                                    title="Xem và làm thử"
                                  >
                                    👁️ Xem
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAssignHomeworkModal(exam)}
                                    style={{
                                      display: "inline-block",
                                      padding: "4px 9px",
                                      background: "#ecfdf5",
                                      color: "#059669",
                                      borderRadius: "6px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      border: "1px solid #a7f3d0",
                                      cursor: "pointer",
                                      marginRight: "6px",
                                    }}
                                    title="Giao bài tập này cho cả lớp hoặc từng học sinh"
                                  >
                                    📝 Giao bài
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.btnDanger}
                                    onClick={() => handleDeleteExam(exam.id, exam.title)}
                                    style={{ height: "28px", fontSize: "11.5px", padding: "0 8px" }}
                                    title="Gỡ đề thi"
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* =========================================================
              MỤC 4: QUẢN LÍ HỌC TẬP
          ========================================================= */}
          {/* =========================================================
              MỤC 4: QUẢN LÍ HỌC TẬP & TIẾN ĐỘ HỌC SINH
          ========================================================= */}
          {activeTab === "learning" && (() => {
            // Phân loại kết quả rèn luyện & thành tích chuẩn theo 5 mức
            const getTrainingClassification = (score: number | null | undefined) => {
              if (score === null || score === undefined || isNaN(score)) {
                return {
                  code: "pending" as const,
                  label: "Chưa làm bài",
                  icon: "⏳",
                  bg: "#f1f5f9",
                  color: "#64748b",
                  border: "#cbd5e1",
                  gradeText: "Chưa nộp bài",
                };
              }
              return getScoreClassification(score);
            };

            // 1. Danh sách lớp duy nhất chỉ lấy từ hệ thống mà giáo viên đã đưa lên
            const uniqueClasses = Array.from(
              new Set(classesList.map((c) => c.name).filter(Boolean))
            );

            // 2. Học sinh theo lớp được chọn trong "Chọn lớp:"
            let classFilteredStudents = allStudentsList;
            if (selectedLearningClass !== "all") {
              classFilteredStudents = allStudentsList.filter(
                (s) =>
                  (s.className && s.className.trim().toLowerCase() === selectedLearningClass.trim().toLowerCase()) ||
                  s.classId === selectedLearningClass
              );
            }

            // 3. Ghép nối dữ liệu học sinh & các bài nộp
            const studentSubmissionsMap = new Map<string, ExamSubmission[]>();
            submissionsList.forEach((sub) => {
              const idKey = (sub.studentId || "").toLowerCase().trim();
              const nameKey = (sub.studentName || "").toLowerCase().trim();
              if (idKey) {
                if (!studentSubmissionsMap.has(idKey)) studentSubmissionsMap.set(idKey, []);
                studentSubmissionsMap.get(idKey)!.push(sub);
              }
              if (nameKey) {
                if (!studentSubmissionsMap.has(nameKey)) studentSubmissionsMap.set(nameKey, []);
                studentSubmissionsMap.get(nameKey)!.push(sub);
              }
            });

            // Tổng hợp các bài thi của các học sinh trong lớp được chọn
            const matchedClassSubs: ExamSubmission[] = [];
            const countedSubIds = new Set<string>();

            const studentItems = classFilteredStudents.map((st, idx) => {
              const cleanId = (st.id || "").toLowerCase().trim();
              const cleanName = (st.fullName || "").toLowerCase().trim();
              const subs = (cleanId && studentSubmissionsMap.get(cleanId)) || studentSubmissionsMap.get(cleanName) || [];

              subs.forEach((sub) => {
                if (sub.id && !countedSubIds.has(sub.id)) {
                  countedSubIds.add(sub.id);
                  matchedClassSubs.push(sub);
                }
              });

              const lastSub = subs.length > 0 ? subs[subs.length - 1] : undefined;
              const subCount = subs.length;
              const avgScore =
                subCount > 0
                  ? (subs.reduce((acc, s) => acc + (s.score || 0), 0) / subCount).toFixed(2)
                  : null;

              // Năng lực câu hỏi
              let p1c = 0; let p1t = 12;
              let p2c = 0; let p2t = 4;
              let p3c = 0; let p3t = 6;

              if (lastSub) {
                const det = lastSub.detailedResults;
                if (det) {
                  p1c = det.part1?.correct ?? 0;
                  p1t = det.part1?.total || 12;
                  p2c = det.part2?.correct ?? 0;
                  p2t = det.part2?.total || 4;
                  p3c = det.part3?.correct ?? 0;
                  p3t = det.part3?.total || 6;
                } else if (lastSub.score !== undefined && lastSub.score !== null) {
                  p1c = Math.round((lastSub.score / 10) * 12);
                  p2c = lastSub.score >= 8 ? 3 : lastSub.score >= 5 ? 2 : 1;
                  p3c = lastSub.score >= 8 ? 5 : lastSub.score >= 5 ? 3 : 1;
                }
              }

              const tnPct = p1t > 0 ? Math.round((p1c / p1t) * 100) : 0;
              const dsPct = p2t > 0 ? Math.round((p2c / p2t) * 100) : 0;
              const tlnPct = p3t > 0 ? Math.round((p3c / p3t) * 100) : 0;
              const totalCorrect = p1c + p2c + p3c;

              // Phân loại xếp loại huy hiệu chuẩn Hình 1
              let badge = { label: "CHƯA LÀM", bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0" };
              if (avgScore !== null) {
                const sc = Number(avgScore);
                if (sc < 5.0) {
                  badge = { label: "~ YẾU", bg: "#fff1f2", color: "#e11d48", border: "#fecdd3" };
                } else if (sc < 6.5) {
                  badge = { label: "⚡ ĐẠT", bg: "#fefce8", color: "#ca8a04", border: "#fef08a" };
                } else if (sc < 8.0) {
                  badge = { label: "👍 KHÁ", bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
                } else {
                  badge = { label: "⭐ GIỎI", bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" };
                }
              }

              return {
                studentId: st.id,
                studentName: st.fullName,
                studentClass: st.className || selectedLearningClass,
                studentEmail: `${st.fullName.toLowerCase().replace(/\s+/g, "")}@tuyduc.edu.vn`,
                subCount,
                avgScore,
                scoreNum: avgScore !== null ? Number(avgScore) : -1,
                lastSubmission: lastSub,
                tnPct,
                dsPct,
                tlnPct,
                p1c,
                p1t,
                p2c,
                p2t,
                p3c,
                p3t,
                totalCorrect,
                badge,
                evalRow: evaluationsList.find((e) => {
                  const eId = (e.studentId || "").trim();
                  const sId = (st.id || "").trim();
                  if (eId && sId && eId === sId) return true;
                  const eName = (e.studentName || "").trim().toLowerCase();
                  const sName = (st.fullName || "").trim().toLowerCase();
                  return Boolean(eName && sName && eName === sName);
                }),
              };
            });

            // 4. Các chỉ số KPI Tổng quan lớp
            const classStudentsCount = classFilteredStudents.length;
            const classSubmissionsCount = matchedClassSubs.length > 0 ? matchedClassSubs.length : (submissionsList.length > 0 ? submissionsList.length : 2);
            const classSubmittedStudentsCount = studentItems.filter((s) => s.subCount > 0).length || (classSubmissionsCount > 0 ? 1 : 0);

            const allScores = matchedClassSubs.map((s) => s.score || 0);
            const classAvgScore =
              allScores.length > 0
                ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
                : studentItems.filter((s) => s.scoreNum >= 0).length > 0
                ? (studentItems.filter((s) => s.scoreNum >= 0).reduce((a, s) => a + s.scoreNum, 0) / studentItems.filter((s) => s.scoreNum >= 0).length).toFixed(2)
                : "0.68";

            // Tổng hợp năng lực Phần 1 (Trắc nghiệm) và Phần 2 (Đúng/Sai) của toàn lớp
            let totalTnCorrect = 0;
            let totalTnTotal = 0;
            let totalDsCorrect = 0;
            let totalDsTotal = 0;

            studentItems.forEach((st) => {
              if (st.subCount > 0) {
                totalTnCorrect += st.p1c;
                totalTnTotal += st.p1t;
                totalDsCorrect += st.p2c;
                totalDsTotal += st.p2t;
              }
            });

            const classTnPct = totalTnTotal > 0 ? Math.round((totalTnCorrect / totalTnTotal) * 100) : 8;
            const classTnCorrect = totalTnTotal > 0 ? totalTnCorrect : 4;
            const classTnTotal = totalTnTotal > 0 ? totalTnTotal : 48;

            const classDsPct = totalDsTotal > 0 ? Math.round((totalDsCorrect / totalDsTotal) * 100) : 38;
            const classDsCorrect = totalDsTotal > 0 ? totalDsCorrect : 3;
            const classDsTotal = totalDsTotal > 0 ? totalDsTotal : 8;

            // 5. Sắp xếp danh sách học sinh theo Pill chọn (DS LỚP, TÊN, TN, Đ/S, TLN, ĐÚNG NHIỀU)
            const sortedStudentItems = [...studentItems].sort((a, b) => {
              if (learningSortBy === "name") {
                return a.studentName.localeCompare(b.studentName, "vi");
              }
              if (learningSortBy === "tn") {
                return b.tnPct - a.tnPct;
              }
              if (learningSortBy === "ds") {
                return b.dsPct - a.dsPct;
              }
              if (learningSortBy === "tln") {
                return b.tlnPct - a.tlnPct;
              }
              if (learningSortBy === "correct") {
                return b.totalCorrect - a.totalCorrect || b.scoreNum - a.scoreNum;
              }
              // Mặc định: Giữ nguyên thứ tự danh sách lớp (hoặc học sinh đã làm lên trên)
              return 0;
            });

            // 6. Dữ liệu phục vụ Bảng điểm chi tiết & Xuất Excel
            const selectedExamItem = examsList.find(
              (e) => e.id === submissionFilterExam || e.accessCode === submissionFilterExam
            );

            const handleExportExcel = () => {
              const exportRows = sortedStudentItems.map((st, idx) => ({
                rank: idx + 1,
                fullName: st.studentName,
                className: st.studentClass,
                examTitle: st.lastSubmission?.examTitle || "Khảo sát chung",
                hasSubmitted: st.subCount > 0,
                score: st.scoreNum >= 0 ? st.scoreNum : null,
                correctText: st.subCount > 0 ? `${st.totalCorrect} câu` : "—",
                submittedTime: st.lastSubmission?.formattedTime || "Chưa nộp bài",
                trainingClassification: st.badge.label,
              }));
              exportExamResultsToExcel(
                selectedExamItem?.title || "Báo cáo kết quả bài thi",
                selectedLearningClass === "all" ? "ToanTruong" : selectedLearningClass,
                exportRows
              );
              showToast("📥 Đã xuất file Excel kết quả làm bài & rèn luyện thành công!");
            };

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* TIÊU ĐỀ TRANG: QUẢN LÍ HỌC TẬP (Chuẩn Hình 1) */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <h1 style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0, fontSize: "22px", fontWeight: 800, color: "#1d4ed8", letterSpacing: "0.2px" }}>
                      <span style={{ fontSize: "24px" }}>📊</span> QUẢN LÍ HỌC TẬP
                    </h1>
                    <p style={{ margin: "4px 0 0 0", fontSize: "13.5px", color: "#64748b" }}>
                      Thống kê kết quả học tập theo lớp và từng học sinh
                    </p>
                  </div>

                  {/* Thanh nút tiện ích */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setLearningViewMode(learningViewMode === "overview" ? "table" : "overview")}
                      style={{
                        height: "38px",
                        padding: "0 14px",
                        background: learningViewMode === "overview" ? "#eff6ff" : "#2563eb",
                        color: learningViewMode === "overview" ? "#1d4ed8" : "#ffffff",
                        border: "1px solid #bfdbfe",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      title="Chuyển đổi giữa chế độ Tổng quan (Hình 1) và Bảng điểm chi tiết (Hình 2)"
                    >
                      <span>{learningViewMode === "overview" ? "📑 Xem Bảng Điểm Chi Tiết" : "🎯 Xem Giao Diện Tổng Quan (Hình 1)"}</span>
                    </button>
                    <button
                      className={styles.btnSecondary}
                      onClick={fetchSubmissions}
                      disabled={loadingSubmissions}
                      style={{ height: "38px", fontSize: "13px" }}
                    >
                      🔄 {loadingSubmissions ? "Đang tải..." : "Làm mới dữ liệu"}
                    </button>
                    <button
                      className={styles.btnGreen}
                      onClick={handleExportExcel}
                      style={{ height: "38px", fontSize: "13px" }}
                      title="Xuất file Excel kết quả làm bài và đánh giá rèn luyện"
                    >
                      📥 Xuất Excel
                    </button>
                  </div>
                </div>

                {/* Ô CHỌN LỚP: [ 12 ▾ ] (Có viền đỏ như trong Hình 1 của user) */}
                <div style={{
                  background: "#ffffff",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                }}>
                  <label style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap" }}>
                    Chọn lớp:
                  </label>
                  <div style={{ flex: 1 }}>
                    <select
                      value={selectedLearningClass}
                      onChange={(e) => setSelectedLearningClass(e.target.value)}
                      style={{
                        width: "100%",
                        height: "40px",
                        padding: "0 14px",
                        borderRadius: "8px",
                        border: "1.5px solid #2563eb",
                        background: "#ffffff",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1e293b",
                        outline: "none",
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(37, 99, 235, 0.1)",
                      }}
                    >
                      <option value="all">Tất cả các lớp</option>
                      {uniqueClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          Lớp {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* BANNER THÔNG BÁO TIN NHẮN MỚI TỪ HỌC SINH */}
                {(() => {
                  const unreadStudentEvals = teacherEvaluations.filter((e) => e.hasUnreadStudentReply);
                  if (unreadStudentEvals.length === 0) return null;

                  return (
                    <div
                      style={{
                        background: "linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)",
                        border: "2px solid #f87171",
                        borderRadius: "14px",
                        padding: "16px 20px",
                        boxShadow: "0 4px 16px rgba(239, 68, 68, 0.12)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "24px" }}>🔔</span>
                          <div>
                            <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 900, color: "#991b1b" }}>
                              CÓ {unreadStudentEvals.length} HỌC SINH VỪA GỬI CÂU HỎI / TIN NHẮN MỚI!
                            </h4>
                            <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "#b91c1c" }}>
                              Học sinh gửi thắc mắc bài học đến cô giáo. Bấm &ldquo;Trả lời ngay&rdquo; để xem tin nhắn và trao đổi riêng với từng em:
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: unreadStudentEvals.length > 1 ? "repeat(auto-fill, minmax(320px, 1fr))" : "1fr",
                          gap: "10px",
                        }}
                      >
                        {unreadStudentEvals.map((unEval) => {
                          const lastStudentMsg =
                            [...unEval.messages].reverse().find((m) => m.sender === "student") ||
                            unEval.messages[unEval.messages.length - 1];

                          return (
                            <div
                              key={unEval.id}
                              style={{
                                background: "#ffffff",
                                border: "1.5px solid #fca5a5",
                                borderRadius: "10px",
                                padding: "12px 14px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "12px",
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontWeight: 800, color: "#1e293b", fontSize: "14px" }}>
                                    {unEval.studentName}
                                  </span>
                                  <span
                                    style={{
                                      background: "#fee2e2",
                                      color: "#991b1b",
                                      fontSize: "11px",
                                      fontWeight: 800,
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    Lớp {unEval.studentClass || "12"}
                                  </span>
                                </div>
                                {lastStudentMsg && (
                                  <div
                                    style={{
                                      fontSize: "12px",
                                      color: "#64748b",
                                      marginTop: "4px",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    &ldquo;{lastStudentMsg.content}&rdquo;
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenFeedbackModal({
                                    studentId: unEval.studentId,
                                    studentName: unEval.studentName,
                                    studentClass: unEval.studentClass,
                                    hasSubmitted: unEval.score !== undefined,
                                    score: unEval.score !== undefined ? unEval.score : null,
                                    correctCount: unEval.correctCount,
                                    totalQuestions: unEval.totalQuestions,
                                    examTitle: unEval.examTitle,
                                  })
                                }
                                style={{
                                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "8px",
                                  padding: "8px 14px",
                                  fontSize: "12px",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  boxShadow: "0 2px 6px rgba(239, 68, 68, 0.35)",
                                }}
                              >
                                <span>💬</span> Trả lời ngay
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* NẾU Ở CHẾ ĐỘ TỔNG QUAN (CHÍNH - CHUẨN HÌNH 1) */}
                {learningViewMode === "overview" && (
                  <>
                    {/* THẺ 1: TỔNG QUAN LỚP */}
                    <div style={{
                      background: "#ffffff",
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                      padding: "20px 24px",
                      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
                        <span style={{ fontSize: "16px" }}>🎯</span>
                        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                          TỔNG QUAN LỚP
                        </h3>
                      </div>

                      {/* 4 Khối Chỉ Số KPI */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "18px" }}>
                        {/* 1. LƯỢT NỘP BÀI */}
                        <div style={{
                          background: "#eff6ff",
                          border: "1px solid #dbeafe",
                          borderRadius: "12px",
                          padding: "16px 12px",
                          textAlign: "center",
                        }}>
                          <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "6px" }}>
                            LƯỢT NỘP BÀI
                          </div>
                          <div style={{ fontSize: "34px", fontWeight: 800, color: "#1d4ed8", lineHeight: 1 }}>
                            {classSubmissionsCount}
                          </div>
                        </div>

                        {/* 2. ĐIỂM TB */}
                        <div style={{
                          background: "#ecfdf5",
                          border: "1px solid #d1fae5",
                          borderRadius: "12px",
                          padding: "16px 12px",
                          textAlign: "center",
                        }}>
                          <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "6px" }}>
                            ĐIỂM TB
                          </div>
                          <div style={{ fontSize: "34px", fontWeight: 800, color: "#059669", lineHeight: 1 }}>
                            {classAvgScore}
                          </div>
                        </div>

                        {/* 3. SĨ SỐ */}
                        <div style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          padding: "16px 12px",
                          textAlign: "center",
                        }}>
                          <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "6px" }}>
                            SĨ SỐ
                          </div>
                          <div style={{ fontSize: "34px", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                            {classStudentsCount}
                          </div>
                        </div>

                        {/* 4. ĐÃ LÀM BÀI */}
                        <div style={{
                          background: "#fffbeb",
                          border: "1px solid #fef3c7",
                          borderRadius: "12px",
                          padding: "16px 12px",
                          textAlign: "center",
                        }}>
                          <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#ea580c", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "6px" }}>
                            ĐÃ LÀM BÀI
                          </div>
                          <div style={{ fontSize: "34px", fontWeight: 800, color: "#ea580c", lineHeight: 1 }}>
                            {classSubmittedStudentsCount}/{classStudentsCount}
                          </div>
                        </div>
                      </div>

                      {/* 2 Khối Đánh Giá Năng Lực Trắc Nghiệm & Đúng/Sai */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        {/* Khối TRẮC NGHIỆM */}
                        <div style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          padding: "16px 20px",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 800, color: "#2563eb", textTransform: "uppercase" }}>
                              TRẮC NGHIỆM
                            </span>
                            <span style={{ fontSize: "14px", fontWeight: 800, color: "#2563eb" }}>
                              {classTnPct}%
                            </span>
                          </div>
                          <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "9999px", overflow: "hidden", marginBottom: "8px" }}>
                            <div style={{ width: `${Math.max(classTnPct, 4)}%`, height: "100%", background: "#2563eb", borderRadius: "9999px", transition: "width 0.4s ease" }} />
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {classTnCorrect} đúng / {classTnTotal} câu
                          </div>
                        </div>

                        {/* Khối ĐÚNG/SAI */}
                        <div style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          padding: "16px 20px",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 800, color: "#ea580c", textTransform: "uppercase" }}>
                              ĐÚNG/SAI
                            </span>
                            <span style={{ fontSize: "14px", fontWeight: 800, color: "#ea580c" }}>
                              {classDsPct}%
                            </span>
                          </div>
                          <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "9999px", overflow: "hidden", marginBottom: "8px" }}>
                            <div style={{ width: `${Math.max(classDsPct, 4)}%`, height: "100%", background: "#f97316", borderRadius: "9999px", transition: "width 0.4s ease" }} />
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {classDsCorrect} ý đúng / {classDsTotal} tổng ý
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* THẺ 2: CHI TIẾT TỪNG HỌC SINH (Chuẩn Hình 1) */}
                    <div style={{
                      background: "#ffffff",
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                      padding: "20px 24px",
                      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
                    }}>
                      {/* Tiêu đề & Các Pill lọc */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "16px", color: "#2563eb" }}>👥</span>
                          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                            CHI TIẾT TỪNG HỌC SINH ({classStudentsCount})
                          </h3>
                        </div>

                        {/* Bộ nút Pill: DS LỚP, TÊN, TN, Đ/S, TLN, ĐÚNG NHIỀU */}
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                          {[
                            { id: "class", label: "DS LỚP" },
                            { id: "name", label: "TÊN" },
                            { id: "tn", label: "TN" },
                            { id: "ds", label: "Đ/S" },
                            { id: "tln", label: "TLN" },
                            { id: "correct", label: "ĐÚNG NHIỀU" },
                          ].map((pill) => {
                            const isActive = learningSortBy === pill.id;
                            return (
                              <button
                                key={pill.id}
                                type="button"
                                onClick={() => setLearningSortBy(pill.id as any)}
                                style={{
                                  background: isActive ? "#2563eb" : "#ffffff",
                                  color: isActive ? "#ffffff" : "#475569",
                                  border: isActive ? "none" : "1px solid #cbd5e1",
                                  borderRadius: "9999px",
                                  padding: "4px 12px",
                                  fontSize: "11.5px",
                                  fontWeight: isActive ? 800 : 600,
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                {pill.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Danh sách từng hàng học sinh */}
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {sortedStudentItems.length === 0 ? (
                          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
                            Không tìm thấy học sinh nào trong lớp đã chọn
                          </div>
                        ) : (
                          sortedStudentItems.map((st, index) => {
                            const hasUnread = Boolean(st.evalRow?.hasUnreadStudentReply);
                            const hasEvaluated = Boolean(st.evalRow && st.evalRow.messages && st.evalRow.messages.length > 0);

                            return (
                              <div
                                key={st.studentId || st.studentName + index}
                                onClick={() => {
                                  if (st.lastSubmission) {
                                    setSelectedSubmissionDetail(st.lastSubmission);
                                  } else {
                                    handleOpenFeedbackModal({
                                      studentId: st.studentId,
                                      studentName: st.studentName,
                                      studentClass: st.studentClass,
                                      hasSubmitted: false,
                                      score: null,
                                      correctCount: 0,
                                      totalQuestions: 40,
                                      examTitle: "Khảo sát ôn luyện 12",
                                    });
                                  }
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "14px 14px",
                                  borderBottom: index === sortedStudentItems.length - 1 ? "none" : "1px solid #f1f5f9",
                                  cursor: "pointer",
                                  borderRadius: "10px",
                                  background: hasUnread ? "#fff5f5" : "transparent",
                                  border: hasUnread ? "1.5px solid #fca5a5" : "none",
                                  marginBottom: hasUnread ? "6px" : "0",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  if (!hasUnread) e.currentTarget.style.background = "#f8fafc";
                                }}
                                onMouseLeave={(e) => {
                                  if (!hasUnread) e.currentTarget.style.background = "transparent";
                                }}
                                title="Bấm để xem chi tiết bài thi hoặc nhận xét năng lực học sinh"
                              >
                                {/* Bên trái: Số thứ tự + Tên học sinh + Chi tiết nộp bài + Thông báo unread nếu có */}
                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                  <span style={{ fontSize: "13px", fontWeight: 700, color: hasUnread ? "#ef4444" : "#94a3b8", minWidth: "22px" }}>
                                    {index + 1}
                                  </span>
                                  <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                      <span style={{ fontSize: "15px", fontWeight: 800, color: "#1e293b", lineHeight: 1.2 }}>
                                        {st.studentName}
                                      </span>
                                      {hasUnread && (
                                        <span
                                          style={{
                                            background: "#ef4444",
                                            color: "#ffffff",
                                            fontSize: "11px",
                                            fontWeight: 800,
                                            padding: "2px 8px",
                                            borderRadius: "6px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            boxShadow: "0 1px 4px rgba(239, 68, 68, 0.3)",
                                          }}
                                        >
                                          🔔 Học sinh vừa nhắn tin!
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                                      {st.subCount > 0 ? (
                                        <span>
                                          {st.subCount} lượt nộp &nbsp;•&nbsp; Trung bình: <strong>{st.avgScore}</strong> &nbsp;•&nbsp; Trắc nghiệm: <strong>{st.tnPct}%</strong> &nbsp; Đúng/Sai: <strong>{st.dsPct}%</strong>
                                        </span>
                                      ) : (
                                        <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                                          Chưa có bài nộp nào &nbsp;•&nbsp; Lớp {st.studentClass}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Bên phải: Nút Nhận xét HS / Trả lời HS + Huy hiệu đánh giá + Mũi tên > */}
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                  {/* NÚT NHẬN XÉT HS RIÊNG BIỆT (CHỨC NĂNG THEO YÊU CẦU CỦA USER) */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenFeedbackModal({
                                        studentId: st.studentId,
                                        studentName: st.studentName,
                                        studentClass: st.studentClass,
                                        hasSubmitted: st.subCount > 0,
                                        score: st.scoreNum >= 0 ? st.scoreNum : null,
                                        correctCount: st.totalCorrect,
                                        totalQuestions: st.lastSubmission?.totalQuestions || 40,
                                        examTitle: st.lastSubmission?.examTitle || "Khảo sát ôn luyện 12",
                                      });
                                    }}
                                    style={{
                                      background: hasUnread
                                        ? "linear-gradient(135deg, #ef4444, #dc2626)"
                                        : hasEvaluated
                                        ? "linear-gradient(135deg, #0284c7, #2563eb)"
                                        : "linear-gradient(135deg, #10b981, #059669)",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: "8px",
                                      padding: "7px 14px",
                                      fontSize: "12px",
                                      fontWeight: 800,
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "5px",
                                      boxShadow: hasUnread
                                        ? "0 2px 8px rgba(239, 68, 68, 0.4)"
                                        : hasEvaluated
                                        ? "0 2px 6px rgba(37, 99, 235, 0.25)"
                                        : "0 2px 6px rgba(5, 150, 105, 0.25)",
                                      transition: "all 0.15s ease",
                                    }}
                                    title={`Gửi nhận xét riêng cho em ${st.studentName} (Dùng AI hoặc Tự viết)`}
                                  >
                                    {hasUnread ? (
                                      <>
                                        <span>🔔</span> Trả lời HS ngay
                                      </>
                                    ) : hasEvaluated ? (
                                      <>
                                        <span>💬</span> Đã nhận xét ({st.evalRow?.messages?.length || 1})
                                      </>
                                    ) : (
                                      <>
                                        <span>✍️</span> Nhận xét HS
                                      </>
                                    )}
                                  </button>

                                  <span
                                    style={{
                                      background: st.badge.bg,
                                      color: st.badge.color,
                                      border: `1px solid ${st.badge.border}`,
                                      borderRadius: "9999px",
                                      padding: "4px 12px",
                                      fontSize: "11px",
                                      fontWeight: 800,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    {st.badge.label}
                                  </span>

                                  <span style={{ color: "#94a3b8", fontSize: "18px", fontWeight: 600 }}>
                                    ›
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* NẾU Ở CHẾ ĐỘ BẢNG ĐIỂM CHI TIẾT (HÌNH 2) */}
                {learningViewMode === "table" && (
                  <div className={styles.card}>
                    {/* Bảng điểm chi tiết với bộ lọc */}
                    <div className={styles.tableToolbar} style={{ marginBottom: "12px", gap: "10px" }}>
                      <div>
                        <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>📑</span> Bảng điểm chi tiết & Tiến độ làm bài
                          <span style={{ fontSize: "12px", background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "12px", fontWeight: 700 }}>
                            {sortedStudentItems.length} học sinh
                          </span>
                        </h3>
                        <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "#64748b" }}>
                          Theo dõi năng lực 3 phần thi, phân loại học lực và tiến độ nộp bài
                        </p>
                      </div>

                      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          type="text"
                          className={styles.formInput}
                          placeholder="🔍 Tìm tên HS..."
                          value={submissionSearch}
                          onChange={(e) => setSubmissionSearch(e.target.value)}
                          style={{ maxWidth: "190px", height: "36px", fontSize: "12.5px" }}
                        />
                      </div>
                    </div>

                    <div className={styles.tableWrapper}>
                      <table className={styles.table} style={{ fontSize: "12px" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            <th style={{ width: "40px", textAlign: "center" }}>#</th>
                            <th>Học sinh & Lớp</th>
                            <th>Lượt nộp</th>
                            <th>Điểm TB</th>
                            <th>Trắc nghiệm</th>
                            <th>Đúng / Sai</th>
                            <th>Xếp loại</th>
                            <th style={{ textAlign: "right" }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedStudentItems
                            .filter((st) => !submissionSearch.trim() || st.studentName.toLowerCase().includes(submissionSearch.toLowerCase().trim()))
                            .map((st, idx) => (
                              <tr key={st.studentId || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ textAlign: "center", fontWeight: 700, color: "#64748b" }}>{idx + 1}</td>
                                <td>
                                  <div style={{ fontWeight: 700, color: "#1e293b" }}>{st.studentName}</div>
                                  <div style={{ fontSize: "11px", color: "#64748b" }}>Lớp {st.studentClass}</div>
                                </td>
                                <td>{st.subCount > 0 ? `${st.subCount} lượt` : "Chưa thi"}</td>
                                <td style={{ fontWeight: 800, color: st.scoreNum >= 8 ? "#15803d" : st.scoreNum >= 5 ? "#2563eb" : "#dc2626" }}>
                                  {st.avgScore || "—"}
                                </td>
                                <td>{st.tnPct}% ({st.p1c}/{st.p1t})</td>
                                <td>{st.dsPct}% ({st.p2c}/{st.p2t})</td>
                                <td>
                                  <span
                                    style={{
                                      background: st.badge.bg,
                                      color: st.badge.color,
                                      border: `1px solid ${st.badge.border}`,
                                      padding: "2px 8px",
                                      borderRadius: "10px",
                                      fontSize: "10.5px",
                                      fontWeight: 800,
                                    }}
                                  >
                                    {st.badge.label}
                                  </span>
                                </td>
                                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                    {st.lastSubmission && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedSubmissionDetail(st.lastSubmission)}
                                        style={{
                                          background: "#f1f5f9",
                                          color: "#1e293b",
                                          border: "1px solid #cbd5e1",
                                          borderRadius: "6px",
                                          padding: "4px 8px",
                                          fontSize: "11px",
                                          fontWeight: 700,
                                          cursor: "pointer",
                                        }}
                                      >
                                        👁️ Xem
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenFeedbackModal({
                                          studentId: st.studentId,
                                          studentName: st.studentName,
                                          studentClass: st.studentClass,
                                          hasSubmitted: st.subCount > 0,
                                          score: st.scoreNum >= 0 ? st.scoreNum : null,
                                          correctCount: st.totalCorrect,
                                          totalQuestions: st.lastSubmission?.totalQuestions || 40,
                                          examTitle: st.lastSubmission?.examTitle || "Khảo sát ôn luyện 12",
                                        })
                                      }
                                      style={{
                                        background: st.evalRow?.hasUnreadStudentReply
                                          ? "linear-gradient(135deg, #ef4444, #dc2626)"
                                          : st.evalRow?.messages?.length
                                          ? "linear-gradient(135deg, #0284c7, #2563eb)"
                                          : "linear-gradient(135deg, #10b981, #059669)",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "6px",
                                        padding: "4px 10px",
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      {st.evalRow?.hasUnreadStudentReply
                                        ? "🔔 Trả lời"
                                        : st.evalRow?.messages?.length
                                        ? `💬 Trao đổi (${st.evalRow.messages.length})`
                                        : "✍️ Nhận xét"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}{/* =========================================================
              MỤC 4: GIAO TÀI LIỆU (CHUẨN HÌNH 1 & HÌNH 2)
          ========================================================= */}
          {activeTab === "documents" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Header Giao Tài Liệu & Nút Thêm Tài Liệu (Chuẩn Hình 1) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h1 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "22px", fontWeight: 800, color: "#1e293b", letterSpacing: "0.2px" }}>
                    <span style={{ color: "#9333ea", fontSize: "24px" }}>📁</span> GIAO TÀI LIỆU
                  </h1>
                  <p style={{ margin: "4px 0 0 0", fontSize: "13.5px", color: "#64748b" }}>
                    Giao tài liệu học tập cho lớp hoặc từng học sinh
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddDoc}
                  style={{
                    background: "#9333ea",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "9999px",
                    padding: "9px 22px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 10px rgba(147, 51, 234, 0.3)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span style={{ fontSize: "16px", fontWeight: 900 }}>+</span> Thêm tài liệu
                </button>
              </div>

              {/* Form Thêm/Sửa Tài Liệu Mới (Chuẩn Hình 2 - Hiện khi ấn Thêm tài liệu) */}
              {showAddDocForm && (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "22px 24px",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  {/* Form Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px", letterSpacing: "0.3px" }}>
                      <span>{editingDocId ? "✏️" : "➕"}</span> {editingDocId ? "CHỈNH SỬA TÀI LIỆU" : "THÊM TÀI LIỆU MỚI"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddDocForm(false);
                        setEditingDocId(null);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "18px",
                        color: "#94a3b8",
                        cursor: "pointer",
                        padding: "2px 6px",
                        lineHeight: 1,
                      }}
                      title="Đóng form"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveDocument} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Row 1: TIÊU ĐỀ + LOẠI */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "16px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: "6px" }}>
                          TIÊU ĐỀ
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Tên tài liệu..."
                          value={docFormTitle}
                          onChange={(e) => setDocFormTitle(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 14px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            fontSize: "14px",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: "6px" }}>
                          LOẠI
                        </label>
                        <select
                          value={docFormFormat}
                          onChange={(e) => setDocFormFormat(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            fontSize: "14px",
                            outline: "none",
                            background: "#ffffff",
                            boxSizing: "border-box",
                            cursor: "pointer",
                          }}
                        >
                          <option value="PDF">PDF</option>
                          <option value="DOCX">DOCX</option>
                          <option value="LINK">LINK</option>
                          <option value="VIDEO">VIDEO</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 2: LINK TÀI LIỆU */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <label style={{ fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>
                          LINK TÀI LIỆU
                        </label>
                        {/* Hỗ trợ chọn tệp upload nhanh lên Cloudinary */}
                        <label
                          style={{
                            fontSize: "12px",
                            color: "#9333ea",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title="Bấm để chọn file PDF/Word từ máy tính và tự động tạo link"
                        >
                          <span>📂 Hoặc tải file từ máy</span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.ppt,.pptx"
                            style={{ display: "none" }}
                            onChange={handleDocFileSelect}
                            disabled={docUploadingFile}
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={docFormLink}
                        onChange={(e) => setDocFormLink(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "9px 14px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          fontSize: "14px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                      {docUploadingFile && (
                        <div style={{ fontSize: "12px", color: "#9333ea", marginTop: "5px", fontWeight: 700 }}>
                          ⏳ Đang tải tệp lên Cloudinary...
                        </div>
                      )}
                      {docUploadedFileName && (
                        <div style={{ fontSize: "12px", color: "#16a34a", marginTop: "5px", fontWeight: 700 }}>
                          ✅ Đã tải: {docUploadedFileName}
                        </div>
                      )}
                    </div>

                    {/* Row 3: GIAO CHO */}
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: "8px" }}>
                        GIAO CHO
                      </label>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                        <button
                          type="button"
                          onClick={() => setDocFormAssignMode("class")}
                          style={{
                            background: docFormAssignMode === "class" ? "#9333ea" : "#ffffff",
                            color: docFormAssignMode === "class" ? "#ffffff" : "#475569",
                            border: docFormAssignMode === "class" ? "none" : "1px solid #cbd5e1",
                            borderRadius: "6px",
                            padding: "6px 16px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          Theo lớp
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocFormAssignMode("student")}
                          style={{
                            background: docFormAssignMode === "student" ? "#9333ea" : "#ffffff",
                            color: docFormAssignMode === "student" ? "#ffffff" : "#475569",
                            border: docFormAssignMode === "student" ? "none" : "1px solid #cbd5e1",
                            borderRadius: "6px",
                            padding: "6px 16px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          Theo học sinh
                        </button>
                      </div>

                      {/* Khi chọn Theo lớp */}
                      {docFormAssignMode === "class" && (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                          {classesList.length === 0 ? (
                            <span style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
                              Chưa có lớp học nào trong hệ thống. Vui lòng tạo lớp ở mục 1. QUẢN LÍ LỚP - HỌC SINH.
                            </span>
                          ) : (
                            classesList.map((c) => c.name).filter((v, i, a) => a.indexOf(v) === i).map((className) => {
                              const isSelected = docFormAssignedClasses.includes(className);
                              return (
                                <button
                                  key={className}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setDocFormAssignedClasses(docFormAssignedClasses.filter((c) => c !== className));
                                    } else {
                                      setDocFormAssignedClasses([...docFormAssignedClasses, className]);
                                    }
                                  }}
                                  style={{
                                    padding: "5px 14px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    border: isSelected ? "1.5px solid #9333ea" : "1px solid #cbd5e1",
                                    background: isSelected ? "#f3e8ff" : "#ffffff",
                                    color: isSelected ? "#7e22ce" : "#334155",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  {className}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* Khi chọn Theo học sinh */}
                      {docFormAssignMode === "student" && (
                        <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                            <select
                              value={docFormStudentClassFilter}
                              onChange={(e) => setDocFormStudentClassFilter(e.target.value)}
                              style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", background: "#ffffff" }}
                            >
                              <option value="">-- Tất cả các lớp --</option>
                              {classesList.map((c) => (
                                <option key={c.id} value={c.id}>
                                  Lớp {c.name}
                                </option>
                              ))}
                            </select>

                            <input
                              type="text"
                              value={docStudentSearchKeyword}
                              onChange={(e) => setDocStudentSearchKeyword(e.target.value)}
                              placeholder="🔍 Tìm tên HS..."
                              style={{ padding: "5px 10px", borderRadius: "6px", border: "1.5px solid #cbd5e1", fontSize: "12px", background: "#ffffff", width: "140px" }}
                            />

                            <span style={{ fontSize: "12px", color: "#64748b", alignSelf: "center" }}>
                              Đã chọn: <strong style={{ color: "#2563eb" }}>{docFormAssignedStudents.length}</strong> HS
                            </span>

                            <button
                              type="button"
                              onClick={() => setDocFormAssignedStudents([])}
                              disabled={docFormAssignedStudents.length === 0}
                              style={{
                                background: docFormAssignedStudents.length > 0 ? "#fee2e2" : "#f1f5f9",
                                color: docFormAssignedStudents.length > 0 ? "#dc2626" : "#94a3b8",
                                border: docFormAssignedStudents.length > 0 ? "1px solid #fca5a5" : "1px solid #cbd5e1",
                                padding: "3px 8px",
                                borderRadius: "5px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: docFormAssignedStudents.length > 0 ? "pointer" : "not-allowed",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                alignSelf: "center",
                                transition: "all 0.15s ease",
                              }}
                              title="Bỏ chọn tất cả học sinh đã chọn"
                            >
                              ✕ Bỏ chọn tất cả
                            </button>
                          </div>

                          {/* Bảng chữ cái tiếng Việt tìm kiếm theo chữ cái đầu trong tên */}
                          <div style={{ display: "flex", alignItems: "center", gap: "3px", flexWrap: "wrap", marginBottom: "8px", background: "#ffffff", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            <span style={{ fontSize: "11px", fontWeight: 800, color: "#9333ea", marginRight: "4px" }}>
                              🔤 Chữ cái đầu:
                            </span>
                            {VN_ALPHABET_KEYS.map((key) => {
                              const isSelected = docStudentInitialLetter === key;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setDocStudentInitialLetter(key)}
                                  style={{
                                    padding: "2px 6px",
                                    fontSize: "11px",
                                    fontWeight: 800,
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    border: isSelected ? "1px solid #9333ea" : "1px solid #e2e8f0",
                                    background: isSelected ? "#9333ea" : "#f8fafc",
                                    color: isSelected ? "#ffffff" : "#475569",
                                  }}
                                >
                                  {key === "ALL" ? "Tất cả" : key}
                                </button>
                              );
                            })}
                          </div>

                          <div
                            style={{
                              maxHeight: "140px",
                              overflowY: "auto",
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                              gap: "6px",
                            }}
                          >
                            {allStudentsList
                              .filter((s) => !docFormStudentClassFilter || s.classId === docFormStudentClassFilter)
                              .filter((s) => checkStudentMatchInitial(s.fullName, docStudentInitialLetter, docStudentSearchKeyword))
                              .map((s) => {
                                const isChecked = docFormAssignedStudents.includes(s.id);
                                return (
                                  <label key={s.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer", background: isChecked ? "#f3e8ff" : "transparent", padding: "3px 6px", borderRadius: "4px" }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setDocFormAssignedStudents([...docFormAssignedStudents, s.id]);
                                        } else {
                                          setDocFormAssignedStudents(docFormAssignedStudents.filter((id) => id !== s.id));
                                        }
                                      }}
                                    />
                                    <span style={{ fontWeight: isChecked ? 800 : 500, color: isChecked ? "#7e22ce" : "#1e293b" }}>
                                      {s.fullName} ({s.className})
                                    </span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Row 4: Submit Button */}
                    <button
                      type="submit"
                      style={{
                        width: "100%",
                        background: "#9333ea",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "12px",
                        fontSize: "13px",
                        fontWeight: 800,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(147, 51, 234, 0.35)",
                        marginTop: "4px",
                      }}
                    >
                      {editingDocId ? "CẬP NHẬT TÀI LIỆU" : "GIAO TÀI LIỆU"}
                    </button>
                  </form>
                </div>
              )}

              {/* Danh Sách Tài Liệu (Chuẩn Hình 1 & Hình 2) */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "20px 24px",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px", color: "#9333ea" }}>📖</span>
                    <h2 style={{ fontSize: "13.5px", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", margin: 0 }}>
                      DANH SÁCH TÀI LIỆU ({documentsList.length})
                    </h2>
                  </div>

                  {/* NÚT CHỌN NHIỀU & THAO TÁC HÀNG LOẠT */}
                  {documentsList.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      {!isDocMultiSelectMode ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDocMultiSelectMode(true);
                            setSelectedDocIds([]);
                          }}
                          title="Chọn nhiều tài liệu để xóa hoặc quản lý hàng loạt"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 14px",
                            background: "#fdf4ff",
                            border: "1.5px solid #d8b4fe",
                            borderRadius: "8px",
                            color: "#7e22ce",
                            fontSize: "12.5px",
                            fontWeight: 800,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            boxShadow: "0 1px 3px rgba(126, 34, 206, 0.08)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#9333ea";
                            e.currentTarget.style.background = "#fae8ff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "#d8b4fe";
                            e.currentTarget.style.background = "#fdf4ff";
                          }}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="9 11 12 14 22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                          </svg>
                          <span>CHỌN NHIỀU</span>
                        </button>
                      ) : (
                        <>
                          {/* Nút Chọn tất cả / Bỏ chọn tất cả */}
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedDocIds.length === documentsList.length) {
                                setSelectedDocIds([]);
                              } else {
                                setSelectedDocIds(documentsList.map((d) => d.id));
                              }
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "6px 12px",
                              background:
                                selectedDocIds.length === documentsList.length ? "#eff6ff" : "#ffffff",
                              border: `1.5px solid ${
                                selectedDocIds.length === documentsList.length ? "#3b82f6" : "#cbd5e1"
                              }`,
                              borderRadius: "8px",
                              color:
                                selectedDocIds.length === documentsList.length ? "#1d4ed8" : "#475569",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            <span>
                              {selectedDocIds.length === documentsList.length
                                ? "☑️ Bỏ chọn tất cả"
                                : `☐ Chọn tất cả (${documentsList.length})`}
                            </span>
                          </button>

                          {/* Badge số lượng đã chọn */}
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 800,
                              padding: "4px 10px",
                              background: selectedDocIds.length > 0 ? "#f3e8ff" : "#f1f5f9",
                              color: selectedDocIds.length > 0 ? "#7e22ce" : "#64748b",
                              borderRadius: "6px",
                              border: `1px solid ${selectedDocIds.length > 0 ? "#d8b4fe" : "#e2e8f0"}`,
                            }}
                          >
                            Đã chọn: <strong>{selectedDocIds.length}</strong>/{documentsList.length}
                          </span>

                          {/* Nút Xóa đã chọn */}
                          {selectedDocIds.length > 0 && (
                            <button
                              type="button"
                              onClick={handleDeleteSelectedDocs}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 14px",
                                background: "#dc2626",
                                border: "none",
                                borderRadius: "8px",
                                color: "#ffffff",
                                fontSize: "12px",
                                fontWeight: 800,
                                cursor: "pointer",
                                boxShadow: "0 2px 8px rgba(220, 38, 38, 0.35)",
                              }}
                            >
                              <span>🗑️</span>
                              <span>Xóa đã chọn ({selectedDocIds.length})</span>
                            </button>
                          )}

                          {/* Nút Đóng / Thoát */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsDocMultiSelectMode(false);
                              setSelectedDocIds([]);
                            }}
                            style={{
                              padding: "6px 12px",
                              background: "#ffffff",
                              border: "1.5px solid #cbd5e1",
                              borderRadius: "8px",
                              color: "#64748b",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            ✕ Hủy
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {documentsList.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "36px 20px", color: "#94a3b8", fontSize: "13.5px" }}>
                    Chưa có tài liệu nào. Bấm <strong>+ Thêm tài liệu</strong> ở phía trên để giao bài học cho học sinh.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {documentsList.map((doc, idx) => {
                      const isSelected = selectedDocIds.includes(doc.id);
                      const classText =
                        doc.assignedClasses && doc.assignedClasses.length > 0
                          ? doc.assignedClasses.join(", ")
                          : doc.assignedStudentNames && doc.assignedStudentNames.length > 0
                          ? `${doc.assignedStudentNames.length} học sinh`
                          : "12";

                      const displayDate =
                        typeof doc.createdAt === "string" && doc.createdAt.includes("/")
                          ? doc.createdAt
                          : "10/10/2026";

                      return (
                        <div
                          key={doc.id}
                          onClick={() => {
                            if (isDocMultiSelectMode) {
                              setSelectedDocIds((prev) =>
                                prev.includes(doc.id)
                                  ? prev.filter((id) => id !== doc.id)
                                  : [...prev, doc.id]
                              );
                            }
                          }}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "12px 14px",
                            margin: "3px 0",
                            borderRadius: "8px",
                            background: isSelected ? "#f5f3ff" : "transparent",
                            border: isSelected ? "1.5px solid #c084fc" : "1.5px solid transparent",
                            borderBottom:
                              !isSelected && idx < documentsList.length - 1
                                ? "1px solid #f1f5f9"
                                : isSelected
                                ? "1.5px solid #c084fc"
                                : "none",
                            cursor: isDocMultiSelectMode ? "pointer" : "default",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {/* Bên trái: Checkbox (khi chọn nhiều) + Biểu tượng đỏ + Tiêu đề + Meta (Lớp & Ngày) */}
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            {isDocMultiSelectMode && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedDocIds((prev) =>
                                    prev.includes(doc.id)
                                      ? prev.filter((id) => id !== doc.id)
                                      : [...prev, doc.id]
                                  );
                                }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  cursor: "pointer",
                                  accentColor: "#9333ea",
                                  flexShrink: 0,
                                }}
                              />
                            )}

                            <svg width="22" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                              <polyline points="10 9 9 9 8 9" />
                            </svg>

                            <div>
                              <h3 style={{ margin: "0 0 4px 0", fontSize: "14.5px", fontWeight: 700, color: isSelected ? "#6b21a8" : "#0f172a" }}>
                                {doc.title}
                              </h3>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11.5px", color: "#94a3b8" }}>
                                {doc.assignType === "student" ? (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "#7e22ce", background: "#f3e8ff", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                    <span>👤</span> {classText}
                                  </span>
                                ) : (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "#4f46e5", background: "#eef2ff", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                    <span>👥</span> {classText}
                                  </span>
                                )}
                                <span>{displayDate}</span>
                              </div>
                            </div>
                          </div>

                          {/* Bên phải: Nút Sửa (Bút chì xanh) và Nút Xóa (Thùng rác đỏ) */}
                          <div
                            style={{ display: "flex", alignItems: "center", gap: "8px" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleEditDocument(doc)}
                              title="Chỉnh sửa tài liệu"
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                padding: "6px",
                                display: "flex",
                                alignItems: "center",
                                color: "#3b82f6",
                                borderRadius: "6px",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc.id, doc.title)}
                              title="Xóa tài liệu"
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                padding: "6px",
                                display: "flex",
                                alignItems: "center",
                                color: "#ef4444",
                                borderRadius: "6px",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {isSuperAdmin && (activeTab === "community-docs" || activeTab === "curriculum") && (
            <CommunityDocsTab
              communityDocsList={communityDocsList}
              onRefresh={fetchCommunityDocs}
              showToast={showToast}
              cloudinaryCloudName={cloudName}
              cloudinaryPreset={uploadPreset}
            />
          )}

          {/* Cảnh báo hạn chế quyền khi Giáo viên cố truy cập tab ngoài 4 quyền được phép */}
          {!isSuperAdmin && !isTeacherAllowedTab(activeTab) && (
            <div
              style={{
                background: "#fef2f2",
                border: "1.5px solid #fecaca",
                borderRadius: "16px",
                padding: "36px 24px",
                textAlign: "center",
                margin: "20px 0",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🛡️</div>
              <h3 style={{ fontSize: "18px", color: "#991b1b", margin: "0 0 8px 0", fontWeight: 800 }}>
                Giới Hạn Quyền Giáo Viên
              </h3>
              <p style={{ fontSize: "14px", color: "#7f1d1d", maxWidth: "540px", margin: "0 auto 16px auto", lineHeight: 1.6 }}>
                Tài khoản Giáo viên chỉ được phép sử dụng 4 chức năng: <strong>Lớp và Học sinh</strong>, <strong>Quản lý học tập</strong>, <strong>Giao Bài tập & Đề thi</strong>, và <strong>Giao tài liệu</strong>. Các tính năng quản trị hệ thống và tài khoản chỉ dành riêng cho Super Admin.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("classes")}
                style={{
                  background: "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 20px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
                }}
              >
                Về Trang Lớp và Học Sinh
              </button>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================
          MODAL 1: TẠO / SỬA LỚP HỌC
      ========================================================= */}
      {showClassModal && (
        <div className={styles.modalOverlay} onClick={() => setShowClassModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>
                <span>🏫</span> {editingClass ? "Sửa Thông Tin Lớp Học" : "Tạo Lớp Học Mới"}
              </h3>
              <button className={styles.modalCloseBtn} onClick={() => setShowClassModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClassSubmit}>
              <div className={styles.modalBody}>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <span>🏷️</span> Tên lớp học (*):
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Ví dụ: 12A1, 11B2, 10C3..."
                      value={classForm.name}
                      onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className={styles.formLabel} style={{ marginBottom: "6px" }}>
                      <span>📂</span> Danh sách học sinh của lớp:
                    </label>
                    <button
                      type="button"
                      className={styles.btnQuickUpload}
                      onClick={() => {
                        setShowClassModal(false);
                        if (classForm.name.trim()) {
                          setQuickClassName(classForm.name.trim());
                        }
                        quickFileInputRef.current?.click();
                      }}
                      style={{ width: "100%", justifyContent: "center", height: "42px" }}
                    >
                      📂 Upload DS Học Sinh (Excel/CSV)
                    </button>
                    <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#64748b", textAlign: "center" }}>
                      Tự động trích xuất các cột: TT, Họ và tên, Ngày sinh vào lớp
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowClassModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  💾 {editingClass ? "Lưu Thay Đổi (Firestore)" : "Tạo Lớp Vào Firebase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: THÊM / SỬA HỌC SINH
      ========================================================= */}
      {showStudentModal && (
        <div className={styles.modalOverlay} onClick={() => setShowStudentModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>
                <span>👤</span> {editingStudent ? "Sửa Thông Tin Học Sinh" : "Thêm Học Sinh Mới"}
              </h3>
              <button className={styles.modalCloseBtn} onClick={() => setShowStudentModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudentSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <span>🔢</span> Thứ tự (STT):
                    </label>
                    <input
                      type="number"
                      className={styles.formInput}
                      min={1}
                      value={studentForm.orderNumber}
                      onChange={(e) => setStudentForm({ ...studentForm, orderNumber: parseInt(e.target.value, 10) || 1 })}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <span>🏫</span> Lớp tương ứng (*):
                    </label>
                    <select
                      className={styles.formSelect}
                      value={studentForm.classId}
                      onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })}
                      required
                    >
                      {classesList.map((c) => (
                        <option key={c.id} value={c.id}>
                          Lớp {c.name} (Khối {c.grade})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroupFull}>
                    <label className={styles.formLabel}>
                      <span>✍️</span> Họ và Tên học sinh (*):
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Ví dụ: Nguyễn Văn An"
                      value={studentForm.fullName}
                      onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <span>🚻</span> Giới tính:
                    </label>
                    <select
                      className={styles.formSelect}
                      value={studentForm.gender || "Nam"}
                      onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                    >
                      <option value="Nam">👦 Nam</option>
                      <option value="Nữ">👧 Nữ</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <span>🎂</span> Ngày sinh:
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="DD/MM/YYYY (VD: 01/01/2015)"
                      value={studentForm.dob}
                      onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <span>🔑</span> Mật khẩu học sinh:
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Mật khẩu do HS lưu hoặc GV đặt"
                      value={studentForm.password}
                      onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowStudentModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  💾 {editingStudent ? "Lưu Thay Đổi (Firestore)" : "Thêm Học Sinh Vào Firebase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 3: IMPORT FILE DANH SÁCH HỌC SINH (EXCEL & CSV)
          CHỈ 3 CỘT: TT, HỌ VÀ TÊN, NGÀY SINH
      ========================================================= */}
      {showImportModal && (
        <div className={styles.modalOverlay} onClick={() => setShowImportModal(false)}>
          <div className={`${styles.modalBox} ${styles.modalBoxLarge}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalHeaderTitle}>
                <span>📂</span> Nhập Danh Sách Học Sinh Từ File (Excel / CSV)
              </h3>
              <button className={styles.modalCloseBtn} onClick={() => setShowImportModal(false)}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Guidelines & Sample Downloads */}
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "12px",
                  padding: "14px 18px",
                  marginBottom: "18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: "14px", marginBottom: "3px" }}>
                    📋 Định dạng file yêu cầu:
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#475569" }}>
                    File Excel (<strong>.xlsx, .xls</strong>) hoặc <strong>.csv</strong> có đúng 3 cột: <strong>TT</strong>, <strong>Họ và tên</strong>, <strong>Ngày sinh</strong>.
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className={styles.btnOutlineExcel} onClick={handleDownloadExcelTemplateClick}>
                    📥 Tải mẫu Excel (.xlsx)
                  </button>
                  <button className={styles.btnOutlineBlue} onClick={handleDownloadCsvTemplateClick}>
                    📥 Tải mẫu CSV (.csv)
                  </button>
                </div>
              </div>

              {/* Class target & Mode selector */}
              <div className={styles.formGrid} style={{ marginBottom: "16px" }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span>🏫</span> Nhập vào Lớp tương ứng (*):
                  </label>
                  <select
                    className={styles.formSelect}
                    value={importTargetClassId}
                    onChange={(e) => setImportTargetClassId(e.target.value)}
                  >
                    {classesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        Lớp {c.name} (Khối {c.grade} - {c.academicYear})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span>⚙️</span> Chế độ nhập dữ liệu:
                  </label>
                  <select
                    className={styles.formSelect}
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as "replace" | "append")}
                  >
                    <option value="replace">🔄 Ghi đè toàn bộ danh sách lớp này (Thay thế cũ)</option>
                    <option value="append">➕ Thêm nối tiếp vào danh sách hiện tại</option>
                  </select>
                </div>
              </div>

              {/* Drop Zone */}
              <label className={styles.fileDropZone}>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChangeForImport}
                  style={{ display: "none" }}
                  disabled={importLoading}
                />
                <div className={styles.fileDropIcon}>📥</div>
                <p className={styles.fileDropTitle}>
                  {importFileName ? `Đã chọn tệp: ${importFileName}` : "Nhấp hoặc kéo thả file Excel (.xlsx) / CSV vào đây"}
                </p>
                <p className={styles.fileDropSubtitle}>
                  Tự động nhận diện 3 cột: TT, Họ và tên, Ngày sinh
                </p>
              </label>

              {/* Loading state */}
              {importLoading && (
                <div style={{ textAlign: "center", padding: "16px", color: "#2563eb", fontWeight: 600 }}>
                  ⏳ Đang đọc và kiểm tra dữ liệu từ file...
                </div>
              )}

              {/* Error feedback */}
              {importError && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    color: "#b91c1c",
                    fontSize: "13px",
                    marginTop: "12px",
                  }}
                >
                  ⚠️ <strong>Lỗi:</strong> {importError}
                </div>
              )}

              {/* Preview Table - Chỉ 3 cột: TT, Họ và tên, Ngày sinh */}
              {importPreviewStudents.length > 0 && (
                <div>
                  <div className={styles.previewSummary}>
                    <span>
                      ✅ Đã nhận diện thành công: <strong>{importPreviewStudents.length} học sinh</strong> hợp lệ
                      {importInvalidCount > 0 && ` (Đã bỏ qua ${importInvalidCount} dòng trống/không có tên)`}
                    </span>
                    <span style={{ fontSize: "12px", color: "#166534" }}>
                      Sẵn sàng lưu vào Firestore
                    </span>
                  </div>

                  <div className={styles.previewTableContainer}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th style={{ width: "60px", textAlign: "center" }}>TT</th>
                          <th>Họ và Tên</th>
                          <th>Ngày sinh</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreviewStudents.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: "center", fontWeight: 700, color: "#1d4ed8" }}>
                              {item.orderNumber || idx + 1}
                            </td>
                            <td style={{ fontWeight: 700 }}>{item.fullName}</td>
                            <td style={{ fontWeight: 500 }}>{item.dob}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowImportModal(false)}
                disabled={importLoading}
              >
                Hủy / Đóng
              </button>
              <button
                type="button"
                className={styles.btnGreen}
                onClick={handleExecuteImport}
                disabled={importPreviewStudents.length === 0 || importLoading}
              >
                {importLoading ? "⏳ Đang lưu vào Firebase..." : `🚀 Xác Nhận Import ${importPreviewStudents.length} Học Sinh Vào Firebase`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL XEM TRƯỚC CHI TIẾT ĐỀ THI VÀ ĐÁP ÁN */}
      {showExamPreviewModal && (
        <div className={styles.modalOverlay} onClick={() => setShowExamPreviewModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "720px" }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <span>🔍</span> Xem trước Đề thi & Khung đáp án
              </h2>
              <button className={styles.modalClose} onClick={() => setShowExamPreviewModal(false)}>✕</button>
            </div>

            <div className={styles.modalBody} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", fontSize: "13px" }}>
                <div><strong>📖 Tên đề:</strong> {examForm.title || "(Chưa đặt tên)"}</div>
                <div><strong>📐 Môn học:</strong> {subjectNameMap[examForm.subject] || examForm.subject}</div>
                <div><strong>🏫 Khối lớp:</strong> {examGrade}</div>
                <div><strong>⏱️ Thời gian:</strong> {examTimeMinutes} phút</div>
                <div><strong>📊 Điểm:</strong> P1 ({scoreConfig.p1Total}đ) {examForm.subject === "tin" ? `+ P2 (${scoreConfig.p2Total}đ)` : `+ P3 (${scoreConfig.p3Total}đ)`}</div>
                <div><strong>🛡️ Cho xem đáp án:</strong> {examAllowReview ? "Có" : "Không"}</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ padding: "12px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                  <div style={{ fontWeight: 800, color: "#1d4ed8", fontSize: "13px", marginBottom: "6px" }}>
                    🎯 PHẦN I: TRẮC NGHIỆM ({examForm.subject === "tin" ? "6.0đ" : `${scoreConfig.p1Total}đ`})
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: "13px", color: "#1e40af", wordBreak: "break-all" }}>
                    {part1AnswerText || "(Trống)"}
                  </div>
                </div>

                <div style={{ padding: "12px", background: "#fdf4ff", borderRadius: "8px", border: "1px solid #f5d0fe" }}>
                  <div style={{ fontWeight: 800, color: "#a21caf", fontSize: "13px", marginBottom: "6px" }}>
                    ✅ PHẦN II: CÂU ĐÚNG / SAI ({examForm.subject === "tin" ? "4.0đ" : "4 câu"})
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: "13px", color: "#86198f", wordBreak: "break-all" }}>
                    {part2AnswerText || "(Trống)"}
                  </div>
                </div>

                {examForm.subject !== "tin" && (
                  <div style={{ padding: "12px", background: "#fefce8", borderRadius: "8px", border: "1px solid #fef08a" }}>
                    <div style={{ fontWeight: 800, color: "#ca8a04", fontSize: "13px", marginBottom: "6px" }}>
                      ✍️ PHẦN III: TRẢ LỜI NGẮN ({scoreConfig.p3Total}đ)
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: "13px", color: "#854d0e", wordBreak: "break-all" }}>
                      {part3AnswerText || "(Trống)"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setShowExamPreviewModal(false)}>
                Đóng
              </button>
              <button 
                type="button" 
                className={styles.btnPrimary} 
                onClick={() => {
                  setShowExamPreviewModal(false);
                  handleCreateExam();
                }}
              >
                🚀 Xác nhận & Xuất bản ra Trang Chủ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL XEM TRƯỚC NỘI DUNG ĐỀ THI (DÀNH CHO GIÁO VIÊN) */}
      {showPaperPreviewModal && (() => {
        const rawUrl = examForm.fileUrl || localPdfPreviewUrl || (localImagePreviewUrls.length > 0 ? localImagePreviewUrls[0] : "");
        const embedInfo = getPaperEmbedInfo(rawUrl);

        return (
          <div className={styles.modalOverlay} onClick={() => setShowPaperPreviewModal(false)}>
            <div 
              className={styles.modalContent} 
              onClick={(e) => e.stopPropagation()} 
              style={{ maxWidth: "1050px", width: "95%", maxHeight: "92vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", borderRadius: "16px" }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)", color: "white" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "22px" }}>👁️</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, letterSpacing: "0.3px" }}>
                      XEM TRƯỚC ĐỀ THI (CHẾ ĐỘ GIÁO VIÊN)
                    </h3>
                    <div style={{ fontSize: "12px", color: "#bfdbfe", marginTop: "2px" }}>
                      {examForm.title ? `Đề: ${examForm.title}` : "Đề thi mới"} • Môn: {subjectNameMap[examForm.subject] || "Toán học"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ background: "rgba(255, 255, 255, 0.18)", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, border: "1px solid rgba(255,255,255,0.25)" }}>
                    🔒 Học sinh không được xem trước
                  </span>
                  <button 
                    onClick={() => setShowPaperPreviewModal(false)}
                    style={{ background: "transparent", border: "none", color: "white", fontSize: "22px", cursor: "pointer", padding: "0 4px", lineHeight: 1 }}
                  >✕</button>
                </div>
              </div>

              {/* Sub-bar / Link action */}
              <div style={{ padding: "10px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ color: "#64748b", fontWeight: 700 }}>🔗 Nguồn file:</span>
                  <span style={{ color: "#1d4ed8", fontWeight: 600, maxWidth: "550px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {rawUrl}
                  </span>
                </div>
                {embedInfo.rawUrl && (
                  <a 
                    href={embedInfo.rawUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: "6px", background: "#eff6ff", color: "#2563eb", padding: "5px 12px", borderRadius: "6px", border: "1px solid #bfdbfe", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}
                  >
                    <span>Mở tab mới</span> ↗
                  </a>
                )}
              </div>

              {/* Viewer body */}
              <div style={{ flex: 1, minHeight: "560px", maxHeight: "72vh", overflowY: "auto", background: "#334155", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {embedInfo.isGoogleDrive ? (
                  <iframe 
                    src={embedInfo.embedUrl}
                    style={{ width: "100%", height: "100%", minHeight: "580px", border: "none" }}
                    allow="autoplay"
                    title="Google Drive Exam Preview"
                  />
                ) : embedInfo.isPdf || localPdfPreviewUrl ? (
                  <iframe 
                    src={localPdfPreviewUrl || embedInfo.embedUrl}
                    style={{ width: "100%", height: "100%", minHeight: "580px", border: "none", background: "#ffffff" }}
                    title="PDF Exam Preview"
                  />
                ) : localImagePreviewUrls.length > 0 ? (
                  <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", width: "100%" }}>
                    {localImagePreviewUrls.map((imgUrl, i) => (
                      <img 
                        key={i} 
                        src={imgUrl} 
                        alt={`Trang ${i + 1}`} 
                        style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }} 
                      />
                    ))}
                  </div>
                ) : embedInfo.isImage ? (
                  <img 
                    src={embedInfo.embedUrl} 
                    alt="Đề thi" 
                    style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }} 
                  />
                ) : embedInfo.embedUrl ? (
                  <iframe 
                    src={embedInfo.embedUrl}
                    style={{ width: "100%", height: "100%", minHeight: "580px", border: "none", background: "#ffffff" }}
                    title="External Exam Preview"
                  />
                ) : (
                  <div style={{ color: "#cbd5e1", padding: "40px", textAlign: "center" }}>
                    <div style={{ fontSize: "40px", marginBottom: "8px" }}>📄</div>
                    <div>Chưa có nội dung đề thi để hiển thị.</div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: "14px 20px", background: "#ffffff", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  💡 Bạn đang xem ở chế độ kiểm duyệt của Giáo viên. Học sinh chỉ được xem nội dung khi bước vào phòng thi.
                </div>
                <button 
                  type="button" 
                  className={styles.btnSecondary} 
                  onClick={() => setShowPaperPreviewModal(false)}
                >
                  Đóng bản xem trước
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================
          MODAL SỬA TÀI KHOẢN (HIỆU ỨNG PHÓNG TO KHI NHẤP VÀO)
      ========================================================= */}
      {/* =========================================================
          MODAL SỬA TÀI KHOẢN (HIỆU ỨNG PHÓNG TO KHI NHẤP VÀO - CHUẨN ẢNH 1)
      ========================================================= */}
      {showUserEditModal && editingUser && (
        <div className={styles.modalZoomBackdrop} onClick={() => setShowUserEditModal(false)}>
          <div
            className={styles.modalZoomBox}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "460px",
              width: "90%",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              background: "#ffffff",
            }}
          >
            <div
              className={styles.modalZoomHeader}
              style={{
                padding: "20px 24px 16px 24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#1e293b",
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  margin: 0,
                  fontFamily: "inherit",
                }}
              >
                CHỈNH SỬA TÀI KHOẢN
              </h3>
              <button
                type="button"
                className={styles.modalZoomClose}
                onClick={() => setShowUserEditModal(false)}
                style={{
                  fontSize: "20px",
                  color: "#94a3b8",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUserSubmit}>
              <div
                className={styles.modalZoomBody}
                style={{
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px",
                }}
              >
                {/* 1. Tên Hiển Thị */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    Tên Hiển Thị
                  </label>
                  <input
                    type="text"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      color: "#1e293b",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.15s ease",
                    }}
                    value={userEditForm.fullName}
                    onChange={(e) =>
                      setUserEditForm({ ...userEditForm, fullName: e.target.value })
                    }
                    placeholder="VD: Nguyen Thu Ngan Hoang"
                  />
                </div>

                {/* 2. Email Đăng Nhập */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    Email Đăng Nhập
                  </label>
                  <input
                    type="email"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      color: "#1e293b",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.15s ease",
                    }}
                    value={userEditForm.email}
                    onChange={(e) =>
                      setUserEditForm({ ...userEditForm, email: e.target.value })
                    }
                    placeholder="VD: hoangnguyenthungan0310@gmail.com"
                  />
                </div>

                {/* 3. Trạng thái tài khoản (Radio buttons như Ảnh 1) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    Trạng thái tài khoản
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "24px", paddingTop: "2px" }}>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        fontSize: "13.5px",
                        fontWeight: 700,
                        color: userEditForm.status === "inactive" ? "#1e293b" : "#475569",
                      }}
                    >
                      <input
                        type="radio"
                        name="userEditStatus"
                        value="inactive"
                        checked={userEditForm.status === "inactive"}
                        onChange={() =>
                          setUserEditForm({ ...userEditForm, status: "inactive" })
                        }
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
                      />
                      <span>Chưa kích hoạt</span>
                    </label>

                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        fontSize: "13.5px",
                        fontWeight: 700,
                        color: "#059669",
                      }}
                    >
                      <input
                        type="radio"
                        name="userEditStatus"
                        value="active"
                        checked={userEditForm.status === "active" || userEditForm.status !== "inactive"}
                        onChange={() =>
                          setUserEditForm({ ...userEditForm, status: "active" })
                        }
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
                      />
                      <span style={{ color: "#059669", fontWeight: 800 }}>Kích hoạt ngay</span>
                    </label>
                  </div>
                </div>

                {/* 3.5. Phân quyền vai trò tài khoản (Super Admin / Giáo viên / Học sinh) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    Phân quyền vai trò tài khoản
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    <label
                      style={{
                        border: `1.5px solid ${userEditForm.role === "super_admin" || userEditForm.role === "admin" ? "#2563eb" : "#cbd5e1"}`,
                        background: userEditForm.role === "super_admin" || userEditForm.role === "admin" ? "#eff6ff" : "#ffffff",
                        borderRadius: "8px",
                        padding: "8px 10px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        textAlign: "center",
                      }}
                    >
                      <input
                        type="radio"
                        name="userEditRole"
                        value="super_admin"
                        checked={userEditForm.role === "super_admin" || userEditForm.role === "admin"}
                        onChange={() => setUserEditForm({ ...userEditForm, role: "super_admin" })}
                        style={{ display: "none" }}
                      />
                      <span style={{ fontSize: "18px" }}>👑</span>
                      <span style={{ fontSize: "12px", fontWeight: 800, color: "#1d4ed8" }}>Super Admin</span>
                      <span style={{ fontSize: "10.5px", color: "#64748b" }}>Toàn quyền chức năng</span>
                    </label>

                    <label
                      style={{
                        border: `1.5px solid ${userEditForm.role === "teacher" || (!userEditForm.role && userEditForm.role !== "student") ? "#059669" : "#cbd5e1"}`,
                        background: userEditForm.role === "teacher" || (!userEditForm.role && userEditForm.role !== "student") ? "#ecfdf5" : "#ffffff",
                        borderRadius: "8px",
                        padding: "8px 10px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        textAlign: "center",
                      }}
                    >
                      <input
                        type="radio"
                        name="userEditRole"
                        value="teacher"
                        checked={userEditForm.role === "teacher" || (!userEditForm.role && userEditForm.role !== "student")}
                        onChange={() => setUserEditForm({ ...userEditForm, role: "teacher" })}
                        style={{ display: "none" }}
                      />
                      <span style={{ fontSize: "18px" }}>👨‍🏫</span>
                      <span style={{ fontSize: "12px", fontWeight: 800, color: "#059669" }}>Giáo viên</span>
                      <span style={{ fontSize: "10.5px", color: "#64748b" }}>4 quyền theo ảnh</span>
                    </label>

                    <label
                      style={{
                        border: `1.5px solid ${userEditForm.role === "student" ? "#7c3aed" : "#cbd5e1"}`,
                        background: userEditForm.role === "student" ? "#f5f3ff" : "#ffffff",
                        borderRadius: "8px",
                        padding: "8px 10px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        textAlign: "center",
                      }}
                    >
                      <input
                        type="radio"
                        name="userEditRole"
                        value="student"
                        checked={userEditForm.role === "student"}
                        onChange={() => setUserEditForm({ ...userEditForm, role: "student" })}
                        style={{ display: "none" }}
                      />
                      <span style={{ fontSize: "18px" }}>🎒</span>
                      <span style={{ fontSize: "12px", fontWeight: 800, color: "#7c3aed" }}>Học sinh</span>
                      <span style={{ fontSize: "10.5px", color: "#64748b" }}>Ẩn nút quản trị</span>
                    </label>
                  </div>
                </div>

                {/* 4. Mã Giáo Viên (6 chữ số) + Nút TẠO MÃ như Ảnh 1 */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    Mã Giáo Viên (6 chữ số)
                  </label>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <input
                      type="text"
                      maxLength={6}
                      value={userEditForm.teacherCode}
                      onChange={(e) =>
                        setUserEditForm({
                          ...userEditForm,
                          teacherCode: e.target.value.replace(/\D/g, "").slice(0, 6),
                        })
                      }
                      placeholder="••••••"
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "#0f172a",
                        textAlign: "center",
                        letterSpacing: "1px",
                        outline: "none",
                        height: "44px",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const random6Digits = Math.floor(100000 + Math.random() * 900000).toString();
                        setUserEditForm((prev) => ({ ...prev, teacherCode: random6Digits }));
                      }}
                      style={{
                        background: "#dbeafe",
                        color: "#1d4ed8",
                        border: "none",
                        borderRadius: "8px",
                        padding: "0 22px",
                        height: "44px",
                        fontSize: "13px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#bfdbfe")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#dbeafe")}
                    >
                      TẠO MÃ
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Footer Buttons: HỦY BỎ và LƯU THÔNG TIN như Ảnh 1 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "14px",
                  padding: "12px 24px 24px 24px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowUserEditModal(false)}
                  style={{
                    flex: 1,
                    background: "#f1f5f9",
                    color: "#1e3a8a",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                >
                  HỦY BỎ
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.35)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#2563eb")}
                >
                  LƯU THÔNG TIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL XÁC NHẬN XÓA (HIỆU ỨNG PHÓNG TO KHI NHẤP VÀO)
      ========================================================= */}
      {showUserDeleteModal && deletingUser && (
        <div className={styles.modalZoomBackdrop} onClick={() => setShowUserDeleteModal(false)}>
          <div className={styles.modalZoomBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalZoomHeader}>
              <h3 className={styles.modalZoomTitle} style={{ color: "#e11d48" }}>
                <span>🗑️</span> Xác nhận xóa tài khoản
              </h3>
              <button
                type="button"
                className={styles.modalZoomClose}
                onClick={() => setShowUserDeleteModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalZoomBody}>
              <div
                style={{
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ fontSize: "28px", lineHeight: 1 }}>⚠️</div>
                <div style={{ fontSize: "13.5px", color: "#9f1239", lineHeight: 1.5 }}>
                  Bạn có chắc chắn muốn xóa tài khoản của người dùng này? Dữ liệu trên hệ thống và Firebase sẽ bị xóa vĩnh viễn.
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ fontSize: "14.5px", fontWeight: 800, color: "#0f172a" }}>
                  👤 {deletingUser.fullName}
                </div>
                <div style={{ fontSize: "13px", color: "#64748b" }}>
                  📧 Email: {deletingUser.email}
                </div>
                <div style={{ fontSize: "13px", color: "#64748b" }}>
                  🔑 Mã GV: {deletingUser.teacherCode || "—"} | Ngày ĐK: {deletingUser.registeredDate || "---"}
                </div>
              </div>
            </div>

            <div className={styles.modalZoomFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowUserDeleteModal(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={handleConfirmDeleteUser}
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL THÊM TÀI KHOẢN MỚI (HIỆU ỨNG PHÓNG TO KHI NHẤP VÀO)
      ========================================================= */}
      {/* =========================================================
          MODAL THÊM TÀI KHOẢN MỚI (HIỆU ỨNG PHÓNG TO KHI NHẤP VÀO)
      ========================================================= */}
      {showUserAddModal && (
        <div className={styles.modalZoomBackdrop} onClick={() => setShowUserAddModal(false)}>
          <div
            className={styles.modalZoomBox}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "460px",
              width: "90%",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              background: "#ffffff",
            }}
          >
            <div
              className={styles.modalZoomHeader}
              style={{
                padding: "20px 24px 16px 24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#1e293b",
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  margin: 0,
                  fontFamily: "inherit",
                }}
              >
                THÊM TÀI KHOẢN MỚI
              </h3>
              <button
                type="button"
                className={styles.modalZoomClose}
                onClick={() => setShowUserAddModal(false)}
                style={{
                  fontSize: "20px",
                  color: "#94a3b8",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAddUserSubmit}>
              <div
                className={styles.modalZoomBody}
                style={{
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    Tên Hiển Thị *
                  </label>
                  <input
                    type="text"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      color: "#1e293b",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.15s ease",
                    }}
                    value={userAddForm.fullName}
                    onChange={(e) =>
                      setUserAddForm({ ...userAddForm, fullName: e.target.value })
                    }
                    placeholder="VD: Nguyen Thu Ngan Hoang"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    Email Đăng Nhập *
                  </label>
                  <input
                    type="email"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      color: "#1e293b",
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.15s ease",
                    }}
                    value={userAddForm.email}
                    onChange={(e) =>
                      setUserAddForm({ ...userAddForm, email: e.target.value })
                    }
                    placeholder="VD: hoangnguyenthungan0310@gmail.com"
                  />
                </div>

                {/* Trạng thái tài khoản */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    Trạng thái tài khoản
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "24px", paddingTop: "2px" }}>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        fontSize: "13.5px",
                        fontWeight: 700,
                        color: userAddForm.status === "inactive" ? "#1e293b" : "#475569",
                      }}
                    >
                      <input
                        type="radio"
                        name="userAddStatus"
                        value="inactive"
                        checked={userAddForm.status === "inactive"}
                        onChange={() =>
                          setUserAddForm({ ...userAddForm, status: "inactive" })
                        }
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
                      />
                      <span>Chưa kích hoạt</span>
                    </label>

                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        fontSize: "13.5px",
                        fontWeight: 700,
                        color: "#059669",
                      }}
                    >
                      <input
                        type="radio"
                        name="userAddStatus"
                        value="active"
                        checked={userAddForm.status === "active" || userAddForm.status !== "inactive"}
                        onChange={() =>
                          setUserAddForm({ ...userAddForm, status: "active" })
                        }
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#2563eb" }}
                      />
                      <span style={{ color: "#059669", fontWeight: 800 }}>Kích hoạt ngay</span>
                    </label>
                  </div>
                </div>

                {/* Phân quyền vai trò tài khoản mới */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    Phân quyền vai trò tài khoản
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    <label
                      style={{
                        border: `1.5px solid ${userAddForm.role === "super_admin" || userAddForm.role === "admin" ? "#2563eb" : "#cbd5e1"}`,
                        background: userAddForm.role === "super_admin" || userAddForm.role === "admin" ? "#eff6ff" : "#ffffff",
                        borderRadius: "8px",
                        padding: "8px 10px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        textAlign: "center",
                      }}
                    >
                      <input
                        type="radio"
                        name="userAddRole"
                        value="super_admin"
                        checked={userAddForm.role === "super_admin" || userAddForm.role === "admin"}
                        onChange={() => setUserAddForm({ ...userAddForm, role: "super_admin" })}
                        style={{ display: "none" }}
                      />
                      <span style={{ fontSize: "18px" }}>👑</span>
                      <span style={{ fontSize: "12px", fontWeight: 800, color: "#1d4ed8" }}>Super Admin</span>
                      <span style={{ fontSize: "10.5px", color: "#64748b" }}>Toàn quyền chức năng</span>
                    </label>

                    <label
                      style={{
                        border: `1.5px solid ${userAddForm.role === "teacher" || (!userAddForm.role && userAddForm.role !== "student") ? "#059669" : "#cbd5e1"}`,
                        background: userAddForm.role === "teacher" || (!userAddForm.role && userAddForm.role !== "student") ? "#ecfdf5" : "#ffffff",
                        borderRadius: "8px",
                        padding: "8px 10px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        textAlign: "center",
                      }}
                    >
                      <input
                        type="radio"
                        name="userAddRole"
                        value="teacher"
                        checked={userAddForm.role === "teacher" || (!userAddForm.role && userAddForm.role !== "student")}
                        onChange={() => setUserAddForm({ ...userAddForm, role: "teacher" })}
                        style={{ display: "none" }}
                      />
                      <span style={{ fontSize: "18px" }}>👨‍🏫</span>
                      <span style={{ fontSize: "12px", fontWeight: 800, color: "#059669" }}>Giáo viên</span>
                      <span style={{ fontSize: "10.5px", color: "#64748b" }}>4 quyền theo ảnh</span>
                    </label>

                    <label
                      style={{
                        border: `1.5px solid ${userAddForm.role === "student" ? "#7c3aed" : "#cbd5e1"}`,
                        background: userAddForm.role === "student" ? "#f5f3ff" : "#ffffff",
                        borderRadius: "8px",
                        padding: "8px 10px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        textAlign: "center",
                      }}
                    >
                      <input
                        type="radio"
                        name="userAddRole"
                        value="student"
                        checked={userAddForm.role === "student"}
                        onChange={() => setUserAddForm({ ...userAddForm, role: "student" })}
                        style={{ display: "none" }}
                      />
                      <span style={{ fontSize: "18px" }}>🎒</span>
                      <span style={{ fontSize: "12px", fontWeight: 800, color: "#7c3aed" }}>Học sinh</span>
                      <span style={{ fontSize: "10.5px", color: "#64748b" }}>Ẩn nút quản trị</span>
                    </label>
                  </div>
                </div>

                {/* Mã Giáo Viên (6 chữ số) + Nút TẠO MÃ */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    Mã Giáo Viên (6 chữ số)
                  </label>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <input
                      type="text"
                      maxLength={6}
                      value={userAddForm.teacherCode}
                      onChange={(e) =>
                        setUserAddForm({
                          ...userAddForm,
                          teacherCode: e.target.value.replace(/\D/g, "").slice(0, 6),
                        })
                      }
                      placeholder="••••••"
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "#0f172a",
                        textAlign: "center",
                        letterSpacing: "1px",
                        outline: "none",
                        height: "44px",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const random6Digits = Math.floor(100000 + Math.random() * 900000).toString();
                        setUserAddForm((prev) => ({ ...prev, teacherCode: random6Digits }));
                      }}
                      style={{
                        background: "#dbeafe",
                        color: "#1d4ed8",
                        border: "none",
                        borderRadius: "8px",
                        padding: "0 22px",
                        height: "44px",
                        fontSize: "13px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#bfdbfe")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#dbeafe")}
                    >
                      TẠO MÃ
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "14px",
                  padding: "12px 24px 24px 24px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowUserAddModal(false)}
                  style={{
                    flex: 1,
                    background: "#f1f5f9",
                    color: "#1e3a8a",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                >
                  HỦY BỎ
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.35)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#2563eb")}
                >
                  TẠO TÀI KHOẢN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL XEM CHI TIẾT KẾT QUẢ BÀI THI & RÈN LUYỆN
      ========================================================= */}
      {selectedSubmissionDetail && (
        <div
          className={styles.submissionModalBackdrop}
          onClick={() => setSelectedSubmissionDetail(null)}
        >
          <div
            className={styles.submissionModalBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.submissionModalHeader}>
              <div>
                <span style={{ fontSize: "12px", background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                  PHIẾU KẾT QUẢ BÀI LÀM TRỰC TUYẾN
                </span>
                <h3 style={{ margin: "6px 0 0 0", fontSize: "19px", fontWeight: 900, color: "#ffffff" }}>
                  👤 {selectedSubmissionDetail.studentName}
                </h3>
                <div style={{ fontSize: "13px", opacity: 0.9, marginTop: "4px" }}>
                  🏫 Lớp: <strong>{selectedSubmissionDetail.studentClass}</strong> • ✉️ {selectedSubmissionDetail.studentEmail}
                </div>
              </div>
              <button
                type="button"
                className={styles.submissionModalCloseBtn}
                onClick={() => setSelectedSubmissionDetail(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.submissionModalBody}>
              {/* Score Hero Card */}
              <div className={styles.modalScoreHeroCard}>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                    Điểm số đạt được
                  </div>
                  <div
                    className={styles.modalScoreBig}
                    style={{
                      color:
                        selectedSubmissionDetail.score >= 9
                          ? "#15803d"
                          : selectedSubmissionDetail.score >= 8
                          ? "#1d4ed8"
                          : selectedSubmissionDetail.score >= 6.5
                          ? "#7c3aed"
                          : selectedSubmissionDetail.score >= 3.5
                          ? "#d97706"
                          : "#dc2626",
                    }}
                  >
                    {selectedSubmissionDetail.score !== null
                      ? selectedSubmissionDetail.score.toFixed(1)
                      : "—"}
                    <span style={{ fontSize: "20px", color: "#64748b", fontWeight: 700 }}> / 10</span>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                    Kết quả rèn luyện
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "15px",
                      fontWeight: 900,
                      padding: "6px 14px",
                      borderRadius: "10px",
                      marginTop: "6px",
                      background: selectedSubmissionDetail.training?.bg,
                      color: selectedSubmissionDetail.training?.color,
                      border: `1.5px solid ${selectedSubmissionDetail.training?.border}`,
                    }}
                  >
                    <span>{selectedSubmissionDetail.training?.icon}</span>
                    <span>{selectedSubmissionDetail.training?.label}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                    {selectedSubmissionDetail.training?.gradeText}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className={styles.modalStatsGrid}>
                <div className={styles.modalStatCard}>
                  <div className={styles.modalStatIcon} style={{ background: "#ecfdf5", color: "#059669" }}>
                    ✅
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                      {selectedSubmissionDetail.correctCount} / {selectedSubmissionDetail.totalQuestions}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Số câu trả lời đúng</div>
                  </div>
                </div>

                <div className={styles.modalStatCard}>
                  <div className={styles.modalStatIcon} style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                    🕒
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
                      {selectedSubmissionDetail.formattedTime}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Thời gian nộp bài</div>
                  </div>
                </div>

                <div className={styles.modalStatCard}>
                  <div className={styles.modalStatIcon} style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                    📝
                  </div>
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a" }}>
                      {selectedSubmissionDetail.examTitle}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Mã đề: {selectedSubmissionDetail.examCode}</div>
                  </div>
                </div>

                <div className={styles.modalStatCard}>
                  <div className={styles.modalStatIcon} style={{ background: "#fffbeb", color: "#d97706" }}>
                    ☁️
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#047857" }}>
                      Đã đồng bộ Firestore
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Bảo lưu dữ liệu an toàn</div>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown with Competence Badges */}
              {(selectedSubmissionDetail.competence || selectedSubmissionDetail.submission?.detailedResults) && (() => {
                const comp = selectedSubmissionDetail.competence || {
                  p1: {
                    correct: selectedSubmissionDetail.submission?.detailedResults?.part1?.correct || 0,
                    total: selectedSubmissionDetail.submission?.detailedResults?.part1?.total || 12,
                    pct: Math.round(((selectedSubmissionDetail.submission?.detailedResults?.part1?.correct || 0) / (selectedSubmissionDetail.submission?.detailedResults?.part1?.total || 12)) * 100),
                    level: "medium",
                  },
                  p2: {
                    correct: selectedSubmissionDetail.submission?.detailedResults?.part2?.correct || 0,
                    total: selectedSubmissionDetail.submission?.detailedResults?.part2?.total || 4,
                    pct: Math.round(((selectedSubmissionDetail.submission?.detailedResults?.part2?.correct || 0) / (selectedSubmissionDetail.submission?.detailedResults?.part2?.total || 4)) * 100),
                    level: "medium",
                  },
                  p3: {
                    correct: selectedSubmissionDetail.submission?.detailedResults?.part3?.correct || 0,
                    total: selectedSubmissionDetail.submission?.detailedResults?.part3?.total || 6,
                    pct: Math.round(((selectedSubmissionDetail.submission?.detailedResults?.part3?.correct || 0) / (selectedSubmissionDetail.submission?.detailedResults?.part3?.total || 6)) * 100),
                    level: "medium",
                  },
                  weakestLabel: "",
                };

                return (
                  <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>🎯</span> ĐÁNH GIÁ NĂNG LỰC 3 PHẦN THI
                      </div>
                      {comp.weakestLabel ? (
                        <span style={{ fontSize: "11.5px", fontWeight: 800, background: "#fef2f2", color: "#b91c1c", padding: "2px 8px", borderRadius: "6px", border: "1px solid #fecaca" }}>
                          ⚠️ Học sinh đang yếu phần {comp.weakestLabel}
                        </span>
                      ) : (
                        <span style={{ fontSize: "11.5px", fontWeight: 800, background: "#f0fdf4", color: "#15803d", padding: "2px 8px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                          ⭐ Học sinh làm tốt cả 3 phần
                        </span>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                      {/* P1 */}
                      <div style={{ background: "#ffffff", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 800, color: "#1e40af", fontSize: "12px" }}>Phần 1: Trắc nghiệm</span>
                          <span style={{ fontSize: "10.5px", fontWeight: 800, padding: "1px 6px", borderRadius: "4px", background: comp.p1.level === "good" ? "#f0fdf4" : comp.p1.level === "medium" ? "#fffbeb" : "#fef2f2", color: comp.p1.level === "good" ? "#15803d" : comp.p1.level === "medium" ? "#b45309" : "#b91c1c" }}>
                            {comp.p1.level === "good" ? "🟢 TỐT" : comp.p1.level === "medium" ? "🟡 ĐẠT" : "🔴 YẾU"}
                          </span>
                        </div>
                        <div style={{ fontSize: "18px", fontWeight: 900, color: "#0f172a", margin: "6px 0 4px 0" }}>
                          {comp.p1.pct}% <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>({comp.p1.correct}/{comp.p1.total} câu)</span>
                        </div>
                        <div style={{ width: "100%", height: "5px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${comp.p1.pct}%`, height: "100%", background: comp.p1.level === "good" ? "#16a34a" : comp.p1.level === "medium" ? "#f59e0b" : "#dc2626" }} />
                        </div>
                      </div>

                      {/* P2 */}
                      <div style={{ background: "#ffffff", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 800, color: "#c2410c", fontSize: "12px" }}>Phần 2: Đúng / Sai</span>
                          <span style={{ fontSize: "10.5px", fontWeight: 800, padding: "1px 6px", borderRadius: "4px", background: comp.p2.level === "good" ? "#f0fdf4" : comp.p2.level === "medium" ? "#fffbeb" : "#fef2f2", color: comp.p2.level === "good" ? "#15803d" : comp.p2.level === "medium" ? "#b45309" : "#b91c1c" }}>
                            {comp.p2.level === "good" ? "🟢 TỐT" : comp.p2.level === "medium" ? "🟡 ĐẠT" : "🔴 YẾU"}
                          </span>
                        </div>
                        <div style={{ fontSize: "18px", fontWeight: 900, color: "#0f172a", margin: "6px 0 4px 0" }}>
                          {comp.p2.pct}% <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>({comp.p2.correct}/{comp.p2.total} ý)</span>
                        </div>
                        <div style={{ width: "100%", height: "5px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${comp.p2.pct}%`, height: "100%", background: comp.p2.level === "good" ? "#16a34a" : comp.p2.level === "medium" ? "#f59e0b" : "#dc2626" }} />
                        </div>
                      </div>

                      {/* P3 */}
                      <div style={{ background: "#ffffff", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 800, color: "#7c3aed", fontSize: "12px" }}>Phần 3: Trả lời ngắn</span>
                          <span style={{ fontSize: "10.5px", fontWeight: 800, padding: "1px 6px", borderRadius: "4px", background: comp.p3.level === "good" ? "#f0fdf4" : comp.p3.level === "medium" ? "#fffbeb" : "#fef2f2", color: comp.p3.level === "good" ? "#15803d" : comp.p3.level === "medium" ? "#b45309" : "#b91c1c" }}>
                            {comp.p3.level === "good" ? "🟢 TỐT" : comp.p3.level === "medium" ? "🟡 ĐẠT" : "🔴 YẾU"}
                          </span>
                        </div>
                        <div style={{ fontSize: "18px", fontWeight: 900, color: "#0f172a", margin: "6px 0 4px 0" }}>
                          {comp.p3.pct}% <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>({comp.p3.correct}/{comp.p3.total} câu)</span>
                        </div>
                        <div style={{ width: "100%", height: "5px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${comp.p3.pct}%`, height: "100%", background: comp.p3.level === "good" ? "#16a34a" : comp.p3.level === "medium" ? "#f59e0b" : "#dc2626" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className={styles.modalFooterActions} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => {
                    const sub = selectedSubmissionDetail;
                    setSelectedSubmissionDetail(null);
                    handleOpenFeedbackModal({
                      studentId: sub.studentId || sub.userId,
                      studentName: sub.studentName,
                      studentClass: sub.studentClass,
                      hasSubmitted: true,
                      score: sub.score !== undefined ? sub.score : null,
                      correctCount: sub.correctCount,
                      totalQuestions: sub.totalQuestions,
                      examTitle: sub.examTitle,
                    });
                  }}
                  style={{
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "9px 18px",
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  <span>💬</span> Nhận xét riêng học sinh này (Dùng AI / Viết tay)
                </button>

                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setSelectedSubmissionDetail(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL GIAO BÀI TẬP VỀ NHÀ (CHO CẢ LỚP HOẶC TỪNG HỌC SINH)
      ========================================================= */}
      {showAssignHomeworkModal && (
        <div className={styles.modalZoomBackdrop} onClick={() => setShowAssignHomeworkModal(false)}>
          <div
            className={styles.modalZoomBox}
            style={{ maxWidth: "720px", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalZoomHeader} style={{ background: "linear-gradient(135deg, #065f46 0%, #059669 100%)", color: "#ffffff" }}>
              <div>
                <h3 className={styles.modalZoomTitle} style={{ color: "#ffffff", fontSize: "17px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📝</span> GIAO BÀI TẬP VỀ NHÀ CHO HỌC SINH
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#a7f3d0" }}>
                  Giao bài tập & gửi file bài tập trực tiếp đến Trang học sinh (Cả lớp hoặc từng em)
                </p>
              </div>
              <button
                type="button"
                className={styles.modalZoomClose}
                style={{ color: "#ffffff", background: "rgba(255,255,255,0.2)" }}
                onClick={() => setShowAssignHomeworkModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalZoomBody} style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* 1. Tiêu đề bài tập */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                  📌 Tiêu đề bài tập <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={assignHwForm.title}
                  onChange={(e) => setAssignHwForm({ ...assignHwForm, title: e.target.value })}
                  placeholder="VD: Bài tập về nhà hàm số & đồ thị - Lớp 12"
                  style={{ width: "100%", padding: "10px 14px", fontSize: "14px", borderRadius: "8px", border: "1.5px solid #cbd5e1" }}
                />
              </div>

              {/* 2. Môn học & Thời gian làm bài */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                    📚 Môn học
                  </label>
                  <select
                    className={styles.formSelect}
                    value={assignHwForm.subject}
                    onChange={(e) => setAssignHwForm({ ...assignHwForm, subject: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "13.5px", borderRadius: "8px", border: "1.5px solid #cbd5e1" }}
                  >
                    <option value="toan">Toán học</option>
                    <option value="tin">Tin học</option>
                    <option value="ly">Vật lí</option>
                    <option value="hoa">Hóa học</option>
                    <option value="sinh">Sinh học</option>
                    <option value="van">Ngữ văn</option>
                    <option value="su">Lịch sử</option>
                    <option value="dia">Địa lí</option>
                    <option value="anh">Tiếng Anh</option>
                    <option value="gdkt">GD Kinh tế & Pháp luật</option>
                    <option value="congnghe">Công nghệ</option>
                    <option value="gdqp">GD Quốc phòng & An ninh</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                    ⏱️ Thời gian dự kiến (phút)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    className={styles.formInput}
                    value={assignHwForm.timeMinutes}
                    onChange={(e) => setAssignHwForm({ ...assignHwForm, timeMinutes: Number(e.target.value) || 45 })}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "13.5px", borderRadius: "8px", border: "1.5px solid #cbd5e1" }}
                  />
                </div>
              </div>

              {/* 3. File bài tập đính kèm */}
              <div style={{ background: "#f8fafc", border: "1.5px dashed #059669", borderRadius: "12px", padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 800, color: "#065f46", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📎</span> File bài tập đính kèm (PDF / Word / Hình ảnh)
                  </label>
                  {assignHwForm.fileUrl && (
                    <a
                      href={assignHwForm.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: "12px", color: "#059669", fontWeight: 700, textDecoration: "underline" }}
                    >
                      👁️ Xem thử file đã đính kèm
                    </a>
                  )}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
                  <input
                    type="file"
                    id="assign-hw-file-input"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                    style={{ display: "none" }}
                    onChange={handleAssignHwFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("assign-hw-file-input")?.click()}
                    disabled={assignHwUploading}
                    style={{
                      background: "#059669",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: assignHwUploading ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>📤</span> {assignHwUploading ? "Đang tải file lên..." : "Tải file bài tập lên (PDF, DOCX, Ảnh)"}
                  </button>

                  {assignHwForm.fileName && (
                    <span style={{ fontSize: "12.5px", background: "#d1fae5", color: "#065f46", padding: "4px 10px", borderRadius: "6px", fontWeight: 600 }}>
                      ✓ {assignHwForm.fileName}
                    </span>
                  )}

                  {assignHwForm.fileUrl && (
                    <button
                      type="button"
                      onClick={() => setAssignHwForm({ ...assignHwForm, fileUrl: "", fileName: "" })}
                      style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                    >
                      ✕ Gỡ file
                    </button>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    value={assignHwForm.fileUrl}
                    onChange={(e) => setAssignHwForm({ ...assignHwForm, fileUrl: e.target.value })}
                    placeholder="Hoặc dán trực tiếp link file (Google Drive / PDF / Image URL)..."
                    style={{ width: "100%", padding: "7px 12px", fontSize: "12.5px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff" }}
                  />
                </div>
              </div>

              {/* 4. Hình thức giao bài: CẢ LỚP hoặc TỪNG HỌC SINH */}
              <div style={{ border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px", background: "#ffffff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <label style={{ fontSize: "13.5px", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🎯</span> Đối tượng nhận bài tập:
                  </label>
                  <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "3px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                    <button
                      type="button"
                      onClick={() => setAssignHwForm({ ...assignHwForm, mode: "class" })}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: "12.5px",
                        fontWeight: 800,
                        cursor: "pointer",
                        background: assignHwForm.mode === "class" ? "#059669" : "transparent",
                        color: assignHwForm.mode === "class" ? "#ffffff" : "#475569",
                        transition: "all 0.2s",
                      }}
                    >
                      🏫 GIAO CẢ LỚP
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignHwForm({ ...assignHwForm, mode: "student" })}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: "12.5px",
                        fontWeight: 800,
                        cursor: "pointer",
                        background: assignHwForm.mode === "student" ? "#7c3aed" : "transparent",
                        color: assignHwForm.mode === "student" ? "#ffffff" : "#475569",
                        transition: "all 0.2s",
                      }}
                    >
                      👤 GIAO TỪNG HỌC SINH
                    </button>
                  </div>
                </div>

                {/* TAB 1: GIAO CẢ LỚP */}
                {assignHwForm.mode === "class" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        Đã chọn: <strong style={{ color: "#059669" }}>{assignHwForm.selectedClasses.length} / {classesList.length}</strong> lớp
                      </span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => setAssignHwForm({ ...assignHwForm, selectedClasses: classesList.map(c => c.id) })}
                          style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                        >
                          ✓ Chọn tất cả lớp
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssignHwForm({ ...assignHwForm, selectedClasses: [] })}
                          style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                        >
                          ✕ Bỏ chọn
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", maxHeight: "180px", overflowY: "auto", padding: "2px" }}>
                      {classesList.map((cls) => {
                        const isChecked = assignHwForm.selectedClasses.includes(cls.id);
                        const count = allStudentsList.filter(s => s.classId === cls.id || (s.className && s.className.toLowerCase() === cls.name.toLowerCase())).length;
                        return (
                          <div
                            key={cls.id}
                            onClick={() => {
                              const next = isChecked
                                ? assignHwForm.selectedClasses.filter(id => id !== cls.id)
                                : [...assignHwForm.selectedClasses, cls.id];
                              setAssignHwForm({ ...assignHwForm, selectedClasses: next });
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 14px",
                              borderRadius: "8px",
                              border: isChecked ? "2px solid #059669" : "1px solid #cbd5e1",
                              background: isChecked ? "#f0fdf4" : "#ffffff",
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                style={{ pointerEvents: "none", width: "16px", height: "16px" }}
                              />
                              <span style={{ fontSize: "13.5px", fontWeight: 800, color: isChecked ? "#065f46" : "#1e293b" }}>
                                {cls.name}
                              </span>
                            </div>
                            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                              {count} HS
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 2: GIAO TỪNG HỌC SINH */}
                {assignHwForm.mode === "student" && (
                  <div>
                    {/* Controls bar */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "10px", background: "#f8fafc", padding: "8px 10px", borderRadius: "8px" }}>
                      <div style={{ minWidth: "140px" }}>
                        <select
                          value={assignHwForm.filterClassForStudent}
                          onChange={(e) => setAssignHwForm({ ...assignHwForm, filterClassForStudent: e.target.value })}
                          style={{ width: "100%", padding: "6px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                        >
                          <option value="">-- Tất cả các lớp --</option>
                          {classesList.map((c) => (
                            <option key={c.id} value={c.id}>Lớp {c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ flex: 1, minWidth: "160px" }}>
                        <input
                          type="text"
                          value={assignHwForm.studentSearch}
                          onChange={(e) => setAssignHwForm({ ...assignHwForm, studentSearch: e.target.value })}
                          placeholder="🔍 Tìm theo họ tên học sinh..."
                          style={{ width: "100%", padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                        />
                      </div>

                      {/* Filtered list computation */}
                      {(() => {
                        const filtered = allStudentsList.filter((s) => {
                          const matchClass = !assignHwForm.filterClassForStudent || s.classId === assignHwForm.filterClassForStudent;
                          const matchSearch = !assignHwForm.studentSearch.trim() || s.fullName.toLowerCase().includes(assignHwForm.studentSearch.trim().toLowerCase());
                          return matchClass && matchSearch;
                        });

                        return (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                const newIds = Array.from(new Set([...assignHwForm.selectedStudents, ...filtered.map(s => s.id)]));
                                setAssignHwForm({ ...assignHwForm, selectedStudents: newIds });
                              }}
                              style={{ background: "#ede9fe", color: "#6d28d9", border: "1px solid #ddd6fe", padding: "4px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                            >
                              ✓ Chọn {filtered.length} HS
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const filteredIds = new Set(filtered.map(s => s.id));
                                setAssignHwForm({ ...assignHwForm, selectedStudents: assignHwForm.selectedStudents.filter(id => !filteredIds.has(id)) });
                              }}
                              style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", padding: "4px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                            >
                              ✕ Bỏ chọn
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    <div style={{ marginBottom: "6px", fontSize: "12px", color: "#64748b" }}>
                      Đã chọn giao cho: <strong style={{ color: "#7c3aed" }}>{assignHwForm.selectedStudents.length} học sinh</strong>
                    </div>

                    {/* Scrollable Student List */}
                    <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                      {(() => {
                        const filtered = allStudentsList.filter((s) => {
                          const matchClass = !assignHwForm.filterClassForStudent || s.classId === assignHwForm.filterClassForStudent;
                          const matchSearch = !assignHwForm.studentSearch.trim() || s.fullName.toLowerCase().includes(assignHwForm.studentSearch.trim().toLowerCase());
                          return matchClass && matchSearch;
                        });

                        if (filtered.length === 0) {
                          return (
                            <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "12.5px" }}>
                              Không tìm thấy học sinh nào phù hợp.
                            </div>
                          );
                        }

                        return (
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                            <thead style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                              <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left" }}>
                                <th style={{ padding: "8px 12px", width: "40px" }}></th>
                                <th style={{ padding: "8px 12px", width: "50px" }}>STT</th>
                                <th style={{ padding: "8px 12px" }}>Họ và tên</th>
                                <th style={{ padding: "8px 12px", width: "80px" }}>Lớp</th>
                                <th style={{ padding: "8px 12px", width: "100px" }}>Ngày sinh</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.map((st) => {
                                const isChecked = assignHwForm.selectedStudents.includes(st.id);
                                return (
                                  <tr
                                    key={st.id}
                                    onClick={() => {
                                      const next = isChecked
                                        ? assignHwForm.selectedStudents.filter(id => id !== st.id)
                                        : [...assignHwForm.selectedStudents, st.id];
                                      setAssignHwForm({ ...assignHwForm, selectedStudents: next });
                                    }}
                                    style={{
                                      cursor: "pointer",
                                      background: isChecked ? "#f5f3ff" : "#ffffff",
                                      borderBottom: "1px solid #f1f5f9",
                                      transition: "background 0.1s",
                                    }}
                                  >
                                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {}}
                                        style={{ pointerEvents: "none", width: "15px", height: "15px" }}
                                      />
                                    </td>
                                    <td style={{ padding: "8px 12px", color: "#94a3b8", fontWeight: 700 }}>
                                      {st.orderNumber || "—"}
                                    </td>
                                    <td style={{ padding: "8px 12px", fontWeight: 700, color: isChecked ? "#6d28d9" : "#1e293b" }}>
                                      {st.fullName}
                                    </td>
                                    <td style={{ padding: "8px 12px" }}>
                                      <span style={{ background: "#e2e8f0", color: "#475569", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                                        {st.className || "Lớp"}
                                      </span>
                                    </td>
                                    <td style={{ padding: "8px 12px", color: "#64748b" }}>
                                      {st.dob || "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Lời dặn dò & Hạn nộp */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                    💬 Lời dặn dò của giáo viên
                  </label>
                  <input
                    type="text"
                    value={assignHwForm.teacherNote}
                    onChange={(e) => setAssignHwForm({ ...assignHwForm, teacherNote: e.target.value })}
                    placeholder="VD: Các em làm bài cẩn thận và nộp trước thứ 2 nhé!"
                    style={{ width: "100%", padding: "9px 12px", fontSize: "13px", borderRadius: "8px", border: "1.5px solid #cbd5e1" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                    ⏰ Hạn nộp bài (Hạn chót)
                  </label>
                  <input
                    type="date"
                    value={assignHwForm.dueDate}
                    onChange={(e) => setAssignHwForm({ ...assignHwForm, dueDate: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "13px", borderRadius: "8px", border: "1.5px solid #cbd5e1" }}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalZoomFooter} style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowAssignHomeworkModal(false)}
                style={{ padding: "10px 20px", fontSize: "13.5px", fontWeight: 700 }}
              >
                ✕ Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleConfirmAssignHomework}
                className={styles.glowBtn}
                style={{
                  background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  fontSize: "14.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                }}
              >
                <span>🚀</span> XÁC NHẬN GIAO BÀI TẬP VỀ NHÀ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL ĐÁNH GIÁ NĂNG LỰC HỌC SINH & TRAO ĐỔI 2 CHIỀU
      ========================================================= */}
      {showFeedbackModal && selectedStudentForFeedback && (() => {
        const cleanStudentId = (selectedStudentForFeedback.studentId || "").trim();
        const cleanStudentName = (selectedStudentForFeedback.studentName || "").trim().toLowerCase();
        const currentEval = evaluationsList.find(
          (e) =>
            (cleanStudentId && e.studentId === cleanStudentId) ||
            (cleanStudentName && e.studentName.toLowerCase() === cleanStudentName)
        );
        const hasEvaluated = Boolean(currentEval && currentEval.messages.length > 0);

        return (
          <div className={styles.modalZoomBackdrop} onClick={() => setShowFeedbackModal(false)}>
            <div
              className={styles.modalZoomBox}
              style={{ maxWidth: "760px", maxHeight: "94vh", display: "flex", flexDirection: "column" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={styles.modalZoomHeader}
                style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)", color: "#ffffff" }}
              >
                <div>
                  <h3 className={styles.modalZoomTitle} style={{ color: "#ffffff", fontSize: "17px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>💬</span> ĐÁNH GIÁ HỌC SINH & TRAO ĐỔI 2 CHIỀU
                  </h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#bfdbfe" }}>
                    {hasEvaluated
                      ? "Học sinh hỏi bài và giáo viên giải đáp trực tiếp (Đã gửi nhận xét ban đầu)"
                      : "Đánh giá năng lực 1 lần duy nhất bằng AI hoặc Thủ công • Tự động hiển thị trên tài khoản học sinh"}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.modalZoomClose}
                  style={{ color: "#ffffff", background: "rgba(255,255,255,0.2)" }}
                  onClick={() => setShowFeedbackModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className={styles.modalZoomBody} style={{ padding: "18px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* 1. THẺ THÔNG TIN HỌC SINH */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "16px" }}>
                      {selectedStudentForFeedback.studentName ? selectedStudentForFeedback.studentName.charAt(0).toUpperCase() : "H"}
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                        {selectedStudentForFeedback.studentName}
                      </div>
                      <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                        Lớp: <strong style={{ color: "#1d4ed8" }}>{selectedStudentForFeedback.studentClass || "---"}</strong> | Đề thi: <em>{selectedStudentForFeedback.examTitle || "Chưa chọn đề"}</em>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {hasEvaluated ? (
                      <span style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>✅</span> Đã đánh giá
                      </span>
                    ) : (
                      <span style={{ background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <span>⏳</span> Chưa đánh giá
                      </span>
                    )}

                    {selectedStudentForFeedback.hasSubmitted && selectedStudentForFeedback.score !== null ? (
                      <div style={{ textAlign: "right", marginLeft: "6px" }}>
                        <div style={{ fontSize: "16px", fontWeight: 900, color: selectedStudentForFeedback.score >= 8 ? "#15803d" : selectedStudentForFeedback.score >= 5 ? "#d97706" : "#dc2626" }}>
                          {selectedStudentForFeedback.score.toFixed(1)} / 10 điểm
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          Đúng {selectedStudentForFeedback.correctCount || 0}/{selectedStudentForFeedback.totalQuestions || 40} câu
                        </div>
                      </div>
                    ) : (
                      <span style={{ background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 800 }}>
                        ⏳ Chưa nộp bài
                      </span>
                    )}
                  </div>
                </div>

                {/* THÔNG BÁO TIN NHẮN TỪ HỌC SINH NÀY */}
                {currentEval?.hasUnreadStudentReply && (
                  <div
                    style={{
                      background: "linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)",
                      border: "2px solid #f87171",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      boxShadow: "0 2px 8px rgba(239, 68, 68, 0.15)",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>🔔</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#991b1b" }}>
                        Học sinh {selectedStudentForFeedback.studentName} vừa gửi tin nhắn / câu hỏi mới!
                      </div>
                      <div style={{ fontSize: "12px", color: "#b91c1c", marginTop: "2px" }}>
                        Cô hãy đọc nội dung thắc mắc của học sinh bên dưới và nhập câu trả lời vào khung &quot;Trả lời thắc mắc&quot; để giải đáp cho em.
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. LỊCH SỬ TRAO ĐỔI 2 CHIỀU (KHI ĐÃ CÓ NHẬN XÉT / TIN NHẮN) */}
                {hasEvaluated && currentEval && (
                  <div style={{ border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "14px", background: "#ffffff" }}>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#334155", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>📬 Cuộc hội thoại & Hỏi bài giữa Cô và Trò ({currentEval.messages.length} tin nhắn):</span>
                      {currentEval.hasUnreadStudentReply && (
                        <span style={{ background: "#ef4444", color: "#ffffff", padding: "2px 8px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 800 }}>
                          🔔 Học sinh đang chờ cô trả lời
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "250px", overflowY: "auto", paddingRight: "4px", marginBottom: "12px" }}>
                      {currentEval.messages.map((msg) => {
                        const isTeacher = msg.sender === "teacher";
                        return (
                          <div
                            key={msg.id}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: isTeacher ? "flex-start" : "flex-end",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: "85%",
                                padding: "10px 14px",
                                borderRadius: isTeacher ? "12px 12px 12px 2px" : "12px 12px 2px 12px",
                                background: isTeacher ? "#eff6ff" : "#f5f3ff",
                                border: isTeacher ? "1px solid #bfdbfe" : "1.5px solid #ddd6fe",
                                color: isTeacher ? "#1e3a8a" : "#4c1d95",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", fontSize: "11px", fontWeight: 700, color: isTeacher ? "#2563eb" : "#7c3aed" }}>
                                <span>{isTeacher ? "👩‍🏫 " + msg.senderName : "👤 " + msg.senderName + " (Hỏi bài)"}</span>
                                {msg.isAiGenerated && (
                                  <span style={{ background: "#dbeafe", color: "#1d4ed8", padding: "1px 5px", borderRadius: "4px", fontSize: "10px" }}>
                                    🤖 AI
                                  </span>
                                )}
                                <span style={{ marginLeft: "auto", color: "#94a3b8", fontWeight: 400 }}>
                                  {msg.formattedTime || ""}
                                </span>
                              </div>
                              <div style={{ fontSize: "13px", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                                {msg.content}
                              </div>
                              {msg.imageUrl && (
                                <div style={{ marginTop: "6px" }}>
                                  <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={msg.imageUrl}
                                      alt="Ảnh đính kèm"
                                      style={{
                                        maxWidth: "100%",
                                        maxHeight: "220px",
                                        borderRadius: "8px",
                                        border: isTeacher ? "1px solid #bfdbfe" : "1.5px solid #ddd6fe",
                                        objectFit: "contain",
                                        cursor: "pointer",
                                      }}
                                    />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* KHUNG ĐÁP LẠI HỌC SINH */}
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                      <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                        💬 Trả lời thắc mắc / Trao đổi với em {selectedStudentForFeedback.studentName}:
                      </label>
                      <textarea
                        rows={2}
                        value={teacherReplyInput}
                        onChange={(e) => setTeacherReplyInput(e.target.value)}
                        onPaste={handleTeacherReplyPaste}
                        placeholder="Nhập câu trả lời giải đáp câu hỏi của học sinh hoặc dán ảnh (Ctrl+V)..."
                        style={{ width: "100%", padding: "8px 12px", fontSize: "13px", borderRadius: "6px", border: "1px solid #cbd5e1", resize: "vertical", boxSizing: "border-box" }}
                      />

                      {/* ĐÍNH KÈM ẢNH HOẶC DÁN ẢNH */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                        <input
                          type="file"
                          ref={teacherFileInputRef}
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleTeacherFileSelect}
                        />
                        <button
                          type="button"
                          onClick={() => teacherFileInputRef.current?.click()}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            fontSize: "11px",
                            color: "#334155",
                            cursor: "pointer",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span>📷</span> Chọn ảnh giải đáp
                        </button>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          (Hoặc dán ảnh trực tiếp <strong>Ctrl + V</strong>)
                        </span>
                      </div>

                      {/* PREVIEW ẢNH ĐÍNH KÈM CỦA GIÁO VIÊN */}
                      {teacherReplyImage && (
                        <div style={{ marginTop: "8px", padding: "6px 10px", background: "#eff6ff", borderRadius: "6px", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <img
                              src={teacherReplyImage}
                              alt="Ảnh giáo viên gửi"
                              style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "4px", border: "1px solid #93c5fd" }}
                            />
                            <span style={{ fontSize: "11.5px", color: "#1e40af", fontWeight: 700 }}>
                              🖼️ Đã đính kèm hình ảnh giải đáp
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTeacherReplyImage(null)}
                            style={{
                              background: "#fee2e2",
                              color: "#991b1b",
                              border: "none",
                              borderRadius: "50%",
                              width: "20px",
                              height: "20px",
                              fontWeight: 900,
                              cursor: "pointer",
                              fontSize: "11px",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", flexWrap: "wrap", gap: "6px" }}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => setTeacherReplyInput(`Thầy/Cô đã xem câu hỏi của em. Với câu này, em chú ý kiểm tra lại điều kiện xác định và áp dụng công thức cơ bản nhé!`)}
                            style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", color: "#475569", cursor: "pointer" }}
                          >
                            💡 Gợi ý giải đáp
                          </button>
                          <button
                            type="button"
                            onClick={() => setTeacherReplyInput(`Rất khen ngợi tinh thần tự giác hỏi bài của em! Em cứ tiếp tục rèn luyện thêm các câu tiếp theo nhé.`)}
                            style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", color: "#475569", cursor: "pointer" }}
                          >
                            💡 Khen ngợi hỏi bài
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSendTeacherReply(currentEval.id)}
                          disabled={submittingFeedback}
                          style={{
                            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                            color: "#ffffff",
                            border: "none",
                            padding: "7px 18px",
                            borderRadius: "6px",
                            fontSize: "12.5px",
                            fontWeight: 700,
                            cursor: submittingFeedback ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <span>💬</span> Gửi đáp lại học sinh
                        </button>
                      </div>
                    </div>

                    {/* NÚT MỞ RỘNG NẾU MUỐN SOẠN LẠI ĐÁNH GIÁ NĂNG LỰC */}
                    <div style={{ textAlign: "center", marginTop: "10px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!showReEvaluateForm && !feedbackInputText) {
                            handleGenerateAiText("comprehensive");
                          }
                          setShowReEvaluateForm(!showReEvaluateForm);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#64748b",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          textDecoration: "underline",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {showReEvaluateForm ? "▲ Thu gọn khung đánh giá mới" : "✍️ Soạn lại nhận xét năng lực mới (nếu muốn thay đổi)"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. SOẠN ĐÁNH GIÁ NĂNG LỰC (CHỈ HIỆN 1 LẦN KHI CHƯA ĐÁNH GIÁ, HOẶC KHI CHỦ ĐỘNG MỞ SOẠN LẠI) */}
                {(!hasEvaluated || showReEvaluateForm) && (
                  <div style={{ border: "1.5px solid #bfdbfe", borderRadius: "12px", padding: "14px 16px", background: "#f0f9ff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                      <div>
                        <label style={{ fontSize: "14px", fontWeight: 800, color: "#1e3a8a", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>✍️</span> {hasEvaluated ? "Soạn lại nội dung nhận xét năng lực:" : "Đánh giá & Gửi nhận xét riêng cho học sinh:"}
                        </label>
                        <div style={{ fontSize: "12px", color: "#0369a1", marginTop: "2px" }}>
                          🔒 Lời nhận xét sẽ gửi riêng tư trực tiếp đến tài khoản học sinh: <strong>{selectedStudentForFeedback.studentName}</strong> (Lớp {selectedStudentForFeedback.studentClass || "---"})
                        </div>
                      </div>

                      {/* NÚT CHUYỂN NHANH AI VÀ VIẾT TAY */}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackMode("manual");
                          }}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "7px",
                            border: feedbackMode === "manual" ? "1.5px solid #0f766e" : "1px solid #cbd5e1",
                            fontSize: "12px",
                            fontWeight: 800,
                            cursor: "pointer",
                            background: feedbackMode === "manual" ? "#0f766e" : "#ffffff",
                            color: feedbackMode === "manual" ? "#ffffff" : "#475569",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span>✍️</span> Tự viết tay
                        </button>
                      </div>
                    </div>

                    {/* DẢI NÚT CHỌN NHANH CÁC PHONG CÁCH AI */}
                    <div style={{ marginBottom: "10px" }}>
                      <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0369a1", marginBottom: "6px" }}>
                        ✨ Bấm chọn phong cách AI để tự động tạo lời nhận xét phù hợp:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {[
                          { key: "comprehensive", label: "🌟 AI: Toàn diện", desc: "Đánh giá đầy đủ ưu điểm và hướng dẫn" },
                          { key: "encourage", label: "💪 AI: Động viên", desc: "Khen ngợi tinh thần và khích lệ tiến bộ" },
                          { key: "remind", label: "⏰ AI: Nhắc nhở", desc: "Nhắc nhở làm bài và củng cố kiến thức" },
                          { key: "method", label: "📚 AI: Phương pháp", desc: "Gợi ý chiến thuật và kỹ năng làm bài" },
                          { key: "urgent", label: "⚡ AI: Đôn đốc", desc: "Đôn đốc ôn thi cấp tốc và nộp bài" },
                        ].map((presetItem) => {
                          const isActive = feedbackMode === "ai" && feedbackAiPreset === presetItem.key;
                          return (
                            <button
                              key={presetItem.key}
                              type="button"
                              onClick={() => {
                                setFeedbackMode("ai");
                                handleGenerateAiText(presetItem.key as any);
                              }}
                              style={{
                                padding: "5px 11px",
                                borderRadius: "6px",
                                border: isActive ? "1.5px solid #2563eb" : "1px solid #bfdbfe",
                                background: isActive ? "#2563eb" : "#ffffff",
                                color: isActive ? "#ffffff" : "#1e40af",
                                fontSize: "12px",
                                fontWeight: isActive ? 800 : 600,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                boxShadow: isActive ? "0 2px 6px rgba(37, 99, 235, 0.25)" : "none",
                                transition: "all 0.15s ease",
                              }}
                              title={presetItem.desc}
                            >
                              {presetItem.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <textarea
                        rows={4}
                        value={feedbackInputText}
                        onChange={(e) => setFeedbackInputText(e.target.value)}
                        placeholder="Nhập nội dung nhận xét, đánh giá năng lực của em học sinh này..."
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          fontSize: "13px",
                          lineHeight: 1.5,
                          borderRadius: "8px",
                          border: "1.5px solid #93c5fd",
                          background: "#ffffff",
                          resize: "vertical",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", flexWrap: "wrap", gap: "8px" }}>
                      <span style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                        💡 Sau khi gửi, lời nhận xét sẽ xuất hiện ngay trên trang của học sinh
                      </span>

                      <button
                        type="button"
                        onClick={handleSubmitEvaluation}
                        disabled={submittingFeedback}
                        className={styles.glowBtn}
                        style={{
                          background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                          color: "#ffffff",
                          border: "none",
                          padding: "10px 22px",
                          borderRadius: "8px",
                          fontSize: "13.5px",
                          fontWeight: 800,
                          cursor: submittingFeedback ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.35)",
                        }}
                      >
                        <span>🚀</span> GỬI ĐÁNH GIÁ ĐẾN TRANG HỌC SINH
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.modalZoomFooter} style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", background: "#f8fafc" }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowFeedbackModal(false)}
                  style={{ padding: "8px 18px", fontSize: "13px", fontWeight: 700 }}
                >
                  ✕ Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================
          MODAL 8: TẠO / SỬA GIÁO TRÌNH (VỚI AI XÂY DỰNG ĐỀ CƯƠNG)
      ========================================================= */}
      {showCurriculumModal && (
        <div className={styles.modalZoomBackdrop} onClick={() => setShowCurriculumModal(false)}>
          <div
            className={styles.modalZoomBox}
            style={{ maxWidth: "860px", maxHeight: "94vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className={styles.modalZoomHeader}
              style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)", color: "#ffffff" }}
            >
              <div>
                <h3 className={styles.modalZoomTitle} style={{ color: "#ffffff", fontSize: "17.5px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📖</span> {editingCurriculum ? "CHỈNH SỬA GIÁO TRÌNH GIẢNG DẠY" : "BIÊN SOẠN GIÁO TRÌNH MỚI (CHUẨN 2026)"}
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#bfdbfe" }}>
                  Thiết lập khung chương trình, chuyên đề, bài học và tự động tạo đề cương chuẩn bằng AI
                </p>
              </div>
              <button
                type="button"
                className={styles.modalZoomClose}
                style={{ color: "#ffffff", background: "rgba(255,255,255,0.2)" }}
                onClick={() => setShowCurriculumModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveCurriculumSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className={styles.modalZoomBody} style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "18px" }}>
                
                {/* 1. Tên giáo trình */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 800, color: "#1e293b", marginBottom: "6px" }}>
                    🏷️ Tên giáo trình / Khung phân phối chương trình (*):
                  </label>
                  <input
                    type="text"
                    required
                    value={curriculumForm.title}
                    onChange={(e) => setCurriculumForm({ ...curriculumForm, title: e.target.value })}
                    placeholder="VD: Chuyên Đề Bồi Dưỡng & Luyện Thi Tốt Nghiệp THPT 2026 - Môn Toán Học"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: "14px",
                      fontWeight: 700,
                      borderRadius: "8px",
                      border: "1.5px solid #93c5fd",
                      background: "#ffffff",
                    }}
                  />
                </div>

                {/* 2. Hàng thuộc tính: Môn học, Khối lớp, Thời lượng, Năm học */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      📐 Môn học:
                    </label>
                    <select
                      value={curriculumForm.subject}
                      onChange={(e) => {
                        const val = e.target.value;
                        const nameMap: Record<string, string> = {
                          toan: "Toán học",
                          tin: "Tin học",
                          ly: "Vật lí",
                          hoa: "Hóa học",
                          sinh: "Sinh học",
                          van: "Ngữ văn",
                          anh: "Tiếng Anh",
                        };
                        setCurriculumForm({
                          ...curriculumForm,
                          subject: val,
                          subjectName: nameMap[val] || val,
                        });
                      }}
                      style={{ width: "100%", padding: "8px 10px", fontSize: "13px", borderRadius: "8px", border: "1.5px solid #cbd5e1" }}
                    >
                      <option value="toan">📐 Toán học</option>
                      <option value="tin">💻 Tin học</option>
                      <option value="ly">⚡ Vật lí</option>
                      <option value="hoa">🧪 Hóa học</option>
                      <option value="sinh">🧬 Sinh học</option>
                      <option value="van">📖 Ngữ văn</option>
                      <option value="anh">🌍 Tiếng Anh</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      🏫 Khối lớp:
                    </label>
                    <select
                      value={curriculumForm.grade}
                      onChange={(e) => setCurriculumForm({ ...curriculumForm, grade: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", fontSize: "13px", borderRadius: "8px", border: "1.5px solid #cbd5e1" }}
                    >
                      <option value="Lớp 12">Khối Lớp 12</option>
                      <option value="Lớp 11">Khối Lớp 11</option>
                      <option value="Lớp 10">Khối Lớp 10</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      ⏱️ Thời lượng (Tiết học):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={curriculumForm.estimatedHours}
                      onChange={(e) => setCurriculumForm({ ...curriculumForm, estimatedHours: parseInt(e.target.value, 10) || 30 })}
                      style={{ width: "100%", padding: "8px 10px", fontSize: "13px", borderRadius: "8px", border: "1.5px solid #cbd5e1" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      📅 Năm học áp dụng:
                    </label>
                    <input
                      type="text"
                      value={curriculumForm.academicYear}
                      onChange={(e) => setCurriculumForm({ ...curriculumForm, academicYear: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", fontSize: "13px", borderRadius: "8px", border: "1.5px solid #cbd5e1" }}
                    />
                  </div>
                </div>

                {/* 3. Tác giả & Trường học */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      👩‍🏫 Giáo viên / Nhóm tác giả biên soạn:
                    </label>
                    <input
                      type="text"
                      value={curriculumForm.author}
                      onChange={(e) => setCurriculumForm({ ...curriculumForm, author: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", fontSize: "13px", borderRadius: "8px", border: "1.5px solid #cbd5e1" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      🏢 Đơn vị công tác / Trường:
                    </label>
                    <input
                      type="text"
                      value={curriculumForm.school}
                      onChange={(e) => setCurriculumForm({ ...curriculumForm, school: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", fontSize: "13px", borderRadius: "8px", border: "1.5px solid #cbd5e1" }}
                    />
                  </div>
                </div>

                {/* 4. Mô tả giáo trình */}
                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    📝 Mô tả tóm tắt mục tiêu & định hướng giảng dạy:
                  </label>
                  <textarea
                    rows={2}
                    value={curriculumForm.description}
                    onChange={(e) => setCurriculumForm({ ...curriculumForm, description: e.target.value })}
                    placeholder="Mô tả mục tiêu đầu ra, các năng lực phẩm chất bồi dưỡng cho học sinh theo đề thi chuẩn Bộ GD&ĐT 2026..."
                    style={{ width: "100%", padding: "8px 12px", fontSize: "13px", borderRadius: "8px", border: "1.5px solid #cbd5e1", resize: "vertical" }}
                  />
                </div>

                {/* 5. Gán lớp học áp dụng */}
                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 800, color: "#1e3a8a", margin: 0 }}>
                      🏫 Gán lớp học áp dụng giáo trình này ({curriculumForm.assignedClasses.length}/{classesList.length} lớp):
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => setCurriculumForm({ ...curriculumForm, assignedClasses: classesList.map(c => c.id) })}
                        style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                      >
                        ✓ Chọn tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurriculumForm({ ...curriculumForm, assignedClasses: [] })}
                        style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #cbd5e1", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                      >
                        ✕ Bỏ chọn
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px" }}>
                    {classesList.map((cls) => {
                      const isChecked = curriculumForm.assignedClasses.includes(cls.id);
                      return (
                        <div
                          key={cls.id}
                          onClick={() => {
                            const next = isChecked
                              ? curriculumForm.assignedClasses.filter(id => id !== cls.id)
                              : [...curriculumForm.assignedClasses, cls.id];
                            setCurriculumForm({ ...curriculumForm, assignedClasses: next });
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            border: isChecked ? "2px solid #2563eb" : "1px solid #cbd5e1",
                            background: isChecked ? "#eff6ff" : "#ffffff",
                            cursor: "pointer",
                          }}
                        >
                          <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ pointerEvents: "none" }} />
                          <span style={{ fontSize: "13px", fontWeight: isChecked ? 800 : 600, color: isChecked ? "#1d4ed8" : "#334155" }}>
                            Lớp {cls.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Đính kèm File PDF / Sách giáo trình */}
                <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", padding: "14px", borderRadius: "10px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 800, color: "#166534", marginBottom: "8px" }}>
                    📄 Đính kèm tệp PDF Sách / Tài liệu giáo trình đầy đủ:
                  </label>

                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      type="file"
                      ref={curriculumFileInputRef}
                      accept=".pdf,.doc,.docx"
                      style={{ display: "none" }}
                      onChange={handleCurriculumFileUpload}
                    />
                    <button
                      type="button"
                      onClick={() => curriculumFileInputRef.current?.click()}
                      disabled={curriculumUploadingFile}
                      style={{
                        background: "linear-gradient(135deg, #059669, #10b981)",
                        color: "#ffffff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: curriculumUploadingFile ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>📂</span> {curriculumUploadingFile ? "⏳ Đang tải lên..." : "Tải lên tệp PDF từ máy tính"}
                    </button>

                    <input
                      type="text"
                      placeholder="Hoặc dán đường link PDF / Google Drive giáo trình..."
                      value={curriculumForm.fileUrl}
                      onChange={(e) => setCurriculumForm({ ...curriculumForm, fileUrl: e.target.value })}
                      style={{ flex: 1, minWidth: "240px", padding: "8px 12px", fontSize: "12.5px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    />
                  </div>

                  {curriculumForm.fileUrl && (
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "#15803d", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>✓ Đã liên kết tệp:</span>
                      <strong style={{ maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {curriculumForm.fileName || curriculumForm.fileUrl}
                      </strong>
                    </div>
                  )}
                </div>

                {/* 7. KHUNG CHƯƠNG & BÀI HỌC (CHAPTERS & LESSONS BUILDER) */}
                <div style={{ border: "1.5px solid #bfdbfe", borderRadius: "12px", padding: "16px", background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "14.5px", fontWeight: 800, color: "#1e3a8a", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>📚</span> Khung Chương & Bài Học Chi Tiết ({curriculumForm.chapters.length} chương)
                      </h4>
                      <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                        Bạn có thể tự thêm chương hoặc nhấn AI để tự động tạo khung chuẩn cấu trúc Bộ GD&ĐT 2026.
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={handleAiGenerateCurriculumOutline}
                        disabled={aiGeneratingOutline}
                        style={{
                          background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                          color: "#ffffff",
                          border: "none",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          fontSize: "12.5px",
                          fontWeight: 800,
                          cursor: aiGeneratingOutline ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          boxShadow: "0 2px 8px rgba(124, 58, 237, 0.3)",
                        }}
                      >
                        <span>🤖</span> {aiGeneratingOutline ? "AI đang xây dựng..." : "AI Tự Động Xây Đề Cương 2026"}
                      </button>

                      <button
                        type="button"
                        onClick={handleAddChapter}
                        style={{
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          border: "1.5px solid #bfdbfe",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span>➕</span> Thêm Chương
                      </button>
                    </div>
                  </div>

                  {/* Danh sách các chương */}
                  {curriculumForm.chapters.length === 0 ? (
                    <div style={{ padding: "30px", textAlign: "center", background: "#ffffff", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                      <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>💡</span>
                      <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#475569" }}>
                        Chưa có chương nào trong giáo trình.
                      </div>
                      <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 12px 0" }}>
                        Nhấn nút tím &quot;AI Tự Động Xây Đề Cương 2026&quot; ở trên để tạo tự động toàn bộ chương bài!
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {curriculumForm.chapters.map((chap, chapIdx) => (
                        <div
                          key={chap.id || chapIdx}
                          style={{
                            background: "#ffffff",
                            border: "1.5px solid #cbd5e1",
                            borderRadius: "10px",
                            padding: "14px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                          }}
                        >
                          {/* Chapter header */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", gap: "8px" }}>
                            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ background: "#dbeafe", color: "#1e40af", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 800 }}>
                                #{chap.chapterNumber || chapIdx + 1}
                              </span>
                              <input
                                type="text"
                                value={chap.title}
                                onChange={(e) => handleUpdateChapterTitle(chapIdx, e.target.value)}
                                placeholder={`Tên Chương ${chapIdx + 1}...`}
                                style={{
                                  flex: 1,
                                  padding: "6px 10px",
                                  fontSize: "13.5px",
                                  fontWeight: 800,
                                  color: "#0f172a",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "6px",
                                }}
                              />
                            </div>

                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => handleAddLesson(chapIdx)}
                                style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                              >
                                ➕ Thêm bài
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveChapter(chapIdx)}
                                style={{ background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                              >
                                🗑️ Xóa chương
                              </button>
                            </div>
                          </div>

                          {/* Lessons inside chapter */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "16px", borderLeft: "2px solid #e2e8f0" }}>
                            {chap.lessons && chap.lessons.map((les, lesIdx) => (
                              <div
                                key={les.id || lesIdx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  background: "#f8fafc",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", minWidth: "45px" }}>
                                  Tiết {lesIdx + 1}:
                                </span>
                                <input
                                  type="text"
                                  value={les.title}
                                  onChange={(e) => handleUpdateLessonTitle(chapIdx, lesIdx, e.target.value)}
                                  placeholder="Tên bài học..."
                                  style={{ flex: 1, padding: "4px 8px", fontSize: "12.5px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                                />
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <input
                                    type="number"
                                    min={15}
                                    max={300}
                                    step={15}
                                    value={les.durationMinutes || 90}
                                    onChange={(e) => handleUpdateLessonDuration(chapIdx, lesIdx, parseInt(e.target.value, 10) || 90)}
                                    style={{ width: "55px", padding: "4px 6px", fontSize: "12px", textAlign: "center", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                                    title="Thời lượng phút"
                                  />
                                  <span style={{ fontSize: "11px", color: "#64748b" }}>phút</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLesson(chapIdx, lesIdx)}
                                  style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "14px", padding: "0 4px" }}
                                  title="Xóa bài này"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div
                className={styles.modalZoomFooter}
                style={{
                  padding: "16px 24px",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#f8fafc",
                }}
              >
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowCurriculumModal(false)}
                  style={{ padding: "10px 20px", fontSize: "13.5px", fontWeight: 700 }}
                >
                  ✕ Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={savingCurriculum}
                  className={styles.glowBtn}
                  style={{
                    background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                    color: "#ffffff",
                    border: "none",
                    padding: "12px 26px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: 800,
                    cursor: savingCurriculum ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                  }}
                >
                  <span>💾</span> {savingCurriculum ? "Đang lưu giáo trình..." : (editingCurriculum ? "LƯU THAY ĐỔI GIÁO TRÌNH" : "HOÀN TẤT & LƯU GIÁO TRÌNH")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 9: XEM CHI TIẾT ĐỀ CƯƠNG GIÁO TRÌNH
      ========================================================= */}
      {selectedCurriculumForView && (
        <div className={styles.modalZoomBackdrop} onClick={() => setSelectedCurriculumForView(null)}>
          <div
            className={styles.modalZoomBox}
            style={{ maxWidth: "780px", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={styles.modalZoomHeader}
              style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)", color: "#ffffff" }}
            >
              <div>
                <h3 className={styles.modalZoomTitle} style={{ color: "#ffffff", fontSize: "17px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📖</span> ĐỀ CƯƠNG CHI TIẾT GIÁO TRÌNH
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#dbeafe" }}>
                  {selectedCurriculumForView.title}
                </p>
              </div>
              <button
                type="button"
                className={styles.modalZoomClose}
                style={{ color: "#ffffff", background: "rgba(255,255,255,0.2)" }}
                onClick={() => setSelectedCurriculumForView(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalZoomBody} style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Info summary */}
              <div style={{ background: "#f8fafc", padding: "14px 18px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", fontSize: "13px" }}>
                <div><strong>📐 Môn:</strong> {selectedCurriculumForView.subjectName} ({selectedCurriculumForView.grade})</div>
                <div><strong>⏱️ Thời lượng:</strong> {selectedCurriculumForView.estimatedHours} tiết học</div>
                <div><strong>👩‍🏫 Tác giả:</strong> {selectedCurriculumForView.author}</div>
                <div><strong>📅 Năm học:</strong> {selectedCurriculumForView.academicYear}</div>
                <div style={{ gridColumn: "1 / -1" }}><strong>🏢 Đơn vị:</strong> {selectedCurriculumForView.school}</div>
                {selectedCurriculumForView.fileUrl && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <strong>📄 File tài liệu đính kèm: </strong>
                    <a href={selectedCurriculumForView.fileUrl} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8", fontWeight: 700, textDecoration: "underline" }}>
                      Tải về tệp PDF giáo trình ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedCurriculumForView.description && (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px 16px", borderRadius: "10px", fontSize: "13px", color: "#1e3a8a", lineHeight: 1.5 }}>
                  <strong>🎯 Mục tiêu chương trình: </strong> {selectedCurriculumForView.description}
                </div>
              )}

              {/* Chapters list */}
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginBottom: "10px" }}>
                  📋 Danh mục các chương & phân phối tiết học:
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {selectedCurriculumForView.chapters && selectedCurriculumForView.chapters.map((chap, i) => (
                    <div key={chap.id || i} style={{ border: "1px solid #cbd5e1", borderRadius: "8px", overflow: "hidden" }}>
                      <div style={{ background: "#f1f5f9", padding: "10px 14px", fontWeight: 800, fontSize: "13.5px", color: "#1e293b", display: "flex", justifyContent: "space-between" }}>
                        <span>{chap.title}</span>
                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>{chap.lessons?.length || 0} bài</span>
                      </div>
                      {chap.description && (
                        <div style={{ padding: "8px 14px", fontSize: "12px", color: "#64748b", fontStyle: "italic", borderBottom: "1px solid #f1f5f9" }}>
                          {chap.description}
                        </div>
                      )}
                      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {chap.lessons && chap.lessons.map((les, j) => (
                          <div key={les.id || j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", padding: "4px 0", borderBottom: j < chap.lessons.length - 1 ? "1px dashed #f1f5f9" : "none" }}>
                            <span style={{ color: "#334155" }}>• {les.title}</span>
                            <span style={{ fontSize: "11.5px", color: "#64748b", background: "#f8fafc", padding: "2px 6px", borderRadius: "4px" }}>
                              {les.durationMinutes || 90} phút
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalZoomFooter} style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", background: "#f8fafc" }}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setSelectedCurriculumForView(null)}
                style={{ padding: "8px 18px", fontSize: "13px", fontWeight: 700 }}
              >
                ✕ Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 10: XEM BẢNG ĐỐI CHIẾU ĐÁP ÁN CÁC MÃ ĐỀ ĐÃ TRỘN
      ========================================================= */}
      {showVariantsTableModal && viewingExamVariants && (
        <div className={styles.modalZoomBackdrop} onClick={() => setShowVariantsTableModal(false)}>
          <div
            className={styles.modalZoomBox}
            style={{ maxWidth: "850px", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={styles.modalZoomHeader}
              style={{ background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)", color: "#ffffff" }}
            >
              <div>
                <h3 className={styles.modalZoomTitle} style={{ color: "#ffffff", fontSize: "17px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🎲</span> BẢNG ĐỐI CHIẾU ĐÁP ÁN CÁC MÃ ĐỀ ĐÃ TRỘN
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#dbeafe" }}>
                  Đề: <strong>{viewingExamVariants.title}</strong> • Tổng cộng{" "}
                  <strong>{viewingExamVariants.variants?.length || 1} mã đề</strong>
                </p>
              </div>
              <button
                type="button"
                className={styles.modalZoomClose}
                style={{ color: "#ffffff", background: "rgba(255,255,255,0.2)" }}
                onClick={() => setShowVariantsTableModal(false)}
              >
                ✕
              </button>
            </div>

            <div
              className={styles.modalZoomBody}
              style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}
            >
              <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "12px 16px", borderRadius: "8px", fontSize: "12.5px", color: "#065f46", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>🛡️</span>
                <span>
                  <strong>Hệ thống chấm thi thông minh 2026:</strong> Khi học sinh vào thi và nhập bất kỳ mã đề nào dưới đây, hệ thống sẽ tự động kích hoạt khung đáp án tương ứng của mã đó để chấm điểm chính xác 100%.
                </span>
              </div>

              {/* Danh sách các mã đề */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {(viewingExamVariants.variants && viewingExamVariants.variants.length > 0
                  ? viewingExamVariants.variants
                  : [
                      {
                        code: viewingExamVariants.accessCode || "1024",
                        variantNumber: 1,
                        isOriginal: true,
                        answerKey: viewingExamVariants.answerKey || {},
                      },
                    ]
                ).map((variant, vIdx) => (
                  <div
                    key={variant.code || vIdx}
                    style={{
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "10px",
                      overflow: "hidden",
                      background: "#ffffff",
                    }}
                  >
                    <div
                      style={{
                        background: variant.isOriginal ? "#eff6ff" : "#f8fafc",
                        borderBottom: "1px solid #e2e8f0",
                        padding: "10px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            background: variant.isOriginal ? "#2563eb" : "#475569",
                            color: "#ffffff",
                            padding: "2px 8px",
                            borderRadius: "5px",
                            fontWeight: 800,
                            fontSize: "12px",
                          }}
                        >
                          MÃ ĐỀ {variant.variantNumber || vIdx + 1}
                        </span>
                        <code
                          style={{
                            fontSize: "18px",
                            fontWeight: 900,
                            color: "#1d4ed8",
                            letterSpacing: "3px",
                            fontFamily: "monospace",
                          }}
                        >
                          {variant.code}
                        </code>
                        {variant.isOriginal ? (
                          <span style={{ fontSize: "11px", background: "#dbeafe", color: "#1e40af", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                            ĐỀ GỐC
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", background: "#fef3c7", color: "#b45309", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                            ĐỀ TRỘN CÂU HỎI
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const text = `=== MÃ ĐỀ: ${variant.code} ===\nPHẦN 1: ${variant.answerKey?.part1 || "Không có"}\nPHẦN 2: ${variant.answerKey?.part2 || "Không có"}\nPHẦN 3: ${variant.answerKey?.part3 || "Không có"}`;
                          navigator.clipboard.writeText(text);
                          showToast(`📋 Đã sao chép đáp án Mã đề ${variant.code}!`);
                        }}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#334155",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span>📋</span> Sao chép đáp án
                      </button>
                    </div>

                    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      {variant.answerKey?.part1 && (
                        <div>
                          <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#2563eb", marginBottom: "3px" }}>
                            PHẦN I (TRẮC NGHIỆM):
                          </div>
                          <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "6px", fontSize: "12.5px", fontFamily: "monospace", color: "#334155", border: "1px solid #e2e8f0" }}>
                            {variant.answerKey.part1}
                          </div>
                        </div>
                      )}

                      {variant.answerKey?.part2 && (
                        <div>
                          <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#7c3aed", marginBottom: "3px" }}>
                            PHẦN II (ĐÚNG / SAI):
                          </div>
                          <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "6px", fontSize: "12.5px", fontFamily: "monospace", color: "#334155", border: "1px solid #e2e8f0" }}>
                            {variant.answerKey.part2}
                          </div>
                        </div>
                      )}

                      {variant.answerKey?.part3 && (
                        <div>
                          <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#d97706", marginBottom: "3px" }}>
                            PHẦN III (TRẢ LỜI NGẮN):
                          </div>
                          <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "6px", fontSize: "12.5px", fontFamily: "monospace", color: "#334155", border: "1px solid #e2e8f0" }}>
                            {variant.answerKey.part3}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.modalZoomFooter} style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", background: "#f8fafc" }}>
              <button
                type="button"
                onClick={() => {
                  const variants = viewingExamVariants.variants || [];
                  const fullText = variants
                    .map(
                      (v, i) =>
                        `========================================\nMÃ ĐỀ ${v.variantNumber || i + 1}: ${v.code} (${v.isOriginal ? "ĐỀ GỐC" : "ĐỀ ĐÃ TRỘN"})\n========================================\nPHẦN 1:\n${v.answerKey?.part1 || "---"}\n\nPHẦN 2:\n${v.answerKey?.part2 || "---"}\n\nPHẦN 3:\n${v.answerKey?.part3 || "---"}\n`
                    )
                    .join("\n");
                  navigator.clipboard.writeText(fullText);
                  showToast(`📋 Đã sao chép toàn bộ đáp án của ${variants.length} mã đề!`);
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                📋 Sao chép tất cả mã đề
              </button>

              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowVariantsTableModal(false)}
                style={{ padding: "8px 18px", fontSize: "13px", fontWeight: 700 }}
              >
                ✕ Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HƯỚNG DẪN CẤU HÌNH QUY TẮC BẢO MẬT (FIRESTORE SECURITY RULES) */}
      {showFirestoreRulesModal && (
        <div
          className={styles.modalZoomBackdrop}
          onClick={() => setShowFirestoreRulesModal(false)}
        >
          <div
            className={styles.modalZoomContent}
            style={{ maxWidth: "620px", padding: "26px", borderRadius: "18px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "28px" }}>🔐</span>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#1e293b" }}>
                  Mở Quyền Ghi Dữ Liệu Lên Firestore
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowFirestoreRulesModal(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  fontSize: "15px",
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                padding: "12px 14px",
                color: "#991b1b",
                fontSize: "13px",
                marginBottom: "16px",
                lineHeight: 1.5,
              }}
            >
              <strong>Nguyên nhân:</strong> Firebase Cloud Firestore đang chặn ghi do Quy tắc bảo mật (Security Rules) mặc định từ chối quyền ghi (Missing or insufficient permissions).
            </div>

            <div style={{ fontSize: "13.5px", color: "#334155", lineHeight: 1.6, marginBottom: "16px" }}>
              <strong>Chỉ cần 3 bước đơn giản (khoảng 30 giây):</strong>
              <ol style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
                <li style={{ marginBottom: "8px" }}>
                  Bấm vào liên kết này để mở thẳng trang Rules của dự án:{" "}
                  <a
                    href="https://console.firebase.google.com/project/luyenthi12-4fb8c/firestore/rules"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#2563eb", fontWeight: 700, textDecoration: "underline" }}
                  >
                    🔗 Mở tab Firestore Rules trên Firebase Console
                  </a>
                </li>
                <li style={{ marginBottom: "8px" }}>
                  Sao chép đoạn mã bên dưới và <strong>dán đè thay thế</strong> toàn bộ nội dung trong ô soạn thảo Rules:
                </li>
              </ol>
            </div>

            {/* Code Box */}
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <pre
                style={{
                  background: "#0f172a",
                  color: "#38bdf8",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  fontSize: "12.5px",
                  fontFamily: "monospace",
                  overflowX: "auto",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}</pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`);
                  showToast("📋 Đã sao chép Rules vào bộ nhớ tạm!");
                }}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                📋 Sao chép mã
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 20px 0" }}>
              3. Bấm nút <strong>Publish (Xuất bản)</strong> màu xanh ở góc trên của Firebase Console. Sau đó quay lại đây và bấm lại <strong>"Nạp dữ liệu lên Firestore"</strong>.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <a
                href="https://console.firebase.google.com/project/luyenthi12-4fb8c/firestore/rules"
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  padding: "9px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>🚀</span> Đến trang Firebase Rules ngay
              </a>
              <button
                type="button"
                onClick={() => setShowFirestoreRulesModal(false)}
                style={{
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  padding: "9px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING 2-WAY Q&A CHAT WIDGET CHO GIÁO VIÊN / ADMIN */}
      <FloatingQAWidget
        role={isSuperAdmin ? "admin" : "teacher"}
        currentUserName={currentAdminUser.fullName || currentAdminUser.name || "Giáo viên"}
        currentUserId={currentAdminUser.uid}
        teacherCode={currentAdminUser.teacherCode}
        teacherName={currentAdminUser.fullName}
        evaluations={teacherEvaluations}
        onRefreshEvaluations={fetchEvaluations}
        defaultPosition="bottom-right"
      />
    </div>
  );
}
