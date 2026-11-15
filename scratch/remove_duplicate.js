const fs = require('fs');
const file = 'src/app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// The duplicate users block starts at 1911 (MỤC 3: HIỂN THỊ...) and ends right before MỤC 4 (learning)
// Let's find the second occurrence of "MỤC 3: HIỂN THỊ DANH SÁCH TÀI KHOẢN ĐÃ ĐĂNG KÍ"
let muc3Count = 0;
let startDelIdx = -1;
let endDelIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('MỤC 3: HIỂN THỊ DANH SÁCH TÀI KHOẢN ĐÃ ĐĂNG KÍ')) {
    muc3Count++;
    if (muc3Count === 2) {
      startDelIdx = i - 1; // including the {/* ===... line above it
    }
  }
  if (startDelIdx !== -1 && lines[i].includes('MỤC 4: QUẢN LÍ HỌC TẬP')) {
    endDelIdx = i - 1;
    break;
  }
}

if (startDelIdx !== -1 && endDelIdx !== -1) {
  lines.splice(startDelIdx, endDelIdx - startDelIdx + 1);
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log('Successfully removed duplicate block from line ' + (startDelIdx+1) + ' to ' + (endDelIdx+1));
} else {
  console.log('Could not find duplicate block bounds', startDelIdx, endDelIdx);
}
