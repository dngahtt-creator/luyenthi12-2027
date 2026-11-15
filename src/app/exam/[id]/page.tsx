"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function StudentExamRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.id as string;

  useEffect(() => {
    if (examId) {
      router.replace(`/mock-exams/${encodeURIComponent(examId)}`);
    }
  }, [examId, router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "36px", marginBottom: "12px" }}>🚀</div>
        <div style={{ fontSize: "16px", fontWeight: 800, color: "#1e3a8a" }}>Đang chuyển hướng tới phòng thi...</div>
      </div>
    </div>
  );
}
