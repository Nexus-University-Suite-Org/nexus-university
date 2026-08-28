package org.nexus.nubackend.service;

import org.springframework.stereotype.Service;

import jakarta.mail.*;
import jakarta.mail.internet.*;
import java.util.Properties;

@Service
public class EmailService {

    public void sendOtpEmail(String to, String otp) {
        try {
            Properties props = new Properties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.host", "smtp.gmail.com");
            props.put("mail.smtp.port", "587");

            Session session = Session.getInstance(props, new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(
                        "waluube69alvin@gmail.com",
                        "wljk fgtl ekph tcuo"
                    );
                }
            });

            MimeMessage message = new MimeMessage(session);
            message.setFrom(new InternetAddress("waluube69alvin@gmail.com"));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to));
            message.setSubject("Your Verification Code - UniPortal");

            String html = buildHtmlEmail(otp);

            message.setContent(html, "text/html; charset=UTF-8");

            Transport.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send OTP email: " + e.getMessage(), e);
        }
    }

    private String buildHtmlEmail(String otp) {
        return "<!DOCTYPE html>"
            + "<html><head><meta charset=\"UTF-8\"></head>"
            + "<body style=\"margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;\">"
            + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#f4f6f9;padding:40px 0;\">"
            + "<tr><td align=\"center\">"
            + "<table width=\"480\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);\">"

            // Header
            + "<tr><td style=\"background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;\">"
            + "<h1 style=\"color:#ffffff;margin:0;font-size:22px;font-weight:700;\">UniPortal</h1>"
            + "<p style=\"color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;\">Account Verification</p>"
            + "</td></tr>"

            // Body
            + "<tr><td style=\"padding:40px;\">"
            + "<p style=\"color:#374151;font-size:15px;margin:0 0 8px;\">Hello,</p>"
            + "<p style=\"color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;\">"
            + "Use the following verification code to complete your password reset:</p>"

            // OTP box
            + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
            + "<td align=\"center\" style=\"padding:16px 0 24px;\">"
            + "<div style=\"background-color:#f0f0ff;border:2px dashed #6366f1;border-radius:12px;padding:16px 32px;display:inline-block;\">"
            + "<span style=\"font-size:36px;font-weight:800;letter-spacing:10px;color:#6366f1;font-family:'Courier New',monospace;\">"
            + otp + "</span></div></td></tr></table>"

            // Footer text
            + "<p style=\"color:#9ca3af;font-size:13px;text-align:center;margin:0 0 8px;\">"
            + "This code expires in <strong style=\"color:#6b7280;\">10 minutes</strong>.</p>"
            + "<p style=\"color:#9ca3af;font-size:13px;text-align:center;margin:0;\">"
            + "If you didn't request this, please ignore this email.</p>"
            + "</td></tr>"

            // Footer bar
            + "<tr><td style=\"background-color:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6;\">"
            + "<p style=\"color:#d1d5db;font-size:12px;margin:0;\">"
            + "&copy; 2026 UniPortal. All rights reserved.</p>"
            + "</td></tr>"

            + "</table></td></tr></table>"
            + "</body></html>";
    }
}
