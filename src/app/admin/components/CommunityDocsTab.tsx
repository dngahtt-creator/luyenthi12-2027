"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  CommunityDocumentItem,
  saveNewCommunityDoc,
  updateCommunityDoc,
  deleteCommunityDoc,
  incrementCommunityDocDownload,
  toggleLikeCommunityDoc,
  resetDefaultCommunityDocs,
} from "@/lib/communityDocService";
import { uploadFileToCloudinary, getSavedCloudinaryConfig } from "@/lib/cloudinary";
import ManageCategoriesTab from "./ManageCategoriesTab";

interface CommunityDocsTabProps {
  communityDocsList: CommunityDocumentItem[];
  onRefresh: () => void;
  showToast: (msg: string) => void;
  cloudinaryCloudName?: string;
  cloudinaryPreset?: string;
}

const SUBJECT_OPTIONS = [
  { id: "all", name: "Tất cả các môn" },
  { id: "toan", name: "Toán học" },
  { id: "ly", name: "Vật lý" },
  { id: "hoa", name: "Hóa học" },
  { id: "sinh", name: "Sinh học" },
  { id: "anh", name: "Tiếng Anh" },
  { id: "van", name: "Ngữ văn" },
  { id: "tin", name: "Tin học" },
  { id: "su", name: "Lịch sử" },
  { id: "dia", name: "Địa lý" },
];

const GRADE_OPTIONS = [
  "Tất cả khối lớp",
  "Lớp 12",
  "Lớp 11",
  "Lớp 10",
  "Toàn cấp THPT",
];

const CATEGORY_OPTIONS = [
  "Chuyên đề trọng tâm",
  "Đề cương & Tóm tắt",
  "Sơ đồ tư duy & Công thức",
  "Đề thi thử chọn lọc",
  "Sách & Tài liệu tham khảo",
  "Sổ tay phương pháp",
];

const FORMAT_OPTIONS: ("PDF" | "DOCX" | "PPTX" | "ZIP" | "LINK")[] = [
  "PDF",
  "DOCX",
  "PPTX",
  "ZIP",
  "LINK",
];

