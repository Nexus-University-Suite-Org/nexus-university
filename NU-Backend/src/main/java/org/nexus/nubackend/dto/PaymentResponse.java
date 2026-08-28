package org.nexus.nubackend.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentResponse(
    Long id,
    Long prnId,
    String prnCode,
    String studentId,
    BigDecimal amount,
    String paymentMethod,
    String transactionRef,
    String status,
    Instant paidAt,
    Instant createdAt
) {}
