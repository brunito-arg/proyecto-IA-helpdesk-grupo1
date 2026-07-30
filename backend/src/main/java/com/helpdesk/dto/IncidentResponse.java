package com.helpdesk.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@Builder
public class IncidentResponse {
    private Long id;
    private String titulo;
    private String descripcion;
    private String categoria;
    private String prioridad;
    private String estado;
    private String archivoUrl;
    private Long usuarioId;
    private String usuarioNombre;
    private Long tecnicoId;
    private String tecnicoNombre;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
}
