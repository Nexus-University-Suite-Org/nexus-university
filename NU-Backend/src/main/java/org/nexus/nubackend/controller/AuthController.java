package org.nexus.nubackend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:5175"})
public class AuthController {

    private static final Map<String, String> DEMO_CREDENTIALS = Map.of(
        "student@university.edu", "student123",
        "2100712345", "student123",
        "21/U/12345/PS", "student123",
        "lecturer@university.edu", "lecturer123",
        "registrar@university.edu", "registrar123"
    );

    @PostMapping({"/login", "/student/login"})
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String email = normalize(body.get("email"));
        String identifier = normalize(body.get("identifier"));
        String password = body.getOrDefault("password", "").trim();

        String lookupKey = email != null ? email : identifier;
        if (lookupKey == null || lookupKey.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Email or student number is required"
            ));
        }

        if (password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Password is required"
            ));
        }

        String storedPassword = DEMO_CREDENTIALS.get(lookupKey.toLowerCase());
        if (storedPassword == null) {
            String fallback = DEMO_CREDENTIALS.get(lookupKey);
            if (fallback == null) {
                return ResponseEntity.status(401).body(Map.of(
                    "error", "Invalid credentials"
                ));
            }
            storedPassword = fallback;
        }

        if (!storedPassword.equals(password)) {
            return ResponseEntity.status(401).body(Map.of(
                "error", "Invalid credentials"
            ));
        }

        String emailValue = lookupKey.contains("@") ? lookupKey.toLowerCase() : "student@university.edu";
        String userId = "STU-1001";
        String fullName = "Student Demo";

        Map<String, Object> user = new HashMap<>();
        user.put("id", userId);
        user.put("email", emailValue);
        user.put("fullName", fullName);
        user.put("role", "student");

        Map<String, Object> profile = new HashMap<>();
        profile.put("applicationId", userId);
        profile.put("prn", "STU-1001");
        profile.put("fullName", fullName);
        profile.put("email", emailValue);
        profile.put("phoneNumber", "+254700000000");
        profile.put("programChoice1", "Bachelor of Computer Science");
        profile.put("programChoice2", "Bachelor of Business Information Systems");
        profile.put("programChoice3", "Bachelor of Software Engineering");
        profile.put("programChoice4", "Bachelor of Data Science");
        profile.put("assignedProgramme", "Bachelor of Computer Science");
        profile.put("status", "active");
        profile.put("studyMode", "Full-time");
        profile.put("academicYear", "2026");
        profile.put("startDate", "2026-09-01");

        Map<String, Object> response = new HashMap<>();
        response.put("token", UUID.randomUUID().toString());
        response.put("user", user);
        response.put("profile", profile);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/student/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, String> body) {
        String identifier = normalize(body.get("email"));
        String altIdentifier = normalize(body.get("identifier"));
        String newPassword = body.getOrDefault("newPassword", "").trim();

        if ((identifier == null && altIdentifier == null) || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Email or student number and new password are required"
            ));
        }

        return ResponseEntity.ok(Map.of(
            "ok", true,
            "message", "Password reset successfully"
        ));
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
