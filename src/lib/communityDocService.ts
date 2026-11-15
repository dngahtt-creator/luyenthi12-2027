import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

export interface CommunityDocumentItem {
  id: string;
  title: string;
  subject: string; // "toan" | "ly" | "hoa" | "sinh" | "anh" | "van" | "tin" | "su" | "dia" | "all"
  subjectName: string;
  grade: string; // "Lớp 12" | "Lớp 11" | "Lớp 10" | "Toàn cấp THPT"
  category: string; // "Chuyên đề trọng tâm" | "Đề cương & Tóm tắt" | "Sơ đồ tư duy & Công thức" | "Đề thi thử chọn lọc" | "Sách & Tài liệu tham khảo" | "Sổ tay phương pháp"
  format: "PDF" | "DOCX" | "PPTX" | "ZIP" | "LINK";
  fileUrl: string;
  fileName?: string;
  fileSize: string; // e.g. "3.5 MB", "12.8 MB"
  author: string; // e.g. "Thầy Nguyễn Hữu Toán", "Tổ Chuyên Môn Tuy Đức", "HSG Quốc Gia"
  authorRole: "Giáo viên" | "Học sinh" | "Ban chuyên môn" | "Cộng tác viên";
  downloads: number;
  likes: number;
  views: number;
  description: string;
  tags: string[]; // e.g. ["2026", "HOT", "Công thức nhanh", "Miễn phí", "Trọng tâm"]
  isVerified: boolean; // Huy hiệu đã kiểm duyệt bởi GV/Ban chuyên môn
  isFeatured: boolean; // Ghim lên mục nổi bật
  status: "APPROVED" | "PENDING" | "REJECTED"; // Trạng thái kiểm duyệt
  previewText?: string; // Tóm tắt trích đoạn nội dung tài liệu
  createdAt: string;
  updatedAt: string;
}

const LOCAL_COMMUNITY_DOCS_KEY = "school_community_documents_cache_v1";

function broadcastCommunityDocsUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("school_community_docs_updated"));
    window.dispatchEvent(new Event("school_data_updated"));
  }
}

