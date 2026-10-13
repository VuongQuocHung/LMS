"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorMessage, isSessionError } from "@/lib/api";
import type { Assignment, AssignmentStatus, AssignmentType, CourseDetail, User } from "@/lib/types";
import PortalShell from "@/components/PortalShell";
import QuizOptionsBuilder, { validateQuizQuestion, type QuizOptionDraft } from "@/components/QuizOptionsBuilder";

interface DraftQuestion {
  questionText: string;
  points: number;
  options: { text: string; isCorrect: boolean }[];
}

export default function NewAssignmentPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = Number(resolvedParams.courseId);

  return (
    <PortalShell>
      {user => <NewAssignmentWizard courseId={courseId} user={user} />}
    </PortalShell>
  );
}

function NewAssignmentWizard({
  courseId,
  user,
}: {
  courseId: number;
  user: User;
}) {
  const router = useRouter();
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Stepper state (1: Thông tin cơ bản, 2: Nội dung / Câu hỏi, 3: Thời gian & Thang điểm, 4: Xem trước & Công bố)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form data
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<AssignmentType>("QUIZ");
  const [essayPrompt, setEssayPrompt] = useState("");

  // Quiz questions
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  // Input form cho câu hỏi mới
  const [qText, setQText] = useState("");
  const [qPoints, setQPoints] = useState<number>(2.0);
  const [qOptions, setQOptions] = useState<QuizOptionDraft[]>([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  // Settings
  const [maxScore, setMaxScore] = useState<number>(10);
  const [openAt, setOpenAt] = useState("");
  const [dueAt, setDueAt] = useState("");

  useEffect(() => {
    let active = true;
    api<CourseDetail>(`/courses/${courseId}`)
      .then(d => {
        if (active) setCourseDetail(d);
      })
      .catch(err => {
        if (!active) return;
        if (isSessionError(err)) router.push("/");
        else setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [courseId, router]);

  // Tính tổng điểm các câu hỏi trắc nghiệm
  const totalQuizPoints = questions.reduce((sum, q) => sum + q.points, 0);

  // Thêm một câu hỏi trắc nghiệm vào danh sách
  function handleAddQuestion() {
    const validationError = validateQuizQuestion(qText, qPoints, qOptions);
    if (validationError) {
      alert(validationError);
      return;
    }

    setQuestions(prev => [
      ...prev,
      {
        questionText: qText.trim(),
        points: qPoints,
        options: qOptions.map(o => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
      },
    ]);

    // Reset input
    setQText("");
    setQPoints(2.0);
    setQOptions([
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ]);
  }

  function handleRemoveQuestion(idx: number) {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  }

  // Lưu bài tập
  async function handleCreateAssignment(status: AssignmentStatus) {
    if (!title.trim()) {
      alert("Vui lòng nhập tiêu đề bài tập.");
      setStep(1);
      return;
    }
    if (type === "QUIZ" && questions.length === 0) {
      if (!window.confirm("Bài trắc nghiệm chưa có câu hỏi nào. Bạn vẫn muốn tiếp tục lưu và bổ sung câu hỏi sau?")) {
        setStep(2);
        return;
      }
    }

    setSaving(true);
    setError("");

    try {
      // 1. Tạo assignment
      const finalDesc = type === "ESSAY" && essayPrompt.trim()
        ? `${description.trim()}\n\n[Yêu cầu chi tiết]:\n${essayPrompt.trim()}`
        : description.trim();

      const created = await api<Assignment>(`/courses/${courseId}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: finalDesc,
          type,
          openAt: openAt ? new Date(openAt).toISOString() : null,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          maxScore: Number(maxScore) || 10,
          status,
        }),
      });

      // 2. Nếu là QUIZ và có câu hỏi, thêm từng câu hỏi
      if (type === "QUIZ" && questions.length > 0) {
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          await api(`/assignments/${created.id}/questions`, {
            method: "POST",
            body: JSON.stringify({
              questionText: q.questionText,
              points: q.points,
              options: q.options.map((opt, optIdx) => ({
                optionText: opt.text,
                isCorrect: opt.isCorrect,
                position: optIdx + 1,
              })),
            }),
          });
        }
      }

      router.push(`/courses/${courseId}/assignments/${created.id}`);
    } catch (err) {
      if (isSessionError(err)) {
        router.push("/");
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="empty" role="status">Đang tải biểu mẫu tạo bài tập…</div>;
  }

  if (user.role !== "TEACHER") {
    return (
      <div className="empty">
        <h2>Không có quyền truy cập</h2>
        <p className="muted">Chỉ giảng viên của khóa học mới có quyền tạo và giao bài tập.</p>
        <Link href={`/courses/${courseId}`} className="primary" style={{ display: "inline-block", marginTop: "12px" }}>
          ← Quay lại khóa học
        </Link>
      </div>
    );
  }

  const course = courseDetail?.course;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      {/* Quay lại */}
      <div style={{ marginBottom: "16px" }}>
        <Link href={`/courses/${courseId}`} className="text-button">
          ← Quay lại khóa học: <strong>{course?.title ?? "Khóa học"}</strong>
        </Link>
      </div>

      <div className="page-heading" style={{ marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: 0 }}>Giao bài tập & Đánh giá mới</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Tạo bài trắc nghiệm tự động chấm hoặc bài viết tự luận theo quy trình từng bước.
          </p>
        </div>
      </div>

      {error && <div className="error" role="alert" style={{ marginBottom: "20px" }}>{error}</div>}

      {/* Stepper Wizard */}
      <nav className="wizard-stepper" aria-label="Các bước tạo bài tập">
        <button
          type="button"
          className={`wizard-step ${step === 1 ? "active" : step > 1 ? "completed" : ""}`}
          onClick={() => setStep(1)}
        >
          <span className="step-number">1</span>
          <span>1. Thông tin cơ bản</span>
        </button>

        <button
          type="button"
          className={`wizard-step ${step === 2 ? "active" : step > 2 ? "completed" : ""}`}
          onClick={() => {
            if (!title.trim()) {
              alert("Vui lòng nhập tiêu đề bài tập ở bước 1.");
              return;
            }
            setStep(2);
          }}
        >
          <span className="step-number">2</span>
          <span>2. Nội dung & Câu hỏi</span>
        </button>

        <button
          type="button"
          className={`wizard-step ${step === 3 ? "active" : step > 3 ? "completed" : ""}`}
          onClick={() => setStep(3)}
        >
          <span className="step-number">3</span>
          <span>3. Thời gian & Thang điểm</span>
        </button>

        <button
          type="button"
          className={`wizard-step ${step === 4 ? "active" : ""}`}
          onClick={() => setStep(4)}
        >
          <span className="step-number">4</span>
          <span>4. Xem trước & Công bố</span>
        </button>
      </nav>

      {/* ==================== BƯỚC 1: THÔNG TIN CƠ BẢN ==================== */}
      {step === 1 && (
        <section className="panel" aria-labelledby="step1-heading">
          <h2 id="step1-heading" style={{ fontSize: "18px", marginBottom: "16px" }}>
            Bước 1: Thông tin cơ bản về bài tập
          </h2>

          <label htmlFor="assignment-type">Loại bài tập</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "8px", marginBottom: "20px" }}>
            <div
              onClick={() => setType("QUIZ")}
              style={{
                border: type === "QUIZ" ? "2px solid #0284c7" : "1px solid var(--border)",
                background: type === "QUIZ" ? "#f0f9ff" : "white",
                padding: "16px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="radio"
                  name="assignType"
                  checked={type === "QUIZ"}
                  onChange={() => setType("QUIZ")}
                  id="type-quiz"
                />
                <label htmlFor="type-quiz" style={{ margin: 0, fontWeight: "bold", color: "#0369a1", cursor: "pointer" }}>
                  Trắc nghiệm (Quiz)
                </label>
              </div>
              <p className="muted" style={{ margin: "8px 0 0 24px", fontSize: "12px" }}>
                Hệ thống tự động chấm điểm theo đáp án đúng ngay sau khi sinh viên nộp bài.
              </p>
            </div>

            <div
              onClick={() => setType("ESSAY")}
              style={{
                border: type === "ESSAY" ? "2px solid #e66f23" : "1px solid var(--border)",
                background: type === "ESSAY" ? "#fffdf9" : "white",
                padding: "16px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="radio"
                  name="assignType"
                  checked={type === "ESSAY"}
                  onChange={() => setType("ESSAY")}
                  id="type-essay"
                />
                <label htmlFor="type-essay" style={{ margin: 0, fontWeight: "bold", color: "#c2410c", cursor: "pointer" }}>
                  Bài viết tự luận (Essay)
                </label>
              </div>
              <p className="muted" style={{ margin: "8px 0 0 24px", fontSize: "12px" }}>
                Sinh viên soạn nội dung câu trả lời; giảng viên đọc, cho điểm và gửi lời nhận xét.
              </p>
            </div>
          </div>

          <label htmlFor="assignment-title">Tiêu đề bài tập *</label>
          <input
            id="assignment-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ví dụ: Kiểm tra trắc nghiệm Kiến trúc Mạng Máy tính"
            required
            maxLength={200}
          />

          <label htmlFor="assignment-desc">Mô tả và mục tiêu bài tập</label>
          <textarea
            id="assignment-desc"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="Hướng dẫn chung, phạm vi kiến thức kiểm tra, lưu ý khi làm bài…"
          />

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="primary"
              onClick={() => {
                if (!title.trim()) {
                  alert("Vui lòng nhập tiêu đề bài tập.");
                  return;
                }
                setStep(2);
              }}
            >
              Tiếp tục: Soạn nội dung & Câu hỏi →
            </button>
          </div>
        </section>
      )}

      {/* ==================== BƯỚC 2: NỘI DUNG & CÂU HỎI ==================== */}
      {step === 2 && (
        <section className="panel" aria-labelledby="step2-heading">
          <h2 id="step2-heading" style={{ fontSize: "18px", marginBottom: "8px" }}>
            Bước 2: {type === "QUIZ" ? "Soạn ngân hàng câu hỏi trắc nghiệm" : "Chi tiết đề bài tự luận & Tiêu chí"}
          </h2>
          <p className="muted" style={{ marginBottom: "20px" }}>
            {type === "QUIZ"
              ? "Soạn từng câu hỏi và các phương án lựa chọn. Tích chọn ô tròn để đánh dấu đáp án đúng."
              : "Cung cấp chi tiết đề bài, các yêu cầu kỹ thuật và tiêu chí chấm điểm để sinh viên chuẩn bị."}
          </p>

          {type === "ESSAY" ? (
            <div>
              <label htmlFor="essay-prompt">Yêu cầu chi tiết bài viết (Prompt / Đề bài)</label>
              <textarea
                id="essay-prompt"
                value={essayPrompt}
                onChange={e => setEssayPrompt(e.target.value)}
                rows={8}
                placeholder="Ví dụ: Phân tích sự khác biệt giữa giao thức TCP và UDP về cơ chế kiểm soát tắc nghẽn và tính tin cậy. Nêu ví dụ ứng dụng thực tế phù hợp cho mỗi giao thức..."
              />
            </div>
          ) : (
            <div>
              {/* Danh sách câu hỏi đã soạn */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "15px", margin: 0 }}>
                    Danh sách câu hỏi ({questions.length} câu · Tổng {totalQuizPoints} điểm)
                  </h3>
                </div>

                {questions.length === 0 ? (
                  <div className="empty" style={{ padding: "24px" }}>
                    <p className="muted">Chưa có câu hỏi nào. Dùng biểu mẫu bên dưới để thêm câu hỏi đầu tiên.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {questions.map((q, idx) => (
                      <div key={idx} className="panel" style={{ background: "#f8fafc", padding: "14px 18px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <strong>Câu {idx + 1} ({q.points} điểm):</strong> {q.questionText}
                          </div>
                          <button
                            type="button"
                            className="secondary"
                            style={{ fontSize: "11px", color: "#9b3330", padding: "2px 8px" }}
                            onClick={() => handleRemoveQuestion(idx)}
                          >
                            Xóa
                          </button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "10px" }}>
                          {q.options.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              style={{
                                fontSize: "13px",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                background: opt.isCorrect ? "#dcfce7" : "transparent",
                                color: opt.isCorrect ? "#166534" : "inherit",
                                fontWeight: opt.isCorrect ? 600 : 400,
                              }}
                            >
                              {String.fromCharCode(65 + optIdx)}. {opt.text} {opt.isCorrect && "✔ (Đáp án đúng)"}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form thêm câu hỏi mới */}
              <div className="panel" style={{ background: "#fcfaf6", border: "2px dashed #0284c7" }}>
                <h4 style={{ margin: "0 0 12px", color: "#0369a1" }}>+ Thêm câu hỏi trắc nghiệm</h4>
                <label htmlFor="q-text">Nội dung câu hỏi</label>
                <textarea
                  id="q-text"
                  value={qText}
                  onChange={e => setQText(e.target.value)}
                  rows={2}
                  placeholder="Ví dụ: Giao thức HTTP/2 sử dụng kỹ thuật nào để truyền tải nhiều request đồng thời?"
                />

                <div style={{ width: "160px", margin: "12px 0" }}>
                  <label htmlFor="q-points">Điểm câu này</label>
                  <input
                    id="q-points"
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={qPoints}
                    onChange={e => setQPoints(Number(e.target.value))}
                  />
                </div>

                <QuizOptionsBuilder
                  options={qOptions}
                  onChange={setQOptions}
                />

                <button
                  type="button"
                  className="primary"
                  style={{ marginTop: "14px", fontSize: "13px" }}
                  onClick={handleAddQuestion}
                >
                  + Thêm câu hỏi này vào đề
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between" }}>
            <button type="button" className="secondary" onClick={() => setStep(1)}>
              ← Quay lại bước 1
            </button>
            <button type="button" className="primary" onClick={() => setStep(3)}>
              Tiếp tục: Thời gian & Thang điểm →
            </button>
          </div>
        </section>
      )}

      {/* ==================== BƯỚC 3: THỜI GIAN & THANG ĐIỂM ==================== */}
      {step === 3 && (
        <section className="panel" aria-labelledby="step3-heading">
          <h2 id="step3-heading" style={{ fontSize: "18px", marginBottom: "16px" }}>
            Bước 3: Thiết lập thời gian & Thang điểm
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label htmlFor="assign-maxscore">Thang điểm tối đa (Mặc định 10)</label>
              <input
                id="assign-maxscore"
                type="number"
                step="0.5"
                min="1"
                value={maxScore}
                onChange={e => setMaxScore(Number(e.target.value))}
                required
              />
              {type === "QUIZ" && totalQuizPoints > 0 && totalQuizPoints !== maxScore && (
                <small style={{ color: "#b45309", marginTop: "4px" }}>
                  Lưu ý: Tổng điểm các câu hỏi hiện tại là {totalQuizPoints}đ. Điểm số sẽ được quy đổi theo thang {maxScore}đ.
                </small>
              )}
            </div>

            <div />

            <div>
              <label htmlFor="assign-openat">Thời gian mở làm bài (Tùy chọn)</label>
              <input
                id="assign-openat"
                type="datetime-local"
                value={openAt}
                onChange={e => setOpenAt(e.target.value)}
              />
              <small>Nếu để trống, sinh viên có thể làm bài ngay sau khi công bố.</small>
            </div>

            <div>
              <label htmlFor="assign-dueat">Hạn nộp bài (Deadline)</label>
              <input
                id="assign-dueat"
                type="datetime-local"
                value={dueAt}
                onChange={e => setDueAt(e.target.value)}
              />
              <small>Hệ thống tự động gắn nhãn &quot;Nộp trễ&quot; cho bài nộp sau thời điểm này.</small>
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between" }}>
            <button type="button" className="secondary" onClick={() => setStep(2)}>
              ← Quay lại bước 2
            </button>
            <button type="button" className="primary" onClick={() => setStep(4)}>
              Xem trước & Hoàn thành →
            </button>
          </div>
        </section>
      )}

      {/* ==================== BƯỚC 4: XEM TRƯỚC & CÔNG BỐ ==================== */}
      {step === 4 && (
        <section className="panel" aria-labelledby="step4-heading">
          <h2 id="step4-heading" style={{ fontSize: "18px", marginBottom: "16px" }}>
            Bước 4: Xem trước & Công bố bài tập
          </h2>

          <div className="panel" style={{ background: "#fcfaf6", border: "1px solid var(--border)", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <span className="pill" style={{ background: type === "QUIZ" ? "#e0f2fe" : "#ffedd5", color: type === "QUIZ" ? "#0369a1" : "#c2410c" }}>
                  {type === "QUIZ" ? "Trắc nghiệm tự động chấm" : "Bài viết tự luận"}
                </span>
                <h3 style={{ fontSize: "20px", margin: "8px 0 4px" }}>{title}</h3>
                <p className="muted" style={{ margin: "4px 0" }}>Khóa học: {course?.title}</p>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "16px", fontWeight: "bold" }}>Thang điểm: {maxScore}đ</span>
                {dueAt && (
                  <p className="muted" style={{ fontSize: "12px", margin: "4px 0 0" }}>
                    Hạn nộp: {new Date(dueAt).toLocaleString("vi-VN")}
                  </p>
                )}
              </div>
            </div>

            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
              <strong>Hướng dẫn làm bài:</strong>
              <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{description || "Chưa có mô tả chi tiết."}</p>
            </div>

            {type === "ESSAY" && essayPrompt && (
              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
                <strong>Yêu cầu đề bài tự luận:</strong>
                <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{essayPrompt}</p>
              </div>
            )}

            {type === "QUIZ" && (
              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
                <strong>Xem trước đề thi ({questions.length} câu hỏi):</strong>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                  {questions.map((q, idx) => (
                    <div key={idx} style={{ background: "white", padding: "10px 14px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                      <p style={{ margin: "0 0 6px", fontWeight: "bold", fontSize: "13px" }}>
                        Câu {idx + 1} ({q.points}đ): {q.questionText}
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "12px" }}>
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} style={{ color: opt.isCorrect ? "#166534" : "#4b5563", fontWeight: opt.isCorrect ? "bold" : "normal" }}>
                            {String.fromCharCode(65 + oIdx)}. {opt.text} {opt.isCorrect && "✔ (Đáp án đúng)"}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button type="button" className="secondary" onClick={() => setStep(3)} disabled={saving}>
              ← Quay lại bước 3
            </button>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                className="secondary"
                disabled={saving}
                onClick={() => handleCreateAssignment("DRAFT")}
              >
                {saving ? "Đang lưu…" : "Lưu bản nháp"}
              </button>

              <button
                type="button"
                className="primary"
                disabled={saving}
                onClick={() => handleCreateAssignment("PUBLISHED")}
              >
                {saving ? "Đang công bố…" : "Công bố bài tập ngay"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
