const fs = require('fs');
const file = 'src/app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = '{activeTab === "classes" && (';
const endStr = '{/* =========================================================\n              M?C 3:';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find start or end index', startIndex, endIndex);
  process.exit(1);
}

const replacement = `{activeTab === "classes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <input
                ref={quickFileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: "none" }}
                onChange={handleQuickFileUpload}
              />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', background: '#ffffff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                {/* LEFT COLUMN: Manage Classes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#1e3a8a', textTransform: 'uppercase', fontSize: '15px', fontWeight: 800 }}>🏫 Nhập Lớp Học Mới</h3>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} style={{textTransform: 'uppercase', color: '#64748b', fontSize: '12px', fontWeight: 800}}>Tên Lớp Học</label>
                    <input 
                      type="text" 
                      className={styles.formInput} 
                      placeholder="VD: 12A1, 11B2..." 
                      value={quickClassName}
                      onChange={(e) => setQuickClassName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleQuickCreateClass();
                      }}
                    />
                  </div>

                  <div>
                    <button 
                      type="button" 
                      onClick={handleQuickCreateClass}
                      disabled={quickUploadLoading}
                      style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}
                    >
                      ➕ TẠO LỚP HỌC
                    </button>
                  </div>

                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#475569', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>📚 Danh sách lớp hiện có:</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {classesList.map((cls) => {
                        const count = allStudentsList.filter(
                          (s) =>
                            s.classId === cls.id ||
                            (s.className && s.className.trim().toLowerCase() === cls.name.trim().toLowerCase())
                        ).length;
                        return (
                          <button
                            key={cls.id}
                            onClick={() => {
                              setSelectedClassId(cls.id);
                              setQuickClassName(cls.name);
                            }}
                            style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '6px', 
                              padding: '6px 12px', borderRadius: '20px', 
                              fontSize: '12.5px', fontWeight: 700, 
                              border: selectedClassId === cls.id ? '1px solid #2563eb' : '1px solid #e2e8f0', 
                              background: selectedClassId === cls.id ? '#eff6ff' : '#ffffff', 
                              color: selectedClassId === cls.id ? '#1d4ed8' : '#475569', 
                              cursor: 'pointer', transition: 'all 0.2s ease'
                            }}
                          >
                            <span>{cls.name}</span>
                            <span style={{background: selectedClassId === cls.id ? '#dbeafe' : '#f1f5f9', padding: '2px 6px', borderRadius: '10px', fontSize: '10.5px'}}>{count} HS</span>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClass(cls.id, cls.name);
                              }}
                              style={{ color: '#ef4444', fontWeight: 900, marginLeft: '4px', cursor: 'pointer' }}
                            >
                              ✕
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Manage Students */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingLeft: '30px', borderLeft: '1px dashed #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#ea580c', textTransform: 'uppercase', fontSize: '15px', fontWeight: 800 }}>👥 Nhập Danh Sách Học Sinh</h3>
                  </div>

                  <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', fontSize: '13px', fontWeight: 700 }}>
                      <span>Tải lên danh sách học sinh từ file Excel hoặc CSV để thêm hàng loạt.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={handleDownloadExcelTemplateClick}
                        style={{ background: '#ffffff', color: '#10b981', border: '1px solid #10b981', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', flex: 1 }}
                      >
                        📥 TẢI MẪU EXCEL
                      </button>
                      <button 
                        onClick={() => quickFileInputRef.current?.click()}
                        disabled={quickUploadLoading || !quickClassName}
                        style={{ background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', fontWeight: 800, cursor: (!quickClassName) ? 'not-allowed' : 'pointer', flex: 1, opacity: (!quickClassName) ? 0.6 : 1 }}
                      >
                        {quickUploadLoading ? "ĐANG XỬ LÝ..." : "📄 NẠP EXCEL / CSV"}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                    <button 
                      onClick={() => handleOpenImportModal()}
                      style={{ 
                        width: '100%', 
                        padding: '16px', 
                        fontSize: '15px', 
                        fontWeight: 800, 
                        background: '#f8fafc', 
                        color: '#2563eb', 
                        border: '1.5px solid #bfdbfe', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                      }}
                    >
                      🔍 XEM TRƯỚC / IMPORT CHI TIẾT
                    </button>
                  </div>
                </div>
              </div>

              {/* Student List View */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
                    <span style={{ fontSize: '18px' }}>🧑‍🎓</span> DANH SÁCH HỌC SINH {currentClass ? \`LỚP \${currentClass.name}\` : ""}
                  </h3>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '18px' }}>🔍</span>
                      <input 
                        type="text" 
                        placeholder="Tìm kiếm..." 
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: '13px', outline: 'none', fontWeight: 600, width: '150px' }} 
                      />
                    </div>
                    <button onClick={fetchClassesAndStudents} style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      🔄
                    </button>
                    <button onClick={handleOpenCreateStudent} style={{ border: 'none', background: '#2563eb', color: 'white', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                      ➕ THÊM
                    </button>
                  </div>
                </div>

                <div className={styles.tableContainer} style={{ padding: '0 24px 24px 24px' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: "80px", textAlign: "center", textTransform: 'uppercase' }}>TT</th>
                        <th style={{ textTransform: 'uppercase' }}>Họ và tên</th>
                        <th style={{ textTransform: 'uppercase' }}>Ngày sinh</th>
                        <th style={{ textAlign: "right", textTransform: 'uppercase' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentClassStudents.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center", padding: "60px 0" }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔍</div>
                            <div style={{ fontSize: "14px", color: "#64748b", fontWeight: 700, textTransform: 'uppercase' }}>Chưa có học sinh nào.</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Vui lòng chọn lớp hoặc nạp danh sách học sinh.</div>
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((st, idx) => (
                          <tr key={st.id}>
                            <td style={{ textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                              {st.orderNumber || idx + 1}
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span className={styles.studentAvatarCircle} style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", width: '30px', height: '30px', fontSize: '12px' }}>
                                  {(st.fullName || "H").charAt(0).toUpperCase()}
                                </span>
                                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "13.5px" }}>
                                  {st.fullName}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: "13px", color: "#475569", fontWeight: 600 }}>
                                🎂 {st.dob || "---"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                className={styles.btnSecondary}
                                onClick={() => handleOpenEditStudent(st)}
                                style={{ height: "28px", fontSize: "11.5px", padding: "0 10px", marginRight: "6px" }}
                              >
                                ✏️
                              </button>
                              <button
                                className={styles.btnDanger}
                                onClick={() => handleDeleteStudent(st.id, st.fullName)}
                                style={{ height: "28px", fontSize: "11.5px", padding: "0 10px" }}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
\n`;

content = content.slice(0, startIndex) + replacement + content.slice(endIndex);
fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated classes tab');
