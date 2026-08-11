# AGENTS.md — Guía del proyecto Helpdesk

> Reglas normativas obligatorias: ver `/.instructions.md`.

Esta guía describe cómo funciona el proyecto para que una IA (o cualquier desarrollador) pueda entenderlo, modificarlo y verificar cambios de forma fiable.

## 1. Descripción del proyecto .

Sistema de helpdesk (gestión de incidencias) con roles **USER**, **TECNICO** y **ADMIN**.

- **USER**: crea incidencias y ve solo las suyas.
- **TECNICO**: ve todas las incidencias, las asigna/atiende y cambia su estado.
- **ADMIN**: todo lo anterior + panel de administración (cambiar roles de usuarios).

Funcionalidad clave: registro/login con JWT, CRUD de incidencias con subida opcional de archivo, asignación de técnicos, cambios de estado y panel admin. Además, notificación de incidencias a Slack (`SlackNotifier`) y sincronización de incidencias de categoría **SOFTWARE** con issues del repositorio de GitHub mediante un agente de opencode (`github-issues`) + MCP de GitHub.

## 2. Arquitectura y flujo de datos

```
[React + Vite (frontend)]  ── proxy /api y /uploads ──►  [Spring Boot (backend) :8080]  ──►  [MySQL (BD "helpdesk")]
```

- El frontend **nunca** llama al backend directamente: usa `baseURL: '/api'` (relativo) y Vite proxya `/api` y `/uploads` al backend. En Docker el target es `http://backend:8080`; en local `http://localhost:8080`. Configurable con `VITE_PROXY_TARGET` (`frontend/vite.config.js`).
- Como todo es mismo-origen (proxy), CORS solo importa si alguien llama al backend desde otro origen (ver §13).
- Autenticación **stateless con JWT**: el frontend guarda `token` y `user` en `localStorage` (`frontend/src/context/AuthContext.jsx`) y lo envía como `Authorization: Bearer <token>` vía interceptor (`frontend/src/api/axios.js`). En 401 borra la sesión y redirige a `/login`.
- La BD se inicializa con `db/init.sql` (crea BD, tablas y el admin por defecto). Con `spring.jpa.hibernate.ddl-auto: update`, Hibernate crea/actualiza columnas y tablas automáticamente en cada arranque.

## 3. Stack tecnológico

**Backend** (`backend/`, Maven): Java 17, Spring Boot 3.2.1 (Web, Data JPA, Security, Validation), JWT (jjwt 0.12.3), Hibernate + MySQL (`mysql-connector-j`), Lombok. Aplicación REST en `com.helpdesk`.

**Frontend** (`frontend/`, npm): React 18, Vite 5, Tailwind CSS 3, Axios, React Router 6. Estado de auth con Context + hooks.

## 4. Estructura del repositorio

```
backend/src/main/java/com/helpdesk/
  ├── config/      SecurityConfig, JwtUtil, JwtAuthFilter
  ├── controller/  AuthController, UserController, IncidentController, FileController
  ├── dto/         LoginRequest, RegisterRequest, IncidentRequest, AuthResponse, IncidentResponse, UserResponse, CloseIncidentRequest, GithubIssueLinkRequest
  ├── exception/   GlobalExceptionHandler
  ├── model/       User, Incident y enums (Role, Category, Priority, IncidentStatus)
  ├── repository/  UserRepository, IncidentRepository
  └── service/     AuthService, IncidentService, FileStorageService, SlackNotifier
backend/src/main/resources/application.yml   Configuración (puertos, BD, JWT, uploads)
db/init.sql                                  Esquema + datos iniciales (crea el admin)
docker-compose.yml                           MySQL + backend + frontend
opencode.json                                Configuración de opencode (MCP servers github y slack)
.opencode/agent/github-issues.md             Agente que crea issues de GitHub para incidentes SOFTWARE
scripts/sync-github-issues.ps1               Ejecuta el agente github-issues (tarea programada)
frontend/src/
  ├── api/axios.js        Cliente axios con interceptores
  ├── components/         Layout, Navbar, ProtectedRoute
  ├── context/            AuthContext.jsx
  ├── hooks/useAuth.js    Hook de acceso al contexto
  ├── pages/              Login, Register, Dashboard, CreateIncident, IncidentDetail, AdminPanel, Profile
  └── App.jsx             Rutas
```

