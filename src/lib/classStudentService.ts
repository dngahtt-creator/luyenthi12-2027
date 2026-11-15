import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import * as XLSX from "xlsx";

export interface SchoolClass {
  id: string;
  name: string; // e.g. "12A1"
  grade: string; // "12", "11", "10", "5", etc.
  academicYear: string; // "2025 - 2026"
  homeroomTeacher?: string; // "Đặng Anh Thư"
  room?: string; // "Phòng 301"
  description?: string;
  studentCount?: number;
  createdAt?: string | number;
}

export interface StudentItem {
  id: string;
  classId: string;
  className: string;
  orderNumber: number; // TT
  fullName: string; // Họ và tên
  dob: string; // Ngày sinh (DD/MM/YYYY)
  createdAt?: string | number;
  password?: string; // Mật khẩu học sinh (đặt lần đầu khi vào học)
}

// Initial default classes for school
export const DEFAULT_CLASSES: SchoolClass[] = [
  {
    id: "cls-12a1",
    name: "12A1",
    grade: "12",
    academicYear: "2025 - 2026",
    homeroomTeacher: "Đặng Anh Thư",
    room: "Phòng 301 - Dãy Nhà A",
    description: "Lớp Chuyên đề Toán - KHTN chất lượng cao",
    studentCount: 8,
  },
  {
    id: "cls-12a2",
    name: "12A2",
    grade: "12",
    academicYear: "2025 - 2026",
    homeroomTeacher: "Thầy Lê Hoàng Nam",
    room: "Phòng 302 - Dãy Nhà A",
    description: "Lớp Tổ hợp Khoa học Xã hội",
    studentCount: 6,
  },
  {
    id: "cls-11a1",
    name: "11A1",
    grade: "11",
    academicYear: "2025 - 2026",
    homeroomTeacher: "Thầy Trần Quang Đức",
    room: "Phòng 201 - Dãy Nhà B",
    description: "Khối 11 chất lượng cao",
    studentCount: 5,
  },
  {
    id: "cls-10a1",
    name: "10A1",
    grade: "10",
    academicYear: "2025 - 2026",
    homeroomTeacher: "Cô Vũ Thu Trang",
    room: "Phòng 101 - Dãy Nhà C",
    description: "Khối 10",
    studentCount: 4,
  },
];

// Initial default students - chuẩn xác 3 cột: TT, Họ và tên, Ngày sinh theo đúng mẫu thực tế
export const DEFAULT_STUDENTS: StudentItem[] = [
  {
    id: "std-1",
    classId: "cls-12a1",
    className: "12A1",
    orderNumber: 1,
    fullName: "Hani Diễm",
    dob: "01/01/2015",
  },
  {
    id: "std-2",
    classId: "cls-12a1",
    className: "12A1",
    orderNumber: 2,
    fullName: "Điểu Dũng",
    dob: "10/10/2015",
  },
  {
    id: "std-3",
    classId: "cls-12a1",
    className: "12A1",
    orderNumber: 3,
    fullName: "Điểu Ni Ên",
    dob: "02/03/2015",
  },
  {
    id: "std-4",
    classId: "cls-12a1",
    className: "12A1",
    orderNumber: 4,
    fullName: "Thào Thị Gầu",
    dob: "13/11/2015",
  },
  {
    id: "std-5",
    classId: "cls-12a1",
    className: "12A1",
    orderNumber: 5,
    fullName: "Điểu Gióp",
    dob: "20/12/2014",
  },
  {
    id: "std-6",
    classId: "cls-12a1",
    className: "12A1",
    orderNumber: 6,
    fullName: "Chíu Thị Thanh Hiền",
    dob: "04/10/2015",
  },
  {
    id: "std-7",
    classId: "cls-12a1",
    className: "12A1",
    orderNumber: 7,
    fullName: "Thị Gia Hoan",
    dob: "09/09/2015",
  },
  {
    id: "std-8",
    classId: "cls-12a1",
    className: "12A1",
    orderNumber: 8,
    fullName: "Triệu Quốc Huy",
    dob: "16/02/2015",
  },
  // Lớp 12A2
  {
    id: "std-9",
    classId: "cls-12a2",
    className: "12A2",
    orderNumber: 1,
    fullName: "Nguyễn Văn An",
    dob: "05/03/2008",
  },
  {
    id: "std-10",
    classId: "cls-12a2",
    className: "12A2",
    orderNumber: 2,
    fullName: "Trần Thị Bích",
    dob: "14/06/2008",
  },
  {
    id: "std-11",
    classId: "cls-12a2",
    className: "12A2",
    orderNumber: 3,
    fullName: "Lê Hoàng Cường",
    dob: "22/09/2008",
  },
  {
    id: "std-12",
    classId: "cls-12a2",
    className: "12A2",
    orderNumber: 4,
    fullName: "Phạm Minh Đức",
    dob: "18/11/2008",
  },
  {
    id: "std-13",
    classId: "cls-12a2",
    className: "12A2",
    orderNumber: 5,
    fullName: "Vũ Ngọc Hân",
    dob: "08/04/2008",
  },
  {
    id: "std-14",
    classId: "cls-12a2",
    className: "12A2",
    orderNumber: 6,
    fullName: "Đặng Gia Huy",
    dob: "12/12/2008",
  },
  // Lớp 11A1
  {
    id: "std-15",
    classId: "cls-11a1",
    className: "11A1",
    orderNumber: 1,
    fullName: "Bùi Phương Anh",
    dob: "15/01/2009",
  },
  {
    id: "std-16",
    classId: "cls-11a1",
    className: "11A1",
    orderNumber: 2,
    fullName: "Đỗ Thành Đạt",
    dob: "20/05/2009",
  },
  {
    id: "std-17",
    classId: "cls-11a1",
    className: "11A1",
    orderNumber: 3,
    fullName: "Hoàng Khánh Linh",
    dob: "03/08/2009",
  },
  {
    id: "std-18",
    classId: "cls-11a1",
    className: "11A1",
    orderNumber: 4,
    fullName: "Mai Quốc Nam",
    dob: "11/10/2009",
  },
  {
    id: "std-19",
    classId: "cls-11a1",
    className: "11A1",
    orderNumber: 5,
    fullName: "Ngô Bảo Ngọc",
    dob: "25/12/2009",
  },
  // Lớp 10A1
  {
    id: "std-20",
    classId: "cls-10a1",
    className: "10A1",
    orderNumber: 1,
    fullName: "Phan Tuấn Anh",
    dob: "09/02/2010",
  },
  {
    id: "std-21",
    classId: "cls-10a1",
    className: "10A1",
    orderNumber: 2,
    fullName: "Trịnh Mai Chi",
    dob: "19/04/2010",
  },
  {
    id: "std-22",
    classId: "cls-10a1",
    className: "10A1",
    orderNumber: 3,
    fullName: "Dương Minh Khôi",
    dob: "30/07/2010",
  },
  {
    id: "std-23",
    classId: "cls-10a1",
    className: "10A1",
    orderNumber: 4,
    fullName: "Lương Thảo Nguyên",
    dob: "14/11/2010",
  },
];

