"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { api, errorMessage, isSessionError } from "@/lib/api";
import type {
  Assignment,
  AssignmentType,
  AssignmentStatus,
  User,
} from "@/lib/types";

export default function AssignmentsSection({
  courseId,
  user,
  onSessionExpired,
}: {
  courseId: number;
  user: User;
  onSessionExpired: () => void;
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  // Form tạo nhanh / sửa bài tập
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [createType, setCreateType] = useState<AssignmentType>("QUIZ");

  // Tải danh sách bài tập
  useEffect(() => {
    let active = true;
    api<Assignment[]>(`/courses/${courseId}/assignments`)
      .then(data => { if (active) setAssignments(data); })
      .catch(err => {
        if (!active) return;
        if (isSessionError(err)) onSessionExpired();
        else setError(errorMessage(err));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId, onSessionExpired]);

  // ==================== TẠO / SỬA / XÓA BÀI TẬP ====================

  async function handleSaveAssignment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        title: String(data.get("title")).trim(),
        description: String(data.get("description")).trim(),
        type: editingAssignment ? editingAssignment.type : createType,
        openAt: data.get("openAt") ? new Date(String(data.get("openAt"))).toISOString() : null,
        dueAt: data.get("dueAt") ? new Date(String(data.get("dueAt"))).toISOString() : null,
        maxScore: Number(data.get("maxScore")) || 10,
        status: (data.get("status") as AssignmentStatus) || "DRAFT",
      };

      if (editingAssignment) {
        const updated = await api<Assignment>(`/assignments/${editingAssignment.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setAssignments(prev => prev.map(a => a.id === updated.id ? updated : a));
        setEditingAssignment(null);
        setSuccess("Đã cập nhật bài tập thành công.");
      } else {
        const created = await api<Assignment>(`/courses/${courseId}/assignments`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setAssignments(prev => [created, ...prev]);
        setShowCreateForm(false);
        form.reset();
        setSuccess("Đã tạo bài tập mới thành công.");
      }
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAssignment(id: number) {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài tập này cùng toàn bộ câu hỏi và bài nộp liên quan?")) return;
    setBusy(true);
    setError("");
    try {
      await api<void>(`/assignments/${id}`, { method: "DELETE" });
      setAssignments(prev => prev.filter(a => a.id !== id));
      setSuccess("Đã xóa bài tập thành công.");
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0 }}>Danh sách bài tập & Đánh giá ({assignments.length})</h3>
        {user.role === "TEACHER" && (
          <div style={{ display: "flex", gap: "8px" }}>
            <Link
              href={`/courses/${courseId}/assignments/new`}
              className="primary"
              style={{ fontSize: "12px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
            >
              + Giao bài tập mới (Trình tạo bài)
            </Link>
            <button
              className="secondary"
              style={{ fontSize: "12px" }}
              onClick={() => {
                setEditingAssignment(null);
                setShowCreateForm(!showCreateForm);
              }}
            >
              {showCreateForm ? "Đóng tạo nhanh" : "Tạo nhanh"}
            </button>
          </div>
        )}
      </div>

      {success && (
        <div className="panel" style={{ background: "#f0f8e8", borderColor: "#c2e0aa", color: "#365c1a", marginBottom: "14px", padding: "10px 16px" }}>
          {success}
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}

      {/* Form tạo nhanh hoặc sửa bài tập */}
      {(showCreateForm || editingAssignment) && user.role === "TEACHER" && (
        <form className="panel create-form" onSubmit={handleSaveAssignment} style={{ marginBottom: "20px" }}>
          <h4>{editingAssignment ? `Chỉnh sửa bài tập: ${editingAssignment.title}` : "Tạo nhanh bài tập mới"}</h4>

          {!editingAssignment && (
            <div style={{ marginBottom: "12px" }}>
              <label>Loại bài tập</label>
              <div style={{ display: "flex", gap: "20px", marginTop: "6px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="type"
                    value="QUIZ"
                    checked={createType === "QUIZ"}
                    onChange={() => setCreateType("QUIZ")}
                  />
                  <span>Trắc nghiệm (Hệ thống tự chấm theo đáp án)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="type"
                    value="ESSAY"
                    checked={createType === "ESSAY"}
                    onChange={() => setCreateType("ESSAY")}
                  />
                  <span>Bài viết tự luận (Giảng viên chấm và phản hồi)</span>
                </label>
              </div>
            </div>
          )}

          <label htmlFor="assign-title">Tên bài tập</label>
          <input
            id="assign-title"
            name="title"
            required
            maxLength={200}
            defaultValue={editingAssignment?.title ?? ""}
            placeholder="Ví dụ: Kiểm tra trắc nghiệm chương 1..."
          />

          <label htmlFor="assign-desc">Mô tả và hướng dẫn làm bài</label>
          <textarea
            id="assign-desc"
            name="description"
            required
            rows={3}
            defaultValue={editingAssignment?.description ?? ""}
            placeholder="Nêu rõ yêu cầu, phạm vi kiến thức..."
          />

          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "12px" }}>
            <div style={{ flex: 1, minWidth: "160px" }}>
              <label htmlFor="assign-maxscore">Điểm tối đa</label>
              <input
                id="assign-maxscore"
                name="maxScore"
                type="number"
                step="0.5"
                defaultValue={editingAssignment?.maxScore ?? 10}
                required
              />
            </div>
            <div style={{ flex: 1, minWidth: "160px" }}>
              <label htmlFor="assign-status">Trạng thái</label>
              <select id="assign-status" name="status" defaultValue={editingAssignment?.status ?? "PUBLISHED"}>
                <option value="PUBLISHED">Công bố ngay</option>
                <option value="DRAFT">Lưu bản nháp</option>
                <option value="ARCHIVED">Lưu trữ</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
            <button className="primary" disabled={busy}>
              {busy ? "Đang lưu…" : editingAssignment ? "Lưu thay đổi" : "Tạo bài tập"}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setEditingAssignment(null);
              }}
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Danh sách bài tập */}
      {loading ? (
        <p role="status">Đang tải danh sách bài tập…</p>
      ) : assignments.length === 0 ? (
        <p className="muted">Khóa học hiện chưa có bài tập nào.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {assignments.map(a => (
            <div
              key={a.id}
              className="panel"
              style={{
                background: "#fff",
                borderLeft: a.type === "QUIZ" ? "4px solid #0284c7" : "4px solid #e66f23",
                padding: "16px 20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <h4 style={{ margin: 0, fontSize: "16px" }}>
                      <Link href={`/courses/${courseId}/assignments/${a.id}`} style={{ color: "var(--ink)", textDecoration: "none" }}>
                        {a.title}
                      </Link>
                    </h4>
                    <span className="pill" style={{ background: a.type === "QUIZ" ? "#e0f2fe" : "#ffedd5", color: a.type === "QUIZ" ? "#0369a1" : "#c2410c", fontSize: "11px" }}>
                      {a.type === "QUIZ" ? "Trắc nghiệm" : "Tự luận"}
                    </span>
                    {user.role === "TEACHER" && (
                      <span className={`pill ${a.status === "PUBLISHED" ? "" : "disabled"}`} style={{ fontSize: "11px" }}>
                        {a.status === "PUBLISHED" ? "Đã công bố" : a.status === "DRAFT" ? "Bản nháp" : "Lưu trữ"}
                      </span>
                    )}
                  </div>
                  <p className="muted" style={{ margin: "6px 0 0", fontSize: "13px" }}>{a.description}</p>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: "12px" }}>
                    Thang điểm: <strong>{a.maxScore}đ</strong>
                    {a.dueAt && ` · Hạn nộp: ${new Date(a.dueAt).toLocaleString("vi-VN")}`}
                  </p>
                </div>

                {/* Các nút hành động */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {user.role === "TEACHER" ? (
                    <>
                      <Link
                        href={`/courses/${courseId}/assignments/${a.id}/submissions`}
                        className="primary"
                        style={{ fontSize: "12px", textDecoration: "none" }}
                      >
                        Chấm bài ({a.submissionCount ?? 0})
                      </Link>
                      <Link
                        href={`/courses/${courseId}/assignments/${a.id}`}
                        className="secondary"
                        style={{ fontSize: "12px", textDecoration: "none" }}
                      >
                        {a.type === "QUIZ" ? "Soạn câu hỏi" : "Chi tiết đề"}
                      </Link>
                      <button
                        className="secondary"
                        style={{ fontSize: "12px" }}
                        onClick={() => {
                          setEditingAssignment(a);
                          setShowCreateForm(false);
                        }}
                      >
                        Sửa
                      </button>
                      <button
                        className="secondary"
                        style={{ fontSize: "12px", color: "#9b3330" }}
                        disabled={busy}
                        onClick={() => handleDeleteAssignment(a.id)}
                      >
                        Xóa
                      </button>
                    </>
                  ) : (
                    /* Dành cho Sinh viên */
                    <>
                      {a.mySubmitted ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "13px", fontWeight: "bold" }}>
                            {a.myScore !== null && a.myScore !== undefined ? (
                              <span style={{ color: a.myScore >= 5 ? "#166534" : "#991b1b" }}>
                                Điểm: {a.myScore} / {a.maxScore}
                              </span>
                            ) : (
                              <span className="pill" style={{ background: "#fef3c7", color: "#92400e" }}>
                                Chờ chấm điểm
                              </span>
                            )}
                          </span>
                          <Link
                            href={`/courses/${courseId}/assignments/${a.id}`}
                            className="secondary"
                            style={{ fontSize: "12px", textDecoration: "none" }}
                          >
                            Xem bài đã nộp →
                          </Link>
                        </div>
                      ) : (
                        <Link
                          href={`/courses/${courseId}/assignments/${a.id}`}
                          className="primary"
                          style={{ fontSize: "12px", textDecoration: "none" }}
                        >
                          {a.type === "QUIZ" ? "Làm bài trắc nghiệm →" : "Nộp bài tự luận →"}
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
