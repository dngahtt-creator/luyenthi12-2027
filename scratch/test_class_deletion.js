// Simulate window.localStorage
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.window = {
  dispatchEvent: () => {},
  localStorage: new LocalStorageMock(),
};
global.localStorage = global.window.localStorage;

const LOCAL_CLASSES_KEY = "school_classes_cache_v3";
const LOCAL_STUDENTS_KEY = "school_students_cache_v3";
const LOCAL_DELETED_CLASSES_KEY = "school_deleted_classes_v3";

function getDeletedClassesList() {
  const raw = localStorage.getItem(LOCAL_DELETED_CLASSES_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

function recordDeletedClass(classId, className) {
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
}

function isClassDeleted(classId, className) {
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

// Test case 1: initially not deleted
console.assert(!isClassDeleted("cls-12a1", "12A1"), "Should not be deleted initially");

// Test case 2: delete 12A1
recordDeletedClass("cls-12a1", "12A1");
console.assert(isClassDeleted("cls-12a1", "12A1"), "12A1 should be deleted");
console.assert(isClassDeleted("", "12a1"), "12a1 case-insensitive check should be deleted");
console.assert(isClassDeleted("cls-12a1", ""), "id check should be deleted");

// Test case 3: 12A2 is not deleted
console.assert(!isClassDeleted("cls-12a2", "12A2"), "12A2 should not be deleted");

console.log("All unit assertions passed successfully!");
