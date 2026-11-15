import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "Không tìm thấy tệp đính kèm" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Chuẩn hóa tên tệp an toàn
    const cleanName = (file.name || "document.pdf")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFilename = `${Date.now()}_${cleanName}`;

    // Đường dẫn thư mục public/uploads
    const uploadsDir = path.join(process.cwd(), "public", "uploads");

    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, uniqueFilename);
      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/uploads/${uniqueFilename}`;

      return NextResponse.json({
        success: true,
        public_id: `local_${uniqueFilename}`,
        url: fileUrl,
        secure_url: fileUrl,
        bytes: file.size,
        format: cleanName.split(".").pop()?.toLowerCase() || "pdf",
        fileName: file.name,
        storageType: "server_storage",
      });
    } catch (fsErr) {
      console.warn("Could not write to public/uploads, fallback to Base64 Data URL:", fsErr);

      // Dự phòng bằng Base64 Data URL nếu môi trường chặn ghi đĩa
      const mimeType = file.type || "application/octet-stream";
      const base64Data = buffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      return NextResponse.json({
        success: true,
        public_id: `base64_${Date.now()}`,
        url: dataUrl,
        secure_url: dataUrl,
        bytes: file.size,
        format: cleanName.split(".").pop()?.toLowerCase() || "pdf",
        fileName: file.name,
        storageType: "data_url",
      });
    }
  } catch (err: any) {
    console.error("API Upload error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Lỗi khi xử lý tải tệp" },
      { status: 500 }
    );
  }
}
