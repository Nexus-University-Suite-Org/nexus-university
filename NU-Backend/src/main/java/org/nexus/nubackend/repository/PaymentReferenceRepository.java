package org.nexus.nubackend.repository;

import org.nexus.nubackend.model.PaymentReference;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PaymentReferenceRepository extends JpaRepository<PaymentReference, Long> {
    List<PaymentReference> findByStudentIdOrderByCreatedAtDesc(String studentId);
    Optional<PaymentReference> findByPrnCode(String prnCode);
    List<PaymentReference> findByStudentIdAndStatusOrderByCreatedAtDesc(String studentId, String status);
}
