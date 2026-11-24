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

export const DEFAULT_TEACHER: CurrentAuthUser = {
  uid: "teacher_sogaminh123",
  email: "sogaminh123@gmail.com",
  name: "sogaminh123",
  fullName: "sogaminh123",
  role: "teacher",
  teacherCode: "628842",
  studentClass: "Giáo viên bộ môn",
  schoolName: "THPT DTNT THCS & THPT Tuy Đức",
};

/**
 * Lấy tên tài khoản hiển thị cho người dùng, đảm bảo hiển thị đúng tên tài khoản của GV (sogaminh123, email prefix hoặc fullName từ Google)
 */
export function getDisplayedAccountName(user?: CurrentAuthUser | null): string {
  if (!user) return "Bạn";

  const genericNames = [
    "thầy/cô",
    "giáo viên",
    "thầy/cô giáo viên",
    "thầy cô giáo viên",
    "thầy cô",
    "bạn",
    "teacher",
    "user",
  ];

  const rawFullName = (user.fullName || "").trim();
  if (rawFullName && !genericNames.includes(rawFullName.toLowerCase())) {
    return rawFullName;
  }

  const rawName = (user.name || "").trim();
  if (rawName && !genericNames.includes(rawName.toLowerCase())) {
    return rawName;
  }

  if (user.email && user.email.includes("@")) {
    const prefix = user.email.split("@")[0].trim();
    if (prefix && !genericNames.includes(prefix.toLowerCase())) {
      return prefix;
    }
  }

  if (user.role === "super_admin") {
    return "Đặng Anh Thư";
  }

  if (user.role === "teacher") {
    return DEFAULT_TEACHER.name;
  }

  return rawFullName || rawName || "Bạn";
}

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
 * Lấy thông tin tài khoản hiện tại (Ưu tiên đọc từ sessionStorage của tab hiện tại để đảm bảo các tab hoàn toàn độc lập)
 */
export function getCurrentAuthUser(): CurrentAuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    const isAtAdminPage =
      typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

    // Đọc riêng theo tab: sessionStorage trước, fallback sang localStorage
    const studentSessionRaw =
      sessionStorage.getItem("student_portal_session") ||
      (!isAtAdminPage ? localStorage.getItem("student_portal_session") : null);

    const schoolUserRaw =
      sessionStorage.getItem("school_current_user") ||
      localStorage.getItem("school_current_user");

    // Nếu ở trang Quản trị: Tuyệt đối chỉ nhận diện tài khoản Admin / Giáo viên
    if (isAtAdminPage) {
      if (schoolUserRaw) {
        const u = JSON.parse(schoolUserRaw);
        if (u) {
          const emailNorm = (u.email || "").toLowerCase().trim();
          const isSuperAdminEmail =
            SUPER_ADMIN_EMAILS.includes(emailNorm) ||
            emailNorm.includes("danganhthu") ||
            u.role === "super_admin" ||
            (u.role === "admin" && !u.studentClass?.includes("Học sinh"));

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
          const fallbackTeacherName =
            u.email && u.email.includes("@") ? u.email.split("@")[0] : DEFAULT_TEACHER.name;
          const rawTeacherName = (u.fullName || u.name || "").trim();
          const isGeneric =
            !rawTeacherName ||
            ["thầy/cô", "giáo viên", "thầy/cô giáo viên", "bạn", "teacher"].includes(
              rawTeacherName.toLowerCase()
            );
          const teacherName = isGeneric ? fallbackTeacherName : rawTeacherName;

          return {
            uid: u.uid || DEFAULT_TEACHER.uid,
            email: u.email || DEFAULT_TEACHER.email,
            name: teacherName,
            fullName: teacherName,
            role: "teacher",
            teacherCode: u.teacherCode || DEFAULT_TEACHER.teacherCode,
            studentClass:
              u.studentClass && !u.studentClass.includes("Học sinh")
                ? u.studentClass
                : "Giáo viên bộ môn",
            schoolName: u.schoolName || "THPT DTNT THCS & THPT Tuy Đức",
            avatarUrl: u.avatarUrl,
          };
        }
      }
      return null;
    }

    // Nếu ở trang Học sinh hoặc tab hiện tại đang có phiên học sinh:
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
          teacherCode: s.teacherCode,
          schoolName: "THPT DTNT THCS & THPT Tuy Đức",
        };
      }
    }

    // Các trang khác (Trang chủ, bài thi...): Đọc schoolUserRaw
    if (schoolUserRaw) {
      const u = JSON.parse(schoolUserRaw);
      if (u) {
        const emailNorm = (u.email || "").toLowerCase().trim();
        const isSuperAdminEmail =
          SUPER_ADMIN_EMAILS.includes(emailNorm) ||
          emailNorm.includes("danganhthu") ||
          u.role === "super_admin" ||
          (u.role === "admin" && !u.studentClass?.includes("Học sinh"));

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

        if (u.role === "student") {
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

        const fallbackTeacherName =
          u.email && u.email.includes("@") ? u.email.split("@")[0] : DEFAULT_TEACHER.name;
        const rawTeacherName = (u.fullName || u.name || "").trim();
        const isGeneric =
          !rawTeacherName ||
          ["thầy/cô", "giáo viên", "thầy/cô giáo viên", "bạn", "teacher"].includes(
            rawTeacherName.toLowerCase()
          );
        const teacherName = isGeneric ? fallbackTeacherName : rawTeacherName;

        return {
          uid: u.uid || DEFAULT_TEACHER.uid,
          email: u.email || DEFAULT_TEACHER.email,
          name: teacherName,
          fullName: teacherName,
          role: "teacher",
          teacherCode: u.teacherCode || DEFAULT_TEACHER.teacherCode,
          studentClass:
            u.studentClass && !u.studentClass.includes("Học sinh")
              ? u.studentClass
              : "Giáo viên bộ môn",
          schoolName: u.schoolName || "THPT DTNT THCS & THPT Tuy Đức",
          avatarUrl: u.avatarUrl,
        };
      }
    }
  } catch (e) {
    console.warn("Lỗi đọc session auth:", e);
  }

  return null;
}