## 5. Modelo de datos

- **users**: id, nombre, email (único), password (BCrypt), rol (enum), fecha_registro.
- **incidents**: id, titulo, descripcion, categoria (enum), prioridad (enum), estado (enum), archivo_url, nota_resolucion (TEXT, nullable), github_issue_url (nullable, enlace al issue de GitHub creado), usuario_id (FK, no nulo), tecnico_id (FK, nullable), fecha_creacion, fecha_actualizacion.

Enums (persistidos como STRING):
- `Role`: USER, TECNICO, ADMIN
- `Category`: HARDWARE, SOFTWARE, RED, OTRO
- `Priority`: BAJA, MEDIA, ALTA, CRITICA
- `IncidentStatus`: ABIERTO, EN_PROCESO, RESUELTO, CERRADO

## 6. API REST y reglas de acceso

Todas las rutas cuelgan del contexto root (sin prefijo `/api` en Spring, el `/api` es parte de cada `@RequestMapping`). El acceso se define en `config/SecurityConfig.java`:

| Método y ruta | Rol requerido | Descripción |
|---|---|---|
| `POST /api/auth/login` | público | Login → devuelve JWT + usuario |
| `POST /api/auth/register` | público | Registro (rol USER) → devuelve JWT + usuario |
| `GET /api/users/me` | autenticado | Usuario actual (desde el JWT) |
| `GET /api/users` | autenticado (usado por admin) | Lista de usuarios |
| `GET /api/users/tecnicos` | autenticado | Lista de usuarios con rol TECNICO |
| `PUT /api/users/{id}/rol` | autenticado | Cambiar rol (body: texto plano, ej. `TECNICO`) |
| `GET /api/incidents` | autenticado | Todas si es ADMIN/TECNICO; solo las propias si es USER |
| `POST /api/incidents` | autenticado | Crear incidencia. **multipart**: `data` = JSON, `file` opcional |
| `GET /api/incidents/{id}` | autenticado | Detalle de incidencia |
| `PUT /api/incidents/{id}/status` | autenticado | Cambiar estado (body: texto plano con el enum, ej. `RESUELTO`) |
| `PUT /api/incidents/{id}/close` | autenticado (TECNICO/ADMIN) | Cerrar incidencia con nota de resolución (body JSON `{ "nota": "..." }`, nota obligatoria). Pone estado CERRADO |
| `PUT /api/incidents/{id}/assign/{tecnicoId}` | autenticado | Asignar técnico (pone estado EN_PROCESO) |
| `PUT /api/incidents/{id}/github-issue` | autenticado | Registrar el enlace del issue de GitHub (body JSON `{ "url": "..." }`). Lo usa el agente `github-issues` |
| `GET /uploads/{filename}` | público | Servir archivo subido |
| `/api/admin/**` | ADMIN | (marcado en SecurityConfig; aún sin controlador) |

Nota: rutas autenticadas exigen header `Authorization: Bearer <token>`. La autorización por rol funciona con `hasRole("ADMIN")` (los claims del JWT generan `ROLE_<rol>` en `JwtAuthFilter`).

## 7. Convenciones de código

> **Las reglas obligatorias de código están en `instructions.md`.** Este archivo documenta la arquitectura, API y ejecución del proyecto.

**Cómo agregar un endpoint (patrón en capas):**
1. `model/` — entidad JPA con Lombok (`@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`). Enums con `@Enumerated(EnumType.STRING)`.
2. `repository/` — interfaz que extiende `JpaRepository`.
3. `service/` — lógica de negocio anotada `@Service` + `@RequiredArgsConstructor` (inyección por constructor vía Lombok). Lanza `RuntimeException` con mensaje en español para errores de negocio.
4. `dto/` — request/response con validación (`@NotBlank`, `@Size`, `@Email`) usando `@Data`.
5. `controller/` — `@RestController` + `@RequestMapping`, con `@Valid @RequestBody` (o `@RequestPart` para multipart) y `@AuthenticationPrincipal User user` para el usuario del JWT.

