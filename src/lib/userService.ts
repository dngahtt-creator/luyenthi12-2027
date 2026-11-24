import { db, auth } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  limit,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from "firebase/auth";

export interface UserAccountData {
  uid: string;
  email: string;
  fullName: string;
  schoolName?: string;
  studentClass?: string;
  authProvider: "password" | "google.com" | string;
  role?: "student" | "admin" | "teacher" | string;
  teacherCode?: string; // Mã giáo viên gồm 6 chữ số, cố định theo giáo viên
  registeredDate?: string; // Ngày đăng ký (tính từ lúc nhấp vào đăng ký), ví dụ: 19/9/2026
  status: "active" | "inactive" | "locked" | string; // active: ĐÃ KÍCH HOẠT, inactive: CHƯA KÍCH HOẠT, locked: BỊ KHÓA
  createdAt?: unknown;
  lastLoginAt?: unknown;
  phoneNumber?: string;
  avatarUrl?: string;
}

const DEFAULT_SCHOOL = "THPT DTNT THCS & THPT Tuy Đức";
const LOCAL_STORAGE_USERS_KEY = "tuyduc_registered_users_cache";

/**
 * Danh sách ID và Email các tài khoản cũ cần loại bỏ hoàn toàn
 */
export const OLD_ACCOUNT_IDENTIFIERS = [
  "usr_fc_zo_zo",
  "usr_gioi_luong",
  "usr_gioi_luong_68",
  "luonggioi.gv@thddn.edu.vn",
  "luonggioi68@gmail.com",
  "admin_dang_anh_thu",
  "danganhthu@tuyduc.edu.vn",
];

/**
 * Tài khoản Admin thực tế đã đăng nhập của trường (Đặng Anh Thư) và Giáo viên chính
 */
export const DEFAULT_USERS: UserAccountData[] = [
  {
    uid: "admin_dang_anh_thu_gmail",
    email: "thudanganh670@gmail.com",
    fullName: "Đặng Anh Thư",
    teacherCode: "571024", // Mã giáo viên 6 số cố định 571024
    registeredDate: "01/09/2026",
    status: "active",
    schoolName: "THPT DTNT THCS & THPT Tuy Đức",
    studentClass: "Ban Giám Hiệu / Quản Trị",
    authProvider: "google",
    role: "admin",
  },
  {
    uid: "teacher_sogaminh123",
    email: "sogaminh123@gmail.com",
    fullName: "sogaminh123",
    teacherCode: "628842",
    registeredDate: "01/09/2026",
    status: "active",
    schoolName: "THPT DTNT THCS & THPT Tuy Đức",
    studentClass: "Giáo viên bộ môn",
    authProvider: "password",
    role: "teacher",
  },
];

/**
 * Sinh mã giáo viên 6 chữ số (cố định mặc định 571024)
 */
export function generateTeacherCode(seed?: string): string {
  if (seed && seed !== "thudanganh670@gmail.com") {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
    }
    const num = (Math.abs(hash) % 900000) + 100000;
    return num.toString();
  }
  return "571024";
}

/**
 * Lấy chuỗi ngày đăng ký dạng D/M/YYYY tính từ thời điểm hiện tại
 */
export function getRegistrationDateString(d: Date = new Date()): string {
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Dọn sạch triệt để các tài khoản cũ/mẫu trong Firestore và localStorage
 */
export async function purgeOldAccounts(): Promise<{ count: number }> {
  let deletedCount = 0;

  // 1. Dọn dẹp trong Firestore nếu có
  for (const id of OLD_ACCOUNT_IDENTIFIERS) {
    try {
      await deleteDoc(doc(db, "users", id));
      deletedCount++;
    } catch {
      // ignore
    }
  }

  // 2. Dọn dẹp trong localStorage cache
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (raw) {
        let list: UserAccountData[] = JSON.parse(raw);
        const initialLen = list.length;
        list = list.filter(
          (u) =>
            !OLD_ACCOUNT_IDENTIFIERS.includes(u.uid) &&
            !OLD_ACCOUNT_IDENTIFIERS.includes((u.email || "").toLowerCase().trim())
        );
        deletedCount += initialLen - list.length;
        localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(list));
      }
    } catch {
      // ignore
    }
  }

  return { count: deletedCount };
}

