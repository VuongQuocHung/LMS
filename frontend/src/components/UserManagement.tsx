"use client";

import { useEffect, useState } from "react";
import { api, errorMessage, isSessionError } from "@/lib/api";
import type { User } from "@/lib/types";

/** Màn hình admin tối thiểu để kiểm tra khóa tài khoản và session đang tồn tại. */
export default function UserManagement({ currentUser, onSessionExpired }: {
  currentUser: User; onSessionExpired: () => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Chỉ cho một thao tác cập nhật tại một thời điểm để trạng thái bảng dễ theo dõi.
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    api<User[]>("/users")
      .then(data => { if (active) setUsers(data); })
      .catch(error => {
        if (!active) return;
        if (isSessionError(error)) onSessionExpired();
        else setError(errorMessage(error));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey, onSessionExpired]);

  /** Lấy lại trạng thái server, hữu ích khi lần cập nhật trước bị timeout. */
  function reload() {
    setLoading(true);
    setError("");
    setReloadKey(value => value + 1);
  }

  /** Đổi enabled; backend cũng kiểm tra admin và ngăn tự khóa tài khoản hiện tại. */
  async function toggleUser(user: User) {
    setBusyId(user.id);
    setError("");
    try {
      const updated = await api<User>(`/users/${user.id}`, {
        method: "PATCH", body: JSON.stringify({ enabled: !user.enabled }),
      });
      setUsers(previous => previous.map(item => item.id === updated.id ? updated : item));
    } catch (error) {
      if (isSessionError(error)) onSessionExpired();
      else setError(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  return <section>
    <div className="page-heading"><div><p className="eyebrow">QUẢN TRỊ HỆ THỐNG</p>
      <h1>Quản lý tài khoản</h1><p className="muted">Theo dõi và quản lý quyền truy cập của lớp học.</p></div>
      <button className="secondary" onClick={reload} disabled={loading || busyId !== null}>Tải lại</button>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    {loading ? <p className="panel" role="status">Đang tải tài khoản…</p> :
      <div className="panel table-wrap"><table>
        <thead><tr><th>Họ tên / Email</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>{users.map(user => <tr key={user.id}>
          <td><strong>{user.fullName}</strong><small>{user.email}</small></td>
          <td>{user.role}</td><td><span className={user.enabled ? "pill" : "pill disabled"}>{user.enabled ? "Hoạt động" : "Đã khóa"}</span></td>
          <td>{user.id === currentUser.id ? <span className="muted">Tài khoản của bạn</span> :
            <button className="secondary" disabled={busyId !== null} onClick={() => toggleUser(user)}>
              {busyId === user.id ? "Đang lưu…" : user.enabled ? "Khóa" : "Mở khóa"}</button>}</td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
}
