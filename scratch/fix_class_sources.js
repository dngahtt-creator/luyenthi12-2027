const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('C:/App10/src/app/admin/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Change initial state of selectedLearningClass and docFormAssignedClasses
content = content.replace(
  'const [selectedLearningClass, setSelectedLearningClass] = useState<string>("12");',
  'const [selectedLearningClass, setSelectedLearningClass] = useState<string>("all");'
);

content = content.replace(
  'const [docFormAssignedClasses, setDocFormAssignedClasses] = useState<string[]>(["12"]);',
  'const [docFormAssignedClasses, setDocFormAssignedClasses] = useState<string[]>([]);'
);

// 2. Change handleOpenAddDoc and handleEditDocument
content = content.replace(
  'setDocFormAssignedClasses(["12"]);',
  'setDocFormAssignedClasses(classesList.length > 0 ? [classesList[0].name] : []);'
);

content = content.replace(
  'setDocFormAssignedClasses(doc.assignedClasses && doc.assignedClasses.length > 0 ? doc.assignedClasses : ["12"]);',
  'setDocFormAssignedClasses(doc.assignedClasses && doc.assignedClasses.length > 0 ? doc.assignedClasses : (classesList.length > 0 ? [classesList[0].name] : []));'
);

// 3. Change Giao Tai Lieu JSX: only use classes from classesList
const oldDocFormClassPills = `{docFormAssignMode === "class" && (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                          {["12", ...classesList.map((c) => c.name)].filter((v, i, a) => a.indexOf(v) === i).map((className) => {
                            const isSelected = docFormAssignedClasses.includes(className);
                            return (
                              <button
                                key={className}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setDocFormAssignedClasses(docFormAssignedClasses.filter((c) => c !== className));
                                  } else {
                                    setDocFormAssignedClasses([...docFormAssignedClasses, className]);
                                  }
                                }}
                                style={{
                                  padding: "5px 14px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  border: isSelected ? "1.5px solid #9333ea" : "1px solid #cbd5e1",
                                  background: isSelected ? "#f3e8ff" : "#ffffff",
                                  color: isSelected ? "#7e22ce" : "#334155",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                {className}
                              </button>
                            );
                          })}
                        </div>
                      )}`;

const newDocFormClassPills = `{docFormAssignMode === "class" && (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                          {classesList.length === 0 ? (
                            <span style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
                              Chưa có lớp học nào trong hệ thống. Vui lòng tạo lớp ở mục 1. QUẢN LÍ LỚP - HỌC SINH.
                            </span>
                          ) : (
                            classesList.map((c) => c.name).filter((v, i, a) => a.indexOf(v) === i).map((className) => {
                              const isSelected = docFormAssignedClasses.includes(className);
                              return (
                                <button
                                  key={className}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setDocFormAssignedClasses(docFormAssignedClasses.filter((c) => c !== className));
                                    } else {
                                      setDocFormAssignedClasses([...docFormAssignedClasses, className]);
                                    }
                                  }}
                                  style={{
                                    padding: "5px 14px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    border: isSelected ? "1.5px solid #9333ea" : "1px solid #cbd5e1",
                                    background: isSelected ? "#f3e8ff" : "#ffffff",
                                    color: isSelected ? "#7e22ce" : "#334155",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  {className}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}`;

if (content.includes(oldDocFormClassPills)) {
  content = content.replace(oldDocFormClassPills, newDocFormClassPills);
  console.log("Replaced docForm class pills");
} else {
  console.warn("Could not find oldDocFormClassPills directly, trying fuzzy");
}

// 4. Change activeTab === "learning" uniqueClasses and select options
const oldUniqueClassesBlock = `            // 1. Danh sách lớp duy nhất
            const uniqueClasses = Array.from(
              new Set([
                ...classesList.map((c) => c.name),
                ...allStudentsList.map((s) => s.className || ""),
              ])
            ).filter(Boolean);

            // 2. Học sinh theo lớp được chọn trong "Chọn lớp:" (Mặc định lớp "12" như trong Hình 1)
            let classFilteredStudents = allStudentsList;
            if (selectedLearningClass !== "all") {
              if (selectedLearningClass === "12") {
                const grade12Students = allStudentsList.filter(
                  (s) => (s.className && s.className.startsWith("12")) || s.className === "12"
                );
                classFilteredStudents = grade12Students.length > 0 ? grade12Students : allStudentsList;
              } else {
                classFilteredStudents = allStudentsList.filter(
                  (s) =>
                    (s.className && s.className.trim().toLowerCase() === selectedLearningClass.trim().toLowerCase()) ||
                    s.classId === selectedLearningClass
                );
              }
            }`;

const newUniqueClassesBlock = `            // 1. Danh sách lớp duy nhất chỉ lấy từ hệ thống mà giáo viên đã đưa lên
            const uniqueClasses = Array.from(
              new Set(classesList.map((c) => c.name).filter(Boolean))
            );

            // 2. Học sinh theo lớp được chọn trong "Chọn lớp:"
            let classFilteredStudents = allStudentsList;
            if (selectedLearningClass !== "all") {
              classFilteredStudents = allStudentsList.filter(
                (s) =>
                  (s.className && s.className.trim().toLowerCase() === selectedLearningClass.trim().toLowerCase()) ||
                  s.classId === selectedLearningClass
              );
            }`;

if (content.includes(oldUniqueClassesBlock)) {
  content = content.replace(oldUniqueClassesBlock, newUniqueClassesBlock);
  console.log("Replaced uniqueClassesBlock");
}

const oldLearningSelectOptions = `<option value="12">12</option>
                      {uniqueClasses.filter((c) => c !== "12").map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                      <option value="all">Tất cả các lớp</option>`;

const newLearningSelectOptions = `<option value="all">Tất cả các lớp</option>
                      {uniqueClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          Lớp {cls}
                        </option>
                      ))}`;

if (content.includes(oldLearningSelectOptions)) {
  content = content.replace(oldLearningSelectOptions, newLearningSelectOptions);
  console.log("Replaced learningSelectOptions");
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log("All class sources updated to strictly reflect classesList!");