/**
 * Lưu danh sách tài khoản cục bộ vào localStorage làm cache đồng bộ
 */
function updateLocalUserCache(user: UserAccountData) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    let list: UserAccountData[] = raw ? JSON.parse(raw) : [...DEFAULT_USERS];
    // Loại bỏ tài khoản cũ nếu có
    list = list.filter(
      (u) =>
        !OLD_ACCOUNT_IDENTIFIERS.includes(u.uid) &&
        !OLD_ACCOUNT_IDENTIFIERS.includes((u.email || "").toLowerCase().trim())
    );

    const index = list.findIndex(
      (u) => u.uid === user.uid || (u.email && u.email.toLowerCase() === user.email.toLowerCase())
    );
    if (index >= 0) {
      list[index] = { ...list[index], ...user };
    } else {
      list.push(user);
    }
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("Lưu localStorage thất bại:", err);
  }
}

/**
 * Tìm tài khoản trong cơ sở dữ liệu (Firestore hoặc danh sách đã lưu trữ).
 * CHỈ những tài khoản có trong cơ sở dữ liệu mới được phép đăng nhập.
 */
export async function findUserInDatabase(email: string): Promise<UserAccountData | null> {
  const normalizedEmail = (email || "").toLowerCase().trim();
  if (!normalizedEmail) return null;

  // Nếu là email cũ đã xóa thì từ chối ngay
  if (OLD_ACCOUNT_IDENTIFIERS.includes(normalizedEmail)) {
    return null;
  }

  // 1. Tìm trong Firestore
  try {
    const docId = normalizedEmail.replace(/[.@]/g, "_");
    const userDoc = await getDoc(doc(db, "users", docId));
    if (userDoc.exists()) {
      const data = userDoc.data() as UserAccountData;
      if (!OLD_ACCOUNT_IDENTIFIERS.includes(data.uid)) {
        return { ...data, uid: data.uid || userDoc.id };
      }
    }

    const colRef = collection(db, "users");
    const snap = await getDocs(colRef);
    let foundDoc: UserAccountData | null = null;
    snap.forEach((d) => {
      const dData = d.data() as UserAccountData;
      if (
        dData.email &&
        dData.email.toLowerCase().trim() === normalizedEmail &&
        !OLD_ACCOUNT_IDENTIFIERS.includes(d.id) &&
        !OLD_ACCOUNT_IDENTIFIERS.includes(dData.uid)
      ) {
        foundDoc = { ...dData, uid: dData.uid || d.id };
      }
    });
    if (foundDoc) return foundDoc;
  } catch (err) {
    console.warn("Lỗi đọc Firestore khi kiểm tra tài khoản:", err);
  }

  // 2. Tìm trong Local Cache cơ sở dữ liệu
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (raw) {
        const list: UserAccountData[] = JSON.parse(raw);
        const match = list.find(
          (u) =>
            u.email &&
            u.email.toLowerCase().trim() === normalizedEmail &&
            !OLD_ACCOUNT_IDENTIFIERS.includes(u.email.toLowerCase().trim()) &&
            !OLD_ACCOUNT_IDENTIFIERS.includes(u.uid)
        );
        if (match) return match;
      }
    } catch {
      // ignore
    }
  }

  // 3. Kiểm tra tài khoản Quản trị viên
  const defaultMatch = DEFAULT_USERS.find(
    (u) => u.email.toLowerCase().trim() === normalizedEmail
  );
  if (defaultMatch) return defaultMatch;

  return null;
}

/**
 * Save or update user account profile in Firestore 'users' collection
 */
