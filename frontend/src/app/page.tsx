"use client";

import { useEffect, useState } from "react";
import LoginForm from "@/components/LoginForm";
import Dashboard from "@/components/Dashboard";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { User } from "@/lib/types";

/** Kiểm tra session khi mở trang; backend vẫn là nơi quyết định quyền thực sự. */
export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Bỏ qua response nếu component đã unmount, tránh cập nhật state đã hết hiệu lực.
    let active = true;
    api<User>("/auth/me")
      .then(user => { if (active) setUser(user); })
      .catch(error => {
        if (active && !(error instanceof ApiError && error.status === 401)) {
          setError(errorMessage(error));
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <main className="loading-screen" role="status">Đang kiểm tra phiên đăng nhập…</main>;

  if (!user) return <>
    {error && <div className="connection-banner" role="alert">{error}
      <button onClick={() => window.location.reload()}>Tải lại</button>
    </div>}
    <LoginForm onLogin={user => { setError(""); setUser(user); }} />
  </>;

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
