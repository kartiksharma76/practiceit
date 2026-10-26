package com.kartik.googleforms.security;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TokenUtil {

    // Maps session token -> userId
    private final Map<String, Long> activeSessions = new ConcurrentHashMap<>();

    public String createSession(Long userId) {
        String token = UUID.randomUUID().toString() + "-" + System.currentTimeMillis();
        activeSessions.put(token, userId);
        return token;
    }

    public Long getUserIdFromToken(String token) {
        if (token == null || token.isBlank()) return null;
        return activeSessions.get(token);
    }

    public void invalidateSession(String token) {
        if (token != null) {
            activeSessions.remove(token);
        }
    }

    public String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        return authHeader;
    }
}
