package org.nexus.nubackend.service;

import org.nexus.nubackend.dto.*;
import org.nexus.nubackend.model.PaymentReference;
import org.nexus.nubackend.model.PaymentTransaction;
import org.nexus.nubackend.repository.PaymentReferenceRepository;
import org.nexus.nubackend.repository.PaymentTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class PaymentService {

    private final PaymentReferenceRepository prnRepo;
    private final PaymentTransactionRepository txnRepo;
    private final SecureRandom random = new SecureRandom();

    public PaymentService(PaymentReferenceRepository prnRepo, PaymentTransactionRepository txnRepo) {
        this.prnRepo = prnRepo;
        this.txnRepo = txnRepo;
    }

    @Transactional
    public PrnResponse generatePrn(GeneratePrnRequest request) {
        String prefix = request.purpose().substring(0, Math.min(3, request.purpose().length())).toUpperCase();
        String timestamp = Long.toString(System.currentTimeMillis(), 36).toUpperCase();
        String rand = Integer.toString(random.nextInt(999999), 36).toUpperCase();
        String prnCode = "PRN-" + prefix + "-" + timestamp + "-" + String.format("%06d", random.nextInt(999999));

        PaymentReference prn = new PaymentReference();
        prn.setPrnCode(prnCode);
        prn.setStudentId(request.studentId());
        prn.setFeeId(request.feeId());
        prn.setAmount(request.amount());
        prn.setPurpose(request.purpose());
        prn.setStatus("pending");
        prn.setCreatedAt(Instant.now());
        prn.setExpiresAt(Instant.now().plus(48, ChronoUnit.HOURS));

        prn = prnRepo.save(prn);
        return toPrnResponse(prn);
    }

    @Transactional
    public PaymentResponse recordPayment(RecordPaymentRequest request) {
        PaymentReference prn = prnRepo.findById(request.prnId())
            .orElseThrow(() -> new RuntimeException("PRN not found"));

        if ("paid".equals(prn.getStatus())) {
            throw new RuntimeException("PRN already paid");
        }

        PaymentTransaction txn = new PaymentTransaction();
        txn.setPaymentReference(prn);
        txn.setStudentId(request.studentId());
        txn.setAmount(request.amount());
        txn.setPaymentMethod(request.paymentMethod());
        txn.setTransactionRef(request.transactionRef());
        txn.setStatus("confirmed");
        txn.setPaidAt(Instant.now());
        txn.setCreatedAt(Instant.now());

        prn.setStatus("paid");
        prn.setPaymentMethod(request.paymentMethod());
        prnRepo.save(prn);
        txn = txnRepo.save(txn);

        return toPaymentResponse(txn);
    }

    @Transactional
    public PaymentResponse checkPaymentStatus(String transactionRef) {
        PaymentTransaction txn = txnRepo.findByTransactionRef(transactionRef)
            .orElseThrow(() -> new RuntimeException("Transaction not found"));
        return toPaymentResponse(txn);
    }

    public List<PrnResponse> getPrnsByStudent(String studentId) {
        return prnRepo.findByStudentIdOrderByCreatedAtDesc(studentId)
            .stream().map(this::toPrnResponse).toList();
    }

    public List<PaymentResponse> getPaymentsByStudent(String studentId) {
        return txnRepo.findByStudentIdOrderByCreatedAtDesc(studentId)
            .stream().map(this::toPaymentResponse).toList();
    }

    private PrnResponse toPrnResponse(PaymentReference prn) {
        return new PrnResponse(
            prn.getId(), prn.getPrnCode(), prn.getStudentId(), prn.getFeeId(),
            prn.getAmount(), prn.getPurpose(), prn.getStatus(), prn.getPaymentMethod(),
            prn.getCreatedAt(), prn.getExpiresAt()
        );
    }

    private PaymentResponse toPaymentResponse(PaymentTransaction txn) {
        return new PaymentResponse(
            txn.getId(), txn.getPaymentReference().getId(), txn.getPaymentReference().getPrnCode(),
            txn.getStudentId(), txn.getAmount(), txn.getPaymentMethod(),
            txn.getTransactionRef(), txn.getStatus(), txn.getPaidAt(), txn.getCreatedAt()
        );
    }
}
