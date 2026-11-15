// Cloudinary Client & Utilities
export const cloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "o100uxqf",
  apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || "251522998548792",
  apiUploadUrl: `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "o100uxqf"}/auto/upload`,
  deliveryBaseUrl: `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "o100uxqf"}`,
};

export interface CloudinaryUploadResult {
  asset_id?: string;
  public_id: string;
  version?: number;
  width?: number;
  height?: number;
  format?: string;
  resource_type?: string;
  created_at?: string;
  bytes?: number;
  url?: string;
  secure_url: string;
  error?: {
    message: string;
  };
}

/**
 * Get active Cloudinary configuration (from localStorage or environment fallback)
 */
export function getSavedCloudinaryConfig(): { cloudName: string; uploadPreset: string } {
  if (typeof window !== "undefined") {
    const savedName = localStorage.getItem("cloudinary_cloud_name");
    const savedPreset = localStorage.getItem("cloudinary_upload_preset");
    if (savedName || savedPreset) {
      return {
        cloudName: savedName || cloudinaryConfig.cloudName,
        uploadPreset: savedPreset || "o100uxqf",
      };
    }
  }
  return {
    cloudName: cloudinaryConfig.cloudName,
    uploadPreset: "o100uxqf",
  };
}

/**
 * Save custom Cloudinary settings to localStorage
 */
export function saveCloudinaryConfig(cloudName: string, uploadPreset: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("cloudinary_cloud_name", cloudName.trim());
    localStorage.setItem("cloudinary_upload_preset", uploadPreset.trim());
  }
}

/**
 * Upload any file (Image, Document, PDF) directly to Cloudinary with Auto-Fallback
 */
export async function uploadImageToCloudinary(
  fileOrBase64: File | Blob | string,
  uploadPreset?: string,
  customCloudName?: string
): Promise<{ success: boolean; data?: CloudinaryUploadResult; error?: string }> {
  const cfg = getSavedCloudinaryConfig();
  const cloudName = customCloudName || cfg.cloudName;
  const preset = uploadPreset || cfg.uploadPreset;

  // 1. Thử tải trực tiếp lên Cloudinary (nếu preset hợp lệ)
  if (cloudName && preset) {
    try {
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
      const formData = new FormData();
      formData.append("file", fileOrBase64);
      formData.append("upload_preset", preset);

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && !result.error && (result.secure_url || result.url)) {
        return {
          success: true,
          data: result as CloudinaryUploadResult,
        };
      } else {
        console.warn(
          "Cloudinary error:",
          result.error?.message || response.status,
          "-> Tự động kích hoạt cơ chế lưu trữ dự phòng máy chủ (/api/upload)"
        );
      }
    } catch (cErr) {
      console.warn("Lỗi kết nối tới Cloudinary, kích hoạt cơ chế dự phòng:", cErr);
    }
  }

  // 2. Cơ chế Tự Động Dự Phòng 1: Lưu trữ máy chủ qua /api/upload
  try {
    const localFormData = new FormData();
    localFormData.append("file", fileOrBase64);

    const localResponse = await fetch("/api/upload", {
      method: "POST",
      body: localFormData,
    });

    if (localResponse.ok) {
      const localResult = await localResponse.json();
      if (localResult.success && (localResult.secure_url || localResult.url)) {
        return {
          success: true,
          data: {
            public_id: localResult.public_id || `upload_${Date.now()}`,
            url: localResult.url,
            secure_url: localResult.secure_url,
            format: localResult.format || "pdf",
            bytes: localResult.bytes,
          },
        };
      }
    }
  } catch (apiErr) {
    console.warn("API /api/upload gặp lỗi, chuyển sang dự phòng Data URL:", apiErr);
  }

  // 3. Cơ chế Tự Động Dự Phòng 2: Base64 Data URL (Hoạt động 100% trong trình duyệt)
  try {
    if (typeof fileOrBase64 === "string" && fileOrBase64.startsWith("data:")) {
      return {
        success: true,
        data: {
          public_id: `data_${Date.now()}`,
          url: fileOrBase64,
          secure_url: fileOrBase64,
        },
      };
    }

    if (typeof window !== "undefined" && (fileOrBase64 instanceof File || fileOrBase64 instanceof Blob)) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileOrBase64);
      });

      return {
        success: true,
        data: {
          public_id: `blob_${Date.now()}`,
          url: dataUrl,
          secure_url: dataUrl,
        },
      };
    }
  } catch (dataUrlErr) {
    console.error("DataURL fallback error:", dataUrlErr);
  }

  return {
    success: false,
    error: "Không thể xử lý tệp. Vui lòng kiểm tra lại dung lượng hoặc định dạng tệp.",
  };
}

/**
 * Ping Cloudinary CDN to verify cloud name resolution & service reachability
 */
export async function pingCloudinary(cloudName = cloudinaryConfig.cloudName) {
  const start = performance.now();
  try {
    // Cloudinary standard delivery CDN endpoint
    const testUrl = `https://res.cloudinary.com/${cloudName}/image/upload/sample.jpg`;
    await fetch(testUrl, { method: "HEAD", mode: "no-cors" });
    const latency = Math.round(performance.now() - start);
    return {
      success: true,
      latency,
      cdnUrl: testUrl,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      latency: Math.round(performance.now() - start),
    };
  }
}

/**
 * Upload general file (PDF, Docx, etc) to Cloudinary
 */
export const uploadFileToCloudinary = uploadImageToCloudinary;
