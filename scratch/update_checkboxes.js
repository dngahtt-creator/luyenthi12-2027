const fs = require('fs');
const file = 'src/app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `<div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                      <button type="button" style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        GIAO CẢ LỚP
                      </button>
                      <button type="button" style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
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
                          <div key={cls.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input type="checkbox" style={{width: '16px', height: '16px'}} />
                              <span style={{fontSize: '13px', fontWeight: 700, color: '#334155'}}>{cls.name}</span>
                            </div>
                            <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: 600}}>{count} HS</span>
                          </div>
                        );
                      }) : (`

const replacementStr = `<div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
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
                      }) : (`

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully updated interactive classes');
} else {
  console.log('Could not find target string in file');
  process.exit(1);
}
