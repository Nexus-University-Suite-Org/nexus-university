package org.nexus.nubackend.dto;

public record CreateUnitRequest(
    String code,
    String name,
    String courseCode,
    String courseName,
    Integer semester,
    Integer year,
    Integer credits,
    String description
) {}