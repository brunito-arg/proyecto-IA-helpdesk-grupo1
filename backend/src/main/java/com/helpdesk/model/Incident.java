package com.helpdesk.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "incidents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Incident {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String descripcion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category categoria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority prioridad;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentStatus estado;

    @Column(name = "archivo_url", length = 500)
    private String archivoUrl;

    @Column(name = "nota_resolucion", columnDefinition = "TEXT")
    private String notaResolucion;

    @Column(name = "github_issue_url", length = 500)
    private String githubIssueUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private User usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tecnico_id")
    private User tecnico;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;

    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
        fechaActualizacion = LocalDateTime.now();
        if (estado == null) estado = IncidentStatus.ABIERTO;
        if (categoria == null) categoria = Category.OTRO;
        if (prioridad == null) prioridad = Priority.MEDIA;
    }

    @PreUpdate
    protected void onUpdate() {
        fechaActualizacion = LocalDateTime.now();
    }
}
