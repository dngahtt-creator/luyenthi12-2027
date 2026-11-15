const fs = require('fs');

// ==========================================
// 1. UPDATE learningCategoryService.ts
// ==========================================
const servicePath = 'src/lib/learningCategoryService.ts';
let serviceCode = fs.readFileSync(servicePath, 'utf8');

// Bump keys to v4
serviceCode = serviceCode.replace('school_learning_categories_v3', 'school_learning_categories_v4');
serviceCode = serviceCode.replace('school_learning_items_v3', 'school_learning_items_v4');

// Reassign any exams to their respective cat-exam-* categories
serviceCode = serviceCode.replace(
  `    id: "toan12-5",
    categoryId: "cat-doc-toan-12",
    categoryName: "12 - TOÁN HỌC",
    subfolder: "Chuyên đề 3: Đề thi thử tốt nghiệp Toán 12",
    itemType: "exam",`,
  `    id: "toan12-5",
    categoryId: "cat-exam-toan-12",
    categoryName: "12 - BỘ ĐỀ THI TOÁN HỌC",
    subfolder: "Đề thi thử tốt nghiệp Toán 12",
    itemType: "exam",`
);

serviceCode = serviceCode.replace(
  `    id: "toan12-6",
    categoryId: "cat-doc-toan-12",
    categoryName: "12 - TOÁN HỌC",
    subfolder: "Chuyên đề 3: Đề thi thử tốt nghiệp Toán 12",
    itemType: "exam",`,
  `    id: "toan12-6",
    categoryId: "cat-exam-toan-12",
    categoryName: "12 - BỘ ĐỀ THI TOÁN HỌC",
    subfolder: "Đề thi thử tốt nghiệp Toán 12",
    itemType: "exam",`
);

serviceCode = serviceCode.replace(
  `    id: "van12-3",
    categoryId: "cat-doc-van-12",
    categoryName: "12 - NGỮ VĂN",
    subfolder: "Chuyên đề 3: Đề thi thử tốt nghiệp Ngữ văn 12",
    itemType: "exam",`,
  `    id: "van12-3",
    categoryId: "cat-exam-van-12",
    categoryName: "12 - BỘ ĐỀ THI TỐT NGHIỆP NGỮ VĂN 2026",
    subfolder: "Đề thi thử tốt nghiệp Ngữ văn 12",
    itemType: "exam",`
);

serviceCode = serviceCode.replace(
  `    id: "anh12-3",
    categoryId: "cat-doc-anh-12",
    categoryName: "12 - TIẾNG ANH",
    subfolder: "Chuyên đề 3: Đề thi thử tốt nghiệp Tiếng Anh 12",
    itemType: "exam",`,
  `    id: "anh12-3",
    categoryId: "cat-exam-anh-12",
    categoryName: "12 - BỘ ĐỀ THI TỐT NGHIỆP TIẾNG ANH 2026",
    subfolder: "Đề thi thử tốt nghiệp Tiếng Anh 12",
    itemType: "exam",`
);

serviceCode = serviceCode.replace(
  `    id: "ly12-2",
    categoryId: "cat-doc-vat-li-12",
    categoryName: "12 - VẬT LÍ",
    subfolder: "Chuyên đề 2: Từ trường, Hạt nhân & Đề thi KHTN",
    itemType: "exam",`,
  `    id: "ly12-2",
    categoryId: "cat-exam-khtn-12",
    categoryName: "12 - TỔ HỢP KHTN (VẬT LÍ - HOÁ HỌC - SINH HỌC)",
    subfolder: "Đề thi Vật lí KHTN 12",
    itemType: "exam",`
);

serviceCode = serviceCode.replace(
  `    id: "hoa12-2",
    categoryId: "cat-doc-hoa-hoc-12",
    categoryName: "12 - HOÁ HỌC",
    subfolder: "Chuyên đề 2: Đề thi thử Hóa học 12",
    itemType: "exam",`,
  `    id: "hoa12-2",
    categoryId: "cat-exam-khtn-12",
    categoryName: "12 - TỔ HỢP KHTN (VẬT LÍ - HOÁ HỌC - SINH HỌC)",
    subfolder: "Đề thi Hóa học KHTN 12",
    itemType: "exam",`
);

serviceCode = serviceCode.replace(
  `    id: "sinh12-2",
    categoryId: "cat-doc-sinh-hoc-12",
    categoryName: "12 - SINH HỌC",
    subfolder: "Chuyên đề 2: Đề thi thử Sinh học 12",
    itemType: "exam",`,
  `    id: "sinh12-2",
    categoryId: "cat-exam-khtn-12",
    categoryName: "12 - TỔ HỢP KHTN (VẬT LÍ - HOÁ HỌC - SINH HỌC)",
    subfolder: "Đề thi Sinh học KHTN 12",
    itemType: "exam",`
);

