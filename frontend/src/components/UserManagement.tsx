"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, errorMessage, isSessionError } from "@/lib/api";
import type { Role, User } from "@/lib/types";

type RoleFilter = "ALL" | Role;
type StatusFilter = "ALL" | "ACTIVE" | "DISABLED";

/** Màn hình quản trị tài khoản: xem danh sách, lọc, tạo mới, chỉnh sửa và khóa/mở tài khoản. */
export default function UserManagement({ currentUser, onSessionExpired }: {
  currentUser: User; onSessionExpired: () => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Bộ lọc tìm kiếm
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createRole, setCreateRole] = useState<Role>("STUDENT");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api<User[]>("/users")
      .then(data => { if (active) setUsers(data); })
      .catch(err => {
        if (!active) return;
        if (isSessionError(err)) onSessionExpired();
        else setError(errorMessage(err));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey, onSessionExpired]);

  function reload() {
    setLoading(true);
    setError("");
    setSuccess("");
    setReloadKey(value => value + 1);
  }

  function clearFilters() {
    setSearch("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
  }

  /** Đổi enabled (khóa/mở khóa); backend kiểm tra admin và ngăn tự khóa tài khoản hiện tại. */
  async function toggleUser(user: User) {
    setBusyId(user.id);
    setError("");
    setSuccess("");
    try {
      const updated = await api<User>(`/users/${user.id}`, {
        method: "PATCH", body: JSON.stringify({ enabled: !user.enabled }),
      });
      setUsers(previous => previous.map(item => item.id === updated.id ? updated : item));
      setSuccess(`Đã ${updated.enabled ? "mở khóa" : "khóa"} tài khoản ${updated.email}`);
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  /** Tạo tài khoản mới qua POST /api/v1/users */
  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const newUser = await api<User>("/users", {
        method: "POST",
        body: JSON.stringify({
          email: String(data.get("email")).trim(),
          password: String(data.get("password")),
          fullName: String(data.get("fullName")).trim(),
          role: data.get("role"),
          studentCode: data.get("studentCode") ? String(data.get("studentCode")).trim() : null,
        }),
      });
      setUsers(prev => [...prev, newUser]);
      setShowCreateForm(false);
      form.reset();
      setSuccess(`Đã tạo thành công tài khoản: ${newUser.email}`);
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /** Cập nhật thông tin tài khoản qua PUT /api/v1/users/{id} */
  async function handleUpdateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const password = data.get("password") ? String(data.get("password")).trim() : null;
      const updated = await api<User>(`/users/${editingUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: String(data.get("fullName")).trim(),
          role: data.get("role"),
          studentCode: data.get("studentCode") ? String(data.get("studentCode")).trim() : null,
          enabled: data.get("enabled") === "true",
          password: password && password.length > 0 ? password : null,
        }),
      });
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setEditingUser(null);
      setSuccess(`Đã cập nhật thông tin tài khoản ${updated.email}`);
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // Bộ lọc tài khoản
  const keyword = search.trim().toLowerCase();
  const visibleUsers = users
    .filter(u => roleFilter === "ALL" || u.role === roleFilter)
    .filter(u => {
      if (statusFilter === "ACTIVE") return u.enabled;
      if (statusFilter === "DISABLED") return !u.enabled;
      return true;
    })
    .filter(u => `${u.fullName} ${u.email} ${u.studentCode ?? ""}`.toLowerCase().includes(keyword));

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">QUẢN TRỊ HỆ THỐNG</p>
          <h1>Quản lý tài khoản</h1>
          <p className="muted">Theo dõi, tạo mới và quản lý quyền truy cập người dùng hệ thống.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="primary" onClick={() => { setShowCreateForm(!showCreateForm); setEditingUser(null); }}>
            {showCreateForm ? "Đóng biểu mẫu" : "+ Thêm tài khoản"}
          </button>
          <button className="secondary" onClick={reload} disabled={loading || busyId !== null}>
            Tải lại
          </button>
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {success && (
        <div className="panel" style={{ background: "#f0f8e8", borderColor: "#c2e0aa", color: "#365c1a", marginBottom: "16px", padding: "12px 18px" }}>
          {success}
        </div>
      )}

      {showCreateForm && (
        <form className="panel create-form" onSubmit={handleCreateUser} style={{ marginBottom: "24px" }}>
          <h2>Thêm tài khoản mới</h2>
          <label htmlFor="create-email">Địa chỉ Email</label>
          <input id="create-email" name="email" type="email" required maxLength={180} placeholder="user@lms.local" />

          <label htmlFor="create-password">Mật khẩu ban đầu</label>
          <input id="create-password" name="password" type="password" required minLength={6} maxLength={100} placeholder="Tối thiểu 6 ký tự" />

          <label htmlFor="create-fullName">Họ và tên</label>
          <input id="create-fullName" name="fullName" required maxLength={120} placeholder="Ví dụ: Nguyễn Văn A" />

          <label htmlFor="create-role">Vai trò</label>
          <select id="create-role" name="role" value={createRole} onChange={e => setCreateRole(e.target.value as Role)}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: "3px" }}>
            <option value="STUDENT">Sinh viên (STUDENT)</option>
            <option value="TEACHER">Giảng viên (TEACHER)</option>
            <option value="ADMIN">Quản trị viên (ADMIN)</option>
          </select>

          {createRole === "STUDENT" && (
            <>
              <label htmlFor="create-studentCode">Mã sinh viên</label>
              <input id="create-studentCode" name="studentCode" maxLength={30} placeholder="Ví dụ: SV003" />
            </>
          )}

          <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
            <button className="primary" type="submit" disabled={saving}>
              {saving ? "Đang lưu…" : "Tạo tài khoản"}
            </button>
            <button className="secondary" type="button" onClick={() => setShowCreateForm(false)}>
              Hủy
            </button>
          </div>
        </form>
      )}

      {editingUser && (
        <form className="panel create-form" onSubmit={handleUpdateUser} style={{ marginBottom: "24px", borderColor: "var(--orange)" }}>
          <h2>Chỉnh sửa tài khoản: {editingUser.email}</h2>

          <label htmlFor="edit-fullName">Họ và tên</label>
          <input id="edit-fullName" name="fullName" defaultValue={editingUser.fullName} required maxLength={120} />

          <label htmlFor="edit-role">Vai trò</label>
          <select id="edit-role" name="role" defaultValue={editingUser.role}
            disabled={editingUser.id === currentUser.id}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: "3px" }}>
            <option value="STUDENT">Sinh viên (STUDENT)</option>
            <option value="TEACHER">Giảng viên (TEACHER)</option>
            <option value="ADMIN">Quản trị viên (ADMIN)</option>
          </select>
          {editingUser.id === currentUser.id && <small>Không thể tự thay đổi vai trò quản trị viên của bạn.</small>}

          <label htmlFor="edit-studentCode">Mã sinh viên</label>
          <input id="edit-studentCode" name="studentCode" defaultValue={editingUser.studentCode ?? ""} maxLength={30} />

          <label htmlFor="edit-enabled">Trạng thái hoạt động</label>
          <select id="edit-enabled" name="enabled" defaultValue={editingUser.enabled ? "true" : "false"}
            disabled={editingUser.id === currentUser.id}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: "3px" }}>
            <option value="true">Hoạt động (Enabled)</option>
            <option value="false">Khóa tài khoản (Disabled)</option>
          </select>
          {editingUser.id === currentUser.id && <small>Không thể tự khóa tài khoản hiện tại.</small>}

          <label htmlFor="edit-password">Đổi mật khẩu mới (để trống nếu giữ nguyên)</label>
          <input id="edit-password" name="password" type="password" minLength={6} maxLength={100} placeholder="Nhập nếu muốn đổi mật khẩu mới" />

          <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
            <button className="primary" type="submit" disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
            <button className="secondary" type="button" onClick={() => setEditingUser(null)}>
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Thanh tìm kiếm và bộ lọc tài khoản */}
      <div className="course-toolbar" style={{ marginBottom: "16px" }}>
        <div className="course-filters">
          <label className="sr-only" htmlFor="user-role-filter">Lọc theo vai trò</label>
          <select id="user-role-filter" className="green-select" value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as RoleFilter)}>
            <option value="ALL">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên</option>
            <option value="TEACHER">Giảng viên</option>
            <option value="STUDENT">Sinh viên</option>
          </select>

          <label className="sr-only" htmlFor="user-status-filter">Lọc theo trạng thái</label>
          <select id="user-status-filter" className="green-select" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="DISABLED">Đã khóa</option>
          </select>

          <div className="search-field">
            <label className="sr-only" htmlFor="user-search">Tìm kiếm tài khoản</label>
            <input id="user-search" type="search" placeholder="Tìm theo tên, email, mã SV…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <p className="results-count" aria-live="polite">
        {loading ? "Đang tải tài khoản…" : `Hiển thị ${visibleUsers.length} / ${users.length} tài khoản`}
      </p>

      {loading ? (
        <p className="panel" role="status">Đang tải danh sách tài khoản…</p>
      ) : users.length === 0 ? (
        <div className="empty"><p>Chưa có tài khoản nào trong hệ thống.</p></div>
      ) : visibleUsers.length === 0 ? (
        <div className="empty">
          <h2>Không tìm thấy tài khoản</h2>
          <p className="muted">Thử từ khóa hoặc bộ lọc khác.</p>
          <button className="secondary" onClick={clearFilters}>Xóa bộ lọc</button>
        </div>
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Họ tên / Email</th>
                <th>Mã SV</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.fullName}</strong>
                    <small>{user.email}</small>
                  </td>
                  <td>{user.studentCode ?? "—"}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: user.role === "ADMIN" ? "var(--orange-dark)" : user.role === "TEACHER" ? "var(--green)" : "var(--ink)" }}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={user.enabled ? "pill" : "pill disabled"}>
                      {user.enabled ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="secondary" style={{ padding: "4px 8px", fontSize: "12px" }}
                        onClick={() => { setEditingUser(user); setShowCreateForm(false); }}>
                        Sửa
                      </button>
                      {user.id === currentUser.id ? (
                        <span className="muted" style={{ fontSize: "12px", alignSelf: "center" }}>Tài khoản của bạn</span>
                      ) : (
                        <button className="secondary" style={{ padding: "4px 8px", fontSize: "12px" }}
                          disabled={busyId !== null} onClick={() => toggleUser(user)}>
                          {busyId === user.id ? "Đang lưu…" : user.enabled ? "Khóa" : "Mở khóa"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
