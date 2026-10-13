"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorMessage, isSessionError } from "@/lib/api";
import type { CourseDetail, CourseProgress, Lesson, User } from "@/lib/types";
import PortalShell from "@/components/PortalShell";

export default function LessonReadingPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = Number(resolvedParams.courseId);
  const lessonId = Number(resolvedParams.lessonId);

  return (
    <PortalShell>
      {user => <LessonContent courseId={courseId} lessonId={lessonId} user={user} />}
    </PortalShell>
  );
}

function LessonContent({
  courseId,
  lessonId,
  user,
}: {
  courseId: number;
  lessonId: number;
  user: User;
}) {
  const router = useRouter();
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      api<CourseDetail>(`/courses/${courseId}`),
      api<CourseProgress>(`/courses/${courseId}/progress`).catch(() => null),
    ])
      .then(([detail, progress]) => {
        if (!active) return;
        setCourseDetail(detail);
        if (progress) setCourseProgress(progress);
      })
      .catch(err => {
        if (!active) return;
        if (isSessionError(err)) {
          router.push("/");
        } else {
          setError(errorMessage(err));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [courseId, router]);

  if (loading) {
    return <div className="empty" role="status">Đang tải nội dung bài học…</div>;
  }

  if (error || !courseDetail) {
    return (
      <div className="empty">
        <h2>Không thể tải bài học</h2>
        <p className="error" role="alert">{error || "Khóa học không tồn tại."}</p>
        <Link href={`/courses/${courseId}`} className="primary" style={{ display: "inline-block", marginTop: "12px" }}>
          ← Quay lại khóa học
        </Link>
      </div>
    );
  }

  const { course, lessons } = courseDetail;
  const sortedLessons = [...lessons].sort((a, b) => a.position - b.position);
  const currentIndex = sortedLessons.findIndex(l => l.id === lessonId);
  const currentLesson: Lesson | undefined = sortedLessons[currentIndex];

  if (!currentLesson) {
    return (
      <div className="empty">
        <h2>Không tìm thấy bài học</h2>
        <p className="muted">Bài học này có thể đã bị xóa hoặc bạn không có quyền xem.</p>
        <Link href={`/courses/${courseId}`} className="primary" style={{ display: "inline-block", marginTop: "12px" }}>
          ← Quay lại danh sách bài học
        </Link>
      </div>
    );
  }

  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null;

  const isCompleted =
    courseProgress?.lessonProgress.find(lp => lp.lessonId === currentLesson.id)?.completed ?? false;

  async function handleToggleProgress() {
    setBusy(true);
    try {
      const res = await api<{ completed: boolean }>(`/lessons/${lessonId}/progress`, {
        method: "POST",
        body: JSON.stringify({ completed: !isCompleted }),
      });
      setCourseProgress(prev => {
        if (!prev) return null;
        const updated = prev.lessonProgress.map(lp =>
          lp.lessonId === lessonId ? { ...lp, completed: res.completed } : lp
        );
        const count = updated.filter(lp => lp.completed).length;
        const pct = prev.totalLessons > 0 ? Math.round((count / prev.totalLessons) * 1000) / 10 : 0;
        return { ...prev, completedLessons: count, percentage: pct, lessonProgress: updated };
      });
    } catch (err) {
      if (isSessionError(err)) router.push("/");
      else alert(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Thanh điều hướng quay lại */}
      <div style={{ marginBottom: "18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href={`/courses/${courseId}`} className="text-button" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          ← Quay lại khóa học: <strong>{course.title}</strong>
        </Link>
        <span className="pill" style={{ background: currentLesson.published ? "#eef3e4" : "#fff2dd" }}>
          {currentLesson.published ? "Đã công bố" : "Bản nháp"}
        </span>
      </div>

      <div className="lesson-reader-container">
        {/* Cột chính: Nội dung bài học */}
        <article className="lesson-article" aria-labelledby="lesson-heading">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
            <div>
              <span className="eyebrow">BÀI HỌC {currentLesson.position}</span>
              <h1 id="lesson-heading" style={{ fontSize: "24px", margin: "6px 0 0" }}>
                {currentLesson.title}
              </h1>
            </div>
            {user.role === "STUDENT" && (
              <button
                type="button"
                className={isCompleted ? "secondary" : "primary"}
                onClick={handleToggleProgress}
                disabled={busy}
                style={{
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: isCompleted ? "#f0fdf4" : undefined,
                  borderColor: isCompleted ? "#86efac" : undefined,
                  color: isCompleted ? "#166534" : undefined,
                  fontWeight: 600,
                }}
              >
                {isCompleted ? "✔ Đã học xong" : "Đánh dấu đã học"}
              </button>
            )}
          </div>

          <div className="lesson-body">
            {currentLesson.content}
          </div>

          {/* Điều hướng chuyển bài học trước/sau */}
          <nav className="lesson-nav-bar" aria-label="Chuyển bài học">
            {prevLesson ? (
              <Link href={`/courses/${courseId}/lessons/${prevLesson.id}`} className="secondary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                ← Bài trước: {prevLesson.title}
              </Link>
            ) : (
              <span />
            )}

            {nextLesson ? (
              <Link href={`/courses/${courseId}/lessons/${nextLesson.id}`} className="primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                Bài tiếp theo: {nextLesson.title} →
              </Link>
            ) : (
              <Link href={`/courses/${courseId}`} className="secondary">
                Hoàn thành chương học ✓
              </Link>
            )}
          </nav>
        </article>

        {/* Cột bên: Mục lục khóa học */}
        <aside className="lesson-toc" aria-label="Mục lục các bài học">
          <h3 style={{ fontSize: "15px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Mục lục bài học</span>
            <small style={{ fontWeight: "normal" }}>({sortedLessons.length} bài)</small>
          </h3>

          {courseProgress && (
            <div style={{ marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span>Tiến độ</span>
                <strong>{courseProgress.percentage}%</strong>
              </div>
              <div style={{ background: "#e2e8f0", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ background: "var(--orange)", height: "100%", width: `${courseProgress.percentage}%` }} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {sortedLessons.map(l => {
              const active = l.id === currentLesson.id;
              const completed = courseProgress?.lessonProgress.find(lp => lp.lessonId === l.id)?.completed;
              return (
                <Link
                  key={l.id}
                  href={`/courses/${courseId}/lessons/${l.id}`}
                  className={`toc-item ${active ? "active" : ""}`}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: "11px", color: active ? "var(--orange-dark)" : "var(--muted)", fontWeight: "bold" }}>
                      {l.position}.
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</span>
                  </span>
                  {completed && (
                    <span style={{ color: "#16a34a", fontSize: "13px", fontWeight: "bold", marginLeft: "6px" }} title="Đã hoàn thành">
                      ✔
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
