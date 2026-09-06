package org.nexus.nubackend.controller;

import org.nexus.nubackend.dto.*;
import org.nexus.nubackend.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"})
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/prn/generate")
    public ResponseEntity<PrnResponse> generatePrn(@RequestBody GeneratePrnRequest request) {
        return ResponseEntity.ok(paymentService.generatePrn(request));
    }

    @PostMapping("/record")
    public ResponseEntity<PaymentResponse> recordPayment(@RequestBody RecordPaymentRequest request) {
        return ResponseEntity.ok(paymentService.recordPayment(request));
    }

    @GetMapping("/status/{transactionRef}")
    public ResponseEntity<PaymentResponse> checkStatus(@PathVariable String transactionRef) {
        return ResponseEntity.ok(paymentService.checkPaymentStatus(transactionRef));
    }

    @GetMapping("/prn/{studentId}")
    public ResponseEntity<List<PrnResponse>> getPrns(@PathVariable String studentId) {
        return ResponseEntity.ok(paymentService.getPrnsByStudent(studentId));
    }

    @GetMapping("/transactions/{studentId}")
    public ResponseEntity<List<PaymentResponse>> getPayments(@PathVariable String studentId) {
        return ResponseEntity.ok(paymentService.getPaymentsByStudent(studentId));
    }
}
