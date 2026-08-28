package org.nexus.nubackend.repository;

import org.nexus.nubackend.model.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    List<PaymentTransaction> findByStudentIdOrderByCreatedAtDesc(String studentId);
    List<PaymentTransaction> findByPaymentReferenceIdOrderByCreatedAtDesc(Long prnId);
    Optional<PaymentTransaction> findByTransactionRef(String transactionRef);
}
