package com.helpdesk.service;

import com.helpdesk.dto.CommentResponse;
import com.helpdesk.model.Comentario;
import com.helpdesk.model.Incident;
import com.helpdesk.model.User;
import com.helpdesk.repository.ComentarioRepository;
import com.helpdesk.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final ComentarioRepository comentarioRepository;
    private final IncidentRepository incidentRepository;

    public CommentResponse addComentario(Long incidentId, String contenido, User user) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new RuntimeException("Incidente no encontrado"));

        Comentario comentario = Comentario.builder()
                .contenido(contenido)
                .usuario(user)
                .incident(incident)
                .build();

        comentario = comentarioRepository.save(comentario);
        return toResponse(comentario);
    }

    public List<CommentResponse> getComentarios(Long incidentId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new RuntimeException("Incidente no encontrado"));
        return comentarioRepository.findByIncidentOrderByFechaCreacionAsc(incident)
                .stream().map(this::toResponse).toList();
    }

    private CommentResponse toResponse(Comentario c) {
        return CommentResponse.builder()
                .id(c.getId())
                .contenido(c.getContenido())
                .usuarioId(c.getUsuario().getId())
                .usuarioNombre(c.getUsuario().getNombre())
                .fechaCreacion(c.getFechaCreacion())
                .build();
    }
}