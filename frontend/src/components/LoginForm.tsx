"use client";

import { useState, type FormEvent } from "react";
import { errorMessage, login } from "@/lib/api";
import type { User } from "@/lib/types";
import PortalBrand from "./PortalBrand";

/** Form đăng nhập thật qua API; mật khẩu chỉ giữ trong bộ nhớ khi nhập. */
export default function LoginForm({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /** Điền nhanh tài khoản demo để kiểm thử thuận tiện. */
  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("Demo@12345");
    setError("");
  }

  /** Kiểm tra thông tin bằng backend rồi bàn giao user cho trang chính. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(await login(email, password));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  return (
    <div className="portal-shell login-portal">
      <header className="portal-header"><PortalBrand /></header>
      <div className="login-nav-label">Cổng học tập trực tuyến</div>
      <main className="login-panel">
        <div className="login-card">
          <h1>Đăng nhập</h1>
          <p className="muted">Sử dụng tài khoản do quản trị viên cung cấp.</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" required maxLength={180}
              placeholder="ban@lms.local" value={email} onChange={event => setEmail(event.target.value)} />
            <label htmlFor="password">Mật khẩu</label>
            <input id="password" type="password" autoComplete="current-password" required
              value={password} onChange={event => setPassword(event.target.value)} />
            {error && <p className="error" role="alert">{error}</p>}
            <button className="primary full" disabled={busy}>{busy ? "Đang đăng nhập…" : "Vào không gian học tập →"}</button>
          </form>

          {/* Hỗ trợ điền nhanh tài khoản demo cho kiểm thử */}
          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px dashed #ddd" }}>
            <p style={{ fontSize: "11px", color: "var(--muted)", margin: "0 0 8px", fontWeight: 600 }}>
              Tài khoản dùng thử (Mật khẩu: Demo@12345):
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              <button type="button" className="secondary" style={{ fontSize: "11px", padding: "3px 7px" }}
                onClick={() => fillDemo("admin@lms.local")}>
                Admin
              </button>
              <button type="button" className="secondary" style={{ fontSize: "11px", padding: "3px 7px" }}
                onClick={() => fillDemo("teacher@lms.local")}>
                Giảng viên 1
              </button>
              <button type="button" className="secondary" style={{ fontSize: "11px", padding: "3px 7px" }}
                onClick={() => fillDemo("teacher2@lms.local")}>
                Giảng viên 2
              </button>
              <button type="button" className="secondary" style={{ fontSize: "11px", padding: "3px 7px" }}
                onClick={() => fillDemo("student@lms.local")}>
                Sinh viên (đã ghi danh)
              </button>
              <button type="button" className="secondary" style={{ fontSize: "11px", padding: "3px 7px" }}
                onClick={() => fillDemo("student2@lms.local")}>
                Sinh viên 2
              </button>
            </div>
          </div>

          <p className="login-help">Chưa có tài khoản? Liên hệ quản trị viên lớp học.</p>
        </div>
      </main>
      <footer className="portal-footer">LMS · Hệ thống quản lý học tập</footer>
    </div>
  );
}
