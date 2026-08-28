package org.nexus.nubackend.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record PrnResponse(
    Long id,
    String prnCode,
    String studentId,
    Long feeId,
    BigDecimal amount,
    String purpose,
    String status,
    String paymentMethod,
    Instant createdAt,
    Instant expiresAt
) {}
