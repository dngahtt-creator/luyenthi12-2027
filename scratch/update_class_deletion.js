const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('C:/App10/src/lib/classStudentService.ts');
let content = fs.readFileSync(targetFile, 'utf8');

// Replace the section starting from LOCAL_CLASSES_KEY down to getAllStudents
const startMarker = 'const LOCAL_CLASSES_KEY = "school_classes_cache_v3";';
const endMarker = 'export async function getStudentsByClass(';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found", { startIndex, endIndex });
  process.exit(1);
}

const replacement = `const LOCAL_CLASSES_KEY = "school_classes_cache_v3";
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
    const exists = list.some(
      (item) => (cleanId && item.id === cleanId) || (cleanName && item.name === cleanName)
    );
    if (!exists) {
      list.push({ id: cleanId, name: cleanName });
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
    const list = getDeletedClassesList();
    const updated = list.filter((item) => item.name !== cleanName);
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
  return list.some(
    (item) =>
      (cleanId && item.id && item.id === cleanId) ||
      (cleanName && item.name && item.name === cleanName)
  );
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
  const isDeleted = (id?: string, name?: string) => {
    const cleanId = (id || "").trim();
    const cleanName = (name || "").trim().toLowerCase();
    return deletedClasses.some(
      (item) => (cleanId && item.id === cleanId) || (cleanName && item.name === cleanName)
    );
  };

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

  // Chỉ lấy DEFAULT_CLASSES chưa bị người dùng xóa
  const activeDefaults = DEFAULT_CLASSES.filter((c) => !isDeleted(c.id, c.name));
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(activeDefaults));
  }
  return activeDefaults;
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
        if (
          d.id === cleanId ||
          data.id === cleanId ||
          (cleanName && data.name && data.name.trim().toLowerCase() === cleanName.toLowerCase())
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
        if (
          data.classId === cleanId ||
          (cleanName && data.className && data.className.trim().toLowerCase() === cleanName.toLowerCase())
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
      const delDocId = cleanId || cleanName.toLowerCase().replace(/\\s+/g, "_");
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
      const updatedClasses = current.filter(
        (c) => c.id !== cleanId && (!cleanName || c.name.trim().toLowerCase() !== cleanName.toLowerCase())
      );
      localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(updatedClasses));

      const currentStudentsRaw = localStorage.getItem(LOCAL_STUDENTS_KEY);
      const currentStudents: StudentItem[] = currentStudentsRaw ? JSON.parse(currentStudentsRaw) : [];
      const updatedStudents = currentStudents.filter(
        (s) =>
          s.classId !== cleanId &&
          (!cleanName || !s.className || s.className.trim().toLowerCase() !== cleanName.toLowerCase())
      );
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

`;

const newContent = content.slice(0, startIndex) + replacement + content.slice(endIndex);
fs.writeFileSync(targetFile, newContent, 'utf8');
console.log('Successfully updated classStudentService.ts with permanent deletion & deleted blacklist!');
