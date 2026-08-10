package com.helpdesk.service;

import com.helpdesk.dto.IncidentResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
public class SlackNotifier {

    private static final Logger log = LoggerFactory.getLogger(SlackNotifier.class);
    private static final DateTimeFormatter FECHA_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final RestClient restClient = RestClient.create();

    @Value("${app.slack.webhook-url}")
    private String webhookUrl;

    public void notifyNewIncident(IncidentResponse incident) {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            return;
        }
        try {
            restClient.post()
                    .uri(webhookUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(buildPayload(incident))
                    .retrieve()
                    .toBodilessEntity();
            log.info("Notificación de incidencia #{} enviada a Slack", incident.getId());
        } catch (Exception e) {
            log.error("Error al enviar notificación a Slack para la incidencia #{}: {}", incident.getId(), e.getMessage());
        }
    }

    private Map<String, Object> buildPayload(IncidentResponse incident) {
        return Map.of(
                "text", "Nueva incidencia #" + incident.getId(),
                "blocks", List.of(
                        Map.of("type", "header", "text",
                                Map.of("type", "plain_text", "text", "Nueva incidencia #" + incident.getId())),
                        Map.of("type", "section", "fields", List.of(
                                campo("Título", incident.getTitulo()),
                                campo("Categoría", incident.getCategoria()),
                                campo("Prioridad", incident.getPrioridad()),
                                campo("Estado", incident.getEstado()),
                                campo("Reportado por", incident.getUsuarioNombre()),
                                campo("Fecha", incident.getFechaCreacion() != null
                                        ? incident.getFechaCreacion().format(FECHA_FORMAT) : null))),
                        Map.of("type", "section", "text",
                                campo("Descripción", incident.getDescripcion()))
                )
        );
    }

    private Map<String, Object> campo(String titulo, String valor) {
        return Map.of(
                "type", "mrkdwn",
                "text", "*" + titulo + "*: " + (valor != null ? valor : "-")
        );
    }
}
