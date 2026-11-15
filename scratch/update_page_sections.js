const fs = require('fs');
const file = 'src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add top import
if (!content.includes('learningCategoryService')) {
  const importTag = 'import {\n  getAllCommunityDocs,';
  const importReplacement = `import {
  LearningCategory,
  LearningItem,
  getAllLearningCategories,
  getAllLearningItems,
  getYouTubeEmbedUrl,
} from "@/lib/learningCategoryService";
import {
  getAllCommunityDocs,`;
  content = content.replace(importTag, importReplacement);
}

// 2. Add state inside HomePage component
const stateHookTarget = '  const [documentsList, setDocumentsList] = useState<DocumentItem[]>(DEFAULT_DOCUMENTS);';
const stateHookReplacement = `  const [documentsList, setDocumentsList] = useState<DocumentItem[]>(DEFAULT_DOCUMENTS);

  // DỮ LIỆU CÁC MỤC HỌC LIỆU TRÊN TRANG CHỦ (TÀI LIỆU, VIDEO, ĐỀ THI - CHUẨN HÌNH 2)
  const [learningCategories, setLearningCategories] = useState<LearningCategory[]>([]);
  const [learningItems, setLearningItems] = useState<LearningItem[]>([]);
  const [activeCategoryModal, setActiveCategoryModal] = useState<LearningCategory | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<LearningItem | null>(null);`;

if (!content.includes('learningCategories') && content.includes(stateHookTarget)) {
  content = content.replace(stateHookTarget, stateHookReplacement);
}

// 3. Add loading dynamic categories in loadDynamicSchoolData
const loadTarget = '        const liveDocs = await getAllDocuments();';
const loadReplacement = `        const [liveCats, liveItems] = await Promise.all([
          getAllLearningCategories(),
          getAllLearningItems(),
        ]);
        if (liveCats && liveCats.length > 0) setLearningCategories(liveCats);
        if (liveItems && liveItems.length > 0) setLearningItems(liveItems);

        const liveDocs = await getAllDocuments();`;

if (!content.includes('getAllLearningCategories()') && content.includes(loadTarget)) {
  content = content.replace(loadTarget, loadReplacement);
}

// 4. Add window event listener for school_learning_updated
const eventTarget = '    window.addEventListener("school_community_docs_updated", loadDynamicSchoolData);';
const eventReplacement = `    window.addEventListener("school_community_docs_updated", loadDynamicSchoolData);
    window.addEventListener("school_learning_updated", loadDynamicSchoolData);`;

if (!content.includes('school_learning_updated') && content.includes(eventTarget)) {
  content = content.replace(eventTarget, eventReplacement);
  content = content.replace(
    'window.removeEventListener("school_community_docs_updated", loadDynamicSchoolData);',
    'window.removeEventListener("school_community_docs_updated", loadDynamicSchoolData);\n      window.removeEventListener("school_learning_updated", loadDynamicSchoolData);'
  );
}

// 5. Add filtered categories helper
const filterHelperTarget = '  // Filtered exams\n  const filteredExams = useMemo(() => {';
const filterHelperReplacement = `  // 3 Mục chính theo chuẩn hình 2
  const documentCategories = useMemo(
    () => learningCategories.filter((c) => c.type === "document"),
    [learningCategories]
  );
  const videoCategories = useMemo(
    () => learningCategories.filter((c) => c.type === "video"),
    [learningCategories]
  );
  const examCategories = useMemo(
    () => learningCategories.filter((c) => c.type === "exam"),
    [learningCategories]
  );

  // Filtered exams
  const filteredExams = useMemo(() => {`;

if (!content.includes('documentCategories') && content.includes(filterHelperTarget)) {
  content = content.replace(filterHelperTarget, filterHelperReplacement);
}

