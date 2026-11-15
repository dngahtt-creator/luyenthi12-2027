const fs = require('fs');
const file = 'src/app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace student column
content = content.replace('<td style={{ minWidth: "180px" }}>', '<td style={{ width: "260px", minWidth: "220px" }}>');

// Replace exam title column
const oldExamCol = `<td style={{ width: "260px", minWidth: "220px" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                <span style={{ fontSize: "18px", lineHeight: 1.2 }}>{subjectIcon}</span>
                                <div style={{ overflow: "hidden" }}>
                                  <div 
                                    style={{ 
                                      fontWeight: 700, fontSize: "13.5px", color: "#1e293b", lineHeight: 1.4,
                                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis" 
                                    }}
                                    title={sub.examTitle}
                                  >
                                    {sub.examTitle}
                                  </div>
                                  <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
                                    ⏱️ 50 phút • {totalQ} câu trắc nghiệm
                                  </div>
                                </div>
                              </div>
                            </td>`;

const newExamCol = `<td style={{ width: "340px", minWidth: "280px" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                <span style={{ fontSize: "18px", lineHeight: 1.2 }}>{subjectIcon}</span>
                                <div>
                                  <div 
                                    style={{ 
                                      fontWeight: 700, fontSize: "13.5px", color: "#1e293b", lineHeight: 1.4
                                    }}
                                  >
                                    {sub.examTitle}
                                  </div>
                                  <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
                                    ⏱️ 50 phút • {totalQ} câu trắc nghiệm
                                  </div>
                                </div>
                              </div>
                            </td>`;

content = content.replace(oldExamCol, newExamCol);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated table widths and removed clamp');
