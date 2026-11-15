"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { app, db, auth, firebaseConfig } from "@/lib/firebase";
import { collection, addDoc, getDocs, limit, query, serverTimestamp } from "firebase/firestore";

interface LogMessage {
  time: string;
  type: "info" | "success" | "warn" | "error";
  text: string;
}

export default function TestFirebasePage() {
  const [testing, setTesting] = useState(false);
  const [initStatus, setInitStatus] = useState<"pending" | "success" | "error">("pending");
  const [firestoreWriteStatus, setFirestoreWriteStatus] = useState<"pending" | "success" | "error">("pending");
  const [firestoreReadStatus, setFirestoreReadStatus] = useState<"pending" | "success" | "error">("pending");
  const [authStatus, setAuthStatus] = useState<"pending" | "success" | "error">("pending");
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [lastLatency, setLastLatency] = useState<number | null>(null);

  const addLog = (text: string, type: "info" | "success" | "warn" | "error" = "info") => {
    const now = new Date();
    const time = now.toTimeString().split(" ")[0] + "." + now.getMilliseconds().toString().padStart(3, "0");
    setLogs((prev) => [...prev, { time, type, text }]);
  };

  const runAllTests = async () => {
    setTesting(true);
    setLogs([]);
    addLog("Bắt đầu kiểm tra kết nối Firebase...", "info");

    const startTime = performance.now();

    // 1. Check App Initialization
    try {
      if (app && app.name) {
        setInitStatus("success");
        addLog(`✅ Firebase App đã khởi tạo thành công: [${app.name}]`, "success");
        addLog(`📌 Project ID: ${firebaseConfig.projectId}`, "info");
      } else {
        throw new Error("Không thể khởi tạo Firebase App.");
      }
    } catch (err: unknown) {
      setInitStatus("error");
      addLog(`❌ Lỗi khởi tạo App: ${err instanceof Error ? err.message : String(err)}`, "error");
    }

    // 2. Check Auth Service
    try {
      if (auth) {
        setAuthStatus("success");
        addLog(`✅ Firebase Authentication đã sẵn sàng hoạt động`, "success");
      } else {
        throw new Error("Không thể kết nối Authentication");
      }
    } catch (err: unknown) {
      setAuthStatus("error");
      addLog(`❌ Lỗi Auth: ${err instanceof Error ? err.message : String(err)}`, "error");
    }

    // 3. Check Firestore Write Test
    let writeDocId = "";
    try {
      addLog("Đang gửi bản ghi thử nghiệm vào Firestore (collection 'test_connection')...", "info");
      const writeStart = performance.now();
      const colRef = collection(db, "test_connection");
      const docRef = await addDoc(colRef, {
        testType: "connection_diagnostic",
        clientTimestamp: Date.now(),
        serverCreatedAt: serverTimestamp(),
        deviceInfo: typeof navigator !== "undefined" ? navigator.userAgent : "SSR",
        appName: "Luyen Thi 12 - Dang Anh Thu",
      });
      const writeDuration = Math.round(performance.now() - writeStart);
      writeDocId = docRef.id;
      setFirestoreWriteStatus("success");
      addLog(`✅ Ghi dữ liệu Firestore thành công! Document ID: ${docRef.id} (${writeDuration}ms)`, "success");
    } catch (err: unknown) {
      setFirestoreWriteStatus("error");
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Lỗi Ghi Firestore: ${errMsg}`, "error");
      if (errMsg.includes("permission-denied") || errMsg.includes("insufficient permissions")) {
        addLog("💡 Gợi ý: Hãy kiểm tra Firestore Rules trên Firebase Console. Có thể cần chuyển sang chế độ Test mode hoặc cho phép ghi.", "warn");
      }
    }

    // 4. Check Firestore Read Test
    try {
      addLog("Đang kiểm tra đọc dữ liệu từ Firestore...", "info");
      const readStart = performance.now();
      const colRef = collection(db, "test_connection");
      const q = query(colRef, limit(3));
      const querySnap = await getDocs(q);
      const readDuration = Math.round(performance.now() - readStart);
      setFirestoreReadStatus("success");
      addLog(`✅ Đọc dữ liệu Firestore thành công! Tìm thấy ${querySnap.size} bản ghi (${readDuration}ms)`, "success");
    } catch (err: unknown) {
      setFirestoreReadStatus("error");
      const errMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Lỗi Đọc Firestore: ${errMsg}`, "error");
    }

    const totalDuration = Math.round(performance.now() - startTime);
    setLastLatency(totalDuration);
    addLog(`🎉 Hoàn tất toàn bộ quy trình kiểm tra trong ${totalDuration}ms`, "info");
    setTesting(false);
  };

  useEffect(() => {
    runAllTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAllSuccess =
    initStatus === "success" &&
    firestoreWriteStatus === "success" &&
    firestoreReadStatus === "success" &&
    authStatus === "success";

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <Link href="/" className={styles.backBtn}>
            ← Quay lại Trang Chủ
          </Link>
          <h1 className={styles.title}>Kiểm Tra Kết Nối Firebase</h1>
          <p className={styles.subtitle}>
            Trang chẩn đoán kết nối thời gian thực tới dự án Firebase <strong>luyenthi12-4fb8c</strong>
          </p>
        </div>

        {/* Status Banner */}
        <div
          className={`${styles.statusBanner} ${
            testing
              ? styles.statusPending
              : isAllSuccess
              ? styles.statusSuccess
              : styles.statusError
          }`}
        >
          <div className={styles.statusLeft}>
            <span className={styles.statusIcon}>
              {testing ? "⏳" : isAllSuccess ? "🟢" : "⚠️"}
            </span>
            <div>
              <div className={styles.statusHeading}>
                {testing
                  ? "Đang tiến hành chẩn đoán kết nối..."
                  : isAllSuccess
                  ? "Kết Nối Firebase Hoàn Toàn Thành Công!"
                  : "Có một số cảnh báo trong kết nối"}
              </div>
              <div className={styles.statusText}>
                {testing
                  ? "Vui lòng chờ trong giây lát..."
                  : isAllSuccess
                  ? `Hệ thống cơ sở dữ liệu đã sẵn sàng hoạt động (Độ trễ: ${lastLatency || 0}ms).`
                  : "Vui lòng kiểm tra nhật ký chi tiết bên dưới để xác định nguyên nhân."}
              </div>
            </div>
          </div>

          <button
            className={styles.actionBtn}
            onClick={runAllTests}
            disabled={testing}
          >
            {testing ? "Đang kiểm tra..." : "🔄 Kiểm Tra Lại Ngay"}
          </button>
        </div>

        {/* 4 Cards Grid */}
        <div className={styles.testGrid}>
          {/* Card 1: App Init */}
          <div className={styles.testCard}>
            <div className={styles.testCardHeader}>
              <div className={styles.cardTitle}>
                <span>⚙️</span> Khởi Tạo Ứng Dụng (SDK)
              </div>
              <span
                className={`${styles.badge} ${
                  initStatus === "success"
                    ? styles.badgeSuccess
                    : initStatus === "error"
                    ? styles.badgeError
                    : styles.badgeLoading
                }`}
              >
                {initStatus === "success" ? "Đạt" : initStatus === "error" ? "Lỗi" : "Đang kiểm tra"}
              </span>
            </div>
            <div className={styles.cardBody}>
              Khởi tạo Firebase Core SDK qua mô hình Singleton để phòng ngừa lỗi tạo lặp đối tượng trong Next.js.
            </div>
            <div className={styles.cardFooter}>
              <span>App Name: [{app?.name || "DEFAULT"}]</span>
              <span>Trạng thái: OK</span>
            </div>
          </div>

          {/* Card 2: Firestore Write */}
          <div className={styles.testCard}>
            <div className={styles.testCardHeader}>
              <div className={styles.cardTitle}>
                <span>✍️</span> Ghi Dữ Liệu (Firestore)
              </div>
              <span
                className={`${styles.badge} ${
                  firestoreWriteStatus === "success"
                    ? styles.badgeSuccess
                    : firestoreWriteStatus === "error"
                    ? styles.badgeError
                    : styles.badgeLoading
                }`}
              >
                {firestoreWriteStatus === "success" ? "Đạt" : firestoreWriteStatus === "error" ? "Lỗi" : "Đang kiểm tra"}
              </span>
            </div>
            <div className={styles.cardBody}>
              Thử nghiệm ghi bản ghi JSON mẫu chứa timestamp lên Cloud Firestore collection: <code>test_connection</code>.
            </div>
            <div className={styles.cardFooter}>
              <span>Quyền Ghi: {firestoreWriteStatus === "success" ? "Cho phép" : "Kiểm tra Rule"}</span>
              <span>Database: Firestore</span>
            </div>
          </div>

          {/* Card 3: Firestore Read */}
          <div className={styles.testCard}>
            <div className={styles.testCardHeader}>
              <div className={styles.cardTitle}>
                <span>📖</span> Đọc Dữ Liệu (Firestore)
              </div>
              <span
                className={`${styles.badge} ${
                  firestoreReadStatus === "success"
                    ? styles.badgeSuccess
                    : firestoreReadStatus === "error"
                    ? styles.badgeError
                    : styles.badgeLoading
                }`}
              >
                {firestoreReadStatus === "success" ? "Đạt" : firestoreReadStatus === "error" ? "Lỗi" : "Đang kiểm tra"}
              </span>
            </div>
            <div className={styles.cardBody}>
              Truy vấn danh sách tài liệu từ cơ sở dữ liệu để đảm bảo API trả dữ liệu tức thời và đúng định dạng.
            </div>
            <div className={styles.cardFooter}>
              <span>Quyền Đọc: {firestoreReadStatus === "success" ? "Cho phép" : "Kiểm tra Rule"}</span>
              <span>Truy vấn: Query Limit 3</span>
            </div>
          </div>

          {/* Card 4: Auth Service */}
          <div className={styles.testCard}>
            <div className={styles.testCardHeader}>
              <div className={styles.cardTitle}>
                <span>🔐</span> Firebase Authentication
              </div>
              <span
                className={`${styles.badge} ${
                  authStatus === "success"
                    ? styles.badgeSuccess
                    : authStatus === "error"
                    ? styles.badgeError
                    : styles.badgeLoading
                }`}
              >
                {authStatus === "success" ? "Sẵn sàng" : "Lỗi"}
              </span>
            </div>
            <div className={styles.cardBody}>
              Xác thực dịch vụ Auth của dự án phục vụ tính năng đăng nhập học sinh, lưu hồ sơ điểm số cá nhân.
            </div>
            <div className={styles.cardFooter}>
              <span>Auth Domain: {firebaseConfig.authDomain}</span>
              <span>Trạng thái: Hoạt động</span>
            </div>
          </div>
        </div>

        {/* Live Diagnostics Console */}
        <div className={styles.consoleCard}>
          <div className={styles.consoleHeader}>
            <span>🖥️ NHẬT KÝ KIỂM TRA THỜI GIAN THỰC (LIVE CONSOLE)</span>
            <span>{logs.length} sự kiện</span>
          </div>
          <div className={styles.consoleLogs}>
            {logs.map((log, idx) => (
              <div key={idx} className={styles.logEntry}>
                <span className={styles.logTime}>[{log.time}]</span>
                <span
                  className={
                    log.type === "success"
                      ? styles.logSuccess
                      : log.type === "error"
                      ? styles.logError
                      : log.type === "warn"
                      ? styles.logWarn
                      : styles.logInfo
                  }
                >
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Firebase Config Inspector */}
        <div className={styles.configCard}>
          <div className={styles.configTitle}>
            <span>📋</span> Thông Số Cấu Hình Firebase Đang Sử Dụng
          </div>
          <div className={styles.configList}>
            <div className={styles.configItem}>
              <div className={styles.configKey}>Project ID</div>
              <div className={styles.configVal}>{firebaseConfig.projectId}</div>
            </div>
            <div className={styles.configItem}>
              <div className={styles.configKey}>Auth Domain</div>
              <div className={styles.configVal}>{firebaseConfig.authDomain}</div>
            </div>
            <div className={styles.configItem}>
              <div className={styles.configKey}>Storage Bucket</div>
              <div className={styles.configVal}>{firebaseConfig.storageBucket}</div>
            </div>
            <div className={styles.configItem}>
              <div className={styles.configKey}>App ID</div>
              <div className={styles.configVal}>{firebaseConfig.appId}</div>
            </div>
            <div className={styles.configItem}>
              <div className={styles.configKey}>Measurement ID</div>
              <div className={styles.configVal}>{firebaseConfig.measurementId}</div>
            </div>
            <div className={styles.configItem}>
              <div className={styles.configKey}>API Key</div>
              <div className={styles.configVal}>
                {firebaseConfig.apiKey.substring(0, 10)}********************
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
