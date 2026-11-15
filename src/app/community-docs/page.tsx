"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  CommunityDocumentItem,
  getAllCommunityDocs,
  saveNewCommunityDoc,
  incrementCommunityDocDownload,
  toggleLikeCommunityDoc,
} from "@/lib/communityDocService";
import { uploadFileToCloudinary, getSavedCloudinaryConfig } from "@/lib/cloudinary";

const SUBJECT_LIST = [
  { id: "all", name: "Tất cả", icon: "🌐" },
  { id: "toan", name: "Toán học", icon: "📐" },
  { id: "ly", name: "Vật lý", icon: "⚡" },
  { id: "hoa", name: "Hóa học", icon: "🧪" },
  { id: "sinh", name: "Sinh học", icon: "🧬" },
  { id: "anh", name: "Tiếng Anh", icon: "🇬🇧" },
  { id: "van", name: "Ngữ văn", icon: "📚" },
  { id: "tin", name: "Tin học", icon: "💻" },
  { id: "su", name: "Lịch sử", icon: "🏛️" },
  { id: "dia", name: "Địa lý", icon: "🌍" },
];

const GRADE_LIST = ["Tất cả khối", "Lớp 12", "Lớp 11", "Lớp 10", "Toàn cấp THPT"];

export default function CommunityDocsPage() {
  const [docsList, setDocsList] = useState<CommunityDocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("Tất cả khối");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"downloads" | "likes" | "newest">("downloads");

  // Preview Modal
  const [viewingDoc, setViewingDoc] = useState<CommunityDocumentItem | null>(null);

  // Contribute / Upload Modal
  const [showContributeModal, setShowContributeModal] = useState<boolean>(false);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [contribTitle, setContribTitle] = useState<string>("");
  const [contribSubject, setContribSubject] = useState<string>("toan");
  const [contribGrade, setContribGrade] = useState<string>("Lớp 12");
  const [contribCategory, setContribCategory] = useState<string>("Chuyên đề trọng tâm");
  const [contribFormat, setContribFormat] = useState<"PDF" | "DOCX" | "PPTX" | "ZIP" | "LINK">("PDF");
  const [contribFileUrl, setContribFileUrl] = useState<string>("");
  const [contribFileName, setContribFileName] = useState<string>("");
  const [contribFileSize, setContribFileSize] = useState<string>("3.5 MB");
  const [contribAuthor, setContribAuthor] = useState<string>("");
  const [contribRole, setContribRole] = useState<"Học sinh" | "Giáo viên" | "Cộng tác viên">("Học sinh");
  const [contribDesc, setContribDesc] = useState<string>("");
  const [contribTags, setContribTags] = useState<string>("2026, Ôn thi, Tuy Đức");
  const [contribSubmitting, setContribSubmitting] = useState<boolean>(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const items = await getAllCommunityDocs();
      setDocsList(items);
    } catch (e) {
      console.error("Load docs error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    window.addEventListener("school_community_docs_updated", handleSync);
    window.addEventListener("school_data_updated", handleSync);
    return () => {
      window.removeEventListener("school_community_docs_updated", handleSync);
      window.removeEventListener("school_data_updated", handleSync);
    };
  }, []);

  // Filtered & Sorted documents (Only show APPROVED for public view, unless featured)
  const filteredDocs = useMemo(() => {
    let result = docsList.filter((d) => d.status === "APPROVED");

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.author && d.author.toLowerCase().includes(q)) ||
          (d.description && d.description.toLowerCase().includes(q)) ||
          (d.tags && d.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    if (selectedSubject !== "all") {
      result = result.filter((d) => d.subject === selectedSubject);
    }

    if (selectedGrade !== "Tất cả khối") {
      result = result.filter((d) => d.grade === selectedGrade);
    }

    if (selectedCategory !== "all") {
      result = result.filter((d) => d.category === selectedCategory);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "downloads") return (b.downloads || 0) - (a.downloads || 0);
      if (sortBy === "likes") return (b.likes || 0) - (a.likes || 0);
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    return result;
  }, [docsList, searchQuery, selectedSubject, selectedGrade, selectedCategory, sortBy]);

  // Featured documents
  const featuredDocs = useMemo(() => {
    return docsList.filter((d) => d.isFeatured && d.status === "APPROVED");
  }, [docsList]);

  // Handle Download
  const handleDownload = async (doc: CommunityDocumentItem) => {
    await incrementCommunityDocDownload(doc.id);
    const a = document.createElement("a");
    a.href = doc.fileUrl || "https://res.cloudinary.com/o100uxqf/image/upload/sample.jpg";
    a.target = "_blank";
    a.download = doc.fileName || `[TaiLieuCongDong]_${doc.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`✅ Đang tải xuống: "${doc.title}"`);
    loadData();
  };

  // Handle Like
  const handleLike = async (e: React.MouseEvent, doc: CommunityDocumentItem) => {
    e.stopPropagation();
    const newLikes = await toggleLikeCommunityDoc(doc.id);
    setDocsList((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, likes: newLikes } : d))
    );
    if (viewingDoc && viewingDoc.id === doc.id) {
      setViewingDoc({ ...viewingDoc, likes: newLikes });
    }
    showToast(`❤️ Đã thả tim tài liệu "${doc.title}"!`);
  };

  // Upload file to Cloudinary in contribute form
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadProgress(`Đang tải tệp lên: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)...`);

    try {
      const { uploadPreset } = getSavedCloudinaryConfig();
      const res = await uploadFileToCloudinary(file, uploadPreset);

      if (res.success && res.data?.secure_url) {
        setContribFileUrl(res.data.secure_url);
        setContribFileName(file.name);
        setContribFileSize((file.size / 1024 / 1024).toFixed(1) + " MB");

        const ext = file.name.split(".").pop()?.toUpperCase();
        if (ext === "PDF") setContribFormat("PDF");
        else if (ext === "DOC" || ext === "DOCX") setContribFormat("DOCX");
        else if (ext === "PPT" || ext === "PPTX") setContribFormat("PPTX");
        else if (ext === "ZIP" || ext === "RAR") setContribFormat("ZIP");

        if (!contribTitle) {
          setContribTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
        }
        showToast("🎉 Tải tệp lên thành công!");
      } else {
        alert("Lỗi tải tệp: " + (res.error || "Vui lòng thử lại."));
      }
    } catch (err: any) {
      alert("Lỗi kết nối tải tệp: " + err.message);
    } finally {
      setUploadingFile(false);
      setUploadProgress("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Submit contribution
  const handleContribSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribTitle.trim()) {
      alert("Vui lòng nhập tên tài liệu!");
      return;
    }
    if (!contribAuthor.trim()) {
      alert("Vui lòng nhập họ tên của bạn!");
      return;
    }

    setContribSubmitting(true);
    const subObj = SUBJECT_LIST.find((s) => s.id === contribSubject);
    const tags = contribTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      await saveNewCommunityDoc({
        title: contribTitle.trim(),
        subject: contribSubject,
        subjectName: subObj?.name || "Toán học",
        grade: contribGrade,
        category: contribCategory,
        format: contribFormat,
        fileUrl: contribFileUrl || "https://res.cloudinary.com/o100uxqf/image/upload/sample.jpg",
        fileName: contribFileName || `${contribTitle.replace(/\s+/g, "_")}.${contribFormat.toLowerCase()}`,
        fileSize: contribFileSize || "3.5 MB",
        author: contribAuthor.trim(),
        authorRole: contribRole,
        downloads: 0,
        likes: 0,
        views: 0,
        description: contribDesc.trim() || "Tài liệu đóng góp bởi cộng đồng học sinh, giáo viên.",
        tags: tags.length > 0 ? tags : ["2026", "Học sinh chia sẻ"],
        isVerified: false,
        isFeatured: false,
        status: "APPROVED", // Auto-approved for lively community engagement
      });

      setShowContributeModal(false);
      setContribTitle("");
      setContribDesc("");
      setContribFileUrl("");
      showToast("🎉 Cảm ơn bạn! Tài liệu đã được chia sẻ lên Cộng đồng thành công!");
      loadData();
    } catch (err: any) {
      alert("Có lỗi khi chia sẻ tài liệu: " + err.message);
    } finally {
      setContribSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "inherit" }}>
      {/* Toast */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "28px",
            right: "28px",
            background: "#1e293b",
            color: "#ffffff",
            padding: "12px 22px",
            borderRadius: "12px",
            fontSize: "13.5px",
            fontWeight: 600,
            zIndex: 10000,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* =========================================================
          TOP NAVIGATION BAR
      ========================================================= */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href="/"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#1e293b",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: "20px",
                  boxShadow: "0 4px 10px rgba(79, 70, 229, 0.25)",
                }}
              >
                🌐
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#1e293b", letterSpacing: "-0.01em" }}>
                  Kho Tài Liệu Cộng Đồng
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 500 }}>
                  Trường THPT DTNT THCS & THPT Tuy Đức
                </div>
              </div>
            </Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href="/"
              style={{
                textDecoration: "none",
                color: "#475569",
                fontSize: "13.5px",
                fontWeight: 600,
                padding: "8px 14px",
                borderRadius: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "background 0.15s ease",
              }}
            >
              <span>🏠</span> Trang Chủ
            </Link>

            <button
              onClick={() => setShowContributeModal(true)}
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "8px 18px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.35)",
              }}
            >
              <span>📤</span> Đóng Góp Tài Liệu
            </button>

            <Link
              href="/admin/community-docs"
              style={{
                textDecoration: "none",
                background: "#f1f5f9",
                color: "#334155",
                borderRadius: "10px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>⚙️</span> Quản Trị
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================
          HERO BANNER
      ========================================================= */}
      <section
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e3a8a 100%)",
          color: "#ffffff",
          padding: "50px 24px 60px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.08,
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div style={{ maxWidth: "860px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <span
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              padding: "4px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              display: "inline-block",
              marginBottom: "16px",
            }}
          >
            🚀 Thư Viện Học Liệu Mở Tuy Đức 2026
          </span>
          <h1
            style={{
              fontSize: "36px",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              margin: "0 0 14px 0",
              lineHeight: 1.25,
            }}
          >
            Kho Tài Liệu Học Tập Cộng Đồng
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "#cbd5e1",
              margin: "0 0 28px 0",
              lineHeight: 1.6,
            }}
          >
            Hàng trăm tài liệu ôn thi THPT 2026, sơ đồ tư duy, tóm tắt lý thuyết, đề cương và phương pháp giải nhanh được biên soạn và chọn lọc bởi thầy cô và các bạn học sinh.
          </p>

          {/* Search Box inside Hero */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              padding: "8px 12px 8px 18px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              boxShadow: "0 20px 35px -10px rgba(0, 0, 0, 0.35)",
              maxWidth: "680px",
              margin: "0 auto",
            }}
          >
            <span style={{ fontSize: "18px", color: "#64748b" }}>🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu, sơ đồ tư duy, tên tác giả, chuyên đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "14.5px",
                width: "100%",
                color: "#1e293b",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            )}
            <button
              onClick={() => {}}
              style={{
                background: "#4f46e5",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "10px 22px",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Tìm Kiếm
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================
          MAIN CONTENT AREA
      ========================================================= */}
      <main style={{ maxWidth: "1280px", margin: "-24px auto 60px auto", padding: "0 24px", position: "relative", zIndex: 10 }}>
        {/* Subject Filter Pills */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "14px 18px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            border: "1px solid #e2e8f0",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          {SUBJECT_LIST.map((sub) => {
            const isActive = selectedSubject === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubject(sub.id)}
                style={{
                  background: isActive ? "#4f46e5" : "#f8fafc",
                  color: isActive ? "#ffffff" : "#475569",
                  border: `1px solid ${isActive ? "#4f46e5" : "#e2e8f0"}`,
                  borderRadius: "20px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{sub.icon}</span>
                <span>{sub.name}</span>
              </button>
            );
          })}
        </div>

        {/* Grade & Sort Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          {/* Grade filter */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {GRADE_LIST.map((g) => {
              const isActive = selectedGrade === g;
              return (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  style={{
                    background: isActive ? "#1e293b" : "#ffffff",
                    color: isActive ? "#ffffff" : "#475569",
                    border: `1px solid ${isActive ? "#1e293b" : "#cbd5e1"}`,
                    borderRadius: "8px",
                    padding: "6px 14px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>

          {/* Sort By */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                background: "#ffffff",
                fontWeight: 600,
                color: "#1e293b",
                cursor: "pointer",
              }}
            >
              <option value="downloads">📥 Nhiều lượt tải nhất</option>
              <option value="likes">❤️ Được yêu thích nhất</option>
              <option value="newest">🕒 Mới nhất</option>
            </select>
          </div>
        </div>

        {/* Featured Banner (if any) */}
        {featuredDocs.length > 0 && selectedSubject === "all" && !searchQuery && (
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <span style={{ fontSize: "20px" }}>⭐</span>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#1e293b" }}>
                Tài Liệu Nổi Bật Được Chọn Lọc
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "18px",
              }}
            >
              {featuredDocs.slice(0, 3).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setViewingDoc(doc)}
                  style={{
                    background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
                    border: "1.5px solid #86efac",
                    borderRadius: "16px",
                    padding: "20px",
                    boxShadow: "0 4px 14px rgba(34, 197, 94, 0.12)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span
                        style={{
                          background: "#dcfce7",
                          color: "#15803d",
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "3px 8px",
                          borderRadius: "6px",
                        }}
                      >
                        ⭐ TIÊU BIỂU • {doc.subjectName}
                      </span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>
                        {doc.format} • {doc.fileSize}
                      </span>
                    </div>

                    <h3 style={{ margin: "0 0 8px 0", fontSize: "15.5px", fontWeight: 800, color: "#1e293b", lineHeight: 1.4 }}>
                      {doc.title}
                    </h3>
                    <p style={{ margin: "0 0 14px 0", fontSize: "12.5px", color: "#475569", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {doc.description}
                    </p>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid #bbf7d0" }}>
                    <div style={{ fontSize: "12px", color: "#15803d", fontWeight: 600 }}>
                      ✍️ {doc.author}
                    </div>
                    <div style={{ display: "flex", gap: "10px", fontSize: "12px", color: "#475569" }}>
                      <span>📥 {doc.downloads}</span>
                      <span>❤️ {doc.likes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#1e293b" }}>
            Danh Sách Tài Liệu ({filteredDocs.length})
          </h2>
          {searchQuery && (
            <span style={{ fontSize: "13px", color: "#64748b" }}>
              Kết quả cho: <strong>"{searchQuery}"</strong>
            </span>
          )}
        </div>

        {/* Grid of Documents */}
        {loading ? (
          <div style={{ padding: "80px 20px", textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>⏳</div>
            <div style={{ fontSize: "15px", fontWeight: 600 }}>Đang tải kho tài liệu cộng đồng...</div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "60px 20px",
              textAlign: "center",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "14px" }}>📚</div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "17px", fontWeight: 800, color: "#1e293b" }}>
              Chưa có tài liệu nào phù hợp
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "13.5px", color: "#64748b" }}>
              Hãy thử chọn môn học khác hoặc đóng góp tài liệu đầu tiên cho chuyên đề này!
            </p>
            <button
              onClick={() => setShowContributeModal(true)}
              style={{
                background: "#4f46e5",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "10px 20px",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Đóng Góp Tài Liệu Ngay
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
              gap: "20px",
            }}
          >
            {filteredDocs.map((doc) => {
              const isPdf = doc.format === "PDF";
              const badgeColor = isPdf
                ? "#ef4444"
                : doc.format === "DOCX"
                ? "#2563eb"
                : doc.format === "PPTX"
                ? "#ea580c"
                : "#10b981";

              return (
                <div
                  key={doc.id}
                  onClick={() => setViewingDoc(doc)}
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    padding: "20px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 12px 24px -6px rgba(0, 0, 0, 0.08)";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.03)";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                >
                  <div>
                    {/* Header tags */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span
                        style={{
                          background: `${badgeColor}15`,
                          color: badgeColor,
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          border: `1px solid ${badgeColor}30`,
                        }}
                      >
                        {doc.format} • {doc.fileSize}
                      </span>

                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <span
                          style={{
                            background: "#f1f5f9",
                            color: "#475569",
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          {doc.subjectName}
                        </span>
                        <span
                          style={{
                            background: "#f1f5f9",
                            color: "#475569",
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          {doc.grade}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "15px",
                        fontWeight: 800,
                        color: "#1e293b",
                        lineHeight: 1.4,
                      }}
                    >
                      {doc.title}
                    </h3>

                    {/* Description */}
                    <p
                      style={{
                        margin: "0 0 14px 0",
                        fontSize: "12.5px",
                        color: "#64748b",
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {doc.description || "Tài liệu học tập chia sẻ chuẩn format 2026."}
                    </p>

                    {/* Tags */}
                    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "14px" }}>
                      {doc.tags?.slice(0, 3).map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          style={{
                            background: "#f8fafc",
                            color: "#64748b",
                            border: "1px solid #f1f5f9",
                            fontSize: "10.5px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div
                    style={{
                      paddingTop: "12px",
                      borderTop: "1px solid #f1f5f9",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
                          {doc.author}
                        </span>
                        {doc.isVerified && (
                          <span title="Đã kiểm duyệt bởi Ban chuyên môn" style={{ color: "#2563eb", fontSize: "12px" }}>
                            ✓
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {doc.authorRole} • 📥 {doc.downloads} tải
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      {/* Like button */}
                      <button
                        type="button"
                        onClick={(e) => handleLike(e, doc)}
                        style={{
                          background: "#fff1f2",
                          border: "none",
                          borderRadius: "8px",
                          padding: "6px 9px",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#e11d48",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                        title="Thả tim yêu thích"
                      >
                        ❤️ {doc.likes}
                      </button>

                      {/* Download button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(doc);
                        }}
                        style={{
                          background: "#10b981",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "6px 12px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        title="Tải tệp ngay"
                      >
                        <span>📥</span> Tải
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* =========================================================
          MODAL: XEM TRƯỚC TÀI LIỆU (PREVIEW MODAL)
      ========================================================= */}
      {viewingDoc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingDoc(null);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "22px 28px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span
                    style={{
                      background: "#ef444415",
                      color: "#ef4444",
                      fontWeight: 800,
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    📄 {viewingDoc.format} • {viewingDoc.fileSize}
                  </span>
                  <span
                    style={{
                      background: "#e0e7ff",
                      color: "#4338ca",
                      fontWeight: 700,
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {viewingDoc.subjectName}
                  </span>
                  <span
                    style={{
                      background: "#f1f5f9",
                      color: "#475569",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {viewingDoc.grade}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 800, color: "#1e293b", lineHeight: 1.35 }}>
                  {viewingDoc.title}
                </h3>
                <div style={{ marginTop: "6px", fontSize: "12.5px", color: "#64748b" }}>
                  Tác giả: <strong>{viewingDoc.author}</strong> ({viewingDoc.authorRole}) • 📥 {viewingDoc.downloads} lượt tải • ❤️ {viewingDoc.likes} tim
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "22px",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Content body */}
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "6px" }}>
                  Giới thiệu tài liệu
                </div>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#334155", lineHeight: 1.6 }}>
                  {viewingDoc.description}
                </p>
              </div>

              {viewingDoc.previewText && (
                <div
                  style={{
                    background: "#eff6ff",
                    borderRadius: "12px",
                    padding: "16px 18px",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", marginBottom: "6px" }}>
                    📖 Trích đoạn nổi bật
                  </div>
                  <p style={{ margin: 0, fontSize: "13.5px", color: "#1e3a8a", lineHeight: 1.6, fontStyle: "italic" }}>
                    "{viewingDoc.previewText}"
                  </p>
                </div>
              )}

              {/* Tags */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Thẻ chủ đề:</span>
                {viewingDoc.tags?.map((t, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "#f1f5f9",
                      color: "#475569",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "18px 28px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <button
                type="button"
                onClick={(e) => handleLike(e, viewingDoc)}
                style={{
                  background: "#fee2e2",
                  color: "#dc2626",
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 16px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>❤️</span> Thả tim ({viewingDoc.likes})
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  style={{
                    background: "#ffffff",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "9px 18px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Đóng
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload(viewingDoc)}
                  style={{
                    background: "#10b981",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "9px 22px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                  }}
                >
                  <span>📥</span> Tải Về Máy ({viewingDoc.fileSize})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: ĐÓNG GÓP TÀI LIỆU CỘNG ĐỒNG
      ========================================================= */}
      {showContributeModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowContributeModal(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "linear-gradient(90deg, #ecfdf5 0%, #ffffff 100%)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>📤</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17.5px", fontWeight: 800, color: "#065f46" }}>
                    Đóng Góp Tài Liệu Lên Cộng Đồng
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "#64748b" }}>
                    Cùng chung tay xây dựng kho học liệu mở chất lượng cao cho trường Tuy Đức
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowContributeModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleContribSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Tiêu đề tài liệu <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Tổng hợp công thức Toán 12 thi tốt nghiệp 2026..."
                  value={contribTitle}
                  onChange={(e) => setContribTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Môn học
                  </label>
                  <select
                    value={contribSubject}
                    onChange={(e) => setContribSubject(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "#ffffff",
                    }}
                  >
                    {SUBJECT_LIST.filter((s) => s.id !== "all").map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Khối lớp
                  </label>
                  <select
                    value={contribGrade}
                    onChange={(e) => setContribGrade(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "#ffffff",
                    }}
                  >
                    <option value="Lớp 12">Lớp 12</option>
                    <option value="Lớp 11">Lớp 11</option>
                    <option value="Lớp 10">Lớp 10</option>
                    <option value="Toàn cấp THPT">Toàn cấp THPT</option>
                  </select>
                </div>
              </div>

              {/* Upload file Cloudinary */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "10px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#334155" }}>
                    Tệp đính kèm (PDF, Word, Slide...)
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.zip"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    disabled={uploadingFile}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: "#10b981",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {uploadingFile ? "Đang tải lên..." : "Tải tệp từ máy tính"}
                  </button>
                </div>

                {uploadProgress && (
                  <div style={{ fontSize: "12px", color: "#10b981", fontWeight: 600 }}>
                    ⏳ {uploadProgress}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Hoặc dán URL liên kết tài liệu (Google Drive / Cloudinary)"
                  value={contribFileUrl}
                  onChange={(e) => setContribFileUrl(e.target.value)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12.5px",
                  }}
                />
              </div>

              {/* Author */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Họ và tên của bạn <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Văn Nam - Lớp 12A1"
                    value={contribAuthor}
                    onChange={(e) => setContribAuthor(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Bạn là
                  </label>
                  <select
                    value={contribRole}
                    onChange={(e) => setContribRole(e.target.value as any)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "#ffffff",
                    }}
                  >
                    <option value="Học sinh">Học sinh</option>
                    <option value="Giáo viên">Giáo viên</option>
                    <option value="Cộng tác viên">Cộng tác viên</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Mô tả tóm tắt nội dung tài liệu
                </label>
                <textarea
                  rows={2}
                  placeholder="Tài liệu bao gồm những dạng bài nào, phương pháp gì nổi bật..."
                  value={contribDesc}
                  onChange={(e) => setContribDesc(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowContributeModal(false)}
                  style={{
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: "8px",
                    padding: "9px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={contribSubmitting}
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "9px 20px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                  }}
                >
                  {contribSubmitting ? "Đang gửi..." : "Chia Sẻ Lên Cộng Đồng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
