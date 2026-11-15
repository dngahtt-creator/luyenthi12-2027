const fs = require('fs');
const file = 'src/app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `<div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                      <button type="button" onClick={() => setAssignedClasses(classesList.map(c => c.id))} style={{ background: assignedClasses.length === classesList.length && classesList.length > 0 ? '#2563eb' : '#ffffff', color: assignedClasses.length === classesList.length && classesList.length > 0 ? 'white' : '#475569', border: assignedClasses.length === classesList.length && classesList.length > 0 ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        GIAO CẢ LỚP
                      </button>
                      <button type="button" onClick={() => setAssignedClasses([])} style={{ background: assignedClasses.length === 0 ? '#2563eb' : '#ffffff', color: assignedClasses.length === 0 ? 'white' : '#475569', border: assignedClasses.length === 0 ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        GIAO TỪNG HS
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                      {classesList.length > 0 ? classesList.map((cls) => {
                        const count = allStudentsList.filter(
                          (s) =>
                            s.classId === cls.id ||
                            (s.className && s.className.trim().toLowerCase() === cls.name.trim().toLowerCase())
                        ).length;
                        return (
                          <div 
                            key={cls.id} 
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: assignedClasses.includes(cls.id) ? '2px solid #2563eb' : '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                            onClick={() => {
                              if (assignedClasses.includes(cls.id)) {
                                setAssignedClasses(assignedClasses.filter(id => id !== cls.id));
                              } else {
                                setAssignedClasses([...assignedClasses, cls.id]);
                              }
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input 
                                type="checkbox" 
                                style={{width: '16px', height: '16px', pointerEvents: 'none'}} 
                                checked={assignedClasses.includes(cls.id)}
                                readOnly
                              />
                              <span style={{fontSize: '13px', fontWeight: 700, color: '#334155'}}>{cls.name}</span>
                            </div>
                            <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: 600}}>{count} HS</span>
                          </div>
                        );
                      }) : (
                        <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', padding: '10px', textAlign: 'center' }}>
                          Chưa có lớp nào. Hãy tạo ở mục "Lớp và Học sinh".
                        </div>
                      )}
                    </div>`;

const replacementStr = `<div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                      <button type="button" onClick={() => { setAssignMode('class'); setAssignedClasses(classesList.map(c => c.id)); setExpandedClass(null); }} style={{ background: assignMode === 'class' ? '#2563eb' : '#ffffff', color: assignMode === 'class' ? 'white' : '#475569', border: assignMode === 'class' ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        GIAO CẢ LỚP
                      </button>
                      <button type="button" onClick={() => { setAssignMode('student'); setAssignedClasses([]); }} style={{ background: assignMode === 'student' ? '#2563eb' : '#ffffff', color: assignMode === 'student' ? 'white' : '#475569', border: assignMode === 'student' ? 'none' : '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        GIAO TỪNG HS
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                      {classesList.length > 0 ? classesList.map((cls) => {
                        const classStudents = allStudentsList.filter(
                          (s) =>
                            s.classId === cls.id ||
                            (s.className && s.className.trim().toLowerCase() === cls.name.trim().toLowerCase())
                        );
                        const count = classStudents.length;
                        return (
                          <div key={cls.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div 
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: assignMode === 'class' && assignedClasses.includes(cls.id) ? '2px solid #2563eb' : (assignMode === 'student' && expandedClass === cls.id ? '2px solid #8b5cf6' : '1px solid #e2e8f0'), padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                              onClick={() => {
                                if (assignMode === 'class') {
                                  if (assignedClasses.includes(cls.id)) {
                                    setAssignedClasses(assignedClasses.filter(id => id !== cls.id));
                                  } else {
                                    setAssignedClasses([...assignedClasses, cls.id]);
                                  }
                                } else {
                                  setExpandedClass(expandedClass === cls.id ? null : cls.id);
                                }
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {assignMode === 'class' ? (
                                  <input 
                                    type="checkbox" 
                                    style={{width: '16px', height: '16px', pointerEvents: 'none'}} 
                                    checked={assignedClasses.includes(cls.id)}
                                    readOnly
                                  />
                                ) : (
                                  <span style={{ fontSize: '12px', width: '16px', textAlign: 'center' }}>
                                    {expandedClass === cls.id ? '▼' : '▶'}
                                  </span>
                                )}
                                <span style={{fontSize: '13px', fontWeight: 700, color: '#334155'}}>{cls.name}</span>
                              </div>
                              <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: 600}}>{count} HS</span>
                            </div>
                            
                            {/* Students List Expansion */}
                            {assignMode === 'student' && expandedClass === cls.id && (
                              <div style={{ padding: '8px 14px 8px 30px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', borderRadius: '0 0 8px 8px', marginTop: '-6px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
                                {classStudents.length > 0 ? classStudents.map(st => (
                                  <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => {
                                    if (assignedStudents.includes(st.id)) {
                                      setAssignedStudents(assignedStudents.filter(id => id !== st.id));
                                    } else {
                                      setAssignedStudents([...assignedStudents, st.id]);
                                    }
                                  }}>
                                    <input type="checkbox" style={{width: '14px', height: '14px', pointerEvents: 'none'}} checked={assignedStudents.includes(st.id)} readOnly />
                                    <span style={{fontSize: '12px', color: '#475569', fontWeight: 600}}>{st.fullName}</span>
                                  </div>
                                )) : (
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Không có học sinh</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }) : (
                        <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', padding: '10px', textAlign: 'center' }}>
                          Chưa có lớp nào. Hãy tạo ở mục "Lớp và Học sinh".
                        </div>
                      )}
                    </div>`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully updated interactive student assignment');
} else {
  console.log('Could not find target string in file');
  process.exit(1);
}
