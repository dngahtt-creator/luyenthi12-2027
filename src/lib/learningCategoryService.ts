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
import * as XLSX from "xlsx";

export type SectionCategoryType = "document" | "video" | "exam";

export interface LearningCategory {
  id: string;
  name: string; // Tên Mục (Ví dụ: "12 - TOÁN HỌC", "12 - VẬT LÍ", "12 - NGỮ VĂN"...)
  type: SectionCategoryType; // "document" (Tài liệu đọc) | "video" (Video) | "exam" (Đề thi)
  description?: string;
  thumbnailUrl?: string;
  author?: string; // Ví dụ: "Nguồn internet" hoặc "Tổ Chuyên Môn Tuy Đức"
  createdAt: string;
  updatedAt?: string;
}

export interface LearningItem {
  id: string;
  categoryId: string; // Thuộc mục nào
  categoryName: string; // Tên mục
  subfolder?: string; // Tên thư mục nhỏ / chuyên đề
  itemType?: "read" | "exam"; // "read" (Bài đọc) | "exam" (Bài thi)
  fileFormat?: "PDF" | "DOCX";
  contentBody?: string; // Nội dung tóm tắt để đọc trực tiếp
  type?: SectionCategoryType; // "document" | "video" | "exam"
  lessonNumber: number | string; // Bài số (VD: 1, 2, 3...)
  title: string; // Tên bài / Tên mục
  contentUrl?: string; // Link YouTube, Drive, PDF, Docs, MP4...
  fileName?: string;
  description?: string;
  createdAt: string;
  isPublished: boolean;
}

const CATEGORIES_KEY = "school_learning_categories_v4";
const ITEMS_KEY = "school_learning_items_v4";

export function broadcastLearningUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("school_learning_updated"));
    window.dispatchEvent(new Event("school_data_updated"));
  }
}

// Helper: Extract YouTube Embed URL
export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return "";
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11
    ? `https://www.youtube.com/embed/${match[2]}?autoplay=1`
    : url;
}

// Helper: Extract YouTube Thumbnail
export function getYouTubeThumbnail(url: string): string {
  if (!url) return "";
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11
    ? `https://img.youtube.com/vi/${match[2]}/hqdefault.jpg`
    : "";
}

// =========================================================
// DANH SÁCH MỤC HỌC LIỆU MẪU: ĐẦY ĐỦ CÁC MÔN THI TỐT NGHIỆP THPT 12
// =========================================================
export const DEFAULT_CATEGORIES: LearningCategory[] = [
  // --- 1. TÀI LIỆU ĐỌC: CÁC MÔN THI TỐT NGHIỆP 12 ---
  {
    id: "cat-doc-toan-12",
    name: "12 - TOÁN HỌC",
    type: "document",
    description: "Bộ chuyên đề trọng tâm: Khảo sát hàm số, Tích phân, Hình học Oxyz và Xác suất 12.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-20",
  },
  {
    id: "cat-doc-van-12",
    name: "12 - NGỮ VĂN",
    type: "document",
    description: "Cẩm nang Đọc hiểu văn bản nghệ thuật, Nghị luận xã hội & Phân tích văn học 12.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-20",
  },
  {
    id: "cat-doc-anh-12",
    name: "12 - TIẾNG ANH",
    type: "document",
    description: "Tổng ôn 3000 từ vựng cốt lõi, chuyên đề ngữ pháp và kỹ năng đọc hiểu trắc nghiệm 12.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-20",
  },
  {
    id: "cat-doc-vat-li-12",
    name: "12 - VẬT LÍ",
    type: "document",
    description: "Vật lí nhiệt, Khí lí tưởng, Từ trường và Vật lí hạt nhân chuẩn cấu trúc GDPT 2026.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-20",
  },
  {
    id: "cat-doc-hoa-hoc-12",
    name: "12 - HOÁ HỌC",
    type: "document",
    description: "Chuyên đề Este - Lipit, Carbohydrate, Hợp chất chứa Nitrogen và Pin điện hóa 12.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-20",
  },
  {
    id: "cat-doc-sinh-hoc-12",
    name: "12 - SINH HỌC",
    type: "document",
    description: "Di truyền học phân tử, quy luật di truyền Men-đen, Tiến hóa và Sinh thái học 12.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-20",
  },
  {
    id: "cat-doc-lich-su-12",
    name: "12 - LỊCH SỬ",
    type: "document",
    description: "Sơ đồ tư duy mốc thời gian lịch sử thế giới hiện đại và lịch sử Việt Nam 1945 đến nay.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-20",
  },
  {
    id: "cat-doc-dia-li-12",
    name: "12 - ĐỊA LÍ",
    type: "document",
    description: "Kỹ năng khai thác Atlat, phân tích số liệu biểu đồ và chuyển dịch cơ cấu kinh tế vùng 12.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-20",
  },
  {
    id: "cat-doc-gdktpl-12",
    name: "12 - GDKT & PHÁP LUẬT",
    type: "document",
    description: "Kinh tế thị trường, quản lý tài chính doanh nghiệp và hệ thống pháp luật Việt Nam 12.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-20",
  },
  {
    id: "cat-doc-tin-hoc-12",
    name: "12 - TIN HỌC",
    type: "document",
    description: "Cơ sở dữ liệu quan hệ, thiết kế trang web, an toàn an ninh mạng và tư duy thuật toán 12.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-20",
  },
  {
    id: "cat-doc-cong-nghe-12",
    name: "12 - CÔNG NGHỆ",
    type: "document",
    description: "Mạch điện tử điều khiển, tự động hóa và công nghệ kỹ thuật thời đại số 12.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-20",
  },

  // --- CÁC MÔN LỚP 11 ---
  {
    id: "cat-doc-toan-11",
    name: "11 - TOÁN HỌC",
    type: "document",
    description: "Bộ chuyên đề & giáo trình Toán học 11 bám sát chương trình mới.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-10",
  },
  {
    id: "cat-doc-vat-li-11",
    name: "11 - VẬT LÍ",
    type: "document",
    description: "Tài liệu phương pháp giải nhanh dao động cơ, sóng và điện trường 11.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-10",
  },
  {
    id: "cat-doc-sinh-hoc-11",
    name: "11 - SINH HỌC",
    type: "document",
    description: "Sơ đồ tư duy sinh học cơ thể và chuyển hóa vật chất năng lượng 11.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-10",
  },
  {
    id: "cat-doc-lich-su-11",
    name: "11 - LỊCH SỬ",
    type: "document",
    description: "Sổ tay mốc thời gian & sơ đồ sự kiện lịch sử Việt Nam và thế giới 11.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-10",
  },
  {
    id: "cat-doc-hoa-hoc-11",
    name: "11 - HOÁ HỌC",
    type: "document",
    description: "Cân bằng hóa học, hóa học hữu cơ và phương pháp dồn chất hóa 11.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-10",
  },
  {
    id: "cat-doc-dia-li-11",
    name: "11 - ĐỊA LÍ",
    type: "document",
    description: "Kỹ năng khai thác bản đồ, biểu đồ và Atlat Địa lí lớp 11.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-10",
  },

  // --- 2. VIDEO BÀI GIẢNG ---
  {
    id: "cat-video-toan-12",
    name: "12 - Video Luyện Thi Toán 9+ (Hàm số & Oxyz)",
    type: "video",
    description: "Chuỗi bài giảng giải tích 12, khảo sát hàm số và hình học không gian Oxyz đỉnh cao.",
    author: "Thầy Nguyễn Quốc Cường",
    thumbnailUrl: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-22",
  },
  {
    id: "cat-video-van-12",
    name: "12 - Video Bí Quyết Viết Nghị Luận Xã Hội & Văn Học",
    type: "video",
    description: "Công thức mở bài gián tiếp, cấu trúc đoạn văn 200 chữ và bí quyết đạt điểm 9+ Văn 12.",
    author: "Cô Đặng Anh Thư",
    thumbnailUrl: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-22",
  },
  {
    id: "cat-video-anh-12",
    name: "12 - Video Tổng Ôn Cấp Tốc Ngữ Pháp & Từ Vựng Tiếng Anh",
    type: "video",
    description: "Xử lý bẫy ngữ pháp thường gặp và mẹo làm bài đọc hiểu đạt điểm tối đa.",
    author: "Thầy Peter Hoàng",
    thumbnailUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-22",
  },
  {
    id: "cat-video-ai-web",
    name: "Thiết kế Website bằng AI",
    type: "video",
    description: "Khóa học tạo website nhanh chóng, tự động hóa với các công cụ AI hiện đại.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-12",
  },
  {
    id: "cat-video-python",
    name: "Lập trình Python từ cơ bản đến nâng cao",
    type: "video",
    description: "Làm chủ ngôn ngữ lập trình Python, tư duy thuật toán và cấu trúc dữ liệu.",
    author: "Nguồn internet",
    thumbnailUrl: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-12",
  },

  // --- 3. ĐỀ THI TỐT NGHIỆP 12 ---
  {
    id: "cat-exam-toan-12",
    name: "12 - BỘ ĐỀ THI TỐT NGHIỆP TOÁN HỌC 2026",
    type: "exam",
    description: "Trọn bộ 25 đề thi thử tốt nghiệp Toán 12 chuẩn cấu trúc 3 phần định dạng mới.",
    author: "Tổ Chuyên Môn Toán THPT Tuy Đức",
    thumbnailUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-22",
  },
  {
    id: "cat-exam-van-12",
    name: "12 - BỘ ĐỀ THI TỐT NGHIỆP NGỮ VĂN 2026",
    type: "exam",
    description: "Đề thi thử Ngữ văn cấu trúc mới: Đọc hiểu văn bản ngoài SGK và Nghị luận tổng hợp.",
    author: "Cô Đặng Anh Thư",
    thumbnailUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-22",
  },
  {
    id: "cat-exam-anh-12",
    name: "12 - BỘ ĐỀ THI TỐT NGHIỆP TIẾNG ANH 2026",
    type: "exam",
    description: "Đề thi trắc nghiệm Tiếng Anh chuẩn ma trận phân hóa học sinh khá giỏi 9+.",
    author: "Tổ Ngoại Ngữ THPT Tuy Đức",
    thumbnailUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-22",
  },
  {
    id: "cat-exam-khtn-12",
    name: "12 - TỔ HỢP KHTN (VẬT LÍ - HOÁ HỌC - SINH HỌC)",
    type: "exam",
    description: "Bộ đề thi phân loại tổ hợp Khoa Học Tự Nhiên chuẩn định dạng Bộ Giáo Dục.",
    author: "Hội đồng Chuyên môn KHTN",
    thumbnailUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-22",
  },
  {
    id: "cat-exam-khxh-12",
    name: "12 - TỔ HỢP KHXH (LỊCH SỬ - ĐỊA LÍ - GDKT&PL)",
    type: "exam",
    description: "Bộ đề khảo sát tổ hợp Khoa Học Xã Hội tổng hợp kiến thức trọng điểm 12.",
    author: "Hội đồng Chuyên môn KHXH",
    thumbnailUrl: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-22",
  },
];

