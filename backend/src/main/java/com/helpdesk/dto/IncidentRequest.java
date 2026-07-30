package com.helpdesk.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class IncidentRequest {
    @NotBlank
    private String titulo;
    @NotBlank
    private String descripcion;
    @NotNull
    private String categoria;
    private String prioridad;
}