// 6. Insert 3 Main Sections right before <section id="de-thi"
const sectionTarget = '        {/* MỤC 2: ĐỀ THI THPT QUỐC GIA CHUẨN CẤU TRÚC */}\n        <section id="de-thi" className={styles.sectionWrap}>';
const sectionsCode = `        {/* =========================================================
            3 MỤC CHÍNH TRÊN TRANG CHỦ: TÀI LIỆU, VIDEO, ĐỀ THI (CHUẨN HÌNH 2)
        ========================================================= */}
        <section id="muc-hoc-lieu" className={styles.sectionWrap} style={{ paddingTop: "20px", paddingBottom: "10px" }}>
          {/* MỤC 1: TÀI LIỆU */}
          <div style={{ marginBottom: "32px" }}>
            <div
              style={{
                background: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderRadius: "16px",
                padding: "10px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "20px",
                    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  📄
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 900,
                    color: "#1e3a8a",
                    letterSpacing: "0.5px",
                  }}
                >
                  TÀI LIỆU
                </h3>
              </div>

              <button
                type="button"
                onClick={openStudentLoginModal}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "20px",
                  padding: "8px 22px",
                  fontSize: "13.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                }}
              >
                Vào Học Ngay ➔
              </button>
            </div>

            {/* Grid of Subject Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: "16px",
              }}
            >
              {documentCategories.map((cat) => (
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
                >
                  <div>
                    <div style={{ width: "100%", height: "115px", background: "#f1f5f9", overflow: "hidden" }}>
                      <img
                        src={cat.thumbnailUrl || "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80"}
                        alt={cat.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <div style={{ padding: "10px 12px 6px 12px" }}>
                      <div
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 800,
                          color: "#1e293b",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={cat.name}
                      >
                        {cat.name}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#64748b", fontStyle: "italic", margin: "2px 0 8px 0" }}>
                        {cat.author || "Nguồn internet"}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "0 12px 12px 12px" }}>
                    <button
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
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MỤC 2: VIDEO */}
          <div style={{ marginBottom: "32px" }}>
            <div
              style={{
                background: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderRadius: "16px",
                padding: "10px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "18px",
                    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  ▶
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 900,
                    color: "#1e3a8a",
                    letterSpacing: "0.5px",
                  }}
                >
                  VIDEO
                </h3>
              </div>

              <button
                type="button"
                onClick={openStudentLoginModal}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "20px",
                  padding: "8px 22px",
                  fontSize: "13.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                }}
              >
                Vào Học Ngay ➔
              </button>
            </div>

            {/* Grid of Video Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: "16px",
              }}
            >
              {videoCategories.map((cat) => (
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
                >
                  <div>
                    <div style={{ width: "100%", height: "115px", background: "#f1f5f9", overflow: "hidden", position: "relative" }}>
                      <img
                        src={cat.thumbnailUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"}
                        alt={cat.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: "6px",
                          right: "6px",
                          background: "rgba(0,0,0,0.7)",
                          color: "#ffffff",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        🎬 Video
                      </div>
                    </div>
                    <div style={{ padding: "10px 12px 6px 12px" }}>
                      <div
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 800,
                          color: "#1e293b",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={cat.name}
                      >
                        {cat.name}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#64748b", fontStyle: "italic", margin: "2px 0 8px 0" }}>
                        {cat.author || "Nguồn internet"}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "0 12px 12px 12px" }}>
                    <button
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
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MỤC 3: ĐỀ THI */}
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                background: "#ffffff",
                border: "1.5px solid #e2e8f0",
                borderRadius: "16px",
                padding: "10px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "20px",
                    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  📝
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 900,
                    color: "#1e3a8a",
                    letterSpacing: "0.5px",
                  }}
                >
                  ĐỀ THI
                </h3>
              </div>

              <button
                type="button"
                onClick={openStudentLoginModal}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "20px",
                  padding: "8px 22px",
                  fontSize: "13.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                }}
              >
                Vào Học Ngay ➔
              </button>
            </div>

            {/* Grid of Exam Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: "16px",
              }}
            >
              {examCategories.map((cat) => (
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
                >
                  <div>
                    <div style={{ width: "100%", height: "115px", background: "#f1f5f9", overflow: "hidden" }}>
                      <img
                        src={cat.thumbnailUrl || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80"}
                        alt={cat.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <div style={{ padding: "10px 12px 6px 12px" }}>
                      <div
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 800,
                          color: "#1e293b",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={cat.name}
                      >
                        {cat.name}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#64748b", fontStyle: "italic", margin: "2px 0 8px 0" }}>
                        {cat.author || "Cô Đặng Anh Thư"}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "0 12px 12px 12px" }}>
                    <button
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
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MỤC 2: ĐỀ THI THPT QUỐC GIA CHUẨN CẤU TRÚC */}
        <section id="de-thi" className={styles.sectionWrap}>`;