export default function CommunityDocsTab({
  communityDocsList,
  onRefresh,
  showToast,
  cloudinaryCloudName,
  cloudinaryPreset,
}: CommunityDocsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"categories" | "docs">("categories");
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("Tất cả khối lớp");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Modal Create / Edit state
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<CommunityDocumentItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // File upload state for modal
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string>("");

  // Form inputs
  const [formTitle, setFormTitle] = useState<string>("");
  const [formSubject, setFormSubject] = useState<string>("toan");
  const [formSubjectName, setFormSubjectName] = useState<string>("Toán học");
  const [formGrade, setFormGrade] = useState<string>("Lớp 12");
  const [formCategory, setFormCategory] = useState<string>("Chuyên đề trọng tâm");
  const [formFormat, setFormFormat] = useState<"PDF" | "DOCX" | "PPTX" | "ZIP" | "LINK">("PDF");
  const [formFileUrl, setFormFileUrl] = useState<string>("");
  const [formFileName, setFormFileName] = useState<string>("");
  const [formFileSize, setFormFileSize] = useState<string>("3.5 MB");
  const [formAuthor, setFormAuthor] = useState<string>("Tổ Chuyên Môn Tuy Đức");
  const [formAuthorRole, setFormAuthorRole] = useState<"Giáo viên" | "Học sinh" | "Ban chuyên môn" | "Cộng tác viên">("Giáo viên");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formPreviewText, setFormPreviewText] = useState<string>("");
  const [formTagsString, setFormTagsString] = useState<string>("2026, Trọng tâm, Miễn phí");
  const [formIsVerified, setFormIsVerified] = useState<boolean>(true);
  const [formIsFeatured, setFormIsFeatured] = useState<boolean>(false);
  const [formStatus, setFormStatus] = useState<"APPROVED" | "PENDING" | "REJECTED">("APPROVED");

  // Modal Preview state
  const [previewingDoc, setPreviewingDoc] = useState<CommunityDocumentItem | null>(null);

  // Statistics
  const totalDocs = communityDocsList.length;
  const totalDownloads = communityDocsList.reduce((acc, d) => acc + (d.downloads || 0), 0);
  const totalLikes = communityDocsList.reduce((acc, d) => acc + (d.likes || 0), 0);
  const pendingCount = communityDocsList.filter((d) => d.status === "PENDING").length;

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return communityDocsList.filter((doc) => {
      const matchSearch =
        !searchTerm.trim() ||
        doc.title.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (doc.author && doc.author.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
        (doc.tags && doc.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase().trim())));

      const matchSubject = filterSubject === "all" || doc.subject === filterSubject;
      const matchGrade = filterGrade === "Tất cả khối lớp" || doc.grade === filterGrade;
      const matchCategory = filterCategory === "all" || doc.category === filterCategory;
      const matchStatus =
        filterStatus === "all"
          ? true
          : filterStatus === "featured"
          ? doc.isFeatured
          : doc.status === filterStatus;

      return matchSearch && matchSubject && matchGrade && matchCategory && matchStatus;
    });
  }, [communityDocsList, searchTerm, filterSubject, filterGrade, filterCategory, filterStatus]);

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormSubject("toan");
    setFormSubjectName("Toán học");
    setFormGrade("Lớp 12");
    setFormCategory("Chuyên đề trọng tâm");
    setFormFormat("PDF");
    setFormFileUrl("https://res.cloudinary.com/o100uxqf/image/upload/sample.jpg");
    setFormFileName("");
    setFormFileSize("3.5 MB");
    setFormAuthor("Tổ Chuyên Môn Tuy Đức");
    setFormAuthorRole("Giáo viên");
    setFormDescription("");
    setFormPreviewText("");
    setFormTagsString("2026, Trọng tâm, Chuẩn cấu trúc");
    setFormIsVerified(true);
    setFormIsFeatured(false);
    setFormStatus("APPROVED");
    setShowFormModal(true);
  };

  // Open Edit modal
  const handleOpenEdit = (doc: CommunityDocumentItem) => {
    setEditingItem(doc);
    setFormTitle(doc.title);
    setFormSubject(doc.subject);
    setFormSubjectName(doc.subjectName);
    setFormGrade(doc.grade);
    setFormCategory(doc.category);
    setFormFormat(doc.format);
    setFormFileUrl(doc.fileUrl || "");
    setFormFileName(doc.fileName || "");
    setFormFileSize(doc.fileSize || "3.5 MB");
    setFormAuthor(doc.author);
    setFormAuthorRole(doc.authorRole || "Giáo viên");
    setFormDescription(doc.description || "");
    setFormPreviewText(doc.previewText || "");
    setFormTagsString((doc.tags || []).join(", "));
    setFormIsVerified(doc.isVerified);
    setFormIsFeatured(doc.isFeatured);
    setFormStatus(doc.status);
    setShowFormModal(true);
  };

  // Handle Cloudinary upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadProgressMsg(`Đang tải lên tệp: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`);

    try {
      const { uploadPreset } = getSavedCloudinaryConfig();
      const res = await uploadFileToCloudinary(file, uploadPreset);

      if (res.success && res.data?.secure_url) {
        setFormFileUrl(res.data.secure_url);
        setFormFileName(file.name);
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + " MB";
        setFormFileSize(sizeMb);

        // Auto detect format from extension
        const ext = file.name.split(".").pop()?.toUpperCase();
        if (ext === "PDF") setFormFormat("PDF");
        else if (ext === "DOC" || ext === "DOCX") setFormFormat("DOCX");
        else if (ext === "PPT" || ext === "PPTX") setFormFormat("PPTX");
        else if (ext === "ZIP" || ext === "RAR") setFormFormat("ZIP");

        if (!formTitle) {
          // Gợi ý tên tài liệu từ tên file
          const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
          setFormTitle(cleanName);
        }

        showToast("🎉 Tải tệp lên thành công!");
      } else {
        const fallbackUrl = URL.createObjectURL(file);
        setFormFileUrl(fallbackUrl);
        setFormFileName(file.name);
        setFormFileSize((file.size / (1024 * 1024)).toFixed(1) + " MB");
        showToast("📁 Đã đính kèm tệp tài liệu thành công!");
      }
    } catch {
      const fallbackUrl = URL.createObjectURL(file);
      setFormFileUrl(fallbackUrl);
      setFormFileName(file.name);
      setFormFileSize((file.size / (1024 * 1024)).toFixed(1) + " MB");
      showToast("📁 Đã đính kèm tệp tài liệu thành công!");
    } finally {
      setUploadingFile(false);
      setUploadProgressMsg("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Save form submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert("Vui lòng nhập tiêu đề tài liệu!");
      return;
    }

    setSubmitting(true);
    const tags = formTagsString
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const docPayload = {
      title: formTitle.trim(),
      subject: formSubject,
      subjectName: formSubjectName,
      grade: formGrade,
      category: formCategory,
      format: formFormat,
      fileUrl: formFileUrl.trim() || "https://res.cloudinary.com/o100uxqf/image/upload/sample.jpg",
      fileName: formFileName.trim() || `${formTitle.replace(/\s+/g, "_")}.${formFormat.toLowerCase()}`,
      fileSize: formFileSize.trim() || "3.5 MB",
      author: formAuthor.trim() || "Tổ Chuyên Môn Tuy Đức",
      authorRole: formAuthorRole,
      downloads: editingItem ? editingItem.downloads : 0,
      likes: editingItem ? editingItem.likes : 0,
      views: editingItem ? editingItem.views : 0,
      description: formDescription.trim(),
      previewText: formPreviewText.trim(),
      tags: tags.length > 0 ? tags : ["2026", "Tài liệu mở"],
      isVerified: formIsVerified,
      isFeatured: formIsFeatured,
      status: formStatus,
    };

    try {
      if (editingItem) {
        await updateCommunityDoc(editingItem.id, docPayload);
        showToast(`✅ Đã cập nhật tài liệu "${formTitle}"!`);
      } else {
        await saveNewCommunityDoc(docPayload);
        showToast(`🎉 Đã thêm tài liệu cộng đồng mới: "${formTitle}"!`);
      }
      setShowFormModal(false);
      onRefresh();
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Lỗi khi lưu tài liệu: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick toggle approval status
  const handleToggleStatus = async (doc: CommunityDocumentItem) => {
    const nextStatus = doc.status === "APPROVED" ? "PENDING" : "APPROVED";
    await updateCommunityDoc(doc.id, { status: nextStatus });
    showToast(nextStatus === "APPROVED" ? `✅ Đã duyệt tài liệu: "${doc.title}"` : `⏳ Đã chuyển về chờ duyệt: "${doc.title}"`);
    onRefresh();
  };

  // Quick toggle featured
  const handleToggleFeatured = async (doc: CommunityDocumentItem) => {
    const nextFeatured = !doc.isFeatured;
    await updateCommunityDoc(doc.id, { isFeatured: nextFeatured });
    showToast(nextFeatured ? `⭐ Đã ghim nổi bật: "${doc.title}"` : `Đã bỏ ghim: "${doc.title}"`);
    onRefresh();
  };

  // Quick toggle verified
  const handleToggleVerified = async (doc: CommunityDocumentItem) => {
    const nextVerified = !doc.isVerified;
    await updateCommunityDoc(doc.id, { isVerified: nextVerified });
    showToast(nextVerified ? `🛡️ Đã cấp huy hiệu xác thực cho: "${doc.title}"` : `Đã gỡ huy hiệu: "${doc.title}"`);
    onRefresh();
  };

  // Delete document
  const handleDeleteDoc = async (doc: CommunityDocumentItem) => {
    if (confirm(`Bạn có chắc chắn muốn xóa tài liệu cộng đồng:\n"${doc.title}"?`)) {
      await deleteCommunityDoc(doc.id);
      showToast(`🗑️ Đã xóa tài liệu "${doc.title}"!`);
      onRefresh();
    }
  };

  // Reset default
  const handleResetDefaults = async () => {
    if (confirm("Khôi phục danh sách tài liệu cộng đồng mẫu chất lượng cao chuẩn GDPT 2026?")) {
      await resetDefaultCommunityDocs();
      showToast("🔄 Đã khôi phục kho tài liệu cộng đồng mẫu thành công!");
      onRefresh();
    }
  };

  // Download simulation
  const handleDownload = async (doc: CommunityDocumentItem) => {
    await incrementCommunityDocDownload(doc.id);
    const a = document.createElement("a");
    a.href = doc.fileUrl || "https://res.cloudinary.com/o100uxqf/image/upload/sample.jpg";
    a.target = "_blank";
    a.download = doc.fileName || `[TaiLieuCongDong]_${doc.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`📥 Đang tải xuống: "${doc.title}" (${doc.fileSize})`);
    onRefresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* =========================================================
          SUB-NAV TABS: QUẢN LÝ MỤC HỌC LIỆU VS KHO TÀI LIỆU CỘNG ĐỒNG
      ========================================================= */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "#ffffff",
          padding: "8px 12px",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab("categories")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            border: "none",
            background: activeSubTab === "categories" ? "#2563eb" : "#f1f5f9",
            color: activeSubTab === "categories" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
            boxShadow: activeSubTab === "categories" ? "0 4px 12px rgba(37,99,235,0.25)" : "none",
          }}
        >
          <span style={{ fontSize: "17px" }}>🗂️</span>
          <span>Khởi tạo, Đăng tải & Quản lý mục học liệu</span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11.5px",
              background: activeSubTab === "categories" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
              color: activeSubTab === "categories" ? "#ffffff" : "#64748b",
            }}
          >
            Trang chủ: Tài liệu / Video / Đề thi
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("docs")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            border: "none",
            background: activeSubTab === "docs" ? "#2563eb" : "#f1f5f9",
            color: activeSubTab === "docs" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
            boxShadow: activeSubTab === "docs" ? "0 4px 12px rgba(37,99,235,0.25)" : "none",
          }}
        >
          <span style={{ fontSize: "17px" }}>🌐</span>
          <span>Kho tài liệu cộng đồng</span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11.5px",
              background: activeSubTab === "docs" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
              color: activeSubTab === "docs" ? "#ffffff" : "#64748b",
            }}
          >
            {totalDocs} tài liệu
          </span>
        </button>
      </div>

      {activeSubTab === "categories" ? (
        <ManageCategoriesTab
          onShowToast={showToast}
          cloudinaryCloudName={cloudinaryCloudName}
          cloudinaryPreset={cloudinaryPreset}
        />
      ) : (
        <>
          {/* =========================================================
              HERO BANNER: TÀI LIỆU CỘNG ĐỒNG
      ========================================================= */}
      <div
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)",
          borderRadius: "18px",
          padding: "26px 30px",
          color: "#ffffff",
          boxShadow: "0 10px 25px -5px rgba(124, 58, 237, 0.35)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "18px",
        }}
      >
        <div style={{ maxWidth: "700px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span style={{ fontSize: "30px" }}>🌐</span>
            <h2 style={{ margin: 0, fontSize: "23px", fontWeight: 800, letterSpacing: "-0.01em" }}>
              Kho Tài Liệu Cộng Đồng & Học Liệu Mở
            </h2>
            <span
              style={{
                background: "rgba(255, 255, 255, 0.22)",
                border: "1px solid rgba(255, 255, 255, 0.35)",
                padding: "3px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              Cộng Đồng Ôn Thi 2026
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "14px", color: "#e0e7ff", lineHeight: 1.55 }}>
            Không gian lưu trữ, chia sẻ và kiểm duyệt các cẩm nang ôn thi 9+, sơ đồ tư duy, chuyên đề trọng tâm và đề thi thử chọn lọc đóng góp bởi thầy cô, học sinh xuất sắc và cộng đồng giáo dục.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleOpenAdd}
            style={{
              background: "#10b981",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              fontSize: "13.5px",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <span style={{ fontSize: "16px", fontWeight: 900 }}>+</span> Đăng Tải Tài Liệu Mới
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            style={{
              background: "rgba(255, 255, 255, 0.16)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.35)",
              borderRadius: "10px",
              padding: "10px 16px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backdropFilter: "blur(6px)",
            }}
          >
            <span>🔄</span> Nạp Mẫu Chuẩn
          </button>

          <Link
            href="/community-docs"
            target="_blank"
            style={{
              background: "#ffffff",
              color: "#4f46e5",
              textDecoration: "none",
              borderRadius: "10px",
              padding: "10px 16px",
              fontSize: "13px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.08)",
            }}
          >
            <span>👁️</span> Cổng Học Sinh
          </Link>
        </div>
      </div>

      {/* =========================================================
          STATISTICS CARDS (4 CHỈ SỐ QUẢN TRỊ)
      ========================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "16px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "18px 20px",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(79, 70, 229, 0.1)",
              color: "#4f46e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
            }}
          >
            📚
          </div>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#1e293b", lineHeight: 1.1 }}>
              {totalDocs}
            </div>
            <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "3px" }}>
              Tài liệu trong kho
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "18px 20px",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(16, 185, 129, 0.1)",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
            }}
          >
            📥
          </div>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#1e293b", lineHeight: 1.1 }}>
              {totalDownloads.toLocaleString()}
            </div>
            <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "3px" }}>
              Lượt tải về học tập
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "18px 20px",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
            }}
          >
            ❤️
          </div>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#1e293b", lineHeight: 1.1 }}>
              {totalLikes.toLocaleString()}
            </div>
            <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "3px" }}>
              Lượt yêu thích & đánh giá
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "18px 20px",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: pendingCount > 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(100, 116, 139, 0.1)",
              color: pendingCount > 0 ? "#f59e0b" : "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
            }}
          >
            {pendingCount > 0 ? "⏳" : "🛡️"}
          </div>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: pendingCount > 0 ? "#d97706" : "#1e293b", lineHeight: 1.1 }}>
              {pendingCount}
            </div>
            <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "3px" }}>
              {pendingCount > 0 ? "Đang chờ kiểm duyệt" : "Tất cả đã kiểm duyệt"}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          TOOLBAR: TÌM KIẾM & BỘ LỌC
      ========================================================= */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          padding: "16px 20px",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Search input */}
        <div style={{ position: "relative", minWidth: "280px", flex: "1 1 280px" }}>
          <input
            type="text"
            placeholder="🔍 Tìm kiếm tài liệu, tác giả, thẻ tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "9px",
              border: "1px solid #cbd5e1",
              fontSize: "13.5px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
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
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Môn học */}
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              background: "#f8fafc",
              color: "#1e293b",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {SUBJECT_OPTIONS.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>

          {/* Khối lớp */}
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              background: "#f8fafc",
              color: "#1e293b",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Trạng thái */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              background: "#f8fafc",
              color: "#1e293b",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="APPROVED">✅ Đã kiểm duyệt</option>
            <option value="PENDING">⏳ Chờ duyệt ({pendingCount})</option>
            <option value="featured">⭐ Ghim nổi bật</option>
          </select>
        </div>
      </div>

      {/* =========================================================
          DOCUMENTS LIST TABLE / CARDS
      ========================================================= */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f8fafc",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
            Hiển thị <strong>{filteredDocs.length}</strong> / {totalDocs} tài liệu
          </div>
          {filteredDocs.length > 0 && (
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              Nhấp vào biểu tượng để thao tác nhanh hoặc xem chi tiết
            </div>
          )}
        </div>

        {filteredDocs.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔍</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
              Không tìm thấy tài liệu phù hợp
            </div>
            <p style={{ margin: "6px 0 16px 0", fontSize: "13px" }}>
              Thử tìm kiếm với từ khóa khác hoặc điều chỉnh lại các bộ lọc môn học, khối lớp.
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterSubject("all");
                setFilterGrade("Tất cả khối lớp");
                setFilterStatus("all");
              }}
              style={{
                background: "#4f46e5",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                  <th style={{ padding: "12px 18px", fontWeight: 700 }}>Tài Liệu & Định Dạng</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Môn & Khối Lớp</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Người Đóng Góp</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Tương Tác</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Kiểm Duyệt</th>
                  <th style={{ padding: "12px 18px", fontWeight: 700, textAlign: "right" }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc, idx) => {
                  const isPdf = doc.format === "PDF";
                  const badgeColor = isPdf
                    ? "#ef4444"
                    : doc.format === "DOCX"
                    ? "#2563eb"
                    : doc.format === "PPTX"
                    ? "#ea580c"
                    : "#10b981";

                  return (
                    <tr
                      key={doc.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Document info */}
                      <td style={{ padding: "14px 18px", maxWidth: "340px" }}>
                        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                          <span
                            style={{
                              background: `${badgeColor}15`,
                              color: badgeColor,
                              fontWeight: 800,
                              fontSize: "11px",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: `1px solid ${badgeColor}30`,
                              display: "inline-block",
                              marginTop: "2px",
                            }}
                          >
                            {doc.format}
                          </span>
                          <div>
                            <div
                              onClick={() => setPreviewingDoc(doc)}
                              style={{
                                fontWeight: 700,
                                color: "#1e293b",
                                cursor: "pointer",
                                fontSize: "14px",
                                lineHeight: 1.35,
                                marginBottom: "4px",
                              }}
                              title="Bấm để xem trước tài liệu"
                            >
                              {doc.title}
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                              {doc.category} • {doc.fileSize}
                            </div>
                            {/* Tags */}
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                              {doc.isFeatured && (
                                <span
                                  style={{
                                    background: "#fef3c7",
                                    color: "#d97706",
                                    fontSize: "10.5px",
                                    fontWeight: 700,
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  ⭐ Nổi bật
                                </span>
                              )}
                              {doc.tags?.slice(0, 3).map((tag, tIdx) => (
                                <span
                                  key={tIdx}
                                  style={{
                                    background: "#f1f5f9",
                                    color: "#475569",
                                    fontSize: "10.5px",
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Subject & Grade */}
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ fontWeight: 700, color: "#1e293b" }}>{doc.subjectName}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{doc.grade}</div>
                      </td>

                      {/* Author */}
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <span style={{ fontWeight: 600, color: "#1e293b" }}>{doc.author}</span>
                          {doc.isVerified && (
                            <span
                              title="Tài liệu đã được xác thực bởi Ban chuyên môn"
                              style={{ color: "#2563eb", fontSize: "13px" }}
                            >
                              ✓
                            </span>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                            background: "#f1f5f9",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            display: "inline-block",
                            marginTop: "2px",
                          }}
                        >
                          {doc.authorRole}
                        </span>
                      </td>

                      {/* Stats */}
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "12px" }}>
                          <span style={{ color: "#10b981", fontWeight: 600 }}>
                            📥 {doc.downloads?.toLocaleString() || 0} tải
                          </span>
                          <span style={{ color: "#ef4444" }}>
                            ❤️ {doc.likes?.toLocaleString() || 0} tim
                          </span>
                        </div>
                      </td>

                      {/* Verification / Approval status */}
                      <td style={{ padding: "14px 14px" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(doc)}
                          style={{
                            background: doc.status === "APPROVED" ? "#ecfdf5" : "#fffbeb",
                            color: doc.status === "APPROVED" ? "#059669" : "#d97706",
                            border: `1px solid ${doc.status === "APPROVED" ? "#a7f3d0" : "#fde68a"}`,
                            borderRadius: "20px",
                            padding: "4px 10px",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title="Bấm để chuyển đổi trạng thái Duyệt / Chờ duyệt"
                        >
                          {doc.status === "APPROVED" ? "✅ Đã duyệt" : "⏳ Chờ duyệt"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          {/* Preview button */}
                          <button
                            type="button"
                            onClick={() => setPreviewingDoc(doc)}
                            style={{
                              background: "#f1f5f9",
                              border: "none",
                              borderRadius: "6px",
                              padding: "6px 9px",
                              fontSize: "13px",
                              cursor: "pointer",
                              color: "#334155",
                            }}
                            title="Xem trước nội dung"
                          >
                            👁️
                          </button>

                          {/* Download button */}
                          <button
                            type="button"
                            onClick={() => handleDownload(doc)}
                            style={{
                              background: "#f0fdf4",
                              border: "1px solid #bbf7d0",
                              borderRadius: "6px",
                              padding: "6px 9px",
                              fontSize: "13px",
                              cursor: "pointer",
                              color: "#16a34a",
                            }}
                            title="Tải tệp xuống"
                          >
                            📥
                          </button>

                          {/* Toggle featured */}
                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(doc)}
                            style={{
                              background: doc.isFeatured ? "#fef3c7" : "#f1f5f9",
                              border: "none",
                              borderRadius: "6px",
                              padding: "6px 9px",
                              fontSize: "13px",
                              cursor: "pointer",
                              color: doc.isFeatured ? "#d97706" : "#64748b",
                            }}
                            title={doc.isFeatured ? "Bỏ ghim nổi bật" : "Ghim nổi bật lên đầu"}
                          >
                            ⭐
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(doc)}
                            style={{
                              background: "#e0e7ff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "6px 9px",
                              fontSize: "13px",
                              cursor: "pointer",
                              color: "#4338ca",
                            }}
                            title="Chỉnh sửa thông tin tài liệu"
                          >
                            ✏️
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(doc)}
                            style={{
                              background: "#fee2e2",
                              border: "none",
                              borderRadius: "6px",
                              padding: "6px 9px",
                              fontSize: "13px",
                              cursor: "pointer",
                              color: "#dc2626",
                            }}
                            title="Xóa tài liệu khỏi hệ thống"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {/* =========================================================
          MODAL: THÊM / CHỈNH SỬA TÀI LIỆU CỘNG ĐỒNG
      ========================================================= */}
      {showFormModal && (
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
            if (e.target === e.currentTarget) setShowFormModal(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "740px",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 26px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "linear-gradient(90deg, #f8fafc 0%, #ffffff 100%)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>{editingItem ? "✏️" : "➕"}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#1e293b" }}>
                    {editingItem ? "Chỉnh Sửa Tài Liệu Cộng Đồng" : "Đăng Tải Tài Liệu Cộng Đồng Mới"}
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "#64748b" }}>
                    Tài liệu sẽ xuất hiện tại Kho Tài Liệu Cộng Đồng và Cổng Học Sinh
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFormModal(false)}
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

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Tiêu đề */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Tiêu đề tài liệu <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Tổng hợp 100 Câu Vận Dụng Cao Hàm Số 12 Ôn Thi 2026..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Môn học, Khối lớp, Chuyên mục */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Môn học
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => {
                      setFormSubject(e.target.value);
                      const opt = SUBJECT_OPTIONS.find((s) => s.id === e.target.value);
                      if (opt) setFormSubjectName(opt.name);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13.5px",
                      background: "#ffffff",
                    }}
                  >
                    {SUBJECT_OPTIONS.filter((s) => s.id !== "all").map((s) => (
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
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13.5px",
                      background: "#ffffff",
                    }}
                  >
                    {GRADE_OPTIONS.filter((g) => g !== "Tất cả khối lớp").map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Chuyên mục học liệu
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13.5px",
                      background: "#ffffff",
                    }}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tải tệp Cloudinary hoặc Link */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    Tệp tài liệu đính kèm (PDF, Word, Slide PowerPoint)
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.zip"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    disabled={uploadingFile}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: "#4f46e5",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 14px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>☁️</span> {uploadingFile ? "Đang tải lên Cloudinary..." : "Tải tệp lên Cloudinary"}
                  </button>
                </div>

                {uploadProgressMsg && (
                  <div style={{ fontSize: "12.5px", color: "#4f46e5", fontWeight: 600 }}>
                    ⏳ {uploadProgressMsg}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 100px", gap: "10px" }}>
                  <input
                    type="text"
                    placeholder="URL tài liệu (Cloudinary / Drive link)"
                    value={formFileUrl}
                    onChange={(e) => setFormFileUrl(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                    }}
                  />
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value as any)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                      background: "#ffffff",
                    }}
                  >
                    {FORMAT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        Định dạng: {f}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Dung lượng (VD: 4.2 MB)"
                    value={formFileSize}
                    onChange={(e) => setFormFileSize(e.target.value)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                    }}
                  />
                </div>
              </div>

              {/* Tác giả & Vai trò */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Tác giả / Người đóng góp
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Thầy Nguyễn Văn A, CLB Học Sinh Giỏi..."
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
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

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Vai trò người đóng góp
                  </label>
                  <select
                    value={formAuthorRole}
                    onChange={(e) => setFormAuthorRole(e.target.value as any)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13.5px",
                      background: "#ffffff",
                    }}
                  >
                    <option value="Giáo viên">Giáo viên</option>
                    <option value="Học sinh">Học sinh</option>
                    <option value="Ban chuyên môn">Ban chuyên môn</option>
                    <option value="Cộng tác viên">Cộng tác viên</option>
                  </select>
                </div>
              </div>

              {/* Mô tả & Trích đoạn tóm tắt */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Mô tả tổng quan tài liệu
                </label>
                <textarea
                  rows={2}
                  placeholder="Giới thiệu nội dung trọng tâm của tài liệu, cấu trúc bài tập, phương pháp giải..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Trích đoạn xem trước nội dung
                </label>
                <textarea
                  rows={2}
                  placeholder="Trích dẫn mục lục, công thức nổi bật hoặc bài toán mở đầu để học sinh đọc trước..."
                  value={formPreviewText}
                  onChange={(e) => setFormPreviewText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Tags */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Thẻ từ khóa (phân tách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder="VD: 2026, Điểm 9+, Công thức nhanh, Casio..."
                  value={formTagsString}
                  onChange={(e) => setFormTagsString(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Cài đặt kiểm duyệt & Nổi bật */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  display: "flex",
                  gap: "24px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formIsVerified}
                    onChange={(e) => setFormIsVerified(e.target.checked)}
                  />
                  <span>🛡️ Cấp huy hiệu Đã kiểm duyệt</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                  />
                  <span>⭐ Ghim lên mục Nổi bật</span>
                </label>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>Trạng thái:</span>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                      fontWeight: 700,
                    }}
                  >
                    <option value="APPROVED">✅ Duyệt phát hành ngay</option>
                    <option value="PENDING">⏳ Chờ duyệt</option>
                    <option value="REJECTED">❌ Từ chối</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  style={{
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 18px",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: "#4f46e5",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 22px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(79, 70, 229, 0.3)",
                  }}
                >
                  {submitting ? "Đang lưu..." : editingItem ? "Lưu Thay Đổi" : "Đăng Tài Liệu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: XEM TRƯỚC TÀI LIỆU CỘNG ĐỒNG (PREVIEW MODAL)
      ========================================================= */}
      {previewingDoc && (
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
            if (e.target === e.currentTarget) setPreviewingDoc(null);
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
                    📄 {previewingDoc.format} • {previewingDoc.fileSize}
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
                    {previewingDoc.subjectName}
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
                    {previewingDoc.grade}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 800, color: "#1e293b", lineHeight: 1.35 }}>
                  {previewingDoc.title}
                </h3>
                <div style={{ marginTop: "6px", fontSize: "12.5px", color: "#64748b" }}>
                  Tác giả: <strong>{previewingDoc.author}</strong> ({previewingDoc.authorRole}) • 📥 {previewingDoc.downloads} lượt tải • ❤️ {previewingDoc.likes} tim
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewingDoc(null)}
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
              {/* Description box */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: "6px" }}>
                  Mô tả tài liệu
                </div>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#334155", lineHeight: 1.6 }}>
                  {previewingDoc.description || "Tài liệu học tập được chia sẻ công khai cho học sinh và giáo viên."}
                </p>
              </div>

              {/* Preview excerpt */}
              {previewingDoc.previewText && (
                <div
                  style={{
                    background: "#eff6ff",
                    borderRadius: "12px",
                    padding: "16px 18px",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", marginBottom: "6px" }}>
                    📖 Trích đoạn nội dung
                  </div>
                  <p style={{ margin: 0, fontSize: "13.5px", color: "#1e3a8a", lineHeight: 1.6, fontStyle: "italic" }}>
                    "{previewingDoc.previewText}"
                  </p>
                </div>
              )}

              {/* PDF Preview Frame if available */}
              {previewingDoc.fileUrl && previewingDoc.fileUrl.startsWith("http") && !previewingDoc.fileUrl.includes("sample.jpg") && (
                <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                  <iframe
                    src={previewingDoc.fileUrl}
                    style={{ width: "100%", height: "350px", border: "none" }}
                    title={previewingDoc.title}
                  />
                </div>
              )}

              {/* Tags */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Thẻ:</span>
                {previewingDoc.tags?.map((t, idx) => (
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
                onClick={async () => {
                  const newLikes = await toggleLikeCommunityDoc(previewingDoc.id);
                  setPreviewingDoc({ ...previewingDoc, likes: newLikes });
                  onRefresh();
                  showToast("❤️ Đã thả tim tài liệu!");
                }}
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
                <span>❤️</span> Thả tim ({previewingDoc.likes})
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setPreviewingDoc(null)}
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
                  onClick={() => handleDownload(previewingDoc)}
                  style={{
                    background: "#10b981",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "9px 20px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                  }}
                >
                  <span>📥</span> Tải Về Máy ({previewingDoc.fileSize})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
