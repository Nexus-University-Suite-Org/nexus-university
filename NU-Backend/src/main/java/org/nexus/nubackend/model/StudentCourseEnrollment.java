package org.nexus.nubackend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "student_course_enrollment",
    uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "course_unit_id"})
)
public class StudentCourseEnrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String studentId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_unit_id", nullable = false)
    private CourseUnit courseUnit;

    @Column(nullable = false)
    private String status = "approved";

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public StudentCourseEnrollment() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public CourseUnit getCourseUnit() { return courseUnit; }
    public void setCourseUnit(CourseUnit courseUnit) { this.courseUnit = courseUnit; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}