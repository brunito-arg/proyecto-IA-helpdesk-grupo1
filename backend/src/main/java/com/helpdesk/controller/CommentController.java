package com.helpdesk.controller;

import com.helpdesk.dto.CommentRequest;
import com.helpdesk.dto.CommentResponse;
import com.helpdesk.model.User;
import com.helpdesk.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/incidents/{id}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping
    public ResponseEntity<List<CommentResponse>> getByIncident(@PathVariable Long id) {
        return ResponseEntity.ok(commentService.getComentarios(id));
    }

    @PostMapping
    public ResponseEntity<CommentResponse> create(
            @PathVariable Long id,
            @Valid @RequestBody CommentRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(commentService.addComentario(id, request.getContenido(), user));
    }
}