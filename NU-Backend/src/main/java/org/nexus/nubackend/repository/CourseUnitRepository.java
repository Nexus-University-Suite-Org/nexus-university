package org.nexus.nubackend.repository;

import org.nexus.nubackend.model.CourseUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CourseUnitRepository extends JpaRepository<CourseUnit, Long> {
    List<CourseUnit> findByCourseCodeOrderByAcademicYearAscSemesterAsc(String courseCode);
    Optional<CourseUnit> findByCode(String code);
    List<CourseUnit> findAllByOrderByAcademicYearAscSemesterAscIdAsc();
}