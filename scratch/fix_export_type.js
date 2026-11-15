const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('C:/App10/src/app/admin/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

content = content.replace(
  'score: st.scoreNum >= 0 ? st.scoreNum : "Chưa thi",',
  'score: st.scoreNum >= 0 ? st.scoreNum : null,'
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Fixed export score type');
