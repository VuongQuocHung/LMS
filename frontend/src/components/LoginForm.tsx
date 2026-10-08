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
  // Chặn bấm liên tiếp khi request đăng nhập chưa hoàn tất.
  const [busy, setBusy] = useState(false);

  /** Kiểm tra thông tin bằng backend rồi bàn giao user cho trang chính. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(await login(email, password));
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  return (
    <div className="portal-shell login-portal">
      {/* Nhận diện dùng chung giúp trang login và trang khóa học thống nhất. */}
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
          <p className="login-help">Chưa có tài khoản? Liên hệ quản trị viên lớp học.</p>
        </div>
      </main>
      <footer className="portal-footer">LMS · Hệ thống quản lý học tập</footer>
    </div>
  );
}
