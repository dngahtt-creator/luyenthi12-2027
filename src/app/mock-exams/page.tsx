"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAllExams, ExamItem } from "@/lib/examService";

export default function MockExamsIndexPage() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchExams() {
      try {
        const list = await getAllExams();
        setExams(list.filter((e) => e.status !== "CLOSED"));
      } catch (err) {
        console.error("Lỗi tải danh sách đề thi:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchExams();
  }, []);

  const filteredExams = exams.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      (e.subjectName && e.subjectName.toLowerCase().includes(q)) ||
      (e.school && e.school.toLowerCase().includes(q))
    );
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
        padding: "32px 16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: "880px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255,255,255,0.12)",
              color: "#bfdbfe",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 700,
              marginBottom: "12px",
            }}
          >
            <span>🚀</span> CỔNG THI TRỰC TUYẾN 2026
          </div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 900,
              color: "#ffffff",
              margin: "0 0 10px 0",
              letterSpacing: "-0.5px",
            }}
          >
            Danh Sách Đề Thi Tuyển Chọn
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "#cbd5e1",
              margin: 0,
              maxWidth: "520px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Chọn bất kỳ đề thi nào dưới đây để bắt đầu làm bài trực tuyến ngay lập tức.
          </p>
        </div>

        {/* Search & Actions Bar */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
            <input
              type="text"
              placeholder="🔍 Tìm kiếm đề thi theo tên hoặc môn học..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.95)",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <Link
            href="/"
            style={{
              padding: "12px 18px",
              background: "rgba(255,255,255,0.15)",
              color: "#ffffff",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 700,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.25)",
              whiteSpace: "nowrap",
            }}
          >
            ← Về Trang chủ
          </Link>
        </div>

        {/* Exam Cards List */}
        {loading ? (
          <div
            style={{
              background: "#ffffff",
              padding: "48px",
              borderRadius: "16px",
              textAlign: "center",
              color: "#64748b",
              fontWeight: 700,
            }}
          >
            ⏳ Đang tải danh sách đề thi...
          </div>
        ) : filteredExams.length === 0 ? (
          <div
            style={{
              background: "#ffffff",
              padding: "48px",
              borderRadius: "16px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "10px" }}>📭</div>
            <h3 style={{ margin: "0 0 6px 0", color: "#0f172a" }}>Không tìm thấy đề thi phù hợp</h3>
            <p style={{ margin: 0, fontSize: "14px" }}>Vui lòng thử tìm kiếm bằng từ khóa khác.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  padding: "18px 22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span
                      style={{
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        padding: "2px 8px",
                        borderRadius: "5px",
                        fontSize: "11px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                      }}
                    >
                      {exam.subjectName || "Môn thi"}
                    </span>
                    {exam.tag && (
                      <span
                        style={{
                          background: "#fef2f2",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                          padding: "2px 8px",
                          borderRadius: "5px",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        {exam.tag}
                      </span>
                    )}
                  </div>
                  <h3
                    style={{
                      margin: "0 0 6px 0",
                      fontSize: "16px",
                      fontWeight: 800,
                      color: "#0f172a",
                      lineHeight: "1.4",
                    }}
                  >
                    {exam.title}
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      fontSize: "12.5px",
                      color: "#64748b",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>⏱️ {exam.timeMinutes} phút</span>
                    <span>📝 {exam.questions} câu hỏi</span>
                    <span>📊 {exam.difficulty}</span>
                    <span>🏫 {exam.school}</span>
                  </div>
                </div>

                <div>
                  <Link
                    href={`/mock-exams/${encodeURIComponent(exam.id)}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "11px 22px",
                      background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                      color: "#ffffff",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontWeight: 800,
                      textDecoration: "none",
                      boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span>Vào Thi Ngay</span> 🚀
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
