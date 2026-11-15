const fs = require('fs');

const pageFile = 'src/app/page.tsx';
let code = fs.readFileSync(pageFile, 'utf8');

// 1. Ensure imports from learningCategoryService
const oldImport = `import {
  LearningCategory,
  LearningItem,
  DEFAULT_CATEGORIES,
  DEFAULT_ITEMS,
  getAllLearningCategories,
  getAllLearningItems,
  getYouTubeEmbedUrl,
} from "@/lib/learningCategoryService";`;

const newImport = `import {
  LearningCategory,
  LearningItem,
  DEFAULT_CATEGORIES,
  DEFAULT_ITEMS,
  getAllLearningCategories,
  getAllLearningItems,
  getYouTubeEmbedUrl,
  downloadDocxFile,
  downloadPdfFile,
} from "@/lib/learningCategoryService";`;

if (code.includes(oldImport)) {
  code = code.replace(oldImport, newImport);
  console.log('Imports updated in page.tsx');
} else {
  console.log('oldImport not matched, checking...');
}

// 2. Add state for subfolders and reading modal
const oldState = `  const [learningCategories, setLearningCategories] = useState<LearningCategory[]>(DEFAULT_CATEGORIES);
  const [learningItems, setLearningItems] = useState<LearningItem[]>(DEFAULT_ITEMS);
  const [activeCategoryModal, setActiveCategoryModal] = useState<LearningCategory | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<LearningItem | null>(null);`;

const newState = `  const [learningCategories, setLearningCategories] = useState<LearningCategory[]>(DEFAULT_CATEGORIES);
  const [learningItems, setLearningItems] = useState<LearningItem[]>(DEFAULT_ITEMS);
  const [activeCategoryModal, setActiveCategoryModal] = useState<LearningCategory | null>(null);
  const [activeSubfolder, setActiveSubfolder] = useState<string>("all");
  const [filterItemType, setFilterItemType] = useState<"all" | "read" | "exam">("all");
  const [readingDocItem, setReadingDocItem] = useState<LearningItem | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<LearningItem | null>(null);`;

if (code.includes(oldState)) {
  code = code.replace(oldState, newState);
  console.log('State updated in page.tsx');
} else {
  console.log('oldState not matched, checking...');
}

// 3. Add zoomBtn to Vào Học Ngay ➔ button and subject cards
// Replace Vào Học Ngay button in Section 1
code = code.replace(
  'Vào Học Ngay ➔\n              </button>',
  'Vào Học Ngay ➔\n              </button>'
);

// Add className={styles.zoomCard} to subject card and className={styles.zoomBtn} to button
const oldCardHtml = `{documentCategories.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                >`;

const newCardHtml = `{documentCategories.map((cat) => (
                <div
                  key={cat.id}
                  className={styles.zoomCard}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease",
                  }}
                >`;

if (code.includes(oldCardHtml)) {
  code = code.replace(oldCardHtml, newCardHtml);
  console.log('Document cards zoom updated');
}

// Update VÀO HỌC button with zoomBtn
const oldBtnHtml = `                    <button
                      type="button"
                      onClick={() => setActiveCategoryModal(cat)}
                      style={{
                        width: "100%",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        borderRadius: "8px",
                        padding: "7px 0",
                        fontSize: "12.5px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      VÀO HỌC
                    </button>`;

const newBtnHtml = `                    <button
                      type="button"
                      className={styles.zoomBtn}
                      onClick={() => {
                        setActiveCategoryModal(cat);
                        setActiveSubfolder("all");
                        setFilterItemType("all");
                      }}
                      style={{
                        width: "100%",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        borderRadius: "8px",
                        padding: "7px 0",
                        fontSize: "12.5px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      VÀO HỌC
                    </button>`;

if (code.includes(oldBtnHtml)) {
  code = code.replace(oldBtnHtml, newBtnHtml);
  console.log('VÀO HỌC button zoom updated');
}

// 4. Inject Modal JSX right before selectedExam modal
const targetModalPoint = `{/* =========================================================
          MODAL 3: PHÒNG THI (EXAM MODAL DIALOG)
      ========================================================= */}`;

