const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDoN0XerfDvems-IV_zSVbU9JB2LEvipkc",
  authDomain: "luyenthi12-4fb8c.firebaseapp.com",
  projectId: "luyenthi12-4fb8c",
  storageBucket: "luyenthi12-4fb8c.firebasestorage.app",
  messagingSenderId: "1049011844334",
  appId: "1:1049011844334:web:8c4abc060c1acd815cefff",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkClasses() {
  try {
    const snap = await getDocs(collection(db, "classes"));
    console.log("Firestore classes count:", snap.size);
    snap.docs.forEach(d => {
      console.log("Class doc ID:", d.id, "=> data:", d.data());
    });
    const snapStudents = await getDocs(collection(db, "students"));
    console.log("Firestore students count:", snapStudents.size);
  } catch (err) {
    console.error("Error reading Firestore:", err);
  }
}

checkClasses();
