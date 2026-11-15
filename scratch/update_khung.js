const fs = require('fs');
const file = 'src/app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = "                {/* RIGHT COLUMN */}";
const endStr = "                  <div style={{ marginTop: 'auto', paddingTop: '10px' }}>";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find start or end index', startIndex, endIndex);
  process.exit(1);
}

const replacement = `                {/* RIGHT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingLeft: '30px', borderLeft: '1px dashed #cbd5e1' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ margin: 0, color: '#ea580c', textTransform: 'uppercase', fontSize: '16px', fontWeight: 800, fontFamily: 'serif, "Times New Roman", Times' }}>KHUNG ĐÁP ÁN</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="button" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#1e3a8a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{fontSize: '14px'}}>📥</span> TẢI FORM
                      </button>
                      <button type="button" style={{ border: 'none', background: '#059669', color: 'white', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{fontSize: '14px'}}>📊</span> NẠP EXCEL
                      </button>
                    </div>
                  </div>

                  <div className={styles.formGroup} style={{ gap: '8px' }}>
                    <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#3b82f6', fontSize: '13px', fontWeight: 800, fontFamily: 'serif, "Times New Roman", Times'}}>PHẦN I: CÂU TRẮC NGHIỆM</label>
                    <textarea className={styles.formInput} style={{minHeight: '100px', resize: 'vertical', padding: '12px', borderRadius: '8px', fontSize: '14px', color: '#334155'}} defaultValue="1D 2B 3C 4C 5A 6D 7C 8A 9B 10D 11B 12B"></textarea>
                  </div>

                  <div className={styles.formGroup} style={{ gap: '8px' }}>
                    <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#d946ef', fontSize: '13px', fontWeight: 800, fontFamily: 'serif, "Times New Roman", Times'}}>PHẦN II: CÂU ĐÚNG/SAI</label>
                    <textarea className={styles.formInput} style={{minHeight: '100px', resize: 'vertical', padding: '12px', borderRadius: '8px', fontSize: '14px', color: '#334155'}} defaultValue="1: Đ Đ Đ S 2: Đ S S S 3: S S Đ Đ 4: S Đ S S"></textarea>
                  </div>

                  <div className={styles.formGroup} style={{ gap: '8px' }}>
                    <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#d97706', fontSize: '13px', fontWeight: 800, fontFamily: 'serif, "Times New Roman", Times'}}>PHẦN III: TRẢ LỜI NGẮN</label>
                    <textarea className={styles.formInput} style={{minHeight: '100px', resize: 'vertical', padding: '12px', borderRadius: '8px', fontSize: '14px', color: '#334155'}} defaultValue="1: 1  2: 85  3: 0.31  4: 136  5: 2.47  6: 32"></textarea>
                  </div>

`;

content = content.slice(0, startIndex) + replacement + content.slice(endIndex);
fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated khung dap an');
