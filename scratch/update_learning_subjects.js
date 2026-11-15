const fs = require('fs');

const serviceFile = 'src/lib/learningCategoryService.ts';

const newContent = `import { db } from "./firebase";
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
  type: SectionCategoryType; // "document" | "video" | "exam"
  lessonNumber: number | string; // Bài số (VD: 1, 2, 3...)
  title: string; // Tên bài / Tên mục
  contentUrl?: string; // Link YouTube, Drive, PDF, Docs, MP4...
  fileName?: string;
  description?: string;
  createdAt: string;
  isPublished: boolean;
}

const CATEGORIES_KEY = "school_learning_categories_v3";
const ITEMS_KEY = "school_learning_items_v3";

export function broadcastLearningUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("school_learning_updated"));
    window.dispatchEvent(new Event("school_data_updated"));
  }
}

// Helper: Extract YouTube Embed URL
export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return "";
  const regExp = /^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11
    ? \`https://www.youtube.com/embed/\${match[2]}?autoplay=1\`
    : url;
}

// Helper: Extract YouTube Thumbnail
export function getYouTubeThumbnail(url: string): string {
  if (!url) return "";
  const regExp = /^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11
    ? \`https://img.youtube.com/vi/\${match[2]}/hqdefault.jpg\`
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
  // --- 12 - TOÁN HỌC ---
  {
    id: "item-toan12-1",
    categoryId: "cat-doc-toan-12",
    categoryName: "12 - TOÁN HỌC",
    type: "document",
    lessonNumber: 1,
    title: "Bài 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Tính đơn điệu, cực trị, giá trị lớn nhất - nhỏ nhất và đường tiệm cận của đồ thị hàm số.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "item-toan12-2",
    categoryId: "cat-doc-toan-12",
    categoryName: "12 - TOÁN HỌC",
    type: "document",
    lessonNumber: 2,
    title: "Bài 2: Nguyên hàm, tích phân và ứng dụng hình học thực tế",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Phương pháp đổi biến số, từng phần và tính diện tích hình phẳng, thể tích khối tròn xoay.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "item-toan12-3",
    categoryId: "cat-doc-toan-12",
    categoryName: "12 - TOÁN HỌC",
    type: "document",
    lessonNumber: 3,
    title: "Bài 3: Phương pháp tọa độ trong không gian Oxyz và bài toán thực tế",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Tọa độ véc tơ, phương trình mặt phẳng, đường thẳng và mặt cầu Oxyz.",
    createdAt: "2026-10-20",
    isPublished: true,
  },

  // --- 12 - NGỮ VĂN ---
  {
    id: "item-van12-1",
    categoryId: "cat-doc-van-12",
    categoryName: "12 - NGỮ VĂN",
    type: "document",
    lessonNumber: 1,
    title: "Bài 1: Chiến thuật giải quyết phần Đọc hiểu văn bản ngoài SGK",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Nhận diện phương thức biểu đạt, phong cách ngôn ngữ, biện pháp tu từ và câu hỏi thông hiểu.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "item-van12-2",
    categoryId: "cat-doc-van-12",
    categoryName: "12 - NGỮ VĂN",
    type: "document",
    lessonNumber: 2,
    title: "Bài 2: Kỹ năng viết đoạn văn Nghị luận xã hội 200 chữ đạt điểm tuyệt đối",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Cấu trúc 5 bước triển khai: Giải thích, Phân tích chứng minh, Bàn luận mở rộng, Bài học hành động.",
    createdAt: "2026-10-20",
    isPublished: true,
  },

  // --- 12 - TIẾNG ANH ---
  {
    id: "item-anh12-1",
    categoryId: "cat-doc-anh-12",
    categoryName: "12 - TIẾNG ANH",
    type: "document",
    lessonNumber: 1,
    title: "Bài 1: Tổng ôn các thì, câu bị động, câu điều kiện và mệnh đề quan hệ",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Cẩm nang 20 chuyên đề ngữ pháp bắt buộc xuất hiện trong đề thi tốt nghiệp THPT.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "item-anh12-2",
    categoryId: "cat-doc-anh-12",
    categoryName: "12 - TIẾNG ANH",
    type: "document",
    lessonNumber: 2,
    title: "Bài 2: Phương pháp làm bài đọc điền từ & đọc hiểu trả lời câu hỏi",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Kỹ thuật Skimming, Scanning và nhận diện từ khóa bẫy trong đoạn văn.",
    createdAt: "2026-10-20",
    isPublished: true,
  },

  // --- 12 - VẬT LÍ ---
  {
    id: "item-ly12-1",
    categoryId: "cat-doc-vat-li-12",
    categoryName: "12 - VẬT LÍ",
    type: "document",
    lessonNumber: 1,
    title: "Bài 1: Vật lí nhiệt và Thuyết động học phân tử chất khí",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Nội năng, các định luật chất khí, phương trình Clapeyron - Mendeleev và bài toán đồ thị.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "item-ly12-2",
    categoryId: "cat-doc-vat-li-12",
    categoryName: "12 - VẬT LÍ",
    type: "document",
    lessonNumber: 2,
    title: "Bài 2: Từ trường, Cảm ứng điện từ và Sóng điện từ",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Lực Loren-xơ, từ thông, suất điện động cảm ứng và ứng dụng kỹ thuật.",
    createdAt: "2026-10-20",
    isPublished: true,
  },

  // --- 12 - HOÁ HỌC ---
  {
    id: "item-hoa12-1",
    categoryId: "cat-doc-hoa-hoc-12",
    categoryName: "12 - HOÁ HỌC",
    type: "document",
    lessonNumber: 1,
    title: "Bài 1: Este, Lipit, Chất béo và Phản ứng xà phòng hóa",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Đồng phân, danh pháp, tính chất hóa học và tư duy giải bài tập thủy phân chất béo.",
    createdAt: "2026-10-20",
    isPublished: true,
  },
  {
    id: "item-hoa12-2",
    categoryId: "cat-doc-hoa-hoc-12",
    categoryName: "12 - HOÁ HỌC",
    type: "document",
    lessonNumber: 2,
    title: "Bài 2: Cacbohiđrat: Glucozơ, Saccarozơ, Tinh bột và Xenlulozơ",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Cấu trúc phân tử, tính chất đặc trưng và ứng dụng công nghiệp.",
    createdAt: "2026-10-20",
    isPublished: true,
  },

  // --- 12 - SINH HỌC ---
  {
    id: "item-sinh12-1",
    categoryId: "cat-doc-sinh-hoc-12",
    categoryName: "12 - SINH HỌC",
    type: "document",
    lessonNumber: 1,
    title: "Bài 1: Cơ chế di truyền và biến dị ở cấp độ phân tử và tế bào",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Nhân đôi ADN, phiên mã, dịch mã, điều hòa hoạt động gen và đột biến gen.",
    createdAt: "2026-10-20",
    isPublished: true,
  },

  // --- 12 - LỊCH SỬ ---
  {
    id: "item-su12-1",
    categoryId: "cat-doc-lich-su-12",
    categoryName: "12 - LỊCH SỬ",
    type: "document",
    lessonNumber: 1,
    title: "Bài 1: Cách mạng tháng Tám 1945 và cuộc kháng chiến chống Pháp (1945-1954)",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Đường lối kháng chiến, chiến dịch Việt Bắc, Biên Giới và Điện Biên Phủ 1954.",
    createdAt: "2026-10-20",
    isPublished: true,
  },

  // --- 12 - ĐỊA LÍ ---
  {
    id: "item-dia12-1",
    categoryId: "cat-doc-dia-li-12",
    categoryName: "12 - ĐỊA LÍ",
    type: "document",
    lessonNumber: 1,
    title: "Bài 1: Địa lí các vùng kinh tế trọng điểm của Việt Nam",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Vùng Đồng bằng sông Hồng, Đông Nam Bộ, Đồng bằng sông Cửu Long và Duyên hải miền Trung.",
    createdAt: "2026-10-20",
    isPublished: true,
  },

  // --- 12 - GDKT & PHÁP LUẬT ---
  {
    id: "item-gdktpl12-1",
    categoryId: "cat-doc-gdktpl-12",
    categoryName: "12 - GDKT & PHÁP LUẬT",
    type: "document",
    lessonNumber: 1,
    title: "Bài 1: Pháp luật với sự phát triển kinh tế và đời sống xã hội",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Quyền tự do kinh doanh, nghĩa vụ nộp thuế và bảo vệ quyền lợi người tiêu dùng.",
    createdAt: "2026-10-20",
    isPublished: true,
  },

  // --- 12 - TIN HỌC ---
  {
    id: "item-tin12-1",
    categoryId: "cat-doc-tin-hoc-12",
    categoryName: "12 - TIN HỌC",
    type: "document",
    lessonNumber: 1,
    title: "Bài 1: Hệ quản trị cơ sở dữ liệu và truy vấn SQL",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Mô hình quan hệ, khóa chính, khóa ngoại, câu lệnh SELECT và tối ưu hóa bảng dữ liệu.",
    createdAt: "2026-10-20",
    isPublished: true,
  },

  // --- 12 - CÔNG NGHỆ ---
  {
    id: "item-cn12-1",
    categoryId: "cat-doc-cong-nghe-12",
    categoryName: "12 - CÔNG NGHỆ",
    type: "document",
    lessonNumber: 1,
    title: "Bài 1: Mạch điện tử điều khiển và công nghệ tự động hóa",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Linh kiện điện tử tích hợp, cảm biến và mạch logic trong sản xuất thông minh.",
    createdAt: "2026-10-20",
    isPublished: true,
  },

  // --- BÀI CỦA VIDEO 12 ---
  {
    id: "item-video-toan12-1",
    categoryId: "cat-video-toan-12",
    categoryName: "12 - Video Luyện Thi Toán 9+ (Hàm số & Oxyz)",
    type: "video",
    lessonNumber: 1,
    title: "Chuyên đề 1: Bí kíp xử lý bài toán Min - Max hàm số chứa dấu giá trị tuyệt đối",
    contentUrl: "https://www.youtube.com/watch?v=3JZ_D3ELwOQ",
    description: "Phương pháp ghép trục và tịnh tiến đồ thị đạt điểm 9+ Toán tốt nghiệp.",
    createdAt: "2026-10-22",
    isPublished: true,
  },
  {
    id: "item-video-van12-1",
    categoryId: "cat-video-van-12",
    categoryName: "12 - Video Bí Quyết Viết Nghị Luận Xã Hội & Văn Học",
    type: "video",
    lessonNumber: 1,
    title: "Bí quyết 1: Viết đoạn văn 200 chữ mạch lạc, sáng tạo bằng dẫn chứng thời sự",
    contentUrl: "https://www.youtube.com/watch?v=kqtD5dpn9C8",
    description: "Hướng dẫn chọn lọc dẫn chứng đời sống, tư duy phản biện sắc bén.",
    createdAt: "2026-10-22",
    isPublished: true,
  },
  {
    id: "item-video-anh12-1",
    categoryId: "cat-video-anh-12",
    categoryName: "12 - Video Tổng Ôn Cấp Tốc Ngữ Pháp & Từ Vựng Tiếng Anh",
    type: "video",
    lessonNumber: 1,
    title: "Tuyệt chiêu 1: Bẫy câu đảo ngữ và mệnh đề phân từ trong đề thi đại học",
    contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    description: "Nhận biết ngay cấu trúc đảo ngữ trong 10 giây đầu tiên.",
    createdAt: "2026-10-22",
    isPublished: true,
  },

  // --- CÁC BÀI CỦA 11 ĐÃ CÓ TRƯỚC ---
  {
    id: "item-toan-1",
    categoryId: "cat-doc-toan-11",
    categoryName: "11 - TOÁN HỌC",
    type: "document",
    lessonNumber: 1,
    title: "Bài 1: Hàm số lượng giác và phương trình lượng giác cơ bản",
    contentUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view",
    description: "Tài liệu hệ thống công thức biến đổi lượng giác và kỹ năng giải phương trình.",
    createdAt: "2026-10-10",
    isPublished: true,
  },
  {
    id: "item-video-ai-1",
    categoryId: "cat-video-ai-web",
    categoryName: "Thiết kế Website bằng AI",
    type: "video",
    lessonNumber: 1,
    title: "Bài 1: Tạo giao diện Landing Page chuyên nghiệp với AI chỉ trong 10 phút",
    contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    description: "Video hướng dẫn thực chiến xây dựng giao diện người dùng tối ưu chuyển đổi.",
    createdAt: "2026-10-12",
    isPublished: true,
  },
  {
    id: "item-video-python-1",
    categoryId: "cat-video-python",
    categoryName: "Lập trình Python từ cơ bản đến nâng cao",
    type: "video",
    lessonNumber: 1,
    title: "Bài 1: Làm quen cú pháp Python, biến, kiểu dữ liệu và toán tử",
    contentUrl: "https://www.youtube.com/watch?v=kqtD5dpn9C8",
    description: "Nhập môn lập trình Python cho người mới bắt đầu.",
    createdAt: "2026-10-12",
    isPublished: true,
  },
];

// LẤY DANH SÁCH MỤC: TỰ ĐỘNG MERGE CÁC MÔN LỚP 12 MỚI NHẤT
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
  const id = \`cat_\${Date.now()}\`;
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
  const id = \`item_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`;
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
                description: \`Mục \${catNameInRow} được nhập tự động từ file Excel\`,
                author: "Tổ Chuyên Môn THPT",
                createdAt: new Date().toISOString().split("T")[0],
              });
              targetCat = {
                id: newCatRes.id || \`cat_\${Date.now()}\`,
                name: catNameInRow,
                type: format,
                createdAt: new Date().toISOString().split("T")[0],
              };
            }
          }

          const lessonNumber = r["Bài Số"] || r["Số Bài"] || createdCount + 1;
          const lessonTitle =
            r["Tên Bài / Tiêu Đề Bài"] || r["Tên Bài"] || r["Tiêu Đề"] || \`Bài học \${lessonNumber}\`;
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
`;

fs.writeFileSync(serviceFile, newContent, 'utf8');
console.log('Successfully updated learningCategoryService.ts with Grade 12 Graduation Exam subjects!');
