package com.helpdesk.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@Builder
public class CommentResponse {
    private Long id;
    private String contenido;
    private Long usuarioId;
    private String usuarioNombre;
    private LocalDateTime fechaCreacion;
}