serviceCode = serviceCode.replace(
  `    id: "su12-2",
    categoryId: "cat-doc-lich-su-12",
    categoryName: "12 - LỊCH SỬ",
    subfolder: "Chuyên đề 2: Đề thi thử Lịch sử 12",
    itemType: "exam",`,
  `    id: "su12-2",
    categoryId: "cat-exam-khxh-12",
    categoryName: "12 - TỔ HỢP KHXH (LỊCH SỬ - ĐỊA LÍ - GDKT&PL)",
    subfolder: "Đề thi Lịch sử KHXH 12",
    itemType: "exam",`
);

serviceCode = serviceCode.replace(
  `    id: "dia12-2",
    categoryId: "cat-doc-dia-li-12",
    categoryName: "12 - ĐỊA LÍ",
    subfolder: "Chuyên đề 2: Đề thi thử Địa lí 12",
    itemType: "exam",`,
  `    id: "dia12-2",
    categoryId: "cat-exam-khxh-12",
    categoryName: "12 - TỔ HỢP KHXH (LỊCH SỬ - ĐỊA LÍ - GDKT&PL)",
    subfolder: "Đề thi Địa lí KHXH 12",
    itemType: "exam",`
);

serviceCode = serviceCode.replace(
  `    id: "gdktpl12-2",
    categoryId: "cat-doc-gdktpl-12",
    categoryName: "12 - GDKT & PHÁP LUẬT",
    subfolder: "Chuyên đề 2: Đề thi thử GDKT & Pháp luật 12",
    itemType: "exam",`,
  `    id: "gdktpl12-2",
    categoryId: "cat-exam-khxh-12",
    categoryName: "12 - TỔ HỢP KHXH (LỊCH SỬ - ĐỊA LÍ - GDKT&PL)",
    subfolder: "Đề thi GDKT & Pháp luật 12",
    itemType: "exam",`
);

serviceCode = serviceCode.replace(
  `    id: "tin12-2",
    categoryId: "cat-doc-tin-hoc-12",
    categoryName: "12 - TIN HỌC",
    subfolder: "Chuyên đề 2: Đề thi thử Tin học 12",
    itemType: "exam",`,
  `    id: "tin12-2",
    categoryId: "cat-exam-thpt-2026",
    categoryName: "BỘ ĐỀ THI THỬ TỐT NGHIỆP 2026",
    subfolder: "Đề thi thử Tin học 12",
    itemType: "exam",`
);

serviceCode = serviceCode.replace(
  `    id: "cn12-2",
    categoryId: "cat-doc-cong-nghe-12",
    categoryName: "12 - CÔNG NGHỆ",
    subfolder: "Chuyên đề 2: Đề thi thử Công nghệ 12",
    itemType: "exam",`,
  `    id: "cn12-2",
    categoryId: "cat-exam-thpt-2026",
    categoryName: "BỘ ĐỀ THI THỬ TỐT NGHIỆP 2026",
    subfolder: "Đề thi thử Công nghệ 12",
    itemType: "exam",`
);

serviceCode = serviceCode.replace(
  `    id: "toan11-2",
    categoryId: "cat-doc-toan-11",
    categoryName: "11 - TOÁN HỌC",
    subfolder: "Chuyên đề 2: Đề kiểm tra Toán 11",
    itemType: "exam",`,
  `    id: "toan11-2",
    categoryId: "cat-exam-toan-11",
    categoryName: "11 - BỘ ĐỀ THI TOÁN HỌC",
    subfolder: "Đề kiểm tra Toán 11",
    itemType: "exam",`
);

fs.writeFileSync(servicePath, serviceCode, 'utf8');
console.log('learningCategoryService.ts updated: all exams moved to cat-exam-* categories');

// ==========================================
// 2. UPDATE page.tsx modal logic
// ==========================================
const pagePath = 'src/app/page.tsx';
let pageCode = fs.readFileSync(pagePath, 'utf8');

// Replace the catItems filtering and the filter bar in activeCategoryModal
const oldModalBlock = `      {/* =========================================================
          MODAL: CHI TIẾT MỤC HỌC LIỆU (CÁC THƯ MỤC NHỎ, CHỌN BÀI ĐỌC/THI, TẢI DOCX/PDF)
      ========================================================= */}
      {activeCategoryModal && (() => {
        const catItems = learningItems.filter((i) => i.categoryId === activeCategoryModal.id);
        const subfolderSet = new Set<string>();
        catItems.forEach((i) => {
          if (i.subfolder) subfolderSet.add(i.subfolder);
        });
        const subfoldersList = Array.from(subfolderSet);

        const displayedItems = catItems.filter((item) => {
          const matchFolder = activeSubfolder === "all" || item.subfolder === activeSubfolder;
          const matchType =
            filterItemType === "all"
              ? true
              : filterItemType === "read"
              ? item.itemType !== "exam"
              : item.itemType === "exam";
          return matchFolder && matchType;
        });

        const readCount = catItems.filter((i) => i.itemType !== "exam").length;
        const examCount = catItems.filter((i) => i.itemType === "exam").length;`;