/**
 * Lưu phiên đăng nhập tài khoản vào sessionStorage (cho tab hiện tại) và localStorage (khi cần)
 */
export function setCurrentAuthUser(user: CurrentAuthUser | null) {
  if (typeof window === "undefined") return;

  try {
    if (!user) {
      sessionStorage.removeItem("school_current_user");
      sessionStorage.removeItem("student_portal_session");
      localStorage.removeItem("school_current_user");
    } else {
      // Lưu vào sessionStorage để cô lập riêng cho tab này
      sessionStorage.setItem("school_current_user", JSON.stringify(user));

      if (user.role === "student" && user.studentId) {
        const studentSession = {
          studentId: user.studentId,
          studentName: user.name,
          className: user.studentClass || "12A1",
          classId: user.studentClass || "12A1",
          loggedInAt: Date.now(),
        };
        sessionStorage.setItem("student_portal_session", JSON.stringify(studentSession));
        localStorage.setItem("student_portal_session", JSON.stringify(studentSession));
      } else {
        // Giáo viên / Super Admin: Lưu vào localStorage cho Admin, TUYỆT ĐỐI KHÔNG XÓA student_portal_session của các tab học sinh!
        localStorage.setItem("school_current_user", JSON.stringify(user));
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
      uid: "teacher_sogaminh123",
      email: "sogaminh123@gmail.com",
      name: customName || DEFAULT_TEACHER.name,
      fullName: customName || DEFAULT_TEACHER.fullName,
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
 * Đăng xuất học sinh CHỈ trên tab hiện tại (Tuyệt đối KHÔNG đăng xuất tài khoản Giáo viên/Admin ở các tab khác)
 */
export function logoutStudentSession() {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("student_portal_session");
      sessionStorage.removeItem("school_current_user");
      // Xóa trong localStorage nếu localStorage đang chứa session của học sinh này
      localStorage.removeItem("student_portal_session");
    } catch {}
    window.dispatchEvent(new CustomEvent("school_auth_changed", { detail: null }));
  }
}

/**
 * Đăng xuất hoàn toàn
 */
export async function logoutAllSessions() {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("school_current_user");
      sessionStorage.removeItem("student_portal_session");
      localStorage.removeItem("school_current_user");
      localStorage.removeItem("student_portal_session");
    } catch {}
    window.dispatchEvent(new CustomEvent("school_auth_changed", { detail: null }));
  }
  try {
    await firebaseSignOut(auth);
  } catch { }
}