// Danh sách tài liệu cộng đồng mẫu chất lượng cao & đa dạng môn học
export const DEFAULT_COMMUNITY_DOCUMENTS: CommunityDocumentItem[] = [
  {
    id: "comm-doc-toan-01",
    title: "Tuyển Tập 100 Câu Vận Dụng Cao Hàm Số & Đạo Hàm 12 - Chuẩn Format 2026",
    subject: "toan",
    subjectName: "Toán học",
    grade: "Lớp 12",
    category: "Chuyên đề trọng tâm",
    format: "PDF",
    fileUrl: "https://res.cloudinary.com/o100uxqf/image/upload/sample.jpg",
    fileName: "Tuyen_Tap_VDC_Ham_So_Toan_12_2026.pdf",
    fileSize: "4.8 MB",
    author: "Thầy Lê Quốc Dũng",
    authorRole: "Giáo viên",
    downloads: 1420,
    likes: 386,
    views: 4210,
    description: "Bộ tài liệu phân loại chi tiết các dạng toán tham số m, cực trị hàm hợp, tiếp tuyến và min-max ứng dụng thực tế theo đúng đề minh họa 2026 của Bộ GD&ĐT.",
    tags: ["2026", "HOT", "Vận dụng cao", "Điểm 9+"],
    isVerified: true,
    isFeatured: true,
    status: "APPROVED",
    previewText: "Tổng hợp 100 câu bài toán hàm số phân loại mức 8.5 - 10 điểm. Có hướng dẫn bấm máy tính Casio 580VNX, giải chi tiết từng bước và bảng đáp án đối chiếu.",
    createdAt: "2026-03-10",
    updatedAt: "2026-03-10",
  },
  {
    id: "comm-doc-ly-02",
    title: "Sơ Đồ Tư Duy & Toàn Bộ Công Thức Vật Lý 12 Ôn Thi Tốt Nghiệp THPT",
    subject: "ly",
    subjectName: "Vật lý",
    grade: "Lớp 12",
    category: "Sơ đồ tư duy & Công thức",
    format: "PDF",
    fileUrl: "https://res.cloudinary.com/o100uxqf/image/upload/sample.jpg",
    fileName: "So_Do_Tu_Duy_Vat_Ly_12_Full.pdf",
    fileSize: "6.2 MB",
    author: "Cô Trần Thị Mai Linh",
    authorRole: "Giáo viên",
    downloads: 2150,
    likes: 540,
    views: 6300,
    description: "Infographic sơ đồ tư duy tóm lược trọn vẹn 7 chuyên đề Vật lý 12 mới: Dao động cơ, Sóng cơ, Điện xoay chiều, Sóng điện từ, Sóng ánh sáng, Lượng tử và Hạt nhân.",
    tags: ["Sơ đồ tư duy", "Công thức nhanh", "Ôn cấp tốc"],
    isVerified: true,
    isFeatured: true,
    status: "APPROVED",
    previewText: "Hệ thống hóa trực quan, đầy đủ đơn vị và dấu hiệu nhận biết dạng bài. Giúp học sinh nắm vững lý thuyết và các bẫy đề thi hay gặp.",
    createdAt: "2026-03-05",
    updatedAt: "2026-03-05",
  },
  {
    id: "comm-doc-hoa-03",
    title: "Cẩm Nang 50 Phương Pháp Giải Nhanh Hóa Học Hữu Cơ & Vô Cơ",
    subject: "hoa",
    subjectName: "Hóa học",
    grade: "Lớp 12",
    category: "Sổ tay phương pháp",
    format: "DOCX",
    fileUrl: "https://res.cloudinary.com/o100uxqf/image/upload/sample.jpg",
    fileName: "Cam_Nang_50_Phuong_Phap_Giai_Nhanh_Hoa.docx",
    fileSize: "3.1 MB",
    author: "CLB Hóa Học THPT Tuy Đức",
    authorRole: "Ban chuyên môn",
    downloads: 980,
    likes: 245,
    views: 3120,
    description: "Bảo toàn electron, bảo toàn khối lượng, đồng đẳng hóa, dồn chất, quy đổi este đa chức. Kèm theo ví dụ minh họa và bài tập tự luyện có lời giải.",
    tags: ["Dồn chất", "Đồng đẳng hóa", "Bí kíp 9+"],
    isVerified: true,
    isFeatured: false,
    status: "APPROVED",
    previewText: "Tập hợp các kỹ thuật giải bài toán Este, Peptit, Hợp chất chứa Nitơ và Kim loại chuyển tiếp chỉ trong 30-45 giây mỗi câu.",
    createdAt: "2026-02-28",
    updatedAt: "2026-02-28",
  },
  {
    id: "comm-doc-anh-04",
    title: "1000 Từ Vựng & Thành Ngữ Trọng Tâm Đề Thi Tốt Nghiệp THPT Tiếng Anh",
    subject: "anh",
    subjectName: "Tiếng Anh",
    grade: "Toàn cấp THPT",
    category: "Đề cương & Tóm tắt",
    format: "PDF",
    fileUrl: "https://res.cloudinary.com/o100uxqf/image/upload/sample.jpg",
    fileName: "1000_Tu_Vung_Idioms_Tieng_Anh_2026.pdf",
    fileSize: "5.4 MB",
    author: "Thầy Alex Nguyễn & Tổ Ngoại Ngữ",
    authorRole: "Giáo viên",
    downloads: 3200,
    likes: 890,
    views: 9400,
    description: "Bộ từ vựng B1 - B2 - C1 bám sát chủ đề sách giáo khoa mới Global Success & Friends Global. Có phiên âm, dịch nghĩa, ví dụ ngữ cảnh và dạng bài Collocations.",
    tags: ["Từ vựng", "Idioms", "Collocations", "HOT"],
    isVerified: true,
    isFeatured: true,
    status: "APPROVED",
    previewText: "Cung cấp trọn vẹn vốn từ vựng cho bài đọc hiểu (Reading Comprehension), hoàn thành đoạn văn (Cloze test) và phát hiện lỗi sai thường gặp.",
    createdAt: "2026-03-01",
    updatedAt: "2026-03-01",
  },
  {
    id: "comm-doc-van-05",
    title: "Sổ Tay Dẫn Chứng Xã Hội & Sơ Đồ Nghị Luận Văn Học Đổi Mới 2026",
    subject: "van",
    subjectName: "Ngữ văn",
    grade: "Lớp 12",
    category: "Sổ tay phương pháp",
    format: "PDF",
    fileUrl: "https://res.cloudinary.com/o100uxqf/image/upload/sample.jpg",
    fileName: "So_Tay_Dan_Chung_NLXH_Van_12.pdf",
    fileSize: "4.2 MB",
    author: "Cô Phạm Thanh Hằng",
    authorRole: "Giáo viên",
    downloads: 1870,
    likes: 412,
    views: 5100,
    description: "Cập nhật hơn 60 dẫn chứng xã hội tiêu biểu năm 2025 - 2026 về công nghệ AI, lối sống xanh, khát vọng cống hiến, cùng cấu trúc đoạn văn 200 chữ đạt điểm tối đa.",
    tags: ["Nghị luận xã hội", "Dẫn chứng mới", "Đạt điểm 9+"],
    isVerified: true,
    isFeatured: false,
    status: "APPROVED",
    previewText: "Tuyển chọn dẫn chứng thời sự chọn lọc, đa lĩnh vực: công nghệ số, tinh thần tình nguyện, văn hóa truyền thống và khởi nghiệp sáng tạo của giới trẻ.",
    createdAt: "2026-02-20",
    updatedAt: "2026-02-20",
  },
  {
    id: "comm-doc-sinh-06",
    title: "Chuyên Đề Di Truyền Học & Sinh Thái Học Ứng Dụng Thực Tiễn 2026",
    subject: "sinh",
    subjectName: "Sinh học",
    grade: "Lớp 12",
    category: "Chuyên đề trọng tâm",
    format: "PDF",
    fileUrl: "https://res.cloudinary.com/o100uxqf/image/upload/sample.jpg",
    fileName: "Chuyen_De_Di_Truyen_Sinh_Thai_12.pdf",
    fileSize: "7.1 MB",
    author: "Nguyễn Minh Đức (Thủ Khoa Khối B 2025)",
    authorRole: "Học sinh",
    downloads: 760,
    likes: 195,
    views: 2200,
    description: "Tài liệu chia sẻ kinh nghiệm xử lý nhanh bài toán phả hệ di truyền người, công nghệ tế bào và các bài tập ứng dụng sinh thái môi trường.",
    tags: ["Thủ khoa chia sẻ", "Di truyền học", "Phả hệ"],
    isVerified: true,
    isFeatured: false,
    status: "APPROVED",
    previewText: "Mẹo đọc phả hệ chỉ trong 3 bước, tránh bẫy gen nằm trên vùng tương đồng của NST giới tính X và Y.",
    createdAt: "2026-02-15",
    updatedAt: "2026-02-15",
  },
  {
    id: "comm-doc-tin-07",
    title: "Giáo Trình Thực Hành Lập Trình Python & Xử Lý Dữ Liệu Cho Học Sinh THPT",
    subject: "tin",
    subjectName: "Tin học",
    grade: "Lớp 11",
    category: "Sách & Tài liệu tham khảo",
    format: "PDF",
    fileUrl: "https://res.cloudinary.com/o100uxqf/image/upload/sample.jpg",
    fileName: "Giao_Trinh_Python_THPT_2026.pdf",
    fileSize: "8.5 MB",
    author: "Thầy Hoàng Văn Bách",
    authorRole: "Giáo viên",
    downloads: 1120,
    likes: 310,
    views: 3450,
    description: "Bộ bài giảng từ căn bản đến nâng cao về cú pháp Python 3, cấu trúc điều khiển, mảng danh sách (List, Dict) và thuật toán sắp xếp, tìm kiếm chuẩn SGK 2018.",
    tags: ["Python", "Tin học 11", "Thuật toán", "Thực hành"],
    isVerified: true,
    isFeatured: false,
    status: "APPROVED",
    previewText: "Tài liệu bao gồm 30 bài tập thực hành trên máy kèm code mẫu chuẩn và bài giải chi tiết.",
    createdAt: "2026-03-02",
    updatedAt: "2026-03-02",
  },
  {
    id: "comm-doc-su-08",
    title: "Bảng Niên Biểu Lịch Sử Việt Nam & Thế Giới Giai Đoạn 1945 - 2000",
    subject: "su",
    subjectName: "Lịch sử",
    grade: "Lớp 12",
    category: "Đề cương & Tóm tắt",
    format: "PPTX",
    fileUrl: "https://res.cloudinary.com/o100uxqf/image/upload/sample.jpg",
    fileName: "Bang_Nien_Bieu_Lich_Su_1945_2000.pptx",
    fileSize: "14.2 MB",
    author: "Cộng Đồng Giáo Viên Sử Tuy Đức",
    authorRole: "Cộng tác viên",
    downloads: 640,
    likes: 178,
    views: 1980,
    description: "Slide trình chiếu trực quan hệ thống hóa các mốc sự kiện lịch sử quan trọng, ý nghĩa lịch sử và bài học kinh nghiệm.",
    tags: ["Niên biểu", "Slide bài giảng", "Ôn nhanh"],
    isVerified: true,
    isFeatured: false,
    status: "APPROVED",
    previewText: "Trực quan hóa diễn biến các chiến dịch lịch sử bằng bản đồ động và sơ đồ so sánh các hiệp định.",
    createdAt: "2026-02-10",
    updatedAt: "2026-02-10",
  },
];

