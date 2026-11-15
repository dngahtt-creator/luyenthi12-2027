const fs = require('fs');
const file = 'src/app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = '{activeTab === "exams" && (';
const endStr = '          {/* =========================================================\n              MỤC 4: QUẢN LÍ HỌC TẬP';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find start or end index', startIndex, endIndex);
  process.exit(1);
}

const replacement = `{activeTab === "exams" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Form Add Exam - New Design matching Image 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', background: '#ffffff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                {/* LEFT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#64748b', fontSize: '12px', fontWeight: 800}}>Tên bài tập / Đề thi</label>
                    <input 
                      type="text" 
                      className={styles.formInput} 
                      placeholder="Nhập tên bài thi..." 
                      value={examForm.title}
                      onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                    />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#64748b', fontSize: '12px', fontWeight: 800}}>Khối lớp</label>
                      <select className={styles.formSelect}>
                        <option>Lớp 12</option>
                        <option>Lớp 11</option>
                        <option>Lớp 10</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#64748b', fontSize: '12px', fontWeight: 800}}>Môn học</label>
                      <select 
                        className={styles.formSelect}
                        value={examForm.subject}
                        onChange={(e) => setExamForm({ ...examForm, subject: e.target.value, subjectName: subjectNameMap[e.target.value] || "Toán học" })}
                      >
                        <option value="toan">Toán học</option>
                        <option value="van">Ngữ văn</option>
                        <option value="anh">Tiếng Anh</option>
                        <option value="ly">Vật lí</option>
                        <option value="hoa">Hóa học</option>
                        <option value="sinh">Sinh học</option>
                        <option value="su">Lịch sử</option>
                        <option value="dia">Địa lí</option>
                        <option value="ktpl">GDKT & PL</option>
                        <option value="tin">Tin học</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#64748b', fontSize: '12px', fontWeight: 800}}>Tải lên đề</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                      <button type="button" style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🔗</span> Dán Link
                      </button>
                      <button type="button" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>⬆️</span> Upload PDF
                      </button>
                      <button type="button" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🖼️</span> Dán Ảnh
                      </button>
                    </div>
                    <input type="text" className={styles.formInput} placeholder="Link PDF..." />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#64748b', fontSize: '12px', fontWeight: 800}}>Thời gian (Phút)</label>
                      <input type="number" className={styles.formInput} defaultValue="90" style={{textAlign: 'center', fontSize: '16px', fontWeight: 800}} />
                    </div>
                    <div style={{ padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', height: '42px', background: '#f8fafc' }}>
                      <input type="checkbox" defaultChecked style={{ width: '16px', height: '16px', accentColor: '#0ea5e9' }} />
                      <span style={{fontSize: '12px', fontWeight: 700, color: '#334155'}}>Cho HS xem đ.án sau thi</span>
                    </div>
                  </div>

                  <div style={{ padding: '16px', border: '1.5px solid #fde047', borderRadius: '12px', background: '#fefce8' }}>
                    <label style={{color: '#ca8a04', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', fontSize: '13px'}}>
                      <span>⚙️</span> Cấu hình điểm
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center'}}>
                        <span style={{fontSize: '10px', fontWeight: 800, color: '#3b82f6'}}>TỔNG P.1</span>
                        <input type="number" defaultValue={10} style={{width: '40px', height: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, color: '#334155'}} />
                      </div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center'}}>
                        <span style={{fontSize: '10px', fontWeight: 800, color: '#3b82f6'}}>TỔNG P.3</span>
                        <input type="text" defaultValue="3" style={{width: '40px', height: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, color: '#334155'}} />
                      </div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center'}}>
                        <span style={{fontSize: '10px', fontWeight: 800, color: '#475569'}}>P2: 1 Ý</span>
                        <input type="text" defaultValue="0.1" style={{width: '40px', height: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, color: '#d97706'}} />
                      </div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center'}}>
                        <span style={{fontSize: '10px', fontWeight: 800, color: '#475569'}}>P2: 2 Ý</span>
                        <input type="text" defaultValue="0.2" style={{width: '40px', height: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, color: '#d97706'}} />
                      </div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center'}}>
                        <span style={{fontSize: '10px', fontWeight: 800, color: '#475569'}}>P2: 3 Ý</span>
                        <input type="text" defaultValue="0.5" style={{width: '40px', height: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, color: '#d97706'}} />
                      </div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center'}}>
                        <span style={{fontSize: '10px', fontWeight: 800, color: '#475569'}}>P2: 4 Ý</span>
                        <input type="text" defaultValue="1" style={{width: '40px', height: '32px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 700, color: '#d97706'}} />
                      </div>
                    </div>
                    <div style={{fontSize: '10px', color: '#94a3b8', marginTop: '10px', textAlign: 'center'}}>
                      P2 mặc định: 0.1đ/1 ý, 0.25đ/2 ý, 0.5đ/3 ý, 1.0đ/4 ý
                    </div>
                  </div>

                  <div style={{ padding: '16px', border: '1.5px solid #bfdbfe', borderRadius: '12px', background: '#eff6ff' }}>
                    <label style={{color: '#1d4ed8', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', fontSize: '13px'}}>
                      <span>👤</span> Giao đề đến
                    </label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                      <button type="button" style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        GIAO CẢ LỚP
                      </button>
                      <button type="button" style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        GIAO TỪNG HS
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input type="checkbox" style={{width: '16px', height: '16px'}} />
                          <span style={{fontSize: '13px', fontWeight: 700, color: '#334155'}}>11</span>
                        </div>
                        <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: 600}}>0 HS</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input type="checkbox" style={{width: '16px', height: '16px'}} />
                          <span style={{fontSize: '13px', fontWeight: 700, color: '#334155'}}>12</span>
                        </div>
                        <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: 600}}>37 HS</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingLeft: '30px', borderLeft: '1px dashed #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#ea580c', textTransform: 'uppercase', fontSize: '15px', fontWeight: 800 }}>Khung đáp án</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="button" style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '8px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📥</span> TẢI FORM
                      </button>
                      <button type="button" style={{ border: 'none', background: '#10b981', color: 'white', padding: '8px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📄</span> NẠP EXCEL
                      </button>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#3b82f6', fontSize: '13px', fontWeight: 800}}>Phần I: Câu trắc nghiệm</label>
                    <textarea className={styles.formInput} style={{minHeight: '90px', resize: 'vertical'}} placeholder="VD: 1A 2B 3C 4D"></textarea>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#d946ef', fontSize: '13px', fontWeight: 800}}>Phần II: Câu đúng/sai</label>
                    <textarea className={styles.formInput} style={{minHeight: '90px', resize: 'vertical'}} placeholder="VD: 1: Đ S Đ S  2: S S Đ Đ"></textarea>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#eab308', fontSize: '13px', fontWeight: 800}}>Phần III: Trả lời ngắn</label>
                    <textarea className={styles.formInput} style={{minHeight: '90px', resize: 'vertical'}} placeholder="VD: 1: 45  2: -0.5"></textarea>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                    <button 
                      type="button" 
                      onClick={(e) => {
                         e.preventDefault();
                         handleCreateExam(e);
                      }}
                      style={{ 
                        width: '100%', 
                        padding: '16px', 
                        fontSize: '15px', 
                        fontWeight: 800, 
                        background: '#2563eb', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                      }}
                    >
                      TẠO BÀI TẬP/ĐỀ THI
                    </button>
                  </div>
                </div>
              </div>

              {/* List of active exams - New Design matching Image 2 */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
                    <span style={{ fontSize: '18px' }}>📖</span> DANH SÁCH BÀI TẬP/ĐỀ THI
                  </h3>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>LỚP:</span>
                      <select style={{ border: 'none', background: 'transparent', fontSize: '13px', outline: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        <option>Tất cả</option>
                        <option>12</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>MÔN:</span>
                      <select style={{ border: 'none', background: 'transparent', fontSize: '13px', outline: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        <option>Tất cả</option>
                        <option>Toán học</option>
                      </select>
                    </div>
                    <button style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      🔄
                    </button>
                  </div>
                </div>

                <div style={{ padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '48px', color: '#1e293b' }}>🔍</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      VUI LÒNG CHỌN BỘ LỌC LỚP HOẶC MÔN
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                      Dữ liệu chỉ được tải khi bạn xác định khu vực tìm kiếm để tối ưu hiệu suất.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
\n`;

content = content.slice(0, startIndex) + replacement + content.slice(endIndex);
fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated exams tab');