export const DEFAULT_ITEMS: LearningItem[] = [
  // ==================== 12 - TOÁN HỌC ====================
  {
    id: "toan12-1",
    categoryId: "cat-doc-toan-12",
    categoryName: "12 - TOÁN HỌC",
    subfolder: "Chuyên đề 1: Khảo sát hàm số & Đồ thị",
    itemType: "read",
    fileFormat: "PDF",
    lessonNumber: 1,
    title: "Bài 1: Tính đơn điệu, cực trị và tiệm cận của đồ thị hàm số",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Hệ thống quy tắc xét dấu đạo hàm, bài toán chứa tham số m và kỹ thuật nhận diện bảng biến thiên.",
    contentBody: "1. Định lý tính đơn điệu: Cho hàm số y = f(x) có đạo hàm trên K. Nếu f'(x) >= 0 với mọi x thuộc K và f'(x) = 0 chỉ tại hữu hạn điểm thì hàm số đồng biến trên K.\n2. Các dạng toán trọng tâm: Tìm m để hàm số đơn điệu trên khoảng; Tìm cực trị hàm hợp f(u(x)); Tiệm cận đứng và tiệm cận ngang.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "toan12-2",
    categoryId: "cat-doc-toan-12",
    categoryName: "12 - TOÁN HỌC",
    subfolder: "Chuyên đề 1: Khảo sát hàm số & Đồ thị",
    itemType: "read",
    fileFormat: "DOCX",
    lessonNumber: 2,
    title: "Bài 2: Giá trị lớn nhất, nhỏ nhất và bài toán tối ưu thực tế",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Phương pháp tìm Min-Max trên đoạn [a;b], bài toán thực tế tối ưu hóa chi phí sản xuất và dung tích hình học.",
    contentBody: "1. Phương pháp tìm GTLN - GTNN trên đoạn: Tính đạo hàm f'(x), giải nghiệm x_i trong đoạn, tính f(a), f(b), f(x_i) và so sánh.\n2. Ứng dụng thực tế: Thiết kế bể chứa tối thiểu vật liệu, bài toán tối ưu lợi nhuận kinh doanh.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "toan12-3",
    categoryId: "cat-doc-toan-12",
    categoryName: "12 - TOÁN HỌC",
    subfolder: "Chuyên đề 2: Nguyên hàm, Tích phân & Hình Oxyz",
    itemType: "read",
    fileFormat: "PDF",
    lessonNumber: 3,
    title: "Bài 3: Kỹ thuật tính nguyên hàm - tích phân đổi biến và từng phần",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Bảng nguyên hàm mở rộng, phương pháp múa cột tính tích phân từng phần và ứng dụng tính diện tích hình phẳng.",
    contentBody: "1. Công thức tích phân từng phần: int(u dv) = u.v - int(v du).\n2. Phương pháp đổi biến số: Đặt t = u(x) => dt = u'(x)dx. Đổi cận tương ứng.\n3. Ứng dụng tính diện tích hình phẳng giới hạn bởi 2 đồ thị: S = int(|f(x) - g(x)| dx).",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "toan12-4",
    categoryId: "cat-doc-toan-12",
    categoryName: "12 - TOÁN HỌC",
    subfolder: "Chuyên đề 2: Nguyên hàm, Tích phân & Hình Oxyz",
    itemType: "read",
    fileFormat: "DOCX",
    lessonNumber: 4,
    title: "Bài 4: Phương trình mặt phẳng, đường thẳng và mặt cầu Oxyz",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Véc tơ pháp tuyến, véc tơ chỉ phương, khoảng cách từ điểm đến mặt phẳng và bài toán cực trị không gian.",
    contentBody: "1. Phương trình mặt phẳng: A(x - x0) + B(y - y0) + C(z - z0) = 0.\n2. Phương trình đường thẳng dạng chính tắc và tham số.\n3. Phương trình mặt cầu tâm I(a;b;c) bán kính R: (x-a)^2 + (y-b)^2 + (z-c)^2 = R^2.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "toan12-5",
    categoryId: "cat-exam-toan-12",
    categoryName: "12 - BỘ ĐỀ THI TOÁN HỌC",
    subfolder: "Đề thi thử tốt nghiệp Toán 12",
    itemType: "exam",
    fileFormat: "PDF",
    lessonNumber: 5,
    title: "Đề thi thử tốt nghiệp Toán 12 - Chuẩn ma trận 2026 (Mã đề 101)",
    contentUrl: "/mock-exams/toan-12-chuan-2026",
    description: "Đề thi gồm 3 phần: Trắc nghiệm 4 lựa chọn (12 câu), Đúng/Sai (4 câu - 16 ý), Trả lời ngắn (6 câu). Thời gian 90 phút.",
    createdAt: "2026-10-22",
    isPublished: true,
  },
  {
    id: "toan12-6",
    categoryId: "cat-exam-toan-12",
    categoryName: "12 - BỘ ĐỀ THI TOÁN HỌC",
    subfolder: "Đề thi thử tốt nghiệp Toán 12",
    itemType: "exam",
    fileFormat: "PDF",
    lessonNumber: 6,
    title: "Đề phát triển đề tham khảo Bộ Giáo Dục - Mục tiêu 9+ (Mã đề 102)",
    contentUrl: "/mock-exams/toan-12-chuyen-sau",
    description: "Tập trung các câu hỏi vận dụng cao hàm hợp, thể tích khối tròn xoay thực tế và xác suất có điều kiện.",
    createdAt: "2026-10-22",
    isPublished: true,
  },

  // ==================== 12 - NGỮ VĂN ====================
  {
    id: "van12-1",
    categoryId: "cat-doc-van-12",
    categoryName: "12 - NGỮ VĂN",
    subfolder: "Chuyên đề 1: Đọc hiểu văn bản nghệ thuật & nghị luận",
    itemType: "read",
    fileFormat: "DOCX",
    lessonNumber: 1,
    title: "Bài 1: Chiến thuật giải quyết trọn vẹn 4 câu hỏi phần Đọc hiểu ngoài SGK",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Bảng nhận diện phương thức biểu đạt, phong cách ngôn ngữ, biện pháp tu từ và kỹ năng trả lời câu hỏi thông hiểu.",
    contentBody: "1. Nhận diện thể thơ, phong cách ngôn ngữ (chính luận, báo chí, nghệ thuật).\n2. Chỉ ra và phân tích tác dụng biện pháp tu từ: So sánh, ẩn dụ, điệp ngữ, tương phản.\n3. Câu hỏi rút ra bài học thông điệp: Viết từ 3-5 dòng, nêu thông điệp tích cực gắn liền với trách nhiệm thế hệ trẻ.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "van12-2",
    categoryId: "cat-doc-van-12",
    categoryName: "12 - NGỮ VĂN",
    subfolder: "Chuyên đề 2: Kỹ năng viết đoạn văn Nghị luận xã hội",
    itemType: "read",
    fileFormat: "PDF",
    lessonNumber: 2,
    title: "Bài 2: Công thức viết đoạn văn Nghị luận xã hội 200 chữ đạt điểm 9+",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Quy tắc 5 bước: Mở đoạn trực tiếp, Giải thích ngắn gọn, Phân tích dẫn chứng thời sự tiêu biểu, Bàn luận mở rộng, Bài học hành động.",
    contentBody: "1. Mở đoạn: Dẫn dắt ấn tượng trong 1-2 câu.\n2. Giải thích từ khóa trọng tâm.\n3. Phân tích vì sao và đưa 1 dẫn chứng người thật việc thật thuyết phục (ví dụ: các tấm gương cống hiến, khởi nghiệp đổi mới sáng tạo).\n4. Phản biện góc nhìn ngược lại.\n5. Bài học nhận thức và hành động thiết thực của bản thân.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "van12-3",
    categoryId: "cat-exam-van-12",
    categoryName: "12 - BỘ ĐỀ THI TỐT NGHIỆP NGỮ VĂN 2026",
    subfolder: "Đề thi thử tốt nghiệp Ngữ văn 12",
    itemType: "exam",
    fileFormat: "PDF",
    lessonNumber: 3,
    title: "Đề thi thử tốt nghiệp môn Ngữ văn 12 - Cấu trúc GDPT 2026 (Mã đề 201)",
    contentUrl: "/mock-exams/van-12-chuan-2026",
    description: "Thời gian làm bài 120 phút. Gồm phần Đọc hiểu (4.0 điểm) và phần Viết (6.0 điểm: Đoạn văn NLXH 2.0 điểm, Bài văn NLVH 4.0 điểm).",
    createdAt: "2026-10-22",
    isPublished: true,
  },

  // ==================== 12 - TIẾNG ANH ====================
  {
    id: "anh12-1",
    categoryId: "cat-doc-anh-12",
    categoryName: "12 - TIẾNG ANH",
    subfolder: "Chuyên đề 1: 3000 Từ vựng cốt lõi theo chủ đề",
    itemType: "read",
    fileFormat: "PDF",
    lessonNumber: 1,
    title: "Bài 1: Từ vựng chủ đề Giáo dục, Trí tuệ nhân tạo & Môi trường",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Bộ từ vựng C1-B2 kèm ví dụ minh họa ngữ cảnh, collocations và cụm idioms thường xuất hiện trong đề thi THPT.",
    contentBody: "1. Artificial Intelligence: automation, breakthrough, cutting-edge technology, revolutionize.\n2. Environment: biodiversity, sustainable development, carbon footprint, ecological catastrophe.\n3. Education: curriculum, vocational training, holistic development, lifelong learning.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "anh12-2",
    categoryId: "cat-doc-anh-12",
    categoryName: "12 - TIẾNG ANH",
    subfolder: "Chuyên đề 2: Ngữ pháp trọng điểm & Kỹ năng Đọc hiểu",
    itemType: "read",
    fileFormat: "DOCX",
    lessonNumber: 2,
    title: "Bài 2: Bẫy câu điều kiện hỗn hợp, mệnh đề phân từ & câu đảo ngữ",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Tổng hợp các dạng ngữ pháp phân loại học sinh khá giỏi đạt điểm 9+ trong bài thi trắc nghiệm tiếng Anh.",
    contentBody: "1. Đảo ngữ với trạng từ phủ định: Hardly/Scarcely... when, No sooner... than, Only after, Under no circumstances.\n2. Rút gọn mệnh đề quan hệ bằng V-ing (chủ động) và V-ed/V3 (bị động).\n3. Cấu trúc câu giả định với Subjunctive mood: suggest that S + (should) + V_bare.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "anh12-3",
    categoryId: "cat-exam-anh-12",
    categoryName: "12 - BỘ ĐỀ THI TỐT NGHIỆP TIẾNG ANH 2026",
    subfolder: "Đề thi thử tốt nghiệp Tiếng Anh 12",
    itemType: "exam",
    fileFormat: "PDF",
    lessonNumber: 3,
    title: "Đề thi thử Tiếng Anh THPT Quốc Gia - 50 câu trắc nghiệm chuẩn ma trận",
    contentUrl: "/mock-exams/anh-12-chuan-2026",
    description: "Đề thi chuẩn cấu trúc: Ngữ âm, trọng âm, tìm lỗi sai, từ đồng nghĩa - trái nghĩa, giao tiếp, đọc điền từ và đọc hiểu phân hóa.",
    createdAt: "2026-10-22",
    isPublished: true,
  },

  // ==================== 12 - VẬT LÍ ====================
  {
    id: "ly12-1",
    categoryId: "cat-doc-vat-li-12",
    categoryName: "12 - VẬT LÍ",
    subfolder: "Chuyên đề 1: Vật lí nhiệt & Thuyết động học chất khí",
    itemType: "read",
    fileFormat: "PDF",
    lessonNumber: 1,
    title: "Bài 1: Nội năng, nhiệt độ và các định luật chất khí lí tưởng",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Nguyên lí I nhiệt động lực học, quá trình đẳng nhiệt, đẳng tích, đẳng áp và phương trình Clapeyron - Mendeleev.",
    contentBody: "1. Định luật Bôi-lơ - Ma-ri-ốt: p1.V1 = p2.V2 (T = const).\n2. Định luật Sác-lơ: p1/T1 = p2/T2 (V = const).\n3. Phương trình trạng thái: pV = nRT = (m/M)RT.\n4. Nguyên lí I: Delta U = A + Q (Q > 0: nhận nhiệt; A > 0: nhận công).",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "ly12-2",
    categoryId: "cat-exam-khtn-12",
    categoryName: "12 - TỔ HỢP KHTN (VẬT LÍ - HOÁ HỌC - SINH HỌC)",
    subfolder: "Đề thi Vật lí KHTN 12",
    itemType: "exam",
    fileFormat: "PDF",
    lessonNumber: 2,
    title: "Đề thi thử tốt nghiệp Vật lí 12 - Format mới Bộ Giáo Dục",
    contentUrl: "/mock-exams/ly-12-chuan-2026",
    description: "40 câu hỏi trắc nghiệm gồm phần nhiều lựa chọn, phần Đúng/Sai và phần Trả lời ngắn ứng dụng kỹ thuật thực tế.",
    createdAt: "2026-10-22",
    isPublished: true,
  },

  // ==================== 12 - HOÁ HỌC ====================
  {
    id: "hoa12-1",
    categoryId: "cat-doc-hoa-hoc-12",
    categoryName: "12 - HOÁ HỌC",
    subfolder: "Chuyên đề 1: Este - Lipit & Cacbohiđrat",
    itemType: "read",
    fileFormat: "DOCX",
    lessonNumber: 1,
    title: "Bài 1: Cấu trúc, tính chất este, chất béo và phương pháp dồn chất",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Phản ứng este hóa, thủy phân trong môi trường axit và kiềm, tư duy dồn chất este no đơn chức mạch hở.",
    contentBody: "1. Este no đơn chức mạch hở: CnH2nO2 (n >= 2).\n2. Thủy phân este: RCOOR' + NaOH -> RCOONa + R'OH.\n3. Chất béo: (RCOO)3C3H5 + 3NaOH -> 3RCOONa + C3H5(OH)3.\n4. Phương pháp dồn chất este về COO và CH2, H2.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "hoa12-2",
    categoryId: "cat-exam-khtn-12",
    categoryName: "12 - TỔ HỢP KHTN (VẬT LÍ - HOÁ HỌC - SINH HỌC)",
    subfolder: "Đề thi Hóa học KHTN 12",
    itemType: "exam",
    fileFormat: "PDF",
    lessonNumber: 2,
    title: "Đề thi thử Hóa học 12 - Chuyên đề Hóa hữu cơ & Điện hóa học",
    contentUrl: "/mock-exams/hoa-12-chuan-2026",
    description: "Chuẩn ma trận đề thi tốt nghiệp KHTN Hóa học, có phân tích lời giải chi tiết cho từng câu.",
    createdAt: "2026-10-22",
    isPublished: true,
  },

  // ==================== 12 - SINH HỌC ====================
  {
    id: "sinh12-1",
    categoryId: "cat-doc-sinh-hoc-12",
    categoryName: "12 - SINH HỌC",
    subfolder: "Chuyên đề 1: Cơ chế di truyền & Biến dị cấp phân tử",
    itemType: "read",
    fileFormat: "PDF",
    lessonNumber: 1,
    title: "Bài 1: Nhân đôi ADN, Phiên mã, Dịch mã và Đột biến gen",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Sơ đồ dòng chảy thông tin di truyền ADN -> mARN -> Protein -> Tính trạng và các dạng đột biến điểm.",
    contentBody: "1. Nhân đôi ADN: Nguyên tắc bán bảo tồn và nguyên tắc bổ sung (A-T, G-X).\n2. Phiên mã: Tổng hợp mARN dựa trên mạch khuôn 3'->5' của gen.\n3. Dịch mã: Riboxom dịch mã trên mARN theo chiều 5'->3'.\n4. Đột biến gen: Mất, thêm, thay thế một cặp nucleotit.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "sinh12-2",
    categoryId: "cat-exam-khtn-12",
    categoryName: "12 - TỔ HỢP KHTN (VẬT LÍ - HOÁ HỌC - SINH HỌC)",
    subfolder: "Đề thi Sinh học KHTN 12",
    itemType: "exam",
    fileFormat: "PDF",
    lessonNumber: 2,
    title: "Đề thi thử Sinh học 12 - Quy luật di truyền & Sinh thái học",
    contentUrl: "/mock-exams/sinh-12-chuan-2026",
    description: "Đề thi trắc nghiệm phân loại học sinh giỏi, bám sát các dạng bài phả hệ và di truyền quần thể.",
    createdAt: "2026-10-22",
    isPublished: true,
  },

  // ==================== 12 - LỊCH SỬ ====================
  {
    id: "su12-1",
    categoryId: "cat-doc-lich-su-12",
    categoryName: "12 - LỊCH SỬ",
    subfolder: "Chuyên đề 1: Lịch sử Việt Nam từ 1945 đến 1975",
    itemType: "read",
    fileFormat: "DOCX",
    lessonNumber: 1,
    title: "Bài 1: Kháng chiến chống Pháp và mốc son lịch sử Điện Biên Phủ 1954",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Đường lối kháng chiến toàn dân, toàn diện, trường kỳ, tự lực cánh sinh và ý nghĩa lịch sử Hiệp định Giơ-ne-vơ.",
    contentBody: "1. Hoàn cảnh lịch sử sau CMT8: Vận mệnh đất nước ngàn cân treo sợi tóc.\n2. Lời kêu gọi toàn quốc kháng chiến 19/12/1946.\n3. Chiến dịch Việt Bắc thu - đông 1947, Biên giới thu - đông 1950.\n4. Chiến dịch Điện Biên Phủ 1954: 56 ngày đêm khoét núi ngủ hầm, đập tan tập đoàn cứ điểm Pháp - Mỹ.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "su12-2",
    categoryId: "cat-exam-khxh-12",
    categoryName: "12 - TỔ HỢP KHXH (LỊCH SỬ - ĐỊA LÍ - GDKT&PL)",
    subfolder: "Đề thi Lịch sử KHXH 12",
    itemType: "exam",
    fileFormat: "PDF",
    lessonNumber: 2,
    title: "Đề thi thử Lịch sử 12 - Tổ hợp Khoa Học Xã Hội 2026",
    contentUrl: "/mock-exams/su-12-chuan-2026",
    description: "Rèn luyện tư duy phân tích sự kiện lịch sử, so sánh các hiệp định và bước ngoặt cách mạng.",
    createdAt: "2026-10-22",
    isPublished: true,
  },

  // ==================== 12 - ĐỊA LÍ ====================
  {
    id: "dia12-1",
    categoryId: "cat-doc-dia-li-12",
    categoryName: "12 - ĐỊA LÍ",
    subfolder: "Chuyên đề 1: Kỹ năng Atlat & Phân tích biểu đồ",
    itemType: "read",
    fileFormat: "PDF",
    lessonNumber: 1,
    title: "Bài 1: Phương pháp khai thác Atlat Địa lí Việt Nam đạt trọn vẹn điểm",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Kỹ năng tra cứu trang kinh tế, nông nghiệp, công nghiệp và nhận dạng nhanh biểu đồ tròn, cột, đường, miền.",
    contentBody: "1. Nhận diện dạng biểu đồ: Thể hiện quy mô và cơ cấu (tròn/miền); Tốc độ tăng trưởng (đường); So sánh số lượng (cột).\n2. Tra cứu Atlat: Nắm vững bảng chú giải trang 3, định vị tọa độ và đọc mối quan hệ địa hình - khí hậu - thủy văn.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "dia12-2",
    categoryId: "cat-exam-khxh-12",
    categoryName: "12 - TỔ HỢP KHXH (LỊCH SỬ - ĐỊA LÍ - GDKT&PL)",
    subfolder: "Đề thi Địa lí KHXH 12",
    itemType: "exam",
    fileFormat: "PDF",
    lessonNumber: 2,
    title: "Đề thi thử Địa lí 12 - Địa lí kinh tế các vùng trọng điểm",
    contentUrl: "/mock-exams/dia-12-chuan-2026",
    description: "Đề thi khảo sát kỹ năng đọc số liệu thống kê, Atlat và vấn đề phát triển kinh tế biển đảo.",
    createdAt: "2026-10-22",
    isPublished: true,
  },

  // ==================== 12 - GDKT & PHÁP LUẬT ====================
  {
    id: "gdktpl12-1",
    categoryId: "cat-doc-gdktpl-12",
    categoryName: "12 - GDKT & PHÁP LUẬT",
    subfolder: "Chuyên đề 1: Kinh tế thị trường & Pháp luật kinh doanh",
    itemType: "read",
    fileFormat: "DOCX",
    lessonNumber: 1,
    title: "Bài 1: Quyền tự do kinh doanh và nghĩa vụ nộp thuế của công dân",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Các quy định pháp luật về thành lập doanh nghiệp, hợp đồng thương mại và bảo vệ quyền lợi người tiêu dùng.",
    contentBody: "1. Quyền tự do kinh doanh: Công dân có quyền kinh doanh những ngành nghề mà pháp luật không cấm.\n2. Nghĩa vụ nộp thuế: Đóng góp ngân sách nhà nước, công bằng xã hội.\n3. Pháp luật bảo vệ quyền lợi người tiêu dùng: Quyền được thông tin, quyền được bảo đảm an toàn.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "gdktpl12-2",
    categoryId: "cat-exam-khxh-12",
    categoryName: "12 - TỔ HỢP KHXH (LỊCH SỬ - ĐỊA LÍ - GDKT&PL)",
    subfolder: "Đề thi GDKT & Pháp luật 12",
    itemType: "exam",
    fileFormat: "PDF",
    lessonNumber: 2,
    title: "Đề thi thử GDKT & Pháp luật 12 - Tình huống pháp luật thực tế",
    contentUrl: "/mock-exams/gdktpl-12-chuan-2026",
    description: "Đề thi dạng trắc nghiệm tình huống đời sống thực tế, giải quyết xung đột lợi ích đúng pháp luật.",
    createdAt: "2026-10-22",
    isPublished: true,
  },

  // ==================== 12 - TIN HỌC ====================
  {
    id: "tin12-1",
    categoryId: "cat-doc-tin-hoc-12",
    categoryName: "12 - TIN HỌC",
    subfolder: "Chuyên đề 1: Cơ sở dữ liệu quan hệ & Truy vấn SQL",
    itemType: "read",
    fileFormat: "PDF",
    lessonNumber: 1,
    title: "Bài 1: Thiết kế CSDL quan hệ, Khóa chính, Khóa ngoại & Câu lệnh SQL",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Mô hình quan hệ thực thể (ER), chuẩn hóa dữ liệu và cú pháp câu lệnh SELECT, INSERT, UPDATE, DELETE.",
    contentBody: "1. Khóa chính (Primary Key): Xác định duy nhất một bản ghi trong bảng.\n2. Khóa ngoại (Foreign Key): Tạo liên kết giữa hai bảng.\n3. Cú pháp truy vấn SQL: SELECT cot1, cot2 FROM bang WHERE dieu_kien ORDER BY cot ASC/DESC.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "tin12-2",
    categoryId: "cat-exam-thpt-2026",
    categoryName: "BỘ ĐỀ THI THỬ TỐT NGHIỆP 2026",
    subfolder: "Đề thi thử Tin học 12",
    itemType: "exam",
    fileFormat: "PDF",
    lessonNumber: 2,
    title: "Đề thi thử Tin học 12 - Mạng máy tính & Cơ sở dữ liệu",
    contentUrl: "/mock-exams/tin-12-chuan-2026",
    description: "Bộ câu hỏi trắc nghiệm kiến thức an toàn thông tin, mạng Internet và lập trình thuật toán.",
    createdAt: "2026-10-22",
    isPublished: true,
  },

  // ==================== 12 - CÔNG NGHỆ ====================
  {
    id: "cn12-1",
    categoryId: "cat-doc-cong-nghe-12",
    categoryName: "12 - CÔNG NGHỆ",
    subfolder: "Chuyên đề 1: Mạch điện tử điều khiển & Tự động hóa",
    itemType: "read",
    fileFormat: "PDF",
    lessonNumber: 1,
    title: "Bài 1: Linh kiện bán dẫn, IC tích hợp và mạch cảm biến tự động",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Nguyên lí hoạt động của Điốt, Tranzito, điện trở quang, cảm biến nhiệt độ và ứng dụng trong nhà thông minh.",
    contentBody: "1. Điốt bán dẫn: Dẫn điện theo một chiều từ Anot sang Katot.\n2. Tranzito: Linh kiện bán dẫn dùng để khuếch đại tín hiệu hoặc làm khóa điện tử.\n3. Mạch cảm biến: Tự động bật đèn khi trời tối, ngắt rơ-le khi nhiệt độ vượt ngưỡng.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "cn12-2",
    categoryId: "cat-exam-thpt-2026",
    categoryName: "BỘ ĐỀ THI THỬ TỐT NGHIỆP 2026",
    subfolder: "Đề thi thử Công nghệ 12",
    itemType: "exam",
    fileFormat: "PDF",
    lessonNumber: 2,
    title: "Đề thi thử Công nghệ 12 - Công nghệ kỹ thuật điện điện tử",
    contentUrl: "/mock-exams/cn-12-chuan-2026",
    description: "Đề thi phân loại kiến thức công nghệ hiện đại, mạch điều khiển vi xử lý và an toàn điện dân dụng.",
    createdAt: "2026-10-22",
    isPublished: true,
  },

  // ==================== CÁC MÔN LỚP 11 ====================
  {
    id: "toan11-1",
    categoryId: "cat-doc-toan-11",
    categoryName: "11 - TOÁN HỌC",
    subfolder: "Chuyên đề 1: Lượng giác & Dãy số",
    itemType: "read",
    fileFormat: "PDF",
    lessonNumber: 1,
    title: "Bài 1: Hàm số lượng giác và phương trình lượng giác cơ bản",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Tập xác định, chu kỳ và công thức nghiệm phương trình sin, cos, tan.",
    createdAt: "2026-10-10",
    isPublished: true,
  },
  {
    id: "toan11-2",
    categoryId: "cat-exam-toan-11",
    categoryName: "11 - BỘ ĐỀ THI TOÁN HỌC",
    subfolder: "Đề kiểm tra Toán 11",
    itemType: "exam",
    fileFormat: "PDF",
    lessonNumber: 2,
    title: "Đề kiểm tra định kỳ Toán học 11 - Học kỳ I",
    contentUrl: "/mock-exams/toan-11-hk1",
    description: "Bộ đề khảo sát chất lượng giữa kỳ môn Toán 11 có đáp án chi tiết.",
    createdAt: "2026-10-12",
    isPublished: true,
  },
  {
    id: "ly11-1",
    categoryId: "cat-doc-vat-li-11",
    categoryName: "11 - VẬT LÍ",
    subfolder: "Chuyên đề 1: Dao động cơ & Sóng cơ",
    itemType: "read",
    fileFormat: "DOCX",
    lessonNumber: 1,
    title: "Bài 1: Dao động điều hòa và các đại lượng đặc trưng",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Phương trình li độ, vận tốc, gia tốc và phương pháp đường tròn lượng giác.",
    createdAt: "2026-10-10",
    isPublished: true,
  },
  {
    id: "hoa11-1",
    categoryId: "cat-doc-hoa-hoc-11",
    categoryName: "11 - HOÁ HỌC",
    subfolder: "Chuyên đề 1: Cân bằng hóa học & Nitơ",
    itemType: "read",
    fileFormat: "PDF",
    lessonNumber: 1,
    title: "Bài 1: Cân bằng hóa học và hằng số cân bằng Kc",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Nguyên lí chuyển dịch cân bằng Lơ Sa-tơ-li-ê và các yếu tố ảnh hưởng.",
    createdAt: "2026-10-10",
    isPublished: true,
  },

  // ==================== VIDEO BÀI GIẢNG ====================
  {
    id: "video-toan-1",
    categoryId: "cat-video-toan-12",
    categoryName: "12 - Video Luyện Thi Toán 9+ (Hàm số & Oxyz)",
    subfolder: "Khảo sát hàm số 9+",
    itemType: "read",
    fileFormat: "PDF",
    lessonNumber: 1,
    title: "Bài 1: Kỹ thuật ghép trục giải nhanh bài toán hàm hợp chứa tham số m",
    contentUrl: "https://www.youtube.com/watch?v=3JZ_D3ELwOQ",
    description: "Phương pháp đỉnh cao xử lý câu hỏi 9+ trong 2 phút bằng sơ đồ ghép trục.",
    createdAt: "2026-10-22",
    isPublished: true,
  },
  {
    id: "video-van-1",
    categoryId: "cat-video-van-12",
    categoryName: "12 - Video Bí Quyết Viết Nghị Luận Xã Hội & Văn Học",
    subfolder: "Bí quyết đạt 9+ Văn",
    itemType: "read",
    fileFormat: "DOCX",
    lessonNumber: 1,
    title: "Bài 1: Công thức mở bài gián tiếp và liên hệ mở rộng đạt điểm sáng tạo",
    contentUrl: "https://www.youtube.com/watch?v=kqtD5dpn9C8",
    description: "Hướng dẫn kết nối tác phẩm văn học với thực tế đời sống tạo ấn tượng mạnh.",
    createdAt: "2026-10-22",
    isPublished: true,
  },
  {
    id: "video-ai-1",
    categoryId: "cat-video-ai-web",
    categoryName: "Thiết kế Website bằng AI",
    subfolder: "Thực chiến thiết kế Web",
    itemType: "read",
    fileFormat: "PDF",
    lessonNumber: 1,
    title: "Bài 1: Tạo giao diện Landing Page chuyên nghiệp với AI chỉ trong 10 phút",
    contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    description: "Video hướng dẫn thực chiến xây dựng giao diện người dùng tối ưu chuyển đổi.",
    createdAt: "2026-10-12",
    isPublished: true,
  },
];

