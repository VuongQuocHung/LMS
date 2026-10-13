"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { api, errorMessage, isSessionError } from "@/lib/api";
import type { Course, CourseDetail, CourseProgress, Enrollment, Lesson, User } from "@/lib/types";
import CourseCard from "./CourseCard";
import AssignmentsSection from "./AssignmentsSection";
import AnnouncementsSection from "./AnnouncementsSection";
import DiscussionsSection from "./DiscussionsSection";
import GradebookSection from "./GradebookSection";

type StatusFilter = "ALL" | Course["status"];
type SortOrder = "name" | "newest";
type ViewMode = "cards" | "list";
type DetailTab = "lessons" | "assignments" | "announcements" | "discussions" | "gradebook" | "enrollments";

/** Quản lý không gian khóa học: tìm kiếm, lọc, sửa khóa, bài học, bài tập và tiện ích học tập. */
export default function CourseWorkspace({
  user,
  onSessionExpired,
  selectedCourseId: controlledSelectedId,
  onSelectCourse,
}: {
  user: User;
  onSessionExpired: () => void;
  selectedCourseId?: number | null;
  onSelectCourse?: (course: Course | null) => void;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<number | null>(null);
  const selectedId = controlledSelectedId !== undefined ? controlledSelectedId : internalSelectedId;
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [detailSuccess, setDetailSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [detailReloadKey, setDetailReloadKey] = useState(0);

  // Tiến độ học tập
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);

  // Bộ lọc danh sách
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortOrder, setSortOrder] = useState<SortOrder>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Tab chi tiết
  const [activeTab, setActiveTab] = useState<DetailTab>("lessons");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentSearch, setEnrollmentSearch] = useState("");

  // Form states
  const [showCreateCourseForm, setShowCreateCourseForm] = useState(false);
  const [showEditCourseForm, setShowEditCourseForm] = useState(false);
  const [showCreateLessonForm, setShowCreateLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const detailHeading = useRef<HTMLHeadingElement>(null);

  // 1. Tải danh sách khóa học
  useEffect(() => {
    let active = true;
    api<Course[]>("/courses")
      .then(data => { if (active) setCourses(data); })
      .catch(err => {
        if (!active) return;
        if (isSessionError(err)) onSessionExpired();
        else setError(errorMessage(err));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey, onSessionExpired]);

  // 2. Tải chi tiết bài học của khóa
  useEffect(() => {
    if (selectedId === null) return;
    let active = true;

    detailHeading.current?.focus({ preventScroll: true });
    detailHeading.current?.scrollIntoView({ block: "start" });

    api<CourseDetail>(`/courses/${selectedId}`)
      .then(data => { if (active) setDetail(data); })
      .catch(err => {
        if (!active) return;
        if (isSessionError(err)) onSessionExpired();
        else setDetailError(errorMessage(err));
      })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId, detailReloadKey, onSessionExpired]);

  // 3. Tải danh sách sinh viên ghi danh nếu là giảng viên và đang ở tab enrollments
  useEffect(() => {
    if (selectedId === null || activeTab !== "enrollments" || user.role !== "TEACHER") return;
    let active = true;
    api<Enrollment[]>(`/courses/${selectedId}/enrollments`)
      .then(data => { if (active) setEnrollments(data); })
      .catch(err => {
        if (!active) return;
        if (isSessionError(err)) onSessionExpired();
        else setDetailError(errorMessage(err));
      })
      .finally(() => { if (active) setEnrollmentsLoading(false); });
    return () => { active = false; };
  }, [selectedId, activeTab, user.role, onSessionExpired]);

  // 4. Tải tiến độ hoàn thành bài học
  useEffect(() => {
    if (selectedId === null) return;
    let active = true;
    api<CourseProgress>(`/courses/${selectedId}/progress`)
      .then(data => { if (active) setCourseProgress(data); })
      .catch(() => {});
    return () => { active = false; };
  }, [selectedId, detailReloadKey]);

  async function toggleLesson(lessonId: number, currentCompleted: boolean) {
    try {
      const res = await api<{ completed: boolean }>(`/lessons/${lessonId}/progress`, {
        method: "POST",
        body: JSON.stringify({ completed: !currentCompleted }),
      });
      setCourseProgress(prev => {
        if (!prev) return null;
        const updatedList = prev.lessonProgress.map(lp => lp.lessonId === lessonId ? { ...lp, completed: res.completed } : lp);
        const completedCount = updatedList.filter(lp => lp.completed).length;
        const pct = prev.totalLessons > 0 ? Math.round((completedCount / prev.totalLessons) * 1000) / 10 : 0;
        return {
          ...prev,
          completedLessons: completedCount,
          percentage: pct,
          lessonProgress: updatedList,
        };
      });
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
    }
  }

  // Bộ lọc phía client
  const keyword = search.trim().toLocaleLowerCase("vi");
  const visibleCourses = courses
    .filter(course => statusFilter === "ALL" || course.status === statusFilter)
    .filter(course => `${course.title} ${course.description}`.toLocaleLowerCase("vi").includes(keyword))
    .sort((a, b) => sortOrder === "name" ? a.title.localeCompare(b.title, "vi") : b.id - a.id);

  function reload() {
    setLoading(true);
    setError("");
    setReloadKey(v => v + 1);
  }

  function selectCourse(id: number) {
    const course = courses.find(c => c.id === id) || null;
    if (onSelectCourse) {
      onSelectCourse(course);
    } else {
      setInternalSelectedId(id);
    }
    setDetail(null);
    setActiveTab("lessons");
    setDetailLoading(true);
    setDetailError("");
    setDetailSuccess("");
    setShowEditCourseForm(false);
    setShowCreateLessonForm(false);
    setEditingLesson(null);
    setEnrollmentSearch("");
    setDetailReloadKey(v => v + 1);
  }

  function closeDetail() {
    if (onSelectCourse) {
      onSelectCourse(null);
    } else {
      setInternalSelectedId(null);
    }
    setDetail(null);
    setShowEditCourseForm(false);
    setShowCreateLessonForm(false);
    setEditingLesson(null);
  }

  function switchTab(tab: DetailTab) {
    setActiveTab(tab);
    if (tab === "enrollments") {
      setEnrollmentsLoading(true);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
  }

  // ==================== KHÓA HỌC ====================

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setActionBusy(true);
    setError("");
    try {
      await api<Course>("/courses", {
        method: "POST",
        body: JSON.stringify({ title: values.get("title"), description: values.get("description") }),
      });
      form.reset();
      setShowCreateCourseForm(false);
      clearFilters();
      reload();
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setError(errorMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function updateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !detail) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setActionBusy(true);
    setDetailError("");
    try {
      const updated = await api<Course>(`/courses/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: String(values.get("title")).trim(),
          description: String(values.get("description")).trim(),
        }),
      });
      setDetail(prev => prev ? { ...prev, course: updated } : null);
      setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
      setShowEditCourseForm(false);
      setDetailSuccess("Đã cập nhật thông tin khóa học thành công.");
      onSelectCourse?.(updated);
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setDetailError(errorMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function changeCourseStatus(newStatus: Course["status"]) {
    if (!selectedId || !detail) return;
    setActionBusy(true);
    setDetailError("");
    setDetailSuccess("");
    try {
      const updated = await api<Course>(`/courses/${selectedId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setDetail(prev => prev ? { ...prev, course: updated } : null);
      setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
      setDetailSuccess(`Đã chuyển trạng thái khóa học sang: ${newStatus}`);
      onSelectCourse?.(updated);
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setDetailError(errorMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function deleteCourse() {
    if (!selectedId || !window.confirm("Bạn có chắc chắn muốn xóa khóa học này cùng toàn bộ bài học và ghi danh?")) return;
    setActionBusy(true);
    setDetailError("");
    try {
      await api<void>(`/courses/${selectedId}`, { method: "DELETE" });
      closeDetail();
      reload();
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setDetailError(errorMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  // ==================== BÀI HỌC ====================

  async function createLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setActionBusy(true);
    setDetailError("");
    setDetailSuccess("");
    try {
      const newLesson = await api<Lesson>(`/courses/${selectedId}/lessons`, {
        method: "POST",
        body: JSON.stringify({
          title: String(values.get("title")).trim(),
          content: String(values.get("content")).trim(),
          position: Number(values.get("position")) || (detail?.lessons.length ?? 0) + 1,
          published: values.get("published") === "on",
        }),
      });
      setDetail(prev => prev ? { ...prev, lessons: [...prev.lessons, newLesson].sort((a, b) => a.position - b.position) } : null);
      form.reset();
      setShowCreateLessonForm(false);
      setDetailSuccess(`Đã tạo bài học "${newLesson.title}" thành công.`);
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setDetailError(errorMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function updateLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !editingLesson) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setActionBusy(true);
    setDetailError("");
    setDetailSuccess("");
    try {
      const updated = await api<Lesson>(`/courses/${selectedId}/lessons/${editingLesson.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: String(values.get("title")).trim(),
          content: String(values.get("content")).trim(),
          position: Number(values.get("position")),
          published: values.get("published") === "on",
        }),
      });
      setDetail(prev => prev ? {
        ...prev,
        lessons: prev.lessons.map(l => l.id === updated.id ? updated : l).sort((a, b) => a.position - b.position)
      } : null);
      setEditingLesson(null);
      setDetailSuccess(`Đã cập nhật bài học "${updated.title}".`);
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setDetailError(errorMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function deleteLesson(lessonId: number) {
    if (!selectedId || !window.confirm("Bạn có chắc chắn muốn xóa bài học này?")) return;
    setActionBusy(true);
    setDetailError("");
    setDetailSuccess("");
    try {
      await api<void>(`/courses/${selectedId}/lessons/${lessonId}`, { method: "DELETE" });
      setDetail(prev => prev ? { ...prev, lessons: prev.lessons.filter(l => l.id !== lessonId) } : null);
      setDetailSuccess("Đã xóa bài học thành công.");
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setDetailError(errorMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  // ==================== GHI DANH ====================

  async function handleEnroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const identifier = String(values.get("identifier")).trim();
    if (!identifier) return;
    setActionBusy(true);
    setDetailError("");
    setDetailSuccess("");
    try {
      const newEnrollment = await api<Enrollment>(`/courses/${selectedId}/enrollments`, {
        method: "POST",
        body: JSON.stringify({ identifier }),
      });
      setEnrollments(prev => [newEnrollment, ...prev]);
      form.reset();
      setDetailSuccess(`Đã ghi danh sinh viên ${newEnrollment.fullName} (${newEnrollment.email}) vào khóa học.`);
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setDetailError(errorMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleUnenroll(studentId: number, studentName: string) {
    if (!selectedId || !window.confirm(`Hủy ghi danh sinh viên ${studentName} khỏi khóa học?`)) return;
    setActionBusy(true);
    setDetailError("");
    setDetailSuccess("");
    try {
      await api<void>(`/courses/${selectedId}/enrollments/${studentId}`, { method: "DELETE" });
      setEnrollments(prev => prev.filter(e => e.studentId !== studentId));
      setDetailSuccess(`Đã hủy ghi danh sinh viên ${studentName}.`);
    } catch (err) {
      if (isSessionError(err)) onSessionExpired();
      else setDetailError(errorMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <section className="course-workspace" aria-labelledby="course-overview">
      <div className="overview-heading">
        <h1 id="course-overview">
          <span className="section-icon" aria-hidden="true">✳</span>
          Tổng quan về khóa học
        </h1>
        {user.role === "TEACHER" && (
          <button className="primary" onClick={() => setShowCreateCourseForm(!showCreateCourseForm)}
            aria-expanded={showCreateCourseForm} aria-controls="create-course-form">
            {showCreateCourseForm ? "Đóng biểu mẫu" : "+ Tạo khóa học"}
          </button>
        )}
      </div>

      {showCreateCourseForm && (
        <form id="create-course-form" className="panel create-form" onSubmit={createCourse}>
          <h2>Tạo khóa học nháp</h2>
          <label htmlFor="course-title">Tên khóa học</label>
          <input id="course-title" name="title" required maxLength={150} placeholder="Ví dụ: Lập trình mạng nâng cao" />
          <label htmlFor="course-description">Mô tả</label>
          <textarea id="course-description" name="description" maxLength={2000} rows={3} placeholder="Mô tả nội dung khóa học..." />
          <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
            <button className="primary" disabled={actionBusy}>{actionBusy ? "Đang tạo…" : "Lưu bản nháp"}</button>
            <button className="secondary" type="button" onClick={() => setShowCreateCourseForm(false)}>Hủy</button>
          </div>
        </form>
      )}

      {/* Thanh công cụ tìm kiếm và lọc */}
      <div className="course-toolbar">
        <div className="course-filters">
          <label className="sr-only" htmlFor="course-status">Lọc trạng thái</label>
          <select id="course-status" className="green-select" value={statusFilter}
            onChange={event => setStatusFilter(event.target.value as StatusFilter)}>
            <option value="ALL">Tất cả</option>
            <option value="PUBLISHED">Đã công bố</option>
            {user.role === "TEACHER" && <option value="DRAFT">Bản nháp</option>}
            {user.role === "TEACHER" && <option value="ARCHIVED">Lưu trữ</option>}
          </select>
          <div className="search-field">
            <label className="sr-only" htmlFor="course-search">Tìm kiếm khóa học</label>
            <input id="course-search" type="search" placeholder="Tìm kiếm khóa học…" value={search}
              onChange={event => setSearch(event.target.value)} />
          </div>
        </div>
        <div className="course-display-controls">
          <label className="sr-only" htmlFor="course-sort">Sắp xếp khóa học</label>
          <select id="course-sort" className="green-select" value={sortOrder}
            onChange={event => setSortOrder(event.target.value as SortOrder)}>
            <option value="name">Theo tên khóa học</option>
            <option value="newest">Mới tạo trước</option>
          </select>
          <label className="sr-only" htmlFor="course-view">Kiểu hiển thị</label>
          <select id="course-view" className="green-select" value={viewMode}
            onChange={event => setViewMode(event.target.value as ViewMode)}>
            <option value="cards">Dạng thẻ</option>
            <option value="list">Danh sách</option>
          </select>
          <button className="secondary reload-button" onClick={reload} disabled={loading}>Tải lại</button>
        </div>
      </div>

      <p className="results-count" aria-live="polite">
        {loading ? "Đang tải khóa học…" : `Hiển thị ${visibleCourses.length} / ${courses.length} khóa học`}
      </p>
      {error && <p className="error" role="alert">{error}</p>}

      {loading ? (
        <div className="empty" role="status">Đang tải danh sách khóa học…</div>
      ) : error && courses.length === 0 ? (
        <div className="empty"><p>Chưa tải được danh sách khóa học.</p></div>
      ) : courses.length === 0 ? (
        <div className="empty">
          <h2>Chưa có khóa học</h2>
          <p className="muted">
            {user.role === "TEACHER" ? "Tạo khóa học đầu tiên để bắt đầu." : "Giảng viên sẽ thêm bạn vào khóa học khi lớp bắt đầu."}
          </p>
        </div>
      ) : visibleCourses.length === 0 ? (
        <div className="empty">
          <h2>Không tìm thấy khóa học</h2>
          <p className="muted">Thử từ khóa hoặc trạng thái khác.</p>
          <button className="secondary" onClick={clearFilters}>Xóa bộ lọc</button>
        </div>
      ) : (
        <div className={viewMode === "cards" ? "course-grid" : "course-list"}>
          {visibleCourses.map(course => (
            <CourseCard key={course.id} course={course} selected={selectedId === course.id} onOpen={selectCourse} />
          ))}
        </div>
      )}

      {/* Vùng chi tiết khóa học */}
      {selectedId !== null && (
        <section id="course-detail" className="panel lesson-panel" aria-labelledby="detail-title">
          <div className="section-bar">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h2 id="detail-title" ref={detailHeading} tabIndex={-1} style={{ margin: 0 }}>
                  {detail?.course.title ?? "Nội dung khóa học"}
                </h2>
                {detail?.course && (
                  <span className={`pill ${detail.course.status === "PUBLISHED" ? "" : "disabled"}`}>
                    {detail.course.status === "PUBLISHED" ? "Đã công bố" : detail.course.status === "DRAFT" ? "Bản nháp" : "Lưu trữ"}
                  </span>
                )}
              </div>
              {detail?.course.description && (
                <p className="muted" style={{ margin: "8px 0 0", fontSize: "13px" }}>{detail.course.description}</p>
              )}
            </div>
            <button className="secondary" onClick={closeDetail} title="Quay lại danh sách khóa học">
              ← Quay lại danh sách khóa học
            </button>
          </div>

          {/* Các nút thao tác khóa học cho giảng viên */}
          {user.role === "TEACHER" && detail && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "14px 0", paddingBottom: "14px", borderBottom: "1px solid var(--border)" }}>
              <button className="secondary" style={{ fontSize: "12px" }} onClick={() => setShowEditCourseForm(!showEditCourseForm)}>
                {showEditCourseForm ? "Đóng sửa khóa" : "Sửa khóa học"}
              </button>

              {detail.course.status === "DRAFT" && (
                <button className="primary" style={{ fontSize: "12px", background: "var(--green)", borderColor: "var(--green)" }}
                  disabled={actionBusy} onClick={() => changeCourseStatus("PUBLISHED")}>
                  Công bố khóa học
                </button>
              )}

              {detail.course.status === "PUBLISHED" && (
                <>
                  <button className="secondary" style={{ fontSize: "12px" }}
                    disabled={actionBusy} onClick={() => changeCourseStatus("DRAFT")}>
                    Chuyển về nháp
                  </button>
                  <button className="secondary" style={{ fontSize: "12px" }}
                    disabled={actionBusy} onClick={() => changeCourseStatus("ARCHIVED")}>
                    Lưu trữ khóa học
                  </button>
                </>
              )}

              {detail.course.status === "ARCHIVED" && (
                <button className="primary" style={{ fontSize: "12px" }}
                  disabled={actionBusy} onClick={() => changeCourseStatus("PUBLISHED")}>
                  Khôi phục công bố
                </button>
              )}

              <button className="secondary" style={{ fontSize: "12px", color: "#9b3330", borderColor: "#edc3bb", marginLeft: "auto" }}
                disabled={actionBusy} onClick={deleteCourse}>
                Xóa khóa học
              </button>
            </div>
          )}

          {/* Form sửa thông tin khóa học */}
          {showEditCourseForm && detail && (
            <form className="panel create-form" onSubmit={updateCourse} style={{ marginBottom: "20px", background: "#fcfaf6" }}>
              <h3>Chỉnh sửa khóa học</h3>
              <label htmlFor="edit-course-title">Tên khóa học</label>
              <input id="edit-course-title" name="title" defaultValue={detail.course.title} required maxLength={150} />
              <label htmlFor="edit-course-desc">Mô tả</label>
              <textarea id="edit-course-desc" name="description" defaultValue={detail.course.description} maxLength={2000} rows={3} />
              <div style={{ marginTop: "14px", display: "flex", gap: "10px" }}>
                <button className="primary" disabled={actionBusy}>{actionBusy ? "Đang lưu…" : "Lưu thay đổi"}</button>
                <button className="secondary" type="button" onClick={() => setShowEditCourseForm(false)}>Hủy</button>
              </div>
            </form>
          )}

          {detailSuccess && (
            <div className="panel" style={{ background: "#f0f8e8", borderColor: "#c2e0aa", color: "#365c1a", marginBottom: "14px", padding: "10px 16px" }}>
              {detailSuccess}
            </div>
          )}
          {detailError && (
            <div className="error" role="alert" style={{ marginBottom: "14px" }}>
              {detailError}
              <button className="text-button" onClick={() => selectCourse(selectedId)}>Thử lại</button>
            </div>
          )}

          {/* Điều hướng Tab (Bài học, Bài tập, Thông báo, Thảo luận, Sổ điểm, Thành viên) */}
          <div style={{ display: "flex", gap: "6px", margin: "16px 0", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
            <button
              style={{
                background: "none", border: "0", padding: "10px 14px",
                fontWeight: activeTab === "lessons" ? 700 : 500,
                color: activeTab === "lessons" ? "var(--orange)" : "var(--ink)",
                borderBottom: activeTab === "lessons" ? "3px solid var(--orange)" : "3px solid transparent",
                cursor: "pointer", whiteSpace: "nowrap"
              }}
              onClick={() => switchTab("lessons")}>
              Nội dung bài học ({detail?.lessons.length ?? 0})
            </button>
            <button
              style={{
                background: "none", border: "0", padding: "10px 14px",
                fontWeight: activeTab === "assignments" ? 700 : 500,
                color: activeTab === "assignments" ? "var(--orange)" : "var(--ink)",
                borderBottom: activeTab === "assignments" ? "3px solid var(--orange)" : "3px solid transparent",
                cursor: "pointer", whiteSpace: "nowrap"
              }}
              onClick={() => switchTab("assignments")}>
              Bài tập & Đánh giá
            </button>
            <button
              style={{
                background: "none", border: "0", padding: "10px 14px",
                fontWeight: activeTab === "announcements" ? 700 : 500,
                color: activeTab === "announcements" ? "var(--orange)" : "var(--ink)",
                borderBottom: activeTab === "announcements" ? "3px solid var(--orange)" : "3px solid transparent",
                cursor: "pointer", whiteSpace: "nowrap"
              }}
              onClick={() => switchTab("announcements")}>
              Thông báo
            </button>
            <button
              style={{
                background: "none", border: "0", padding: "10px 14px",
                fontWeight: activeTab === "discussions" ? 700 : 500,
                color: activeTab === "discussions" ? "var(--orange)" : "var(--ink)",
                borderBottom: activeTab === "discussions" ? "3px solid var(--orange)" : "3px solid transparent",
                cursor: "pointer", whiteSpace: "nowrap"
              }}
              onClick={() => switchTab("discussions")}>
              Thảo luận
            </button>
            <button
              style={{
                background: "none", border: "0", padding: "10px 14px",
                fontWeight: activeTab === "gradebook" ? 700 : 500,
                color: activeTab === "gradebook" ? "var(--orange)" : "var(--ink)",
                borderBottom: activeTab === "gradebook" ? "3px solid var(--orange)" : "3px solid transparent",
                cursor: "pointer", whiteSpace: "nowrap"
              }}
              onClick={() => switchTab("gradebook")}>
              Sổ điểm
            </button>
            {user.role === "TEACHER" && (
              <button
                style={{
                  background: "none", border: "0", padding: "10px 14px",
                  fontWeight: activeTab === "enrollments" ? 700 : 500,
                  color: activeTab === "enrollments" ? "var(--orange)" : "var(--ink)",
                  borderBottom: activeTab === "enrollments" ? "3px solid var(--orange)" : "3px solid transparent",
                  cursor: "pointer", whiteSpace: "nowrap"
                }}
                onClick={() => switchTab("enrollments")}>
                Thành viên lớp ({enrollments.length})
              </button>
            )}
          </div>

          {/* TAB 1: BÀI HỌC */}
          {activeTab === "lessons" && (
            <div>
              {/* Thanh tiến độ bài học cho sinh viên */}
              {courseProgress && courseProgress.totalLessons > 0 && (
                <div className="panel" style={{ background: "#fff", marginBottom: "16px", padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                    <span><strong>Tiến độ hoàn thành bài học:</strong> {courseProgress.completedLessons} / {courseProgress.totalLessons} bài</span>
                    <strong>{courseProgress.percentage}%</strong>
                  </div>
                  <div style={{ background: "#e2e8f0", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ background: "var(--orange)", height: "100%", width: `${courseProgress.percentage}%`, transition: "width 0.3s ease" }} />
                  </div>
                </div>
              )}

              {user.role === "TEACHER" && (
                <div style={{ marginBottom: "16px" }}>
                  <button className="primary" style={{ fontSize: "12px" }}
                    onClick={() => { setShowCreateLessonForm(!showCreateLessonForm); setEditingLesson(null); }}>
                    {showCreateLessonForm ? "Đóng thêm bài học" : "+ Thêm bài học"}
                  </button>
                </div>
              )}

              {/* Form thêm bài học mới */}
              {showCreateLessonForm && (
                <form className="panel create-form" onSubmit={createLesson} style={{ marginBottom: "20px" }}>
                  <h3>Thêm bài học mới</h3>
                  <label htmlFor="lesson-title">Tiêu đề bài học</label>
                  <input id="lesson-title" name="title" required maxLength={150} placeholder="Ví dụ: 04. Giao thức UDP" />
                  <label htmlFor="lesson-content">Nội dung bài học</label>
                  <textarea id="lesson-content" name="content" required rows={5} placeholder="Nội dung chi tiết..." />
                  <div style={{ display: "flex", gap: "20px", alignItems: "center", marginTop: "12px" }}>
                    <div style={{ width: "120px" }}>
                      <label htmlFor="lesson-pos" style={{ margin: "0 0 4px" }}>Thứ tự</label>
                      <input id="lesson-pos" name="position" type="number" defaultValue={(detail?.lessons.length ?? 0) + 1} />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", margin: "20px 0 0", cursor: "pointer" }}>
                      <input type="checkbox" name="published" defaultChecked />
                      <span>Công bố ngay</span>
                    </label>
                  </div>
                  <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
                    <button className="primary" disabled={actionBusy}>{actionBusy ? "Đang lưu…" : "Lưu bài học"}</button>
                    <button className="secondary" type="button" onClick={() => setShowCreateLessonForm(false)}>Hủy</button>
                  </div>
                </form>
              )}

              {/* Form sửa bài học */}
              {editingLesson && (
                <form className="panel create-form" onSubmit={updateLesson} style={{ marginBottom: "20px", borderColor: "var(--orange)" }}>
                  <h3>Chỉnh sửa bài học: {editingLesson.title}</h3>
                  <label htmlFor="edit-lesson-title">Tiêu đề bài học</label>
                  <input id="edit-lesson-title" name="title" defaultValue={editingLesson.title} required maxLength={150} />
                  <label htmlFor="edit-lesson-content">Nội dung</label>
                  <textarea id="edit-lesson-content" name="content" defaultValue={editingLesson.content} required rows={5} />
                  <div style={{ display: "flex", gap: "20px", alignItems: "center", marginTop: "12px" }}>
                    <div style={{ width: "120px" }}>
                      <label htmlFor="edit-lesson-pos" style={{ margin: "0 0 4px" }}>Thứ tự</label>
                      <input id="edit-lesson-pos" name="position" type="number" defaultValue={editingLesson.position} />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", margin: "20px 0 0", cursor: "pointer" }}>
                      <input type="checkbox" name="published" defaultChecked={editingLesson.published} />
                      <span>Công bố</span>
                    </label>
                  </div>
                  <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
                    <button className="primary" disabled={actionBusy}>{actionBusy ? "Đang lưu…" : "Cập nhật"}</button>
                    <button className="secondary" type="button" onClick={() => setEditingLesson(null)}>Hủy</button>
                  </div>
                </form>
              )}

              {detailLoading && <p role="status">Đang tải bài học…</p>}
              {detail && detail.lessons.length === 0 && <p className="muted">Khóa học chưa có bài học để hiển thị.</p>}

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {detail?.lessons.map(lesson => {
                  const isCompleted = courseProgress?.lessonProgress.find(lp => lp.lessonId === lesson.id)?.completed ?? false;
                  return (
                    <div
                      key={lesson.id}
                      className="panel"
                      style={{
                        background: "#fff",
                        padding: "14px 18px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "10px",
                        borderLeft: isCompleted ? "4px solid #16a34a" : "4px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        {user.role === "STUDENT" && (
                          <label
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px" }}
                            title={isCompleted ? "Đã hoàn thành bài học" : "Đánh dấu đã hoàn thành"}
                          >
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => toggleLesson(lesson.id, isCompleted)}
                            />
                            <span style={{ color: isCompleted ? "#166534" : "#64748b", fontWeight: isCompleted ? "bold" : "normal" }}>
                              {isCompleted ? "✔ Đã học" : "Chưa học"}
                            </span>
                          </label>
                        )}
                        <Link
                          href={`/courses/${selectedId}/lessons/${lesson.id}`}
                          style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink)", textDecoration: "none" }}
                        >
                          <span style={{ color: "var(--orange-dark)", marginRight: "6px" }}>Bài {lesson.position}.</span>
                          {lesson.title}
                        </Link>
                        {!lesson.published && <span className="pill disabled">Nháp</span>}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Link
                          href={`/courses/${selectedId}/lessons/${lesson.id}`}
                          className="secondary"
                          style={{ fontSize: "12px", textDecoration: "none" }}
                        >
                          Vào học bài này →
                        </Link>
                        {user.role === "TEACHER" && (
                          <>
                            <button
                              className="secondary"
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                              onClick={() => { setEditingLesson(lesson); setShowCreateLessonForm(false); }}
                            >
                              Sửa
                            </button>
                            <button
                              className="secondary"
                              style={{ padding: "4px 8px", fontSize: "11px", color: "#9b3330" }}
                              disabled={actionBusy}
                              onClick={() => deleteLesson(lesson.id)}
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BÀI TẬP & ĐÁNH GIÁ */}
          {activeTab === "assignments" && (
            <AssignmentsSection courseId={selectedId} user={user} onSessionExpired={onSessionExpired} />
          )}

          {/* TAB 3: THÔNG BÁO */}
          {activeTab === "announcements" && (
            <AnnouncementsSection courseId={selectedId} user={user} onSessionExpired={onSessionExpired} />
          )}

          {/* TAB 4: THẢO LUẬN */}
          {activeTab === "discussions" && (
            <DiscussionsSection courseId={selectedId} user={user} onSessionExpired={onSessionExpired} />
          )}

          {/* TAB 5: SỔ ĐIỂM */}
          {activeTab === "gradebook" && (
            <GradebookSection courseId={selectedId} user={user} onSessionExpired={onSessionExpired} />
          )}

          {/* TAB 2: THÀNH VIÊN LỚP HỌC (GHI DANH) */}
          {activeTab === "enrollments" && user.role === "TEACHER" && (() => {
            const enrollmentKeyword = enrollmentSearch.trim().toLocaleLowerCase("vi");
            const visibleEnrollments = enrollments.filter(e =>
              `${e.fullName} ${e.email} ${e.studentCode ?? ""}`.toLocaleLowerCase("vi").includes(enrollmentKeyword)
            );

            return (
              <div>
                <form className="panel" onSubmit={handleEnroll} style={{ marginBottom: "20px", background: "#fcfaf6" }}>
                  <h3>Ghi danh sinh viên vào lớp</h3>
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "220px" }}>
                      <label htmlFor="enroll-identifier" style={{ margin: "0 0 6px" }}>Mã sinh viên hoặc Email</label>
                      <input id="enroll-identifier" name="identifier" required placeholder="Ví dụ: SV002 hoặc student2@lms.local" />
                    </div>
                    <button className="primary" type="submit" disabled={actionBusy} style={{ minHeight: "38px" }}>
                      {actionBusy ? "Đang thêm…" : "+ Ghi danh"}
                    </button>
                  </div>
                </form>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 10px", flexWrap: "wrap", gap: "10px" }}>
                  <div className="search-field" style={{ flex: "1 1 240px", maxWidth: "360px" }}>
                    <label className="sr-only" htmlFor="enrollment-search">Tìm kiếm sinh viên trong lớp</label>
                    <input
                      id="enrollment-search"
                      type="search"
                      placeholder="Tìm sinh viên theo tên, email, mã SV…"
                      value={enrollmentSearch}
                      onChange={e => setEnrollmentSearch(e.target.value)}
                    />
                  </div>
                  <span className="results-count" style={{ margin: 0 }}>
                    Hiển thị {visibleEnrollments.length} / {enrollments.length} sinh viên
                  </span>
                </div>

                {enrollmentsLoading ? (
                  <p role="status">Đang tải danh sách sinh viên ghi danh…</p>
                ) : enrollments.length === 0 ? (
                  <p className="muted">Chưa có sinh viên nào ghi danh vào khóa học này.</p>
                ) : visibleEnrollments.length === 0 ? (
                  <div className="empty" style={{ padding: "20px" }}>
                    <p>Không tìm thấy sinh viên phù hợp với từ khóa &quot;{enrollmentSearch}&quot;.</p>
                    <button className="secondary" type="button" onClick={() => setEnrollmentSearch("")}>Xóa tìm kiếm</button>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Họ tên / Email</th>
                          <th>Mã sinh viên</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleEnrollments.map(e => (
                          <tr key={e.id}>
                            <td>
                              <strong>{e.fullName}</strong>
                              <small>{e.email}</small>
                            </td>
                            <td>{e.studentCode ?? "—"}</td>
                            <td>
                              <button className="secondary" style={{ padding: "3px 8px", fontSize: "11px", color: "#9b3330" }}
                                disabled={actionBusy} onClick={() => handleUnenroll(e.studentId, e.fullName)}>
                                Hủy ghi danh
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </section>
      )}
    </section>
  );
}
