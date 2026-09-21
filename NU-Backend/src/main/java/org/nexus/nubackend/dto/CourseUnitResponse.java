package org.nexus.nubackend.dto;

public record CourseUnitResponse(
    Long id,
    String code,
    String name,
    String courseCode,
    String courseName,
    Integer semester,
    Integer year,
    Integer credits,
    String description
) {}