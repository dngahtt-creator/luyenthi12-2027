import { db } from "./firebase";
import { collection, doc, setDoc, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";
import { DEFAULT_CLASSES, DEFAULT_STUDENTS } from "./classStudentService";
import { DEFAULT_EXAMS, DEFAULT_DOCUMENTS } from "./examService";

/**
 * Seed all default initial data (Classes, Students, Exams, Documents, Users)
 * directly into Firebase Cloud Firestore.
 */
export async function seedAllDataToFirestore(): Promise<{
  success: boolean;
  classesCount: number;
  studentsCount: number;
  examsCount: number;
  docsCount: number;
  error?: string;
}> {
  try {
    const batch = writeBatch(db);

    // 1. Seed Classes
    DEFAULT_CLASSES.forEach((cls) => {
      const docRef = doc(db, "classes", cls.id);
      batch.set(docRef, {
        ...cls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });

    // 2. Seed Students
    DEFAULT_STUDENTS.forEach((std) => {
      const docRef = doc(db, "students", std.id);
      batch.set(docRef, {
        ...std,
        createdAt: serverTimestamp(),
      }, { merge: true });
    });

    // 3. Seed Exams
    DEFAULT_EXAMS.forEach((exam) => {
      const docRef = doc(db, "exams", exam.id);
      batch.set(docRef, {
        ...exam,
        createdAt: serverTimestamp(),
      }, { merge: true });
    });

    // 4. Seed Documents
    DEFAULT_DOCUMENTS.forEach((d) => {
      const docRef = doc(db, "documents", d.id);
      batch.set(docRef, {
        ...d,
        createdAt: serverTimestamp(),
      }, { merge: true });
    });

    // 5. Seed Initial Admin Users (Cô Đặng Anh Thư)
    const adminRef1 = doc(db, "users", "admin_dang_anh_thu_gmail");
    batch.set(adminRef1, {
      uid: "admin_dang_anh_thu_gmail",
      email: "thudanganh670@gmail.com",
      fullName: "Cô Đặng Anh Thư",
      teacherCode: "571024",
      schoolName: "THPT DTNT THCS & THPT Tuy Đức",
      studentClass: "Ban Giám Hiệu / Quản Trị",
      role: "admin",
      status: "active",
      authProvider: "google",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    }, { merge: true });

    // Xóa tài khoản mẫu dư thừa nếu tồn tại
    const adminRef2 = doc(db, "users", "admin_dang_anh_thu");
    batch.delete(adminRef2);

    // Commit all to Firestore
    await batch.commit();

    return {
      success: true,
      classesCount: DEFAULT_CLASSES.length,
      studentsCount: DEFAULT_STUDENTS.length,
      examsCount: DEFAULT_EXAMS.length,
      docsCount: DEFAULT_DOCUMENTS.length,
    };
  } catch (err: unknown) {
    console.error("Lỗi khi nạp dữ liệu lên Firestore:", err);
    return {
      success: false,
      classesCount: 0,
      studentsCount: 0,
      examsCount: 0,
      docsCount: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
