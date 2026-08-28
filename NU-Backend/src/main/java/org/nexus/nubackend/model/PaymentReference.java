package org.nexus.nubackend.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payment_reference")
public class PaymentReference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String prnCode;

    @Column(nullable = false)
    private String studentId;

    private Long feeId;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String purpose;

    @Column(nullable = false)
    private String status = "pending";

    private String paymentMethod;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant expiresAt;

    public PaymentReference() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPrnCode() { return prnCode; }
    public void setPrnCode(String prnCode) { this.prnCode = prnCode; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public Long getFeeId() { return feeId; }
    public void setFeeId(Long feeId) { this.feeId = feeId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}
