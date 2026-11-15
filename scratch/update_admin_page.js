const fs = require('fs');
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// 1. Remove the separate sidebar button for Quản lý mục học liệu
const btnTarget = `          <button
            id="tab-btn-curriculum"
            className={\`\${styles.navItem} \${activeTab === "curriculum" ? styles.navItemActive : ""}\`}
            onClick={() => {
              setActiveTab("curriculum");
              if (typeof window !== "undefined") {
                window.history.pushState(null, "", "/admin");
              }
            }}
          >
            <div className={styles.navItemLeft}>
              <span className={styles.navIcon}>🗂️</span>
              <span>Quản lý mục học liệu</span>
            </div>
          </button>

`;

if (code.includes(btnTarget)) {
  code = code.replace(btnTarget, '');
  console.log('Sidebar button tab-btn-curriculum removed successfully');
} else {
  console.log('Warning: btnTarget not found directly, checking...');
  const altBtn = code.indexOf('id="tab-btn-curriculum"');
  console.log('altBtn index:', altBtn);
}

// 2. Update CommunityDocsTab call to pass cloudinary credentials and handle activeTab === "curriculum" || activeTab === "community-docs"
const tabTarget = `                    {/* =========================================================
              TAB 7: KHỞI TẠO, ĐĂNG TẢI & QUẢN LÝ MỤC HỌC LIỆU (CHUẨN HÌNH 1)
          ========================================================= */}
          {activeTab === "curriculum" && (
            <div className={styles.tabContent}>
              <ManageCategoriesTab
                onShowToast={showToast}
                cloudinaryCloudName={cloudName}
                cloudinaryPreset={uploadPreset}
              />
            </div>
          )}

{activeTab === "community-docs" && (
            <CommunityDocsTab
              communityDocsList={communityDocsList}
              onRefresh={fetchCommunityDocs}
              showToast={showToast}
            />
          )}`;

const newTabTarget = `          {(activeTab === "community-docs" || activeTab === "curriculum") && (
            <CommunityDocsTab
              communityDocsList={communityDocsList}
              onRefresh={fetchCommunityDocs}
              showToast={showToast}
              cloudinaryCloudName={cloudName}
              cloudinaryPreset={uploadPreset}
            />
          )}`;

if (code.includes(tabTarget)) {
  code = code.replace(tabTarget, newTabTarget);
  console.log('CommunityDocsTab rendering updated successfully');
} else {
  console.log('tabTarget not found directly, checking partial...');
  const idx = code.indexOf('{activeTab === "community-docs" && (');
  console.log('idx:', idx);
}

fs.writeFileSync('src/app/admin/page.tsx', code, 'utf8');
console.log('Done updating admin/page.tsx');
