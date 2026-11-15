const fs = require('fs');

const serviceFile = 'src/lib/learningCategoryService.ts';
let code = fs.readFileSync(serviceFile, 'utf8');

// 1. Update LearningItem interface
const oldInterface = `export interface LearningItem {
  id: string;
  categoryId: string; // Thuộc mục nào
  categoryName: string; // Tên mục
  type: SectionCategoryType; // "document" | "video" | "exam"
  lessonNumber: number | string; // Bài số (VD: 1, 2, 3...)
  title: string; // Tên bài / Tên mục
  contentUrl?: string; // Link YouTube, Drive, PDF, Docs, MP4...
  fileName?: string;
  description?: string;
  createdAt: string;
  isPublished: boolean;
}`;

const newInterface = `export interface LearningItem {
  id: string;
  categoryId: string; // Thuộc mục nào
  categoryName: string; // Tên mục
  subfolder?: string; // Tên thư mục nhỏ / chuyên đề
  itemType?: "read" | "exam"; // "read" (Bài đọc) | "exam" (Bài thi)
  fileFormat?: "PDF" | "DOCX";
  contentBody?: string; // Nội dung tóm tắt để đọc trực tiếp
  type: SectionCategoryType; // "document" | "video" | "exam"
  lessonNumber: number | string; // Bài số (VD: 1, 2, 3...)
  title: string; // Tên bài / Tên mục
  contentUrl?: string; // Link YouTube, Drive, PDF, Docs, MP4...
  fileName?: string;
  description?: string;
  createdAt: string;
  isPublished: boolean;
}`;

if (code.includes(oldInterface)) {
  code = code.replace(oldInterface, newInterface);
  console.log('LearningItem interface updated');
} else {
  console.log('oldInterface not matched directly, continuing...');
}

