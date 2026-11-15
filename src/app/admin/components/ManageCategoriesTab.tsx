"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LearningCategory,
  LearningItem,
  SectionCategoryType,
  getAllLearningCategories,
  getAllLearningItems,
  saveNewLearningCategory,
  deleteLearningCategory,
  saveNewLearningItem,
  deleteLearningItem,
  downloadCourseExcelTemplate,
  parseCourseExcelFile,
  getYouTubeThumbnail,
} from "@/lib/learningCategoryService";
import { uploadImageToCloudinary, uploadFileToCloudinary } from "@/lib/cloudinary";

interface ManageCategoriesTabProps {
  onShowToast: (msg: string) => void;
  cloudinaryCloudName?: string;
  cloudinaryPreset?: string;
}

export default function ManageCategoriesTab({
  onShowToast,
  cloudinaryCloudName = "o100uxqf",
  cloudinaryPreset = "o100uxqf",
}: ManageCategoriesTabProps) {
  // Data state
  const [categories, setCategories] = useState<LearningCategory[]>([]);
  const [items, setItems] = useState<LearningItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Box 1: Khởi tạo mục form
  const [catName, setCatName] = useState<string>("");
  const [catDescription, setCatDescription] = useState<string>("");
  const [catType, setCatType] = useState<SectionCategoryType>("document");
  const [catThumbTab, setCatThumbTab] = useState<"link" | "upload">("link");
  const [catThumbUrl, setCatThumbUrl] = useState<string>("");
  const [catUploadingThumb, setCatUploadingThumb] = useState<boolean>(false);
  const [savingCategory, setSavingCategory] = useState<boolean>(false);

  // Box 2: Đăng tải mục form
  const [selectedCatIdForPost, setSelectedCatIdForPost] = useState<string>("");
  const [lessonNumber, setLessonNumber] = useState<string>("1");
  const [lessonTitle, setLessonTitle] = useState<string>("");
  const [postLinkTab, setPostLinkTab] = useState<"link" | "upload">("link");
  const [postContentUrl, setPostContentUrl] = useState<string>("");
  const [postUploadingFile, setPostUploadingFile] = useState<boolean>(false);
  const [publishingPost, setPublishingPost] = useState<boolean>(false);

  // Box 3: Quản lý mục
  const [manageSelectedCatId, setManageSelectedCatId] = useState<string>("");

  // Excel Modal State
  const [showGoogleLinkModal, setShowGoogleLinkModal] = useState<boolean>(false);
  const [excelImportLoading, setExcelImportLoading] = useState<boolean>(false);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const box2ExcelInputRef = useRef<HTMLInputElement>(null);
  const catFileInputRef = useRef<HTMLInputElement>(null);
  const postFileInputRef = useRef<HTMLInputElement>(null);

  // Load data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [cats, its] = await Promise.all([
        getAllLearningCategories(),
        getAllLearningItems(),
      ]);
      setCategories(cats);
      setItems(its);
      if (cats.length > 0 && !selectedCatIdForPost) {
        setSelectedCatIdForPost(cats[0].id);
      }
      if (cats.length > 0 && !manageSelectedCatId) {
        setManageSelectedCatId(cats[0].id);
      }
    } catch (err) {
      console.error("Load learning data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    window.addEventListener("school_learning_updated", loadAllData);
    return () => {
      window.removeEventListener("school_learning_updated", loadAllData);
    };
  }, []);

  // Upload thumbnail image to Cloudinary (Có cơ chế tự động dự phòng nếu tài khoản chưa cấu hình)
  const handleUploadThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCatUploadingThumb(true);
    try {
      const res = await uploadImageToCloudinary(file, cloudinaryPreset, cloudinaryCloudName);
      if (res.success && res.data && (res.data.secure_url || res.data.url)) {
        const url = res.data.secure_url || res.data.url || "";
        setCatThumbUrl(url);
        onShowToast("✅ Đã tải ảnh bìa lên thành công!");
      } else {
        // Dự phòng tự động đọc Base64 Data URL
        const reader = new FileReader();
        reader.onload = () => {
          setCatThumbUrl(reader.result as string);
          onShowToast("✅ Đã chọn ảnh bìa thành công!");
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn("Lỗi tải ảnh, chuyển sang dự phòng nội bộ:", err);
      const reader = new FileReader();
      reader.onload = () => {
        setCatThumbUrl(reader.result as string);
        onShowToast("✅ Đã chọn ảnh bìa thành công!");
      };
      reader.readAsDataURL(file);
    } finally {
      setCatUploadingThumb(false);
    }
  };

  // Upload file/document/video (Có cơ chế tự động dự phòng)
  const handleUploadPostFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostUploadingFile(true);
    try {
      const res = await uploadFileToCloudinary(file, cloudinaryPreset, cloudinaryCloudName);
      if (res.success && res.data && (res.data.secure_url || res.data.url)) {
        const url = res.data.secure_url || res.data.url || "";
        setPostContentUrl(url);
        onShowToast(`✅ Đã tải file "${file.name}" lên thành công!`);
      } else {
        const blobUrl = URL.createObjectURL(file);
        setPostContentUrl(blobUrl);
        onShowToast(`✅ Đã đính kèm file "${file.name}" thành công!`);
      }
    } catch (err) {
      console.warn("Lỗi tải file, chuyển sang dự phòng Blob:", err);
      const blobUrl = URL.createObjectURL(file);
      setPostContentUrl(blobUrl);
      onShowToast(`✅ Đã đính kèm file "${file.name}" thành công!`);
    } finally {
      setPostUploadingFile(false);
    }
  };

  // 1. TẠO MỚI MỤC (BOX 1)
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      alert("Vui lòng nhập Tên Mục!");
      return;
    }

    setSavingCategory(true);
    try {
      const res = await saveNewLearningCategory({
        name: catName.trim(),
        type: catType,
        description: catDescription.trim() || undefined,
        thumbnailUrl: catThumbUrl.trim() || undefined,
        author: "Nguồn internet",
        createdAt: new Date().toISOString().split("T")[0],
      });

      if (res.success) {
        onShowToast(`🎉 Đã khởi tạo mục "${catName.trim()}" thành công!`);
        setCatName("");
        setCatDescription("");
        setCatThumbUrl("");
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi tạo mục mới!");
    } finally {
      setSavingCategory(false);
    }
  };

  // 2. PHÁT HÀNH BÀI MỚI (BOX 2)
  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatIdForPost) {
      alert("Vui lòng chọn Mục để đăng tải bài giảng!");
      return;
    }
    if (!lessonTitle.trim()) {
      alert("Vui lòng nhập Tên Bài Giảng / Tên Mục con!");
      return;
    }

    const targetCat = categories.find((c) => c.id === selectedCatIdForPost);
    if (!targetCat) {
      alert("Mục đã chọn không tồn tại!");
      return;
    }

    setPublishingPost(true);
    try {
      let finalContentUrl = postContentUrl.trim();

      // Nếu mục là video và chưa có thumbnail riêng, tự động lấy thumbnail YouTube
      if (targetCat.type === "video" && finalContentUrl.includes("youtube") && !targetCat.thumbnailUrl) {
        const ytThumb = getYouTubeThumbnail(finalContentUrl);
        if (ytThumb) {
          targetCat.thumbnailUrl = ytThumb;
        }
      }

      const res = await saveNewLearningItem({
        categoryId: targetCat.id,
        categoryName: targetCat.name,
        type: targetCat.type,
        lessonNumber: lessonNumber || "1",
        title: lessonTitle.trim(),
        contentUrl: finalContentUrl || undefined,
        createdAt: new Date().toISOString().split("T")[0],
        isPublished: true,
      });

      if (res.success) {
        onShowToast(`🚀 Đã phát hành bài "${lessonTitle.trim()}" vào mục "${targetCat.name}"!`);
        setLessonTitle("");
        setPostContentUrl("");
        const nextNum = Number(lessonNumber) ? Number(lessonNumber) + 1 : 1;
        setLessonNumber(String(nextNum));
        setManageSelectedCatId(targetCat.id);
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi phát hành bài giảng!");
    } finally {
      setPublishingPost(false);
    }
  };

  // Upload Excel file
  const handleExcelFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    targetCategoryId?: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const catId = targetCategoryId || selectedCatIdForPost;
    const targetCat = categories.find((c) => c.id === catId);
    if (!targetCat) {
      alert("Vui lòng chọn Mục trước khi upload Excel!");
      return;
    }

    setExcelImportLoading(true);
    try {
      const res = await parseCourseExcelFile(file, targetCat.id, targetCat.name, targetCat.type);
      if (res.success) {
        onShowToast(`🎉 Đã nhập thành công ${res.count} bài học vào mục "${targetCat.name}" từ Excel!`);
        setManageSelectedCatId(targetCat.id);
        await loadAllData();
      } else {
        alert(res.error || "Không thể nhập dữ liệu từ file Excel!");
      }
    } catch (err: any) {
      alert("Lỗi khi đọc file Excel: " + err.message);
    } finally {
      setExcelImportLoading(false);
      if (e.target) e.target.value = "";
    }
  };

  // Xóa bài
  const handleDeleteItem = async (itemId: string, itemTitle: string) => {
    if (confirm(`Bạn có chắc muốn xóa bài:\n"${itemTitle}"?`)) {
      await deleteLearningItem(itemId);
      onShowToast(`🗑️ Đã xóa bài "${itemTitle}"`);
      await loadAllData();
    }
  };

  // Xóa mục
  const handleDeleteCategory = async (catId: string, catTitle: string) => {
    if (confirm(`⚠️ Bạn có chắc muốn xóa MỤC:\n"${catTitle}"?\nToàn bộ bài giảng trong mục này cũng sẽ bị xóa!`)) {
      await deleteLearningCategory(catId);
      onShowToast(`🗑️ Đã xóa mục "${catTitle}"`);
      await loadAllData();
    }
  };

  const selectedManageCat = categories.find((c) => c.id === manageSelectedCatId);
  const manageItems = items.filter((i) => i.categoryId === manageSelectedCatId);

  return (
    <div style={{ animation: "fadeIn 0.25s ease-out" }}>


      {/* =========================================================
          ROW 2: BOX 1 & BOX 2 (2 CỘT SONG SONG CHUẨN HÌNH 1)
      ========================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {/* BOX 1: 1. KHỞI TẠO MỤC */}
        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid #e2e8f0",
            borderRadius: "16px",
            padding: "22px 24px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              borderBottom: "2px solid #2563eb",
              paddingBottom: "8px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 900,
                color: "#1e3a8a",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              1. KHỞI TẠO MỤC
            </h3>
          </div>

          <form onSubmit={handleCreateCategory}>
            {/* Tên Mục */}
            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Tên Mục:
              </label>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="VD: 11 - TOÁN HỌC, 11 - VẬT LÍ, Thiết kế Website bằng AI..."
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "13.5px",
                  outline: "none",
                }}
                required
              />
            </div>

            {/* Mô tả */}
            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Mô tả:
              </label>
              <textarea
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                placeholder="Mô tả tóm tắt nội dung mục học..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "13px",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Ảnh bìa (Thumbnail) */}
            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Ảnh bìa (Thumbnail):
              </label>

              {/* Tabs Link Ảnh / Tải Lên */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px",
                  background: "#f1f5f9",
                  padding: "4px",
                  borderRadius: "8px",
                  marginBottom: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setCatThumbTab("link")}
                  style={{
                    background: catThumbTab === "link" ? "#ffffff" : "transparent",
                    color: catThumbTab === "link" ? "#2563eb" : "#64748b",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: catThumbTab === "link" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  🔗 Link Ảnh
                </button>
                <button
                  type="button"
                  onClick={() => setCatThumbTab("upload")}
                  style={{
                    background: catThumbTab === "upload" ? "#ffffff" : "transparent",
                    color: catThumbTab === "upload" ? "#2563eb" : "#64748b",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: catThumbTab === "upload" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  ☁️ Tải Lên
                </button>
              </div>

              {catThumbTab === "link" ? (
                <input
                  type="text"
                  value={catThumbUrl}
                  onChange={(e) => setCatThumbUrl(e.target.value)}
                  placeholder="Dán link ảnh bìa (nếu có)..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    outline: "none",
                  }}
                />
              ) : (
                <div>
                  <input
                    ref={catFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadThumbnail}
                    style={{ fontSize: "12px" }}
                  />
                  {catUploadingThumb && (
                    <span style={{ fontSize: "12px", color: "#2563eb", marginLeft: "8px" }}>
                      ⏳ Đang tải ảnh lên...
                    </span>
                  )}
                </div>
              )}

              {/* Preview Thumbnail: NÚT XÓA VÀ CHỌN ẢNH KHÁC */}
              {catThumbUrl && (
                <div
                  style={{
                    marginTop: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img
                      src={catThumbUrl}
                      alt="Preview"
                      style={{
                        width: "52px",
                        height: "40px",
                        objectFit: "cover",
                        borderRadius: "6px",
                        border: "1.5px solid #cbd5e1",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
                      }}
                    />
                    <div>
                      <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 800, display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>✓</span> Đã chọn ảnh bìa
                      </span>
                      <span style={{ fontSize: "10.5px", color: "#64748b" }}>
                        Ảnh xuất hiện trên thẻ mục môn học
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {/* Nút Chọn ảnh khác */}
                    <button
                      type="button"
                      onClick={() => {
                        setCatThumbTab("upload");
                        setTimeout(() => {
                          catFileInputRef.current?.click();
                        }, 50);
                      }}
                      style={{
                        background: "#eff6ff",
                        color: "#2563eb",
                        border: "1px solid #bfdbfe",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        transition: "all 0.15s ease",
                      }}
                      title="Chọn tệp ảnh khác từ máy tính"
                    >
                      <span>🔄</span> Chọn ảnh khác
                    </button>

                    {/* Nút Xóa ảnh */}
                    <button
                      type="button"
                      onClick={() => {
                        setCatThumbUrl("");
                        if (catFileInputRef.current) catFileInputRef.current.value = "";
                        onShowToast("🗑️ Đã xóa ảnh bìa!");
                      }}
                      style={{
                        background: "#fef2f2",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        transition: "all 0.15s ease",
                      }}
                      title="Xóa ảnh bìa hiện tại"
                    >
                      <span>🗑️</span> Xóa
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Định dạng (Tài liệu đọc / Video / Đề thi) */}
            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Định dạng:
              </label>
              <select
                value={catType}
                onChange={(e) => setCatType(e.target.value as SectionCategoryType)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1.5px solid #2563eb",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  background: "#eff6ff",
                  color: "#1e3a8a",
                  outline: "none",
                }}
              >
                <option value="document">📄 TÀI LIỆU ĐỌC (PDF, DOCX, DRIVE)</option>
                <option value="video">🎬 VIDEO (YOUTUBE, MP4)</option>
                <option value="exam">📝 ĐỀ THI (TRẮC NGHIỆM, TỰ LUẬN)</option>
              </select>
            </div>

            {/* Nút Tạo Mới */}
            <button
              type="submit"
              disabled={savingCategory}
              style={{
                width: "100%",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "13.5px",
                fontWeight: 900,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
              }}
            >
              {savingCategory ? "Đang tạo..." : "TẠO MỚI"}
            </button>
          </form>
        </div>

        {/* BOX 2: 2. ĐĂNG TẢI MỤC */}
        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid #e2e8f0",
            borderRadius: "16px",
            padding: "22px 24px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              borderBottom: "2px solid #0284c7",
              paddingBottom: "8px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 900,
                color: "#0369a1",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              2. ĐĂNG TẢI MỤC
            </h3>
          </div>

          <form onSubmit={handlePublishPost}>
            {/* Chọn Mục + Nút Upload Excel */}
            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Chọn Mục:
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <select
                  value={selectedCatIdForPost}
                  onChange={(e) => setSelectedCatIdForPost(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    outline: "none",
                  }}
                  required
                >
                  <option value="">-- Chọn Mục (Tên Môn Học) --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type === "document" ? "Tài liệu" : c.type === "video" ? "Video" : "Đề thi"})
                    </option>
                  ))}
                </select>

                <label
                  style={{
                    background: "#ecfdf5",
                    border: "1.5px solid #10b981",
                    color: "#065f46",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    whiteSpace: "nowrap",
                  }}
                  title="Upload danh sách bài học bằng Excel vào mục này"
                >
                  <span>📊</span> UPLOAD EXCEL
                  <input
                    ref={box2ExcelInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    style={{ display: "none" }}
                    onChange={(e) => handleExcelFileUpload(e, selectedCatIdForPost)}
                  />
                </label>
              </div>
            </div>

            {/* Bài Số & Tên Bài Giảng */}
            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "10px", marginBottom: "14px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Bài Số:
                </label>
                <input
                  type="text"
                  value={lessonNumber}
                  onChange={(e) => setLessonNumber(e.target.value)}
                  placeholder="1"
                  style={{
                    width: "100%",
                    padding: "9px 10px",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    textAlign: "center",
                    fontWeight: 800,
                    outline: "none",
                  }}
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Tên Bài Giảng / Tên Mục:
                </label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Nhập tên bài học..."
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    outline: "none",
                  }}
                  required
                />
              </div>
            </div>

            {/* Link Nội Dung: Dán Link / Tải File (Hỗ trợ YouTube, Drive, PDF...) */}
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px",
                  background: "#f1f5f9",
                  padding: "4px",
                  borderRadius: "8px",
                  marginBottom: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setPostLinkTab("link")}
                  style={{
                    background: postLinkTab === "link" ? "#ffffff" : "transparent",
                    color: postLinkTab === "link" ? "#0284c7" : "#64748b",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: postLinkTab === "link" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  🔗 DÁN LINK
                </button>
                <button
                  type="button"
                  onClick={() => setPostLinkTab("upload")}
                  style={{
                    background: postLinkTab === "upload" ? "#ffffff" : "transparent",
                    color: postLinkTab === "upload" ? "#0284c7" : "#64748b",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: postLinkTab === "upload" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  ☁️ TẢI FILE
                </button>
              </div>

              {postLinkTab === "link" ? (
                <div>
                  <input
                    type="text"
                    value={postContentUrl}
                    onChange={(e) => setPostContentUrl(e.target.value)}
                    placeholder="Link Thư mục Drive, File Docs, YouTube, PDF, MP4..."
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "12.5px",
                      outline: "none",
                    }}
                  />
                  <p style={{ margin: "6px 0 0 0", fontSize: "11px", color: "#64748b" }}>
                    💡 Hỗ trợ dán trực tiếp link video YouTube (hệ thống sẽ tự động nhúng player và lấy thumbnail).
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    ref={postFileInputRef}
                    type="file"
                    onChange={handleUploadPostFile}
                    style={{ fontSize: "12px" }}
                  />
                  {postUploadingFile && (
                    <span style={{ fontSize: "12px", color: "#0284c7", marginLeft: "8px" }}>
                      ⏳ Đang tải file lên...
                    </span>
                  )}
                </div>
              )}

              {/* Preview Post Content URL: Nút Xóa và Chọn file khác */}
              {postContentUrl && (
                <div
                  style={{
                    marginTop: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "10px",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                    <span style={{ fontSize: "16px" }}>📎</span>
                    <div>
                      <div style={{ fontSize: "12px", color: "#166534", fontWeight: 800 }}>
                        ✓ Đã đính kèm tệp / đường dẫn nội dung
                      </div>
                      <div style={{ fontSize: "11px", color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "300px" }}>
                        {postContentUrl}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setPostLinkTab("upload");
                        setTimeout(() => {
                          postFileInputRef.current?.click();
                        }, 50);
                      }}
                      style={{
                        background: "#eff6ff",
                        color: "#2563eb",
                        border: "1px solid #bfdbfe",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>🔄</span> Chọn file khác
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPostContentUrl("");
                        if (postFileInputRef.current) postFileInputRef.current.value = "";
                        onShowToast("🗑️ Đã xóa tệp đính kèm!");
                      }}
                      style={{
                        background: "#fef2f2",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>🗑️</span> Xóa
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Nút PHÁT HÀNH */}
            <button
              type="submit"
              disabled={publishingPost}
              style={{
                width: "100%",
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "13.5px",
                fontWeight: 900,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
              }}
            >
              {publishingPost ? "Đang phát hành..." : "PHÁT HÀNH"}
            </button>
          </form>
        </div>
      </div>

      {/* =========================================================
          ROW 3: BOX 3 - QUẢN LÝ MỤC (CHUẨN HÌNH 1)
      ========================================================= */}
      <div
        style={{
          background: "#ffffff",
          border: "1.5px solid #e2e8f0",
          borderRadius: "16px",
          padding: "22px 24px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            borderBottom: "1.5px solid #f1f5f9",
            paddingBottom: "12px",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 900,
              color: "#dc2626",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            3. QUẢN LÝ MỤC
          </h3>

          <div style={{ minWidth: "260px" }}>
            <select
              value={manageSelectedCatId}
              onChange={(e) => setManageSelectedCatId(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#1e293b",
                outline: "none",
              }}
            >
              <option value="">-- Chọn Mục / Chủ Đề --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === "document" ? "Tài liệu đọc" : c.type === "video" ? "Video" : "Đề thi"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Nội dung chi tiết của Mục đã chọn */}
        {!selectedManageCat ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "#64748b",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>👆</div>
            <div style={{ fontSize: "14px", fontWeight: 700 }}>
              Vui lòng chọn một mục ở trên để tải và hiển thị danh sách bài giảng.
            </div>
          </div>
        ) : (
          <div>
            {/* Header info of selected category */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {selectedManageCat.thumbnailUrl && (
                  <img
                    src={selectedManageCat.thumbnailUrl}
                    alt={selectedManageCat.name}
                    style={{ width: "50px", height: "40px", objectFit: "cover", borderRadius: "6px" }}
                  />
                )}
                <div>
                  <div style={{ fontSize: "14.5px", fontWeight: 800, color: "#0f172a" }}>
                    {selectedManageCat.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    Định dạng: <strong>{selectedManageCat.type === "document" ? "📄 Tài liệu đọc" : selectedManageCat.type === "video" ? "🎬 Video" : "📝 Đề thi"}</strong> • Tổng số: <strong>{manageItems.length}</strong> bài đã phát hành
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(selectedManageCat.id, selectedManageCat.name)}
                  style={{
                    background: "#fee2e2",
                    color: "#dc2626",
                    border: "1px solid #fca5a5",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  🗑️ Xóa Mục Này
                </button>
              </div>
            </div>

            {/* Danh sách các bài đã phát hành */}
            {manageItems.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px 20px",
                  color: "#94a3b8",
                  fontSize: "13.5px",
                }}
              >
                Chưa có bài nào được phát hành trong mục này. Hãy sử dụng <strong>"2. ĐĂNG TẢI MỤC"</strong> ở phía trên để thêm bài mới hoặc tải file Excel.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569" }}>
                      <th style={{ padding: "10px 12px", width: "70px", textAlign: "center" }}>Bài số</th>
                      <th style={{ padding: "10px 12px" }}>Tên bài giảng / Mục</th>
                      <th style={{ padding: "10px 12px" }}>Nội dung / Link</th>
                      <th style={{ padding: "10px 12px", width: "110px" }}>Ngày đăng</th>
                      <th style={{ padding: "10px 12px", width: "100px", textAlign: "center" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manageItems.map((item, idx) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: idx % 2 === 0 ? "#ffffff" : "#fafafa",
                        }}
                      >
                        <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, color: "#2563eb" }}>
                          {item.lessonNumber || idx + 1}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1e293b" }}>
                          {item.title}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {item.contentUrl ? (
                            <a
                              href={item.contentUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: "#0284c7",
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontWeight: 600,
                              }}
                            >
                              {item.contentUrl.includes("youtube") ? "🎬 Xem video YouTube ↗" : "🔗 Mở liên kết ↗"}
                            </a>
                          ) : (
                            <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Chưa đính kèm link</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#64748b", fontSize: "12px" }}>
                          {item.createdAt}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id, item.title)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              fontSize: "15px",
                              padding: "4px 8px",
                            }}
                            title="Xóa bài này"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL HƯỚNG DẪN LẤY LINK GOOGLE XUẤT EXCEL */}
      {showGoogleLinkModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              maxWidth: "540px",
              width: "100%",
              borderRadius: "16px",
              padding: "26px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#1e3a8a" }}>
                🔗 LẤY LINK GOOGLE SHEETS & XUẤT EXCEL
              </h3>
              <button
                type="button"
                onClick={() => setShowGoogleLinkModal(false)}
                style={{ background: "transparent", border: "none", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "13.5px", color: "#475569", lineHeight: "1.6" }}>
              Bạn có thể quản lý danh sách bài giảng trên Google Sheets rồi xuất thành file Excel <code>.xlsx</code> để nạp tự động vào hệ thống:
            </p>

            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12.5px", marginBottom: "16px" }}>
              <strong>Cấu trúc các cột chuẩn trong Google Sheets / Excel:</strong>
              <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                <li><code>Cột A:</code> <strong>Bài số</strong> (1, 2, 3...)</li>
                <li><code>Cột B:</code> <strong>Tên bài</strong> (Tên bài học hoặc chủ đề)</li>
                <li><code>Cột C:</code> <strong>Link tài liệu / Video YouTube</strong> (Đường dẫn Drive, YouTube, Docs, PDF)</li>
                <li><code>Cột D:</code> <strong>Mô tả</strong> (Tùy chọn)</li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={downloadCourseExcelTemplate}
                style={{
                  background: "#ea580c",
                  color: "#ffffff",
                  border: "none",
                  padding: "9px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Tải file mẫu về máy
              </button>
              <button
                type="button"
                onClick={() => setShowGoogleLinkModal(false)}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  padding: "9px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