const modalsJsx = `{/* =========================================================
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
        const examCount = catItems.filter((i) => i.itemType === "exam").length;

        return (
          <div
            className={styles.modalOverlay}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(6px)",
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
            onClick={() => {
              setActiveCategoryModal(null);
              setActiveSubfolder("all");
              setFilterItemType("all");
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                width: "100%",
                maxWidth: "880px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
                display: "flex",
                flexDirection: "column",
                animation: "fadeIn 0.2s ease-out",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)",
                  padding: "22px 26px",
                  borderRadius: "20px 20px 0 0",
                  color: "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                  position: "relative",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "28px" }}>
                      {activeCategoryModal.type === "video" ? "🎥" : activeCategoryModal.type === "exam" ? "📝" : "📚"}
                    </span>
                    <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 900, letterSpacing: "-0.01em" }}>
                      {activeCategoryModal.name}
                    </h2>
                    <span
                      style={{
                        background: "rgba(255, 255, 255, 0.2)",
                        border: "1px solid rgba(255, 255, 255, 0.35)",
                        padding: "2px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      {activeCategoryModal.type === "video" ? "VIDEO BÀI GIẢNG" : activeCategoryModal.type === "exam" ? "BỘ ĐỀ THI" : "TÀI LIỆU ÔN THI"}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "13.5px", color: "#e0e7ff", maxWidth: "680px", lineHeight: 1.5 }}>
                    {activeCategoryModal.description || "Danh sách các thư mục bài học, đề thi thử và tài liệu tải về chuẩn cấu trúc Bộ Giáo Dục."}
                  </p>
                  <div style={{ fontSize: "12px", color: "#bfdbfe", marginTop: "6px" }}>
                    Tác giả / Nguồn: <strong>{activeCategoryModal.author || "Nguồn internet"}</strong> • Tổng số: <strong>{catItems.length} nội dung</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.zoomBtn}
                  onClick={() => {
                    setActiveCategoryModal(null);
                    setActiveSubfolder("all");
                    setFilterItemType("all");
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "none",
                    color: "#ffffff",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    fontSize: "16px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Subfolder & Filters Toolbar */}
              <div
                style={{
                  padding: "16px 24px",
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {/* 1. Thanh Thư Mục Nhỏ (Subfolders) */}
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📁</span> CÁC THƯ MỤC NHỎ TRONG MỤC:
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className={\`\${styles.zoomFolder} \${styles.zoomBtn}\`}
                      onClick={() => setActiveSubfolder("all")}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 700,
                        border: "1.5px solid",
                        borderColor: activeSubfolder === "all" ? "#2563eb" : "#cbd5e1",
                        background: activeSubfolder === "all" ? "#eff6ff" : "#ffffff",
                        color: activeSubfolder === "all" ? "#1d4ed8" : "#475569",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>📂</span>
                      <span>Tất cả thư mục</span>
                      <span
                        style={{
                          background: activeSubfolder === "all" ? "#2563eb" : "#e2e8f0",
                          color: activeSubfolder === "all" ? "#ffffff" : "#64748b",
                          padding: "1px 6px",
                          borderRadius: "10px",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      >
                        {catItems.length}
                      </span>
                    </button>

                    {subfoldersList.map((folder) => {
                      const countInFolder = catItems.filter((i) => i.subfolder === folder).length;
                      const isSelected = activeSubfolder === folder;
                      return (
                        <button
                          key={folder}
                          type="button"
                          className={\`\${styles.zoomFolder} \${styles.zoomBtn}\`}
                          onClick={() => setActiveSubfolder(folder)}
                          style={{
                            padding: "8px 14px",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: 700,
                            border: "1.5px solid",
                            borderColor: isSelected ? "#2563eb" : "#cbd5e1",
                            background: isSelected ? "#eff6ff" : "#ffffff",
                            color: isSelected ? "#1d4ed8" : "#475569",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span>📁</span>
                          <span>{folder}</span>
                          <span
                            style={{
                              background: isSelected ? "#2563eb" : "#e2e8f0",
                              color: isSelected ? "#ffffff" : "#64748b",
                              padding: "1px 6px",
                              borderRadius: "10px",
                              fontSize: "11px",
                              fontWeight: 800,
                            }}
                          >
                            {countInFolder}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Bộ lọc Bài Đọc / Bài Thi */}
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
                </div>
              </div>

              {/* Items List */}
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {displayedItems.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>📭</div>
                    <div style={{ fontSize: "15px", fontWeight: 700 }}>Chưa có nội dung trong thư mục này</div>
                    <p style={{ fontSize: "13px", marginTop: "4px" }}>
                      Vui lòng chọn thư mục khác hoặc chuyển bộ lọc sang "Tất cả".
                    </p>
                  </div>
                ) : (
                  displayedItems.map((item) => {
                    const isExam = item.itemType === "exam" || activeCategoryModal.type === "exam";
                    return (
                      <div
                        key={item.id}
                        className={styles.zoomCard}
                        style={{
                          background: "#ffffff",
                          border: isExam ? "1.5px solid #a7f3d0" : "1.5px solid #e2e8f0",
                          borderRadius: "14px",
                          padding: "16px 18px",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                background: isExam ? "#d1fae5" : "#dbeafe",
                                color: isExam ? "#047857" : "#1d4ed8",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "18px",
                                flexShrink: 0,
                              }}
                            >
                              {isExam ? "📝" : "📄"}
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                <span
                                  style={{
                                    background: isExam ? "#059669" : "#2563eb",
                                    color: "#ffffff",
                                    fontSize: "11px",
                                    fontWeight: 800,
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                  }}
                                >
                                  {isExam ? "ĐỀ THI" : \`BÀI \${item.lessonNumber}\`}
                                </span>
                                {item.subfolder && (
                                  <span
                                    style={{
                                      background: "#f1f5f9",
                                      color: "#475569",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      padding: "2px 8px",
                                      borderRadius: "6px",
                                      border: "1px solid #cbd5e1",
                                    }}
                                  >
                                    📁 {item.subfolder}
                                  </span>
                                )}
                              </div>
                              <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#1e293b", lineHeight: 1.4 }}>
                                {item.title}
                              </h4>
                              {item.description && (
                                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons Row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "8px",
                            paddingTop: "10px",
                            borderTop: "1px dashed #f1f5f9",
                            flexWrap: "wrap",
                          }}
                        >
                          {/* Nút Vào Thi */}
                          {isExam && (
                            <Link
                              href={item.contentUrl?.startsWith("/mock-exams") ? item.contentUrl : \`/mock-exams/\${item.id}\`}
                              className={styles.zoomBtn}
                              style={{
                                background: "#059669",
                                color: "#ffffff",
                                textDecoration: "none",
                                padding: "7px 16px",
                                borderRadius: "8px",
                                fontSize: "12.5px",
                                fontWeight: 800,
                                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
                              }}
                            >
                              <span>📝</span> Vào Thi Ngay
                            </Link>
                          )}

                          {/* Nút Đọc Online */}
                          <button
                            type="button"
                            className={styles.zoomBtn}
                            onClick={() => setReadingDocItem(item)}
                            style={{
                              background: "#2563eb",
                              color: "#ffffff",
                              border: "none",
                              padding: "7px 16px",
                              borderRadius: "8px",
                              fontSize: "12.5px",
                              fontWeight: 800,
                              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
                            }}
                          >
                            <span>📖</span> Đọc Bài Này
                          </button>

                          {/* Nút Tải DOCX */}
                          <button
                            type="button"
                            className={styles.zoomBtn}
                            onClick={() => downloadDocxFile(item.title, item.description, activeCategoryModal.name, item.contentBody)}
                            style={{
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1.5px solid #bfdbfe",
                              padding: "6px 14px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                            title="Tải về file Microsoft Word (.docx)"
                          >
                            <span>⬇️</span> Tải DOCX
                          </button>

                          {/* Nút Tải PDF */}
                          <button
                            type="button"
                            className={styles.zoomBtn}
                            onClick={() => downloadPdfFile(item.title, item.description, activeCategoryModal.name, item.contentBody)}
                            style={{
                              background: "#fef2f2",
                              color: "#b91c1c",
                              border: "1.5px solid #fecaca",
                              padding: "6px 14px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                            title="Tải về hoặc in file PDF"
                          >
                            <span>📄</span> Tải PDF
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================
          MODAL: ĐỌC TÀI LIỆU TRỰC TUYẾN (ONLINE READER)
      ========================================================= */}
      {readingDocItem && (
        <div
          className={styles.modalOverlay}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setReadingDocItem(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              display: "flex",
              flexDirection: "column",
              animation: "fadeIn 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Reader Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
                borderRadius: "20px 20px 0 0",
              }}
            >
              <div>
                <span
                  style={{
                    background: "#dbeafe",
                    color: "#1d4ed8",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  {readingDocItem.categoryName} • {readingDocItem.subfolder || "Chuyên đề trọng tâm"}
                </span>
                <h3 style={{ margin: "6px 0 0 0", fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                  {readingDocItem.title}
                </h3>
              </div>

              <button
                type="button"
                className={styles.zoomBtn}
                onClick={() => setReadingDocItem(null)}
                style={{
                  background: "#e2e8f0",
                  border: "none",
                  color: "#475569",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  fontSize: "16px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Action Toolbar */}
            <div
              style={{
                padding: "12px 24px",
                background: "#ffffff",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                gap: "10px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className={styles.zoomBtn}
                onClick={() => downloadDocxFile(readingDocItem.title, readingDocItem.description, readingDocItem.categoryName, readingDocItem.contentBody)}
                style={{
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1.5px solid #bfdbfe",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                }}
              >
                <span>📥</span> Tải Về DOCX (.docx)
              </button>

              <button
                type="button"
                className={styles.zoomBtn}
                onClick={() => downloadPdfFile(readingDocItem.title, readingDocItem.description, readingDocItem.categoryName, readingDocItem.contentBody)}
                style={{
                  background: "#fef2f2",
                  color: "#b91c1c",
                  border: "1.5px solid #fecaca",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                }}
              >
                <span>📄</span> In / Tải PDF (.pdf)
              </button>

              {readingDocItem.contentUrl && readingDocItem.contentUrl.startsWith("http") && (
                <a
                  href={readingDocItem.contentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.zoomBtn}
                  style={{
                    background: "#f1f5f9",
                    color: "#334155",
                    textDecoration: "none",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <span>🔗</span> Mở Liên Kết Nguồn ↗
                </a>
              )}
            </div>

            {/* Reader Content Body */}
            <div style={{ padding: "24px 28px", lineHeight: 1.7, color: "#1e293b", fontSize: "14.5px" }}>
              <div
                style={{
                  background: "#f8fafc",
                  borderLeft: "4px solid #2563eb",
                  padding: "14px 18px",
                  borderRadius: "6px",
                  marginBottom: "20px",
                }}
              >
                <div style={{ fontWeight: 800, color: "#1e40af", marginBottom: "4px", fontSize: "13px", textTransform: "uppercase" }}>
                  Mục tiêu & Tóm tắt kiến thức:
                </div>
                <div>{readingDocItem.description}</div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#0369a1", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" }}>
                  I. HỆ THỐNG TRỌNG TÂM LÝ THUYẾT & PHƯƠNG PHÁP
                </h4>
                <div style={{ whiteSpace: "pre-line", marginTop: "8px" }}>
                  {readingDocItem.contentBody || "1. Nắm chắc định nghĩa, quy tắc và bản chất các công thức trọng tâm.\\n2. Rèn luyện tư duy loại trừ đáp án nhiễu trong 30 giây.\\n3. Ghi nhớ các lưu ý quan trọng để không mất điểm oan ở câu hỏi cơ bản."}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#0369a1", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" }}>
                  II. HƯỚNG DẪN ÔN TẬP VÀ THI THỬ
                </h4>
                <p>
                  Sau khi đọc xong bài học, học sinh nên nhấp vào nút <strong>Tải DOCX</strong> hoặc <strong>Tải PDF</strong> để lưu về máy tính hoặc in ra ôn luyện. Đồng thời, hãy thực hiện bài thi thử trực tuyến tương ứng để củng cố kiến thức và đo lường sự tiến bộ.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      ` + targetModalPoint;

if (code.includes(targetModalPoint)) {
  code = code.replace(targetModalPoint, modalsJsx);
  console.log('Modals injected successfully into page.tsx');
} else {
  console.log('targetModalPoint not found!');
}

fs.writeFileSync(pageFile, code, 'utf8');
console.log('Done integrating modals into page.tsx');