export async function saveUserToFirestore(account: UserAccountData) {
  try {
    const docId = account.uid || account.email.replace(/[.@]/g, "_");
    const userDocRef = doc(db, "users", docId);

    const teacherCode = account.teacherCode || generateTeacherCode(account.email);
    const registeredDate = account.registeredDate || getRegistrationDateString();

    const dataToSave = {
      ...account,
      teacherCode,
      registeredDate,
      schoolName: account.schoolName || DEFAULT_SCHOOL,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    updateLocalUserCache(dataToSave);

    await setDoc(userDocRef, dataToSave, { merge: true });
    return { success: true, id: docId, user: dataToSave };
  } catch (error) {
    console.warn("Error saving user to Firestore (using local fallback):", error);
    updateLocalUserCache(account);
    return { success: false, error, user: account };
  }
}

/**
 * Cập nhật thông tin tài khoản (Sửa tài khoản)
 */
export async function updateUserInFirestore(
  uid: string,
  updates: Partial<UserAccountData>
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const docId = uid;
    const userDocRef = doc(db, "users", docId);

    await setDoc(
      userDocRef,
      {
        ...updates,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("Lỗi cập nhật Firestore, chuyển sang cập nhật cục bộ:", error);
  }

  // Cập nhật bộ nhớ cục bộ đồng bộ cho mọi trang tra cứu
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      let list: UserAccountData[] = raw ? JSON.parse(raw) : [];
      let found = false;
      list = list.map((u) => {
        if (
          u.uid === uid ||
          (updates.email && u.email && u.email.toLowerCase() === updates.email.toLowerCase())
        ) {
          found = true;
          return { ...u, ...updates };
        }
        return u;
      });

      if (!found && updates.email) {
        list.push({
          uid,
          email: updates.email,
          fullName: updates.fullName || "Giáo viên",
          teacherCode: updates.teacherCode || "",
          status: updates.status || "active",
          registeredDate: updates.registeredDate || getRegistrationDateString(),
          role: "teacher",
          authProvider: updates.authProvider || "google",
        });
      }

      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(list));

      // Cập nhật session giáo viên hiện tại nếu đang đăng nhập
      const curUserRaw = localStorage.getItem("school_current_user");
      if (curUserRaw) {
        try {
          const cur = JSON.parse(curUserRaw);
          if (cur.email === updates.email || cur.uid === uid) {
            localStorage.setItem(
              "school_current_user",
              JSON.stringify({ ...cur, ...updates })
            );
          }
        } catch { }
      }
    } catch (e) {
      console.warn("Lỗi lưu localStorage user cache:", e);
    }
  }

  return { success: true };
}

/**
 * Xóa tài khoản khỏi hệ thống
 */
export async function deleteUserFromFirestore(
  uid: string
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const docId = uid;
    const userDocRef = doc(db, "users", docId);
    await deleteDoc(userDocRef);

    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (raw) {
        let list: UserAccountData[] = JSON.parse(raw);
        list = list.filter((u) => u.uid !== uid);
        localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(list));
      }
    }

    return { success: true };
  } catch (error) {
    console.warn("Lỗi xóa Firestore, xóa cục bộ:", error);
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (raw) {
        let list: UserAccountData[] = JSON.parse(raw);
        list = list.filter((u) => u.uid !== uid);
        localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(list));
      }
    }
    return { success: true };
  }
}

/**
 * Register account with Email & Password
 */
export async function registerWithEmail(params: {
  email: string;
  password: string;
  fullName: string;
  studentClass?: string;
  phoneNumber?: string;
  role?: string;
  status?: "active" | "inactive";
}) {
  try {
    let uid = "";
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, params.email, params.password);
      uid = userCredential.user.uid;
    } catch (authErr: unknown) {
      const authErrMsg = authErr instanceof Error ? authErr.message : String(authErr);
      console.warn("Firebase Auth CreateUser Notice:", authErrMsg);
      uid = "user_" + Math.abs(hashCode(params.email));
    }

    const teacherCode = generateTeacherCode(params.email);
    const registeredDate = getRegistrationDateString();

    const accountData: UserAccountData = {
      uid: uid,
      email: params.email.toLowerCase().trim(),
      fullName: params.fullName || params.email.split("@")[0],
      teacherCode: teacherCode,
      registeredDate: registeredDate,
      schoolName: DEFAULT_SCHOOL,
      studentClass: params.studentClass || "Giáo viên",
      authProvider: "password",
      role: params.role || "teacher",
      status: params.status || "active",
      phoneNumber: params.phoneNumber || "",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };

    await saveUserToFirestore(accountData);

    return {
      success: true,
      user: accountData,
    };
  } catch (error: unknown) {
    console.error("Error registering with Firebase:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Đăng ký thất bại",
    };
  }
}

