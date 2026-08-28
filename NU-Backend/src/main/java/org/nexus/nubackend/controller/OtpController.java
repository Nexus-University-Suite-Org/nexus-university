package org.nexus.nubackend.controller;

import org.nexus.nubackend.service.EmailService;
import org.nexus.nubackend.service.OtpService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth/otp")
@CrossOrigin(origins = "*")
public class OtpController {

    private final OtpService otpService;
    private final EmailService emailService;

    public OtpController(OtpService otpService, EmailService emailService) {
        this.otpService = otpService;
        this.emailService = emailService;
    }

    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "ok", false,
                "message", "Email is required"
            ));
        }

        try {
            String code = otpService.generateAndStore(email);
            emailService.sendOtpEmail(email, code);

            return ResponseEntity.ok(Map.of(
                "ok", true,
                "message", "OTP sent successfully",
                "emailSent", true
            ));
        } catch (Exception e) {
            String rootMsg = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
            return ResponseEntity.internalServerError().body(Map.of(
                "ok", false,
                "message", "Failed to send OTP: " + rootMsg
            ));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");

        if (email == null || otp == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "ok", false,
                "message", "Email and OTP are required"
            ));
        }

        boolean valid = otpService.verify(email, otp);
        return ResponseEntity.ok(Map.of(
            "ok", valid,
            "verified", valid
        ));
    }
}
