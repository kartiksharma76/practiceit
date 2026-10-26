package com.kartik.googleforms.service;

import com.kartik.googleforms.dto.AuthResponse;
import com.kartik.googleforms.dto.LoginRequest;
import com.kartik.googleforms.dto.RegisterRequest;
import com.kartik.googleforms.model.Role;
import com.kartik.googleforms.model.User;
import com.kartik.googleforms.repository.UserRepository;
import com.kartik.googleforms.security.PasswordUtil;
import com.kartik.googleforms.security.TokenUtil;

import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final TokenUtil tokenUtil;

    public AuthService(UserRepository userRepository, TokenUtil tokenUtil) {
        this.userRepository = userRepository;
        this.tokenUtil = tokenUtil;
    }

    // Seed default administrative and candidate accounts if not existing
    @PostConstruct
    public void seedInitialUsers() {
        if (!userRepository.existsByEmail("kartik@example.com")) {
            String salt = PasswordUtil.generateSalt();
            String hash = PasswordUtil.hashPassword("Kartik@2026", salt);
            User admin = new User("Kartik Sharma (Admin)", "kartik@example.com", hash, salt, Role.ROLE_ADMIN);
            userRepository.save(admin);
        }

        if (!userRepository.existsByEmail("candidate@example.com")) {
            String salt = PasswordUtil.generateSalt();
            String hash = PasswordUtil.hashPassword("Candidate@123", salt);
            User candidate = new User("Sample Candidate", "candidate@example.com", hash, salt, Role.ROLE_CANDIDATE);
            userRepository.save(candidate);
        }
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        Role userRole = Role.ROLE_CANDIDATE;
        if (request.getRole() != null) {
            try {
                userRole = Role.valueOf(request.getRole().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                userRole = Role.ROLE_CANDIDATE;
            }
        }

        String salt = PasswordUtil.generateSalt();
        String passwordHash = PasswordUtil.hashPassword(request.getPassword(), salt);

        User user = new User(request.getName().trim(), email, passwordHash, salt, userRole);
        user = userRepository.save(user);

        String token = tokenUtil.createSession(user.getId());

        return new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                "Registration successful"
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        boolean valid = PasswordUtil.verifyPassword(request.getPassword(), user.getPasswordSalt(), user.getPasswordHash());

        if (!valid) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String token = tokenUtil.createSession(user.getId());

        return new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                "Login successful"
        );
    }

    @Transactional(readOnly = true)
    public User getCurrentUser(String token) {
        Long userId = tokenUtil.getUserIdFromToken(token);
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired session token");
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    public void logout(String token) {
        tokenUtil.invalidateSession(token);
    }
}
