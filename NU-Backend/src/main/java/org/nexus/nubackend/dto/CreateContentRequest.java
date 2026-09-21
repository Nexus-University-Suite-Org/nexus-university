package org.nexus.nubackend.dto;

public record CreateContentRequest(
    String section,
    String title,
    String type,
    String content,
    String url,
    String fileUrl,
    String fileName,
    Integer displayOrder
) {}