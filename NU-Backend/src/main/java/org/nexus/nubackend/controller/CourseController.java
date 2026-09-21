package org.nexus.nubackend.controller;

import org.nexus.nubackend.dto.*;
import org.nexus.nubackend.service.CourseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:5175"})
public class CourseController {

    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping("/courses/units")
    public ResponseEntity<List<CourseUnitResponse>> listUnits() {
        return ResponseEntity.ok(courseService.listAllUnits());
    }

    @GetMapping("/courses/units/{unitId}")
    public ResponseEntity<CourseUnitResponse> getUnit(@PathVariable Long unitId) {
        return ResponseEntity.ok(courseService.getUnit(unitId));
    }

    @PostMapping("/courses/units")
    public ResponseEntity<CourseUnitResponse> createUnit(@RequestBody CreateUnitRequest request) {
        return ResponseEntity.ok(courseService.createUnit(request));
    }

    @GetMapping("/courses/units/{unitId}/content")
    public ResponseEntity<List<ContentItemResponse>> getUnitContent(@PathVariable Long unitId) {
        return ResponseEntity.ok(courseService.getUnitContent(unitId));
    }

    @PostMapping("/courses/units/{unitId}/content")
    public ResponseEntity<ContentItemResponse> addContent(@PathVariable Long unitId,
                                                          @RequestBody CreateContentRequest request) {
        return ResponseEntity.ok(courseService.addContent(unitId, request));
    }

    @GetMapping("/students/{studentId}/courses")
    public ResponseEntity<List<CourseUnitResponse>> getStudentCourses(@PathVariable String studentId) {
        return ResponseEntity.ok(courseService.listEnrolledCourses(studentId));
    }

    @PostMapping("/students/{studentId}/enrollments")
    public ResponseEntity<CourseUnitResponse> enroll(@PathVariable String studentId,
                                                     @RequestBody EnrollRequest request) {
        return ResponseEntity.ok(courseService.enroll(studentId, request.courseUnitId()));
    }
}