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
  onSnapshot,
} from "firebase/firestore";

export interface StudentFeedbackMessage {
  id: string;
  sender: "teacher" | "student";
  senderName: string;
  content: string;
  imageUrl?: string; // Hỗ trợ gửi ảnh trực tiếp hoặc dán ảnh clipboard (Ctrl+V)
  timestamp: string;
  formattedTime?: string;
  isAiGenerated?: boolean;
}

export interface StudentEvaluation {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  teacherCode?: string; // Mã giáo viên nhận câu hỏi / phản hồi
  teacherName?: string; // Tên giáo viên phụ trách
  examId?: string;
  examTitle?: string;
  score?: number;
  correctCount?: number;
  totalQuestions?: number;
  status: "active" | "replied";
  hasUnreadStudentReply?: boolean;
  hasUnreadTeacherReply?: boolean;
  messages: StudentFeedbackMessage[];
  createdAt: string;
  updatedAt: string;
}

const LOCAL_EVALUATIONS_KEY = "school_evaluations_cache_v1";

function broadcastEvaluationUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("school_evaluations_updated"));
    window.dispatchEvent(new Event("school_data_updated"));
  }
}

function getFormattedCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${hours}:${minutes} - ${day}/${month}/${year}`;
}

// 1. LẤY TOÀN BỘ ĐÁNH GIÁ (CHO ADMIN / GIÁO VIÊN)
export async function getAllEvaluations(): Promise<StudentEvaluation[]> {
  try {
    const colRef = collection(db, "student_evaluations");
    const q = query(colRef, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const list: StudentEvaluation[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          studentId: data.studentId || "",
          studentName: data.studentName || "",
          studentClass: data.studentClass || "",
          teacherCode: data.teacherCode || "",
          teacherName: data.teacherName || "",
          examId: data.examId || "",
          examTitle: data.examTitle || "",
          score: data.score !== undefined ? data.score : undefined,
          correctCount: data.correctCount,
          totalQuestions: data.totalQuestions,
          status: data.status || "active",
          hasUnreadStudentReply: Boolean(data.hasUnreadStudentReply),
          hasUnreadTeacherReply: Boolean(data.hasUnreadTeacherReply),
          messages: Array.isArray(data.messages) ? data.messages : [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_EVALUATIONS_KEY, JSON.stringify(list));
      }
      return list;
    }
  } catch (err) {
    console.warn("Firestore fetch evaluations note, using local fallback:", err);
  }

  // Local storage fallback
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_EVALUATIONS_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn("Error reading local evaluations:", e);
    }
  }
  return [];
}

// 1.1 LẮNG NGHE THỜI GIAN THỰC (REAL-TIME LISTENER) ĐỂ GIÁO VIÊN BIẾT NGAY KHI HỌC SINH HỎI BÀI
export function subscribeEvaluations(callback: (list: StudentEvaluation[]) => void): () => void {
  try {
    const colRef = collection(db, "student_evaluations");
    const q = query(colRef, orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: StudentEvaluation[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            studentId: data.studentId || "",
            studentName: data.studentName || "",
            studentClass: data.studentClass || "",
            teacherCode: data.teacherCode || "",
            teacherName: data.teacherName || "",
            examId: data.examId || "",
            examTitle: data.examTitle || "",
            score: data.score !== undefined ? data.score : undefined,
            correctCount: data.correctCount,
            totalQuestions: data.totalQuestions,
            status: data.status || "active",
            hasUnreadStudentReply: Boolean(data.hasUnreadStudentReply),
            hasUnreadTeacherReply: Boolean(data.hasUnreadTeacherReply),
            messages: Array.isArray(data.messages) ? data.messages : [],
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          };
        });

        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_EVALUATIONS_KEY, JSON.stringify(list));
        }
        callback(list);
      },
      (error) => {
        console.warn("onSnapshot student_evaluations error:", error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn("Failed to subscribe student_evaluations:", err);
    return () => { };
  }
}

// 2. LẤY ĐÁNH GIÁ CỦA HỌC SINH CỤ THỂ (DÀNH CHO TRANG HỌC SINH)
export async function getEvaluationsForStudent(
  studentId?: string,
  studentName?: string,
  teacherCode?: string
): Promise<StudentEvaluation[]> {
  const all = await getAllEvaluations();
  const cleanId = (studentId || "").trim().toLowerCase();
  const cleanName = (studentName || "").trim().toLowerCase();
  const cleanTeacherCode = (teacherCode || "").trim();

  return all.filter((ev) => {
    const evStudentId = (ev.studentId || "").trim().toLowerCase();
    const evStudentName = (ev.studentName || "").trim().toLowerCase();
    const evTeacherCode = (ev.teacherCode || "").trim();

    // Tin nhắn thông báo chung gửi đến TẤT CẢ HỌC SINH
    const isBroadcast =
      ev.studentId === "ALL" ||
      evStudentId === "all" ||
      evStudentName.includes("tất cả");

    if (isBroadcast) {
      if (cleanTeacherCode && evTeacherCode && cleanTeacherCode !== evTeacherCode) {
        return false;
      }
      return true;
    }

    if (cleanId && evStudentId && cleanId === evStudentId) return true;
    if (cleanName && evStudentName && cleanName === evStudentName) return true;
    return false;
  });
}

// 3. TẠO HOẶC CẬP NHẬT ĐÁNH GIÁ CỦA GIÁO VIÊN
export async function saveTeacherEvaluation(params: {
  studentId: string;
  studentName: string;
  studentClass: string;
  content: string;
  teacherCode?: string;
  teacherName?: string;
  imageUrl?: string;
  examId?: string;
  examTitle?: string;
  score?: number;
  correctCount?: number;
  totalQuestions?: number;
  isAiGenerated?: boolean;
}): Promise<StudentEvaluation> {
  const currentList = await getAllEvaluations();
  const cleanId = (params.studentId || "").trim();
  const cleanName = (params.studentName || "").trim();

  // Find existing evaluation for this student
  let existing = currentList.find(
    (e) =>
      (cleanId && e.studentId === cleanId) ||
      (cleanName && e.studentName.toLowerCase() === cleanName.toLowerCase())
  );

  const resolvedTeacherName = params.teacherName || existing?.teacherName || "Giáo viên phụ trách";
  const resolvedTeacherCode = params.teacherCode || existing?.teacherCode || "";

  const newMessage: StudentFeedbackMessage = {
    id: "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    sender: "teacher",
    senderName: `${resolvedTeacherName} (Giáo viên)`,
    content: params.content.trim(),
    imageUrl: params.imageUrl || undefined,
    timestamp: new Date().toISOString(),
    formattedTime: getFormattedCurrentTime(),
    isAiGenerated: Boolean(params.isAiGenerated),
  };

  let targetEval: StudentEvaluation;

  if (existing) {
    targetEval = {
      ...existing,
      studentClass: params.studentClass || existing.studentClass,
      teacherCode: resolvedTeacherCode,
      teacherName: resolvedTeacherName,
      examId: params.examId || existing.examId,
      examTitle: params.examTitle || existing.examTitle,
      score: params.score !== undefined ? params.score : existing.score,
      correctCount: params.correctCount !== undefined ? params.correctCount : existing.correctCount,
      totalQuestions: params.totalQuestions !== undefined ? params.totalQuestions : existing.totalQuestions,
      status: "active",
      hasUnreadStudentReply: false,
      hasUnreadTeacherReply: true,
      messages: [...existing.messages, newMessage],
      updatedAt: new Date().toISOString(),
    };
  } else {
    const newId = `eval_${cleanId || cleanName.replace(/\s+/g, "_")}_${Date.now()}`;
    targetEval = {
      id: newId,
      studentId: cleanId,
      studentName: cleanName,
      studentClass: params.studentClass || "",
      teacherCode: resolvedTeacherCode,
      teacherName: resolvedTeacherName,
      examId: params.examId,
      examTitle: params.examTitle,
      score: params.score,
      correctCount: params.correctCount,
      totalQuestions: params.totalQuestions,
      status: "active",
      hasUnreadStudentReply: false,
      hasUnreadTeacherReply: true,
      messages: [newMessage],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Save to Firestore
  try {
    const docRef = doc(db, "student_evaluations", targetEval.id);
    await setDoc(docRef, {
      ...targetEval,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Firestore save evaluation note:", err);
  }

  // Update local storage
  if (typeof window !== "undefined") {
    const updatedList = existing
      ? currentList.map((e) => (e.id === targetEval.id ? targetEval : e))
      : [targetEval, ...currentList];
    localStorage.setItem(LOCAL_EVALUATIONS_KEY, JSON.stringify(updatedList));
    broadcastEvaluationUpdate();
  }

  return targetEval;
}

// 4. HỌC SINH TRẢ LỜI HOẶC HỎI BÀI GIÁO VIÊN
export async function sendStudentReply(
  evalId: string,
  studentName: string,
  replyContent: string,
  imageUrl?: string
): Promise<StudentEvaluation | null> {
  const currentList = await getAllEvaluations();
  const target = currentList.find((e) => e.id === evalId);
  if (!target) return null;

  const newMessage: StudentFeedbackMessage = {
    id: "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    sender: "student",
    senderName: studentName || target.studentName,
    content: replyContent.trim(),
    imageUrl: imageUrl || undefined,
    timestamp: new Date().toISOString(),
    formattedTime: getFormattedCurrentTime(),
  };

  const updatedEval: StudentEvaluation = {
    ...target,
    status: "replied",
    hasUnreadStudentReply: true,
    hasUnreadTeacherReply: false,
    messages: [...target.messages, newMessage],
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, "student_evaluations", evalId);
    await setDoc(docRef, {
      ...updatedEval,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Firestore send student reply note:", err);
  }

  if (typeof window !== "undefined") {
    const updatedList = currentList.map((e) => (e.id === evalId ? updatedEval : e));
    localStorage.setItem(LOCAL_EVALUATIONS_KEY, JSON.stringify(updatedList));
    broadcastEvaluationUpdate();
  }

  return updatedEval;
}

// 4.1 HỌC SINH TẠO HOẶC GỬI CÂU HỎI TRỰC TIẾP ĐẾN GIÁO VIÊN PHỤ TRÁCH (THEO MÃ GV)
export async function createOrSendStudentQuestion(params: {
  studentId: string;
  studentName: string;
  studentClass: string;
  teacherCode: string;
  teacherName: string;
  content: string;
  imageUrl?: string;
}): Promise<StudentEvaluation> {
  const currentList = await getAllEvaluations();
  const cleanId = (params.studentId || "").trim();
  const cleanName = (params.studentName || "").trim();
  const cleanTeacherCode = (params.teacherCode || "").trim();

  let existing = currentList.find(
    (e) =>
      ((cleanId && e.studentId === cleanId) ||
        (cleanName && e.studentName.toLowerCase() === cleanName.toLowerCase())) &&
      (!cleanTeacherCode || !e.teacherCode || e.teacherCode === cleanTeacherCode)
  );

  const newMessage: StudentFeedbackMessage = {
    id: "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    sender: "student",
    senderName: cleanName || "Học sinh",
    content: params.content.trim(),
    imageUrl: params.imageUrl || undefined,
    timestamp: new Date().toISOString(),
    formattedTime: getFormattedCurrentTime(),
  };

  let targetEval: StudentEvaluation;

  if (existing) {
    targetEval = {
      ...existing,
      studentClass: params.studentClass || existing.studentClass,
      teacherCode: cleanTeacherCode || existing.teacherCode,
      teacherName: params.teacherName || existing.teacherName,
      status: "replied",
      hasUnreadStudentReply: true,
      hasUnreadTeacherReply: false,
      messages: [...existing.messages, newMessage],
      updatedAt: new Date().toISOString(),
    };
  } else {
    const newId = `eval_${cleanId || cleanName.replace(/\s+/g, "_")}_${Date.now()}`;
    targetEval = {
      id: newId,
      studentId: cleanId,
      studentName: cleanName,
      studentClass: params.studentClass || "",
      teacherCode: cleanTeacherCode,
      teacherName: params.teacherName,
      status: "replied",
      hasUnreadStudentReply: true,
      hasUnreadTeacherReply: false,
      messages: [newMessage],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const docRef = doc(db, "student_evaluations", targetEval.id);
    await setDoc(docRef, {
      ...targetEval,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Firestore save student question note:", err);
  }

  if (typeof window !== "undefined") {
    const updatedList = existing
      ? currentList.map((e) => (e.id === targetEval.id ? targetEval : e))
      : [targetEval, ...currentList];
    localStorage.setItem(LOCAL_EVALUATIONS_KEY, JSON.stringify(updatedList));
    broadcastEvaluationUpdate();
  }

  return targetEval;
}

// 5. GIÁO VIÊN ĐÁP LẠI TIN NHẮN / CÂU HỎI CỦA HỌC SINH
export async function sendTeacherReply(
  evalId: string,
  teacherContent: string,
  teacherName?: string,
  imageUrl?: string,
  isAiGenerated?: boolean
): Promise<StudentEvaluation | null> {
  const currentList = await getAllEvaluations();
  const target = currentList.find((e) => e.id === evalId);
  if (!target) return null;

  const resolvedName = teacherName || target.teacherName || "Giáo viên";

  const newMessage: StudentFeedbackMessage = {
    id: "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    sender: "teacher",
    senderName: `${resolvedName} (Giáo viên)`,
    content: teacherContent.trim(),
    imageUrl: imageUrl || undefined,
    timestamp: new Date().toISOString(),
    formattedTime: getFormattedCurrentTime(),
    isAiGenerated: Boolean(isAiGenerated),
  };

  const updatedEval: StudentEvaluation = {
    ...target,
    status: "active",
    hasUnreadStudentReply: false,
    hasUnreadTeacherReply: true,
    messages: [...target.messages, newMessage],
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, "student_evaluations", evalId);
    await setDoc(docRef, {
      ...updatedEval,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Firestore send teacher reply note:", err);
  }

  if (typeof window !== "undefined") {
    const updatedList = currentList.map((e) => (e.id === evalId ? updatedEval : e));
    localStorage.setItem(LOCAL_EVALUATIONS_KEY, JSON.stringify(updatedList));
    broadcastEvaluationUpdate();
  }

  return updatedEval;
}

// 5.1 GIÁO VIÊN GỬI THÔNG BÁO / TIN NHẮN TỚI TẤT CẢ HỌC SINH (BROADCAST)
export async function sendTeacherBroadcastMessage(params: {
  teacherName: string;
  teacherCode?: string;
  content: string;
  imageUrl?: string;
  isAiGenerated?: boolean;
}): Promise<StudentEvaluation> {
  const currentList = await getAllEvaluations();
  const cleanTeacherCode = (params.teacherCode || "").trim();
  const cleanTeacherName = (params.teacherName || "").trim() || "Giáo viên";

  const broadcastId = `eval_broadcast_${cleanTeacherCode || "all"}`;
  const broadcastEval = currentList.find(
    (e) =>
      e.id === broadcastId ||
      (e.studentId === "ALL" && (!cleanTeacherCode || e.teacherCode === cleanTeacherCode))
  );

  const newMessage: StudentFeedbackMessage = {
    id: "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    sender: "teacher",
    senderName: `${cleanTeacherName} (Giáo viên)`,
    content: params.content.trim(),
    imageUrl: params.imageUrl || undefined,
    timestamp: new Date().toISOString(),
    formattedTime: getFormattedCurrentTime(),
    isAiGenerated: Boolean(params.isAiGenerated),
  };

  let targetBroadcast: StudentEvaluation;
  if (broadcastEval) {
    targetBroadcast = {
      ...broadcastEval,
      teacherCode: cleanTeacherCode || broadcastEval.teacherCode,
      teacherName: cleanTeacherName,
      status: "active",
      hasUnreadTeacherReply: true,
      hasUnreadStudentReply: false,
      messages: [...broadcastEval.messages, newMessage],
      updatedAt: new Date().toISOString(),
    };
  } else {
    targetBroadcast = {
      id: broadcastId,
      studentId: "ALL",
      studentName: "Tất cả học sinh",
      studentClass: "Toàn bộ học sinh",
      teacherCode: cleanTeacherCode,
      teacherName: cleanTeacherName,
      status: "active",
      hasUnreadStudentReply: false,
      hasUnreadTeacherReply: true,
      messages: [newMessage],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Đẩy tin nhắn chung vào Firestore cho kênh broadcast
  try {
    const docRef = doc(db, "student_evaluations", targetBroadcast.id);
    await setDoc(docRef, {
      ...targetBroadcast,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Firestore save broadcast evaluation:", err);
  }

  // Đồng thời cập nhật danh sách và chèn tin thông báo vào các cuộc trò chuyện cá nhân của GV
  let updatedList = currentList.map((ev) => {
    if (ev.id === targetBroadcast.id) return targetBroadcast;
    if (
      ev.studentId !== "ALL" &&
      (!cleanTeacherCode || !ev.teacherCode || ev.teacherCode === cleanTeacherCode)
    ) {
      return {
        ...ev,
        hasUnreadTeacherReply: true,
        messages: [
          ...ev.messages,
          {
            ...newMessage,
            id: "msg_bc_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            content: `📢 [THÔNG BÁO CHUNG CHO CẢ LỚP]:\n${newMessage.content}`,
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    }
    return ev;
  });

  if (!broadcastEval) {
    updatedList = [targetBroadcast, ...updatedList];
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_EVALUATIONS_KEY, JSON.stringify(updatedList));
    broadcastEvaluationUpdate();
  }

  return targetBroadcast;
}

// 6. XÓA BẢN ĐÁNH GIÁ
export async function deleteEvaluation(evalId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "student_evaluations", evalId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore delete evaluation note:", err);
  }

  if (typeof window !== "undefined") {
    const currentList = await getAllEvaluations();
    const updatedList = currentList.filter((e) => e.id !== evalId);
    localStorage.setItem(LOCAL_EVALUATIONS_KEY, JSON.stringify(updatedList));
    broadcastEvaluationUpdate();
  }
  return true;
}

// 7. BỘ MÁY TẠO ĐÁNH GIÁ THÔNG MINH BẰNG AI (AI EVALUATION ENGINE)
export function generateAIEvaluation(params: {
  studentName: string;
  studentClass: string;
  score?: number | null;
  correctCount?: number;
  totalQuestions?: number;
  examTitle?: string;
  preset?: "comprehensive" | "encourage" | "remind" | "method" | "urgent";
}): string {
  const { studentName, studentClass, score, correctCount, totalQuestions, examTitle, preset = "comprehensive" } = params;
  const examName = examTitle || "bài kiểm tra rèn luyện";
  const numQuestions = totalQuestions || 40;
  const numCorrect = correctCount || 0;

  // Trường hợp chưa làm bài / chưa nộp
  if (score === null || score === undefined) {
    if (preset === "urgent") {
      return `Chào em ${studentName} (${studentClass}), cô nhận thấy em vẫn chưa hoàn thành và nộp bài "${examName}". Kỳ thi đang đến rất gần, em hãy sắp xếp thời gian làm bài ngay hôm nay để cô nắm được tiến độ và hỗ trợ em kịp thời nhé. Cố lên em!`;
    }
    return `Chào em ${studentName} (${studentClass})! Cô gửi lời nhắc nhở em vào làm bài "${examName}". Việc luyện tập thường xuyên là chìa khóa then chốt để củng cố kiến thức và làm quen với cấu trúc đề thi. Nếu có bất kỳ thắc mắc hay khó khăn nào, em cứ nhắn tin hỏi cô nhé!`;
  }

  // Trường hợp điểm cao (>= 8.0)
  if (score >= 8.0) {
    if (preset === "encourage") {
      return `Xuất sắc lắm ${studentName} (${studentClass})! Em đã đạt ${score.toFixed(1)}/10 điểm (${numCorrect}/${numQuestions} câu đúng) ở đề "${examName}". Tinh thần tự giác và khả năng tư duy của em rất tốt. Cô rất tự hào về kết quả này của em, tiếp tục phát huy phong độ nhé! 🌟`;
    }
    if (preset === "method") {
      return `Chào ${studentName}, chúc mừng em đạt ${score.toFixed(1)}/10 điểm! Ở mức điểm này, em hãy tập trung rèn luyện thêm các câu hỏi vận dụng cao (câu phân loại 9+) và tối ưu hóa thời gian làm bài trắc nghiệm nhanh để giữ vững phong độ điểm 10 trong kỳ thi chính thức nhé!`;
    }
    return `Khen ngợi em ${studentName} (${studentClass}) đã hoàn thành xuất sắc bài "${examName}" với kết quả ${score.toFixed(1)}/10 điểm (${numCorrect}/${numQuestions} câu đúng). Em nắm rất vững kiến thức trọng tâm. Hãy duy trì sự cẩn thận và tiếp tục thử sức với các dạng bài nâng cao tiếp theo nhé!`;
  }

  // Trường hợp điểm khá (6.5 - 7.9)
  if (score >= 6.5) {
    if (preset === "remind") {
      return `Chào em ${studentName}, kết quả bài "${examName}" của em đạt ${score.toFixed(1)}/10 điểm (${numCorrect}/${numQuestions} câu). Em làm tốt các câu cơ bản nhưng còn một số câu trắc nghiệm đúng/sai bị nhầm lẫn đáng tiếc. Lần tới em nhớ đọc kỹ đề và kiểm tra lại bài trước khi nộp nhé!`;
    }
    return `Chào em ${studentName} (${studentClass}), bài làm "${examName}" của em đạt ${score.toFixed(1)}/10 điểm (${numCorrect}/${numQuestions} câu đúng). Đây là kết quả khá tốt, thể hiện em có nền tảng kiến thức vững vàng. Cần chú ý thêm các câu hỏi bẫy lý thuyết để bứt phá lên mức 8+ em nhé. Cố lên em!`;
  }

  // Trường hợp điểm đạt (3.5 - 6.4)
  if (score >= 3.5) {
    if (preset === "method") {
      return `Chào ${studentName} (${studentClass}), bài thi "${examName}" em đạt ${score.toFixed(1)}/10 điểm (${numCorrect}/${numQuestions} câu). Cô khuyên em nên xem lại chi tiết bảng đáp án, ghi chép lại các công thức và dạng bài mình còn làm sai vào sổ tay. Chỗ nào chưa hiểu rõ, em hãy bấm nút hỏi bài để cô giải đáp thêm nhé!`;
    }
    return `Chào em ${studentName}, ở bài thi "${examName}", em đạt ${score.toFixed(1)}/10 điểm (${numCorrect}/${numQuestions} câu đúng). Em đã có nhiều cố gắng, tuy nhiên phần lý thuyết và kỹ năng tính toán còn vài chỗ chưa chắc chắn. Em hãy dành thời gian ôn lại tài liệu lý thuyết cô đã giao trên hệ thống để cải thiện điểm số ở lần thi tới nhé!`;
  }

  // Trường hợp điểm chưa đạt (< 3.5)
  if (preset === "encourage") {
    return `Chào ${studentName} (${studentClass}), bài "${examName}" điểm số lần này (${score.toFixed(1)}/10) chưa như mong muốn, nhưng em đừng nản lòng nhé! Thất bại là cơ hội để nhận ra phần kiến thức mình cần bổ sung. Cô luôn sẵn sàng đồng hành hỗ trợ em, em hãy bắt đầu ôn lại từ các câu cơ bản ngay hôm nay nhé! 💪`;
  }
  return `Chào em ${studentName} (${studentClass}), kết quả bài thi "${examName}" của em đạt ${score.toFixed(1)}/10 điểm (${numCorrect}/${numQuestions} câu đúng). Em cần tập trung củng cố lại các chuyên đề trọng tâm cơ bản và xem kỹ lại lời giải chi tiết. Hãy chủ động nhắn tin hỏi bài cô các câu chưa hiểu để cô hướng dẫn em nhé!`;
}
