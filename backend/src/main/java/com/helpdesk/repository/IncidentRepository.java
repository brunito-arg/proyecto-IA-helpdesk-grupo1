package com.helpdesk.repository;

import com.helpdesk.model.Incident;
import com.helpdesk.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {
    List<Incident> findByUsuarioOrderByFechaCreacionDesc(User usuario);
    List<Incident> findByTecnicoOrderByFechaCreacionDesc(User tecnico);
    List<Incident> findAllByOrderByFechaCreacionDesc();
}