**Estilo**: mensajes de error en español, no añadir comentarios salvo que se pidan, seguir el estilo de los archivos vecinos. Backend con Maven (`mvn`), frontend con npm.

## 8. Manejo de errores

`exception/GlobalExceptionHandler.java` (unifica la API de errores):
- `RuntimeException` → **400** `{ "error": "<mensaje>" }`
- Violaciones de validación (`MethodArgumentNotValidException`) → **400** `{ "<campo>": "<mensaje>" }`

El frontend lee `error.response.data.error` para mostrar el mensaje (`Login.jsx`, `Register.jsx`). Mantener este contrato al añadir endpoints: lanzar `RuntimeException` con el mensaje en español.

## 9. Autenticación JWT

- `JwtUtil` genera tokens con `subject` = email, claims `userId` y `rol`, firmados con HMAC-SHA (secreto de `app.jwt.secret`), expiración `app.jwt.expiration-ms` (86400000 ms = 24 h).
- `JwtAuthFilter` (OncePerRequestFilter) valida el header `Authorization: Bearer`, carga el `User` desde BD por email y lo deja en el `SecurityContext`.
- Reglas en `SecurityConfig`: `/api/auth/**` y `/uploads/**` públicos; `/api/admin/**` solo ADMIN; `/api/users/**` GET/PUT autenticados; el resto autenticado. CORS y sesión stateless.

## 10. Configuración y variables de entorno

`application.yml` usa env vars con defaults (funciona igual en Docker y en local):

| Variable | Default | Uso |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://localhost:3306/helpdesk?...` | URL de MySQL |
| `SPRING_DATASOURCE_USERNAME` | `root` | Usuario MySQL |
| `SPRING_DATASOURCE_PASSWORD` | `loquesea2008` | Contraseña MySQL |
| `APP_JWT_SECRET` | secreto de desarrollo | Secreto de firma JWT |
| `APP_UPLOAD_DIR` | `uploads` | Carpeta de subidas |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | *(vacío)* | PAT de GitHub con *Issues: Read & Write*; lo usa el MCP github para crear issues |
| `VITE_PROXY_TARGET` | `http://localhost:8080` | Target del proxy de Vite (solo frontend) |

En Docker (`docker-compose.yml`) se configuran además `.env` con `MYSQL_ROOT_PASSWORD` y `JWT_SECRET`. El backend en contenedor conecta a `mysql:3306`, no a `localhost`.

## 11. Ejecución

**Docker (recomendada):** requiere solo Docker Desktop.
```bash
docker compose up --build
```
- Frontend: http://localhost (o http://localhost:5173)
- Backend: http://localhost:8080
- MySQL: no expuesto al host; `db/init.sql` corre la primera vez
- Subidas en `./uploads/` (volumen del host); datos MySQL en volumen `mysql-data`
- Detener: `docker compose down` · Borrar BD: `docker compose down -v`
- Rebuild de un servicio concreto: `docker compose up -d --build <servicio>`

**Local sin Docker:** JDK 17 + Maven + MySQL local (BD `helpdesk` creada con `db/init.sql`).
- Backend: `cd backend && mvn spring-boot:run`
- Frontend: `cd frontend && npm install && npm run dev` (proxy a `http://localhost:8080`)

**Usuarios por defecto:**
- Admin: `admin@helpdesk.com` / `admin123` (se crea en `db/init.sql`)
- Técnico: `tecnico@helpdesk.com` / `tecnico123` (se crea en `db/init.sql`)

## 11.1 Sincronización de incidentes SOFTWARE con GitHub (issues)

Cuando se abre un incidente de categoría **SOFTWARE**, puede crearse un issue en el repositorio `brunito-arg/proyecto-IA-helpdesk-grupo1` con el label `software`. Esto lo hace el **agente de opencode** `github-issues` (`.opencode/agent/github-issues.md`), que usa el MCP de GitHub con permisos de escritura.