// 2. Add downloadDocxFile and downloadPdfFile functions before the aliases at end
const helperFunctions = `
// =========================================================
// TIỆN ÍCH TẢI VỀ FILE WORD (DOCX) VÀ FILE PDF CHO HỌC SINH
// =========================================================
export function downloadDocxFile(title: string, description?: string, categoryName?: string, contentBody?: string) {
  const safeTitle = title.replace(/[<>:"/\\\\|?*]/g, '').trim();
  const htmlContent = \`
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>\${title}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 13.5pt; line-height: 1.6; color: #1e293b; margin: 40px; }
        .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
        h1 { color: #1e3a8a; font-size: 20pt; margin: 0 0 8px 0; text-transform: uppercase; }
        .subhead { color: #64748b; font-size: 11pt; font-style: italic; }
        .box { background: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 18px; margin: 16px 0; border-radius: 4px; }
        .section-title { color: #0284c7; font-size: 15pt; font-weight: bold; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        ul { margin: 8px 0; padding-left: 24px; }
        li { margin-bottom: 6px; }
        .footer { margin-top: 40px; text-align: center; font-size: 10pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="font-weight: bold; color: #2563eb; font-size: 12pt; letter-spacing: 1px;">BỘ GIÁO DỤC VÀ ĐÀO TẠO • TRƯỜNG THPT TUY ĐỨC</div>
        <h1>\${title}</h1>
        <div class="subhead">Môn: \${categoryName || 'Ôn Thi Tốt Nghiệp THPT 2026'} • Định dạng: Microsoft Word (.docx)</div>
      </div>

      <div class="section-title">I. TÓM TẮT TRỌNG TÂM KIẾN THỨC BÀI HỌC</div>
      <div class="box">
        <p><strong>Mục tiêu:</strong> \${description || 'Nắm vững kiến thức trọng tâm, kỹ năng giải quyết các dạng câu hỏi từ nhận biết đến vận dụng cao 9+.'}</p>
        <p>\${contentBody || 'Tài liệu biên soạn bám sát cấu trúc đề thi tốt nghiệp THPT theo định dạng mới. Học sinh ôn tập kỹ các lý thuyết nền tảng, công thức giải nhanh và chú ý các bẫy thường gặp.'}</p>
      </div>

      <div class="section-title">II. CÁC DẠNG BÀI TẬP VÀ PHƯƠNG PHÁP GIẢI NHANH</div>
      <ul>
        <li><strong>Dạng 1:</strong> Câu hỏi trắc nghiệm nhiều phương án lựa chọn (Nhận biết & Thông hiểu) - Xử lý trong 30-45 giây.</li>
        <li><strong>Dạng 2:</strong> Câu hỏi trắc nghiệm Đúng/Sai (Vận dụng) - Đọc kỹ dữ kiện đề bài, kiểm tra từng phát biểu.</li>
        <li><strong>Dạng 3:</strong> Câu hỏi trắc nghiệm trả lời ngắn (Vận dụng cao) - Yêu cầu tính toán chính xác, làm tròn theo đúng hướng dẫn.</li>
      </ul>

      <div class="section-title">III. HƯỚNG DẪN RÈN LUYỆN VÀ THI THỬ</div>
      <p>Học sinh truy cập hệ thống website để làm bài thi trực tuyến bấm giờ, xem đáp án chi tiết và nhận xét phân tích từ giáo viên.</p>

      <div class="footer">
        Hệ Thống Học Liệu & Thi Trực Tuyến THPT Tuy Đức • Tài liệu lưu hành nội bộ ôn thi tốt nghiệp 2026
      </div>
    </body>
    </html>
  \`;
  const blob = new Blob(['\\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = \`[TaiLieu]_\${safeTitle}.docx\`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPdfFile(title: string, description?: string, categoryName?: string, contentBody?: string) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(\`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>\${title} - Bản In PDF</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 14px; margin-bottom: 20px; }
          .school { font-size: 13px; font-weight: 700; color: #2563eb; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 4px; }
          h1 { color: #0f172a; margin: 6px 0; font-size: 22px; text-transform: uppercase; }
          .meta { font-size: 13px; color: #64748b; font-style: italic; }
          .badge { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; margin-top: 6px; }
          .section { margin-top: 20px; }
          .section-title { font-size: 16px; font-weight: 800; color: #0369a1; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 10px; }
          .box { background: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 6px; font-size: 14px; margin-bottom: 14px; }
          ul { padding-left: 20px; margin: 8px 0; }
          li { margin-bottom: 6px; font-size: 14px; }
          .btn-print { background: #2563eb; color: #ffffff; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(37,99,235,0.25); }
          @media print { .btn-print { display: none; } }
        </style>
      </head>
      <body>
        <button class="btn-print" onclick="window.print()">🖨️ In / Lưu file PDF (Nhấn Ctrl + P)</button>
        <div class="header">
          <div class="school">Trường THPT Tuy Đức • Tổ Chuyên Môn GDPT 2026</div>
          <h1>\${title}</h1>
          <div class="meta">Môn: <strong>\${categoryName || 'Lớp 12'}</strong> • Đơn vị biên soạn: Cổng Học Liệu Mở Tuy Đức</div>
          <div class="badge">ĐỀ ÁN ÔN THI TỐT NGHIỆP THPT QUỐC GIA 12</div>
        </div>
        <div class="section">
          <div class="section-title">I. MỤC TIÊU VÀ TÓM TẮT KIẾN THỨC CỐT LÕI</div>
          <div class="box">
            <p><strong>Nội dung:</strong> \${description || 'Tài liệu phương pháp và bộ chuyên đề trọng tâm ôn thi tốt nghiệp THPT chuẩn cấu trúc đề thi mới.'}</p>
            <p>\${contentBody || 'Bao gồm các kiến thức lý thuyết cơ bản, sơ đồ tư duy hệ thống và các công thức giải nhanh giúp học sinh tiết kiệm 40% thời gian làm bài.'}</p>
          </div>
        </div>
        <div class="section">
          <div class="section-title">II. CÁC NỘI DUNG TRỌNG TÂM CẦN NẮM VỮNG</div>
          <ul>
            <li>Hệ thống toàn bộ định nghĩa, tính chất, định lý và công thức then chốt.</li>
            <li>Kỹ thuật phân tích câu hỏi, nhận diện bẫy đề thi và các sai lầm học sinh thường gặp.</li>
            <li>Bộ câu hỏi trắc nghiệm tự luyện phân hóa từ 7 điểm đến 9+ điểm.</li>
          </ul>
        </div>
        <div class="section">
          <div class="section-title">III. BÀI TẬP VÀ THI THỬ TRỰC TUYẾN</div>
          <p style="font-size: 14px;">Học sinh có thể truy cập website để thực hành làm bài thi trắc nghiệm trực tuyến với hệ thống chấm điểm tự động và lời giải chi tiết.</p>
        </div>
        <script>
          setTimeout(() => { window.print(); }, 400);
        </script>
      </body>
      </html>
    \`);
    printWindow.document.close();
  }
}
`;

if (!code.includes('export function downloadDocxFile')) {
  code = code.replace('// Aliases for compatibility', helperFunctions + '\n// Aliases for compatibility');
  console.log('downloadDocxFile and downloadPdfFile added');
}

fs.writeFileSync(serviceFile, code, 'utf8');
console.log('serviceFile updated successfully!');