const LOCAL_CLASSES_KEY = "school_classes_cache_v3";
const LOCAL_STUDENTS_KEY = "school_students_cache_v3";
const LOCAL_DELETED_CLASSES_KEY = "school_deleted_classes_v3";

export function getDeletedClassesList(): { id: string; name: string }[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_CLASSES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function recordDeletedClass(classId: string, className?: string) {
  if (typeof window === "undefined") return;
  try {
    const list = getDeletedClassesList();
    const cleanId = (classId || "").trim();
    const cleanName = (className || "").trim().toLowerCase();
    const cleanNoLop = cleanName.replace(/^(lớp|lop)\s*/i, "").trim();

    const exists = list.some(
      (item) =>
        (cleanId && item.id === cleanId) ||
        (cleanName && item.name === cleanName) ||
        (cleanNoLop && item.name === cleanNoLop)
    );
    if (!exists) {
      list.push({ id: cleanId, name: cleanName });
      if (cleanNoLop && cleanNoLop !== cleanName) {
        list.push({ id: cleanId, name: cleanNoLop });
      }
      localStorage.setItem(LOCAL_DELETED_CLASSES_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.warn("recordDeletedClass error:", e);
  }
}

export function unrecordDeletedClass(className: string) {
  if (typeof window === "undefined") return;
  try {
    const cleanName = (className || "").trim().toLowerCase();
    const cleanNoLop = cleanName.replace(/^(lớp|lop)\s*/i, "").trim();
    const list = getDeletedClassesList();
    const updated = list.filter((item) => {
      const iName = (item.name || "").trim().toLowerCase();
      const iNoLop = iName.replace(/^(lớp|lop)\s*/i, "").trim();
      return iName !== cleanName && iNoLop !== cleanNoLop;
    });
    localStorage.setItem(LOCAL_DELETED_CLASSES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("unrecordDeletedClass error:", e);
  }
}

export function isClassDeleted(classId?: string, className?: string): boolean {
  if (!classId && !className) return false;
  const list = getDeletedClassesList();
  const cleanId = (classId || "").trim();
  const cleanName = (className || "").trim().toLowerCase();
  const cleanNoLop = cleanName.replace(/^(lớp|lop)\s*/i, "").trim();

  return list.some((item) => {
    const itemId = (item.id || "").trim();
    const itemName = (item.name || "").trim().toLowerCase();
    const itemNoLop = itemName.replace(/^(lớp|lop)\s*/i, "").trim();
    if (cleanId && itemId && cleanId === itemId) return true;
    if (cleanName && itemName && cleanName === itemName) return true;
    if (cleanNoLop && itemNoLop && cleanNoLop === itemNoLop) return true;
    return false;
  });
}

function broadcastUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("school_class_student_updated"));
  }
}

/* =========================================================
   1. QUẢN LÝ LỚP HỌC (CLASSES) - FIRESTORE & LOCAL SYNC
========================================================= */

export async function getAllClasses(): Promise<SchoolClass[]> {
  const deletedClasses = getDeletedClassesList();
  const isDeleted = (id?: string, name?: string) => isClassDeleted(id, name);

  try {
    const colRef = collection(db, "classes");
    const snapshot = await getDocs(colRef);

    if (!snapshot.empty) {
      let classes: SchoolClass[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SchoolClass, "id">),
      }));

      // Lọc bỏ triệt để bất kỳ lớp nào nằm trong danh sách đã xóa vĩnh viễn
      classes = classes.filter((c) => !isDeleted(c.id, c.name));

      classes.sort((a, b) => {
        if (a.grade !== b.grade) {
          return Number(b.grade) - Number(a.grade);
        }
        return a.name.localeCompare(b.name, "vi", { numeric: true });
      });

      const students = await getAllStudents();
      classes.forEach((c) => {
        c.studentCount = students.filter((s) => s.classId === c.id || s.className === c.name).length;
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(classes));
      }
      return classes;
    }
  } catch (err) {
    console.warn("Firestore fetch classes notice (using local cache):", err);
  }

  // Đọc từ bộ nhớ cục bộ
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(LOCAL_CLASSES_KEY);
    if (cached !== null) {
      try {
        const parsed = JSON.parse(cached) as SchoolClass[];
        const filtered = parsed.filter((c) => !isDeleted(c.id, c.name));
        return filtered;
      } catch {
        // ignore
      }
    }
  }

  // Chỉ lấy DEFAULT_CLASSES nếu người dùng CHƯA TỪNG thực hiện thao tác xóa nào
  if (deletedClasses.length === 0) {
    const activeDefaults = DEFAULT_CLASSES.filter((c) => !isDeleted(c.id, c.name));
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(activeDefaults));
    }
    return activeDefaults;
  }

  return [];
}

