package com.helpdesk.controller;

import com.helpdesk.dto.UserResponse;
import com.helpdesk.model.Role;
import com.helpdesk.model.User;
import com.helpdesk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(toResponse(user));
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAll() {
        return ResponseEntity.ok(
                userRepository.findAll().stream().map(this::toResponse).toList()
        );
    }

    @GetMapping("/tecnicos")
    public ResponseEntity<List<UserResponse>> getTecnicos() {
        return ResponseEntity.ok(
                userRepository.findByRol(Role.TECNICO).stream().map(this::toResponse).toList()
        );
    }

    @PutMapping("/{id}/rol")
    public ResponseEntity<UserResponse> updateRol(@PathVariable Long id, @RequestBody String rol) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        user.setRol(Role.valueOf(rol.toUpperCase()));
        user = userRepository.save(user);
        return ResponseEntity.ok(toResponse(user));
    }

    private UserResponse toResponse(User u) {
        return UserResponse.builder()
                .id(u.getId())
                .nombre(u.getNombre())
                .email(u.getEmail())
                .rol(u.getRol().name())
                .fechaRegistro(u.getFechaRegistro())
                .build();
    }
}
