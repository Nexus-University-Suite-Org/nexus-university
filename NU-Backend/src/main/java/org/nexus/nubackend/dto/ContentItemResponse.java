package org.nexus.nubackend.dto;

public record ContentItemResponse(
    Long id,
    Long courseUnitId,
    String section,
    String title,
    String type,
    String content,
    String url,
    String fileUrl,
    String fileName,
    Integer displayOrder
) {}