/**
 * Lấy toàn bộ danh sách tài liệu cộng đồng (Ưu tiên Firestore, fallback sang localStorage)
 */
export async function getAllCommunityDocs(): Promise<CommunityDocumentItem[]> {
  try {
    if (typeof window !== "undefined") {
      const q = query(collection(db, "community_documents"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docs: CommunityDocumentItem[] = [];
        snapshot.forEach((d) => {
          docs.push({ id: d.id, ...d.data() } as CommunityDocumentItem);
        });
        localStorage.setItem(LOCAL_COMMUNITY_DOCS_KEY, JSON.stringify(docs));
        return docs;
      }
    }
  } catch (err) {
    console.warn("Firestore community_documents fetch error, fallback to cache:", err);
  }

  // Fallback to localStorage
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(LOCAL_COMMUNITY_DOCS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse community docs cache:", e);
      }
    }
    // Khởi tạo dữ liệu mẫu nếu chưa có
    localStorage.setItem(LOCAL_COMMUNITY_DOCS_KEY, JSON.stringify(DEFAULT_COMMUNITY_DOCUMENTS));
  }

  return DEFAULT_COMMUNITY_DOCUMENTS;
}

/**
 * Lưu tài liệu cộng đồng mới
 */
export async function saveNewCommunityDoc(
  item: Omit<CommunityDocumentItem, "id" | "createdAt" | "updatedAt">
): Promise<CommunityDocumentItem> {
  const newId = `comm-doc-${Date.now()}`;
  const now = new Date().toISOString().split("T")[0];

  const newItem: CommunityDocumentItem = {
    ...item,
    id: newId,
    downloads: item.downloads || 0,
    likes: item.likes || 0,
    views: item.views || 0,
    status: item.status || "APPROVED",
    isVerified: item.isVerified ?? true,
    isFeatured: item.isFeatured ?? false,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Lưu LocalStorage trước
  if (typeof window !== "undefined") {
    try {
      const current = await getAllCommunityDocs();
      const updated = [newItem, ...current];
      localStorage.setItem(LOCAL_COMMUNITY_DOCS_KEY, JSON.stringify(updated));
      broadcastCommunityDocsUpdate();
    } catch (e) {
      console.error("Local save error:", e);
    }
  }

  // 2. Đồng bộ Firestore
  try {
    const docRef = doc(db, "community_documents", newId);
    await setDoc(docRef, {
      ...newItem,
      serverCreatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Firestore community_documents save error (offline mode active):", err);
  }

  return newItem;
}

/**
 * Cập nhật tài liệu cộng đồng
 */
export async function updateCommunityDoc(
  id: string,
  updates: Partial<CommunityDocumentItem>
): Promise<boolean> {
  const now = new Date().toISOString().split("T")[0];

  if (typeof window !== "undefined") {
    try {
      const current = await getAllCommunityDocs();
      const idx = current.findIndex((d) => d.id === id);
      if (idx !== -1) {
        current[idx] = { ...current[idx], ...updates, updatedAt: now };
        localStorage.setItem(LOCAL_COMMUNITY_DOCS_KEY, JSON.stringify(current));
        broadcastCommunityDocsUpdate();
      }
    } catch (e) {
      console.error("Local update error:", e);
    }
  }

  try {
    const docRef = doc(db, "community_documents", id);
    await setDoc(docRef, { ...updates, updatedAt: now }, { merge: true });
    return true;
  } catch (err) {
    console.warn("Firestore update error:", err);
    return true;
  }
}

/**
 * Xóa tài liệu cộng đồng
 */
export async function deleteCommunityDoc(id: string): Promise<boolean> {
  if (typeof window !== "undefined") {
    try {
      const current = await getAllCommunityDocs();
      const filtered = current.filter((d) => d.id !== id);
      localStorage.setItem(LOCAL_COMMUNITY_DOCS_KEY, JSON.stringify(filtered));
      broadcastCommunityDocsUpdate();
    } catch (e) {
      console.error("Local delete error:", e);
    }
  }

  try {
    const docRef = doc(db, "community_documents", id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn("Firestore delete error:", err);
    return true;
  }
}

/**
 * Tăng lượt tải của tài liệu cộng đồng
 */
export async function incrementCommunityDocDownload(id: string): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const current = await getAllCommunityDocs();
      const item = current.find((d) => d.id === id);
      if (item) {
        item.downloads = (item.downloads || 0) + 1;
        localStorage.setItem(LOCAL_COMMUNITY_DOCS_KEY, JSON.stringify(current));
        broadcastCommunityDocsUpdate();
      }
    } catch (e) {
      console.error("Increment download error:", e);
    }
  }

  try {
    const docRef = doc(db, "community_documents", id);
    await setDoc(docRef, { downloads: (await getAllCommunityDocs()).find((d) => d.id === id)?.downloads || 1 }, { merge: true });
  } catch (err) {
    console.warn("Firestore increment download error:", err);
  }
}

/**
 * Like / Thả tim tài liệu cộng đồng
 */
export async function toggleLikeCommunityDoc(id: string): Promise<number> {
  let newLikes = 0;
  if (typeof window !== "undefined") {
    try {
      const current = await getAllCommunityDocs();
      const item = current.find((d) => d.id === id);
      if (item) {
        item.likes = (item.likes || 0) + 1;
        newLikes = item.likes;
        localStorage.setItem(LOCAL_COMMUNITY_DOCS_KEY, JSON.stringify(current));
        broadcastCommunityDocsUpdate();
      }
    } catch (e) {
      console.error("Like error:", e);
    }
  }

  try {
    const docRef = doc(db, "community_documents", id);
    await setDoc(docRef, { likes: newLikes }, { merge: true });
  } catch (err) {
    console.warn("Firestore like error:", err);
  }

  return newLikes;
}

/**
 * Reset / Khôi phục dữ liệu mẫu
 */
export async function resetDefaultCommunityDocs(): Promise<CommunityDocumentItem[]> {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_COMMUNITY_DOCS_KEY, JSON.stringify(DEFAULT_COMMUNITY_DOCUMENTS));
    broadcastCommunityDocsUpdate();
  }
  return DEFAULT_COMMUNITY_DOCUMENTS;
}