**Flujo del agente:**
1. Login al backend con el admin por defecto (`http://localhost:8080/api/auth/login`).
2. `GET /api/incidents` → filtra `categoria == "SOFTWARE"` **y** `githubIssueUrl == null`.
3. Antes de crear, verifica que no exista ya un issue con título `[Helpdesk #<id>]` (idempotencia, evita duplicados en corridas repetidas).
4. Crea el issue con título `[Helpdesk #<id>] <titulo>` y label `software`.
5. Registra el enlace del issue con `PUT /api/incidents/{id}/github-issue`, dejando el incidente vinculado.

**Cuándo corre:** no es en tiempo real. Se ejecuta a mano (`opencode run --agent github-issues`) o por una tarea programada de Windows que llame a `scripts/sync-github-issues.ps1` (el script verifica que el backend esté arriba y luego lanza el agente).

**Requisitos:** opencode instalado, Docker Desktop corriendo (el MCP github es `docker run ... ghcr.io/github/github-mcp-server`), `GITHUB_PERSONAL_ACCESS_TOKEN` en `.env`, backend arriba en `localhost:8080` y Python en el PATH.

## 12. Verificación de cambios

**No existe suite de tests** (ni backend ni frontend). Para validar cambios:
1. Compilar el backend: `cd backend && mvn -q -DskipTests package`.
2. Levantar el stack: `docker compose up --build`.
3. Probar con curl (p. ej. login + creación de incidencia). Un smoke-test típico:
   ```bash
   TOKEN=$(curl -s -X POST http://localhost/api/auth/login -H "Content-Type: application/json" \
     -d '{"email":"admin@helpdesk.com","password":"admin123"}' | python -c "import sys,json;print(json.load(sys.stdin)['token'])")
   curl -s http://localhost/api/incidents -H "Authorization: Bearer $TOKEN"
   ```
4. Verificar el frontend en el navegador: login, registro y flujo de incidencia.

## 13. Riesgos y gotchas

- **Credenciales por defecto en texto plano**: `application.yml` y `docker-compose.yml` tienen defaults (`loquesea2008`, secreto JWT). Sobrescribibles vía env vars; no exponerlos en repositorios públicos.
- **CORS**: `SecurityConfig` permite `http://localhost`, `http://localhost:*`, `http://127.0.0.1`, `http://127.0.0.1:*`. Si se sirve el frontend desde otro origen (IP, dominio), hay que añadirlo. Un fallo típico: 403 `Invalid CORS request` al entrar por un puerto no permitido.
- **Proxy de Vite**: si el backend no está en `8080` o en el contenedor `backend`, ajustar `VITE_PROXY_TARGET`.
- **`ddl-auto: update`**: Hibernate crea/actualiza esquema, pero NO crea la BD ni siembra datos. La BD y el admin dependen de `db/init.sql` (solo se ejecuta cuando el volumen MySQL está vacío).
- **Subida de archivos**: límite 10 MB (multipart en `application.yml`); los archivos se guardan con nombre UUID en `app.upload-dir` y se sirven por `GET /uploads/{filename}` (público).
- **Hash del admin**: si `db/init.sql` se toca, el hash BCrypt debe corresponder a la contraseña documentada (el original del repo no coincidía con `admin123`).
- **Puerto 80**: el frontend se publica en `localhost` (puerto 80); si el puerto está ocupado, el contenedor no arranca (usar `localhost:5173`).
- **MCP github requiere Docker Desktop y PAT**: sin Docker corriendo o sin `GITHUB_PERSONAL_ACCESS_TOKEN` en `.env`, las tools del MCP github dan error/401 (verificar con `opencode mcp list`).
- **Owner/repo hardcodeado en el agente**: `github-issues.md` apunta a `brunito-arg/proyecto-IA-helpdesk-grupo1`. Si se corre desde un fork, los issues igual se crean en ese repo.
- **Build viejo del backend**: si el contenedor no se reconstruyó tras agregar el endpoint `/github-issue`, el `PUT` responde 403/404 (reconstruir con `docker compose up -d --build backend`).
- **Archivo `nul`** en la raíz: artefacto vacío de Windows; no es parte del proyecto (se puede ignorar/eliminar).
