package org.nexus.nubackend.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    private static final int OTP_LENGTH = 4;
    private static final long OTP_EXPIRY_SECONDS = 600; // 10 minutes

    private final Map<String, OtpEntry> store = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public String generateAndStore(String email) {
        String code = generateCode();
        store.put(email.toLowerCase(), new OtpEntry(code, Instant.now().plusSeconds(OTP_EXPIRY_SECONDS)));
        return code;
    }

    public boolean verify(String email, String code) {
        OtpEntry entry = store.get(email.toLowerCase());
        if (entry == null) return false;
        if (Instant.now().isAfter(entry.expiresAt())) {
            store.remove(email.toLowerCase());
            return false;
        }
        boolean matches = entry.code().equals(code);
        if (matches) {
            store.remove(email.toLowerCase());
        }
        return matches;
    }

    private String generateCode() {
        int bound = (int) Math.pow(10, OTP_LENGTH);
        int num = random.nextInt(bound);
        return String.format("%0" + OTP_LENGTH + "d", num);
    }

    private record OtpEntry(String code, Instant expiresAt) {}
}