export async function saveNewClass(
  classData: Omit<SchoolClass, "id">
): Promise<{ success: boolean; id?: string; error?: string }> {
  // Gỡ bỏ khỏi danh sách đã xóa nếu người dùng chủ động tạo lại
  unrecordDeletedClass(classData.name);

  try {
    const colRef = collection(db, "classes");
    const docRef = await addDoc(colRef, {
      ...classData,
      studentCount: 0,
      createdAt: serverTimestamp(),
    });

    const newClass: SchoolClass = {
      id: docRef.id,
      ...classData,
      studentCount: 0,
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const current = await getAllClasses();
      const updated = [...current.filter((c) => c.name.toLowerCase() !== classData.name.toLowerCase()), newClass];
      localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(updated));
      broadcastUpdate();
    }

    return { success: true, id: docRef.id };
  } catch (err) {
    console.warn("Firestore save class error, saving to local cache:", err);
    const id = "cls_" + Date.now();
    const newClass: SchoolClass = {
      id,
      ...classData,
      studentCount: 0,
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const current = await getAllClasses();
      const updated = [...current.filter((c) => c.name.toLowerCase() !== classData.name.toLowerCase()), newClass];
      localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(updated));
      broadcastUpdate();
    }

    return { success: true, id };
  }
}

export async function updateClass(
  classId: string,
  updatedData: Partial<SchoolClass>
): Promise<{ success: boolean; error?: string }> {
  if (updatedData.name) {
    unrecordDeletedClass(updatedData.name);
  }

  try {
    const docRef = doc(db, "classes", classId);
    await setDoc(docRef, { ...updatedData, updatedAt: serverTimestamp() }, { merge: true });

    if (updatedData.name) {
      await syncStudentClassName(classId, updatedData.name);
    }
  } catch (err) {
    console.warn("Firestore update class note (updating local):", err);
  }

  if (typeof window !== "undefined") {
    const current = await getAllClasses();
    const idx = current.findIndex((c) => c.id === classId);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...updatedData };
      localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(current));
      broadcastUpdate();
    }
  }

  return { success: true };
}

