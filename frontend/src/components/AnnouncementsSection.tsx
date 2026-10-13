"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, errorMessage, isSessionError } from "@/lib/api";
import type { Announcement, User } from "@/lib/types";

export default function AnnouncementsSection({
  courseId,
  user,
  onSessionExpired,
}: {
  courseId: number;
  user: User;
  onSessionExpired: () => void;
}) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api<Announcement[]>(`/courses/${courseId}/announcements`)
      .then(data => { if (active) setAnnouncements(data); })
      .catch(err => {
        if (!active) return;
        if (isSessionError(err)) onSessionExpired();
        else setError(errorMessage(err));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId, onSessionExpired]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const created = await api<Announcement>(`/courses/${courseId}/announcements`, {
        method: "POST",
        body: JSON.stringify({
          title: String(data.get("title")).trim(),
          content: String(data.get("content")).trim(),
        }),
      });
      setAnnouncements(prev => [created, ...prev]);
      setShowCreateForm(false);
      form.reset();
      setSuccess("Đã đăng thông báo mới thành công.");
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Bạn có chắc chắn muốn xóa thông báo này?")) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api<void>(`/announcements/${id}`, { method: "DELETE" });
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      setSuccess("Đã xóa thông báo.");
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ margin: 0 }}>Thông báo khóa học ({announcements.length})</h3>
        {user.role === "TEACHER" && (
          <button
            className="primary"
            style={{ fontSize: "12px" }}
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? "Đóng biểu mẫu" : "+ Đăng thông báo mới"}
          </button>
        )}
      </div>

      {success && (
        <div className="panel" style={{ background: "#f0f8e8", borderColor: "#c2e0aa", color: "#365c1a", marginBottom: "14px", padding: "10px 16px" }}>
          {success}
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}

      {showCreateForm && user.role === "TEACHER" && (
        <form className="panel create-form" onSubmit={handleCreate} style={{ marginBottom: "20px" }}>
          <h4>Tạo thông báo mới</h4>
          <label htmlFor="ann-title">Tiêu đề thông báo</label>
          <input id="ann-title" name="title" required maxLength={200} placeholder="Ví dụ: Lịch kiểm tra giữa kỳ..." />
          <label htmlFor="ann-content">Nội dung thông báo</label>
          <textarea id="ann-content" name="content" required rows={4} placeholder="Nội dung thông báo chi tiết..." />
          <div style={{ marginTop: "14px", display: "flex", gap: "10px" }}>
            <button className="primary" disabled={busy}>{busy ? "Đang gửi…" : "Đăng thông báo"}</button>
            <button className="secondary" type="button" onClick={() => setShowCreateForm(false)}>Hủy</button>
          </div>
        </form>
      )}

      {loading ? (
        <p role="status">Đang tải thông báo…</p>
      ) : announcements.length === 0 ? (
        <p className="muted">Khóa học hiện chưa có thông báo nào.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {announcements.map(a => (
            <article key={a.id} className="panel" style={{ background: "#fff", borderLeft: "4px solid var(--orange)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: "16px" }}>{a.title}</h4>
                  <p className="muted" style={{ margin: "0 0 10px", fontSize: "12px" }}>
                    Người đăng: <strong>{a.authorName}</strong> · {new Date(a.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
                {user.role === "TEACHER" && (
                  <button
                    className="secondary"
                    style={{ fontSize: "11px", color: "#9b3330", padding: "3px 8px" }}
                    disabled={busy}
                    onClick={() => handleDelete(a.id)}
                  >
                    Xóa
                  </button>
                )}
              </div>
              <p style={{ margin: 0, whiteSpace: "pre-line", lineHeight: 1.6 }}>{a.content}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
