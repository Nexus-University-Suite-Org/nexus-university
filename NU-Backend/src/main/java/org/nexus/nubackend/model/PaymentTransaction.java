package org.nexus.nubackend.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "payment_transaction")
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prn_id", nullable = false)
    private PaymentReference paymentReference;

    @Column(nullable = false)
    private String studentId;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String paymentMethod;

    private String transactionRef;

    @Column(nullable = false)
    private String status = "pending";

    private Instant paidAt;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public PaymentTransaction() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public PaymentReference getPaymentReference() { return paymentReference; }
    public void setPaymentReference(PaymentReference paymentReference) { this.paymentReference = paymentReference; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getTransactionRef() { return transactionRef; }
    public void setTransactionRef(String transactionRef) { this.transactionRef = transactionRef; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getPaidAt() { return paidAt; }
    public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
