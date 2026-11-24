"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  StudentEvaluation,
  StudentFeedbackMessage,
  createOrSendStudentQuestion,
  sendTeacherReply,
  sendStudentReply,
} from "@/lib/feedbackService";

export interface FloatingQAWidgetProps {
  role: "student" | "teacher" | "admin";
  currentUserName: string;
  currentUserId?: string;
  studentClass?: string;
  teacherCode?: string;
  teacherName?: string;
  evaluations: StudentEvaluation[];
  onRefreshEvaluations?: () => void;
  defaultPosition?: "bottom-right" | "bottom-left";
}

export default function FloatingQAWidget({
  role,
  currentUserName,
  currentUserId,
  studentClass,
  teacherCode,
  teacherName,
  evaluations,
  onRefreshEvaluations,
  defaultPosition = "bottom-right",
}: FloatingQAWidgetProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [position, setPosition] = useState<"bottom-right" | "bottom-left">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("qa_widget_pos");
      if (saved === "bottom-left" || saved === "bottom-right") return saved;
    }
    return defaultPosition;
  });

  const [selectedEvalId, setSelectedEvalId] = useState<string>("");
  const [inputText, setInputText] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [previewZoomImage, setPreviewZoomImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const togglePosition = () => {
    const next = position === "bottom-right" ? "bottom-left" : "bottom-right";
    setPosition(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("qa_widget_pos", next);
    }
  };

  // Filter evaluations for the current context
  const filteredEvaluations = useMemo(() => {
    if (role === "student") {
      const cleanName = (currentUserName || "").trim().toLowerCase();
      const cleanId = (currentUserId || "").trim().toLowerCase();
      return evaluations.filter((e) => {
        const evId = (e.studentId || "").trim().toLowerCase();
        const evName = (e.studentName || "").trim().toLowerCase();
        return (cleanId && evId === cleanId) || (cleanName && evName === cleanName);
      });
    } else if (role === "teacher") {
      // Teacher sees evaluations directed to their teacherCode
      const cleanTeacherCode = (teacherCode || "").trim();
      if (!cleanTeacherCode) return evaluations;
      return evaluations.filter(
        (e) => !e.teacherCode || e.teacherCode === cleanTeacherCode
      );
    }
    // Super admin sees all
    return evaluations;
  }, [role, currentUserName, currentUserId, teacherCode, evaluations]);

  // Unread badge counter
  const unreadCount = useMemo(() => {
    if (role === "student") {
      return filteredEvaluations.filter((e) => e.hasUnreadTeacherReply).length;
    } else {
      return filteredEvaluations.filter((e) => e.hasUnreadStudentReply).length;
    }
  }, [role, filteredEvaluations]);

  // Active evaluation being viewed
  const activeEval = useMemo(() => {
    if (filteredEvaluations.length === 0) return null;
    if (selectedEvalId) {
      const found = filteredEvaluations.find((e) => e.id === selectedEvalId);
      if (found) return found;
    }
    // Default to the one with unread or the first one
    const unread = filteredEvaluations.find((e) =>
      role === "student" ? e.hasUnreadTeacherReply : e.hasUnreadStudentReply
    );
    return unread || filteredEvaluations[0];
  }, [filteredEvaluations, selectedEvalId, role]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, activeEval?.messages]);

  // Clipboard paste handler
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
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
              setSelectedImage(loadEv.target.result as string);
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  // File upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file hình ảnh (PNG, JPG, JPEG, WEBP)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEv) => {
      if (loadEv.target?.result) {
        setSelectedImage(loadEv.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedImage) {
      alert("Vui lòng nhập nội dung hoặc đính kèm ảnh!");
      return;
    }
    setIsSubmitting(true);

    try {
      if (role === "student") {
        await createOrSendStudentQuestion({
          studentId: currentUserId || "",
          studentName: currentUserName,
          studentClass: studentClass || "12",
          teacherCode: teacherCode || "",
          teacherName: teacherName || "Giáo viên phụ trách",
          content: inputText.trim() || (selectedImage ? "Đã gửi một hình ảnh" : ""),
          imageUrl: selectedImage || undefined,
        });
      } else {
        // Teacher / Admin
        if (activeEval) {
          await sendTeacherReply(
            activeEval.id,
            inputText.trim() || (selectedImage ? "Đã gửi một hình ảnh" : ""),
            currentUserName,
            selectedImage || undefined
          );
        } else {
          alert("Vui lòng chọn học sinh cần trả lời!");
          setIsSubmitting(false);
          return;
        }
      }

      setInputText("");
      setSelectedImage(null);
      onRefreshEvaluations?.();
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
      alert("Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick preset chips
  const studentPresets = [
    "Cô ơi em chưa hiểu câu này, cô hướng dẫn giúp em với ạ!",
    "Em đã nộp bài rồi ạ, cô kiểm tra và góp ý giúp em nhé!",
    "Em cảm ơn cô nhiều ạ!",
  ];

  const teacherPresets = [
    "Em chú ý kiểm tra lại điều kiện xác định và áp dụng công thức nhé!",
    "Rất khen ngợi tinh thần tự giác của em! Lời giải rất chuẩn xác.",
    "Câu này em biến đổi cẩn thận dấu âm ở bước thứ 2 nhé.",
  ];

  const presets = role === "student" ? studentPresets : teacherPresets;

  const positionStyles: React.CSSProperties = {
    position: "fixed",
    bottom: "22px",
    zIndex: 9998,
    ...(position === "bottom-right" ? { right: "22px" } : { left: "22px" }),
  };

  return (
    <>
      <div style={positionStyles}>
        {/* LAUNCHER BUTTON */}
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 18px",
              borderRadius: "50px",
              background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)",
              color: "#ffffff",
              border: "2px solid rgba(255, 255, 255, 0.4)",
              boxShadow: "0 10px 25px -3px rgba(37, 99, 235, 0.45), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              fontSize: "13.5px",
              fontWeight: 800,
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span style={{ fontSize: "20px" }}>💬</span>
            <span>{role === "student" ? "Hỏi bài Giáo viên" : "Hỏi đáp 2 chiều"}</span>
            {unreadCount > 0 && (
              <span
                style={{
                  background: "#ef4444",
                  color: "#ffffff",
                  borderRadius: "20px",
                  padding: "2px 8px",
                  fontSize: "11px",
                  fontWeight: 900,
                  marginLeft: "2px",
                  boxShadow: "0 2px 6px rgba(239, 68, 68, 0.4)",
                  animation: "pulse 2s infinite",
                }}
              >
                🔔 {unreadCount}
              </span>
            )}
          </button>
        )}

        {/* CHAT WINDOW */}
        {isOpen && (
          <div
            style={{
              width: "380px",
              maxWidth: "calc(100vw - 36px)",
              height: "540px",
              maxHeight: "82vh",
              background: "#ffffff",
              borderRadius: "18px",
              boxShadow: "0 20px 40px -8px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.08)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "slideUp 0.25s ease-out",
            }}
          >
            {/* 1. HEADER */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
                color: "#ffffff",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  💬
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {role === "student" ? "HỎI BÀI GIÁO VIÊN" : "TRAO ĐỔI VỚI HỌC SINH"}
                  </div>
                  <div
                    style={{
                      fontSize: "11.5px",
                      color: "#bfdbfe",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {role === "student"
                      ? `GV: ${teacherName || "Phụ trách"} • Mã: ${teacherCode || "..."}`
                      : `GV: ${currentUserName} • Mã: ${teacherCode || "..."}`}
                  </div>
                </div>
              </div>

              {/* ACTION CONTROLS */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  onClick={togglePosition}
                  title={position === "bottom-right" ? "Chuyển sang góc trái" : "Chuyển sang góc phải"}
                  style={{
                    background: "rgba(255, 255, 255, 0.15)",
                    border: "none",
                    color: "#ffffff",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ↔ {position === "bottom-right" ? "Trái" : "Phải"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: "rgba(255, 255, 255, 0.15)",
                    border: "none",
                    color: "#ffffff",
                    borderRadius: "6px",
                    width: "28px",
                    height: "28px",
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 2. FOR TEACHER: STUDENT SELECTOR IF MULTIPLE */}
            {role !== "student" && filteredEvaluations.length > 0 && (
              <div
                style={{
                  background: "#f8fafc",
                  padding: "8px 12px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  overflowX: "auto",
                }}
              >
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, flexShrink: 0 }}>
                  Học sinh:
                </span>
                {filteredEvaluations.map((ev) => {
                  const isSelected = activeEval?.id === ev.id;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setSelectedEvalId(ev.id)}
                      style={{
                        background: isSelected ? "#2563eb" : "#ffffff",
                        color: isSelected ? "#ffffff" : "#334155",
                        border: isSelected ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
                        borderRadius: "14px",
                        padding: "3px 10px",
                        fontSize: "11.5px",
                        fontWeight: isSelected ? 800 : 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>{ev.studentName}</span>
                      {ev.hasUnreadStudentReply && (
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: isSelected ? "#ffffff" : "#ef4444",
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. MESSAGE FEED */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                background: "#f8fafc",
              }}
            >
              {!activeEval || activeEval.messages.length === 0 ? (
                <div
                  style={{
                    margin: "auto",
                    textAlign: "center",
                    padding: "20px",
                    color: "#64748b",
                  }}
                >
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>💬</div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#1e293b" }}>
                    Chưa có tin nhắn nào
                  </div>
                  <p style={{ fontSize: "12px", margin: "4px 0 0 0" }}>
                    {role === "student"
                      ? "Em có thể đặt câu hỏi hoặc dán ảnh bài tập (Ctrl+V) gửi tới giáo viên ngay bên dưới!"
                      : "Chưa có học sinh nào đặt câu hỏi."}
                  </p>
                </div>
              ) : (
                activeEval.messages.map((msg) => {
                  const isMe =
                    (role === "student" && msg.sender === "student") ||
                    (role !== "student" && msg.sender === "teacher");

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isMe ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "85%",
                          padding: "9px 12px",
                          borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                          background: isMe
                            ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                            : "#ffffff",
                          color: isMe ? "#ffffff" : "#1e293b",
                          border: isMe ? "none" : "1px solid #e2e8f0",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            marginBottom: "3px",
                            color: isMe ? "#bfdbfe" : "#059669",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span>{msg.sender === "teacher" ? "👩‍🏫 " + msg.senderName : "👤 " + msg.senderName}</span>
                          {msg.isAiGenerated && (
                            <span
                              style={{
                                background: isMe ? "rgba(255,255,255,0.2)" : "#dbeafe",
                                color: isMe ? "#ffffff" : "#1e40af",
                                padding: "1px 4px",
                                borderRadius: "4px",
                                fontSize: "9px",
                              }}
                            >
                              AI
                            </span>
                          )}
                        </div>

                        {/* TEXT CONTENT */}
                        {msg.content && (
                          <div style={{ fontSize: "12.5px", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                            {msg.content}
                          </div>
                        )}

                        {/* ATTACHED IMAGE */}
                        {msg.imageUrl && (
                          <div style={{ marginTop: "6px" }}>
                            <img
                              src={msg.imageUrl}
                              alt="Hình ảnh đính kèm"
                              onClick={() => setPreviewZoomImage(msg.imageUrl || null)}
                              style={{
                                maxWidth: "100%",
                                maxHeight: "160px",
                                borderRadius: "8px",
                                border: isMe ? "1px solid rgba(255,255,255,0.3)" : "1px solid #cbd5e1",
                                cursor: "pointer",
                                objectFit: "contain",
                                background: "#000000",
                              }}
                            />
                            <div style={{ fontSize: "10px", color: isMe ? "#bfdbfe" : "#64748b", marginTop: "2px", textAlign: "right" }}>
                              🔍 Bấm vào để phóng to
                            </div>
                          </div>
                        )}

                        <div
                          style={{
                            fontSize: "10px",
                            color: isMe ? "#bfdbfe" : "#94a3b8",
                            textAlign: "right",
                            marginTop: "3px",
                          }}
                        >
                          {msg.formattedTime || ""}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 4. PRESET CHIPS */}
            <div
              style={{
                padding: "6px 12px",
                background: "#ffffff",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                gap: "6px",
                overflowX: "auto",
              }}
            >
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(p)}
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "3px 8px",
                    fontSize: "11px",
                    color: "#475569",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  💡 {p.length > 28 ? p.substring(0, 26) + "..." : p}
                </button>
              ))}
            </div>

            {/* 5. IMAGE PREVIEW ATTACHMENT */}
            {selectedImage && (
              <div
                style={{
                  padding: "6px 12px",
                  background: "#eff6ff",
                  borderTop: "1px solid #bfdbfe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <img
                    src={selectedImage}
                    alt="Preview"
                    style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "6px", border: "1px solid #93c5fd" }}
                  />
                  <div style={{ fontSize: "11.5px", color: "#1e40af", fontWeight: 700 }}>
                    🖼️ Đã đính kèm ảnh (Gửi kèm câu hỏi)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  style={{
                    background: "#fee2e2",
                    color: "#991b1b",
                    border: "none",
                    borderRadius: "50%",
                    width: "22px",
                    height: "22px",
                    cursor: "pointer",
                    fontWeight: 900,
                    fontSize: "11px",
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* 6. COMPOSER FOOTER */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: "8px 12px 10px 12px",
                background: "#ffffff",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <textarea
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={handlePaste}
                placeholder={
                  role === "student"
                    ? "Nhập câu hỏi... (Dán ảnh trực tiếp Ctrl+V)"
                    : "Nhập lời giải đáp... (Dán ảnh Ctrl+V)"
                }
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "12.5px",
                  borderRadius: "8px",
                  border: "1.5px solid #cbd5e1",
                  resize: "none",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Đính kèm ảnh từ máy hoặc dán ảnh (Ctrl+V)"
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "5px 9px",
                      fontSize: "12px",
                      color: "#334155",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontWeight: 700,
                    }}
                  >
                    <span>📷</span>
                    <span>Chọn ảnh</span>
                  </button>
                  <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                    Dán ảnh (Ctrl+V)
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    fontSize: "12.5px",
                    fontWeight: 800,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {isSubmitting ? "..." : "🚀 Gửi"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* LIGHTBOX MODAL ZOOM */}
      {previewZoomImage && (
        <div
          onClick={() => setPreviewZoomImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <img
              src={previewZoomImage}
              alt="Phóng to"
              style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: "10px", objectFit: "contain" }}
            />
            <button
              type="button"
              onClick={() => setPreviewZoomImage(null)}
              style={{
                position: "absolute",
                top: "-12px",
                right: "-12px",
                background: "#ffffff",
                color: "#0f172a",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                fontSize: "16px",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