export async function deleteClass(classId: string, className?: string): Promise<boolean> {
  const cleanId = (classId || "").trim();
  const cleanName = (className || "").trim();
  const cleanNoLop = cleanName.replace(/^(lớp|lop)\s*/i, "").trim().toLowerCase();

  // 1. Ghi nhận vĩnh viễn vào danh sách lớp đã xóa để KHÔNG BAO GIỜ hiện lại
  recordDeletedClass(cleanId, cleanName);

  // 2. Xóa triệt để trong Firestore (cả collection classes và students)
  try {
    // Xóa theo document ID trong collection classes
    if (cleanId) {
      try {
        await deleteDoc(doc(db, "classes", cleanId));
      } catch (e) {
        console.warn("Delete class doc by id note:", e);
      }
    }

    // Quét và xóa tất cả các document trong collection classes có name trùng với className
    try {
      const classesSnap = await getDocs(collection(db, "classes"));
      for (const d of classesSnap.docs) {
        const data = d.data();
        const dName = (data.name || "").trim().toLowerCase();
        const dNoLop = dName.replace(/^(lớp|lop)\s*/i, "").trim();
        if (
          d.id === cleanId ||
          data.id === cleanId ||
          (cleanName && (dName === cleanName.toLowerCase() || (cleanNoLop && dNoLop === cleanNoLop)))
        ) {
          await deleteDoc(d.ref);
        }
      }
    } catch (e) {
      console.warn("Clean classes snap note:", e);
    }

    // Quét và xóa toàn bộ học sinh thuộc lớp này khỏi collection students
    try {
      const studentsSnap = await getDocs(collection(db, "students"));
      const batch = writeBatch(db);
      let batchCount = 0;
      for (const d of studentsSnap.docs) {
        const data = d.data();
        const sClass = (data.className || "").trim().toLowerCase();
        const sNoLop = sClass.replace(/^(lớp|lop)\s*/i, "").trim();
        if (
          data.classId === cleanId ||
          (cleanName && (sClass === cleanName.toLowerCase() || (cleanNoLop && sNoLop === cleanNoLop)))
        ) {
          batch.delete(d.ref);
          batchCount++;
          if (batchCount >= 400) {
            await batch.commit();
            batchCount = 0;
          }
        }
      }
      if (batchCount > 0) {
        await batch.commit();
      }
    } catch (e) {
      console.warn("Delete students snap note:", e);
    }

    // Ghi nhận vào collection deleted_classes trên Firestore để đồng bộ các máy
    try {
      const delDocId = cleanId || cleanName.toLowerCase().replace(/\s+/g, "_");
      if (delDocId) {
        await setDoc(doc(db, "deleted_classes", delDocId), {
          classId: cleanId,
          className: cleanName,
          deletedAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.warn("Sync deleted_classes note:", e);
    }
  } catch (err) {
    console.warn("Firestore delete class error:", err);
  }

  // 3. Cập nhật ngay lập tức bộ nhớ cục bộ (localStorage)
  if (typeof window !== "undefined") {
    try {
      const currentRaw = localStorage.getItem(LOCAL_CLASSES_KEY);
      const current: SchoolClass[] = currentRaw ? JSON.parse(currentRaw) : [];
      const updatedClasses = current.filter((c) => {
        const cName = (c.name || "").trim().toLowerCase();
        const cNoLop = cName.replace(/^(lớp|lop)\s*/i, "").trim();
        return (
          c.id !== cleanId &&
          (!cleanName || (cName !== cleanName.toLowerCase() && (!cleanNoLop || cNoLop !== cleanNoLop)))
        );
      });
      localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(updatedClasses));

      const currentStudentsRaw = localStorage.getItem(LOCAL_STUDENTS_KEY);
      const currentStudents: StudentItem[] = currentStudentsRaw ? JSON.parse(currentStudentsRaw) : [];
      const updatedStudents = currentStudents.filter((s) => {
        const sClass = (s.className || "").trim().toLowerCase();
        const sNoLop = sClass.replace(/^(lớp|lop)\s*/i, "").trim();
        return (
          s.classId !== cleanId &&
          (!cleanName ||
            !s.className ||
            (sClass !== cleanName.toLowerCase() && (!cleanNoLop || sNoLop !== cleanNoLop)))
        );
      });
      localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(updatedStudents));
    } catch (e) {
      console.warn("LocalStorage delete class note:", e);
    }

    broadcastUpdate();
  }

  return true;
}

/* =========================================================
   2. QUẢN LÝ HỌC SINH (STUDENTS) - CHỈ LƯU: TT, HỌ VÀ TÊN, NGÀY SINH
========================================================= */

export async function getAllStudents(): Promise<StudentItem[]> {
  const deletedClasses = getDeletedClassesList();
  const isClassBelongsToDeleted = (classId?: string, className?: string) => {
    const cleanId = (classId || "").trim();
    const cleanName = (className || "").trim().toLowerCase();
    return deletedClasses.some(
      (item) => (cleanId && item.id === cleanId) || (cleanName && item.name === cleanName)
    );
  };

  try {
    const colRef = collection(db, "students");
    const snapshot = await getDocs(colRef);

    if (!snapshot.empty) {
      let students: StudentItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          classId: data.classId || "",
          className: data.className || "",
          orderNumber: Number(data.orderNumber) || 1,
          fullName: data.fullName || "",
          dob: data.dob || "",
          createdAt: data.createdAt,
          password: data.password || "",
        };
      });

      // Lọc bỏ triệt để học sinh thuộc bất kỳ lớp nào đã xóa
      students = students.filter((s) => !isClassBelongsToDeleted(s.classId, s.className));

      students.sort((a, b) => a.orderNumber - b.orderNumber);

      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(students));
      }
      return students;
    }
  } catch (err) {
    console.warn("Firestore fetch students note (using cache):", err);
  }

  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(LOCAL_STUDENTS_KEY);
    if (cached !== null) {
      try {
        const parsed = JSON.parse(cached) as StudentItem[];
        return parsed.filter((s) => !isClassBelongsToDeleted(s.classId, s.className));
      } catch {
        // ignore
      }
    }
  }

  const activeDefaultStudents = DEFAULT_STUDENTS.filter(
    (s) => !isClassBelongsToDeleted(s.classId, s.className)
  );
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(activeDefaultStudents));
  }
  return activeDefaultStudents;
}

