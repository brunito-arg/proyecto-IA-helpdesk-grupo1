package com.helpdesk.service;

import com.helpdesk.dto.IncidentRequest;
import com.helpdesk.dto.IncidentResponse;
import com.helpdesk.model.*;
import com.helpdesk.repository.IncidentRepository;
import com.helpdesk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;

    public IncidentResponse create(IncidentRequest request, Long usuarioId, String archivoUrl) {
        User usuario = userRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Incident incident = Incident.builder()
                .titulo(request.getTitulo())
                .descripcion(request.getDescripcion())
                .categoria(Category.valueOf(request.getCategoria().toUpperCase()))
                .prioridad(request.getPrioridad() != null
                        ? Priority.valueOf(request.getPrioridad().toUpperCase())
                        : Priority.MEDIA)
                .estado(IncidentStatus.ABIERTO)
                .archivoUrl(archivoUrl)
                .usuario(usuario)
                .build();

        incident = incidentRepository.save(incident);
        return toResponse(incident);
    }

    public List<IncidentResponse> getAll() {
        return incidentRepository.findAllByOrderByFechaCreacionDesc()
                .stream().map(this::toResponse).toList();
    }

    public List<IncidentResponse> getByUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return incidentRepository.findByUsuarioOrderByFechaCreacionDesc(user)
                .stream().map(this::toResponse).toList();
    }

    public List<IncidentResponse> getByTecnico(Long tecnicoId) {
        User tecnico = userRepository.findById(tecnicoId)
                .orElseThrow(() -> new RuntimeException("Técnico no encontrado"));
        return incidentRepository.findByTecnicoOrderByFechaCreacionDesc(tecnico)
                .stream().map(this::toResponse).toList();
    }

    public IncidentResponse getById(Long id) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Incidente no encontrado"));
        return toResponse(incident);
    }

    public IncidentResponse updateStatus(Long id, String nuevoEstado) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Incidente no encontrado"));
        incident.setEstado(IncidentStatus.valueOf(nuevoEstado.toUpperCase()));
        incident = incidentRepository.save(incident);
        return toResponse(incident);
    }

    public IncidentResponse cerrarIncidente(Long id, String nota, User currentUser) {
        if (currentUser.getRol() != Role.TECNICO && currentUser.getRol() != Role.ADMIN) {
            throw new RuntimeException("Solo un técnico o administrador puede cerrar incidentes");
        }
        if (nota == null || nota.isBlank()) {
            throw new RuntimeException("La nota de resolución es obligatoria");
        }
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Incidente no encontrado"));
        incident.setNotaResolucion(nota);
        incident.setEstado(IncidentStatus.CERRADO);
        incident = incidentRepository.save(incident);
        return toResponse(incident);
    }

    public IncidentResponse assignTecnico(Long incidentId, Long tecnicoId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new RuntimeException("Incidente no encontrado"));
        User tecnico = userRepository.findById(tecnicoId)
                .orElseThrow(() -> new RuntimeException("Técnico no encontrado"));
        incident.setTecnico(tecnico);
        incident.setEstado(IncidentStatus.EN_PROCESO);
        incident = incidentRepository.save(incident);
        return toResponse(incident);
    }

    private IncidentResponse toResponse(Incident i) {
        return IncidentResponse.builder()
                .id(i.getId())
                .titulo(i.getTitulo())
                .descripcion(i.getDescripcion())
                .categoria(i.getCategoria().name())
                .prioridad(i.getPrioridad().name())
                .estado(i.getEstado().name())
                .archivoUrl(i.getArchivoUrl())
                .notaResolucion(i.getNotaResolucion())
                .usuarioId(i.getUsuario().getId())
                .usuarioNombre(i.getUsuario().getNombre())
                .tecnicoId(i.getTecnico() != null ? i.getTecnico().getId() : null)
                .tecnicoNombre(i.getTecnico() != null ? i.getTecnico().getNombre() : null)
                .fechaCreacion(i.getFechaCreacion())
                .fechaActualizacion(i.getFechaActualizacion())
                .build();
    }
}