export async function getAllLearningCategories(): Promise<LearningCategory[]> {
  let list: LearningCategory[] = [];
  try {
    const colRef = collection(db, "learning_categories");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<LearningCategory, "id">) });
      });
    }
  } catch (error) {
    console.warn("Firestore categories error, fallback to local:", error);
  }

  if (list.length === 0 && typeof window !== "undefined") {
    const cached = localStorage.getItem(CATEGORIES_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
      } catch (e) {}
    }
  }

  // Tự động bổ sung các môn học tốt nghiệp 12 mặc định nếu chưa có
  const existingNames = new Set(list.map((c) => c.name.trim().toLowerCase()));
  const missingDefaults = DEFAULT_CATEGORIES.filter(
    (def) => !existingNames.has(def.name.trim().toLowerCase())
  );

  const finalList = [...missingDefaults, ...list];
  if (finalList.length === 0) return DEFAULT_CATEGORIES;

  if (typeof window !== "undefined") {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(finalList));
  }
  return finalList;
}

// LẤY DANH SÁCH BÀI / NỘI DUNG ĐÃ ĐĂNG TẢI
export async function getAllLearningItems(): Promise<LearningItem[]> {
  let list: LearningItem[] = [];
  try {
    const colRef = collection(db, "learning_items");
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<LearningItem, "id">) });
      });
    }
  } catch (error) {
    console.warn("Firestore items error, fallback to local:", error);
  }

  if (list.length === 0 && typeof window !== "undefined") {
    const cached = localStorage.getItem(ITEMS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
      } catch (e) {}
    }
  }

  // Tự động bổ sung các bài mẫu nếu chưa có
  const existingTitles = new Set(list.map((i) => (i.categoryId + "_" + i.title).toLowerCase()));
  const missingDefaults = DEFAULT_ITEMS.filter(
    (def) => !existingTitles.has((def.categoryId + "_" + def.title).toLowerCase())
  );

  const finalList = [...missingDefaults, ...list];
  if (finalList.length === 0) return DEFAULT_ITEMS;

  if (typeof window !== "undefined") {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(finalList));
  }
  return finalList;
}

