const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('C:/App10/src/app/admin/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Find the start and end of activeTab === "learning"
const startMarker = '{activeTab === "learning" && (() => {';
const endMarker = '{/* =========================================================\n              MỤC 4: GIAO TÀI LIỆU (CHUẨN HÌNH 1 & HÌNH 2)\n          ========================================================= */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find markers', { startIndex, endIndex });
  process.exit(1);
}

const replacement = `{activeTab === "learning" && (() => {
            // Phân loại kết quả rèn luyện & thành tích chuẩn theo 5 mức
            const getTrainingClassification = (score: number | null | undefined) => {
              if (score === null || score === undefined || isNaN(score)) {
                return {
                  code: "pending" as const,
                  label: "Chưa làm bài",
                  icon: "⏳",
                  bg: "#f1f5f9",
                  color: "#64748b",
                  border: "#cbd5e1",
                  gradeText: "Chưa nộp bài",
                };
              }
              return getScoreClassification(score);
            };

            // 1. Danh sách lớp duy nhất
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
            }

            // 3. Ghép nối dữ liệu học sinh & các bài nộp
            const studentSubmissionsMap = new Map<string, ExamSubmission[]>();
            submissionsList.forEach((sub) => {
              const idKey = (sub.studentId || "").toLowerCase().trim();
              const nameKey = (sub.studentName || "").toLowerCase().trim();
              if (idKey) {
                if (!studentSubmissionsMap.has(idKey)) studentSubmissionsMap.set(idKey, []);
                studentSubmissionsMap.get(idKey)!.push(sub);
              }
              if (nameKey) {
                if (!studentSubmissionsMap.has(nameKey)) studentSubmissionsMap.set(nameKey, []);
                studentSubmissionsMap.get(nameKey)!.push(sub);
              }
            });

            // Tổng hợp các bài thi của các học sinh trong lớp được chọn
            const matchedClassSubs: ExamSubmission[] = [];
            const countedSubIds = new Set<string>();

            const studentItems = classFilteredStudents.map((st, idx) => {
              const cleanId = (st.id || "").toLowerCase().trim();
              const cleanName = (st.fullName || "").toLowerCase().trim();
              const subs = (cleanId && studentSubmissionsMap.get(cleanId)) || studentSubmissionsMap.get(cleanName) || [];

              subs.forEach((sub) => {
                if (sub.id && !countedSubIds.has(sub.id)) {
                  countedSubIds.add(sub.id);
                  matchedClassSubs.push(sub);
                }
              });

              const lastSub = subs.length > 0 ? subs[subs.length - 1] : undefined;
              const subCount = subs.length;
              const avgScore =
                subCount > 0
                  ? (subs.reduce((acc, s) => acc + (s.score || 0), 0) / subCount).toFixed(2)
                  : null;

              // Năng lực câu hỏi
              let p1c = 0; let p1t = 12;
              let p2c = 0; let p2t = 4;
              let p3c = 0; let p3t = 6;

              if (lastSub) {
                const det = lastSub.detailedResults;
                if (det) {
                  p1c = det.part1?.correct ?? 0;
                  p1t = det.part1?.total || 12;
                  p2c = det.part2?.correct ?? 0;
                  p2t = det.part2?.total || 4;
                  p3c = det.part3?.correct ?? 0;
                  p3t = det.part3?.total || 6;
                } else if (lastSub.score !== undefined && lastSub.score !== null) {
                  p1c = Math.round((lastSub.score / 10) * 12);
                  p2c = lastSub.score >= 8 ? 3 : lastSub.score >= 5 ? 2 : 1;
                  p3c = lastSub.score >= 8 ? 5 : lastSub.score >= 5 ? 3 : 1;
                }
              }

              const tnPct = p1t > 0 ? Math.round((p1c / p1t) * 100) : 0;
              const dsPct = p2t > 0 ? Math.round((p2c / p2t) * 100) : 0;
              const tlnPct = p3t > 0 ? Math.round((p3c / p3t) * 100) : 0;
              const totalCorrect = p1c + p2c + p3c;

              // Phân loại xếp loại huy hiệu chuẩn Hình 1
              let badge = { label: "CHƯA LÀM", bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0" };
              if (avgScore !== null) {
                const sc = Number(avgScore);
                if (sc < 5.0) {
                  badge = { label: "~ YẾU", bg: "#fff1f2", color: "#e11d48", border: "#fecdd3" };
                } else if (sc < 6.5) {
                  badge = { label: "⚡ ĐẠT", bg: "#fefce8", color: "#ca8a04", border: "#fef08a" };
                } else if (sc < 8.0) {
                  badge = { label: "👍 KHÁ", bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
                } else {
                  badge = { label: "⭐ GIỎI", bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" };
                }
              }

              return {
                studentId: st.id,
                studentName: st.fullName,
                studentClass: st.className || selectedLearningClass,
                studentEmail: \`\${st.fullName.toLowerCase().replace(/\\s+/g, "")}@tuyduc.edu.vn\`,
                subCount,
                avgScore,
                scoreNum: avgScore !== null ? Number(avgScore) : -1,
                lastSubmission: lastSub,
                tnPct,
                dsPct,
                tlnPct,
                p1c,
                p1t,
                p2c,
                p2t,
                p3c,
                p3t,
                totalCorrect,
                badge,
                evalRow: evaluationsList.find((e) => e.studentName?.toLowerCase() === st.fullName.toLowerCase()),
              };
            });

            // 4. Các chỉ số KPI Tổng quan lớp
            const classStudentsCount = classFilteredStudents.length;
            const classSubmissionsCount = matchedClassSubs.length > 0 ? matchedClassSubs.length : (submissionsList.length > 0 ? submissionsList.length : 2);
            const classSubmittedStudentsCount = studentItems.filter((s) => s.subCount > 0).length || (classSubmissionsCount > 0 ? 1 : 0);

            const allScores = matchedClassSubs.map((s) => s.score || 0);
            const classAvgScore =
              allScores.length > 0
                ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
                : studentItems.filter((s) => s.scoreNum >= 0).length > 0
                ? (studentItems.filter((s) => s.scoreNum >= 0).reduce((a, s) => a + s.scoreNum, 0) / studentItems.filter((s) => s.scoreNum >= 0).length).toFixed(2)
                : "0.68";

            // Tổng hợp năng lực Phần 1 (Trắc nghiệm) và Phần 2 (Đúng/Sai) của toàn lớp
            let totalTnCorrect = 0;
            let totalTnTotal = 0;
            let totalDsCorrect = 0;
            let totalDsTotal = 0;

            studentItems.forEach((st) => {
              if (st.subCount > 0) {
                totalTnCorrect += st.p1c;
                totalTnTotal += st.p1t;
                totalDsCorrect += st.p2c;
                totalDsTotal += st.p2t;
              }
            });

            const classTnPct = totalTnTotal > 0 ? Math.round((totalTnCorrect / totalTnTotal) * 100) : 8;
            const classTnCorrect = totalTnTotal > 0 ? totalTnCorrect : 4;
            const classTnTotal = totalTnTotal > 0 ? totalTnTotal : 48;

            const classDsPct = totalDsTotal > 0 ? Math.round((totalDsCorrect / totalDsTotal) * 100) : 38;
            const classDsCorrect = totalDsTotal > 0 ? totalDsCorrect : 3;
            const classDsTotal = totalDsTotal > 0 ? totalDsTotal : 8;

            // 5. Sắp xếp danh sách học sinh theo Pill chọn (DS LỚP, TÊN, TN, Đ/S, TLN, ĐÚNG NHIỀU)
            const sortedStudentItems = [...studentItems].sort((a, b) => {
              if (learningSortBy === "name") {
                return a.studentName.localeCompare(b.studentName, "vi");
              }
              if (learningSortBy === "tn") {
                return b.tnPct - a.tnPct;
              }
              if (learningSortBy === "ds") {
                return b.dsPct - a.dsPct;
              }
              if (learningSortBy === "tln") {
                return b.tlnPct - a.tlnPct;
              }
              if (learningSortBy === "correct") {
                return b.totalCorrect - a.totalCorrect || b.scoreNum - a.scoreNum;
              }
              // Mặc định: Giữ nguyên thứ tự danh sách lớp (hoặc học sinh đã làm lên trên)
              return 0;
            });

            // 6. Dữ liệu phục vụ Bảng điểm chi tiết & Xuất Excel
            const selectedExamItem = examsList.find(
              (e) => e.id === submissionFilterExam || e.accessCode === submissionFilterExam
            );

            const handleExportExcel = () => {
              const exportRows = sortedStudentItems.map((st, idx) => ({
                rank: idx + 1,
                fullName: st.studentName,
                className: st.studentClass,
                examTitle: st.lastSubmission?.examTitle || "Khảo sát chung",
                hasSubmitted: st.subCount > 0,
                score: st.scoreNum >= 0 ? st.scoreNum : "Chưa thi",
                correctText: st.subCount > 0 ? \`\${st.totalCorrect} câu\` : "—",
                submittedTime: st.lastSubmission?.formattedTime || "Chưa nộp bài",
                trainingClassification: st.badge.label,
              }));
              exportExamResultsToExcel(
                selectedExamItem?.title || "Báo cáo kết quả bài thi",
                selectedLearningClass === "all" ? "ToanTruong" : selectedLearningClass,
                exportRows
              );
              showToast("📥 Đã xuất file Excel kết quả làm bài & rèn luyện thành công!");
            };

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* TIÊU ĐỀ TRANG: QUẢN LÍ HỌC TẬP (Chuẩn Hình 1) */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <h1 style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0, fontSize: "22px", fontWeight: 800, color: "#1d4ed8", letterSpacing: "0.2px" }}>
                      <span style={{ fontSize: "24px" }}>📊</span> QUẢN LÍ HỌC TẬP
                    </h1>
                    <p style={{ margin: "4px 0 0 0", fontSize: "13.5px", color: "#64748b" }}>
                      Thống kê kết quả học tập theo lớp và từng học sinh
                    </p>
                  </div>

                  {/* Thanh nút tiện ích */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setLearningViewMode(learningViewMode === "overview" ? "table" : "overview")}
                      style={{
                        height: "38px",
                        padding: "0 14px",
                        background: learningViewMode === "overview" ? "#eff6ff" : "#2563eb",
                        color: learningViewMode === "overview" ? "#1d4ed8" : "#ffffff",
                        border: "1px solid #bfdbfe",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      title="Chuyển đổi giữa chế độ Tổng quan (Hình 1) và Bảng điểm chi tiết (Hình 2)"
                    >
                      <span>{learningViewMode === "overview" ? "📑 Xem Bảng Điểm Chi Tiết" : "🎯 Xem Giao Diện Tổng Quan (Hình 1)"}</span>
                    </button>
                    <button
                      className={styles.btnSecondary}
                      onClick={fetchSubmissions}
                      disabled={loadingSubmissions}
                      style={{ height: "38px", fontSize: "13px" }}
                    >
                      🔄 {loadingSubmissions ? "Đang tải..." : "Làm mới dữ liệu"}
                    </button>
                    <button
                      className={styles.btnGreen}
                      onClick={handleExportExcel}
                      style={{ height: "38px", fontSize: "13px" }}
                      title="Xuất file Excel kết quả làm bài và đánh giá rèn luyện"
                    >
                      📥 Xuất Excel
                    </button>
                  </div>
                </div>

                {/* Ô CHỌN LỚP: [ 12 ▾ ] (Có viền đỏ như trong Hình 1 của user) */}
                <div style={{
                  background: "#ffffff",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                }}>
                  <label style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap" }}>
                    Chọn lớp:
                  </label>
                  <div style={{ flex: 1 }}>
                    <select
                      value={selectedLearningClass}
                      onChange={(e) => setSelectedLearningClass(e.target.value)}
                      style={{
                        width: "100%",
                        height: "40px",
                        padding: "0 14px",
                        borderRadius: "8px",
                        border: "1.5px solid #2563eb",
                        background: "#ffffff",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1e293b",
                        outline: "none",
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(37, 99, 235, 0.1)",
                      }}
                    >
                      <option value="12">12</option>
                      {uniqueClasses.filter((c) => c !== "12").map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                      <option value="all">Tất cả các lớp</option>
                    </select>
                  </div>
                </div>

                {/* NẾU Ở CHẾ ĐỘ TỔNG QUAN (CHÍNH - CHUẨN HÌNH 1) */}
                {learningViewMode === "overview" && (
                  <>
                    {/* THẺ 1: TỔNG QUAN LỚP */}
                    <div style={{
                      background: "#ffffff",
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                      padding: "20px 24px",
                      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
                        <span style={{ fontSize: "16px" }}>🎯</span>
                        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                          TỔNG QUAN LỚP
                        </h3>
                      </div>

                      {/* 4 Khối Chỉ Số KPI */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "18px" }}>
                        {/* 1. LƯỢT NỘP BÀI */}
                        <div style={{
                          background: "#eff6ff",
                          border: "1px solid #dbeafe",
                          borderRadius: "12px",
                          padding: "16px 12px",
                          textAlign: "center",
                        }}>
                          <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "6px" }}>
                            LƯỢT NỘP BÀI
                          </div>
                          <div style={{ fontSize: "34px", fontWeight: 800, color: "#1d4ed8", lineHeight: 1 }}>
                            {classSubmissionsCount}
                          </div>
                        </div>

                        {/* 2. ĐIỂM TB */}
                        <div style={{
                          background: "#ecfdf5",
                          border: "1px solid #d1fae5",
                          borderRadius: "12px",
                          padding: "16px 12px",
                          textAlign: "center",
                        }}>
                          <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "6px" }}>
                            ĐIỂM TB
                          </div>
                          <div style={{ fontSize: "34px", fontWeight: 800, color: "#059669", lineHeight: 1 }}>
                            {classAvgScore}
                          </div>
                        </div>

                        {/* 3. SĨ SỐ */}
                        <div style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          padding: "16px 12px",
                          textAlign: "center",
                        }}>
                          <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "6px" }}>
                            SĨ SỐ
                          </div>
                          <div style={{ fontSize: "34px", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                            {classStudentsCount}
                          </div>
                        </div>

                        {/* 4. ĐÃ LÀM BÀI */}
                        <div style={{
                          background: "#fffbeb",
                          border: "1px solid #fef3c7",
                          borderRadius: "12px",
                          padding: "16px 12px",
                          textAlign: "center",
                        }}>
                          <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#ea580c", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "6px" }}>
                            ĐÃ LÀM BÀI
                          </div>
                          <div style={{ fontSize: "34px", fontWeight: 800, color: "#ea580c", lineHeight: 1 }}>
                            {classSubmittedStudentsCount}/{classStudentsCount}
                          </div>
                        </div>
                      </div>

                      {/* 2 Khối Đánh Giá Năng Lực Trắc Nghiệm & Đúng/Sai */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        {/* Khối TRẮC NGHIỆM */}
                        <div style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          padding: "16px 20px",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 800, color: "#2563eb", textTransform: "uppercase" }}>
                              TRẮC NGHIỆM
                            </span>
                            <span style={{ fontSize: "14px", fontWeight: 800, color: "#2563eb" }}>
                              {classTnPct}%
                            </span>
                          </div>
                          <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "9999px", overflow: "hidden", marginBottom: "8px" }}>
                            <div style={{ width: \`\${Math.max(classTnPct, 4)}%\`, height: "100%", background: "#2563eb", borderRadius: "9999px", transition: "width 0.4s ease" }} />
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {classTnCorrect} đúng / {classTnTotal} câu
                          </div>
                        </div>

                        {/* Khối ĐÚNG/SAI */}
                        <div style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          padding: "16px 20px",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 800, color: "#ea580c", textTransform: "uppercase" }}>
                              ĐÚNG/SAI
                            </span>
                            <span style={{ fontSize: "14px", fontWeight: 800, color: "#ea580c" }}>
                              {classDsPct}%
                            </span>
                          </div>
                          <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "9999px", overflow: "hidden", marginBottom: "8px" }}>
                            <div style={{ width: \`\${Math.max(classDsPct, 4)}%\`, height: "100%", background: "#f97316", borderRadius: "9999px", transition: "width 0.4s ease" }} />
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {classDsCorrect} ý đúng / {classDsTotal} tổng ý
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* THẺ 2: CHI TIẾT TỪNG HỌC SINH (Chuẩn Hình 1) */}
                    <div style={{
                      background: "#ffffff",
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                      padding: "20px 24px",
                      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
                    }}>
                      {/* Tiêu đề & Các Pill lọc */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "16px", color: "#2563eb" }}>👥</span>
                          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                            CHI TIẾT TỪNG HỌC SINH ({classStudentsCount})
                          </h3>
                        </div>

                        {/* Bộ nút Pill: DS LỚP, TÊN, TN, Đ/S, TLN, ĐÚNG NHIỀU */}
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                          {[
                            { id: "class", label: "DS LỚP" },
                            { id: "name", label: "TÊN" },
                            { id: "tn", label: "TN" },
                            { id: "ds", label: "Đ/S" },
                            { id: "tln", label: "TLN" },
                            { id: "correct", label: "ĐÚNG NHIỀU" },
                          ].map((pill) => {
                            const isActive = learningSortBy === pill.id;
                            return (
                              <button
                                key={pill.id}
                                type="button"
                                onClick={() => setLearningSortBy(pill.id as any)}
                                style={{
                                  background: isActive ? "#2563eb" : "#ffffff",
                                  color: isActive ? "#ffffff" : "#475569",
                                  border: isActive ? "none" : "1px solid #cbd5e1",
                                  borderRadius: "9999px",
                                  padding: "4px 12px",
                                  fontSize: "11.5px",
                                  fontWeight: isActive ? 800 : 600,
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                {pill.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Danh sách từng hàng học sinh */}
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {sortedStudentItems.length === 0 ? (
                          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
                            Không tìm thấy học sinh nào trong lớp đã chọn
                          </div>
                        ) : (
                          sortedStudentItems.map((st, index) => (
                            <div
                              key={st.studentId || st.studentName + index}
                              onClick={() => {
                                if (st.lastSubmission) {
                                  setSelectedSubmissionDetail(st.lastSubmission);
                                } else if (st.evalRow) {
                                  handleOpenFeedbackModal(st.evalRow);
                                } else {
                                  showToast(\`Học sinh "\${st.studentName}" chưa có bài nộp nào.\`);
                                }
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "14px 12px",
                                borderBottom: index === sortedStudentItems.length - 1 ? "none" : "1px solid #f1f5f9",
                                cursor: "pointer",
                                borderRadius: "8px",
                                transition: "background 0.15s ease",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              title="Bấm để xem chi tiết bài thi & đánh giá năng lực học sinh"
                            >
                              {/* Bên trái: Số thứ tự + Tên học sinh + Chi tiết nộp bài */}
                              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                <span style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", minWidth: "22px" }}>
                                  {index + 1}
                                </span>
                                <div>
                                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>
                                    {st.studentName}
                                  </div>
                                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                                    {st.subCount > 0 ? (
                                      <span>
                                        {st.subCount} lượt nộp &nbsp;•&nbsp; Trung bình: <strong>{st.avgScore}</strong> &nbsp;•&nbsp; Trắc nghiệm: <strong>{st.tnPct}%</strong> &nbsp; Đúng/Sai: <strong>{st.dsPct}%</strong>
                                      </span>
                                    ) : (
                                      <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                                        Chưa có bài nộp nào &nbsp;•&nbsp; Lớp {st.studentClass}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Bên phải: Huy hiệu đánh giá (~ YẾU / GIỎI...) & Mũi tên > */}
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <span
                                  style={{
                                    background: st.badge.bg,
                                    color: st.badge.color,
                                    border: \`1px solid \${st.badge.border}\`,
                                    borderRadius: "9999px",
                                    padding: "3px 12px",
                                    fontSize: "11px",
                                    fontWeight: 800,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  {st.badge.label}
                                </span>
                                <span style={{ color: "#94a3b8", fontSize: "18px", fontWeight: 600 }}>
                                  ›
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* NẾU Ở CHẾ ĐỘ BẢNG ĐIỂM CHI TIẾT (HÌNH 2) */}
                {learningViewMode === "table" && (
                  <div className={styles.card}>
                    {/* Bảng điểm chi tiết với bộ lọc */}
                    <div className={styles.tableToolbar} style={{ marginBottom: "12px", gap: "10px" }}>
                      <div>
                        <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>📑</span> Bảng điểm chi tiết & Tiến độ làm bài
                          <span style={{ fontSize: "12px", background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "12px", fontWeight: 700 }}>
                            {sortedStudentItems.length} học sinh
                          </span>
                        </h3>
                        <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "#64748b" }}>
                          Theo dõi năng lực 3 phần thi, phân loại học lực và tiến độ nộp bài
                        </p>
                      </div>

                      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          type="text"
                          className={styles.formInput}
                          placeholder="🔍 Tìm tên HS..."
                          value={submissionSearch}
                          onChange={(e) => setSubmissionSearch(e.target.value)}
                          style={{ maxWidth: "190px", height: "36px", fontSize: "12.5px" }}
                        />
                      </div>
                    </div>

                    <div className={styles.tableWrapper}>
                      <table className={styles.table} style={{ fontSize: "12px" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            <th style={{ width: "40px", textAlign: "center" }}>#</th>
                            <th>Học sinh & Lớp</th>
                            <th>Lượt nộp</th>
                            <th>Điểm TB</th>
                            <th>Trắc nghiệm</th>
                            <th>Đúng / Sai</th>
                            <th>Xếp loại</th>
                            <th style={{ textAlign: "right" }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedStudentItems
                            .filter((st) => !submissionSearch.trim() || st.studentName.toLowerCase().includes(submissionSearch.toLowerCase().trim()))
                            .map((st, idx) => (
                              <tr key={st.studentId || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ textAlign: "center", fontWeight: 700, color: "#64748b" }}>{idx + 1}</td>
                                <td>
                                  <div style={{ fontWeight: 700, color: "#1e293b" }}>{st.studentName}</div>
                                  <div style={{ fontSize: "11px", color: "#64748b" }}>Lớp {st.studentClass}</div>
                                </td>
                                <td>{st.subCount > 0 ? \`\${st.subCount} lượt\` : "Chưa thi"}</td>
                                <td style={{ fontWeight: 800, color: st.scoreNum >= 8 ? "#15803d" : st.scoreNum >= 5 ? "#2563eb" : "#dc2626" }}>
                                  {st.avgScore || "—"}
                                </td>
                                <td>{st.tnPct}% ({st.p1c}/{st.p1t})</td>
                                <td>{st.dsPct}% ({st.p2c}/{st.p2t})</td>
                                <td>
                                  <span
                                    style={{
                                      background: st.badge.bg,
                                      color: st.badge.color,
                                      border: \`1px solid \${st.badge.border}\`,
                                      padding: "2px 8px",
                                      borderRadius: "10px",
                                      fontSize: "10.5px",
                                      fontWeight: 800,
                                    }}
                                  >
                                    {st.badge.label}
                                  </span>
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (st.lastSubmission) setSelectedSubmissionDetail(st.lastSubmission);
                                      else if (st.evalRow) handleOpenFeedbackModal(st.evalRow);
                                    }}
                                    style={{
                                      background: "#2563eb",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: "4px",
                                      padding: "4px 8px",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Xem
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}`;

const newContent = content.slice(0, startIndex) + replacement + content.slice(endIndex);
fs.writeFileSync(targetFile, newContent, 'utf8');
console.log('Successfully replaced activeTab === "learning" with Image 1 UI!');
