"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getExamByCode,
  saveStudentResult,
  getScoreClassification,
  ExamItem,
} from "@/lib/examService";
import {
  getAllClasses,
  getAllStudents,
  DEFAULT_STUDENTS,
  SchoolClass,
  StudentItem,
} from "@/lib/classStudentService";

// Helper: Convert Google Drive link to preview embed
function getEmbedUrl(url: string): string {
  if (!url) return "";
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1] && url.includes("drive.google.com")) {
    return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
  }
  return url;
}

// Canvas Confetti Effect
function fireConfetti() {
  if (typeof window === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.zIndex = "99999";
  canvas.style.pointerEvents = "none";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles: Array<{
    x: number;
    y: number;
    r: number;
    color: string;
    vx: number;
    vy: number;
    alpha: number;
  }> = [];

  const colors = ["#2563eb", "#eab308", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#f97316"];
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.35 + (Math.random() - 0.5) * 100,
      r: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 3,
      alpha: 1,
    });
  }

  let animationFrame: number;
  const start = performance.now();

  function animate(now: number) {
    const elapsed = now - start;
    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.alpha = Math.max(0, 1 - elapsed / 3500);

      ctx!.save();
      ctx!.globalAlpha = p.alpha;
      ctx!.fillStyle = p.color;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();
    });

    if (elapsed < 3500) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animationFrame);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  }

  animationFrame = requestAnimationFrame(animate);
}