const newModalBlock = `      {/* =========================================================
          MODAL: CHI TIẾT MỤC HỌC LIỆU (CÁC THƯ MỤC NHỎ, CHỌN BÀI ĐỌC/THI, TẢI DOCX/PDF)
      ========================================================= */}
      {activeCategoryModal && (() => {
        // TÀI LIỆU: Chỉ hiện bài đọc. ĐỀ THI: Chỉ hiện bài thi.
        const isDocCategory = activeCategoryModal.type === "document";
        const isExamCategory = activeCategoryModal.type === "exam";

        const catItems = learningItems.filter((i) => {
          if (i.categoryId !== activeCategoryModal.id) return false;
          // Trong mục Tài liệu: CHỈ HIỆN ĐỌC (không hiện thi)
          if (isDocCategory) return i.itemType !== "exam";
          // Trong mục Đề thi: HIỆN THI
          if (isExamCategory) return true;
          return true;
        });

        const subfolderSet = new Set<string>();
        catItems.forEach((i) => {
          if (i.subfolder) subfolderSet.add(i.subfolder);
        });
        const subfoldersList = Array.from(subfolderSet);

        const displayedItems = catItems.filter((item) => {
          return activeSubfolder === "all" || item.subfolder === activeSubfolder;
        });`;

if (pageCode.includes(oldModalBlock)) {
  pageCode = pageCode.replace(oldModalBlock, newModalBlock);
  console.log('Modal filtering updated');
} else {
  console.log('oldModalBlock not found directly');
}

// Remove the "Chọn loại: Tất cả / Bài muốn đọc / Bài muốn thi" filter toolbar completely from the document category modal
const oldToolbarBlock = `                {/* 2. Bộ lọc Bài Đọc / Bài Thi */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", paddingTop: "8px", borderTop: "1px dashed #e2e8f0" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>Chọn loại:</span>
                    <button
                      type="button"
                      className={styles.zoomBtn}
                      onClick={() => setFilterItemType("all")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 700,
                        border: "none",
                        background: filterItemType === "all" ? "#334155" : "#e2e8f0",
                        color: filterItemType === "all" ? "#ffffff" : "#475569",
                      }}
                    >
                      Tất cả ({catItems.length})
                    </button>
                    <button
                      type="button"
                      className={styles.zoomBtn}
                      onClick={() => setFilterItemType("read")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 700,
                        border: "none",
                        background: filterItemType === "read" ? "#2563eb" : "#e2e8f0",
                        color: filterItemType === "read" ? "#ffffff" : "#475569",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>📖</span> Bài muốn đọc ({readCount})
                    </button>
                    <button
                      type="button"
                      className={styles.zoomBtn}
                      onClick={() => setFilterItemType("exam")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 700,
                        border: "none",
                        background: filterItemType === "exam" ? "#059669" : "#e2e8f0",
                        color: filterItemType === "exam" ? "#ffffff" : "#475569",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>📝</span> Bài muốn thi ({examCount})
                    </button>
                  </div>

                  <span style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                    Hiển thị <strong>{displayedItems.length}</strong> bài học/đề thi
                  </span>
                </div>`;

const newToolbarBlock = `                {/* Trạng thái số lượng bài hiển thị */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", paddingTop: "8px", borderTop: "1px dashed #e2e8f0" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#1e3a8a", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <span>{isDocCategory ? "📖 DANH SÁCH TÀI LIỆU ĐỌC" : isExamCategory ? "📝 DANH SÁCH ĐỀ THI TRỰC TUYẾN" : "🎬 DANH SÁCH VIDEO"}</span>
                    </span>
                  </div>

                  <span style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                    Hiển thị <strong>{displayedItems.length}</strong> {isDocCategory ? "tài liệu đọc" : isExamCategory ? "đề thi" : "video"}
                  </span>
                </div>`;

if (pageCode.includes(oldToolbarBlock)) {
  pageCode = pageCode.replace(oldToolbarBlock, newToolbarBlock);
  console.log('Toolbar replaced: removed "Chọn loại" bar for documents');
} else {
  console.log('oldToolbarBlock not found directly');
}

fs.writeFileSync(pagePath, pageCode, 'utf8');
console.log('page.tsx updated successfully');
