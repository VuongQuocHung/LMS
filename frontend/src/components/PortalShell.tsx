"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { api, ApiError, errorMessage, isSessionError, logout } from "@/lib/api";
import type { Role, User } from "@/lib/types";
import LoginForm from "./LoginForm";
import PortalBrand from "./PortalBrand";
import ScheduleModal from "./ScheduleModal";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Quản trị viên",
  TEACHER: "Giảng viên",
  STUDENT: "Sinh viên",
};

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PortalShellProps {
  breadcrumbs?: BreadcrumbItem[];
  children: (user: User) => ReactNode;
}

/** Khung giao diện dùng chung cho tất cả các trang LMS, đảm bảo session, header, menu và breadcrumb nhất quán. */
export default function PortalShell({ breadcrumbs = [], children }: PortalShellProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    let active = true;
    api<User>("/auth/me")
      .then(u => {
        if (active) setUser(u);
      })
      .catch(err => {
        if (active && !(err instanceof ApiError && err.status === 401)) {
          setAuthError(errorMessage(err));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    setBusy(true);
    setAuthError("");
    try {
      await logout();
      setUser(null);
    } catch (err) {
      if (isSessionError(err)) {
        setUser(null);
      } else {
        setAuthError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="loading-screen" role="status">
        Đang kiểm tra phiên đăng nhập…
      </main>
    );
  }

  if (!user) {
    return (
      <>
        {authError && (
          <div className="connection-banner" role="alert">
            {authError}
            <button onClick={() => window.location.reload()}>Tải lại</button>
          </div>
        )}
        <LoginForm
          onLogin={u => {
            setAuthError("");
            setUser(u);
          }}
        />
      </>
    );
  }

  const isAdmin = user.role === "ADMIN";
  const initials = user.fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map(w => w.charAt(0))
    .join("")
    .toUpperCase();

  const allBreadcrumbs: BreadcrumbItem[] = [
    { label: "Trang chủ", href: "/" },
    ...breadcrumbs,
  ];

  return (
    <div className="portal-shell">
      <a className="skip-link" href="#main-content">
        Chuyển đến nội dung
      </a>
      <header className="portal-header">
        <PortalBrand />
        <div className="header-account">
          <button
            className="account-toggle"
            onClick={() => setShowProfile(!showProfile)}
            aria-expanded={showProfile}
            aria-controls="account-profile"
          >
            <span className="account-name">
              {user.fullName}
              <small>{ROLE_LABELS[user.role]}</small>
            </span>
            <span className="avatar" aria-hidden="true">
              {initials}
            </span>
            <span aria-hidden="true">⌄</span>
          </button>
          <button className="logout-button" onClick={handleLogout} disabled={busy}>
            {busy ? "Đang thoát…" : "Đăng xuất"}
          </button>
        </div>
      </header>

      <nav className="main-nav" aria-label="Điều hướng chính">
        <Link className="nav-brand" href="/" aria-label="Trang chính LMS">
          LMS
        </Link>
        <Link className="nav-item nav-active" href="/" aria-current="page">
          {isAdmin ? "Quản lý tài khoản" : "Các khóa học của tôi"}
        </Link>
        {!isAdmin && (
          <button className="nav-item" onClick={() => setShowSchedule(true)}>
            Lịch học & Hạn nộp
          </button>
        )}
        <button
          className="nav-item"
          onClick={() => setShowProfile(!showProfile)}
          aria-expanded={showProfile}
          aria-controls="account-profile"
        >
          Thông tin tài khoản
        </button>
        <span className="nav-language">Tiếng Việt</span>
      </nav>

      {showSchedule && (
        <ScheduleModal onClose={() => setShowSchedule(false)} onSessionExpired={() => setUser(null)} />
      )}

      {showProfile && (
        <section id="account-profile" className="profile-panel" aria-label="Thông tin tài khoản">
          <div>
            <strong>{user.fullName}</strong>
            <p>{user.email}</p>
          </div>
          <div>
            <span className="muted">Vai trò</span>
            <p>{ROLE_LABELS[user.role]}</p>
          </div>
          {user.studentCode && (
            <div>
              <span className="muted">Mã sinh viên</span>
              <p>{user.studentCode}</p>
            </div>
          )}
          <button className="text-button" onClick={() => setShowProfile(false)}>
            Đóng hồ sơ
          </button>
        </section>
      )}

      <main id="main-content" className="workspace-main" tabIndex={-1}>
        <nav className="breadcrumbs" aria-label="Đường dẫn">
          {allBreadcrumbs.map((crumb, idx) => {
            const isLast = idx === allBreadcrumbs.length - 1;
            return (
              <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: "9px" }}>
                {idx > 0 && <span aria-hidden="true">›</span>}
                {isLast || !crumb.href ? (
                  <span aria-current={isLast ? "page" : undefined}>{crumb.label}</span>
                ) : (
                  <Link href={crumb.href}>{crumb.label}</Link>
                )}
              </span>
            );
          })}
        </nav>

        {children(user)}
      </main>

      <footer className="portal-footer">
        <span>LMS · Hệ thống quản lý học tập</span>
        <span>Kết nối giảng dạy và học tập</span>
      </footer>
    </div>
  );
}