export async function getStudentsByClass(classId: string, className?: string): Promise<StudentItem[]> {
  const allStudents = await getAllStudents();
  const filtered = allStudents.filter(
    (s) => s.classId === classId || (className && s.className === className)
  );
  return filtered.sort((a, b) => a.orderNumber - b.orderNumber);
}

export async function saveNewStudent(
  studentData: Omit<StudentItem, "id">
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const colRef = collection(db, "students");
    // Chỉ lưu các thông tin yêu cầu: classId, className, orderNumber, fullName, dob
    const payload = {
      classId: studentData.classId,
      className: studentData.className,
      orderNumber: Number(studentData.orderNumber) || 1,
      fullName: studentData.fullName.trim(),
      dob: studentData.dob.trim(),
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(colRef, payload);

    const newStudent: StudentItem = {
      id: docRef.id,
      classId: payload.classId,
      className: payload.className,
      orderNumber: payload.orderNumber,
      fullName: payload.fullName,
      dob: payload.dob,
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const current = await getAllStudents();
      const updated = [...current, newStudent];
      localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(updated));
      broadcastUpdate();
    }

    return { success: true, id: docRef.id };
  } catch (err) {
    console.warn("Firestore save student error, saving locally:", err);
    const id = "std_" + Date.now();
    const newStudent: StudentItem = {
      id,
      classId: studentData.classId,
      className: studentData.className,
      orderNumber: Number(studentData.orderNumber) || 1,
      fullName: studentData.fullName.trim(),
      dob: studentData.dob.trim(),
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const current = await getAllStudents();
      const updated = [...current, newStudent];
      localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(updated));
      broadcastUpdate();
    }

    return { success: true, id };
  }
}

export async function updateStudent(
  studentId: string,
  updatedData: Partial<StudentItem>
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, "students", studentId);
    // Chỉ cập nhật các trường được phép
    const cleanData: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updatedData.classId !== undefined) cleanData.classId = updatedData.classId;
    if (updatedData.className !== undefined) cleanData.className = updatedData.className;
    if (updatedData.orderNumber !== undefined) cleanData.orderNumber = Number(updatedData.orderNumber);
    if (updatedData.fullName !== undefined) cleanData.fullName = updatedData.fullName.trim();
    if (updatedData.dob !== undefined) cleanData.dob = updatedData.dob.trim();

    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    console.warn("Firestore update student error:", err);
  }

  if (typeof window !== "undefined") {
    const current = await getAllStudents();
    const idx = current.findIndex((s) => s.id === studentId);
    if (idx !== -1) {
      current[idx] = {
        ...current[idx],
        ...updatedData,
        orderNumber: Number(updatedData.orderNumber ?? current[idx].orderNumber),
        fullName: updatedData.fullName ? updatedData.fullName.trim() : current[idx].fullName,
        dob: updatedData.dob ? updatedData.dob.trim() : current[idx].dob,
      };
      localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(current));
      broadcastUpdate();
    }
  }

  return { success: true };
}

export async function deleteStudent(studentId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "students", studentId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore delete student note:", err);
  }

  if (typeof window !== "undefined") {
    const current = await getAllStudents();
    const updated = current.filter((s) => s.id !== studentId);
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(updated));
    broadcastUpdate();
  }

  return true;
}

