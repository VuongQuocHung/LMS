"use client";

import { useEffect, useState } from "react";
import { api, errorMessage, isSessionError } from "@/lib/api";
import type { ScheduleView } from "@/lib/types";

export default function ScheduleModal({
  onClose,
  onSessionExpired,
}: {
  onClose: () => void;
  onSessionExpired: () => void;
}) {
  const [schedule, setSchedule] = useState<ScheduleView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    let active = true;
    api<ScheduleView>("/schedule")
      .then(data => { if (active) setSchedule(data); })
      .catch(err => {
        if (!active) return;
        if (isSessionError(err)) onSessionExpired();
        else setError(errorMessage(err));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [onSessionExpired]);

  const items = tab === "upcoming" ? schedule?.upcoming || [] : schedule?.past || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <div
        className="panel"
        style={{
          background: "#fff",
          maxWidth: "760px",
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "24px",
          borderRadius: "8px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0 }}>Lịch học & Hạn nộp bài tập</h3>
          <button className="secondary" onClick={onClose}>Đóng</button>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--border)", marginBottom: "16px" }}>
          <button
            style={{
              background: "none", border: "none", padding: "8px 16px",
              fontWeight: tab === "upcoming" ? 700 : 500,
              color: tab === "upcoming" ? "var(--orange)" : "inherit",
              borderBottom: tab === "upcoming" ? "3px solid var(--orange)" : "3px solid transparent",
              cursor: "pointer",
            }}
            onClick={() => setTab("upcoming")}
          >
            Sắp đến hạn ({schedule?.upcoming.length ?? 0})
          </button>
          <button
            style={{
              background: "none", border: "none", padding: "8px 16px",
              fontWeight: tab === "past" ? 700 : 500,
              color: tab === "past" ? "var(--orange)" : "inherit",
              borderBottom: tab === "past" ? "3px solid var(--orange)" : "3px solid transparent",
              cursor: "pointer",
            }}
            onClick={() => setTab("past")}
          >
            Đã qua hạn ({schedule?.past.length ?? 0})
          </button>
        </div>

        {loading ? (
          <p role="status">Đang tải lịch học…</p>
        ) : items.length === 0 ? (
          <p className="muted">Không có bài tập nào trong mục này.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {items.map(item => (
              <div
                key={item.assignmentId}
                className="panel"
                style={{
                  background: "#fcfaf6",
                  borderLeft: item.type === "QUIZ" ? "4px solid #0284c7" : "4px solid #e66f23",
                  padding: "12px 16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "15px" }}>{item.title}</strong>
                      <span className="pill" style={{ fontSize: "10px" }}>
                        {item.type === "QUIZ" ? "Trắc nghiệm" : "Tự luận"}
                      </span>
                    </div>
                    <p className="muted" style={{ margin: "4px 0 0", fontSize: "12px" }}>
                      Khóa học: <strong>{item.courseTitle}</strong>
                    </p>
                    <p className="muted" style={{ margin: "2px 0 0", fontSize: "12px" }}>
                      {item.dueAt ? `Hạn nộp: ${new Date(item.dueAt).toLocaleString("vi-VN")}` : "Không giới hạn thời gian"}
                    </p>
                  </div>
                  <div>
                    {item.submitted ? (
                      <span className="pill" style={{ background: "#dcfce7", color: "#166534" }}>
                        {item.score !== null ? `Đã có điểm: ${item.score}/${item.maxScore}` : "Đã nộp bài"}
                      </span>
                    ) : (
                      <span className="pill disabled">Chưa nộp bài</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
