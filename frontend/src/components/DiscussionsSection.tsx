"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, errorMessage, isSessionError } from "@/lib/api";
import type { DiscussionTopic, DiscussionPost, User } from "@/lib/types";

export default function DiscussionsSection({
  courseId,
  user,
  onSessionExpired,
}: {
  courseId: number;
  user: User;
  onSessionExpired: () => void;
}) {
  const [topics, setTopics] = useState<DiscussionTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<DiscussionTopic | null>(null);
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreateTopicForm, setShowCreateTopicForm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api<DiscussionTopic[]>(`/courses/${courseId}/discussions`)
      .then(data => { if (active) setTopics(data); })
      .catch(err => {
        if (!active) return;
        if (isSessionError(err)) onSessionExpired();
        else setError(errorMessage(err));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId, onSessionExpired]);

  async function openTopic(topic: DiscussionTopic) {
    setSelectedTopic(topic);
    setDetailLoading(true);
    setError("");
    try {
      const data = await api<{ posts: DiscussionPost[] }>(`/discussions/${topic.id}`);
      setPosts(data.posts || []);
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setError(errorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleCreateTopic(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const created = await api<DiscussionTopic>(`/courses/${courseId}/discussions`, {
        method: "POST",
        body: JSON.stringify({
          title: String(data.get("title")).trim(),
          content: String(data.get("content")).trim(),
        }),
      });
      setTopics(prev => [created, ...prev]);
      setShowCreateTopicForm(false);
      form.reset();
      setSuccess("Đã tạo chủ đề thảo luận mới.");
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePost(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedTopic) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const content = String(data.get("content")).trim();
    if (!content) return;
    setBusy(true);
    setError("");
    try {
      const post = await api<DiscussionPost>(`/discussions/${selectedTopic.id}/posts`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setPosts(prev => [...prev, post]);
      setTopics(prev => prev.map(t => t.id === selectedTopic.id ? { ...t, replyCount: t.replyCount + 1 } : t));
      form.reset();
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTopic(topicId: number) {
    if (!window.confirm("Bạn có chắc chắn muốn xóa chủ đề thảo luận này?")) return;
    setBusy(true);
    setError("");
    try {
      await api<void>(`/discussions/${topicId}`, { method: "DELETE" });
      setTopics(prev => prev.filter(t => t.id !== topicId));
      if (selectedTopic?.id === topicId) {
        setSelectedTopic(null);
      }
      setSuccess("Đã xóa chủ đề.");
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeletePost(postId: number) {
    if (!window.confirm("Xóa phản hồi này?")) return;
    setBusy(true);
    setError("");
    try {
      await api<void>(`/posts/${postId}`, { method: "DELETE" });
      setPosts(prev => prev.filter(p => p.id !== postId));
      if (selectedTopic) {
        setTopics(prev => prev.map(t => t.id === selectedTopic.id ? { ...t, replyCount: Math.max(0, t.replyCount - 1) } : t));
      }
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Khi chưa chọn chủ đề: hiển thị danh sách chủ đề */}
      {!selectedTopic ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0 }}>Diễn đàn thảo luận ({topics.length})</h3>
            <button
              className="primary"
              style={{ fontSize: "12px" }}
              onClick={() => setShowCreateTopicForm(!showCreateTopicForm)}
            >
              {showCreateTopicForm ? "Đóng biểu mẫu" : "+ Tạo chủ đề mới"}
            </button>
          </div>

          {success && (
            <div className="panel" style={{ background: "#f0f8e8", borderColor: "#c2e0aa", color: "#365c1a", marginBottom: "14px", padding: "10px 16px" }}>
              {success}
            </div>
          )}
          {error && <p className="error" role="alert">{error}</p>}

          {showCreateTopicForm && (
            <form className="panel create-form" onSubmit={handleCreateTopic} style={{ marginBottom: "20px" }}>
              <h4>Tạo chủ đề thảo luận mới</h4>
              <label htmlFor="topic-title">Tiêu đề chủ đề</label>
              <input id="topic-title" name="title" required maxLength={200} placeholder="Ví dụ: Thảo luận bài tập chương 2..." />
              <label htmlFor="topic-content">Nội dung câu hỏi / trao đổi</label>
              <textarea id="topic-content" name="content" required rows={4} placeholder="Nêu rõ câu hỏi hoặc vấn đề cần trao đổi..." />
              <div style={{ marginTop: "14px", display: "flex", gap: "10px" }}>
                <button className="primary" disabled={busy}>{busy ? "Đang gửi…" : "Đăng chủ đề"}</button>
                <button className="secondary" type="button" onClick={() => setShowCreateTopicForm(false)}>Hủy</button>
              </div>
            </form>
          )}

          {loading ? (
            <p role="status">Đang tải chủ đề thảo luận…</p>
          ) : topics.length === 0 ? (
            <p className="muted">Chưa có chủ đề thảo luận nào. Bạn có thể tạo chủ đề đầu tiên.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {topics.map(t => (
                <div
                  key={t.id}
                  className="panel"
                  style={{
                    background: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    padding: "14px 18px",
                  }}
                  onClick={() => openTopic(t)}
                >
                  <div>
                    <h4 style={{ margin: "0 0 4px", fontSize: "15px", color: "var(--orange)" }}>{t.title}</h4>
                    <p className="muted" style={{ margin: 0, fontSize: "12px" }}>
                      Tác giả: <strong>{t.authorName}</strong> · {new Date(t.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span className="pill" style={{ fontSize: "11px" }}>{t.replyCount} phản hồi</span>
                    {(t.authorId === user.id || user.role === "TEACHER") && (
                      <button
                        className="secondary"
                        style={{ fontSize: "11px", color: "#9b3330", padding: "3px 8px" }}
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteTopic(t.id);
                        }}
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Khi đang xem chi tiết một chủ đề */
        <div>
          <button
            className="secondary"
            style={{ fontSize: "12px", marginBottom: "16px" }}
            onClick={() => setSelectedTopic(null)}
          >
            ← Quay lại danh sách chủ đề
          </button>

          <article className="panel" style={{ background: "#fff", borderLeft: "4px solid var(--orange)", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: "0 0 6px" }}>{selectedTopic.title}</h3>
                <p className="muted" style={{ margin: "0 0 12px", fontSize: "12px" }}>
                  Người tạo: <strong>{selectedTopic.authorName}</strong> · {new Date(selectedTopic.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              {(selectedTopic.authorId === user.id || user.role === "TEACHER") && (
                <button
                  className="secondary"
                  style={{ fontSize: "11px", color: "#9b3330", padding: "3px 8px" }}
                  onClick={() => handleDeleteTopic(selectedTopic.id)}
                >
                  Xóa chủ đề
                </button>
              )}
            </div>
            <p style={{ margin: 0, whiteSpace: "pre-line", lineHeight: 1.6 }}>{selectedTopic.content}</p>
          </article>

          <h4 style={{ margin: "20px 0 12px" }}>Các phản hồi ({posts.length})</h4>

          {detailLoading ? (
            <p role="status">Đang tải phản hồi…</p>
          ) : posts.length === 0 ? (
            <p className="muted">Chưa có phản hồi nào. Hãy là người đầu tiên trả lời!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {posts.map(p => (
                <div key={p.id} className="panel" style={{ background: "#fcfaf6", padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px" }}>
                      <strong>{p.authorName}</strong>
                      <span className="muted" style={{ marginLeft: "8px", fontSize: "11px" }}>
                        {new Date(p.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </span>
                    {(p.authorId === user.id || user.role === "TEACHER") && (
                      <button
                        className="secondary"
                        style={{ fontSize: "10px", color: "#9b3330", padding: "2px 6px" }}
                        onClick={() => handleDeletePost(p.id)}
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                  <p style={{ margin: 0, whiteSpace: "pre-line", fontSize: "14px" }}>{p.content}</p>
                </div>
              ))}
            </div>
          )}

          <form className="panel" onSubmit={handleCreatePost} style={{ background: "#fff" }}>
            <h4>Gửi phản hồi</h4>
            <label htmlFor="reply-content" className="sr-only">Nội dung phản hồi</label>
            <textarea
              id="reply-content"
              name="content"
              required
              rows={3}
              placeholder="Nhập nội dung phản hồi của bạn…"
            />
            <div style={{ marginTop: "10px" }}>
              <button className="primary" disabled={busy}>
                {busy ? "Đang gửi…" : "Gửi phản hồi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
