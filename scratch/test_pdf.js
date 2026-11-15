const fs = require('fs');

function buildPdf(title, subject, uploader, desc) {
  const content = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    "4 0 obj << /Length 380 >> stream",
    "BT",
    "/F1 18 Tf",
    "50 780 Td",
    "(TRUONG THPT DTNT THCS & THPT TUY DUC) Tj",
    "0 -30 Td",
    "/F1 14 Tf",
    "(TAI LIEU ON THI THPT QUOC GIA 2026 - 2027) Tj",
    "0 -35 Td",
    "/F1 16 Tf",
    "(" + title.replace(/[()\\]/g, "") + ") Tj",
    "0 -25 Td",
    "/F1 12 Tf",
    "(Mon: " + subject.replace(/[()\\]/g, "") + " - Nguoi bien soan: " + uploader.replace(/[()\\]/g, "") + ") Tj",
    "0 -30 Td",
    "/F1 11 Tf",
    "(" + desc.replace(/[()\\]/g, "") + ") Tj",
    "0 -25 Td",
    "(Tai lieu luu hanh noi bo - Mien phi 100% cho hoc sinh) Tj",
    "ET",
    "endstream",
    "endobj",
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "xref",
    "0 6",
    "0000000000 65535 f ",
    "0000000009 00000 n ",
    "0000000058 00000 n ",
    "0000000115 00000 n ",
    "0000000244 00000 n ",
    "0000000676 00000 n ",
    "trailer << /Size 6 /Root 1 0 R >>",
    "startxref",
    "746",
    "%%EOF"
  ].join("\n");
  return Buffer.from(content, "latin1");
}

const buf = buildPdf("Chuong 3. Tich Phan", "Toan hoc", "FC ZO ZO", "Chuyen de nguyen ham tich phan va ung dung");
fs.writeFileSync("scratch/test_valid.pdf", buf);
console.log("Success! File size:", buf.length);