// KHỞI TẠO MỤC MỚI (BOX 1)
export async function saveNewLearningCategory(
  catData: Omit<LearningCategory, "id">
): Promise<{ success: boolean; id?: string }> {
  const id = `cat_${Date.now()}`;
  const newCat: LearningCategory = {
    id,
    ...catData,
    createdAt: catData.createdAt || new Date().toISOString().split("T")[0],
  };

  try {
    const docRef = doc(db, "learning_categories", id);
    await setDoc(docRef, { ...catData, createdAt: serverTimestamp() });
  } catch (err) {
    console.warn("Firestore set category note, fallback local:", err);
  }

  if (typeof window !== "undefined") {
    const current = await getAllLearningCategories();
    const updated = [newCat, ...current];
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updated));
    broadcastLearningUpdate();
  }

  return { success: true, id };
}

// ĐĂNG TẢI NỘI DUNG MỤC (BOX 2)
export async function saveLearningItem(
  itemData: Omit<LearningItem, "id">
): Promise<{ success: boolean; id?: string }> {
  const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newItem: LearningItem = {
    id,
    ...itemData,
    createdAt: itemData.createdAt || new Date().toISOString().split("T")[0],
    isPublished: true,
  };

  try {
    const docRef = doc(db, "learning_items", id);
    await setDoc(docRef, { ...itemData, createdAt: serverTimestamp() });
  } catch (err) {
    console.warn("Firestore set item note, fallback local:", err);
  }

  if (typeof window !== "undefined") {
    const current = await getAllLearningItems();
    const updated = [newItem, ...current];
    localStorage.setItem(ITEMS_KEY, JSON.stringify(updated));
    broadcastLearningUpdate();
  }

  return { success: true, id };
}

