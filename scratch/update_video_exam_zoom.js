const fs = require('fs');

const pageFile = 'src/app/page.tsx';
let code = fs.readFileSync(pageFile, 'utf8');

// Section 1: Vào Học Ngay button
code = code.replace(
  `              <button
                type="button"
                onClick={() => {
                  const target = document.getElementById("exams-section");
                  if (target) target.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "20px",
                  padding: "6px 18px",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                }}
              >
                Vào Học Ngay ➔
              </button>`,
  `              <button
                type="button"
                className={styles.zoomBtn}
                onClick={() => {
                  const target = document.getElementById("exams-section");
                  if (target) target.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "20px",
                  padding: "6px 18px",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                }}
              >
                Vào Học Ngay ➔
              </button>`
);

// Video cards
code = code.replace(
  `{videoCategories.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                >`,
  `{videoCategories.map((cat) => (
                <div
                  key={cat.id}
                  className={styles.zoomCard}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease",
                  }}
                >`
);

// Video button
code = code.replace(
  `                  <div style={{ padding: "0 12px 12px 12px" }}>
                    <button
                      type="button"
                      onClick={() => setActiveCategoryModal(cat)}
                      style={{
                        width: "100%",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        borderRadius: "8px",
                        padding: "7px 0",
                        fontSize: "12.5px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      VÀO HỌC
                    </button>
                  </div>`,
  `                  <div style={{ padding: "0 12px 12px 12px" }}>
                    <button
                      type="button"
                      className={styles.zoomBtn}
                      onClick={() => {
                        setActiveCategoryModal(cat);
                        setActiveSubfolder("all");
                        setFilterItemType("all");
                      }}
                      style={{
                        width: "100%",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        borderRadius: "8px",
                        padding: "7px 0",
                        fontSize: "12.5px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      VÀO HỌC
                    </button>
                  </div>`
);

// Exam cards
code = code.replace(
  `{examCategories.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                >`,
  `{examCategories.map((cat) => (
                <div
                  key={cat.id}
                  className={styles.zoomCard}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease",
                  }}
                >`
);

fs.writeFileSync(pageFile, code, 'utf8');
console.log('Video and Exam zoom effects updated!');
