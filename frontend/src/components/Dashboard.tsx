"use client";

import { useState } from "react";
import { errorMessage, isSessionError, logout } from "@/lib/api";
import type { Role, User } from "@/lib/types";
import CourseWorkspace from "./CourseWorkspace";
import UserManagement from "./UserManagement";
import PortalBrand from "./PortalBrand";

// Đổi mã vai trò của API thành nhãn tiếng Việt cho người sử dụng.
const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Quản trị viên", TEACHER: "Giảng viên", STUDENT: "Sinh viên",
};

/** Khung LMS: đầu trang, menu ngang, breadcrumb và nội dung theo vai trò. */
export default function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  // Chặn bấm đăng xuất nhiều lần khi server chưa trả lời.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const isAdmin = user.role === "ADMIN";
  const pageTitle = isAdmin ? "Quản lý tài khoản" : "Các khóa học của tôi";

  // Dùng tối đa hai chữ cái đầu của tên để tạo avatar, không cần tải ảnh bên ngoài.
  const initials = user.fullName.trim().split(/\s+/).slice(-2)
    .map(word => word.charAt(0)).join("").toUpperCase();

  /** Hủy phiên trên server trước khi đưa người dùng về trang đăng nhập. */
  async function handleLogout() {
    setBusy(true);
    setError("");
    try {
      await logout();
      onLogout();
    } catch (error) {
      if (isSessionError(error)) onLogout();
      else setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="portal-shell">
      <a className="skip-link" href="#main-content">Chuyển đến nội dung</a>
      <header className="portal-header">
        <PortalBrand />
        <div className="header-account">
          <button className="account-toggle" onClick={() => setShowProfile(!showProfile)}
            aria-expanded={showProfile} aria-controls="account-profile">
            <span className="account-name">{user.fullName}<small>{ROLE_LABELS[user.role]}</small></span>
            <span className="avatar" aria-hidden="true">{initials}</span>
            <span aria-hidden="true">⌄</span>
          </button>
          <button className="logout-button" onClick={handleLogout} disabled={busy}>
            {busy ? "Đang thoát…" : "Đăng xuất"}
          </button>
        </div>
      </header>

      {/* Menu chỉ chứa các khu vực đã có; mục tài khoản mở hồ sơ lấy từ API /auth/me. */}
      <nav className="main-nav" aria-label="Điều hướng chính">
        <a className="nav-brand" href="#main-content" aria-label="Trang chính LMS">LMS</a>
        <a className="nav-item nav-active" href="#main-content" aria-current="page">{pageTitle}</a>
        <button className="nav-item" onClick={() => setShowProfile(!showProfile)}
          aria-expanded={showProfile} aria-controls="account-profile">Thông tin tài khoản</button>
        <span className="nav-language">Tiếng Việt</span>
      </nav>

      {showProfile && <section id="account-profile" className="profile-panel" aria-label="Thông tin tài khoản">
        <div><strong>{user.fullName}</strong><p>{user.email}</p></div>
        <div><span className="muted">Vai trò</span><p>{ROLE_LABELS[user.role]}</p></div>
        {user.studentCode && <div><span className="muted">Mã sinh viên</span><p>{user.studentCode}</p></div>}
        <button className="text-button" onClick={() => setShowProfile(false)}>Đóng hồ sơ</button>
      </section>}

      <main id="main-content" className="workspace-main" tabIndex={-1}>
        <nav className="breadcrumbs" aria-label="Đường dẫn">
          <a href="#main-content">Trang chủ</a><span aria-hidden="true">›</span>
          <span>Các trang của hệ thống</span><span aria-hidden="true">›</span>
          <span aria-current="page">{pageTitle}</span>
        </nav>
        {error && <p className="error" role="alert">{error}</p>}
        {isAdmin
          ? <UserManagement currentUser={user} onSessionExpired={onLogout} />
          : <CourseWorkspace user={user} onSessionExpired={onLogout} />}
      </main>
      <footer className="portal-footer">
        <span>LMS · Hệ thống quản lý học tập</span>
        <span>Kết nối giảng dạy và học tập</span>
      </footer>
    </div>
  );
}
