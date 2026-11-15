import { auth } from "./firebase";
import { signOut as firebaseSignOut } from "firebase/auth";

export type UserRole = "super_admin" | "teacher" | "student" | "guest";

export interface CurrentAuthUser {
  uid?: string;
  email?: string;
  name: string;
  fullName?: string;
  role: UserRole;
  teacherCode?: string;
  studentClass?: string;
  studentId?: string;
  avatarUrl?: string;
  schoolName?: string;
}

export const SUPER_ADMIN_EMAILS = [
  "thudanganh670@gmail.com",
  "danganhthu@tuyduc.edu.vn",
];

export const DEFAULT_SUPER_ADMIN: CurrentAuthUser = {
  uid: "super_admin_thudanganh",
  email: "thudanganh670@gmail.com",
  name: "Đặng Anh Thư",
  fullName: "Đặng Anh Thư",
  role: "super_admin",
  teacherCode: "571024",
  studentClass: "Ban Giám Hiệu / Quản Trị",
  schoolName: "THPT DTNT THCS & THPT Tuy Đức",
};

/**
 * 4 Quyền duy nhất dành cho Giáo viên bộ môn (như ảnh người dùng yêu cầu):
 * 1. 🏫 Lớp và Học sinh (classes)
 * 2. 📊 Quản lý học tập (learning)
 * 3. 📝 Giao Bài tập & Đề thi (exams)
 * 4. 📁 Giao tài liệu (documents)
 */
export const TEACHER_ALLOWED_TABS = ["classes", "learning", "exams", "documents"] as const;
export type TeacherAllowedTab = (typeof TEACHER_ALLOWED_TABS)[number];

export function isTeacherAllowedTab(tab: string): boolean {
  return TEACHER_ALLOWED_TABS.includes(tab as TeacherAllowedTab);
}

/**
 * Lấy thông tin tài khoản hiện tại từ localStorage
 */
export function getCurrentAuthUser(): CurrentAuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    // 1. Kiểm tra session học sinh trước
    const studentSessionRaw = localStorage.getItem("student_portal_session");
    const schoolUserRaw = localStorage.getItem("school_current_user");

    if (schoolUserRaw) {
      const u = JSON.parse(schoolUserRaw);
      if (u) {
        const emailNorm = (u.email || "").toLowerCase().trim();
        const isSuperAdminEmail =
          SUPER_ADMIN_EMAILS.includes(emailNorm) ||
          emailNorm.includes("danganhthu") ||
          u.role === "super_admin" ||
          (u.role === "admin" && !u.studentClass?.includes("Học sinh"));

        if (
          u.role === "student" ||
          (!isSuperAdminEmail && u.studentClass?.includes("Học sinh") && !u.teacherCode)
        ) {
          return {
            uid: u.uid || u.studentId,
            email: u.email,
            name: u.fullName || u.name || "Học sinh",
            fullName: u.fullName || u.name || "Học sinh",
            role: "student",
            studentClass: u.studentClass || u.className,
            studentId: u.studentId,
            schoolName: u.schoolName,
          };
        }

        if (isSuperAdminEmail) {
          return {
            uid: u.uid || DEFAULT_SUPER_ADMIN.uid,
            email: u.email || DEFAULT_SUPER_ADMIN.email,
            name: u.fullName || u.name || DEFAULT_SUPER_ADMIN.name,
            fullName: u.fullName || u.name || DEFAULT_SUPER_ADMIN.fullName,
            role: "super_admin",
            teacherCode: u.teacherCode || DEFAULT_SUPER_ADMIN.teacherCode,
            studentClass: u.studentClass || DEFAULT_SUPER_ADMIN.studentClass,
            schoolName: u.schoolName || DEFAULT_SUPER_ADMIN.schoolName,
            avatarUrl: u.avatarUrl,
          };
        }

        // Quyền Giáo viên
        return {
          uid: u.uid,
          email: u.email,
          name: u.fullName || u.name || "Giáo viên",
          fullName: u.fullName || u.name || "Giáo viên",
          role: "teacher",
          teacherCode: u.teacherCode,
          studentClass: u.studentClass || "Giáo viên bộ môn",
          schoolName: u.schoolName || "THPT DTNT THCS & THPT Tuy Đức",
          avatarUrl: u.avatarUrl,
        };
      }
    }

    if (studentSessionRaw) {
      const s = JSON.parse(studentSessionRaw);
      if (s && s.studentId) {
        return {
          uid: s.studentId,
          name: s.studentName,
          fullName: s.studentName,
          role: "student",
          studentClass: s.className,
          studentId: s.studentId,
          schoolName: "THPT DTNT THCS & THPT Tuy Đức",
        };
      }
    }
  } catch (e) {
    console.warn("Lỗi đọc session auth:", e);
  }

  return null;
}

/**
 * Lưu phiên đăng nhập tài khoản vào localStorage và phát sự kiện
 */
export function setCurrentAuthUser(user: CurrentAuthUser | null) {
  if (typeof window === "undefined") return;

  try {
    if (!user) {
      localStorage.removeItem("school_current_user");
      localStorage.removeItem("student_portal_session");
    } else {
      localStorage.setItem("school_current_user", JSON.stringify(user));
      if (user.role === "student" && user.studentId) {
        const studentSession = {
          studentId: user.studentId,
          studentName: user.name,
          className: user.studentClass || "12A1",
          classId: user.studentClass || "12A1",
          loggedInAt: Date.now(),
        };
        localStorage.setItem("student_portal_session", JSON.stringify(studentSession));
      } else {
        localStorage.removeItem("student_portal_session");
      }
    }

    window.dispatchEvent(new CustomEvent("school_auth_changed", { detail: user }));
  } catch (e) {
    console.warn("Lỗi lưu session auth:", e);
  }
}

/**
 * Chuyển nhanh chế độ đăng nhập để kiểm thử vai trò (Super Admin / Giáo viên / Học sinh)
 */
export function switchMockRole(role: "super_admin" | "teacher" | "student", customName?: string) {
  if (typeof window === "undefined") return;

  let user: CurrentAuthUser;
  if (role === "super_admin") {
    user = {
      ...DEFAULT_SUPER_ADMIN,
      name: customName || DEFAULT_SUPER_ADMIN.name,
      fullName: customName || DEFAULT_SUPER_ADMIN.fullName,
    };
  } else if (role === "teacher") {
    user = {
      uid: "teacher_user_" + Date.now(),
      email: "giaovien.tuyduc@gmail.com",
      name: customName || "Thầy/Cô Giáo Viên",
      fullName: customName || "Thầy/Cô Giáo Viên",
      role: "teacher",
      teacherCode: "628842",
      studentClass: "Giáo viên bộ môn",
      schoolName: "THPT DTNT THCS & THPT Tuy Đức",
    };
  } else {
    user = {
      uid: "std_mock_1",
      name: customName || "Nguyễn Văn An",
      fullName: customName || "Nguyễn Văn An",
      role: "student",
      studentClass: "12A1",
      studentId: "std_mock_1",
      schoolName: "THPT DTNT THCS & THPT Tuy Đức",
    };
  }

  setCurrentAuthUser(user);
}

/**
 * Đăng xuất hoàn toàn
 */
export async function logoutAllSessions() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("school_current_user");
    localStorage.removeItem("student_portal_session");
    window.dispatchEvent(new CustomEvent("school_auth_changed", { detail: null }));
  }
  try {
    await firebaseSignOut(auth);
  } catch {}
}
