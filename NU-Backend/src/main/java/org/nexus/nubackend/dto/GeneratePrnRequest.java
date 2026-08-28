package org.nexus.nubackend.dto;

import java.math.BigDecimal;

public record GeneratePrnRequest(
    String studentId,
    Long feeId,
    BigDecimal amount,
    String purpose
) {}
