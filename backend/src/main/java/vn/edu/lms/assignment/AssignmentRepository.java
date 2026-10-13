package vn.edu.lms.assignment;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByCourseIdOrderByIdDesc(Long courseId);
    List<Assignment> findByCourseIdAndStatusOrderByIdDesc(Long courseId, AssignmentStatus status);
    List<Assignment> findByCourseIdInAndStatusOrderByIdDesc(Collection<Long> courseIds, AssignmentStatus status);
    List<Assignment> findByCourseIdInOrderByIdDesc(Collection<Long> courseIds);
    void deleteByCourseId(Long courseId);
}