if (!content.includes('id="muc-hoc-lieu"') && content.includes(sectionTarget)) {
  content = content.replace(sectionTarget, sectionsCode);
}

// 7. Add Modals for Category Content & Video Player at the end of the JSX
const modalInsertTarget = '      {/* Footer */}';
const modalsCode = `      {/* =========================================================
          MODAL: DANH SÁCH BÀI HỌC CỦA MỤC ĐƯỢC CHỌN (CHUẨN HÌNH 2)
      ========================================================= */}
      {activeCategoryModal && (() => {
        const catItems = learningItems.filter((i) => i.categoryId === activeCategoryModal.id);
        return (
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
                maxWidth: "680px",
                width: "100%",
                borderRadius: "20px",
                padding: "28px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
                animation: "scaleIn 0.2s ease-out",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {activeCategoryModal.thumbnailUrl && (
                    <img
                      src={activeCategoryModal.thumbnailUrl}
                      alt={activeCategoryModal.name}
                      style={{ width: "54px", height: "42px", objectFit: "cover", borderRadius: "8px" }}
                    />
                  )}
                  <div>
                    <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#1e3a8a" }}>
                      {activeCategoryModal.name}
                    </h2>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {activeCategoryModal.author || "Nguồn internet"} • {activeCategoryModal.type === "document" ? "Tài liệu đọc" : activeCategoryModal.type === "video" ? "Video bài giảng" : "Đề thi"} ({catItems.length} bài)
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveCategoryModal(null)}
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Description */}
              {activeCategoryModal.description && (
                <p style={{ fontSize: "13.5px", color: "#475569", lineHeight: 1.5, background: "#f8fafc", padding: "10px 14px", borderRadius: "10px", margin: "0 0 16px 0" }}>
                  {activeCategoryModal.description}
                </p>
              )}

              {/* Lessons List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {catItems.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8", fontSize: "13.5px" }}>
                    Chưa có bài học nào được phát hành trong mục này.
                  </div>
                ) : (
                  catItems.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        padding: "12px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 800,
                          }}
                        >
                          {item.lessonNumber || idx + 1}
                        </span>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                            {item.title}
                          </div>
                          {item.description && (
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (item.contentUrl && item.contentUrl.includes("youtube")) {
                            setActiveVideoModal(item);
                          } else if (item.contentUrl) {
                            window.open(item.contentUrl, "_blank");
                          } else {
                            openStudentLoginModal();
                          }
                        }}
                        style={{
                          background: "#2563eb",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 14px",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.type === "video" ? "🎬 Xem video" : "📖 Học ngay"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================
          MODAL: TRÌNH PHÁT VIDEO YOUTUBE / TRỰC TUYẾN
      ========================================================= */}
      {activeVideoModal && (() => {
        const embedUrl = getYouTubeEmbedUrl(activeVideoModal.contentUrl || "");
        return (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(6px)",
              zIndex: 999999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                background: "#0f172a",
                maxWidth: "800px",
                width: "100%",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#1e293b",
                  color: "#ffffff",
                }}
              >
                <div style={{ fontSize: "14.5px", fontWeight: 800 }}>
                  🎬 {activeVideoModal.title}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveVideoModal(null)}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    color: "#ffffff",
                    borderRadius: "50%",
                    width: "30px",
                    height: "30px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
                <iframe
                  src={embedUrl}
                  title={activeVideoModal.title}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Footer */}`;

if (!content.includes('activeCategoryModal &&') && content.includes(modalInsertTarget)) {
  content = content.replace(modalInsertTarget, modalsCode);
}

fs.writeFileSync(file, content, 'utf8');
console.log('UPDATED PAGE.TSX SUCCESSFULLY!');
