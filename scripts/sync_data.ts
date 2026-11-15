import { seedAllDataToFirestore } from "../src/lib/seedService";

async function main() {
  console.log("🚀 Đang bắt đầu liên kết & nạp toàn bộ dữ liệu web lên Firebase Cloud Firestore...");
  const res = await seedAllDataToFirestore();
  if (res.success) {
    console.log(`✅ THÀNH CÔNG!`);
    console.log(`- Đã nạp ${res.classesCount} Lớp học (Collection: classes)`);
    console.log(`- Đã nạp ${res.studentsCount} Học sinh (Collection: students)`);
    console.log(`- Đã nạp ${res.examsCount} Đề thi (Collection: exams)`);
    console.log(`- Đã nạp ${res.docsCount} Tài liệu (Collection: documents)`);
    console.log(`- Đã nạp Tài khoản Quản trị Cô Đặng Anh Thư (Collection: users)`);
    console.log(`\n🎉 Toàn bộ dữ liệu web đã được ghi trực tiếp vào Firebase Cloud Firestore!`);
    process.exit(0);
  } else {
    console.error("❌ Thất bại:", res.error);
    process.exit(1);
  }
}

main();
