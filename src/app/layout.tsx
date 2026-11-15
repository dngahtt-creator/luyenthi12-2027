import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Luyện thi 12 - Bứt phá điểm số | Cô Đặng Anh Thư",
  description: "Hệ thống luyện thi tốt nghiệp THPT lớp 12 chuẩn cấu trúc mới nhất. Ngân hàng đề thi thử, bài tập chuyên đề và phương pháp bứt phá điểm 9+ cùng Cô Đặng Anh Thư.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
