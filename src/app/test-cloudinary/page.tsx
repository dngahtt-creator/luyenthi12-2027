"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { cloudinaryConfig, uploadImageToCloudinary, CloudinaryUploadResult } from "@/lib/cloudinary";

interface LogEntry {
  time: string;
  type: "info" | "success" | "warn" | "error";
  text: string;
}

export default function TestCloudinaryPage() {
  const [testing, setTesting] = useState(false);
  const [apiPingStatus, setApiPingStatus] = useState<"pending" | "success" | "error">("pending");
  const [cdnStatus, setCdnStatus] = useState<"pending" | "success" | "error">("pending");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadResult, setUploadResult] = useState<CloudinaryUploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPreset, setUploadPreset] = useState<string>("o100uxqf");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  const addLog = (text: string, type: "info" | "success" | "warn" | "error" = "info") => {
    const now = new Date();
    const time = now.toTimeString().split(" ")[0] + "." + now.getMilliseconds().toString().padStart(3, "0");
    setLogs((prev) => [...prev, { time, type, text }]);
  };

  // 1. Run automatic connection test
  const runDiagnostic = async () => {
    setTesting(true);
    setLogs([]);
    addLog(`Bắt đầu kiểm tra kết nối Cloudinary cho Cloud Name: [${cloudinaryConfig.cloudName}]...`, "info");
    addLog(`API Key: ${cloudinaryConfig.apiKey}`, "info");

    // Test 1: API Endpoint Ping via Server Route
    try {
      addLog("Đang kiểm tra kết nối API Cloudinary (/api/cloudinary)...", "info");
      const res = await fetch("/api/cloudinary");
      const data = await res.json();
      if (data.reachable) {
        setApiPingStatus("success");
        setPingLatency(data.latencyMs);
        addLog(`✅ Máy chủ Cloudinary phản hồi tốt! (Độ trễ: ${data.latencyMs}ms, HTTP ${data.httpStatus})`, "success");
      } else {
        setApiPingStatus("error");
        addLog(`❌ Không thể kết nối tới máy chủ Cloudinary: ${data.message}`, "error");
      }
    } catch (err: unknown) {
      setApiPingStatus("error");
      addLog(`❌ Lỗi kiểm tra API: ${err instanceof Error ? err.message : String(err)}`, "error");
    }

    // Test 2: CDN Edge Delivery Check
    try {
      addLog(`Đang kiểm tra mạng phân phối CDN (${cloudinaryConfig.deliveryBaseUrl})...`, "info");
      const cdnUrl = `${cloudinaryConfig.deliveryBaseUrl}/image/upload/sample.jpg`;
      const cdnStart = performance.now();
      await fetch(cdnUrl, { method: "HEAD", mode: "no-cors" });
      const cdnDuration = Math.round(performance.now() - cdnStart);
      setCdnStatus("success");
      addLog(`✅ Mạng CDN Cloudinary phân giải thành công (${cdnDuration}ms)`, "success");
    } catch (err: unknown) {
      setCdnStatus("error");
      addLog(`❌ Lỗi CDN: ${err instanceof Error ? err.message : String(err)}`, "error");
    }

    setTesting(false);
  };

  useEffect(() => {
    runDiagnostic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Upload test image
  const handleUploadSampleImage = async () => {
    setUploadStatus("uploading");
    setUploadError(null);
    addLog(`Đang tạo ảnh chứng nhận mẫu và tải lên Cloudinary (preset: '${uploadPreset}')...`, "info");

    try {
      // Create a canvas with a certificate/badge
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Gradient background
        const grad = ctx.createLinearGradient(0, 0, 600, 360);
        grad.addColorStop(0, "#1d4ed8");
        grad.addColorStop(1, "#0284c7");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 600, 360);

        // Border
        ctx.strokeStyle = "#93c5fd";
        ctx.lineWidth = 6;
        ctx.strokeRect(12, 12, 576, 336);

        // Text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 26px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("LUYỆN THI 12 - ĐẶNG ANH THƯ", 300, 110);

        ctx.fillStyle = "#bfdbfe";
        ctx.font = "18px sans-serif";
        ctx.fillText("Xác Thực Kết Nối Cloudinary Thành Công", 300, 160);

        ctx.fillStyle = "#fef08a";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText("MỤC TIÊU 9+ THPT QUỐC GIA 2026", 300, 220);

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "13px sans-serif";
        ctx.fillText(`Timestamp: ${new Date().toLocaleString("vi-VN")}`, 300, 290);
      }

      const dataUrl = canvas.toDataURL("image/png");
      const res = await uploadImageToCloudinary(dataUrl, uploadPreset);

      if (res.success && res.data) {
        setUploadStatus("success");
        setUploadResult(res.data);
        addLog(`🎉 Tải ảnh lên Cloudinary thành công!`, "success");
        addLog(`🔗 URL ảnh: ${res.data.secure_url}`, "success");
        addLog(`📌 Public ID: ${res.data.public_id} (${res.data.format?.toUpperCase()}, ${res.data.width}x${res.data.height}px)`, "info");
      } else {
        setUploadStatus("error");
        setUploadError(res.error || "Tải lên thất bại");
        addLog(`❌ Tải ảnh thất bại: ${res.error}`, "error");
        if (res.error?.includes("Upload preset must be specified") || res.error?.includes("preset")) {
          addLog("💡 Hướng dẫn: Cloudinary yêu cầu bật 'Unsigned Upload' và cấu hình Upload Preset trong Cloudinary Console.", "warn");
        }
      }
    } catch (err: unknown) {
      setUploadStatus("error");
      const msg = err instanceof Error ? err.message : String(err);
      setUploadError(msg);
      addLog(`❌ Lỗi ngoại lệ khi tải ảnh: ${msg}`, "error");
    }
  };

  // 3. Upload from file input
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus("uploading");
    setUploadError(null);
    addLog(`Đang tải tệp [${file.name}] (${(file.size / 1024).toFixed(1)} KB) lên Cloudinary...`, "info");

    const res = await uploadImageToCloudinary(file, uploadPreset);
    if (res.success && res.data) {
      setUploadStatus("success");
      setUploadResult(res.data);
      addLog(`🎉 Tải tệp lên Cloudinary thành công!`, "success");
      addLog(`🔗 URL ảnh: ${res.data.secure_url}`, "success");
    } else {
      setUploadStatus("error");
      setUploadError(res.error || "Tải lên thất bại");
      addLog(`❌ Tải tệp thất bại: ${res.error}`, "error");
    }
  };

  const isConnected = apiPingStatus === "success" && cdnStatus === "success";

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        {/* Navigation Bar */}
        <div className={styles.topNavRow}>
          <Link href="/" className={styles.backBtn}>
            ← Quay lại Trang Chủ
          </Link>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/test-firebase" className={styles.backBtn} style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>
              🔥 Kiểm tra Firebase
            </Link>
          </div>
        </div>

        {/* Title */}
        <div className={styles.header}>
          <h1 className={styles.title}>Kiểm Tra Kết Nối Cloudinary</h1>
          <p className={styles.subtitle}>
            Trang chẩn đoán kết nối API, CDN và tính năng tải ảnh lên tài khoản Cloudinary <strong>{cloudinaryConfig.cloudName}</strong>
          </p>
        </div>

        {/* Status Banner */}
        <div
          className={`${styles.statusBanner} ${
            testing
              ? styles.statusPending
              : isConnected
              ? styles.statusSuccess
              : styles.statusError
          }`}
        >
          <div className={styles.statusLeft}>
            <span className={styles.statusIcon}>
              {testing ? "⏳" : isConnected ? "☁️" : "⚠️"}
            </span>
            <div>
              <div className={styles.statusHeading}>
                {testing
                  ? "Đang kiểm tra kết nối Cloudinary..."
                  : isConnected
                  ? "Kết Nối Cloudinary Đang Hoạt Động Bình Thường!"
                  : "Chưa thể kết nối tới Cloudinary"}
              </div>
              <div className={styles.statusText}>
                {testing
                  ? "Vui lòng đợi giây lát trong khi gửi ping tới máy chủ Cloudinary..."
                  : isConnected
                  ? `Máy chủ và hệ thống CDN phân phối ảnh đã sẵn sàng (Độ trễ phản hồi: ${pingLatency || 0}ms).`
                  : "Có lỗi khi kết nối với máy chủ Cloudinary. Vui lòng xem log chi tiết."}
              </div>
            </div>
          </div>

          <button
            className={styles.actionBtn}
            onClick={runDiagnostic}
            disabled={testing}
          >
            {testing ? "Đang kiểm tra..." : "🔄 Kiểm Tra Lại Kết Nối"}
          </button>
        </div>

        {/* 3 Diagnostics Cards */}
        <div className={styles.diagGrid}>
          {/* Card 1: Cloud Name */}
          <div className={styles.diagCard}>
            <div className={styles.diagHeader}>
              <div className={styles.diagTitle}>
                <span>🏷️</span> Cloud Name
              </div>
              <span className={`${styles.badge} ${styles.badgeSuccess}`}>Hợp lệ</span>
            </div>
            <div className={styles.diagBody}>
              Tên tài khoản đám mây định tuyến: <strong>{cloudinaryConfig.cloudName}</strong>. Dùng để tạo URL ảnh và CDN.
            </div>
            <div className={styles.diagFooter}>
              Target: {cloudinaryConfig.cloudName}
            </div>
          </div>

          {/* Card 2: API Gateway */}
          <div className={styles.diagCard}>
            <div className={styles.diagHeader}>
              <div className={styles.diagTitle}>
                <span>⚡</span> API Gateway
              </div>
              <span
                className={`${styles.badge} ${
                  apiPingStatus === "success"
                    ? styles.badgeSuccess
                    : apiPingStatus === "error"
                    ? styles.badgeError
                    : styles.badgePending
                }`}
              >
                {apiPingStatus === "success" ? "Online" : apiPingStatus === "error" ? "Lỗi" : "Đang kiểm tra"}
              </span>
            </div>
            <div className={styles.diagBody}>
              Kiểm tra điểm cuối API tải ảnh <code>api.cloudinary.com/v1_1</code> với API Key xác thực.
            </div>
            <div className={styles.diagFooter}>
              Độ trễ: {pingLatency !== null ? `${pingLatency}ms` : "---"}
            </div>
          </div>

          {/* Card 3: CDN Delivery */}
          <div className={styles.diagCard}>
            <div className={styles.diagHeader}>
              <div className={styles.diagTitle}>
                <span>🌍</span> CDN Delivery
              </div>
              <span
                className={`${styles.badge} ${
                  cdnStatus === "success"
                    ? styles.badgeSuccess
                    : cdnStatus === "error"
                    ? styles.badgeError
                    : styles.badgePending
                }`}
              >
                {cdnStatus === "success" ? "Sẵn sàng" : "Lỗi"}
              </span>
            </div>
            <div className={styles.diagBody}>
              Hệ thống mạng lưới phân phối nội dung tĩnh <code>res.cloudinary.com</code> tối ưu tốc độ tải ảnh.
            </div>
            <div className={styles.diagFooter}>
              Trạng thái: Sẵn sàng phục vụ
            </div>
          </div>
        </div>

        {/* Upload Playground */}
        <div className={styles.uploadCard}>
          <div className={styles.uploadTitle}>
            <span>📤</span> Thử Nghiệm Tải Ảnh Lên Cloudinary
          </div>
          <p className={styles.uploadDesc}>
            Tải thử một bức ảnh lên không gian lưu trữ Cloudinary để kiểm tra quyền ghi và nhận URL trực tiếp.
          </p>

          <div className={styles.presetRow}>
            <label className={styles.presetLabel}>Upload Preset (Unsigned):</label>
            <input
              type="text"
              value={uploadPreset}
              onChange={(e) => setUploadPreset(e.target.value)}
              placeholder="ví dụ: o100uxqf hoặc ml_default"
              className={styles.presetInput}
            />
          </div>

          <div className={styles.uploadActions}>
            <button
              className={styles.actionBtn}
              onClick={handleUploadSampleImage}
              disabled={uploadStatus === "uploading"}
            >
              <span>🎨</span> {uploadStatus === "uploading" ? "Đang tải ảnh lên..." : "Tự Động Tạo & Tải Ảnh Mẫu"}
            </button>

            <div className={styles.fileInputWrapper}>
              <button className={styles.fileInputBtn}>
                <span>📁</span> Chọn Ảnh Từ Máy Tính
              </button>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className={styles.fileHiddenInput}
                disabled={uploadStatus === "uploading"}
              />
            </div>
          </div>

          {/* Upload Success View */}
          {uploadResult && (
            <div className={styles.uploadResultBox}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadResult.secure_url}
                alt="Cloudinary Uploaded Preview"
                className={styles.previewImage}
              />
              <div className={styles.resultInfo}>
                <div style={{ color: "#166534", fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
                  🎉 Tải Lên Thành Công Vào Cloudinary!
                </div>
                <div><strong>Public ID:</strong> {uploadResult.public_id}</div>
                <div><strong>Kích thước:</strong> {uploadResult.width} x {uploadResult.height} px ({uploadResult.format?.toUpperCase()})</div>
                <div><strong>Dung lượng:</strong> {uploadResult.bytes ? `${(uploadResult.bytes / 1024).toFixed(1)} KB` : "N/A"}</div>
                <div>
                  <strong>URL Cloudinary:</strong>{" "}
                  <a
                    href={uploadResult.secure_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.resultUrlLink}
                  >
                    {uploadResult.secure_url}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Upload Error / Preset Guide */}
          {uploadError && (
            <div className={styles.presetGuideBox}>
              <strong>⚠️ Lưu ý về Upload Preset của Cloudinary:</strong>
              <div style={{ marginTop: "4px" }}>
                Lỗi chi tiết: <code>{uploadError}</code>
              </div>
              <div style={{ marginTop: "8px", fontSize: "12px" }}>
                💡 Để tải ảnh trực tiếp từ trình duyệt một cách an toàn mà không cần tiết lộ <em>API Secret</em>, bạn hãy:
                <ol style={{ paddingLeft: "18px", marginTop: "4px" }}>
                  <li>Đăng nhập <a href="https://console.cloudinary.com" target="_blank" rel="noreferrer" style={{ textDecoration: "underline", fontWeight: 600 }}>console.cloudinary.com</a>.</li>
                  <li>Vào <strong>Settings (biểu tượng bánh răng)</strong> → mục <strong>Upload Presets</strong>.</li>
                  <li>Bấm <strong>Add upload preset</strong>, chọn chế độ <strong>Signing mode: Unsigned</strong>.</li>
                  <li>Đặt tên Preset (hoặc để mặc định) rồi nhập tên đó vào ô <strong>Upload Preset</strong> ở trên để tải ảnh thành công 100%!</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Live Diagnostics Console */}
        <div className={styles.consoleCard}>
          <div className={styles.consoleHeader}>
            <span>🖥️ NHẬT KÝ KIỂM TRA THỜI GIAN THỰC (CLOUDINARY CONSOLE)</span>
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

        {/* Config Summary */}
        <div className={styles.configCard}>
          <div className={styles.configTitle}>
            <span>📋</span> Thông Số Cấu Hình Cloudinary Đang Sử Dụng
          </div>
          <div className={styles.configList}>
            <div className={styles.configItem}>
              <div className={styles.configKey}>Cloud Name</div>
              <div className={styles.configVal}>{cloudinaryConfig.cloudName}</div>
            </div>
            <div className={styles.configItem}>
              <div className={styles.configKey}>API Key</div>
              <div className={styles.configVal}>{cloudinaryConfig.apiKey}</div>
            </div>
            <div className={styles.configItem}>
              <div className={styles.configKey}>API Upload Endpoint</div>
              <div className={styles.configVal}>{cloudinaryConfig.apiUploadUrl}</div>
            </div>
            <div className={styles.configItem}>
              <div className={styles.configKey}>CDN Delivery URL</div>
              <div className={styles.configVal}>{cloudinaryConfig.deliveryBaseUrl}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
