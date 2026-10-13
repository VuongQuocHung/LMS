"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorMessage, isSessionError } from "@/lib/api";
import type { Assignment, CourseDetail, Submission, User } from "@/lib/types";
import PortalShell from "@/components/PortalShell";

type SubmissionFilter = "ALL" | "PENDING" | "GRADED";

export default function SubmissionsGradingPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = Number(resolvedParams.courseId);
  const assignmentId = Number(resolvedParams.assignmentId);

  return (
    <PortalShell>
      {user => <GradingWorkbench courseId={courseId} assignmentId={assignmentId} user={user} />}
    </PortalShell>
  );
}

function GradingWorkbench({
  courseId,
  assignmentId,
  user,
}: {
  courseId: number;
  assignmentId: number;
  user: User;
}) {
  const router = useRouter();
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter
  const [filter, setFilter] = useState<SubmissionFilter>("ALL");

  // Selected student for grading
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [scoreInput, setScoreInput] = useState<number>(10);
  const [feedbackInput, setFeedbackInput] = useState<string>("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [cData, aData, sData] = await Promise.all([
          api<CourseDetail>(`/courses/${courseId}`),
          api<Assignment>(`/assignments/${assignmentId}`),
          api<Submission[]>(`/assignments/${assignmentId}/submissions`),
        ]);

        if (!active) return;
        setCourseDetail(cData);
        setAssignment(aData);
        setSubmissions(sData);

        if (sData.length > 0) {
          setSelectedIndex(0);
          setScoreInput(sData[0].score ?? aData.maxScore);
          setFeedbackInput(sData[0].feedback ?? "");
        }
      } catch (err) {
        if (!active) return;
        if (isSessionError(err)) {
          router.push("/");
        } else {
          setError(errorMessage(err));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [courseId, assignmentId, router]);

  // Khi chọn sinh viên khác trong danh sách
  function handleSelectSubmission(idx: number) {
    if (idx < 0 || idx >= filteredSubmissions.length) return;
    setSelectedIndex(idx);
    const sub = filteredSubmissions[idx];
    setScoreInput(sub.score ?? (assignment?.maxScore ?? 10));
    setFeedbackInput(sub.feedback ?? "");
    setSuccess("");
    setError("");
  }

  // Lưu điểm
  async function handleSaveGrade(andNext: boolean = false) {
    const currentSub = filteredSubmissions[selectedIndex];
    if (!currentSub || !assignment) return;

    if (scoreInput < 0 || scoreInput > assignment.maxScore) {
      alert(`Điểm số phải nằm trong khoảng từ 0 đến ${assignment.maxScore}`);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await api<Submission>(`/submissions/${currentSub.id}/grade`, {
        method: "PUT",
        body: JSON.stringify({
          score: Number(scoreInput),
          feedback: feedbackInput.trim(),
        }),
      });

      setSubmissions(prev => prev.map(s => s.id === updated.id ? updated : s));
      setSuccess(`Đã lưu điểm (${updated.score}đ) cho sinh viên ${updated.studentName}!`);

      if (andNext && selectedIndex < filteredSubmissions.length - 1) {
        const nextIdx = selectedIndex + 1;
        setSelectedIndex(nextIdx);
        const nextSub = filteredSubmissions[nextIdx];
        setScoreInput(nextSub.score ?? (assignment?.maxScore ?? 10));
        setFeedbackInput(nextSub.feedback ?? "");
      }
    } catch (err) {
      if (isSessionError(err)) router.push("/");
      else setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="empty" role="status">Đang tải bàn chấm điểm…</div>;
  }

  if (user.role !== "TEACHER") {
    return (
      <div className="empty">
        <h2>Không có quyền truy cập</h2>
        <p className="muted">Chỉ giảng viên mới có quyền xem bài nộp và chấm điểm.</p>
        <Link href={`/courses/${courseId}/assignments/${assignmentId}`} className="primary" style={{ display: "inline-block", marginTop: "12px" }}>
          ← Quay lại bài tập
        </Link>
      </div>
    );
  }

  if (error && (!assignment || !courseDetail)) {
    return (
      <div className="empty">
        <h2>Lỗi tải dữ liệu</h2>
        <p className="error" role="alert">{error}</p>
        <Link href={`/courses/${courseId}`} className="primary" style={{ display: "inline-block", marginTop: "12px" }}>
          ← Quay lại khóa học
        </Link>
      </div>
    );
  }

  const course = courseDetail!.course;
  const assign = assignment!;

  // Danh sách bài nộp sau lọc
  const filteredSubmissions = submissions.filter(s => {
    if (filter === "PENDING") return s.status !== "GRADED";
    if (filter === "GRADED") return s.status === "GRADED";
    return true;
  });

  const gradedCount = submissions.filter(s => s.status === "GRADED").length;
  const pendingCount = submissions.length - gradedCount;
  const currentSub: Submission | undefined = filteredSubmissions[selectedIndex];

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header điều hướng */}
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <Link href={`/courses/${courseId}/assignments/${assignmentId}`} className="text-button" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          ← Quay lại bài tập: <strong>{assign.title}</strong>
        </Link>
        <span className="pill" style={{ background: "#eef2e4", color: "#4d651f" }}>
          Tiến độ chấm: {gradedCount} / {submissions.length} bài ({submissions.length > 0 ? Math.round((gradedCount / submissions.length) * 100) : 0}%)
        </span>
      </div>

      <div className="page-heading" style={{ marginBottom: "16px" }}>
        <div>
          <h1 style={{ margin: 0 }}>Bàn chấm điểm & Phản hồi bài nộp</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Khóa học: <strong>{course.title}</strong> · Thang điểm tối đa: <strong>{assign.maxScore}đ</strong>
          </p>
        </div>
      </div>

      {/* Thanh bộ lọc trạng thái */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <button
          type="button"
          className={filter === "ALL" ? "primary" : "secondary"}
          onClick={() => {
            setFilter("ALL");
            setSelectedIndex(0);
          }}
          style={{ fontSize: "12px" }}
        >
          Tất cả bài nộp ({submissions.length})
        </button>
        <button
          type="button"
          className={filter === "PENDING" ? "primary" : "secondary"}
          onClick={() => {
            setFilter("PENDING");
            setSelectedIndex(0);
          }}
          style={{ fontSize: "12px" }}
        >
          Chờ chấm ({pendingCount})
        </button>
        <button
          type="button"
          className={filter === "GRADED" ? "primary" : "secondary"}
          onClick={() => {
            setFilter("GRADED");
            setSelectedIndex(0);
          }}
          style={{ fontSize: "12px" }}
        >
          Đã chấm ({gradedCount})
        </button>
      </div>

      {success && (
        <div className="panel" style={{ background: "#f0f8e8", borderColor: "#c2e0aa", color: "#365c1a", marginBottom: "16px", padding: "10px 16px" }}>
          {success}
        </div>
      )}
      {error && <div className="error" role="alert" style={{ marginBottom: "16px" }}>{error}</div>}

      {submissions.length === 0 ? (
        <div className="empty">
          <h2>Chưa có sinh viên nào nộp bài</h2>
          <p className="muted">Khi sinh viên nộp bài làm, danh sách bài nộp sẽ hiển thị tại đây để bạn chấm điểm.</p>
          <Link href={`/courses/${courseId}/assignments/${assignmentId}`} className="primary" style={{ display: "inline-block", marginTop: "12px" }}>
            ← Quay lại bài tập
          </Link>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="empty">
          <p className="muted">Không có bài nộp nào thuộc trạng thái này.</p>
          <button type="button" className="secondary" onClick={() => setFilter("ALL")}>Xem tất cả</button>
        </div>
      ) : (
        <div>
          {/* Thanh chuyển đổi sinh viên (Student Navigator) */}
          <div className="student-switcher">
            <button
              type="button"
              className="secondary"
              disabled={selectedIndex <= 0}
              onClick={() => handleSelectSubmission(selectedIndex - 1)}
              style={{ fontSize: "12px" }}
            >
              ← Sinh viên trước
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="muted" style={{ fontSize: "12px" }}>
                Sinh viên {selectedIndex + 1} / {filteredSubmissions.length}:
              </span>
              <select
                value={selectedIndex}
                onChange={e => handleSelectSubmission(Number(e.target.value))}
                style={{ minWidth: "240px", fontSize: "13px", padding: "6px 10px" }}
              >
                {filteredSubmissions.map((sub, idx) => (
                  <option key={sub.id} value={idx}>
                    {sub.studentName} {sub.studentCode ? `(${sub.studentCode})` : ""} - {sub.status === "GRADED" ? `Đã chấm (${sub.score}đ)` : "Chờ chấm"}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="secondary"
              disabled={selectedIndex >= filteredSubmissions.length - 1}
              onClick={() => handleSelectSubmission(selectedIndex + 1)}
              style={{ fontSize: "12px" }}
            >
              Sinh viên tiếp theo →
            </button>
          </div>

          {currentSub && (
            <div className="grading-workbench">
              {/* CỘT TRÁI: ĐỌC BÀI NỘP CỦA SINH VIÊN */}
              <div className="grading-reader">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "20px" }}>
                  <div>
                    <h2 style={{ fontSize: "20px", margin: 0 }}>{currentSub.studentName}</h2>
                    <p className="muted" style={{ margin: "4px 0 0", fontSize: "13px" }}>
                      {currentSub.studentEmail} {currentSub.studentCode && `· Mã SV: ${currentSub.studentCode}`}
                    </p>
                    <p className="muted" style={{ margin: "2px 0 0", fontSize: "12px" }}>
                      Nộp bài lúc: {new Date(currentSub.submittedAt).toLocaleString("vi-VN")}
                    </p>
                  </div>

                  <div>
                    <span className="pill" style={{ background: currentSub.status === "GRADED" ? "#dcfce7" : currentSub.status === "LATE" ? "#fee2e2" : "#fef3c7" }}>
                      {currentSub.status === "GRADED" ? "Đã chấm điểm" : currentSub.status === "LATE" ? "Nộp trễ" : "Chờ chấm điểm"}
                    </span>
                  </div>
                </div>

                {/* Nội dung bài viết tự luận */}
                {assign.type === "ESSAY" && (
                  <div>
                    <h3 style={{ fontSize: "15px", marginBottom: "12px" }}>Nội dung bài viết của sinh viên:</h3>
                    <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "4px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap", lineHeight: 1.75, fontSize: "14px", color: "#1e293b" }}>
                      {currentSub.content || "Sinh viên không để lại nội dung."}
                    </div>
                  </div>
                )}

                {/* Nội dung bài trắc nghiệm */}
                {assign.type === "QUIZ" && (
                  <div>
                    <h3 style={{ fontSize: "15px", marginBottom: "12px" }}>
                      Kết quả câu hỏi trắc nghiệm của sinh viên:
                    </h3>
                    {currentSub.quizAnswers && currentSub.quizAnswers.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {currentSub.quizAnswers.map((ans, idx) => (
                          <div
                            key={ans.questionId}
                            style={{
                              background: "#f8fafc",
                              padding: "12px 16px",
                              borderRadius: "4px",
                              borderLeft: ans.isCorrect ? "4px solid #22c55e" : "4px solid #ef4444",
                              fontSize: "13px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                              <span>Câu {idx + 1} ({ans.points}đ): {ans.questionText}</span>
                              <span style={{ color: ans.isCorrect ? "#166534" : "#991b1b" }}>
                                {ans.isCorrect ? "✔ Đúng" : "✖ Sai"}
                              </span>
                            </div>
                            <div style={{ marginTop: "6px" }}>
                              Sinh viên chọn: <strong>{ans.selectedOptionText ?? "Không trả lời"}</strong>
                            </div>
                            {!ans.isCorrect && ans.correctOptionText && (
                              <div style={{ color: "#166534", marginTop: "2px" }}>
                                Đáp án chính xác: <strong>{ans.correctOptionText}</strong>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">Không có dữ liệu câu trả lời chi tiết.</p>
                    )}
                  </div>
                )}
              </div>

              {/* CỘT PHẢI: BẢNG NHẬP ĐIỂM & PHẢN HỒI (SPEEDGRADER CONSOLE) */}
              <div className="grading-console">
                <h3 style={{ fontSize: "16px", margin: "0 0 16px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                  Đánh giá & Cho điểm
                </h3>

                <div style={{ marginBottom: "16px" }}>
                  <label htmlFor="grade-score" style={{ margin: "0 0 6px" }}>
                    Điểm số (Thang điểm: {assign.maxScore})
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      id="grade-score"
                      type="number"
                      step="0.25"
                      min="0"
                      max={assign.maxScore}
                      value={scoreInput}
                      onChange={e => setScoreInput(Number(e.target.value))}
                      style={{ fontSize: "18px", fontWeight: "bold", width: "120px" }}
                      required
                    />
                    <span style={{ fontSize: "16px", color: "var(--muted)" }}>/ {assign.maxScore} điểm</span>
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label htmlFor="grade-feedback" style={{ margin: "0 0 6px" }}>
                    Lời nhận xét & Phản hồi cho sinh viên
                  </label>
                  <textarea
                    id="grade-feedback"
                    rows={6}
                    placeholder="Nhập phản hồi chi tiết, nhận xét ưu điểm và các điểm cần cải thiện của bài làm…"
                    value={feedbackInput}
                    onChange={e => setFeedbackInput(e.target.value)}
                    style={{ fontSize: "13px" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button
                    type="button"
                    className="primary"
                    disabled={saving}
                    onClick={() => handleSaveGrade(false)}
                    style={{ padding: "10px", fontWeight: "bold" }}
                  >
                    {saving ? "Đang lưu…" : "Lưu điểm bài này"}
                  </button>

                  {selectedIndex < filteredSubmissions.length - 1 && (
                    <button
                      type="button"
                      className="secondary"
                      disabled={saving}
                      onClick={() => handleSaveGrade(true)}
                      style={{ padding: "10px", fontSize: "12px" }}
                    >
                      Lưu và sang sinh viên tiếp theo →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
