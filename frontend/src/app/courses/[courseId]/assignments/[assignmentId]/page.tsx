"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorMessage, isSessionError } from "@/lib/api";
import type {
  Assignment,
  CourseDetail,
  QuizQuestion,
  Submission,
  User,
} from "@/lib/types";
import PortalShell from "@/components/PortalShell";
import QuizOptionsBuilder, { validateQuizQuestion, type QuizOptionDraft } from "@/components/QuizOptionsBuilder";

export default function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = Number(resolvedParams.courseId);
  const assignmentId = Number(resolvedParams.assignmentId);

  return (
    <PortalShell>
      {user => <AssignmentContent courseId={courseId} assignmentId={assignmentId} user={user} />}
    </PortalShell>
  );
}

function AssignmentContent({
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
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Student quiz answering state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  // Student essay answering state
  const [essayContent, setEssayContent] = useState("");

  // Teacher question adding state
  const [showAddQModal, setShowAddQModal] = useState(false);
  const [qText, setQText] = useState("");
  const [qPoints, setQPoints] = useState(2.0);
  const [qOptions, setQOptions] = useState<QuizOptionDraft[]>([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [courseData, assignData] = await Promise.all([
          api<CourseDetail>(`/courses/${courseId}`),
          api<Assignment>(`/assignments/${assignmentId}`),
        ]);

        if (!active) return;
        setCourseDetail(courseData);
        setAssignment(assignData);

        // Nếu là học sinh: kiểm tra bài nộp
        if (user.role === "STUDENT") {
          try {
            const sub = await api<Submission>(`/assignments/${assignmentId}/my-submission`);
            if (active) setSubmission(sub);
          } catch {
            // Chưa nộp bài -> tải câu hỏi nếu là trắc nghiệm
            if (assignData.type === "QUIZ") {
              const qList = await api<QuizQuestion[]>(`/assignments/${assignmentId}/questions`);
              if (active) setQuizQuestions(qList);
            }
          }
        } else {
          // Là Giảng viên -> tải câu hỏi
          if (assignData.type === "QUIZ") {
            const qList = await api<QuizQuestion[]>(`/assignments/${assignmentId}/questions`);
            if (active) setQuizQuestions(qList);
          }
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
  }, [courseId, assignmentId, user.role, router]);

  // Sinh viên nộp bài trắc nghiệm
  async function handleSubmitQuiz() {
    if (!assignment) return;
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < quizQuestions.length) {
      if (!window.confirm(`Bạn mới trả lời ${answeredCount}/${quizQuestions.length} câu. Bạn có chắc chắn muốn nộp bài?`)) {
        return;
      }
    } else {
      if (!window.confirm("Xác nhận nộp bài trắc nghiệm? Điểm số sẽ được tính tự động ngay sau khi nộp.")) {
        return;
      }
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await api<Submission>(`/assignments/${assignmentId}/submit-quiz`, {
        method: "POST",
        body: JSON.stringify({ answers: selectedAnswers }),
      });
      setSubmission(result);
      setSuccess("Đã nộp bài trắc nghiệm thành công! Điểm số đã được chấm tự động.");
      // Cập nhật lại thông tin bài tập
      const updatedAssign = await api<Assignment>(`/assignments/${assignmentId}`);
      setAssignment(updatedAssign);
    } catch (err) {
      if (isSessionError(err)) router.push("/");
      else setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Sinh viên nộp bài tự luận
  async function handleSubmitEssay(e: React.FormEvent) {
    e.preventDefault();
    if (!essayContent.trim()) {
      alert("Vui lòng nhập nội dung bài làm của bạn.");
      return;
    }
    if (!window.confirm("Xác nhận nộp bài tự luận? Giảng viên sẽ đọc và chấm điểm bài nộp của bạn.")) {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await api<Submission>(`/assignments/${assignmentId}/submit-essay`, {
        method: "POST",
        body: JSON.stringify({ content: essayContent.trim() }),
      });
      setSubmission(result);
      setSuccess("Đã nộp bài tự luận thành công! Bài làm đang chờ giảng viên chấm điểm.");
      const updatedAssign = await api<Assignment>(`/assignments/${assignmentId}`);
      setAssignment(updatedAssign);
    } catch (err) {
      if (isSessionError(err)) router.push("/");
      else setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Giảng viên thêm câu hỏi trắc nghiệm
  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateQuizQuestion(qText, qPoints, qOptions);
    if (validationError) {
      alert(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const newQ = await api<QuizQuestion>(`/assignments/${assignmentId}/questions`, {
        method: "POST",
        body: JSON.stringify({
          questionText: qText.trim(),
          points: qPoints,
          options: qOptions.map((o, idx) => ({
            optionText: o.text.trim(),
            isCorrect: o.isCorrect,
            position: idx + 1,
          })),
        }),
      });
      setQuizQuestions(prev => [...prev, newQ]);
      setShowAddQModal(false);
      setQText("");
      setQOptions([
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ]);
      setSuccess("Đã thêm câu hỏi trắc nghiệm thành công.");
    } catch (err) {
      if (isSessionError(err)) router.push("/");
      else alert(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Giảng viên xóa câu hỏi
  async function handleDeleteQuestion(qId: number) {
    if (!window.confirm("Xác nhận xóa câu hỏi này khỏi đề thi?")) return;
    setSubmitting(true);
    try {
      await api<void>(`/questions/${qId}`, { method: "DELETE" });
      setQuizQuestions(prev => prev.filter(q => q.id !== qId));
      setSuccess("Đã xóa câu hỏi.");
    } catch (err) {
      if (isSessionError(err)) router.push("/");
      else alert(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="empty" role="status">Đang tải thông tin bài tập…</div>;
  }

  if (error || !assignment || !courseDetail) {
    return (
      <div className="empty">
        <h2>Không thể tải bài tập</h2>
        <p className="error" role="alert">{error || "Bài tập không tồn tại."}</p>
        <Link href={`/courses/${courseId}`} className="primary" style={{ display: "inline-block", marginTop: "12px" }}>
          ← Quay lại khóa học
        </Link>
      </div>
    );
  }

  const course = courseDetail.course;
  const isLate = assignment.dueAt ? new Date() > new Date(assignment.dueAt) : false;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Thanh điều hướng quay lại */}
      <div style={{ marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <Link href={`/courses/${courseId}`} className="text-button" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          ← Quay lại khóa học: <strong>{course.title}</strong>
        </Link>
        <div style={{ display: "flex", gap: "8px" }}>
          <span className="pill" style={{ background: assignment.type === "QUIZ" ? "#e0f2fe" : "#ffedd5", color: assignment.type === "QUIZ" ? "#0369a1" : "#c2410c" }}>
            {assignment.type === "QUIZ" ? "Trắc nghiệm" : "Tự luận"}
          </span>
          <span className={`pill ${assignment.status === "PUBLISHED" ? "" : "disabled"}`}>
            {assignment.status === "PUBLISHED" ? "Đã công bố" : assignment.status === "DRAFT" ? "Bản nháp" : "Lưu trữ"}
          </span>
        </div>
      </div>

      {success && (
        <div className="panel" style={{ background: "#f0f8e8", borderColor: "#c2e0aa", color: "#365c1a", marginBottom: "16px", padding: "12px 18px" }}>
          {success}
        </div>
      )}
      {error && <div className="error" role="alert" style={{ marginBottom: "16px" }}>{error}</div>}

      <div className="layout-two-col">
        {/* ==================== CỘT CHÍNH ==================== */}
        <div className="col-main">
          {/* Thông tin đầu đề */}
          <div className="panel" style={{ marginBottom: "20px" }}>
            <span className="eyebrow">{assignment.type === "QUIZ" ? "BÀI KIỂM TRA TRẮC NGHIỆM" : "BÀI TẬP TỰ LUẬN"}</span>
            <h1 style={{ fontSize: "24px", margin: "8px 0 12px" }}>{assignment.title}</h1>

            <div style={{ background: "#f8fafc", padding: "14px 18px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
              <strong>Hướng dẫn làm bài:</strong>
              <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap", color: "#334155" }}>
                {assignment.description || "Chưa có hướng dẫn cụ thể."}
              </p>
            </div>
          </div>

          {/* ==================== KHU VỰC SINH VIÊN ==================== */}
          {user.role === "STUDENT" && (
            <div>
              {/* TRƯỜNG HỢP 1: ĐÃ NỘP BÀI -> HIỂN THỊ KẾT QUẢ VÀ BÀI LÀM */}
              {submission ? (
                <section className="panel" style={{ border: "2px solid #16a34a", background: "#fcfdfc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "18px" }}>
                    <div>
                      <span className="eyebrow" style={{ color: "#166534" }}>KẾT QUẢ BÀI NỘP CỦA BẠN</span>
                      <h2 style={{ fontSize: "20px", margin: "4px 0 0" }}>Đã nộp thành công</h2>
                      <p className="muted" style={{ margin: "4px 0 0", fontSize: "12px" }}>
                        Thời gian nộp: {new Date(submission.submittedAt).toLocaleString("vi-VN")}
                      </p>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span className="pill" style={{ background: submission.status === "GRADED" ? "#dcfce7" : "#fef3c7", fontSize: "13px", padding: "6px 12px" }}>
                        {submission.status === "GRADED" ? "Đã chấm điểm" : submission.status === "LATE" ? "Nộp trễ" : "Đã nộp · Chờ chấm điểm"}
                      </span>
                      <div style={{ marginTop: "8px", fontSize: "22px", fontWeight: "bold", color: submission.score !== null ? (submission.score >= 5 ? "#166534" : "#991b1b") : "#64748b" }}>
                        {submission.score !== null ? `${submission.score} / ${submission.maxScore}đ` : "Chờ điểm số"}
                      </div>
                    </div>
                  </div>

                  {/* Lời nhận xét của giảng viên */}
                  {submission.feedback && (
                    <div className="panel" style={{ background: "#fff", borderLeft: "4px solid #16a34a", marginBottom: "20px" }}>
                      <strong style={{ color: "#166534" }}>Nhận xét từ Giảng viên:</strong>
                      <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap", color: "#1e293b" }}>{submission.feedback}</p>
                    </div>
                  )}

                  {/* Nếu là trắc nghiệm: Xem chi tiết câu trả lời đúng / sai */}
                  {submission.quizAnswers && submission.quizAnswers.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: "16px", marginBottom: "14px" }}>
                        Chi tiết câu trả lời trắc nghiệm ({submission.quizAnswers.length} câu):
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {submission.quizAnswers.map((ans, idx) => (
                          <div
                            key={ans.questionId}
                            className="panel"
                            style={{
                              background: "white",
                              borderLeft: ans.isCorrect ? "5px solid #22c55e" : "5px solid #ef4444",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                              <strong>Câu {idx + 1} ({ans.points}đ): {ans.questionText}</strong>
                              <span style={{ fontWeight: "bold", color: ans.isCorrect ? "#166534" : "#991b1b", fontSize: "13px" }}>
                                {ans.isCorrect ? "✔ Chính xác" : "✖ Chưa chính xác"}
                              </span>
                            </div>
                            <div style={{ fontSize: "13px", marginTop: "8px" }}>
                              <div>
                                Bạn đã chọn:{" "}
                                <strong style={{ color: ans.isCorrect ? "#166534" : "#991b1b" }}>
                                  {ans.selectedOptionText ?? "Chưa trả lời"}
                                </strong>
                              </div>
                              {!ans.isCorrect && ans.correctOptionText && (
                                <div style={{ marginTop: "4px", color: "#166534" }}>
                                  Đáp án đúng: <strong>{ans.correctOptionText}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nếu là bài viết: Xem lại nội dung bài đã nộp */}
                  {submission.content && (
                    <div className="panel" style={{ background: "white", marginTop: "14px" }}>
                      <h4 style={{ margin: "0 0 10px" }}>Nội dung bài viết bạn đã nộp:</h4>
                      <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: "#1e293b", margin: 0 }}>
                        {submission.content}
                      </p>
                    </div>
                  )}
                </section>
              ) : (
                /* TRƯỜNG HỢP 2: CHƯA NỘP BÀI -> GIAO DIỆN LÀM BÀI */
                <div>
                  {assignment.type === "QUIZ" ? (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h2 style={{ fontSize: "18px", margin: 0 }}>
                          Câu hỏi trắc nghiệm ({quizQuestions.length} câu)
                        </h2>
                        <span style={{ fontSize: "13px", fontWeight: "bold", color: "#0369a1" }}>
                          Đã trả lời: {Object.keys(selectedAnswers).length} / {quizQuestions.length} câu
                        </span>
                      </div>

                      {quizQuestions.length === 0 ? (
                        <div className="empty">
                          <p className="muted">Bài tập này hiện chưa có câu hỏi nào từ giảng viên.</p>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                          {quizQuestions.map((q, idx) => (
                            <div key={q.id} className="quiz-question-card">
                              <p style={{ fontWeight: "bold", fontSize: "15px", margin: "0 0 12px" }}>
                                Câu {idx + 1} ({q.points} điểm): {q.questionText}
                              </p>
                              <div className="quiz-options-group">
                                {q.options.map((opt, oIdx) => {
                                  const isSelected = selectedAnswers[q.id] === opt.id;
                                  return (
                                    <label
                                      key={opt.id}
                                      className={`quiz-option-label ${isSelected ? "selected" : ""}`}
                                    >
                                      <input
                                        type="radio"
                                        name={`quiz-q-${q.id}`}
                                        value={opt.id}
                                        checked={isSelected}
                                        onChange={() =>
                                          setSelectedAnswers(prev => ({ ...prev, [q.id]: opt.id }))
                                        }
                                      />
                                      <span>
                                        <strong>{String.fromCharCode(65 + oIdx)}.</strong> {opt.optionText}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}

                          {/* Thanh nộp bài trắc nghiệm cố định */}
                          <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", background: "#f8fafc" }}>
                            <div>
                              <span>Tiến độ làm bài: </span>
                              <strong>{Object.keys(selectedAnswers).length} / {quizQuestions.length} câu</strong>
                            </div>
                            <button
                              type="button"
                              className="primary"
                              disabled={submitting}
                              onClick={handleSubmitQuiz}
                              style={{ padding: "10px 24px", fontSize: "14px", fontWeight: "bold" }}
                            >
                              {submitting ? "Đang chấm điểm…" : "Nộp bài trắc nghiệm"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* BÀI VIẾT TỰ LUẬN */
                    <form className="panel" onSubmit={handleSubmitEssay}>
                      <h2 style={{ fontSize: "18px", margin: "0 0 14px" }}>Khu vực soạn và nộp bài làm</h2>
                      <label htmlFor="essay-submission-text">Nội dung bài viết của bạn *</label>
                      <textarea
                        id="essay-submission-text"
                        required
                        rows={10}
                        placeholder="Soạn nội dung bài viết, phân tích, trả lời yêu cầu tại đây…"
                        value={essayContent}
                        onChange={e => setEssayContent(e.target.value)}
                        style={{ fontSize: "14px", lineHeight: 1.6 }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "12px", color: "var(--muted)" }}>
                        <span>Số ký tự: {essayContent.length} · Số từ: {essayContent.trim() ? essayContent.trim().split(/\s+/).length : 0}</span>
                        {isLate && <span style={{ color: "#b91c1c", fontWeight: "bold" }}>Lưu ý: Hạn nộp đã qua. Bài nộp sẽ được tính là Nộp trễ.</span>}
                      </div>

                      <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="submit"
                          className="primary"
                          disabled={submitting}
                          style={{ padding: "10px 24px", fontSize: "14px", fontWeight: "bold" }}
                        >
                          {submitting ? "Đang gửi bài…" : "Xác nhận nộp bài tự luận"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== KHU VỰC GIẢNG VIÊN ==================== */}
          {user.role === "TEACHER" && (
            <div>
              {/* Thống kê và liên kết tới trang chấm điểm */}
              <div className="panel" style={{ background: "#fffdf9", border: "2px solid #e66f23", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
                  <div>
                    <h3 style={{ margin: 0, color: "#c2410c", fontSize: "18px" }}>Quản lý bài nộp & Chấm điểm</h3>
                    <p className="muted" style={{ margin: "4px 0 0", fontSize: "13px" }}>
                      Số bài đã nộp: <strong>{assignment.submissionCount ?? 0} sinh viên</strong>
                    </p>
                  </div>

                  <Link
                    href={`/courses/${courseId}/assignments/${assignmentId}/submissions`}
                    className="primary"
                    style={{ padding: "10px 20px", fontSize: "13px", fontWeight: "bold" }}
                  >
                    Vào trang chấm điểm bài nộp ({assignment.submissionCount ?? 0}) →
                  </Link>
                </div>
              </div>

              {/* Nếu là QUIZ: Quản lý câu hỏi trắc nghiệm */}
              {assignment.type === "QUIZ" && (
                <section className="panel" style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ margin: 0, fontSize: "17px" }}>
                      Ngân hàng câu hỏi trắc nghiệm ({quizQuestions.length} câu)
                    </h3>
                    <button
                      type="button"
                      className="primary"
                      style={{ fontSize: "12px" }}
                      onClick={() => setShowAddQModal(!showAddQModal)}
                    >
                      {showAddQModal ? "Đóng thêm câu" : "+ Thêm câu hỏi"}
                    </button>
                  </div>

                  {showAddQModal && (
                    <form className="panel" onSubmit={handleAddQuestion} style={{ background: "#f8fafc", marginBottom: "20px", border: "1px solid #cbd5e1" }}>
                      <h4 style={{ margin: "0 0 12px" }}>Thêm câu hỏi mới vào đề</h4>
                      <label htmlFor="modal-qtext">Nội dung câu hỏi</label>
                      <textarea
                        id="modal-qtext"
                        value={qText}
                        onChange={e => setQText(e.target.value)}
                        required
                        rows={2}
                        placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                      />

                      <div style={{ width: "160px", margin: "10px 0" }}>
                        <label htmlFor="modal-qpoints">Điểm câu này</label>
                        <input
                          id="modal-qpoints"
                          type="number"
                          step="0.5"
                          value={qPoints}
                          onChange={e => setQPoints(Number(e.target.value))}
                          required
                        />
                      </div>

                      <QuizOptionsBuilder
                        options={qOptions}
                        onChange={setQOptions}
                        disabled={submitting}
                      />

                      <div style={{ marginTop: "14px", display: "flex", gap: "10px" }}>
                        <button type="submit" className="primary" disabled={submitting}>
                          {submitting ? "Đang lưu…" : "Lưu câu hỏi"}
                        </button>
                        <button type="button" className="secondary" onClick={() => setShowAddQModal(false)}>
                          Hủy
                        </button>
                      </div>
                    </form>
                  )}

                  {quizQuestions.length === 0 ? (
                    <p className="muted">Chưa có câu hỏi trắc nghiệm nào trong bài tập này.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {quizQuestions.map((q, idx) => (
                        <div key={q.id} className="panel" style={{ background: "#fafafa", padding: "14px 18px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <strong>Câu {idx + 1} ({q.points}đ): {q.questionText}</strong>
                            <button
                              type="button"
                              className="secondary"
                              style={{ fontSize: "11px", color: "#9b3330", padding: "2px 8px" }}
                              disabled={submitting}
                              onClick={() => handleDeleteQuestion(q.id)}
                            >
                              Xóa
                            </button>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                            {q.options.map((opt, oIdx) => (
                              <div
                                key={opt.id}
                                style={{
                                  fontSize: "13px",
                                  padding: "3px 8px",
                                  borderRadius: "3px",
                                  background: opt.isCorrect ? "#dcfce7" : "transparent",
                                  color: opt.isCorrect ? "#166534" : "inherit",
                                  fontWeight: opt.isCorrect ? "bold" : "normal",
                                }}
                              >
                                {String.fromCharCode(65 + oIdx)}. {opt.optionText} {opt.isCorrect && "✔ (Đáp án đúng)"}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>

        {/* ==================== CỘT BÊN (SIDEBAR) ==================== */}
        <aside className="col-sidebar" aria-label="Thông tin bài tập">
          <div className="panel" style={{ background: "white" }}>
            <h3 style={{ fontSize: "15px", margin: "0 0 14px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
              Thông tin bài tập
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <div>
                <span className="muted" style={{ display: "block", fontSize: "11px" }}>KHÓA HỌC</span>
                <Link href={`/courses/${courseId}`} style={{ fontWeight: 600 }}>{course.title}</Link>
              </div>

              <div>
                <span className="muted" style={{ display: "block", fontSize: "11px" }}>HÌNH THỨC</span>
                <strong>{assignment.type === "QUIZ" ? "Trắc nghiệm tự động chấm" : "Bài viết tự luận"}</strong>
              </div>

              <div>
                <span className="muted" style={{ display: "block", fontSize: "11px" }}>THANG ĐIỂM TỐI ĐA</span>
                <strong style={{ fontSize: "16px", color: "var(--orange-dark)" }}>{assignment.maxScore} điểm</strong>
              </div>

              <div>
                <span className="muted" style={{ display: "block", fontSize: "11px" }}>THỜI GIAN MỞ</span>
                <span>{assignment.openAt ? new Date(assignment.openAt).toLocaleString("vi-VN") : "Mở tự do"}</span>
              </div>

              <div>
                <span className="muted" style={{ display: "block", fontSize: "11px" }}>HẠN NỘP BÀI (DEADLINE)</span>
                <span style={{ fontWeight: isLate ? "bold" : "normal", color: isLate ? "#dc2626" : "inherit" }}>
                  {assignment.dueAt ? new Date(assignment.dueAt).toLocaleString("vi-VN") : "Không giới hạn"}
                </span>
                {isLate && <small style={{ color: "#dc2626" }}>Đã quá hạn nộp</small>}
              </div>

              {user.role === "STUDENT" && (
                <div style={{ paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                  <span className="muted" style={{ display: "block", fontSize: "11px" }}>TÌNH TRẠNG CỦA BẠN</span>
                  <span
                    className="pill"
                    style={{
                      marginTop: "4px",
                      background: submission ? "#dcfce7" : "#fef3c7",
                      color: submission ? "#166534" : "#92400e",
                    }}
                  >
                    {submission ? "Đã nộp bài" : "Chưa nộp"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
