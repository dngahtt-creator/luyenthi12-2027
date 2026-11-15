const fs = require('fs');
let code = fs.readFileSync('src/app/admin/components/CommunityDocsTab.tsx', 'utf8');

// 1. Update Props signature
const oldSig = `export default function CommunityDocsTab({
  communityDocsList,
  onRefresh,
  showToast,
}: CommunityDocsTabProps) {`;

const newSig = `export default function CommunityDocsTab({
  communityDocsList,
  onRefresh,
  showToast,
  cloudinaryCloudName,
  cloudinaryPreset,
}: CommunityDocsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"categories" | "docs">("categories");`;

if (code.includes(oldSig)) {
  code = code.replace(oldSig, newSig);
  console.log('Signature updated');
} else {
  console.log('Warning: oldSig not found directly');
}

// 2. Add Sub-nav buttons and open conditional render
const targetStart = `  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* =========================================================
          HERO BANNER: TÀI LIỆU CỘNG ĐỒNG`;

const subNavHtml = `  return (
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
              HERO BANNER: TÀI LIỆU CỘNG ĐỒNG`;

// Normalize \r\n to \n for replacement
code = code.replace(/\r\n/g, '\n');

if (code.includes(targetStart)) {
  code = code.replace(targetStart, subNavHtml);
  console.log('SubNav start replaced successfully');
} else {
  console.log('targetStart not found!');
}

// 3. Close the fragment before modals
const targetEnd = `          </div>
        )}
      </div>

      {/* =========================================================
          MODAL: THÊM / CHỈNH SỬA TÀI LIỆU CỘNG ĐỒNG`;

const newEnd = `          </div>
        )}
      </div>
        </>
      )}

      {/* =========================================================
          MODAL: THÊM / CHỈNH SỬA TÀI LIỆU CỘNG ĐỒNG`;

if (code.includes(targetEnd)) {
  code = code.replace(targetEnd, newEnd);
  console.log('SubNav end replaced successfully');
} else {
  console.log('targetEnd not found!');
}

fs.writeFileSync('src/app/admin/components/CommunityDocsTab.tsx', code, 'utf8');
console.log('All done for CommunityDocsTab.tsx');
