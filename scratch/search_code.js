const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (file === 'node_modules' || file === '.next' || file === '.git') return;
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(fullPath));
      } else {
        results.push(fullPath);
      }
    } catch(e) {}
  });
  return results;
}

const files = walk('.');
const keywords = ['MÃ ĐỀ', 'TRUY CẬP', 'Sinh mã', 'Học sinh dùng mã', 'ZQ9HAZ2Y', 'KÝ TỰ', 'mã đề', 'accessCode', 'examCode'];
files.forEach(f => {
  try {
    const content = fs.readFileSync(f, 'utf8');
    keywords.forEach(kw => {
      if (content.toLowerCase().includes(kw.toLowerCase())) {
        console.log(`Match "${kw}" in ${f}`);
      }
    });
  } catch(e) {}
});
