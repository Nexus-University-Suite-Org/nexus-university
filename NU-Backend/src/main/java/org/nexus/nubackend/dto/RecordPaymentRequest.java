package org.nexus.nubackend.dto;

import java.math.BigDecimal;

public record RecordPaymentRequest(
    String studentId,
    Long prnId,
    BigDecimal amount,
    String paymentMethod,
    String transactionRef
) {}