// XÓA MỤC (BOX 3)
export async function deleteLearningCategory(catId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "learning_categories", catId));
  } catch (err) {
    console.warn("Firestore delete category note:", err);
  }

  if (typeof window !== "undefined") {
    const cats = await getAllLearningCategories();
    const updatedCats = cats.filter((c) => c.id !== catId);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updatedCats));

    const items = await getAllLearningItems();
    const updatedItems = items.filter((i) => i.categoryId !== catId);
    localStorage.setItem(ITEMS_KEY, JSON.stringify(updatedItems));

    broadcastLearningUpdate();
  }

  return true;
}

// XÓA BÀI HỌC TRONG MỤC (BOX 3)
export async function deleteLearningItem(itemId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "learning_items", itemId));
  } catch (err) {
    console.warn("Firestore delete item note:", err);
  }

  if (typeof window !== "undefined") {
    const items = await getAllLearningItems();
    const updatedItems = items.filter((i) => i.id !== itemId);
    localStorage.setItem(ITEMS_KEY, JSON.stringify(updatedItems));
    broadcastLearningUpdate();
  }

  return true;
}

// TẢI FILE EXCEL MẪU
export function downloadCourseExcelTemplate() {
  const sampleData = [
    {
      "Tên Mục / Môn Học": "12 - TOÁN HỌC",
      "Định Dạng (document/video/exam)": "document",
      "Bài Số": 1,
      "Tên Bài / Tiêu Đề Bài": "Bài 1: Khảo sát sự biến thiên và vẽ đồ thị hàm số",
      "Link Nội Dung (YouTube/Drive/PDF)": "https://drive.google.com/file/d/example/view",
      "Mô Tả Bài Học": "Hệ thống kiến thức đơn điệu, cực trị, GTLN - GTNN",
    },
    {
      "Tên Mục / Môn Học": "12 - TOÁN HỌC",
      "Định Dạng (document/video/exam)": "document",
      "Bài Số": 2,
      "Tên Bài / Tiêu Đề Bài": "Bài 2: Nguyên hàm, tích phân và ứng dụng",
      "Link Nội Dung (YouTube/Drive/PDF)": "https://drive.google.com/file/d/example2/view",
      "Mô Tả Bài Học": "Kỹ thuật tính tích phân đổi biến và từng phần",
    },
    {
      "Tên Mục / Môn Học": "12 - NGỮ VĂN",
      "Định Dạng (document/video/exam)": "document",
      "Bài Số": 1,
      "Tên Bài / Tiêu Đề Bài": "Bài 1: Phương pháp giải đề Đọc hiểu văn học 12",
      "Link Nội Dung (YouTube/Drive/PDF)": "https://drive.google.com/file/d/example3/view",
      "Mô Tả Bài Học": "Kỹ năng nhận diện và trả lời trọn vẹn 4 câu hỏi đọc hiểu",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mau_Khoa_Hoc");
  XLSX.writeFile(wb, "Mau_Khoa_Hoc_Hoc_Lieu_THPT12.xlsx");
}

// UPLOAD BÀI HỌC TỪ FILE EXCEL
export async function uploadCourseFromExcel(
  file: File,
  targetCategoryId?: string
): Promise<{ count: number; categoryName?: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!rows || rows.length === 0) {
          throw new Error("File Excel không có dữ liệu!");
        }

        const categories = await getAllLearningCategories();
        let targetCat = categories.find((c) => c.id === targetCategoryId);

        let createdCount = 0;
        for (const r of rows) {
          const catNameInRow =
            r["Tên Mục / Môn Học"] || r["Tên Mục"] || r["Môn Học"] || (targetCat ? targetCat.name : "12 - MÔN HỌC MỚI");
          const formatRaw = (r["Định Dạng (document/video/exam)"] || r["Định Dạng"] || "document")
            .toString()
            .toLowerCase();
          const format: SectionCategoryType = formatRaw.includes("video")
            ? "video"
            : formatRaw.includes("exam") || formatRaw.includes("thi")
            ? "exam"
            : "document";

          // Tìm hoặc tạo mới mục nếu chưa có
          if (!targetCat) {
            targetCat = categories.find(
              (c) => c.name.toLowerCase() === catNameInRow.toLowerCase()
            );
            if (!targetCat) {
              const newCatRes = await saveNewLearningCategory({
                name: catNameInRow,
                type: format,
                description: `Mục ${catNameInRow} được nhập tự động từ file Excel`,
                author: "Tổ Chuyên Môn THPT",
                createdAt: new Date().toISOString().split("T")[0],
              });
              targetCat = {
                id: newCatRes.id || `cat_${Date.now()}`,
                name: catNameInRow,
                type: format,
                createdAt: new Date().toISOString().split("T")[0],
              };
            }
          }

          const lessonNumber = r["Bài Số"] || r["Số Bài"] || createdCount + 1;
          const lessonTitle =
            r["Tên Bài / Tiêu Đề Bài"] || r["Tên Bài"] || r["Tiêu Đề"] || `Bài học ${lessonNumber}`;
          const contentUrl =
            r["Link Nội Dung (YouTube/Drive/PDF)"] || r["Link"] || r["URL"] || "";
          const desc = r["Mô Tả Bài Học"] || r["Mô Tả"] || "";

          await saveLearningItem({
            categoryId: targetCat.id,
            categoryName: targetCat.name,
            type: targetCat.type,
            lessonNumber,
            title: lessonTitle,
            contentUrl,
            description: desc,
            createdAt: new Date().toISOString().split("T")[0],
            isPublished: true,
          });

          createdCount++;
        }

        resolve({ count: createdCount, categoryName: targetCat?.name });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}


// =========================================================
// TIỆN ÍCH TẢI VỀ FILE WORD (DOCX) VÀ FILE PDF CHO HỌC SINH
// =========================================================
export function downloadDocxFile(title: string, description?: string, categoryName?: string, contentBody?: string) {
  const safeTitle = title.replace(/[<>:"/\\|?*]/g, '').trim();
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
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
        <h1>${title}</h1>
        <div class="subhead">Môn: ${categoryName || 'Ôn Thi Tốt Nghiệp THPT 2026'} • Định dạng: Microsoft Word (.docx)</div>
      </div>

      <div class="section-title">I. TÓM TẮT TRỌNG TÂM KIẾN THỨC BÀI HỌC</div>
      <div class="box">
        <p><strong>Mục tiêu:</strong> ${description || 'Nắm vững kiến thức trọng tâm, kỹ năng giải quyết các dạng câu hỏi từ nhận biết đến vận dụng cao 9+.'}</p>
        <p>${contentBody || 'Tài liệu biên soạn bám sát cấu trúc đề thi tốt nghiệp THPT theo định dạng mới. Học sinh ôn tập kỹ các lý thuyết nền tảng, công thức giải nhanh và chú ý các bẫy thường gặp.'}</p>
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
  `;
  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `[TaiLieu]_${safeTitle}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPdfFile(title: string, description?: string, categoryName?: string, contentBody?: string) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title} - Bản In PDF</title>
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
          <h1>${title}</h1>
          <div class="meta">Môn: <strong>${categoryName || 'Lớp 12'}</strong> • Đơn vị biên soạn: Cổng Học Liệu Mở Tuy Đức</div>
          <div class="badge">ĐỀ ÁN ÔN THI TỐT NGHIỆP THPT QUỐC GIA 12</div>
        </div>
        <div class="section">
          <div class="section-title">I. MỤC TIÊU VÀ TÓM TẮT KIẾN THỨC CỐT LÕI</div>
          <div class="box">
            <p><strong>Nội dung:</strong> ${description || 'Tài liệu phương pháp và bộ chuyên đề trọng tâm ôn thi tốt nghiệp THPT chuẩn cấu trúc đề thi mới.'}</p>
            <p>${contentBody || 'Bao gồm các kiến thức lý thuyết cơ bản, sơ đồ tư duy hệ thống và các công thức giải nhanh giúp học sinh tiết kiệm 40% thời gian làm bài.'}</p>
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
    `);
    printWindow.document.close();
  }
}

// Aliases for compatibility
export const saveNewLearningItem = saveLearningItem;

export async function parseCourseExcelFile(
  file: File,
  targetCatId: string,
  targetCatName?: string,
  targetCatType?: SectionCategoryType
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const res = await uploadCourseFromExcel(file, targetCatId);
    return { success: true, count: res.count };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi khi xử lý file Excel" };
  }
}

