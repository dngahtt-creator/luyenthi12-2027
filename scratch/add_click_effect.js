const fs = require('fs');

// 1. Add CSS class to page.module.css
const cssFile = 'src/app/admin/page.module.css';
let cssContent = fs.readFileSync(cssFile, 'utf8');
if (!cssContent.includes('.clickEffect')) {
  cssContent += `\n\n.clickEffect {\n  transition: transform 0.1s ease;\n}\n.clickEffect:active {\n  transform: scale(0.92);\n}\n`;
  fs.writeFileSync(cssFile, cssContent, 'utf8');
}

// 2. Add className={styles.clickEffect} to the buttons in page.tsx
const tsxFile = 'src/app/admin/page.tsx';
let tsxContent = fs.readFileSync(tsxFile, 'utf8');

// The 3 Tải lên đề buttons
const target1 = `<button type="button" onClick={() => setUploadMode('link')} style={{ background: uploadMode === 'link' ? '#2563eb' : '#f8fafc', color: uploadMode === 'link' ? 'white' : '#475569', border: uploadMode === 'link' ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>`;
const replace1 = `<button type="button" className={styles.clickEffect} onClick={() => setUploadMode('link')} style={{ background: uploadMode === 'link' ? '#2563eb' : '#f8fafc', color: uploadMode === 'link' ? 'white' : '#475569', border: uploadMode === 'link' ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>`;

const target2 = `<button type="button" onClick={() => setUploadMode('pdf')} style={{ background: uploadMode === 'pdf' ? '#2563eb' : '#f8fafc', color: uploadMode === 'pdf' ? 'white' : '#475569', border: uploadMode === 'pdf' ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>`;
const replace2 = `<button type="button" className={styles.clickEffect} onClick={() => setUploadMode('pdf')} style={{ background: uploadMode === 'pdf' ? '#2563eb' : '#f8fafc', color: uploadMode === 'pdf' ? 'white' : '#475569', border: uploadMode === 'pdf' ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>`;

const target3 = `<button type="button" onClick={() => setUploadMode('image')} style={{ background: uploadMode === 'image' ? '#2563eb' : '#f8fafc', color: uploadMode === 'image' ? 'white' : '#475569', border: uploadMode === 'image' ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>`;
const replace3 = `<button type="button" className={styles.clickEffect} onClick={() => setUploadMode('image')} style={{ background: uploadMode === 'image' ? '#2563eb' : '#f8fafc', color: uploadMode === 'image' ? 'white' : '#475569', border: uploadMode === 'image' ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>`;

// Tải form button
const target4 = `<button type="button" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#1e3a8a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>`;
const replace4 = `<button type="button" className={styles.clickEffect} style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#1e3a8a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>`;

// Nạp excel label
const target5 = `<label style={{ border: 'none', background: '#059669', color: 'white', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>`;
const replace5 = `<label className={styles.clickEffect} style={{ border: 'none', background: '#059669', color: 'white', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>`;


tsxContent = tsxContent.replace(target1, replace1);
tsxContent = tsxContent.replace(target2, replace2);
tsxContent = tsxContent.replace(target3, replace3);
tsxContent = tsxContent.replace(target4, replace4);
tsxContent = tsxContent.replace(target5, replace5);

fs.writeFileSync(tsxFile, tsxContent, 'utf8');
console.log('Successfully added click effects');
