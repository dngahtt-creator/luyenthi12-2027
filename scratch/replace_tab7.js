const fs = require('fs');
const file = 'src/app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const startTag = 'TAB 7: TẠO & QUẢN LÝ GIÁO TRÌNH';
const endTag = '{activeTab === "community-docs" && (';

const startIdx = content.lastIndexOf('{/* =========================================================', content.indexOf(startTag));
const endIdx = content.indexOf(endTag);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `          {/* =========================================================
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

`;
  content = content.slice(0, startIdx) + replacement + content.slice(endIdx);
  fs.writeFileSync(file, content, 'utf8');
  console.log('REPLACED TAB 7 SUCCESSFULLY!');
} else {
  console.log('INDICES NOT FOUND', startIdx, endIdx);
}