export default function MockExamRoomPage() {
  const params = useParams();
  const router = useRouter();
  const codeParam = (params?.code as string) || "";

  // 1. Exam Data & Status
  const [exam, setExam] = useState<ExamItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState<boolean>(false);

  // 2. Student Info & Registration
  const [classesList, setClassesList] = useState<SchoolClass[]>([]);
  const [studentsList, setStudentsList] = useState<StudentItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [studentFullName, setStudentFullName] = useState<string>("");
  const [studentCustomInput, setStudentCustomInput] = useState<boolean>(false);

  // 3. Pre-Exam & Exam State
  const [examStarted, setExamStarted] = useState<boolean>(false);
  const [examSubmitted, setExamSubmitted] = useState<boolean>(false);
  const [showAnswers, setShowAnswers] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<"exam" | "sheet">("sheet");

  // Timer
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(50);
  const [timeLeft, setTimeLeft] = useState<number>(50 * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 4. Student Answers
  const [part1Answers, setPart1Answers] = useState<Record<number, string>>({});
  const [part2Answers, setPart2Answers] = useState<Record<number, Record<string, string>>>({});
  const [part3Answers, setPart3Answers] = useState<Record<number, string>>({});

  // 5. Result State
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [resultDetails, setResultDetails] = useState<{
    part1: { correct: number; total: number; score: number };
    part2: { correct: number; total: number; score: number };
    part3: { correct: number; total: number; score: number };
  } | null>(null);

  // 6. Anti-Cheat & Tab Switch Protection
  const [tabViolationCount, setTabViolationCount] = useState<number>(0);
  const [showViolationModal, setShowViolationModal] = useState<boolean>(false);
  const [violationInfo, setViolationInfo] = useState<{
    title: string;
    desc: string;
    count: number;
    locked: boolean;
  } | null>(null);
  const [examLockedByViolation, setExamLockedByViolation] = useState<boolean>(false);
  const lastViolationTimeRef = useRef<number>(0);

  // Identify if Subject is Tin Học (Tin học không có phần 3, tổng 10đ chia cho P1 và P2)
  const isTinHoc = useMemo(() => {
    if (!exam) return false;
    const s = (exam.subject || "").toLowerCase();
    const sn = (exam.subjectName || "").toLowerCase();
    return s === "tin" || sn.includes("tin");
  }, [exam]);

  // Load Exam and Classes on Mount
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      setErrorMessage(null);

      try {
        // Load exam by 4-digit code or ID
        const found = await getExamByCode(codeParam);
        if (!found) {
          setErrorMessage("Đề thi không tồn tại hoặc đã bị gỡ");
          setLoading(false);
          return;
        }

        // Check if exam is closed
        if (found.status === "CLOSED") {
          setIsClosed(true);
          setExam(found);
          setLoading(false);
          return;
        }

        setExam(found);
        const duration = Number(found.timeMinutes) || 50;
        setTimeLimitMinutes(duration);
        setTimeLeft(duration * 60);

        // Load classes and students
        const classes = await getAllClasses();
        const students = await getAllStudents();
        setClassesList(classes);
        setStudentsList(students);

        // Check if student logged in previously
        if (typeof window !== "undefined") {
          const rawPortal = localStorage.getItem("student_portal_session");
          if (rawPortal) {
            try {
              const ps = JSON.parse(rawPortal);
              if (ps.classId) setSelectedClassId(ps.classId);
              if (ps.studentId) setSelectedStudentId(ps.studentId);
              if (ps.studentName) setStudentFullName(ps.studentName);
            } catch (e) {
              console.warn("Portal parse note:", e);
            }
          } else {
            const cachedUser = localStorage.getItem("school_current_user");
            if (cachedUser) {
              try {
                const u = JSON.parse(cachedUser);
                if (u.name) setStudentFullName(u.name);
                if (u.studentClass) {
                  const matchedCls = classes.find((c) => c.name.toLowerCase() === u.studentClass.toLowerCase());
                  if (matchedCls) setSelectedClassId(matchedCls.id);
                }
              } catch (e) {
                console.warn("User parse note:", e);
              }
            } else if (classes.length > 0) {
              setSelectedClassId(classes[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Error loading mock exam:", err);
        setErrorMessage("Lỗi kết nối khi tải đề thi. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [codeParam]);

  // Filter students by selected class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return studentsList.length > 0 ? studentsList : DEFAULT_STUDENTS;
    const targetCls = classesList.find((c) => c.id === selectedClassId || c.name.toLowerCase() === selectedClassId.toLowerCase());
    const targetId = (selectedClassId || "").trim().toLowerCase();
    const targetName = (targetCls?.name || "").trim().toLowerCase();
    const cleanTargetName = targetName.replace(/^(lớp|lop)\s*/i, "").trim();

    const matched = studentsList.filter((s) => {
      const sClassId = (s.classId || "").trim().toLowerCase();
      const sClassName = (s.className || "").trim().toLowerCase();
      const cleanSClassName = sClassName.replace(/^(lớp|lop)\s*/i, "").trim();

      const matchId = sClassId && (sClassId === targetId || sClassId === targetName || sClassId === cleanTargetName);
      const matchName =
        (sClassName && (sClassName === targetName || sClassName === targetId || cleanSClassName === cleanTargetName)) ||
        (cleanSClassName && cleanTargetName && cleanSClassName === cleanTargetName);

      return matchId || matchName;
    });

    if (matched.length > 0) return matched;

    const defaultMatched = DEFAULT_STUDENTS.filter((s) => {
      const sClassId = (s.classId || "").trim().toLowerCase();
      const sClassName = (s.className || "").trim().toLowerCase();
      const cleanSClassName = sClassName.replace(/^(lớp|lop)\s*/i, "").trim();
      return (
        sClassId === targetId ||
        sClassId === targetName ||
        sClassName === targetName ||
        cleanSClassName === cleanTargetName
      );
    });
    if (defaultMatched.length > 0) return defaultMatched;

    return studentsList.length > 0 ? studentsList : DEFAULT_STUDENTS;
  }, [studentsList, selectedClassId, classesList]);

  // Handle student selection from dropdown
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    if (studentId === "custom") {
      setStudentCustomInput(true);
      setStudentFullName("");
    } else {
      setStudentCustomInput(false);
      const st = studentsList.find((s) => s.id === studentId);
      if (st) setStudentFullName(st.fullName);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!examStarted || examSubmitted) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examStarted, examSubmitted]);

  // Warn on page exit when exam is running
  useEffect(() => {
    if (!examStarted || examSubmitted) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Bạn đang làm bài thi! Rời khỏi trang bài làm có thể bị mất kết quả?";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [examStarted, examSubmitted]);

  // Anti-cheat: Track tab switching / window blur to prevent looking up answers
  useEffect(() => {
    if (!examStarted || examSubmitted || examLockedByViolation) return;

    const recordViolation = () => {
      const now = Date.now();
      // Throttle 1500ms to prevent double counting on blur + visibilitychange
      if (now - lastViolationTimeRef.current < 1500) return;
      lastViolationTimeRef.current = now;

      setTabViolationCount((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          // Thoát từ 3 lần trở lên -> Đóng bài thi ngay lập tức
          setExamLockedByViolation(true);
          setViolationInfo({
            title: "BÀI THI ĐÃ BỊ ĐÓNG DO VI PHẠM (3/3)!",
            desc: "Bạn đã rời khỏi màn hình bài thi từ 3 lần trở lên để tra bài. Theo quy chế thi trực tuyến, bài thi của bạn đã bị ĐÓNG và thu hồi tự động ngay lập tức.",
            count: 3,
            locked: true,
          });
          setShowViolationModal(true);
          executeGradingAndSave("Vi phạm quy chế: Thoát tab bài thi 3 lần");
          return 3;
        } else if (next === 2) {
          setViolationInfo({
            title: "CẢNH BÁO NGUY HIỂM (Lần 2/3)!",
            desc: "Bạn đã rời khỏi tab bài thi lần thứ 2! Chú ý: Nếu bạn rời khỏi màn hình bài thi thêm 1 lần nữa, bài thi sẽ NGAY LẬP TỨC BỊ ĐÓNG VÀ NỘP BÀI TỰ ĐỘNG!",
            count: 2,
            locked: false,
          });
          setShowViolationModal(true);
          return 2;
        } else {
          setViolationInfo({
            title: "CẢNH BÁO VI PHẠM QUY CHẾ (Lần 1/3)!",
            desc: "Bạn vừa rời khỏi màn hình bài thi! Quy chế thi nghiêm cấm chuyển tab hoặc mở ứng dụng khác để tra cứu bài. Nếu vi phạm từ 3 lần trở lên, bài thi sẽ bị ĐÓNG tự động!",
            count: 1,
            locked: false,
          });
          setShowViolationModal(true);
          return 1;
        }
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation();
      }
    };

    const handleWindowBlur = () => {
      recordViolation();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    // Prevent key combinations used for cheating / inspecting
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && (e.key === "u" || e.key === "U" || e.key === "p" || e.key === "P")) ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c"))
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [examStarted, examSubmitted, examLockedByViolation]);

  // Format Time (MM:SS)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Parsed Answer Key Helper
  const parsedAnswerKey = useMemo(() => {
    if (!exam) return { part1: {}, part2: {}, part3: {} };

    // Part 1
    const p1Map: Record<number, string> = {};
    const p1Source: string =
      exam.answerKey?.part1 ||
      "1D 2B 3C 4C 5A 6D 7C 8A 9B 10D 11B 12B 13A 14C 15D 16B 17A 18C";
    const p1Matches = p1Source.match(/(\d+)\s*([A-D])/gi) || [];
    p1Matches.forEach((m: string) => {
      const parts = m.match(/(\d+)\s*([A-D])/i);
      if (parts) {
        p1Map[Number(parts[1])] = parts[2].toUpperCase();
      }
    });

    // Part 2
    const p2Map: Record<number, Record<string, string>> = {};
    const p2Source: string =
      exam.answerKey?.part2 ||
      "1: Đ Đ Đ S 2: Đ S S S 3: S S Đ Đ 4: S Đ S S";
    const p2Questions = p2Source.split(/(?=\d+:)/).filter(Boolean);
    p2Questions.forEach((chunk: string) => {
      const qNumMatch = chunk.match(/^(\d+):/);
      if (qNumMatch) {
        const qNum = Number(qNumMatch[1]);
        const tokens = chunk
          .replace(/^\d+:/, "")
          .trim()
          .split(/\s+/)
          .filter((t: string) => t === "Đ" || t === "S" || t === "D" || t === "s" || t === "đ");
        p2Map[qNum] = {
          A: tokens[0]?.toUpperCase() === "D" ? "Đ" : tokens[0]?.toUpperCase() || "Đ",
          B: tokens[1]?.toUpperCase() === "D" ? "Đ" : tokens[1]?.toUpperCase() || "S",
          C: tokens[2]?.toUpperCase() === "D" ? "Đ" : tokens[2]?.toUpperCase() || "Đ",
          D: tokens[3]?.toUpperCase() === "D" ? "Đ" : tokens[3]?.toUpperCase() || "S",
        };
      }
    });

    // Part 3
    const p3Map: Record<number, string> = {};
    const p3Source: string =
      exam.answerKey?.part3 ||
      "1: 1  2: 85  3: 0.31  4: 136  5: 2.47  6: 32";
    const p3Chunks = p3Source.split(/(?=\d+:)/).filter(Boolean);
    p3Chunks.forEach((chunk: string) => {
      const parts = chunk.match(/^(\d+):\s*([^\d:]+)/);
      if (parts) {
        p3Map[Number(parts[1])] = parts[2].trim();
      }
    });

    return { part1: p1Map, part2: p2Map, part3: p3Map };
  }, [exam]);

  // Question Counts
  const part1Count = useMemo(() => {
    const keys = Object.keys(parsedAnswerKey.part1);
    return keys.length > 0 ? keys.length : 18;
  }, [parsedAnswerKey]);

  const part2Count = useMemo(() => {
    const keys = Object.keys(parsedAnswerKey.part2);
    return keys.length > 0 ? keys.length : 4;
  }, [parsedAnswerKey]);

  const part3Count = useMemo(() => {
    if (isTinHoc) return 0;
    const keys = Object.keys(parsedAnswerKey.part3);
    return keys.length > 0 ? keys.length : 6;
  }, [parsedAnswerKey, isTinHoc]);

  const totalQuestions = part1Count + part2Count + part3Count;

  // Answered Progress Count
  const answeredCount = useMemo(() => {
    const p1Ans = Object.keys(part1Answers).length;
    let p2Ans = 0;
    Object.values(part2Answers).forEach((opts) => {
      if (Object.keys(opts).length === 4) p2Ans++;
    });
    const p3Ans = isTinHoc ? 0 : Object.values(part3Answers).filter((v) => v.trim()).length;
    return p1Ans + p2Ans + p3Ans;
  }, [part1Answers, part2Answers, part3Answers, isTinHoc]);

  // Handle Starting Exam
  const handleStartExam = () => {
    if (!studentFullName.trim()) {
      alert("Vui lòng chọn hoặc nhập Họ và Tên học sinh!");
      return;
    }

    setTabViolationCount(0);
    setExamLockedByViolation(false);
    setShowViolationModal(false);
    lastViolationTimeRef.current = Date.now();

    // Try requesting fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // ignore
    }

    setExamStarted(true);
  };

  // Auto Submit when time runs out
  const handleAutoSubmit = () => {
    alert("⏰ ĐÃ HẾT GIỜ LÀM BÀI! Hệ thống đang tự động nộp và chấm điểm bài thi của bạn.");
    executeGradingAndSave();
  };

  // Student manual click Submit
  const handleManualSubmit = () => {
    const unAnswered = totalQuestions - answeredCount;
    const confirmMsg =
      unAnswered > 0
        ? `Bạn còn ${unAnswered} câu chưa hoàn thành. Bạn có chắc chắn muốn nộp bài ngay bây giờ?`
        : "Bạn đã hoàn thành các câu hỏi. Bạn có chắc chắn muốn nộp bài để xem điểm?";

    if (confirm(confirmMsg)) {
      executeGradingAndSave();
    }
  };

  // Grade & Save Execution
  const executeGradingAndSave = async (violationReason?: string) => {
    if (!exam) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setExamSubmitted(true);
    if (violationReason) {
      setExamLockedByViolation(true);
    }

    // Scoring configs
    // Part 1:
    const p1TotalScore = isTinHoc ? (exam.scoreConfig?.p1Total || 6.0) : (exam.scoreConfig?.p1Total || 3.0);
    const scorePerP1 = part1Count > 0 ? p1TotalScore / part1Count : 0.25;

    let p1Correct = 0;
    for (let i = 1; i <= part1Count; i++) {
      const studentChoice = part1Answers[i];
      const correctChoice = parsedAnswerKey.part1[i];
      if (studentChoice && correctChoice && studentChoice.toUpperCase() === correctChoice.toUpperCase()) {
        p1Correct++;
      }
    }
    const p1FinalScore = Math.round(p1Correct * scorePerP1 * 100) / 100;

    // Part 2: (4 options: 1 ý = 0.1, 2 ý = 0.25, 3 ý = 0.5, 4 ý = 1.0)
    const p2_1 = exam.scoreConfig?.p2_1 || 0.1;
    const p2_2 = exam.scoreConfig?.p2_2 || 0.25;
    const p2_3 = exam.scoreConfig?.p2_3 || 0.5;
    const p2_4 = exam.scoreConfig?.p2_4 || 1.0;

    let p2TotalCorrectSub = 0;
    let p2FinalScore = 0;

    for (let i = 1; i <= part2Count; i++) {
      const studentSub = part2Answers[i] || {};
      const correctSub = parsedAnswerKey.part2[i] || { A: "Đ", B: "S", C: "Đ", D: "S" };
      let qSubCorrect = 0;

      ["A", "B", "C", "D"].forEach((opt) => {
        if (studentSub[opt] && studentSub[opt] === correctSub[opt]) {
          qSubCorrect++;
          p2TotalCorrectSub++;
        }
      });

      if (qSubCorrect === 1) p2FinalScore += p2_1;
      else if (qSubCorrect === 2) p2FinalScore += p2_2;
      else if (qSubCorrect === 3) p2FinalScore += p2_3;
      else if (qSubCorrect === 4) p2FinalScore += p2_4;
    }
    p2FinalScore = Math.round(p2FinalScore * 100) / 100;

    // Part 3:
    let p3Correct = 0;
    let p3FinalScore = 0;
    if (!isTinHoc && part3Count > 0) {
      const p3TotalScore = exam.scoreConfig?.p3Total || 3.0;
      const scorePerP3 = p3TotalScore / part3Count;

      for (let i = 1; i <= part3Count; i++) {
        const studentVal = (part3Answers[i] || "").trim().toLowerCase();
        const correctVal = (parsedAnswerKey.part3[i] || "").trim().toLowerCase();
        if (studentVal && correctVal && studentVal === correctVal) {
          p3Correct++;
        }
      }
      p3FinalScore = Math.round(p3Correct * scorePerP3 * 100) / 100;
    }

    // Total Score
    const totalScore = Math.min(10.0, Math.round((p1FinalScore + p2FinalScore + p3FinalScore) * 100) / 100);
    setResultScore(totalScore);

    const detailed = {
      part1: { correct: p1Correct, total: part1Count, score: p1FinalScore },
      part2: { correct: p2TotalCorrectSub, total: part2Count * 4, score: p2FinalScore },
      part3: { correct: p3Correct, total: part3Count, score: p3FinalScore },
    };
    setResultDetails(detailed);

    // Save to Firestore 'student_results' collection
    const currentCls = classesList.find((c) => c.id === selectedClassId);
    await saveStudentResult({
      examId: exam.id,
      examTitle: exam.title,
      examCode: exam.accessCode || codeParam,
      classId: selectedClassId || "free",
      className: currentCls ? currentCls.name : "Tự do",
      studentId: selectedStudentId || "student_" + Date.now(),
      studentName: studentFullName,
      score: totalScore,
      violation: violationReason || (examLockedByViolation ? "Vi phạm thoát tab quá 3 lần" : undefined),
      detailedResults: detailed,
      answers: {
        part1: part1Answers,
        part2: part2Answers,
        part3: part3Answers,
      },
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("school_data_updated"));
      window.dispatchEvent(new Event("school_submissions_updated"));
    }

    // Fire Confetti if score >= 8.0
    if (totalScore >= 8.0) {
      setTimeout(() => fireConfetti(), 300);
    }
  };

  // Scroll to question helper
  const scrollToQuestion = (sectionId: string, qNum: number) => {
    const el = document.getElementById(`${sectionId}-q${qNum}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // -------------------------------------------------------------
  // RENDER: LOADING STATE
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>⏳</div>
        <h3 style={{ margin: 0, color: "#1e3a8a", fontWeight: 800 }}>Đang kiểm tra mã đề thi...</h3>
        <p style={{ color: "#64748b", fontSize: "14px", marginTop: "6px" }}>Vui lòng đợi trong giây lát</p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 1: ERROR - MÃ ĐỀ KHÔNG TỒN TẠI
  // -------------------------------------------------------------
  if (errorMessage) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", padding: "20px", fontFamily: "sans-serif" }}>
        <div style={{ background: "#ffffff", maxWidth: "480px", width: "100%", borderRadius: "16px", padding: "36px 30px", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>❌</div>
          <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#dc2626", margin: "0 0 10px 0" }}>
            Đề thi không tồn tại hoặc đã bị gỡ
          </h2>
          <p style={{ fontSize: "14.5px", color: "#64748b", lineHeight: "1.6", margin: "0 0 24px 0" }}>
            Hệ thống không tìm thấy đề thi với mã <strong style={{ color: "#1e293b", background: "#fee2e2", padding: "2px 8px", borderRadius: "4px" }}>{codeParam}</strong>. Vui lòng kiểm tra lại mã 4 số được giáo viên cung cấp.
          </p>

          {/* Quick Input to Enter 4-digit code */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input
              type="text"
              maxLength={6}
              placeholder="Nhập mã 4 số..."
              id="retry-code-input"
              style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #cbd5e1", borderRadius: "8px", fontSize: "16px", fontWeight: 700, textAlign: "center", letterSpacing: "2px", outline: "none" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.currentTarget as HTMLInputElement).value.trim();
                  if (val) router.push(`/mock-exams/${val}`);
                }
              }}
            />
            <button
              onClick={() => {
                const el = document.getElementById("retry-code-input") as HTMLInputElement;
                if (el && el.value.trim()) router.push(`/mock-exams/${el.value.trim()}`);
              }}
              style={{ background: "#2563eb", color: "#ffffff", border: "none", borderRadius: "8px", padding: "0 18px", fontWeight: 800, cursor: "pointer", fontSize: "14px" }}
            >
              Vào Thi
            </button>
          </div>

          <Link href="/" style={{ display: "inline-block", color: "#2563eb", fontWeight: 700, fontSize: "13.5px", textDecoration: "none" }}>
            ← Quay về Trang chủ
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 1B: ERROR - ĐỀ THI ĐÃ ĐÓNG
  // -------------------------------------------------------------
  if (isClosed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", padding: "20px", fontFamily: "sans-serif" }}>
        <div style={{ background: "#ffffff", maxWidth: "480px", width: "100%", borderRadius: "16px", padding: "36px 30px", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>🔒</div>
          <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#ea580c", margin: "0 0 10px 0" }}>
            Đề thi đã đóng
          </h2>
          <p style={{ fontSize: "14.5px", color: "#64748b", lineHeight: "1.6", margin: "0 0 24px 0" }}>
            Giáo viên đã kết thúc phiên làm bài cho đề thi <strong style={{ color: "#1e293b" }}>{exam?.title}</strong>. Vui lòng liên hệ giáo viên bộ môn nếu bạn cần mở lại phòng thi.
          </p>
          <Link href="/" style={{ display: "inline-block", background: "#eff6ff", color: "#1d4ed8", padding: "10px 20px", borderRadius: "8px", fontWeight: 800, fontSize: "14px", textDecoration: "none", border: "1px solid #bfdbfe" }}>
            ← Quay về Trang chủ
          </Link>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  // -------------------------------------------------------------
  // RENDER 2: THÔNG TIN ĐỀ THI & FORM NHẬP THÔNG TIN (TRƯỚC KHI BẮT ĐẦU)
  // -------------------------------------------------------------
  if (!examStarted) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif", padding: "30px 20px" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto", background: "#ffffff", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 8px 30px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          
          {/* Header Banner */}
          <div style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)", padding: "26px 30px", color: "#ffffff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <span style={{ display: "inline-block", background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  📚 {exam.subjectName || "Môn thi"}
                </span>
                <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 900, lineHeight: "1.4" }}>
                  {exam.title}
                </h1>
                <div style={{ marginTop: "6px", fontSize: "13px", opacity: 0.9 }}>
                  🏫 {exam.school || "THPT DTNT THCS & THPT Tuy Đức"}
                </div>
              </div>


            </div>
          </div>

          <div style={{ padding: "30px" }}>
            {/* Meta Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "26px" }}>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "16px", borderRadius: "12px" }}>
                <div style={{ fontSize: "12px", color: "#1d4ed8", fontWeight: 800, textTransform: "uppercase" }}>⏱️ Thời Gian Làm Bài</div>
                <div style={{ fontSize: "20px", fontWeight: 900, color: "#1e3a8a", marginTop: "4px" }}>{exam.timeMinutes} phút</div>
              </div>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "16px", borderRadius: "12px" }}>
                <div style={{ fontSize: "12px", color: "#15803d", fontWeight: 800, textTransform: "uppercase" }}>📝 Số Lượng Câu Hỏi</div>
                <div style={{ fontSize: "20px", fontWeight: 900, color: "#14532d", marginTop: "4px" }}>{totalQuestions} câu</div>
              </div>
              <div style={{ background: "#fefce8", border: "1px solid #fef08a", padding: "16px", borderRadius: "12px" }}>
                <div style={{ fontSize: "12px", color: "#a16207", fontWeight: 800, textTransform: "uppercase" }}>📊 Thang Điểm & Cấu Trúc</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#713f12", marginTop: "6px" }}>
                  {isTinHoc ? "P1 (6.0đ) + P2 (4.0đ) = 10đ" : "P1 (3.0đ) + P2 (4.0đ) + P3 (3.0đ)"}
                </div>
              </div>
            </div>

            {/* Lưu ý quy chế thi (Không cho phép xem trước đề) */}
            <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "10px", padding: "12px 16px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>🛡️</span>
              <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
                <strong>Bảo mật đề thi:</strong> Đề thi chỉ được phát và hiển thị sau khi thí sinh hoàn tất xác nhận thông tin và bấm <strong>BẮT ĐẦU LÀM BÀI</strong>.
              </div>
            </div>

            {/* Form nhập thông tin HS */}
            <div style={{ background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: "14px", padding: "20px", marginBottom: "26px" }}>
              <h3 style={{ margin: "0 0 14px 0", fontSize: "15px", fontWeight: 900, color: "#1e3a8a", textTransform: "uppercase" }}>
                👤 Thông tin Thí sinh tham gia thi
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "14px" }}>
                {/* Chọn Lớp */}
                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 800, color: "#475569", marginBottom: "6px" }}>
                    LỚP HỌC:
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setSelectedStudentId("");
                      setStudentFullName("");
                    }}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", fontWeight: 700, color: "#1e293b", background: "#ffffff", outline: "none" }}
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {classesList.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Lớp {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chọn Học Sinh */}
                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 800, color: "#475569", marginBottom: "6px" }}>
                    HỌ VÀ TÊN HỌC SINH:
                  </label>
                  {!studentCustomInput && classStudents.length > 0 ? (
                    <select
                      value={selectedStudentId}
                      onChange={(e) => handleStudentSelect(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", fontWeight: 700, color: "#1e293b", background: "#ffffff", outline: "none" }}
                    >
                      <option value="">-- Chọn tên học sinh --</option>
                      {classStudents.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.orderNumber ? `${st.orderNumber}. ` : ""}{st.fullName} {st.dob ? `(${st.dob})` : ""}
                        </option>
                      ))}
                      <option value="custom">✏️ Nhập tên khác...</option>
                    </select>
                  ) : (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        placeholder="Nhập họ và tên thí sinh..."
                        value={studentFullName}
                        onChange={(e) => setStudentFullName(e.target.value)}
                        style={{ flex: 1, padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", fontWeight: 700, color: "#1e293b", outline: "none" }}
                      />
                      {classStudents.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setStudentCustomInput(false)}
                          style={{ padding: "0 12px", border: "1px solid #cbd5e1", background: "#ffffff", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}
                        >
                          Danh sách
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Security & Anti-cheat notice */}
              <div
                style={{
                  background: "#fffbeb",
                  border: "1.5px solid #fde68a",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: "20px", lineHeight: 1 }}>🛡️</span>
                <div style={{ fontSize: "12.5px", color: "#92400e", lineHeight: 1.5 }}>
                  <strong>Quy chế bảo mật chống gian lận:</strong> Nghiêm cấm chuyển tab hoặc mở ứng dụng khác để tra cứu trong suốt thời gian làm bài thi.
                  <div style={{ color: "#b45309", fontWeight: 700, marginTop: "3px" }}>
                    ⚠️ NẾU RỜI TAB TỪ 3 LẦN TRỞ LÊN: Bài thi sẽ TỰ ĐỘNG ĐÓNG & NỘP BÀI ngay lập tức!
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                💡 Lưu ý: Khi nhấn &quot;Bắt đầu làm bài&quot;, đồng hồ sẽ đếm ngược và hệ thống sẽ mở chế độ toàn màn hình. Khi hết giờ, bài làm sẽ tự động được nộp và lưu điểm vào CSDL.
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "14px" }}>
              <button
                type="button"
                onClick={handleStartExam}
                style={{
                  flex: 1,
                  padding: "16px",
                  fontSize: "16px",
                  fontWeight: 900,
                  background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
                  letterSpacing: "0.5px",
                  transition: "transform 0.15s ease",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                🚀 BẮT ĐẦU LÀM BÀI
              </button>
              <Link
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 24px",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#475569",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "12px",
                  textDecoration: "none",
                }}
              >
                Quay lại
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 3: IN-EXAM FULL SCREEN MODE (GIỐNG HÌNH 1 & HÌNH 2)
  // -------------------------------------------------------------
  const embedPdfUrl = getEmbedUrl(exam.fileUrl || "");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" }}>
      
      {/* =========================================================
          TOP HEADER BAR (MATCHING IMAGE 1 & IMAGE 2)
      ========================================================= */}
      <div style={{ height: "54px", background: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", color: "#ffffff", zIndex: 100, boxShadow: "0 2px 10px rgba(0,0,0,0.15)" }}>
        {/* Left Side */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={() => {
              if (examSubmitted || confirm("Bạn có chắc chắn muốn rời khỏi phòng thi?")) {
                router.push("/");
              }
            }}
            title="Thoát phòng thi"
            style={{ background: "transparent", border: "none", color: "#ffffff", fontSize: "22px", cursor: "pointer", display: "flex", alignItems: "center", padding: "0 4px" }}
          >
            ←
          </button>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "14px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.3px" }}>
              {exam.subjectName?.toUpperCase() || "MÔN"} - {exam.title}
            </div>
            <div style={{ fontSize: "11px", opacity: 0.9, textTransform: "uppercase", fontWeight: 700 }}>
              👤 {studentFullName || "THÍ SINH"} {selectedClassId ? `• LỚP ${classesList.find((c) => c.id === selectedClassId)?.name || ""}` : ""}
            </div>
          </div>
        </div>

        {/* Right Side: MATCHING EXACTLY IMAGE 1 */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Mobile Tab Switcher */}
          <div style={{ display: "none" }} className="mobile-toggle">
            <button
              onClick={() => setMobileTab("exam")}
              style={{ background: mobileTab === "exam" ? "#ffffff" : "rgba(255,255,255,0.2)", color: mobileTab === "exam" ? "#1d4ed8" : "#fff", border: "none", borderRadius: "14px", padding: "4px 10px", fontSize: "11px", fontWeight: 700 }}
            >
              📄 Đề
            </button>
            <button
              onClick={() => setMobileTab("sheet")}
              style={{ background: mobileTab === "sheet" ? "#ffffff" : "rgba(255,255,255,0.2)", color: mobileTab === "sheet" ? "#1d4ed8" : "#fff", border: "none", borderRadius: "14px", padding: "4px 10px", fontSize: "11px", fontWeight: 700 }}
            >
              📋 Đáp án
            </button>
          </div>

          {/* Show Score Pill (IMAGE 1) if Submitted */}
          {examSubmitted && resultScore !== null && (
            <div
              style={{
                background: "#eab308",
                color: "#1e3a8a",
                padding: "5px 16px",
                borderRadius: "24px",
                fontWeight: 900,
                fontSize: "15px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                letterSpacing: "0.5px",
              }}
            >
              <span>🏆</span>
              <span>{resultScore.toFixed(2)} ĐIỂM</span>
            </div>
          )}

          {/* Anti-cheat Tab Violation Badge */}
          <div
            style={{
              padding: "5px 14px",
              borderRadius: "24px",
              fontWeight: 800,
              fontSize: "12.5px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              letterSpacing: "0.3px",
              background:
                tabViolationCount >= 3
                  ? "#991b1b"
                  : tabViolationCount === 2
                  ? "#dc2626"
                  : tabViolationCount === 1
                  ? "#d97706"
                  : "rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              border:
                tabViolationCount >= 2
                  ? "1.5px solid #fca5a5"
                  : tabViolationCount === 1
                  ? "1.5px solid #fde68a"
                  : "1px solid rgba(255, 255, 255, 0.3)",
              boxShadow:
                tabViolationCount >= 2
                  ? "0 0 12px rgba(220, 38, 38, 0.6)"
                  : "none",
            }}
            title="Hệ thống giám sát chống chuyển tab tra bài. Thoát từ 3 lần trở lên bài thi sẽ tự động đóng."
          >
            <span>{tabViolationCount >= 3 ? "🚫" : tabViolationCount === 2 ? "🚨" : tabViolationCount === 1 ? "⚠️" : "🛡️"}</span>
            <span>
              {tabViolationCount >= 3
                ? "ĐÃ KHÓA (3/3)"
                : `RỜI TAB: ${tabViolationCount}/3`}
            </span>
          </div>

          {/* Progress Pill if Not Submitted */}
          {!examSubmitted && (
            <div style={{ background: "rgba(255, 255, 255, 0.15)", border: "1px solid rgba(255, 255, 255, 0.3)", padding: "4px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
              <span>👁️</span> {answeredCount}/{totalQuestions} CÂU
            </div>
          )}

          {/* Timer Pill (MATCHING IMAGE 1 & IMAGE 2) */}
          <div
            style={{
              border: "2px solid rgba(255, 255, 255, 0.4)",
              background: timeLeft < 300 && !examSubmitted ? "#dc2626" : "rgba(255, 255, 255, 0.15)",
              borderRadius: "24px",
              padding: "5px 16px",
              color: "#ffffff",
              fontWeight: 900,
              fontSize: "15px",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              letterSpacing: "0.5px",
            }}
          >
            <span>⏱️</span>
            <span>{examSubmitted ? "HOÀN TẤT" : formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          MAIN WORKSPACE: SPLIT SCREEN (IMAGE 2)
      ========================================================= */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        
        {/* -------------------------------------------------------
            LEFT PANEL: PDF / EXAM VIEWER
        ------------------------------------------------------- */}
        <div
          style={{
            flex: 1,
            background: "#e2e8f0",
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              width: "100%",
              maxWidth: "880px",
              minHeight: "1200px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
              borderRadius: "8px",
              padding: "40px",
              position: "relative",
              fontFamily: "'Times New Roman', Times, serif",
              color: "#000000",
            }}
          >
            {/* Popout Button on Top Right (IMAGE 2) */}
            {exam.fileUrl && (
              <a
                href={exam.fileUrl}
                target="_blank"
                rel="noreferrer"
                title="Mở đề thi trong tab mới"
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  background: "#0f172a",
                  color: "#ffffff",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontWeight: 700,
                }}
              >
                <span>↗</span>
              </a>
            )}

            {/* If external PDF embed available, show embedded iframe */}
            {embedPdfUrl ? (
              <iframe
                src={embedPdfUrl}
                style={{ width: "100%", height: "1400px", border: "none" }}
                title="Đề thi chính thức"
              />
            ) : (
              /* Simulated Standard High School Exam Paper (MATCHING IMAGE 2) */
              <div>
                <div style={{ textAlign: "center", marginBottom: "8px", color: "#dc2626", fontSize: "13.5px", fontWeight: "bold" }}>
                  khoahoc.hoctuongtac.com – Tài liệu – Thi thử
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "2px solid #000", paddingBottom: "16px", marginBottom: "20px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: "bold", fontSize: "14px" }}>BỘ GIÁO DỤC VÀ ĐÀO TẠO</div>
                    <div style={{ fontWeight: "bold", fontSize: "15px", marginTop: "4px" }}>ĐỀ THI CHÍNH THỨC</div>
                    <div style={{ fontSize: "13px", fontStyle: "italic" }}>(Đề thi có {Math.ceil(totalQuestions / 10) + 1} trang)</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: "bold", fontSize: "14px" }}>KỲ THI TỐT NGHIỆP TRUNG HỌC PHỔ THÔNG NĂM 2026</div>
                    <div style={{ fontWeight: "bold", fontSize: "15px", marginTop: "4px" }}>Môn thi: {exam.subjectName?.toUpperCase() || "ĐỊA LÍ"}</div>
                    <div style={{ fontSize: "13px", fontStyle: "italic" }}>Thời gian làm bài: {exam.timeMinutes} phút, không kể thời gian phát đề</div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", fontSize: "14px" }}>
                  <div>
                    <div>Họ, tên thí sinh: <strong>{studentFullName || "................................................"}</strong></div>
                    <div style={{ marginTop: "4px" }}>Số báo danh: <strong>................................................</strong></div>
                  </div>
                </div>

                {/* PHẦN I */}
                <div style={{ marginBottom: "26px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "15px", marginBottom: "14px", lineHeight: "1.5" }}>
                    PHẦN I: Thí sinh trả lời từ câu 1 đến câu {part1Count}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.
                  </div>

                  {Array.from({ length: part1Count }, (_, idx) => idx + 1).map((qNum) => (
                    <div key={qNum} id={`exam-p1-q${qNum}`} style={{ marginBottom: "18px", fontSize: "15px", lineHeight: "1.6" }}>
                      <div style={{ fontWeight: "bold" }}>
                        Câu {qNum}: {qNum === 1 ? "Nơi nào sau đây thường mưa nhiều?" : qNum === 2 ? "Phần lớn lãnh thổ Liên bang Nga thuộc đới khí hậu nào sau đây?" : qNum === 3 ? "Cơ cấu kinh tế theo ngành ở nước ta chuyển dịch theo hướng công nghiệp hoá, hiện đại hoá chủ yếu do:" : `Câu hỏi kiểm tra kiến thức trọng tâm số ${qNum} chuẩn cấu trúc GDPT:`}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", marginTop: "6px" }}>
                        <div><strong>A.</strong> Khu vực khí áp cao.</div>
                        <div><strong>B.</strong> Sườn núi khuất gió.</div>
                        <div><strong>C.</strong> Sườn núi đón gió ẩm.</div>
                        <div><strong>D.</strong> Dòng biển lạnh chảy qua.</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* PHẦN II */}
                <div style={{ marginBottom: "26px", borderTop: "1px dashed #cbd5e1", paddingTop: "20px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "15px", marginBottom: "14px", lineHeight: "1.5" }}>
                    PHẦN II: Thí sinh trả lời từ câu 1 đến câu {part2Count}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.
                  </div>

                  {Array.from({ length: part2Count }, (_, idx) => idx + 1).map((qNum) => (
                    <div key={qNum} id={`exam-p2-q${qNum}`} style={{ marginBottom: "18px", fontSize: "15px", lineHeight: "1.6" }}>
                      <div style={{ fontWeight: "bold" }}>
                        Câu {qNum}: Đọc đoạn thông tin và nhận định tính đúng/sai của các mệnh đề dưới đây:
                      </div>
                      <div style={{ marginLeft: "14px", marginTop: "6px" }}>
                        <div><strong>a)</strong> Hiện tượng suy thoái tài nguyên đất đang diễn biến phức tạp.</div>
                        <div><strong>b)</strong> Cơ cấu kinh tế chuyển dịch mạnh mẽ theo hướng công nghiệp hoá.</div>
                        <div><strong>c)</strong> Tỉ suất gia tăng dân số tự nhiên giảm xuống mức thấp.</div>
                        <div><strong>d)</strong> Tác động của cuộc Cách mạng công nghiệp lần thứ tư tạo ra nhiều cơ hội mới.</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* PHẦN III (NẾU CÓ) */}
                {!isTinHoc && part3Count > 0 && (
                  <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "20px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "15px", marginBottom: "14px", lineHeight: "1.5" }}>
                      PHẦN III: Thí sinh trả lời từ câu 1 đến câu {part3Count}. Mỗi câu thí sinh điền giá trị số vào ô đáp án.
                    </div>

                    {Array.from({ length: part3Count }, (_, idx) => idx + 1).map((qNum) => (
                      <div key={qNum} id={`exam-p3-q${qNum}`} style={{ marginBottom: "14px", fontSize: "15px", lineHeight: "1.6" }}>
                        <div style={{ fontWeight: "bold" }}>
                          Câu {qNum}: Tính toán và điền kết quả vào phiếu trả lời (làm tròn đến chữ số thập phân thích hợp):
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ textAlign: "center", marginTop: "40px", fontStyle: "italic", opacity: 0.7 }}>
                  ---------- HẾT ----------
                </div>
              </div>
            )}
          </div>
        </div>

        {/* -------------------------------------------------------
            RIGHT PANEL: PHIẾU ĐIỀN ĐÁP ÁN (MATCHING IMAGE 2)
        ------------------------------------------------------- */}
        <div
          style={{
            width: "440px",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            borderLeft: "1px solid #cbd5e1",
            boxShadow: "-4px 0 20px rgba(0,0,0,0.06)",
            zIndex: 20,
          }}
        >
          {/* Header of Answer Sheet */}
          <div
            style={{
              padding: "14px 20px",
              background: "#ffffff",
              borderBottom: "1px solid #e2e8f0",
              fontSize: "14.5px",
              fontWeight: 900,
              color: "#1d4ed8",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            <span>📋</span> PHIẾU ĐIỀN ĐÁP ÁN
          </div>

          {/* Quick Navigation Dots */}
          <div style={{ padding: "8px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", gap: "4px", maxHeight: "80px", overflowY: "auto" }}>
            {Array.from({ length: part1Count }, (_, i) => i + 1).map((q) => {
              const answered = Boolean(part1Answers[q]);
              return (
                <button
                  key={q}
                  onClick={() => scrollToQuestion("sheet-p1", q)}
                  style={{
                    width: "26px",
                    height: "24px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 800,
                    border: "none",
                    background: answered ? "#2563eb" : "#e2e8f0",
                    color: answered ? "#ffffff" : "#475569",
                    cursor: "pointer",
                  }}
                  title={`Câu ${q}`}
                >
                  {q}
                </button>
              );
            })}
          </div>

          {/* Answer Options Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "22px" }}>
            
            {/* ===================================================
                I. TRẮC NGHIỆM (MATCHING IMAGE 2)
            =================================================== */}
            <div>
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  color: "#1d4ed8",
                  fontWeight: 900,
                  fontSize: "13.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                  textTransform: "uppercase",
                }}
              >
                <span>📄</span> I. TRẮC NGHIỆM
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {Array.from({ length: part1Count }, (_, idx) => idx + 1).map((qNum) => {
                  const currentChoice = part1Answers[qNum];
                  const correctAns = parsedAnswerKey.part1[qNum];
                  const isCorrect = currentChoice && correctAns && currentChoice.toUpperCase() === correctAns.toUpperCase();

                  return (
                    <div
                      key={qNum}
                      id={`sheet-p1-q${qNum}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "6px 8px",
                        borderRadius: "8px",
                        background: showAnswers ? (isCorrect ? "#f0fdf4" : currentChoice ? "#fef2f2" : "#f8fafc") : "transparent",
                      }}
                    >
                      {/* Question Index */}
                      <div style={{ width: "24px", fontWeight: 800, color: "#64748b", fontSize: "13px", textAlign: "right" }}>
                        {qNum} |
                      </div>

                      {/* Options A, B, C, D */}
                      <div style={{ display: "flex", gap: "10px", flex: 1, justifyContent: "space-between" }}>
                        {["A", "B", "C", "D"].map((opt) => {
                          const isSelected = currentChoice === opt;
                          const isKey = showAnswers && correctAns === opt;

                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={examSubmitted}
                              onClick={() => setPart1Answers({ ...part1Answers, [qNum]: opt })}
                              style={{
                                width: "36px",
                                height: "34px",
                                borderRadius: "50%",
                                border: isKey ? "2px solid #16a34a" : isSelected ? "2px solid #1d4ed8" : "1.5px solid #cbd5e1",
                                background: isKey ? "#16a34a" : isSelected ? "#1d4ed8" : "#ffffff",
                                color: isKey || isSelected ? "#ffffff" : "#334155",
                                fontWeight: 800,
                                fontSize: "13px",
                                cursor: examSubmitted ? "default" : "pointer",
                                transition: "all 0.15s ease",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {/* Show Answer hint if enabled */}
                      {showAnswers && correctAns && (
                        <div style={{ fontSize: "12px", fontWeight: 800, color: isCorrect ? "#16a34a" : "#dc2626", minWidth: "50px", textAlign: "right" }}>
                          {isCorrect ? "✓ Đúng" : `ĐA: ${correctAns}`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ===================================================
                II. ĐÚNG / SAI
            =================================================== */}
            <div>
              <div
                style={{
                  background: "#f5f3ff",
                  border: "1px solid #ddd6fe",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  color: "#6d28d9",
                  fontWeight: 900,
                  fontSize: "13.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                  textTransform: "uppercase",
                }}
              >
                <span>✅</span> II. ĐÚNG / SAI
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {Array.from({ length: part2Count }, (_, idx) => idx + 1).map((qNum) => {
                  const subAnswers = part2Answers[qNum] || {};
                  const correctSubs = parsedAnswerKey.part2[qNum] || { A: "Đ", B: "S", C: "Đ", D: "S" };

                  return (
                    <div key={qNum} id={`sheet-p2-q${qNum}`} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px" }}>
                      <div style={{ fontWeight: 800, fontSize: "13px", color: "#1e293b", marginBottom: "8px" }}>
                        Câu {qNum}:
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {["A", "B", "C", "D"].map((opt) => {
                          const currentVal = subAnswers[opt];
                          const correctVal = correctSubs[opt];
                          const isCorrect = currentVal === correctVal;

                          return (
                            <div key={opt} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                              <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#475569" }}>
                                {opt.toLowerCase()})
                              </span>
                              <div style={{ display: "flex", gap: "4px" }}>
                                <button
                                  type="button"
                                  disabled={examSubmitted}
                                  onClick={() =>
                                    setPart2Answers({
                                      ...part2Answers,
                                      [qNum]: { ...(part2Answers[qNum] || {}), [opt]: "Đ" },
                                    })
                                  }
                                  style={{
                                    width: "28px",
                                    height: "26px",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "4px",
                                    background: currentVal === "Đ" ? (showAnswers ? (isCorrect ? "#16a34a" : "#dc2626") : "#1d4ed8") : "#f1f5f9",
                                    color: currentVal === "Đ" ? "#ffffff" : "#334155",
                                    fontSize: "11px",
                                    fontWeight: 900,
                                    cursor: examSubmitted ? "default" : "pointer",
                                  }}
                                >
                                  Đ
                                </button>
                                <button
                                  type="button"
                                  disabled={examSubmitted}
                                  onClick={() =>
                                    setPart2Answers({
                                      ...part2Answers,
                                      [qNum]: { ...(part2Answers[qNum] || {}), [opt]: "S" },
                                    })
                                  }
                                  style={{
                                    width: "28px",
                                    height: "26px",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "4px",
                                    background: currentVal === "S" ? (showAnswers ? (isCorrect ? "#16a34a" : "#dc2626") : "#dc2626") : "#f1f5f9",
                                    color: currentVal === "S" ? "#ffffff" : "#334155",
                                    fontSize: "11px",
                                    fontWeight: 900,
                                    cursor: examSubmitted ? "default" : "pointer",
                                  }}
                                >
                                  S
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ===================================================
                III. TRẢ LỜI NGẮN (ẨN VỚI MÔN TIN HỌC)
            =================================================== */}
            {!isTinHoc && part3Count > 0 && (
              <div>
                <div
                  style={{
                    background: "#fefce8",
                    border: "1px solid #fef08a",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    color: "#854d0e",
                    fontWeight: 900,
                    fontSize: "13.5px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "12px",
                    textTransform: "uppercase",
                  }}
                >
                  <span>✍️</span> III. TRẢ LỜI NGẮN
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {Array.from({ length: part3Count }, (_, idx) => idx + 1).map((qNum) => {
                    const studentVal = (part3Answers[qNum] || "").trim();
                    const correctVal = (parsedAnswerKey.part3[qNum] || "").trim();
                    const isCorrect = studentVal.toLowerCase() === correctVal.toLowerCase();

                    return (
                      <div
                        key={qNum}
                        id={`sheet-p3-q${qNum}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          padding: "6px 10px",
                        }}
                      >
                        <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#64748b", width: "42px" }}>
                          C.{qNum}
                        </span>
                        <input
                          type="text"
                          disabled={examSubmitted}
                          placeholder="Điền đáp án..."
                          value={part3Answers[qNum] || ""}
                          onChange={(e) => setPart3Answers({ ...part3Answers, [qNum]: e.target.value })}
                          style={{
                            flex: 1,
                            padding: "6px 10px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: 700,
                            outline: "none",
                            background: showAnswers ? (isCorrect ? "#f0fdf4" : studentVal ? "#fef2f2" : "#ffffff") : "#ffffff",
                          }}
                        />
                        {showAnswers && correctVal && (
                          <span style={{ fontSize: "12px", fontWeight: 800, color: isCorrect ? "#16a34a" : "#dc2626" }}>
                            {isCorrect ? "✓ Đúng" : `ĐA: ${correctVal}`}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ===================================================
              PANEL FOOTER: NỘP BÀI BUTTON (MATCHING IMAGE 2)
          =================================================== */}
          <div
            style={{
              padding: "16px 20px",
              background: "#ffffff",
              borderTop: "1px solid #e2e8f0",
              boxShadow: "0 -4px 12px rgba(0,0,0,0.03)",
            }}
          >
            {!examSubmitted ? (
              <button
                type="button"
                disabled={examLockedByViolation}
                onClick={handleManualSubmit}
                style={{
                  width: "100%",
                  padding: "15px",
                  fontSize: "15px",
                  fontWeight: 900,
                  background: examLockedByViolation ? "#94a3b8" : "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  cursor: examLockedByViolation ? "not-allowed" : "pointer",
                  boxShadow: examLockedByViolation ? "none" : "0 4px 16px rgba(37, 99, 235, 0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseDown={(e) => { if (!examLockedByViolation) e.currentTarget.style.transform = "scale(0.97)"; }}
                onMouseUp={(e) => { if (!examLockedByViolation) e.currentTarget.style.transform = "scale(1)"; }}
              >
                <span>{examLockedByViolation ? "🚫" : "🚀"}</span>
                {examLockedByViolation ? "BÀI THI ĐÃ BỊ ĐÓNG (3/3)" : "NỘP BÀI NGAY"}
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowAnswers(!showAnswers)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    background: showAnswers ? "#1e3a8a" : "#eff6ff",
                    color: showAnswers ? "#ffffff" : "#1d4ed8",
                    border: "1.5px solid #bfdbfe",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  {showAnswers ? "👁️ Ẩn Đáp Án Chi Tiết" : "🔍 Xem Lời Giải & Đáp Án Đúng"}
                </button>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setExamSubmitted(false);
                      setPart1Answers({});
                      setPart2Answers({});
                      setPart3Answers({});
                      setResultScore(null);
                      setTimeLeft(timeLimitMinutes * 60);
                      setShowAnswers(false);
                    }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      background: "#f8fafc",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    🔄 Làm Lại
                  </button>
                  <Link
                    href="/"
                    style={{
                      flex: 1,
                      padding: "10px",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      background: "#2563eb",
                      color: "#ffffff",
                      borderRadius: "8px",
                      textAlign: "center",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    🏠 Về Trang Chủ
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================
          RESULT OVERLAY MODAL (KHI VỪA NỘP XONG)
      ========================================================= */}
      {examSubmitted && resultScore !== null && resultDetails && !showAnswers && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              maxWidth: "520px",
              width: "100%",
              borderRadius: "20px",
              padding: "36px 30px",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              animation: "scaleIn 0.25s ease-out",
            }}
          >
            {(() => {
              const classification = getScoreClassification(resultScore);
              return (
                <>
                  <div style={{ fontSize: "64px", marginBottom: "8px" }}>
                    {examLockedByViolation ? "🚫" : classification.icon}
                  </div>

                  <h2 style={{ margin: "0 0 6px 0", fontSize: "22px", fontWeight: 900, color: examLockedByViolation ? "#dc2626" : classification.color }}>
                    {examLockedByViolation
                      ? "BÀI THI BỊ ĐÓNG DO VI PHẠM (3/3)"
                      : `XẾP LOẠI: ${classification.label.toUpperCase()}`}
                  </h2>

                  {examLockedByViolation && (
                    <div
                      style={{
                        background: "#fef2f2",
                        border: "1.5px solid #fecaca",
                        borderRadius: "10px",
                        padding: "10px 14px",
                        margin: "10px 0 16px 0",
                        color: "#991b1b",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        lineHeight: "1.5",
                      }}
                    >
                      ⚠️ Hệ thống đã khóa phiên làm bài và thu bài tự động do phát hiện thí sinh rời khỏi tab bài thi từ 3 lần trở lên. Điểm số được chấm dựa trên các câu đã trả lời trước khi bị đóng.
                    </div>
                  )}

                  <p style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "14px" }}>
                    Thí sinh: <strong>{studentFullName}</strong> • Lớp: <strong>{classesList.find((c) => c.id === selectedClassId)?.name || "Tự do"}</strong>
                  </p>

                  {/* Score Big Display */}
                  <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", border: "2px solid #93c5fd", borderRadius: "16px", padding: "20px", marginBottom: "22px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "1px" }}>
                      ĐIỂM TỔNG CỘNG
                    </div>
                    <div style={{ fontSize: "52px", fontWeight: 900, color: classification.color, lineHeight: "1.1", margin: "8px 0" }}>
                      {resultScore.toFixed(2)}
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: classification.bg,
                        color: classification.color,
                        border: `1.5px solid ${classification.border}`,
                        padding: "6px 14px",
                        borderRadius: "20px",
                        fontSize: "13.5px",
                        fontWeight: 800,
                        margin: "4px 0 10px 0",
                      }}
                    >
                      <span>{classification.icon}</span>
                      <span>Thành tích: {classification.label}</span>
                      <span style={{ fontSize: "12px", opacity: 0.85 }}>({classification.gradeText})</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 700 }}>
                      Thang điểm 10.0 • Chuẩn cấu trúc đề thi 2026
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Detailed Table */}
            <div style={{ background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "14px", marginBottom: "22px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
                <span style={{ color: "#475569", fontWeight: 700 }}>Phần 1 (Trắc nghiệm):</span>
                <strong>{resultDetails.part1.correct}/{resultDetails.part1.total} câu ({resultDetails.part1.score}đ)</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: !isTinHoc ? "1px solid #e2e8f0" : "none" }}>
                <span style={{ color: "#475569", fontWeight: 700 }}>Phần 2 (Đúng / Sai):</span>
                <strong>{resultDetails.part2.correct}/{resultDetails.part2.total} ý ({resultDetails.part2.score}đ)</strong>
              </div>
              {!isTinHoc && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <span style={{ color: "#475569", fontWeight: 700 }}>Phần 3 (Trả lời ngắn):</span>
                  <strong>{resultDetails.part3.correct}/{resultDetails.part3.total} câu ({resultDetails.part3.score}đ)</strong>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              {exam.allowReview !== false ? (
                <button
                  type="button"
                  onClick={() => setShowAnswers(true)}
                  style={{
                    flex: 1,
                    padding: "14px",
                    fontSize: "14px",
                    fontWeight: 800,
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  🔍 Xem Đáp Án & Bài Làm
                </button>
              ) : (
                <div
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    fontSize: "13px",
                    fontWeight: 700,
                    background: "#fef2f2",
                    color: "#991b1b",
                    border: "1.5px solid #fecaca",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  🔒 Giáo viên không cho xem đáp án sau thi
                </div>
              )}
              <Link
                href="/"
                style={{
                  padding: "14px 20px",
                  fontSize: "14px",
                  fontWeight: 700,
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                Trang chủ
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          ANTI-CHEAT VIOLATION MODAL (CẢNH BÁO / ĐÓNG BÀI THI)
      ========================================================= */}
      {showViolationModal && violationInfo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              maxWidth: "520px",
              width: "100%",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 25px 60px rgba(0,0,0,0.45)",
              border: violationInfo.locked ? "3px solid #dc2626" : "2px solid #f59e0b",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "22px 24px",
                background: violationInfo.locked
                  ? "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)"
                  : violationInfo.count === 2
                  ? "linear-gradient(135deg, #b91c1c 0%, #ea580c 100%)"
                  : "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div style={{ fontSize: "38px", lineHeight: 1 }}>
                {violationInfo.locked ? "🚫" : violationInfo.count === 2 ? "🚨" : "⚠️"}
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9 }}>
                  HỆ THỐNG AN NINH & BẢO MẬT PHÒNG THI
                </div>
                <h3 style={{ margin: "3px 0 0 0", fontSize: "17.5px", fontWeight: 900 }}>
                  {violationInfo.title}
                </h3>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "24px 26px" }}>
              {/* 3 Step Violation Progress Bar */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>
                  <span>Số lần phát hiện rời khỏi tab thi:</span>
                  <span style={{ color: violationInfo.locked ? "#dc2626" : "#d97706", fontWeight: 800 }}>
                    {violationInfo.count} / 3 lần vi phạm
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  <div
                    style={{
                      height: "8px",
                      borderRadius: "6px",
                      background: violationInfo.count >= 1 ? "#f59e0b" : "#e2e8f0",
                    }}
                  />
                  <div
                    style={{
                      height: "8px",
                      borderRadius: "6px",
                      background: violationInfo.count >= 2 ? "#ea580c" : "#e2e8f0",
                    }}
                  />
                  <div
                    style={{
                      height: "8px",
                      borderRadius: "6px",
                      background: violationInfo.count >= 3 ? "#dc2626" : "#e2e8f0",
                    }}
                  />
                </div>
              </div>

              {/* Message text */}
              <div
                style={{
                  background: violationInfo.locked ? "#fef2f2" : "#fffbeb",
                  border: violationInfo.locked ? "1px solid #fecaca" : "1px solid #fef08a",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "20px",
                }}
              >
                <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.6", color: violationInfo.locked ? "#991b1b" : "#92400e" }}>
                  {violationInfo.desc}
                </p>
                {violationInfo.locked && (
                  <div style={{ marginTop: "10px", fontSize: "13px", fontWeight: 800, color: "#b91c1c" }}>
                    🔒 Bài thi của bạn đã bị ĐÓNG. Kết quả đến thời điểm vi phạm đã được bảo lưu an toàn.
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div>
                {!violationInfo.locked ? (
                  <button
                    type="button"
                    onClick={() => setShowViolationModal(false)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      fontSize: "14.5px",
                      fontWeight: 800,
                      background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                    }}
                  >
                    Tôi đã hiểu & Cam kết tiếp tục làm bài
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowViolationModal(false)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      fontSize: "14.5px",
                      fontWeight: 800,
                      background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)",
                    }}
                  >
                    Xem kết quả bài nộp bị đóng
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
