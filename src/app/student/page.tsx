"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import {
  getAllClasses,
  getAllStudents,
  getStudentsByClass,
  saveNewStudent,
  setStudentPassword,
  findTeacherByCode,
  DEFAULT_STUDENTS,
  SchoolClass,
  StudentItem,
} from "@/lib/classStudentService";
import {
  getAllExams,
  getAllDocuments,
  getStudentSubmissions,
  ExamItem,
  DocumentItem,
} from "@/lib/examService";
import { logoutAllSessions, logoutStudentSession, setCurrentAuthUser, CurrentAuthUser } from "@/lib/authService";
import {
  getEvaluationsForStudent,
  sendStudentReply,
  saveTeacherEvaluation,
  createOrSendStudentQuestion,
  StudentEvaluation,
  StudentFeedbackMessage,
} from "@/lib/feedbackService";
import FloatingQAWidget from "@/components/FloatingQAWidget";
import {
  getCurriculumsForClass,
  CurriculumItem,
} from "@/lib/curriculumService";

interface StudentSession {
  studentId: string;
  studentName: string;
  studentOrder?: number;
  dob?: string;
  classId: string;
  className: string;
  grade: string;
  teacherCode: string;
  teacherName: string;
  loggedInAt: number;
}

export default function StudentPortalPage() {
  const router = useRouter();

  // 1. Data state
  const [classesList, setClassesList] = useState<SchoolClass[]>([]);
  const [studentsList, setStudentsList] = useState<StudentItem[]>([]);
  const [examsList, setExamsList] = useState<ExamItem[]>([]);
  const [documentsList, setDocumentsList] = useState<DocumentItem[]>([]);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [studentCurriculums, setStudentCurriculums] = useState<CurriculumItem[]>([]);
  const [selectedCurriculumForStudent, setSelectedCurriculumForStudent] = useState<CurriculumItem | null>(null);

  // 2. Active Student Session
  const [currentSession, setCurrentSession] = useState<StudentSession | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // 3. Login Modal State
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [inputTeacherCode, setInputTeacherCode] = useState<string>("");
  const [matchedTeacher, setMatchedTeacher] = useState<{
    fullName: string;
    teacherCode: string;
  } | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [isCustomStudent, setIsCustomStudent] = useState<boolean>(false);
  const [customStudentName, setCustomStudentName] = useState<string>("");
  const [inputPassword, setInputPassword] = useState<string>("");
  const [inputConfirmPassword, setInputConfirmPassword] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // Modal Đổi Mật Khẩu học sinh
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [passwordModalError, setPasswordModalError] = useState<string | null>(null);
  const [passwordModalLoading, setPasswordModalLoading] = useState<boolean>(false);

  const handleSaveStudentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setPasswordModalError("Mật khẩu phải có ít nhất 4 ký tự!");
      return;
    }
    if (newPassword.trim() !== confirmNewPassword.trim()) {
      setPasswordModalError("Mật khẩu xác nhận không trùng khớp!");
      return;
    }
    setPasswordModalLoading(true);
    try {
      const studentId = currentSession?.studentId;
      const studentName = currentSession?.studentName;
      if (studentId) {
        await setStudentPassword(studentId, newPassword.trim(), studentName);
        if (typeof window !== "undefined") {
          localStorage.setItem(`std_pwd_${studentId}`, newPassword.trim());
          if (studentName) {
            localStorage.setItem(`std_pwd_${studentName}`, newPassword.trim());
            localStorage.setItem(`std_pwd_${studentName.toLowerCase()}`, newPassword.trim());
          }
        }
        setShowChangePasswordModal(false);
        alert(`🎉 Đã lưu mật khẩu thành công! Mật khẩu mới (${newPassword.trim()}) đã được đồng bộ vào mục Lớp và Học sinh của Giáo viên.`);
      }
    } catch (err: any) {
      setPasswordModalError("Lỗi lưu mật khẩu: " + (err.message || "Vui lòng thử lại"));
    } finally {
      setPasswordModalLoading(false);
    }
  };

  // 4. Document Preview Modal
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  // 5. Student Evaluations & Q&A / Feedback State
  const [studentEvaluations, setStudentEvaluations] = useState<StudentEvaluation[]>([]);
  const [showReplyModal, setShowReplyModal] = useState<boolean>(false);
  const [activeEvalForReply, setActiveEvalForReply] = useState<StudentEvaluation | null>(null);
  const [studentReplyText, setStudentReplyText] = useState<string>("");
  const [studentReplyImage, setStudentReplyImage] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState<boolean>(false);
  const studentFileInputRef = useRef<HTMLInputElement>(null);

  // 5. Load Initial Data & Session
  useEffect(() => {
    async function loadData() {
      try {
        const [classes, students, exams, docs] = await Promise.all([
          getAllClasses(),
          getAllStudents(),
          getAllExams(),
          getAllDocuments(),
        ]);

        setClassesList(classes);
        setStudentsList(students);
        setExamsList(exams);
        setDocumentsList(docs);

        const rawSession =
          typeof window !== "undefined"
            ? sessionStorage.getItem("student_portal_session") ||
              localStorage.getItem("student_portal_session")
            : null;

        if (classes.length > 0) {
          // Initialize selectedClassId
          if (rawSession) {
            try {
              const parsed: StudentSession = JSON.parse(rawSession);
              // Tự động kiểm tra tính hợp lệ của mã GV trong phiên đã lưu (Chỉ khi nhập đúng mã GV mới vào được cổng HS)
              let teacherObj = null;
              if (parsed.teacherCode) {
                teacherObj = await findTeacherByCode(parsed.teacherCode);
              }
              if (!teacherObj) {
                sessionStorage.removeItem("student_portal_session");
                localStorage.removeItem("student_portal_session");
                setSelectedClassId("");
                setSelectedStudentId("");
                setInputTeacherCode("");
                setMatchedTeacher(null);
                setCurrentSession(null);
                setShowLoginModal(false);
                return;
              }
              parsed.teacherName = teacherObj.fullName;
              parsed.teacherCode = teacherObj.teacherCode;
              try {
                sessionStorage.setItem("student_portal_session", JSON.stringify(parsed));
              } catch { }
              setCurrentSession(parsed);
              const matchedCls = classes.find(
                (c) =>
                  c.id === parsed.classId ||
                  c.name.trim().toLowerCase() === parsed.className.trim().toLowerCase()
              );
              setSelectedClassId(matchedCls ? matchedCls.id : classes[0].id);
              setSelectedStudentId(parsed.studentId || "");
              setInputTeacherCode(""); // Mã GV lúc nào cũng phải nhập lại
              const subs = await getStudentSubmissions(parsed.studentId, parsed.studentName);
              setSubmissionsList(subs);
              const evals = await getEvaluationsForStudent(parsed.studentId, parsed.studentName, parsed.teacherCode);
              setStudentEvaluations(evals);
              const currs = await getCurriculumsForClass(parsed.classId, parsed.className);
              setStudentCurriculums(currs);
            } catch (e) {
              console.warn("Parse session note:", e);
              setSelectedClassId("");
              setSelectedStudentId("");
              setInputTeacherCode("");
              setMatchedTeacher(null);
              setShowLoginModal(false);
            }
          } else {
            // Chưa có phiên: Giữ modal đóng, chỉ mở khi học sinh bấm 'VÀO HỌC'
            setSelectedClassId("");
            setSelectedStudentId("");
            setInputTeacherCode("");
            setMatchedTeacher(null);
            setShowLoginModal(false);
          }
        }
      } catch (err) {
        console.error("Load student data error:", err);
      } finally {
        setIsInitializing(false);
      }
    }

    loadData();
  }, []);

  // Listen for real-time evaluations and curriculums updates
  useEffect(() => {
    if (!currentSession) return;
    const fetchEvals = async () => {
      const evals = await getEvaluationsForStudent(
        currentSession.studentId,
        currentSession.studentName,
        currentSession.teacherCode
      );
      setStudentEvaluations(evals);
    };
    const fetchCurrs = async () => {
      const currs = await getCurriculumsForClass(currentSession.classId, currentSession.className);
      setStudentCurriculums(currs);
    };
    fetchEvals();
    fetchCurrs();

    const handleUpdate = () => {
      fetchEvals();
      fetchCurrs();
    };
    window.addEventListener("school_evaluations_updated", handleUpdate);
    window.addEventListener("school_curriculum_updated", handleUpdate);
    window.addEventListener("school_data_updated", handleUpdate);
    return () => {
      window.removeEventListener("school_evaluations_updated", handleUpdate);
      window.removeEventListener("school_curriculum_updated", handleUpdate);
      window.removeEventListener("school_data_updated", handleUpdate);
    };
  }, [currentSession]);

  // Hỗ trợ dán ảnh trực tiếp từ clipboard (Ctrl+V) vào ô hỏi bài
  const handleStudentReplyPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
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
              setStudentReplyImage(loadEv.target.result as string);
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const handleStudentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn tệp hình ảnh (PNG, JPG, JPEG, WEBP)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEv) => {
      if (loadEv.target?.result) {
        setStudentReplyImage(loadEv.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    if (studentFileInputRef.current) studentFileInputRef.current.value = "";
  };

  const handleSendStudentQuestionOrReply = async () => {
    if (!studentReplyText.trim() && !studentReplyImage) {
      alert("Vui lòng nhập câu hỏi hoặc đính kèm ảnh!");
      return;
    }
    if (!currentSession) return;

    setSubmittingReply(true);

    if (activeEvalForReply) {
      await sendStudentReply(
        activeEvalForReply.id,
        currentSession.studentName,
        studentReplyText.trim() || (studentReplyImage ? "Đã gửi một hình ảnh" : ""),
        studentReplyImage || undefined
      );
    } else {
      await createOrSendStudentQuestion({
        studentId: currentSession.studentId,
        studentName: currentSession.studentName,
        studentClass: currentSession.className,
        teacherCode: currentSession.teacherCode,
        teacherName: currentSession.teacherName || "Giáo viên phụ trách",
        content: studentReplyText.trim() || (studentReplyImage ? "Đã gửi một hình ảnh" : ""),
        imageUrl: studentReplyImage || undefined,
      });
    }

    setSubmittingReply(false);
    setStudentReplyText("");
    setStudentReplyImage(null);
    setShowReplyModal(false);

    const refreshed = await getEvaluationsForStudent(currentSession.studentId, currentSession.studentName);
    setStudentEvaluations(refreshed);
    alert(`🎉 Đã gửi câu hỏi / phản hồi tới Giáo viên ${currentSession.teacherName || ""} thành công!`);
  };

  // Handle teacher code input change (Bắt buộc nhập đủ 6 chữ số)
  const handleTeacherCodeChange = async (val: string) => {
    const cleanDigits = val.replace(/\D/g, "").slice(0, 6);
    setInputTeacherCode(cleanDigits);
    setLoginError(null);
    if (cleanDigits.length < 6) {
      setMatchedTeacher(null);
      setSelectedClassId("");
      setSelectedStudentId("");
      setInputPassword("");
      setInputConfirmPassword("");
      return;
    }
    const t = await findTeacherByCode(cleanDigits);
    setMatchedTeacher(t);
  };

  // Active selected class object
  const currentSelectedClass = useMemo(() => {
    if (!selectedClassId) return null;
    return (
      classesList.find(
        (c) =>
          c.id === selectedClassId ||
          c.name.trim().toLowerCase() === (selectedClassId || "").trim().toLowerCase()
      ) || null
    );
  }, [classesList, selectedClassId]);

  // Robust student filtering: matches by classId OR className OR grade
  const classStudents = useMemo(() => {
    const listToFilter = studentsList.length > 0 ? studentsList : DEFAULT_STUDENTS;
    if (!currentSelectedClass) return listToFilter;

    const targetId = (currentSelectedClass.id || "").trim().toLowerCase();
    const targetName = (currentSelectedClass.name || "").trim().toLowerCase();
    const cleanTargetName = targetName.replace(/^(lớp|lop)\s*/i, "").trim();

    const matched = listToFilter.filter((s) => {
      const sClassId = (s.classId || "").trim().toLowerCase();
      const sClassName = (s.className || "").trim().toLowerCase();
      const cleanSClassName = sClassName.replace(/^(lớp|lop)\s*/i, "").trim();

      const matchId = sClassId && (sClassId === targetId || sClassId === targetName || sClassId === cleanTargetName);
      const matchName =
        (sClassName && (sClassName === targetName || sClassName === targetId || cleanSClassName === cleanTargetName)) ||
        (cleanSClassName && cleanTargetName && cleanSClassName === cleanTargetName);

      return matchId || matchName;
    });

    if (matched.length > 0) {
      return matched.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
    }

    // Fallback 1: match by grade if class name contains grade (e.g. 12, 11, 10)
    const grade = (currentSelectedClass.grade || "").trim();
    if (grade) {
      const gradeMatched = listToFilter.filter((s) => {
        const sClassName = (s.className || "").trim().toLowerCase();
        const sClassId = (s.classId || "").trim().toLowerCase();
        return sClassName.startsWith(grade) || sClassId.includes(grade);
      });
      if (gradeMatched.length > 0) {
        return gradeMatched.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
      }
    }

    // Fallback 2: check in DEFAULT_STUDENTS
    const defaultMatched = DEFAULT_STUDENTS.filter((s) => {
      const sClassId = (s.classId || "").trim().toLowerCase();
      const sClassName = (s.className || "").trim().toLowerCase();
      const cleanSClassName = sClassName.replace(/^(lớp|lop)\s*/i, "").trim();
      return (
        sClassId === targetId ||
        sClassId === targetName ||
        sClassName === targetName ||
        cleanSClassName === cleanTargetName ||
        (grade && (sClassName.startsWith(grade) || sClassId.includes(grade)))
      );
    });
    if (defaultMatched.length > 0) {
      return defaultMatched.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
    }

    // Fallback 3: return listToFilter so list is never empty
    return listToFilter;
  }, [studentsList, currentSelectedClass]);

  // Ensure selectedClassId is initialized ONLY when already logged in
  useEffect(() => {
    if (currentSession && classesList.length > 0 && !selectedClassId) {
      setSelectedClassId(classesList[0].id);
    }
  }, [classesList, selectedClassId, currentSession]);

  // Progressive disclosure steps:
  // Bước 1: Mã Giáo Viên đã nhập đủ đúng 6 chữ số và đã nhận diện giáo viên
  const cleanCode = inputTeacherCode.trim().replace(/\D/g, "");
  const isStep1Done = Boolean(cleanCode.length === 6 && matchedTeacher);

  // Bước 2: Lớp học đã được chọn
  const isStep2Done = Boolean(isStep1Done && selectedClassId);

  // Bước 3: Học sinh đã được chọn
  const isStep3Done = Boolean(
    isStep2Done && (selectedStudentId || (isCustomStudent && customStudentName.trim()))
  );

  // Selected student object
  const activeSelectedStudent = useMemo(() => {
    if (isCustomStudent || !selectedStudentId) return null;
    return (
      classStudents.find((s) => s.id === selectedStudentId) ||
      studentsList.find((s) => s.id === selectedStudentId) ||
      null
    );
  }, [classStudents, studentsList, selectedStudentId, isCustomStudent]);

  // Has the student set a password before?
  const studentHasPassword = useMemo(() => {
    if (isCustomStudent || !activeSelectedStudent) return false;
    const pwd = (
      activeSelectedStudent.password ||
      (typeof window !== "undefined"
        ? localStorage.getItem(`std_pwd_${activeSelectedStudent.id}`)
        : "") ||
      ""
    ).trim();
    return Boolean(pwd.length > 0);
  }, [activeSelectedStudent, isCustomStudent]);

  // Handle student login / set password
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!inputTeacherCode.trim()) {
      setLoginError("Vui lòng nhập mã giáo viên");
      return;
    }

    if (!selectedClassId) {
      setLoginError("Vui lòng chọn lớp học");
      return;
    }

    if (isCustomStudent) {
      if (!customStudentName.trim()) {
        setLoginError("Vui lòng nhập họ và tên học sinh");
        return;
      }
    } else if (!selectedStudentId) {
      setLoginError("Vui lòng chọn tên học sinh");
      return;
    }

    const currentClass =
      classesList.find((c) => c.id === selectedClassId) ||
      currentSelectedClass ||
      classesList[0];

    if (!currentClass) {
      setLoginError("Dữ liệu lớp học không hợp lệ");
      return;
    }

    let student = activeSelectedStudent;

    // Resolve teacher name theo mã GV đã nhập (chỉ khi nhập đúng mã GV mới vào được cổng HS)
    const resolvedTeacher =
      matchedTeacher ||
      (await findTeacherByCode(cleanCode));

    if (!resolvedTeacher || cleanCode.length !== 6) {
      setLoginError("Mã giáo viên không đúng hoặc chưa tồn tại trong hệ thống. Chỉ khi nhập đúng mã GV mới vào được cổng học sinh!");
      return;
    }

    setLoginLoading(true);

    try {
      if (isCustomStudent) {
        if (!inputPassword.trim() || inputPassword.length < 4) {
          setLoginError("Mật khẩu phải có ít nhất 4 ký tự");
          setLoginLoading(false);
          return;
        }
        if (inputPassword !== inputConfirmPassword) {
          setLoginError("Mật khẩu xác nhận không khớp");
          setLoginLoading(false);
          return;
        }

        const maxOrder = classStudents.reduce((max, s) => Math.max(max, s.orderNumber || 0), 0);
        const newRes = await saveNewStudent({
          orderNumber: maxOrder + 1,
          fullName: customStudentName.trim(),
          dob: "01/01/2008",
          classId: currentClass.id,
          className: currentClass.name,
        });
        const createdId = newRes.id || "std_" + Date.now();
        await setStudentPassword(createdId, inputPassword.trim());
        if (typeof window !== "undefined") {
          localStorage.setItem(`std_pwd_${createdId}`, inputPassword.trim());
        }

        student = {
          id: createdId,
          orderNumber: maxOrder + 1,
          fullName: customStudentName.trim(),
          dob: "01/01/2008",
          classId: currentClass.id,
          className: currentClass.name,
          password: inputPassword.trim(),
        };
        setStudentsList((prev) => [...prev, student!]);
      } else {
        if (!student) {
          setLoginError("Vui lòng chọn học sinh hợp lệ");
          setLoginLoading(false);
          return;
        }

        // First time password setup
        if (!studentHasPassword) {
          if (!inputPassword.trim()) {
            setLoginError("Vui lòng đặt mật khẩu lần đầu cho học sinh");
            setLoginLoading(false);
            return;
          }
          if (inputPassword.trim().length < 4) {
            setLoginError("Mật khẩu phải có ít nhất 4 ký tự");
            setLoginLoading(false);
            return;
          }
          if (inputPassword.trim() !== inputConfirmPassword.trim()) {
            setLoginError("Mật khẩu xác nhận không khớp");
            setLoginLoading(false);
            return;
          }

          // Save password for student in Firestore & local cache
          await setStudentPassword(student.id, inputPassword.trim(), student.fullName);
          if (typeof window !== "undefined") {
            localStorage.setItem(`std_pwd_${student.id}`, inputPassword.trim());
            localStorage.setItem(`std_pwd_${student.fullName}`, inputPassword.trim());
            localStorage.setItem(`std_pwd_${student.fullName.toLowerCase()}`, inputPassword.trim());
          }
          student.password = inputPassword.trim();
          setStudentsList((prev) =>
            prev.map((s) => (s.id === student!.id ? { ...s, password: inputPassword.trim() } : s))
          );
        } else {
          // Verify existing password (from 2nd time onwards)
          const expectedPwd = (
            student.password ||
            (typeof window !== "undefined" ? localStorage.getItem(`std_pwd_${student.id}`) : "") ||
            ""
          ).trim();

          if (expectedPwd && expectedPwd !== inputPassword.trim()) {
            setLoginError("Mật khẩu không chính xác. Vui lòng kiểm tra lại");
            setLoginLoading(false);
            return;
          }
        }
      }

      // Create session
      const newSession: StudentSession = {
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

      // Lưu session tab-isolated vào sessionStorage
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

      setCurrentSession(newSession);
      setShowLoginModal(false);

      // Load submissions for this student
      const subs = await getStudentSubmissions(student.id, student.fullName);
      setSubmissionsList(subs);

      // Load curriculums for this student's class
      const currs = await getCurriculumsForClass(currentClass.id, currentClass.name);
      setStudentCurriculums(currs);
    } catch (err: any) {
      console.error("Login student error:", err);
      setLoginError("Có lỗi xảy ra khi xác thực. Vui lòng thử lại.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Filter assigned exams & homework for this student/class & teacher
  const assignedExams = useMemo(() => {
    if (!currentSession) return [];

    const sId = (currentSession.studentId || "").trim().toLowerCase();
    const sName = (currentSession.studentName || "").trim().toLowerCase();
    const cId = (currentSession.classId || "").trim().toLowerCase();
    const cName = (currentSession.className || "").trim().toLowerCase();

    return examsList.filter((exam) => {
      // 1. If assigned explicitly to individual students
      if (exam.assignedStudents && exam.assignedStudents.length > 0) {
        const matchStudentId = exam.assignedStudents.some(
          (id) => (id || "").trim().toLowerCase() === sId || (id || "").trim().toLowerCase() === sName
        );
        if (matchStudentId) return true;
      }
      if (exam.assignedStudentNames && exam.assignedStudentNames.length > 0) {
        const matchStudentName = exam.assignedStudentNames.some(
          (name) => (name || "").trim().toLowerCase() === sName
        );
        if (matchStudentName) return true;
      }

      // 2. If assigned to this class (or all classes)
      if (exam.assignedClasses && exam.assignedClasses.length > 0) {
        const matchClass = exam.assignedClasses.some((cl) => {
          const cleanCl = (cl || "").trim().toLowerCase();
          return cleanCl === "all" || cleanCl === cId || cleanCl === cName;
        });
        if (matchClass) return true;
      }

      // 3. Or if created by this teacher
      if (exam.accessCode && exam.accessCode === currentSession.teacherCode) {
        return true;
      }

      return false;
    });
  }, [examsList, currentSession]);

  // Dynamic Statistics & Competence calculation (Đánh giá năng lực 3 phần: Trắc nghiệm, Đúng/Sai, TLN)
  const stats = useMemo(() => {
    let p1Correct = 0;
    let p1Total = 0;
    let p2Correct = 0;
    let p2Total = 0;
    let p3Correct = 0;
    let p3Total = 0;
    let count = submissionsList.length;

    if (submissionsList.length > 0) {
      submissionsList.forEach((sub) => {
        if (sub.detailedResults) {
          if (sub.detailedResults.part1) {
            p1Correct += sub.detailedResults.part1.correct || 0;
            p1Total += sub.detailedResults.part1.total || 0;
          }
          if (sub.detailedResults.part2) {
            p2Correct += sub.detailedResults.part2.correct || 0;
            p2Total += sub.detailedResults.part2.total || 0;
          }
          if (sub.detailedResults.part3) {
            p3Correct += sub.detailedResults.part3.correct || 0;
            p3Total += sub.detailedResults.part3.total || 0;
          }
        } else if (sub.score !== undefined && sub.score !== null) {
          // Fallback ước lượng theo điểm số nếu thiếu detailedResults
          p1Correct += Math.round((sub.score / 10) * 12);
          p1Total += 12;
          p2Correct += sub.score >= 8 ? 3 : sub.score >= 5 ? 2 : 1;
          p2Total += 4;
          p3Correct += sub.score >= 8 ? 5 : sub.score >= 5 ? 3 : 1;
          p3Total += 6;
        }
      });
    } else {
      p1Correct = 0;
      p1Total = 0;
      p2Correct = 0;
      p2Total = 0;
      p3Correct = 0;
      p3Total = 0;
      count = 0;
    }

    const p1Pct = p1Total > 0 ? Math.min(100, Math.round((p1Correct / p1Total) * 100)) : 0;
    const p2Pct = p2Total > 0 ? Math.min(100, Math.round((p2Correct / p2Total) * 100)) : 0;
    const p3Pct = p3Total > 0 ? Math.min(100, Math.round((p3Correct / p3Total) * 100)) : 0;

    return {
      hasData: submissionsList.length > 0,
      p1: {
        pct: p1Pct,
        correct: p1Correct,
        total: p1Total,
        wrong: Math.max(0, p1Total - p1Correct),
        times: count,
      },
      p2: {
        pct: p2Pct,
        correct: p2Correct,
        total: p2Total,
        wrong: Math.max(0, p2Total - p2Correct),
        times: count,
      },
      p3: {
        pct: p3Pct,
        correct: p3Correct,
        total: p3Total,
        wrong: Math.max(0, p3Total - p3Correct),
        times: count,
      },
    };
  }, [submissionsList]);

  // Hàm đánh giá năng lực trực quan (Tốt - Đạt - Yếu)
  const getPartCompetence = (pct: number, total: number) => {
    if (total === 0) {
      return {
        level: "none" as const,
        label: "CHƯA THI",
        color: "#64748b",
        bgColor: "#f1f5f9",
        borderColor: "#cbd5e1",
        icon: "⏳",
        advice: "Chưa có dữ liệu bài làm",
      };
    }
    if (pct >= 75) {
      return {
        level: "good" as const,
        label: "TỐT",
        color: "#15803d",
        bgColor: "#f0fdf4",
        borderColor: "#86efac",
        icon: "🟢",
        advice: "Nắm vững lý thuyết, phản xạ nhanh và chính xác.",
      };
    }
    if (pct >= 50) {
      return {
        level: "medium" as const,
        label: "ĐẠT",
        color: "#b45309",
        bgColor: "#fffbeb",
        borderColor: "#fde68a",
        icon: "🟡",
        advice: "Hiểu cơ bản, cần đọc kỹ đề để tránh mất điểm bẫy.",
      };
    }
    return {
      level: "weak" as const,
      label: "YẾU (CẦN ÔN)",
      color: "#b91c1c",
      bgColor: "#fef2f2",
      borderColor: "#fecaca",
      icon: "🔴",
      advice: "Hổng kiến thức phần này, cần làm thêm bài tập rèn luyện.",
    };
  };

  // Filter documents: CHỈ HIỂN THỊ TÀI LIỆU ĐÃ GIAO (giao riêng cho học sinh hoặc giao cho lớp)
  const relevantDocs = useMemo(() => {
    if (documentsList.length === 0) return [];
    if (!currentSession) return [];

    const studentClassId = (currentSession.classId || "").toLowerCase();
    const studentClassName = (currentSession.className || "").toLowerCase();
    const studentId = currentSession.studentId;
    const studentName = (currentSession.studentName || "").toLowerCase();
    const studentGrade = (currentSession.grade || "").toLowerCase();

    return documentsList.filter((doc) => {
      const hasClass = Array.isArray(doc.assignedClasses) && doc.assignedClasses.length > 0;
      const hasStudents = Array.isArray(doc.assignedStudents) && doc.assignedStudents.length > 0;

      // 1. Nếu tài liệu giao riêng cho từng học sinh cụ thể
      if (doc.assignType === "student" || hasStudents) {
        if (!hasStudents) return false;
        return (
          doc.assignedStudents!.includes(studentId) ||
          (doc.assignedStudentNames &&
            doc.assignedStudentNames.some((n) => n.toLowerCase() === studentName))
        );
      }

      // 2. Nếu tài liệu giao theo lớp học
      if (doc.assignType === "class" || hasClass) {
        if (!hasClass) return false;
        return doc.assignedClasses!.some((cl) => {
          const c = (cl || "").trim().toLowerCase();
          return (
            (c !== "all" && c === studentClassId) ||
            c === studentClassName ||
            (studentGrade && c === studentGrade) ||
            (studentClassName && c && studentClassName.includes(c))
          );
        });
      }

      // KHÔNG hiển thị tài liệu không được giao
      return false;
    });
  }, [documentsList, currentSession]);

  if (isInitializing) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🎓</div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e40af" }}>Đang tải Cổng Học Sinh...</div>
        </div>
      </div>
    );
  }

  const studentDisplayName = currentSession?.studentName || "Học sinh";
  const studentGrade = currentSession?.grade || "12";
  const teacherDisplayName =
    currentSession?.teacherName && currentSession.teacherName !== "FC ZO ZO"
      ? currentSession.teacherName
      : currentSession?.teacherCode
        ? (currentSession.teacherCode === "571024" || currentSession.teacherCode === "5710"
          ? "Đặng Anh Thư"
          : currentSession.teacherCode === "276648" || currentSession.teacherCode === "628842"
            ? "sogaminh123"
            : `Thầy/Cô (Mã: ${currentSession.teacherCode})`)
        : "Giáo viên bộ môn";

  return (
    <div className={styles.container}>
      {/* =========================================================
          1. TOP NAVIGATION / HEADER (KHUNG ĐẦU TRANG)
      ========================================================= */}
      <header className={styles.topNav}>
        <div className={styles.navContent}>
          <div className={styles.navLeft}>
            <Link href="/" className={styles.backBtn} title="Quay lại Trang Chủ">
              ←
            </Link>
            <div className={styles.titleBlock}>
              <h1 className={styles.mainTitle}>BÀI TẬP & ĐỀ THI</h1>
              <div className={styles.subTitle}>
                {studentDisplayName} • {studentGrade} • GV: {teacherDisplayName}
              </div>
            </div>
          </div>

          <div className={styles.navRight} style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {currentSession ? (
              <>
                {/* THẺ TÀI KHOẢN HỌC SINH ĐÃ ĐĂNG NHẬP */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "12px",
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    border: "1.5px solid #60a5fa",
                    padding: "6px 14px",
                    borderRadius: "10px",
                    boxShadow: "0 3px 10px rgba(37, 99, 235, 0.25)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, textAlign: "left" }}>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#ffffff",
                        fontWeight: 700,
                        letterSpacing: "0.2px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Chào, {studentDisplayName}
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
                      {currentSession?.className
                        ? (currentSession.className.toLowerCase().includes("lớp")
                          ? currentSession.className
                          : `Lớp: ${currentSession.className}`)
                        : `Lớp: ${studentGrade}A`}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      logoutStudentSession();
                      setCurrentSession(null);
                      setSelectedStudentId("");
                      setInputTeacherCode("");
                      setMatchedTeacher(null);
                      setShowLoginModal(false);
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
                    title="Đăng xuất khỏi tài khoản học sinh"
                  >
                    Đăng xuất
                  </button>
                </div>

                {/* Trophy badge on top right - exact to screenshot: 2/0 */}
                <div className={styles.trophyBadge} title="Tổng lượt thi / Điểm tích lũy">
                  <span className={styles.trophyIcon}>🏆</span>
                  <span>2/0</span>
                </div>

                <button
                  type="button"
                  className={styles.switchStudentBtn}
                  onClick={() => {
                    setNewPassword("");
                    setConfirmNewPassword("");
                    setPasswordModalError(null);
                    setShowChangePasswordModal(true);
                  }}
                  style={{
                    background: "#f0fdf4",
                    color: "#166534",
                    border: "1.5px solid #86efac",
                    fontWeight: 700,
                  }}
                  title="Đổi hoặc cập nhật mật khẩu đăng nhập của em"
                >
                  🔑 Đổi mật khẩu
                </button>

                <button
                  type="button"
                  className={styles.switchStudentBtn}
                  onClick={() => {
                    setInputTeacherCode("");
                    setMatchedTeacher(null);
                    setSelectedClassId("");
                    setSelectedStudentId("");
                    setIsCustomStudent(false);
                    setCustomStudentName("");
                    setInputPassword("");
                    setInputConfirmPassword("");
                    setLoginError(null);
                    setShowLoginModal(true);
                  }}
                  title="Đổi học sinh hoặc nhập mã giáo viên khác"
                >
                  🔄 Đổi học sinh
                </button>
              </>
            ) : (
              /* NÚT VÀO HỌC NỔI BẬT: CHỈ HIỆN KHI CHƯA ĐĂNG NHẬP */
              <button
                type="button"
                id="btn-student-header-vao-hoc"
                onClick={() => {
                  setInputTeacherCode("");
                  setMatchedTeacher(null);
                  setSelectedClassId("");
                  setSelectedStudentId("");
                  setLoginError(null);
                  setShowLoginModal(true);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  color: "#ffffff",
                  border: "1.5px solid #60a5fa",
                  padding: "8px 18px",
                  borderRadius: "10px",
                  fontSize: "13.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 3px 12px rgba(37, 99, 235, 0.35)",
                  transition: "all 0.15s ease",
                }}
                title="Bấm để mở cổng vào học"
              >
                <span style={{ fontSize: "16px" }}>🎓</span>
                <span>VÀO HỌC</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================
          2. MAIN CONTENT (THỐNG KÊ, BÀI TẬP & ĐỀ THI, TÀI LIỆU)
      ========================================================= */}
      <main className={styles.mainContent}>
        {!currentSession ? (
          /* MÀN HÌNH CHÀO ĐÓN: CỔNG VÀO HỌC CHỈ MỞ KHI ẤN "VÀO HỌC" */
          <div
            style={{
              background: "#ffffff",
              border: "1.5px solid #e2e8f0",
              borderRadius: "16px",
              padding: "48px 24px",
              textAlign: "center",
              boxShadow: "0 4px 24px rgba(0, 0, 0, 0.05)",
              maxWidth: "680px",
              margin: "36px auto",
            }}
          >
            <div style={{ fontSize: "56px", marginBottom: "16px" }}>🎓</div>
            <h2 style={{ fontSize: "21px", fontWeight: 800, color: "#1e293b", marginBottom: "10px" }}>
              CỔNG HỌC TẬP & THI TRỰC TUYẾN DÀNH CHO HỌC SINH
            </h2>
            <p
              style={{
                fontSize: "14.5px",
                color: "#64748b",
                marginBottom: "26px",
                lineHeight: 1.6,
                maxWidth: "520px",
                margin: "0 auto 26px auto",
              }}
            >
              Chào mừng em đến với Cổng học sinh THPT DTNT THCS & THPT Tuy Đức. Nhấn nút <strong>"VÀO HỌC"</strong> bên dưới để nhập mã giáo viên, chọn lớp học và bắt đầu luyện thi, làm bài tập.
            </p>
            <button
              type="button"
              id="btn-main-vao-hoc-ngay"
              onClick={() => {
                setInputTeacherCode("");
                setMatchedTeacher(null);
                setSelectedClassId("");
                setSelectedStudentId("");
                setLoginError(null);
                setShowLoginModal(true);
              }}
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "#ffffff",
                border: "none",
                padding: "14px 34px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(37, 99, 235, 0.35)",
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                letterSpacing: "0.4px",
                transition: "all 0.15s ease",
              }}
            >
              <span>🎓</span>
              <span>VÀO HỌC NGAY</span>
            </button>
          </div>
        ) : (
          <>
        {/* BA THẺ THỐNG KÊ NĂNG LỰC TRỰC QUAN: TRẮC NGHIỆM, ĐÚNG/SAI, TRẢ LỜI NGẮN (CHỈ HIỂN THỊ KHI HỌC SINH ĐÃ LÀM BÀI) */}
        {submissionsList.length > 0 && stats.hasData && (() => {
          const p1Comp = getPartCompetence(stats.p1.pct, stats.p1.total);
          const p2Comp = getPartCompetence(stats.p2.pct, stats.p2.total);
          const p3Comp = getPartCompetence(stats.p3.pct, stats.p3.total);

          // Lời khuyên tổng quan chẩn đoán năng lực
          let overallDiagnostic = "Em đang có phong độ làm bài khá đồng đều giữa các phần.";
          if (p1Comp.level === "good" && (p2Comp.level === "weak" || p3Comp.level === "weak")) {
            const weakPartName = p2Comp.level === "weak" && p3Comp.level === "weak" ? "Đúng/Sai và Trả lời ngắn" : (p2Comp.level === "weak" ? "Đúng/Sai" : "Trả lời ngắn");
            overallDiagnostic = `💡 Nhận xét nhanh: Em làm RẤT TỐT phần Trắc nghiệm (${stats.p1.pct}%), nhưng cần ôn luyện thêm phần ${weakPartName} (${p2Comp.level === "weak" ? stats.p2.pct : stats.p3.pct}%).`;
          } else if (p1Comp.level === "weak" && p2Comp.level === "good") {
            overallDiagnostic = `💡 Nhận xét nhanh: Em làm TỐT phần Đúng/Sai (${stats.p2.pct}%), nhưng phần Trắc nghiệm còn hay mất điểm (${stats.p1.pct}%). Hãy chú ý câu cơ bản!`;
          } else if (p1Comp.level === "good" && p2Comp.level === "good" && p3Comp.level === "good") {
            overallDiagnostic = "⭐ Xuất sắc! Em làm TỐT cả 3 phần thi: Trắc nghiệm, Đúng/Sai và Trả lời ngắn. Tiếp tục giữ vững phong độ nhé!";
          } else if (p1Comp.level === "weak" && p2Comp.level === "weak" && p3Comp.level === "weak") {
            overallDiagnostic = "⚠️ Chú ý: Cả 3 phần thi đều dưới mức 50%. Hãy chủ động bấm nút 'Hỏi bài Thầy/Cô' bên dưới để được hướng dẫn chi tiết nhé!";
          }

          return (
            <div style={{ marginBottom: "28px" }}>
              {/* THANH CHẨN ĐOÁN TỔNG QUAN NĂNG LỰC */}
              <div
                style={{
                  background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
                  border: "1.5px solid #bfdbfe",
                  borderRadius: "14px",
                  padding: "14px 18px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  boxShadow: "0 2px 8px rgba(37, 99, 235, 0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "24px" }}>🎯</span>
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                      ĐÁNH GIÁ NĂNG LỰC HỌC TẬP (3 PHẦN THI)
                    </div>
                    <div style={{ fontSize: "12.5px", color: "#334155", marginTop: "2px", lineHeight: 1.4 }}>
                      {overallDiagnostic}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: "20px",
                      background: p1Comp.bgColor,
                      color: p1Comp.color,
                      border: `1px solid ${p1Comp.borderColor}`,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>{p1Comp.icon}</span> TN: {stats.p1.pct}% ({p1Comp.label})
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: "20px",
                      background: p2Comp.bgColor,
                      color: p2Comp.color,
                      border: `1px solid ${p2Comp.borderColor}`,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>{p2Comp.icon}</span> Đ/S: {stats.p2.pct}% ({p2Comp.label})
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: "20px",
                      background: p3Comp.bgColor,
                      color: p3Comp.color,
                      border: `1px solid ${p3Comp.borderColor}`,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>{p3Comp.icon}</span> TLN: {stats.p3.pct}% ({p3Comp.label})
                  </span>
                </div>
              </div>

              {/* BA THẺ NĂNG LỰC: TRẮC NGHIỆM, ĐÚNG/SAI, TRẢ LỜI NGẮN */}
              <div className={styles.statsGrid} style={{ marginBottom: 0 }}>
                {/* THẺ 1: TRẮC NGHIỆM */}
                <div className={`${styles.statCard} ${styles.cardMultipleChoice}`} style={{ padding: "18px 20px" }}>
                  <div className={styles.cardHeader} style={{ marginBottom: "10px" }}>
                    <div className={styles.cardHeaderLeft}>
                      <span className={styles.cardIcon}>◎</span>
                      <span className={styles.cardHeaderLabel} style={{ fontWeight: 800 }}>TRẮC NGHIỆM</span>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: p1Comp.bgColor,
                        color: p1Comp.color,
                        border: `1px solid ${p1Comp.borderColor}`,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>{p1Comp.icon}</span> {p1Comp.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "28px", fontWeight: 900, color: p1Comp.color, letterSpacing: "-0.5px" }}>
                      {stats.p1.pct}%
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>
                      {stats.p1.correct} / {stats.p1.total} câu đúng
                    </span>
                  </div>

                  {/* Thanh tiến trình */}
                  <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
                    <div
                      style={{
                        width: `${stats.p1.pct}%`,
                        height: "100%",
                        background: p1Comp.level === "good" ? "#16a34a" : p1Comp.level === "medium" ? "#f59e0b" : "#dc2626",
                        borderRadius: "3px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>

                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                    💡 {p1Comp.advice}
                  </p>
                </div>

                {/* THẺ 2: ĐÚNG / SAI */}
                <div className={`${styles.statCard} ${styles.cardTrueFalse}`} style={{ padding: "18px 20px" }}>
                  <div className={styles.cardHeader} style={{ marginBottom: "10px" }}>
                    <div className={styles.cardHeaderLeft}>
                      <span className={styles.cardIcon}>✔</span>
                      <span className={styles.cardHeaderLabel} style={{ fontWeight: 800 }}>ĐÚNG / SAI</span>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: p2Comp.bgColor,
                        color: p2Comp.color,
                        border: `1px solid ${p2Comp.borderColor}`,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>{p2Comp.icon}</span> {p2Comp.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "28px", fontWeight: 900, color: p2Comp.color, letterSpacing: "-0.5px" }}>
                      {stats.p2.pct}%
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>
                      {stats.p2.correct} / {stats.p2.total} ý đúng
                    </span>
                  </div>

                  {/* Thanh tiến trình */}
                  <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
                    <div
                      style={{
                        width: `${stats.p2.pct}%`,
                        height: "100%",
                        background: p2Comp.level === "good" ? "#16a34a" : p2Comp.level === "medium" ? "#f59e0b" : "#dc2626",
                        borderRadius: "3px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>

                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                    💡 {p2Comp.advice}
                  </p>
                </div>

                {/* THẺ 3: TRẢ LỜI NGẮN */}
                <div className={`${styles.statCard} ${styles.cardShortAnswer}`} style={{ padding: "18px 20px" }}>
                  <div className={styles.cardHeader} style={{ marginBottom: "10px" }}>
                    <div className={styles.cardHeaderLeft}>
                      <span className={styles.cardIcon}>📄</span>
                      <span className={styles.cardHeaderLabel} style={{ fontWeight: 800 }}>TRẢ LỜI NGẮN</span>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: p3Comp.bgColor,
                        color: p3Comp.color,
                        border: `1px solid ${p3Comp.borderColor}`,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>{p3Comp.icon}</span> {p3Comp.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "28px", fontWeight: 900, color: p3Comp.color, letterSpacing: "-0.5px" }}>
                      {stats.p3.pct}%
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>
                      {stats.p3.correct} / {stats.p3.total} câu đúng
                    </span>
                  </div>

                  {/* Thanh tiến trình */}
                  <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
                    <div
                      style={{
                        width: `${stats.p3.pct}%`,
                        height: "100%",
                        background: p3Comp.level === "good" ? "#16a34a" : p3Comp.level === "medium" ? "#f59e0b" : "#dc2626",
                        borderRadius: "3px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>

                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                    💡 {p3Comp.advice}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* =========================================================
            MỤC ĐẶC BIỆT: NHẬN XÉT, ĐÁNH GIÁ TỪ GIÁO VIÊN & HỎI BÀI
        ========================================================= */}
        <section className={styles.sectionBlock} style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>💬</span>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                NHẬN XÉT, ĐÁNH GIÁ TỪ GIÁO VIÊN ({studentEvaluations.length})
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveEvalForReply(studentEvaluations.length > 0 ? studentEvaluations[0] : null);
                setStudentReplyText("");
                setShowReplyModal(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
              }}
            >
              <span>🙋</span> {studentEvaluations.length > 0 ? "Trả lời / Hỏi bài cô giáo" : "Đặt câu hỏi / Hỏi bài cô giáo"}
            </button>
          </div>

          {studentEvaluations.length === 0 ? (
            <div
              style={{
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                border: "1.5px dashed #cbd5e1",
                borderRadius: "14px",
                padding: "24px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div style={{ fontSize: "28px" }}>👩‍🏫</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                Chưa có nhận xét nào từ giáo viên
              </div>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#64748b", maxWidth: "460px" }}>
                Khi cô giáo gửi nhận xét năng lực, lời dặn dò sẽ hiển thị chi tiết tại đây. Em cũng có thể chủ động bấm nút <strong>"Đặt câu hỏi / Hỏi bài cô giáo"</strong> để được hướng dẫn giải đáp!
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {studentEvaluations.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    background: "#ffffff",
                    border: "1.5px solid #bfdbfe",
                    borderRadius: "14px",
                    padding: "16px 20px",
                    boxShadow: "0 2px 10px rgba(37, 99, 235, 0.08)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px dashed #e2e8f0", paddingBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "22px" }}>👩‍🏫</span>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 800, color: "#1e3a8a" }}>
                          {ev.teacherName || currentSession?.teacherName || "Giáo viên phụ trách"} {ev.teacherCode ? `(Mã GV: ${ev.teacherCode})` : ""}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                          Đánh giá năng lực {ev.examTitle ? `• Đề: ${ev.examTitle}` : ""} {ev.score !== undefined ? `• Điểm: ${ev.score.toFixed(1)}/10` : ""}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ background: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 800 }}>
                        ⭐ Trao đổi 2 chiều
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveEvalForReply(ev);
                          setStudentReplyText("");
                          setStudentReplyImage(null);
                          setShowReplyModal(true);
                        }}
                        style={{
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          border: "1px solid #bfdbfe",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        💬 Phản hồi / Hỏi bài
                      </button>
                    </div>
                  </div>

                  {/* DANH SÁCH TIN NHẮN TRONG CUỘC HỘI THOẠI */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {ev.messages.map((msg) => {
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
                              maxWidth: "88%",
                              padding: "10px 14px",
                              borderRadius: isTeacher ? "12px 12px 12px 2px" : "12px 12px 2px 12px",
                              background: isTeacher ? "#f8fafc" : "#eff6ff",
                              border: isTeacher ? "1px solid #e2e8f0" : "1.5px solid #bfdbfe",
                              color: isTeacher ? "#1e293b" : "#1e40af",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", fontSize: "11px", fontWeight: 700, color: isTeacher ? "#059669" : "#2563eb" }}>
                              <span>{isTeacher ? "👩‍🏫 " + msg.senderName : "👤 Em (" + msg.senderName + ")"}</span>
                              {msg.isAiGenerated && (
                                <span style={{ background: "#e0e7ff", color: "#4338ca", padding: "1px 5px", borderRadius: "4px", fontSize: "10px" }}>
                                  🤖 Phân tích AI
                                </span>
                              )}
                              <span style={{ marginLeft: "auto", color: "#94a3b8", fontWeight: 400 }}>
                                {msg.formattedTime || ""}
                              </span>
                            </div>
                            <div style={{ fontSize: "13.5px", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
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
                                      border: "1px solid #cbd5e1",
                                      cursor: "pointer",
                                      objectFit: "contain",
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
                </div>
              ))}
            </div>
          )}
        </section>

        {/* =========================================================
            MỤC 1: BÀI TẬP & ĐỀ THI
        ========================================================= */}
        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionHeadingIcon}>📖</span>
            <span>BÀI TẬP & ĐỀ THI ({assignedExams.length})</span>
          </div>

          {assignedExams.length === 0 ? (
            /* Khung rỗng khi chưa có bài tập - đúng chuẩn giao diện hình ảnh */
            <div className={styles.emptyCardContainer}>
              <svg
                className={styles.emptyBookIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <div className={styles.emptyBadge}>Giáo viên chưa giao bài tập nào</div>
            </div>
          ) : (
            /* Danh sách bài tập và đề thi giáo viên giao kèm nút Làm bài */
            <div className={styles.assignedExamsGrid}>
              {assignedExams.map((exam) => {
                const sId = (currentSession?.studentId || "").trim().toLowerCase();
                const sName = (currentSession?.studentName || "").trim().toLowerCase();
                const isPersonal = Boolean(
                  (exam.assignedStudents && exam.assignedStudents.some(id => (id || "").trim().toLowerCase() === sId || (id || "").trim().toLowerCase() === sName)) ||
                  (exam.assignedStudentNames && exam.assignedStudentNames.some(name => (name || "").trim().toLowerCase() === sName))
                );

                return (
                  <div key={exam.id} className={styles.assignedExamCard}>
                    <div>
                      <div className={styles.examCardHeader}>
                        <div className={styles.badgeRow}>
                          <span
                            className={`${styles.subjectBadge} ${exam.subject === "toan"
                              ? styles.subjectToan
                              : exam.subject === "ly"
                                ? styles.subjectLy
                                : exam.subject === "hoa"
                                  ? styles.subjectHoa
                                  : styles.subjectOther
                              }`}
                          >
                            {exam.subjectName || "Môn học"}
                          </span>

                          {exam.isHomework && (
                            <span style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 800 }}>
                              📌 Bài tập về nhà
                            </span>
                          )}

                          {isPersonal && (
                            <span style={{ background: "#f3e8ff", color: "#7e22ce", border: "1px solid #e9d5ff", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 800 }}>
                              👤 Giao riêng cho em
                            </span>
                          )}
                        </div>
                        <span className={styles.examStatus + " " + styles.statusPending}>
                          ⏳ Cần làm
                        </span>
                      </div>

                      <h3 className={styles.examTitle} style={{ marginTop: "10px" }}>
                        {exam.title}
                      </h3>

                      {exam.teacherNote && (
                        <div style={{ marginTop: "8px", padding: "6px 10px", background: "#fffbeb", borderLeft: "3px solid #f59e0b", borderRadius: "4px", fontSize: "12px", color: "#92400e" }}>
                          💬 <strong>Lời dặn:</strong> {exam.teacherNote}
                        </div>
                      )}

                      {exam.dueDate && (
                        <div style={{ marginTop: "6px", fontSize: "11.5px", color: "#dc2626", fontWeight: 700 }}>
                          ⏰ Hạn nộp: {exam.dueDate}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className={styles.examMetaRow} style={{ marginBottom: "12px", marginTop: "10px" }}>
                        <span>📝 {exam.questions} câu hỏi</span>
                        <span>⏱️ {exam.timeMinutes} phút</span>
                        <span>📊 {exam.difficulty}</span>
                      </div>

                      <div className={styles.examCardFooter} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          GV: {teacherDisplayName}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {exam.fileUrl && (
                            <a
                              href={exam.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "6px 10px",
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                border: "1px solid #bfdbfe",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 700,
                                textDecoration: "none",
                              }}
                              title="Xem hoặc tải file đề bài tập"
                            >
                              📄 File bài tập
                            </a>
                          )}

                          <Link
                            href={`/mock-exams/${encodeURIComponent(exam.id)}`}
                            className={styles.startExamBtn}
                          >
                            <span>Làm bài</span> →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* =========================================================
            MỤC 2: TÀI LIỆU (TÀI LIỆU PDF) - CHỈ HIỂN THỊ KHI CÓ TÀI LIỆU ĐÃ GIAO
        ========================================================= */}
        {relevantDocs.length > 0 && (
          <section className={styles.sectionBlock}>
            <div className={styles.documentsSectionHeading}>
              <span className={styles.sectionHeadingIcon}>📁</span>
              <span>TÀI LIỆU ({relevantDocs.length})</span>
            </div>

            <div className={styles.docCardContainer}>
              {relevantDocs.map((doc) => (
                <div key={doc.id} className={styles.docItemRow}>
                  <div className={styles.docLeft}>
                    {/* Biểu tượng file PDF màu đỏ chuẩn ảnh */}
                    <svg
                      className={styles.docRedIcon}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <div className={styles.docInfo}>
                      <h4 className={styles.docItemTitle}>{doc.title}</h4>
                      <span className={styles.docFormatSub}>
                        TÀI LIỆU {doc.format || "PDF"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.docViewBtn}
                    onClick={() => {
                      if (doc.fileUrl) {
                        window.open(doc.fileUrl, "_blank");
                      } else {
                        setSelectedDoc(doc);
                      }
                    }}
                  >
                    Xem
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* =========================================================
            SECTION: GIÁO TRÌNH & KHUNG PHÂN PHỐI CHƯƠNG TRÌNH
        ========================================================= */}
        {studentCurriculums.length > 0 && (
          <section className={styles.sectionBlock}>
            <div
              className={styles.documentsSectionHeading}
              style={{
                background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
                color: "#ffffff",
                padding: "12px 18px",
                borderRadius: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>📖</span>
                <span style={{ fontWeight: 800, fontSize: "15px" }}>
                  GIÁO TRÌNH & KHUNG BÀI HỌC ({studentCurriculums.length})
                </span>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  background: "rgba(255, 255, 255, 0.2)",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontWeight: 700,
                }}
              >
                Lớp {currentSession?.className || "12"}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "14px",
                marginTop: "14px",
              }}
            >
              {studentCurriculums.map((curr) => {
                const chapsCount = curr.chapters ? curr.chapters.length : curr.totalChapters || 0;
                const lessonsCount = curr.chapters
                  ? curr.chapters.reduce((sum, c) => sum + (c.lessons ? c.lessons.length : 0), 0)
                  : curr.totalLessons || 0;

                return (
                  <div
                    key={curr.id}
                    style={{
                      background: "#ffffff",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "16px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 800,
                          }}
                        >
                          {curr.subjectName}
                        </span>
                        <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 700 }}>
                          ⏱️ {curr.estimatedHours} tiết
                        </span>
                      </div>

                      <h4
                        style={{
                          margin: "0 0 6px 0",
                          fontSize: "15px",
                          fontWeight: 800,
                          color: "#0f172a",
                          lineHeight: 1.4,
                        }}
                      >
                        {curr.title}
                      </h4>

                      <p
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          margin: "0 0 12px 0",
                          lineHeight: 1.5,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {curr.description}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          fontSize: "11.5px",
                          color: "#475569",
                          marginBottom: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            background: "#f8fafc",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            border: "1px solid #e2e8f0",
                            fontWeight: 700,
                          }}
                        >
                          📚 {chapsCount} Chương
                        </span>
                        <span
                          style={{
                            background: "#f8fafc",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            border: "1px solid #e2e8f0",
                            fontWeight: 700,
                          }}
                        >
                          📝 {lessonsCount} Tiết
                        </span>
                        <span
                          style={{
                            background: "#f8fafc",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          👩‍🏫 {curr.author}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        justifyContent: "flex-end",
                        borderTop: "1px solid #f1f5f9",
                        paddingTop: "10px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedCurriculumForStudent(curr)}
                        style={{
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          border: "1px solid #bfdbfe",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        👁️ Xem Đề Cương
                      </button>

                      {curr.fileUrl && (
                        <a
                          href={curr.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: "#f0fdf4",
                            color: "#15803d",
                            border: "1px solid #bbf7d0",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 700,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          📥 Tải PDF
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        </>
        )}
      </main>

      {/* =========================================================
          MODAL: ĐĂNG NHẬP / VÀO HỌC (NHẬP MÃ GV, CHỌN LỚP, TÊN, ĐẶT MK LẦN ĐẦU)
      ========================================================= */}
      {showLoginModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowLoginModal(false)}
        >
          <div className={styles.loginModalBox} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setShowLoginModal(false)}
              title="Đóng cổng vào học"
            >
              ✕
            </button>

            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderBadge}>🎓</div>
              <h2 className={styles.modalTitle}>Cổng Vào Học Của Học Sinh</h2>
              <p className={styles.modalSub}>
                Nhập mã giáo viên (6 số), chọn lớp, tên học sinh và đặt mật khẩu
              </p>
            </div>

            {/* Hướng dẫn 4 bước thông minh không cần email */}
            <div
              style={{
                background: "#f0fdfa",
                border: "1.5px solid #99f6e4",
                borderRadius: "10px",
                padding: "10px 14px",
                marginBottom: "16px",
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

            <form onSubmit={handleStudentLogin}>
              {/* 1. MÃ GIÁO VIÊN (6 SỐ) */}
              <div className={styles.formGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className={styles.formLabel} style={{ marginBottom: 0 }}>
                    <span>🔑 1. Nhập Mã Giáo Viên (6 số):</span>
                  </label>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: cleanCode.length === 6 ? (matchedTeacher ? "#16a34a" : "#ef4444") : "#64748b",
                    }}
                  >
                    {cleanCode.length}/6 số
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "center", width: "100%", margin: "4px 0" }}>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={inputTeacherCode}
                    onChange={(e) => handleTeacherCodeChange(e.target.value)}
                    className={styles.formInput}
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
                      border:
                        cleanCode.length === 6
                          ? matchedTeacher
                            ? "2px solid #16a34a"
                            : "2px solid #ef4444"
                          : "2px solid #3b82f6",
                      background:
                        cleanCode.length === 6
                          ? matchedTeacher
                            ? "#f0fdf4"
                            : "#fef2f2"
                          : "#ffffff",
                      boxShadow:
                        cleanCode.length === 6 && matchedTeacher
                          ? "0 0 0 4px rgba(22, 163, 74, 0.12)"
                          : "0 0 0 4px rgba(59, 130, 246, 0.08)",
                      outline: "none",
                      transition: "all 0.2s ease",
                    }}
                  />
                </div>

                {cleanCode.length > 0 && cleanCode.length < 6 && (
                  <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#64748b", textAlign: "center" }}>
                    🔢 Vui lòng nhập đủ 6 chữ số mã giáo viên do thầy/cô cung cấp.
                  </p>
                )}

                {cleanCode.length === 6 && !matchedTeacher && (
                  <div
                    style={{
                      margin: "8px 0 0 0",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "#fef2f2",
                      border: "1.5px solid #fecaca",
                      color: "#b91c1c",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>🚫</span>
                    <span>Mã giáo viên "{cleanCode}" không chính xác. Chỉ khi nhập đúng mã GV mới vào được cổng học sinh!</span>
                  </div>
                )}

                {matchedTeacher && (
                  <div className={styles.teacherMatchBanner}>
                    <span>👨‍🏫</span>
                    <span>
                      Giáo viên phụ trách: <strong>{matchedTeacher.fullName}</strong> (Mã: {matchedTeacher.teacherCode})
                    </span>
                  </div>
                )}
              </div>

              {/* 2. CHỌN LỚP - CHỈ HIỆN KHI ĐÃ NHẬP MÃ GIÁO VIÊN */}
              {isStep1Done && (
                <div className={styles.formGroup} style={{ animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                  <label className={styles.formLabel}>
                    <span>🏫 2. Chọn Lớp Học:</span>
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setSelectedClassId(cid);
                      setSelectedStudentId("");
                      setIsCustomStudent(false);
                      setInputPassword("");
                      setInputConfirmPassword("");
                    }}
                    className={styles.formSelect}
                    required
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {classesList.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name.toLowerCase().startsWith("lớp") ? cls.name : `Lớp ${cls.name}`} (Khối {cls.grade || "12"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. CHỌN TÊN HỌC SINH - CHỈ HIỆN KHI ĐÃ CHỌN LỚP */}
              {isStep2Done && (
                <div className={styles.formGroup} style={{ animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label className={styles.formLabel} style={{ marginBottom: 0 }}>
                      <span>👤 3. Chọn Tên Học Sinh:</span>
                    </label>
                    <span style={{ fontSize: "12px", color: classStudents.length > 0 ? "#16a34a" : "#f59e0b", fontWeight: 700 }}>
                      ({classStudents.length} học sinh)
                    </span>
                  </div>

                  {!isCustomStudent ? (
                    <select
                      value={selectedStudentId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__custom__") {
                          setIsCustomStudent(true);
                          setSelectedStudentId("");
                        } else {
                          setSelectedStudentId(val);
                          setIsCustomStudent(false);
                        }
                        setInputPassword("");
                        setInputConfirmPassword("");
                      }}
                      className={styles.formSelect}
                      required={!isCustomStudent}
                    >
                      <option value="">-- Chọn tên học sinh --</option>
                      {classStudents.map((std, idx) => (
                        <option key={std.id} value={std.id}>
                          {std.orderNumber || idx + 1}. {std.fullName} {std.dob ? `(${std.dob})` : ""}
                        </option>
                      ))}
                      <option value="__custom__">✏️ Tên em chưa có / Nhập họ tên khác...</option>
                    </select>
                  ) : (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="Nhập họ và tên đầy đủ của học sinh..."
                        value={customStudentName}
                        onChange={(e) => setCustomStudentName(e.target.value)}
                        className={styles.formInput}
                        required
                        autoFocus
                      />
                      {classStudents.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomStudent(false);
                            setSelectedStudentId("");
                          }}
                          style={{
                            padding: "0 14px",
                            background: "#f1f5f9",
                            border: "1.5px solid #cbd5e1",
                            borderRadius: "10px",
                            fontWeight: 700,
                            fontSize: "12.5px",
                            color: "#475569",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Chọn danh sách
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 4. MẬT KHẨU & NÚT VÀO HỌC - CHỈ HIỆN KHI ĐÃ CHỌN HỌC SINH */}
              {isStep3Done && (
                <div style={{ animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                  {!studentHasPassword ? (
                    <>
                      <div className={styles.firstTimeAlert}>
                        <span>💡</span>
                        <div>
                          <strong>Thiết lập lần đầu:</strong> Học sinh này chưa có mật khẩu. Vui lòng đặt mật khẩu để bảo mật tài khoản cho các lần đăng nhập sau.
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                          <span>🔐 4. Đặt Mật Khẩu Lần Đầu:</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)..."
                          value={inputPassword}
                          onChange={(e) => setInputPassword(e.target.value)}
                          className={styles.formInput}
                          required
                          autoFocus
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                          <span>🔐 Xác Nhận Lại Mật Khẩu:</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Nhập lại mật khẩu để xác nhận..."
                          value={inputConfirmPassword}
                          onChange={(e) => setInputConfirmPassword(e.target.value)}
                          className={styles.formInput}
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          color: "#166534",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          fontSize: "12.5px",
                          lineHeight: 1.5,
                          marginBottom: "16px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span style={{ fontSize: "16px" }}>✓</span>
                        <div>
                          <strong>Học sinh đã có mật khẩu:</strong> Từ lần đăng nhập thứ 2, em chỉ cần nhập mật khẩu đã tạo lần đầu là vào trang cá nhân.
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                          <span>🔐 4. Nhập Mật Khẩu Học Sinh:</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Nhập mật khẩu đã đặt..."
                          value={inputPassword}
                          onChange={(e) => setInputPassword(e.target.value)}
                          className={styles.formInput}
                          required
                          autoFocus
                        />
                      </div>
                    </>
                  )}

                  {/* THÔNG BÁO LỖI */}
                  {loginError && (
                    <div style={{ color: "#ef4444", fontSize: "13px", fontWeight: 700, margin: "10px 0" }}>
                      ⚠️ {loginError}
                    </div>
                  )}

                  {/* NÚT VÀO HỌC NGAY */}
                  <button type="submit" className={styles.submitBtn} disabled={loginLoading}>
                    {loginLoading ? "Đang xác thực..." : "VÀO HỌC NGAY 🚀"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL XEM TÀI LIỆU PDF
      ========================================================= */}
      {selectedDoc && (
        <div className={styles.modalOverlay} onClick={() => setSelectedDoc(null)}>
          <div className={styles.docModalBox} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setSelectedDoc(null)}
              title="Đóng"
            >
              ✕
            </button>

            <div className={styles.docModalHeader}>
              <span style={{ fontSize: "32px" }}>📕</span>
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "#0f172a" }}>
                  {selectedDoc.title}
                </h3>
                <span style={{ fontSize: "12px", color: "#9333ea", fontWeight: 700 }}>
                  Định dạng: {selectedDoc.format} • Dung lượng: {selectedDoc.size}
                </span>
              </div>
            </div>

            <div className={styles.docModalBody}>
              <p><strong>Nội dung tóm tắt:</strong></p>
              <p>{selectedDoc.description || "Tài liệu học tập chuyên đề lớp 12 chuẩn format Bộ Giáo Dục & Đào Tạo."}</p>
              <p style={{ fontSize: "13px", color: "#64748b", marginTop: "12px" }}>
                Người tải lên: <strong>{selectedDoc.uploader || teacherDisplayName}</strong>
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className={styles.submitBtn}
                style={{ width: "auto", padding: "0 24px", marginTop: 0 }}
                onClick={() => {
                  alert(`Đang mở tải tài liệu "${selectedDoc.title}"...`);
                  if (selectedDoc.fileUrl) {
                    window.open(selectedDoc.fileUrl, "_blank");
                  }
                }}
              >
                <span>📥</span> Tải xuống tài liệu PDF
              </button>
              <button
                type="button"
                className={styles.switchStudentBtn}
                onClick={() => setSelectedDoc(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL TRẢ LỜI / HỎI BÀI GIÁO VIÊN
      ========================================================= */}
      {showReplyModal && (
        <div className={styles.modalOverlay} onClick={() => setShowReplyModal(false)}>
          <div
            className={styles.modalContent}
            style={{ maxWidth: "560px", background: "#ffffff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={styles.modalHeader}
              style={{
                background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
                color: "#ffffff",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>💬</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#ffffff", fontWeight: 800 }}>
                    HỎI BÀI / TRAO ĐỔI VỚI GIÁO VIÊN
                  </h3>
                  <div style={{ fontSize: "12px", color: "#bfdbfe" }}>
                    Người nhận: {currentSession?.teacherName || "Giáo viên phụ trách"} {currentSession?.teacherCode ? `(Mã GV: ${currentSession.teacherCode})` : ""}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                style={{ color: "#ffffff", background: "transparent", border: "none", fontSize: "18px", cursor: "pointer" }}
                onClick={() => setShowReplyModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  💡 Chọn gợi ý câu hỏi & phản hồi nhanh:
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[
                    "Em cảm ơn thầy/cô đã nhận xét, em sẽ cố gắng ôn tập thêm phần lý thuyết ạ!",
                    "Thầy/Cô ơi cho em hỏi câu khó trong đề thi, thầy/cô hướng dẫn giúp em với ạ!",
                    "Em chưa hiểu rõ cách làm câu trắc nghiệm đúng/sai, thầy/cô chỉ cho em với ạ!",
                    "Em đã nộp bài rồi ạ, thầy/cô kiểm tra và góp ý giúp em nhé!",
                  ].map((presetText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setStudentReplyText(presetText)}
                      style={{
                        textAlign: "left",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        padding: "7px 10px",
                        fontSize: "12px",
                        color: "#475569",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {presetText}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                  Nội dung tin nhắn / Câu hỏi của em: <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  rows={4}
                  value={studentReplyText}
                  onChange={(e) => setStudentReplyText(e.target.value)}
                  onPaste={handleStudentReplyPaste}
                  placeholder="Nhập câu trả lời hoặc câu hỏi thắc mắc của em (Hỗ trợ dán ảnh bài tập Ctrl+V)..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: "13.5px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />

                {/* HỖ TRỢ ĐÍNH KÈM ẢNH HOẶC DÁN ẢNH TRỰC TIẾP */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="file"
                      ref={studentFileInputRef}
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleStudentFileSelect}
                    />
                    <button
                      type="button"
                      onClick={() => studentFileInputRef.current?.click()}
                      style={{
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#334155",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <span>📷</span>
                      <span>Chọn ảnh bài tập</span>
                    </button>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      Hoặc chụp màn hình và dán ảnh (<strong>Ctrl + V</strong>)
                    </span>
                  </div>
                </div>

                {/* PREVIEW ẢNH NẾU ĐÃ CHỌN HOẶC DÁN */}
                {studentReplyImage && (
                  <div style={{ marginTop: "10px", padding: "8px 12px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img
                        src={studentReplyImage}
                        alt="Ảnh đính kèm"
                        style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "6px", border: "1px solid #93c5fd" }}
                      />
                      <span style={{ fontSize: "12px", color: "#1e40af", fontWeight: 700 }}>
                        🖼️ Đã đính kèm ảnh câu hỏi/bài tập
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStudentReplyImage(null)}
                      style={{
                        background: "#fee2e2",
                        color: "#991b1b",
                        border: "none",
                        borderRadius: "50%",
                        width: "24px",
                        height: "24px",
                        fontWeight: 900,
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className={styles.switchStudentBtn}
                  onClick={() => setShowReplyModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSendStudentQuestionOrReply}
                  disabled={submittingReply}
                  className={styles.submitBtn}
                  style={{
                    width: "auto",
                    padding: "0 22px",
                    marginTop: 0,
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    color: "#ffffff",
                    fontWeight: 800,
                  }}
                >
                  {submittingReply ? "Đang gửi..." : "🚀 Gửi tới Giáo viên"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL XEM ĐỀ CƯƠNG & BÀI HỌC GIÁO TRÌNH (CHO HỌC SINH)
      ========================================================= */}
      {selectedCurriculumForStudent && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCurriculumForStudent(null)}>
          <div
            className={styles.modalBox}
            style={{ maxWidth: "760px", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", borderRadius: "16px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
                color: "#ffffff",
                padding: "16px 22px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 800, color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📖</span> ĐỀ CƯƠNG BÀI HỌC GIÁO TRÌNH
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#bfdbfe" }}>
                  {selectedCurriculumForStudent.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCurriculumForStudent(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "16px",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Summary card */}
              <div
                style={{
                  background: "#f8fafc",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "8px",
                  fontSize: "12.5px",
                }}
              >
                <div><strong>📐 Môn:</strong> {selectedCurriculumForStudent.subjectName} ({selectedCurriculumForStudent.grade})</div>
                <div><strong>⏱️ Thời lượng:</strong> {selectedCurriculumForStudent.estimatedHours} tiết học</div>
                <div><strong>👩‍🏫 Giáo viên:</strong> {selectedCurriculumForStudent.author}</div>
                <div><strong>📅 Năm học:</strong> {selectedCurriculumForStudent.academicYear}</div>
              </div>

              {selectedCurriculumForStudent.description && (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px", color: "#1e3a8a", lineHeight: 1.5 }}>
                  <strong>🎯 Mục tiêu học tập: </strong> {selectedCurriculumForStudent.description}
                </div>
              )}

              {/* Chapters & Lessons */}
              <div>
                <h4 style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>
                  📋 Danh mục các chương & bài học:
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {selectedCurriculumForStudent.chapters && selectedCurriculumForStudent.chapters.map((chap, i) => (
                    <div key={chap.id || i} style={{ border: "1px solid #cbd5e1", borderRadius: "8px", overflow: "hidden" }}>
                      <div style={{ background: "#f1f5f9", padding: "8px 12px", fontWeight: 800, fontSize: "13px", color: "#1e293b", display: "flex", justifyContent: "space-between" }}>
                        <span>{chap.title}</span>
                        <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 600 }}>{chap.lessons?.length || 0} bài</span>
                      </div>
                      <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {chap.lessons && chap.lessons.map((les, j) => (
                          <div key={les.id || j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px", padding: "3px 0", borderBottom: j < chap.lessons.length - 1 ? "1px dashed #f1f5f9" : "none" }}>
                            <span style={{ color: "#334155" }}>• {les.title}</span>
                            <span style={{ fontSize: "11px", color: "#64748b", background: "#f8fafc", padding: "1px 6px", borderRadius: "4px" }}>
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

            {/* Footer */}
            <div
              style={{
                padding: "12px 22px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              {selectedCurriculumForStudent.fileUrl ? (
                <a
                  href={selectedCurriculumForStudent.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: "linear-gradient(135deg, #059669, #10b981)",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>📥</span> Tải xuống toàn bộ giáo trình (PDF)
                </a>
              ) : <div />}

              <button
                type="button"
                className={styles.switchStudentBtn}
                onClick={() => setSelectedCurriculumForStudent(null)}
                style={{ padding: "6px 16px", fontSize: "12.5px" }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL ĐỔI MẬT KHẨU CHO HỌC SINH */}
      {showChangePasswordModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setShowChangePasswordModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
                padding: "18px 24px",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "22px" }}>🔑</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>ĐỔI MẬT KHẨU HỌC SINH</h3>
                  <div style={{ fontSize: "12px", opacity: 0.9 }}>
                    {studentDisplayName} • Lớp {currentSession?.className || studentGrade}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "20px",
                  cursor: "pointer",
                  padding: "4px",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudentPassword} style={{ padding: "24px" }}>
              {passwordModalError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>⚠️</span>
                  <span>{passwordModalError}</span>
                </div>
              )}

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Mật khẩu mới (*):
                </label>
                <input
                  type="password"
                  required
                  placeholder="Nhập ít nhất 4 ký tự..."
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordModalError(null);
                  }}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    color: "#0f172a",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Xác nhận mật khẩu mới (*):
                </label>
                <input
                  type="password"
                  required
                  placeholder="Nhập lại mật khẩu mới..."
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
                    setPasswordModalError(null);
                  }}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    color: "#0f172a",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "20px", fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
                💡 <strong>Ghi chú:</strong> Sau khi em lưu, mật khẩu này sẽ được cập nhật trực tiếp vào hệ thống và hiển thị ở cột <strong>MẬT KHẨU</strong> trong mục <em>Lớp và Học sinh</em> của Thầy/Cô để hỗ trợ tra cứu khi cần.
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  style={{
                    flex: 1,
                    padding: "11px 16px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    background: "#f1f5f9",
                    color: "#475569",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={passwordModalLoading}
                  style={{
                    flex: 1.5,
                    padding: "11px 16px",
                    borderRadius: "10px",
                    border: "none",
                    background: passwordModalLoading ? "#94a3b8" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    color: "#ffffff",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    cursor: passwordModalLoading ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  {passwordModalLoading ? "⏳ Đang lưu..." : "💾 LƯU MẬT KHẨU"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING 2-WAY Q&A WIDGET (CHỈ HIỂN THỊ KHI HỌC SINH ĐÃ ĐĂNG NHẬP VÀO HỌC) */}
      {currentSession && (
        <FloatingQAWidget
          role="student"
          currentUserName={currentSession.studentName || "Học sinh"}
          currentUserId={currentSession.studentId}
          studentClass={currentSession.className}
          teacherCode={currentSession.teacherCode}
          teacherName={currentSession.teacherName}
          evaluations={studentEvaluations}
          onRefreshEvaluations={async () => {
            if (currentSession) {
              const refreshed = await getEvaluationsForStudent(
                currentSession.studentId,
                currentSession.studentName,
                currentSession.teacherCode
              );
              setStudentEvaluations(refreshed);
            }
          }}
          defaultPosition="bottom-right"
        />
      )}
    </div>
  );
}
