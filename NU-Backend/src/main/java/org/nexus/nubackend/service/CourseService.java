package org.nexus.nubackend.service;

import org.nexus.nubackend.dto.*;
import org.nexus.nubackend.exception.NotFoundException;
import org.nexus.nubackend.model.ContentItem;
import org.nexus.nubackend.model.CourseUnit;
import org.nexus.nubackend.model.StudentCourseEnrollment;
import org.nexus.nubackend.repository.ContentItemRepository;
import org.nexus.nubackend.repository.CourseUnitRepository;
import org.nexus.nubackend.repository.StudentCourseEnrollmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class CourseService {

    private final CourseUnitRepository unitRepo;
    private final StudentCourseEnrollmentRepository enrollmentRepo;
    private final ContentItemRepository contentRepo;

    public CourseService(CourseUnitRepository unitRepo,
                         StudentCourseEnrollmentRepository enrollmentRepo,
                         ContentItemRepository contentRepo) {
        this.unitRepo = unitRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.contentRepo = contentRepo;
    }

    public List<CourseUnitResponse> listAllUnits() {
        return unitRepo.findAllByOrderByAcademicYearAscSemesterAscIdAsc()
            .stream().map(this::toUnitResponse).toList();
    }

    public List<CourseUnitResponse> listEnrolledCourses(String studentId) {
        return enrollmentRepo.findByStudentId(studentId).stream()
            .map(e -> toUnitResponse(e.getCourseUnit()))
            .toList();
    }

    public CourseUnitResponse getUnit(Long unitId) {
        return toUnitResponse(findUnit(unitId));
    }

    @Transactional
    public CourseUnitResponse createUnit(CreateUnitRequest request) {
        validateUnitRequest(request);
        CourseUnit unit = new CourseUnit();
        unit.setCode(request.code().trim().toUpperCase());
        unit.setName(request.name());
        unit.setCourseCode(request.courseCode());
        unit.setCourseName(request.courseName());
        unit.setSemester(request.semester());
        unit.setAcademicYear(request.year());
        unit.setCredits(request.credits());
        unit.setDescription(request.description());
        return toUnitResponse(unitRepo.save(unit));
    }

    @Transactional
    public CourseUnitResponse enroll(String studentId, Long courseUnitId) {
        CourseUnit unit = findUnit(courseUnitId);
        if (enrollmentRepo.existsByStudentIdAndCourseUnitId(studentId, courseUnitId)) {
            throw new IllegalArgumentException("Already enrolled in this course unit");
        }
        StudentCourseEnrollment enrollment = new StudentCourseEnrollment();
        enrollment.setStudentId(studentId);
        enrollment.setCourseUnit(unit);
        enrollment.setStatus("approved");
        enrollmentRepo.save(enrollment);
        return toUnitResponse(unit);
    }

    public List<ContentItemResponse> getUnitContent(Long unitId) {
        findUnit(unitId);
        return contentRepo.findByCourseUnitIdOrderByDisplayOrderAscIdAsc(unitId)
            .stream().map(this::toContentResponse).toList();
    }

    @Transactional
    public ContentItemResponse addContent(Long unitId, CreateContentRequest request) {
        if (request.title() == null || request.title().isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }
        if (request.type() == null || request.type().isBlank()) {
            throw new IllegalArgumentException("Type is required");
        }
        String type = request.type().trim().toUpperCase();
        if (!List.of("FILE", "PAGE", "URL", "BOOK", "LABEL").contains(type)) {
            throw new IllegalArgumentException("Unsupported content type: " + type);
        }
        CourseUnit unit = findUnit(unitId);
        ContentItem item = new ContentItem();
        item.setCourseUnit(unit);
        item.setSection(request.section() == null || request.section().isBlank() ? "General" : request.section());
        item.setTitle(request.title());
        item.setType(type);
        item.setContent(request.content());
        item.setUrl(request.url());
        item.setFileUrl(request.fileUrl());
        item.setFileName(request.fileName());
        item.setDisplayOrder(request.displayOrder() == null ? 0 : request.displayOrder());
        return toContentResponse(contentRepo.save(item));
    }

    private CourseUnit findUnit(Long unitId) {
        return unitRepo.findById(unitId)
            .orElseThrow(() -> new NotFoundException("Course unit not found"));
    }

    private void validateUnitRequest(CreateUnitRequest request) {
        if (request.code() == null || request.code().isBlank()) {
            throw new IllegalArgumentException("Unit code is required");
        }
        if (request.name() == null || request.name().isBlank()) {
            throw new IllegalArgumentException("Unit name is required");
        }
        if (request.courseCode() == null || request.courseCode().isBlank()) {
            throw new IllegalArgumentException("Course code is required");
        }
    }

    private CourseUnitResponse toUnitResponse(CourseUnit unit) {
        return new CourseUnitResponse(
            unit.getId(), unit.getCode(), unit.getName(),
            unit.getCourseCode(), unit.getCourseName(),
            unit.getSemester(), unit.getAcademicYear(), unit.getCredits(),
            unit.getDescription()
        );
    }

    private ContentItemResponse toContentResponse(ContentItem item) {
        return new ContentItemResponse(
            item.getId(), item.getCourseUnit().getId(),
            item.getSection(), item.getTitle(), item.getType(),
            item.getContent(), item.getUrl(), item.getFileUrl(),
            item.getFileName(), item.getDisplayOrder()
        );
    }
}