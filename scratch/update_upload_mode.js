const fs = require('fs');
const file = 'src/app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                    <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                      <button type="button" style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🔗</span> Dán Link
                      </button>
                      <button type="button" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>⬆️</span> Upload PDF
                      </button>
                      <button type="button" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🖼️</span> Dán Ảnh
                      </button>
                    </div>
                    <input type="text" className={styles.formInput} placeholder="Link PDF..." />`;

const replacementStr = `                    <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                      <button type="button" onClick={() => setUploadMode('link')} style={{ background: uploadMode === 'link' ? '#2563eb' : '#f8fafc', color: uploadMode === 'link' ? 'white' : '#475569', border: uploadMode === 'link' ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🔗</span> Dán Link
                      </button>
                      <button type="button" onClick={() => setUploadMode('pdf')} style={{ background: uploadMode === 'pdf' ? '#2563eb' : '#f8fafc', color: uploadMode === 'pdf' ? 'white' : '#475569', border: uploadMode === 'pdf' ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>⬆️</span> Upload PDF
                      </button>
                      <button type="button" onClick={() => setUploadMode('image')} style={{ background: uploadMode === 'image' ? '#2563eb' : '#f8fafc', color: uploadMode === 'image' ? 'white' : '#475569', border: uploadMode === 'image' ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🖼️</span> Dán Ảnh
                      </button>
                    </div>
                    {uploadMode === 'link' && <input type="text" className={styles.formInput} placeholder="Nhập Link Google Drive hoặc link PDF..." />}
                    {uploadMode === 'pdf' && <input type="file" accept=".pdf" className={styles.formInput} style={{padding: '9px'}} />}
                    {uploadMode === 'image' && <input type="file" accept="image/*" multiple className={styles.formInput} style={{padding: '9px'}} />}`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully updated interactive upload mode buttons');
} else {
  console.log('Could not find target string in file');
  process.exit(1);
}
