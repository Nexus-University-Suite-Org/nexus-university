package org.nexus.nubackend.controller;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Student authentication is no longer served by this service.
 *
 * <p>Applicant credentials and the admission decision both live in the Nexus
 * Application Portal (NAP) database, so login is verified there against
 * {@code applications.password_hash} and is only granted once the application
 * status is ADMITTED. This service previously answered with a hardcoded
 * in-memory credential map, which accepted a fixed set of demo logins and
 * returned the same fabricated identity for all of them.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final String ADMISSIONS_BASE_URL = "https://backend-production-b8c2b.up.railway.app";

    @PostMapping({"/login", "/student/login"})
    public ResponseEntity<Map<String, Object>> retired() {
        return ResponseEntity.status(HttpStatus.GONE).body(Map.of(
                "error", "Student login is not handled by this service",
                "message", "POST /api/v1/auth/student/login on " + ADMISSIONS_BASE_URL
                        + " and sign in with the email and password used in the application portal. "
                        + "Access is granted once the application status is ADMITTED.",
                "loginUrl", ADMISSIONS_BASE_URL + "/api/v1/auth/student/login"
        ));
    }
}
