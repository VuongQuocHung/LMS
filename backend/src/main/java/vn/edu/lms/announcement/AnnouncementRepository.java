package vn.edu.lms.announcement;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementRepository extends JpaRepository<CourseAnnouncement, Long> {
    List<CourseAnnouncement> findByCourseIdOrderByCreatedAtDesc(Long courseId);
    void deleteByCourseId(Long courseId);
}
