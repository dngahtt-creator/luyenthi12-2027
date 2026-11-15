const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('C:/App10/src/app/admin/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add state variables if not present
if (!content.includes('selectedLearningClass')) {
  const searchStr = 'const [purgingSubmissions, setPurgingSubmissions] = useState<boolean>(false);';
  const replaceStr = `const [purgingSubmissions, setPurgingSubmissions] = useState<boolean>(false);
  const [selectedLearningClass, setSelectedLearningClass] = useState<string>("12");
  const [learningSortBy, setLearningSortBy] = useState<"class" | "name" | "tn" | "ds" | "tln" | "correct">("class");
  const [learningViewMode, setLearningViewMode] = useState<"overview" | "table">("overview");`;
  content = content.replace(searchStr, replaceStr);
  console.log('Added learning states');
}

// 2. Update sidebar learning button to have the active gradient as in Image 1
const sidebarLearningOld = `<button
            id="tab-btn-learning"
            className={\`\${styles.navItem} \${activeTab === "learning" ? styles.navItemActive : ""}\`}
            onClick={() => {
              setActiveTab("learning");
              if (typeof window !== "undefined") {
                window.history.pushState(null, "", "/admin");
              }
            }}
          >`;

const sidebarLearningNew = `<button
            id="tab-btn-learning"
            className={\`\${styles.navItem} \${activeTab === "learning" ? styles.navItemActive : ""}\`}
            onClick={() => {
              setActiveTab("learning");
              if (typeof window !== "undefined") {
                window.history.pushState(null, "", "/admin");
              }
            }}
            style={activeTab === "learning" ? {
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "#ffffff",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
              fontWeight: 800,
              borderRadius: "12px",
            } : {}}
          >`;

if (content.includes(sidebarLearningOld)) {
  content = content.replace(sidebarLearningOld, sidebarLearningNew);
  console.log('Updated sidebar learning button');
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Initial update complete');
