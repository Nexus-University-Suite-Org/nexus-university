package org.nexus.nubackend.repository;

import org.nexus.nubackend.model.StudentCourseEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StudentCourseEnrollmentRepository extends JpaRepository<StudentCourseEnrollment, Long> {
    List<StudentCourseEnrollment> findByStudentId(String studentId);
    Optional<StudentCourseEnrollment> findByStudentIdAndCourseUnitId(String studentId, Long courseUnitId);
    boolean existsByStudentIdAndCourseUnitId(String studentId, Long courseUnitId);
}