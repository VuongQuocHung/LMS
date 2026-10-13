"use client";

import { useEffect, useState } from "react";
import { api, errorMessage, isSessionError } from "@/lib/api";
import type { Gradebook, User } from "@/lib/types";

export default function GradebookSection({
  courseId,
  user,
  onSessionExpired,
}: {
  courseId: number;
  user: User;
  onSessionExpired: () => void;
}) {
  const [gradebook, setGradebook] = useState<Gradebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    api<Gradebook>(`/courses/${courseId}/gradebook`)
      .then(data => { if (active) setGradebook(data); })
      .catch(err => {
        if (!active) return;
        if (isSessionError(err)) onSessionExpired();
        else setError(errorMessage(err));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId, onSessionExpired]);

  const entries = gradebook?.entries || [];
  const assignments = gradebook?.assignments || [];
  const keyword = search.trim().toLocaleLowerCase("vi");
  const filteredEntries = entries.filter(e =>
    `${e.studentName} ${e.studentEmail ?? ""} ${e.studentCode ?? ""}`.toLocaleLowerCase("vi").includes(keyword)
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0 }}>Sổ điểm khóa học</h3>
        {user.role === "TEACHER" && entries.length > 0 && (
          <div className="search-field" style={{ flex: "1 1 240px", maxWidth: "320px" }}>
            <input
              type="search"
              placeholder="Tìm kiếm sinh viên…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {loading ? (
        <p role="status">Đang tải sổ điểm…</p>
      ) : assignments.length === 0 ? (
        <p className="muted">Khóa học chưa có bài tập nào để ghi nhận điểm.</p>
      ) : entries.length === 0 ? (
        <p className="muted">Chưa có sinh viên nào ghi danh trong khóa học.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sinh viên</th>
                {assignments.map(a => (
                  <th key={a.id} style={{ textAlign: "center", minWidth: "120px" }}>
                    <div>{a.title}</div>
                    <small className="muted">{a.type === "QUIZ" ? "Trắc nghiệm" : "Tự luận"} (Tối đa {a.maxScore}đ)</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(entry => (
                <tr key={entry.studentId}>
                  <td>
                    <strong>{entry.studentName}</strong>
                    {entry.studentCode && <small style={{ display: "block" }}>Mã SV: {entry.studentCode}</small>}
                  </td>
                  {assignments.map(a => {
                    const scoreItem = entry.scores[a.id];
                    if (!scoreItem) {
                      return (
                        <td key={a.id} style={{ textAlign: "center", color: "#8c96a0", fontSize: "12px" }}>
                          Chưa nộp
                        </td>
                      );
                    }
                    if (scoreItem.status === "SUBMITTED") {
                      return (
                        <td key={a.id} style={{ textAlign: "center" }}>
                          <span className="pill" style={{ background: "#fef3c7", color: "#92400e", fontSize: "11px" }}>
                            Chờ chấm
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td key={a.id} style={{ textAlign: "center", fontWeight: "bold" }}>
                        <span style={{ color: scoreItem.score !== null && scoreItem.score >= 5 ? "#166534" : "#991b1b" }}>
                          {scoreItem.score !== null ? `${scoreItem.score} / ${scoreItem.maxScore}` : "—"}
                        </span>
                        {scoreItem.status === "LATE" && (
                          <small style={{ display: "block", color: "#b45309", fontSize: "10px" }}>Nộp trễ</small>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