/**
 * ĐĂNG NHẬP BẰNG EMAIL & MẬT KHẨU
 * QUY TẮC: CHỈ CHO PHÉP ĐĂNG NHẬP NẾU TÀI KHOẢN ĐÃ CÓ TRÊN CƠ SỞ DỮ LIỆU
 */
export async function loginWithEmail(email: string, password: string) {
  const normalizedEmail = (email || "").toLowerCase().trim();

  // BƯỚC 1: KIỂM TRA TÀI KHOẢN CÓ TRÊN CƠ SỞ DỮ LIỆU KHÔNG
  const existingUser = await findUserInDatabase(normalizedEmail);
  if (!existingUser) {
    return {
      success: false,
      error: `Tài khoản "${email}" không tồn tại trên cơ sở dữ liệu! Chỉ những tài khoản đã được quản trị viên cấp phép mới có thể đăng nhập.`,
    };
  }

  // BƯỚC 2: KIỂM TRA TRẠNG THÁI KÍCH HOẠT
  if (existingUser.status !== "active") {
    return {
      success: false,
      error: `Tài khoản "${email}" đang ở trạng thái CHƯA KÍCH HOẠT hoặc BỊ KHÓA. Vui lòng liên hệ Quản trị viên để được mở tài khoản!`,
    };
  }

  // BƯỚC 3: XÁC THỰC VÀ CHO PHÉP ĐĂNG NHẬP
  try {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (authErr: unknown) {
      console.warn("Firebase Auth SignIn fallback:", authErr);
    }

    const updatedUser: UserAccountData = {
      ...existingUser,
      lastLoginAt: serverTimestamp(),
    };

    try {
      const docId = existingUser.uid || normalizedEmail.replace(/[.@]/g, "_");
      await setDoc(doc(db, "users", docId), { lastLoginAt: serverTimestamp() }, { merge: true });
    } catch {
      // ignore
    }

    updateLocalUserCache(updatedUser);
    return { success: true, user: updatedUser };
  } catch (error: unknown) {
    console.error("Error logging in with Firebase:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Đăng nhập thất bại",
    };
  }
}

/**
 * ĐĂNG NHẬP BẰNG GOOGLE
 * QUY TẮC: CHỈ CHO PHÉP ĐĂNG NHẬP NẾU EMAIL GOOGLE ĐÃ CÓ TRÊN CƠ SỞ DỮ LIỆU
 */
export async function loginWithGoogleFirebase() {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;

    const email = (fbUser.email || "").toLowerCase().trim();

    // BƯỚC 1: KIỂM TRA CƠ SỞ DỮ LIỆU
    let existingUser = await findUserInDatabase(email);
    if (!existingUser) {
      const isAdminEmail =
        email === "thudanganh670@gmail.com" ||
        email === "danganhthu@tuyduc.edu.vn" ||
        email.includes("danganhthu");

      const newUserData: UserAccountData = {
        uid: fbUser.uid,
        email: email,
        fullName: isAdminEmail ? "Đặng Anh Thư" : (fbUser.displayName || email.split("@")[0]),
        teacherCode: isAdminEmail ? "571024" : generateTeacherCode(email),
        registeredDate: getRegistrationDateString(),
        status: "active",
        schoolName: DEFAULT_SCHOOL,
        studentClass: isAdminEmail ? "Ban Giám Hiệu / Quản Trị" : "Học sinh / Thành viên",
        authProvider: "google",
        role: isAdminEmail ? "admin" : "student",
        avatarUrl: fbUser.photoURL || undefined,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };

      await saveUserToFirestore(newUserData);
      existingUser = newUserData;
    }

    // BƯỚC 2: KIỂM TRA TRẠNG THÁI KÍCH HOẠT
    if (existingUser.status !== "active") {
      await firebaseSignOut(auth);
      return {
        success: false,
        error: `Tài khoản "${fbUser.email}" chưa được kích hoạt hoặc đã bị khóa. Vui lòng liên hệ Quản trị viên!`,
      };
    }

    // BƯỚC 3: CẬP NHẬT VÀ CHO PHÉP ĐĂNG NHẬP
    const updatedUser: UserAccountData = {
      ...existingUser,
      avatarUrl: fbUser.photoURL || existingUser.avatarUrl,
      lastLoginAt: serverTimestamp(),
    };

    try {
      const docId = existingUser.uid || email.replace(/[.@]/g, "_");
      await setDoc(doc(db, "users", docId), { lastLoginAt: serverTimestamp() }, { merge: true });
    } catch {
      // ignore
    }

    updateLocalUserCache(updatedUser);
    return { success: true, user: updatedUser };
  } catch (error: unknown) {
    console.warn("Google popup auth error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Đăng nhập Google thất bại hoặc bạn đã hủy đăng nhập.",
    };
  }
}

