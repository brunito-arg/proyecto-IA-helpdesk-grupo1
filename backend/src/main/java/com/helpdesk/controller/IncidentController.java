package com.helpdesk.controller;

import com.helpdesk.dto.CloseIncidentRequest;
import com.helpdesk.dto.IncidentRequest;
import com.helpdesk.dto.IncidentResponse;
import com.helpdesk.model.Role;
import com.helpdesk.model.User;
import com.helpdesk.service.FileStorageService;
import com.helpdesk.service.IncidentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentService incidentService;
    private final FileStorageService fileStorageService;

    @PostMapping
    public ResponseEntity<IncidentResponse> create(
            @Valid @RequestPart("data") IncidentRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal User user) {
        String archivoUrl = null;
        if (file != null && !file.isEmpty()) {
            archivoUrl = fileStorageService.storeFile(file);
        }
        return ResponseEntity.ok(incidentService.create(request, user.getId(), archivoUrl));
    }

    @GetMapping
    public ResponseEntity<List<IncidentResponse>> getAll(@AuthenticationPrincipal User user) {
        if (user.getRol() == Role.ADMIN || user.getRol() == Role.TECNICO) {
            return ResponseEntity.ok(incidentService.getAll());
        }
        return ResponseEntity.ok(incidentService.getByUser(user.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<IncidentResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(incidentService.getById(id));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<IncidentResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody String estado) {
        return ResponseEntity.ok(incidentService.updateStatus(id, estado));
    }

    @PutMapping("/{id}/close")
    public ResponseEntity<IncidentResponse> close(
            @PathVariable Long id,
            @Valid @RequestBody CloseIncidentRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(incidentService.cerrarIncidente(id, request.getNota(), user));
    }

    @PutMapping("/{id}/assign/{tecnicoId}")
    public ResponseEntity<IncidentResponse> assignTecnico(
            @PathVariable Long id,
            @PathVariable Long tecnicoId) {
        return ResponseEntity.ok(incidentService.assignTecnico(id, tecnicoId));
    }
}