async function syncStudentClassName(classId: string, newClassName: string) {
  try {
    const studentsCol = collection(db, "students");
    const q = query(studentsCol, where("classId", "==", classId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(d.ref, { className: newClassName });
    });
    await batch.commit();
  } catch (err) {
    console.warn("Sync student class name note:", err);
  }

  if (typeof window !== "undefined") {
    const current = await getAllStudents();
    current.forEach((s) => {
      if (s.classId === classId) {
        s.className = newClassName;
      }
    });
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(current));
  }
}

/* =========================================================
   3. IMPORT FILE EXCEL CHỈ 3 CỘT: TT, HỌ VÀ TÊN, NGÀY SINH
========================================================= */

export interface ParsedStudentRow {
  orderNumber: number; // TT
  fullName: string; // Họ và tên
  dob: string; // Ngày sinh
  isValid: boolean;
  error?: string;
}

export function normalizeStudentData(
  rows: Record<string, unknown>[]
): { validStudents: ParsedStudentRow[]; invalidCount: number } {
  const validStudents: ParsedStudentRow[] = [];
  let invalidCount = 0;

  rows.forEach((row, index) => {
    const keys = Object.keys(row);

    const findVal = (patterns: string[]): string => {
      for (const k of keys) {
        const cleanK = k.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        for (const p of patterns) {
          if (cleanK === p || cleanK.includes(p)) {
            const val = row[k];
            if (val !== undefined && val !== null) return String(val).trim();
          }
        }
      }
      return "";
    };

    // 1. TT (Thứ tự / STT)
    const sttVal = findVal(["tt", "stt", "thu tu", "so thu tu", "no", "number", "index"]);
    let orderNum = parseInt(sttVal, 10);
    if (isNaN(orderNum) || orderNum <= 0) {
      orderNum = index + 1;
    }

    // 2. Họ và tên
    const rawName = findVal(["ho va ten", "ho ten", "ten", "fullname", "name", "ho"]);
    const fullName = rawName.replace(/\s+/g, " ").trim();

    // 3. Ngày sinh
    let rawDob = findVal(["ngay sinh", "ngaysinh", "dob", "birth", "nam sinh", "ngay"]);

    // Kiểm tra định dạng ngày từ số serial của Excel (VD: 42005 -> 01/01/2015)
    if (/^\d{5}$/.test(rawDob)) {
      const serial = parseInt(rawDob, 10);
      const parsedDate = new Date((serial - 25569) * 86400 * 1000);
      const day = String(parsedDate.getDate()).padStart(2, "0");
      const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const year = parsedDate.getFullYear();
      rawDob = `${day}/${month}/${year}`;
    }

    // Chuẩn hóa dấu gạch ngang sang xuyệt (YYYY-MM-DD hoặc DD-MM-YYYY -> DD/MM/YYYY)
    if (rawDob.includes("-")) {
      const parts = rawDob.split("-");
      if (parts[0].length === 4) {
        rawDob = `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
      } else if (parts[2].length === 4) {
        rawDob = `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
      }
    }

    if (!fullName) {
      invalidCount++;
      return;
    }

    validStudents.push({
      orderNumber: orderNum,
      fullName,
      dob: rawDob || "Chưa cập nhật",
      isValid: true,
    });
  });

  validStudents.sort((a, b) => a.orderNumber - b.orderNumber);
  return { validStudents, invalidCount };
}

export async function parseStudentFile(
  file: File
): Promise<{ success: boolean; data?: ParsedStudentRow[]; error?: string; invalidCount?: number }> {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, error: "Tệp không chứa bảng tính (sheet) nào." };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      raw: false,
      defval: "",
    });

    if (!jsonData || jsonData.length === 0) {
      return {
        success: false,
        error: "Không tìm thấy dữ liệu trong file. Vui lòng đảm bảo bảng tính có các cột: TT, Họ và tên, Ngày sinh.",
      };
    }

    const { validStudents, invalidCount } = normalizeStudentData(jsonData);

    if (validStudents.length === 0) {
      return {
        success: false,
        error: "Không nhận diện được học sinh nào hợp lệ. Vui lòng kiểm tra 3 cột: TT, Họ và tên, Ngày sinh.",
      };
    }

    return {
      success: true,
      data: validStudents,
      invalidCount,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Lỗi đọc tệp dữ liệu",
    };
  }
}