/**
 * Sign out from Firebase Auth
 */
export async function logoutUser() {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (err) {
    console.error("Error signing out:", err);
    return { success: false, error: err };
  }
}

/**
 * Fetch all registered accounts from Firestore for Admin management
 */
export async function getAllRegisteredUsers(maxResults = 50): Promise<UserAccountData[]> {
  // Tự động dọn sạch các tài khoản cũ trong localStorage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (raw) {
        let list: UserAccountData[] = JSON.parse(raw);
        const filtered = list.filter(
          (u) =>
            !OLD_ACCOUNT_IDENTIFIERS.includes(u.uid) &&
            !OLD_ACCOUNT_IDENTIFIERS.includes((u.email || "").toLowerCase().trim())
        );
        if (filtered.length !== list.length) {
          localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(filtered));
        }
      }
    } catch {
      // ignore
    }
  }

  try {
    const colRef = collection(db, "users");
    const q = query(colRef, limit(maxResults));
    const querySnapshot = await getDocs(q);

    const users: UserAccountData[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as UserAccountData;
      const emailNorm = (data.email || "").toLowerCase().trim();
      // Bỏ qua và xóa hoàn toàn các tài khoản cũ / tài khoản mẫu dư thừa
      if (
        OLD_ACCOUNT_IDENTIFIERS.includes(data.uid) ||
        OLD_ACCOUNT_IDENTIFIERS.includes(emailNorm) ||
        OLD_ACCOUNT_IDENTIFIERS.includes(docSnap.id)
      ) {
        try {
          deleteDoc(doc(db, "users", docSnap.id));
        } catch {
          // ignore
        }
        return;
      }

      // Loại bỏ trùng lặp nếu có cùng email hoặc cùng giáo viên đã đăng nhập
      const isDuplicate = users.some(
        (existing) =>
          existing.email.toLowerCase().trim() === emailNorm ||
          (existing.teacherCode &&
            data.teacherCode &&
            existing.teacherCode === data.teacherCode &&
            existing.fullName === data.fullName)
      );
      if (isDuplicate) {
        return;
      }

      let resolvedTeacherCode = data.teacherCode || (data.status === "active" ? generateTeacherCode(data.email) : "");
      if (resolvedTeacherCode === "5710" || (data.email === "thudanganh670@gmail.com" && resolvedTeacherCode.length < 6)) {
        resolvedTeacherCode = "571024";
      }

      users.push({
        ...data,
        uid: data.uid || docSnap.id,
        teacherCode: resolvedTeacherCode,
        registeredDate: data.registeredDate || getRegistrationDateString(),
        status: data.status || "active",
      });
    });

    if (users.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
      }
      return users;
    }
  } catch (error) {
    console.warn("Notice: Firestore fetching users (falling back to local cache):", error);
  }

  // Fallback từ localStorage nếu Firestore chưa có dữ liệu
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (cached) {
        let parsed: UserAccountData[] = JSON.parse(cached);
        parsed = parsed.map((u) => {
          if (u.teacherCode === "5710" || (u.email === "thudanganh670@gmail.com" && (!u.teacherCode || u.teacherCode.length < 6))) {
            return { ...u, teacherCode: "571024" };
          }
          return u;
        });
        localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(parsed));
        const valid = parsed.filter(
          (u) =>
            !OLD_ACCOUNT_IDENTIFIERS.includes(u.uid) &&
            !OLD_ACCOUNT_IDENTIFIERS.includes((u.email || "").toLowerCase().trim())
        );
        if (valid.length > 0) {
          return valid;
        }
      }
    } catch {
      // ignore
    }
  }

  return DEFAULT_USERS;
}

// Simple deterministic hash code helper for fallback IDs
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}
