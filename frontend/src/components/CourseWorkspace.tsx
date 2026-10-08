"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorMessage, isSessionError } from "@/lib/api";
import type { Course, CourseDetail, User } from "@/lib/types";
import CourseCard from "./CourseCard";

// Bộ lọc chỉ thay cách hiển thị các khóa backend đã cho phép người dùng xem.
type StatusFilter = "ALL" | Course["status"];
type SortOrder = "name" | "newest";
type ViewMode = "cards" | "list";

/** Danh sách khóa theo ảnh mẫu: tìm kiếm, lọc trạng thái, sắp xếp và thẻ màu. */
export default function CourseWorkspace({ user, onSessionExpired }: {
  user: User; onSessionExpired: () => void;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  // Tách ID đang chọn khỏi response để không hiển thị bài của lần chọn trước.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  // Tăng khóa này để tải lại chi tiết cùng một khóa khi lần trước gặp lỗi mạng.
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortOrder, setSortOrder] = useState<SortOrder>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  // Giúp nút mở khóa cuộn đến nội dung, kể cả khi danh sách có nhiều hàng.
  const detailHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Bỏ qua response khi component đã đóng hoặc lần tải mới đã bắt đầu.
    let active = true;
    api<Course[]>("/courses")
      .then(data => { if (active) setCourses(data); })
      .catch(error => {
        if (!active) return;
        if (isSessionError(error)) onSessionExpired();
        else setError(errorMessage(error));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey, onSessionExpired]);

  useEffect(() => {
    if (selectedId === null) return;
    let active = true;
    detailHeading.current?.focus({ preventScroll: true });
    detailHeading.current?.scrollIntoView({ block: "start" });
    api<CourseDetail>(`/courses/${selectedId}`)
      .then(data => { if (active) setDetail(data); })
      .catch(error => {
        if (!active) return;
        if (isSessionError(error)) onSessionExpired();
        else setDetailError(errorMessage(error));
      })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId, detailReloadKey, onSessionExpired]);

  // Tạo mảng mới trước khi sort để không sửa trực tiếp state nhận từ API.
  const keyword = search.trim().toLocaleLowerCase("vi");
  const visibleCourses = courses
    .filter(course => statusFilter === "ALL" || course.status === statusFilter)
    .filter(course => `${course.title} ${course.description}`.toLocaleLowerCase("vi").includes(keyword))
    .sort((first, second) => sortOrder === "name"
      ? first.title.localeCompare(second.title, "vi")
      : second.id - first.id);

  /** Tải lại danh sách thật khi người dùng bấm nút hoặc sau khi tạo khóa. */
  function reload() {
    setLoading(true);
    setError("");
    setReloadKey(value => value + 1);
  }

  /** Mở hoặc thử tải lại khóa; xóa chi tiết cũ để tránh nhầm nội dung. */
  function selectCourse(id: number) {
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    setSelectedId(id);
    setDetailReloadKey(value => value + 1);
  }

  /** Xóa điều kiện tìm kiếm khi danh sách không có khóa phù hợp. */
  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
  }

  /** Tạo khóa nháp qua API; chủ khóa do backend lấy từ session giảng viên. */
  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSaving(true);
    setError("");
    try {
      await api<Course>("/courses", {
        method: "POST",
        body: JSON.stringify({ title: values.get("title"), description: values.get("description") }),
      });
      form.reset();
      setShowForm(false);
      clearFilters();
      reload();
    } catch (error) {
      if (isSessionError(error)) onSessionExpired();
      else setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="course-workspace" aria-labelledby="course-overview">
      <div className="overview-heading">
        <h1 id="course-overview"><span className="section-icon" aria-hidden="true">✳</span>Tổng quan về khóa học</h1>
        {user.role === "TEACHER" && <button className="primary" onClick={() => setShowForm(!showForm)}
          aria-expanded={showForm} aria-controls="create-course-form">
          {showForm ? "Đóng biểu mẫu" : "+ Tạo khóa học"}
        </button>}
      </div>

      {showForm && <form id="create-course-form" className="panel create-form" onSubmit={createCourse}>
        <h2>Tạo khóa học nháp</h2>
        <label htmlFor="course-title">Tên khóa học</label>
        <input id="course-title" name="title" required maxLength={150} />
        <label htmlFor="course-description">Mô tả</label>
        <textarea id="course-description" name="description" maxLength={2000} rows={3} />
        <button className="primary" disabled={saving}>{saving ? "Đang tạo…" : "Lưu bản nháp"}</button>
      </form>}

      {/* Các điều khiển hoạt động trên dữ liệu đang tải; không phát sinh API tìm kiếm mới. */}
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
      {loading ? <div className="empty" role="status">Đang tải danh sách khóa học…</div>
        : error && courses.length === 0 ? <div className="empty"><p>Chưa tải được danh sách khóa học.</p></div>
        : courses.length === 0 ? <div className="empty"><h2>Chưa có khóa học</h2><p className="muted">
          {user.role === "TEACHER" ? "Tạo khóa học đầu tiên để bắt đầu." : "Giảng viên sẽ thêm bạn vào khóa học khi lớp bắt đầu."}
        </p></div>
        : visibleCourses.length === 0 ? <div className="empty"><h2>Không tìm thấy khóa học</h2>
          <p className="muted">Thử từ khóa hoặc trạng thái khác.</p>
          <button className="secondary" onClick={clearFilters}>Xóa bộ lọc</button>
        </div>
        : <div className={viewMode === "cards" ? "course-grid" : "course-list"}>
          {visibleCourses.map(course => <CourseCard key={course.id} course={course}
            selected={selectedId === course.id} onOpen={selectCourse} />)}
        </div>}

      {selectedId !== null && <section id="course-detail" className="panel lesson-panel" aria-labelledby="detail-title">
        <div className="section-bar">
          <h2 id="detail-title" ref={detailHeading} tabIndex={-1}>{detail?.course.title ?? "Nội dung khóa học"}</h2>
          <button className="secondary" onClick={() => { setSelectedId(null); setDetail(null); }}>Đóng</button>
        </div>
        {detailLoading && <p role="status">Đang tải bài học…</p>}
        {detailError && <div className="error" role="alert">{detailError}
          <button className="text-button" onClick={() => selectCourse(selectedId)}>Thử lại</button>
        </div>}
        {detail && detail.lessons.length === 0 && <p className="muted">Khóa học chưa có bài học để hiển thị.</p>}
        {detail?.lessons.map(lesson => <details key={lesson.id} className="lesson">
          <summary>{lesson.title} {!lesson.published && <span className="pill">Nháp</span>}</summary>
          <p className="lesson-content">{lesson.content}</p>
        </details>)}
      </section>}
    </section>
  );
}