export async function importStudentsToClass(
  classId: string,
  className: string,
  students: ParsedStudentRow[],
  mode: "append" | "replace" = "replace"
): Promise<{ success: boolean; importedCount: number; error?: string }> {
  try {
    let baseOrder = 0;
    const allStudents = await getAllStudents();

    if (mode === "replace") {
      try {
        const studentsCol = collection(db, "students");
        const q = query(studentsCol, where("classId", "==", classId));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      } catch (delErr) {
        console.warn("Firestore delete old students before replace notice:", delErr);
      }
    } else {
      const classStudents = allStudents.filter((s) => s.classId === classId);
      baseOrder = classStudents.reduce((max, s) => Math.max(max, s.orderNumber), 0);
    }

    // CSDL chỉ lưu đúng: classId, className, orderNumber, fullName, dob
    const newItems: StudentItem[] = students.map((s, idx) => ({
      id: "std_" + Date.now() + "_" + idx,
      classId,
      className,
      orderNumber: mode === "append" ? baseOrder + idx + 1 : s.orderNumber || idx + 1,
      fullName: s.fullName,
      dob: s.dob,
      createdAt: new Date().toISOString(),
    }));

    // Ghi đồng bộ Firestore
    try {
      const studentsCol = collection(db, "students");
      const chunkSize = 400;
      for (let i = 0; i < newItems.length; i += chunkSize) {
        const chunk = newItems.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          const docRef = doc(studentsCol);
          item.id = docRef.id;
          batch.set(docRef, {
            classId: item.classId,
            className: item.className,
            orderNumber: item.orderNumber,
            fullName: item.fullName,
            dob: item.dob,
            createdAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
    } catch (saveErr) {
      console.warn("Firestore batch write students fallback to local cache:", saveErr);
    }

    if (typeof window !== "undefined") {
      let updatedAll: StudentItem[] = [];
      if (mode === "replace") {
        updatedAll = allStudents.filter((s) => s.classId !== classId).concat(newItems);
      } else {
        updatedAll = [...allStudents, ...newItems];
      }
      localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(updatedAll));

      const classes = await getAllClasses();
      const targetClass = classes.find((c) => c.id === classId);
      if (targetClass) {
        targetClass.studentCount = updatedAll.filter((s) => s.classId === classId).length;
        localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(classes));
      }

      broadcastUpdate();
    }

    return { success: true, importedCount: newItems.length };
  } catch (err: unknown) {
    return {
      success: false,
      importedCount: 0,
      error: err instanceof Error ? err.message : "Lỗi lưu danh sách vào Firebase",
    };
  }
}

/* =========================================================
   4. TẠO FILE MẪU & XUẤT EXCEL CHỈ ĐÚNG 3 CỘT: TT, HỌ VÀ TÊN, NGÀY SINH
========================================================= */

/**
 * Tải file mẫu Excel (.xlsx) chuẩn chính xác theo đúng hình mẫu của người dùng:
 * Cột A: TT | Cột B: Họ và tên | Cột C: Ngày sinh
 */
export function downloadExcelTemplate(className = "12A1") {
  const sampleData = [
    {
      "TT": 1,
      "Họ và tên": "Hani Diễm",
      "Ngày sinh": "01/01/2015",
    },
    {
      "TT": 2,
      "Họ và tên": "Điểu Dũng",
      "Ngày sinh": "10/10/2015",
    },
    {
      "TT": 3,
      "Họ và tên": "Điểu Ni Ên",
      "Ngày sinh": "02/03/2015",
    },
    {
      "TT": 4,
      "Họ và tên": "Thào Thị Gầu",
      "Ngày sinh": "13/11/2015",
    },
    {
      "TT": 5,
      "Họ và tên": "Điểu Gióp",
      "Ngày sinh": "20/12/2014",
    },
    {
      "TT": 6,
      "Họ và tên": "Chíu Thị Thanh Hiền",
      "Ngày sinh": "04/10/2015",
    },
    {
      "TT": 7,
      "Họ và tên": "Thị Gia Hoan",
      "Ngày sinh": "09/09/2015",
    },
    {
      "TT": 8,
      "Họ và tên": "Triệu Quốc Huy",
      "Ngày sinh": "16/02/2015",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws["!cols"] = [
    { wch: 8 },  // TT
    { wch: 30 }, // Họ và tên
    { wch: 18 }, // Ngày sinh
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Lop_${className}`);
  XLSX.writeFile(wb, `Mau_Danh_Sach_Hoc_Sinh_Lop_${className}.xlsx`);
}

/**
 * Tải file mẫu CSV (.csv) đúng 3 cột: TT, Họ và tên, Ngày sinh
 */
export function downloadCsvTemplate(className = "12A1") {
  const csvContent =
    "\uFEFF" + // UTF-8 BOM
    "TT,Họ và tên,Ngày sinh\n" +
    "1,Hani Diễm,01/01/2015\n" +
    "2,Điểu Dũng,10/10/2015\n" +
    "3,Điểu Ni Ên,02/03/2015\n" +
    "4,Thào Thị Gầu,13/11/2015\n" +
    "5,Điểu Gióp,20/12/2014\n" +
    "6,Chíu Thị Thanh Hiền,04/10/2015\n" +
    "7,Thị Gia Hoan,09/09/2015\n" +
    "8,Triệu Quốc Huy,16/02/2015\n";

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Mau_Danh_Sach_Hoc_Sinh_Lop_${className}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Xuất danh sách học sinh ra Excel đúng 3 cột TT, Họ và tên, Ngày sinh (+ Lớp)
 */
export function exportStudentsToExcel(
  className: string,
  teacherName: string,
  students: StudentItem[]
) {
  const exportData = students.map((s, idx) => ({
    "TT": s.orderNumber || idx + 1,
    "Họ và tên": s.fullName,
    "Ngày sinh": s.dob,
    "Lớp": s.className || className,
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws["!cols"] = [
    { wch: 8 },  // TT
    { wch: 30 }, // Họ và tên
    { wch: 18 }, // Ngày sinh
    { wch: 12 }, // Lớp
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `DanhSach_${className}`);
  XLSX.writeFile(wb, `Danh_Sach_Hoc_Sinh_Lop_${className}.xlsx`);
}

/**
 * Cập nhật hoặc đặt mật khẩu lần đầu cho học sinh
 */
export async function setStudentPassword(
  studentId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, "students", studentId);
    await setDoc(docRef, { password: newPassword.trim(), updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn("Firestore setStudentPassword note (local fallback):", err);
  }

  if (typeof window !== "undefined") {
    const current = await getAllStudents();
    const idx = current.findIndex((s) => s.id === studentId);
    if (idx !== -1) {
      current[idx].password = newPassword.trim();
      localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(current));
      broadcastUpdate();
    }
  }

  return { success: true };
}

/**
 * Lấy thông tin học sinh theo ID
 */
export async function getStudentById(studentId: string): Promise<StudentItem | null> {
  const students = await getAllStudents();
  return students.find((s) => s.id === studentId) || null;
}

/**
 * Tra cứu thông tin giáo viên theo mã giáo viên (6 chữ số hoặc định danh)
 */
export async function findTeacherByCode(
  code: string
): Promise<{ fullName: string; teacherCode: string; schoolName?: string } | null> {
  const trimmed = (code || "").trim();
  if (!trimmed) return null;

  // 1. Tra cứu tài khoản giáo viên trong hệ thống (localStorage & users) TRƯỚC
  // Để giáo viên có thể tự do sửa mã GV và lưu thay đổi theo ý muốn
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("tuyduc_registered_users_cache");
      if (raw) {
        const users = JSON.parse(raw);
        if (Array.isArray(users)) {
          const match = users.find((u: any) => {
            const uCode = (u.teacherCode || "").trim();
            const uEmail = (u.email || "").toLowerCase();
            const uName = (u.fullName || "").toLowerCase().trim();
            return (
              (uCode && (uCode === trimmed || (trimmed.length === 6 && uCode === "5710" && trimmed === "571024"))) ||
              (uEmail && uEmail.includes(trimmed.toLowerCase())) ||
              (uName && uName === trimmed.toLowerCase())
            );
          });
          if (match) {
            return {
              fullName: match.fullName || "Giáo viên",
              teacherCode: match.teacherCode || trimmed,
              schoolName: match.schoolName || "THPT DTNT THCS & THPT Tuy Đức",
            };
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Kiểm tra mã giáo viên cố định mặc định (6 số: 571024; tương thích ngược: 5710)
  if (trimmed === "571024" || trimmed === "5710" || trimmed === "102400" || trimmed === "1024") {
    return {
      fullName: "Đặng Anh Thư",
      teacherCode: "571024",
      schoolName: "THPT DTNT THCS & THPT Tuy Đức",
    };
  }

  // 3. Fallback theo tên giáo viên thường gặp (vd: FC ZO ZO)
  if (trimmed.toUpperCase().includes("ZO") || trimmed.toUpperCase() === "FC ZO ZO" || trimmed === "999999") {
    return {
      fullName: "FC ZO ZO",
      teacherCode: trimmed,
      schoolName: "THPT DTNT THCS & THPT Tuy Đức",
    };
  }

  // 4. Nếu nhập mã 6 số hợp lệ nhưng chưa đăng ký tài khoản cụ thể, tự động nhận diện
  if (/^\d{6}$/.test(trimmed)) {
    return {
      fullName: `Thầy/Cô (Mã: ${trimmed})`,
      teacherCode: trimmed,
      schoolName: "THPT DTNT THCS & THPT Tuy Đức",
    };
  }

  // 5. Nếu nhập tên giáo viên trực tiếp
  if (trimmed.length >= 2) {
    return {
      fullName: trimmed,
      teacherCode: trimmed,
      schoolName: "THPT DTNT THCS & THPT Tuy Đức",
    };
  }

  return null;
}

