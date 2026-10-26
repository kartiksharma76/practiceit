package com.kartik.googleforms.controller;

import com.kartik.googleforms.dto.AuthResponse;
import com.kartik.googleforms.dto.LoginRequest;
import com.kartik.googleforms.dto.RegisterRequest;
import com.kartik.googleforms.model.User;
import com.kartik.googleforms.security.TokenUtil;
import com.kartik.googleforms.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;
    private final TokenUtil tokenUtil;

    public AuthController(AuthService authService, TokenUtil tokenUtil) {
        this.authService = authService;
        this.tokenUtil = tokenUtil;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public Map<String, Object> getCurrentUser(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = tokenUtil.extractToken(authHeader);
        User user = authService.getCurrentUser(token);

        return Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "role", user.getRole().name(),
                "createdAt", user.getCreatedAt()
        );
    }

    @PostMapping("/logout")
    public Map<String, String> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = tokenUtil.extractToken(authHeader);
        authService.logout(token);
        return Map.of("message", "Logged out successfully");
    }
}
