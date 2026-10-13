"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, errorMessage, isSessionError } from "@/lib/api";
import type { CourseDetail, User } from "@/lib/types";
import PortalShell from "@/components/PortalShell";
import CourseWorkspace from "@/components/CourseWorkspace";

export default function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = Number(resolvedParams.courseId);

  return (
    <PortalShell>
      {user => <CourseWorkspaceView courseId={courseId} user={user} />}
    </PortalShell>
  );
}

function CourseWorkspaceView({
  courseId,
  user,
}: {
  courseId: number;
  user: User;
}) {
  const router = useRouter();
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api<CourseDetail>(`/courses/${courseId}`)
      .then(d => {
        if (active) setCourseDetail(d);
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
    return <div className="empty" role="status">Đang tải thông tin khóa học…</div>;
  }

  if (error || !courseDetail) {
    return (
      <div className="empty">
        <h2>Không thể tải khóa học</h2>
        <p className="error" role="alert">{error || "Khóa học không tồn tại."}</p>
        <Link href="/" className="primary" style={{ display: "inline-block", marginTop: "12px" }}>
          ← Quay lại danh sách khóa học
        </Link>
      </div>
    );
  }

  return (
    <div>
      <CourseWorkspace
        user={user}
        onSessionExpired={() => router.push("/")}
        selectedCourseId={courseId}
        onSelectCourse={course => {
          if (!course) {
            router.push("/");
          }
        }}
      />
    </div>
  );
}
