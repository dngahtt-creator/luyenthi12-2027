const fs = require('fs');

const lines = fs.readFileSync('src/app/admin/page.tsx', 'utf8').split('\n');
lines.forEach((line, idx) => {
  if (line.includes('classesList') || line.includes('assignedClasses') || line.includes('docFormAssignedClasses')) {
    if (line.includes('12') || line.includes('map') || line.includes('useState')) {
      console.log(idx + 1, line.trim());
    }
  }
});
