# AI_README — Ayuda rápida para asistentes de IA

## Qué es

Sistema de helpdesk (gestión de incidencias) con roles **USER**, **TECNICO** y **ADMIN**. CRUD de incidencias, asignación de técnicos, subida de archivos, autenticación JWT.

## Stack

- **Backend**: Java 17, Spring Boot 3.2.1, MySQL, Maven
- **Frontend**: React 18, Vite 5, Tailwind CSS, Axios, React Router 6
- **Infra**: Docker Compose

## Cómo correr

```bash
docker compose up --build
```

- Frontend: http://localhost
- Backend: http://localhost:8080
- Admin: `admin@helpdesk.com` / `admin123`

## Estructura clave

```
backend/src/main/java/com/helpdesk/
  config/        → SecurityConfig, JwtUtil
  controller/    → Auth, User, Incident, File
  dto/           → Request/Response
  model/         → User, Incident, enums
  service/       → AuthService, IncidentService, FileStorageService
  exception/     → GlobalExceptionHandler

frontend/src/
  api/axios.js   → Cliente con interceptores JWT
  context/       → AuthContext
  pages/         → Login, Dashboard, CreateIncident, IncidentDetail, AdminPanel, Profile
```

## Reglas obligatorias

1. Patrón de capas: **model → repo → service → dto → controller**
2. Errores en español, sin comentarios salvo que se pidan
3. `RuntimeException` → HTTP 400 `{ "error": "<mensaje>" }`
4. Frontend nunca llama al backend directamente (proxy de Vite)
5. Rutas autenticadas: header `Authorization: Bearer <token>`

## Más información

- **AGENTS.md** → Documentación completa del proyecto (arquitectura, API, ejecución)
- **instructions.md** → Reglas obligatorias detalladas para cambios de código
