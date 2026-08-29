# instructions.md — Reglas obligatorias del proyecto

Este archivo define reglas obligatorias para cambios de código y documentación técnica del proyecto. Es la fuente normativa principal para asistentes de IA.

## 1. Código Backend (Spring Boot / Java)

### 1.1 Patrón de capas

Al agregar un endpoint, seguir este orden estricto:

1. **model/** — Entidad JPA con Lombok: `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`. Enums con `@Enumerated(EnumType.STRING)`.
2. **repository/** — Interfaz que extiende `JpaRepository`.
3. **service/** — Lógica de negocio anotada `@Service` + `@RequiredArgsConstructor` (inyección por constructor vía Lombok).
4. **dto/** — Request/response con validación (`@NotBlank`, `@Size`, `@Email`) usando `@Data`.
5. **controller/** — `@RestController` + `@RequestMapping`, con `@Valid @RequestBody` (o `@RequestPart` para multipart) y `@AuthenticationPrincipal User user` para el usuario del JWT.

### 1.2 Anotaciones obligatorias por capa

| Capa | Anotaciones |
|------|-------------|
| Model | `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Enumerated(EnumType.STRING)` |
| Repository | Extiende `JpaRepository` |
| Service | `@Service`, `@RequiredArgsConstructor` |
| DTO | `@Data`, `@NotBlank`, `@Size`, `@Email` según corresponda |
| Controller | `@RestController`, `@RequestMapping`, `@Valid`, `@AuthenticationPrincipal` |

### 1.3 Inyección de dependencias

- Usar **inyección por constructor** vía `@RequiredArgsConstructor` en services.
- **No** usar `@Autowired` en campos.

### 1.4 Manejo de errores en services

- Lanzar `RuntimeException` con mensaje en español para errores de negocio.
- Ejemplo: `throw new RuntimeException("La incidencia no existe");`

### 1.5 Estilo

- Mensajes de error en español.
- **No** agregar comentarios salvo que se pidan expresamente.
- Seguir el estilo de los archivos vecinos.
- Backend usa Maven (`mvn`), frontend usa npm.

## 2. Código Frontend (React / Vite)

### 2.1 Proxy

- El frontend **nunca** llama al backend directamente.
- Usar `baseURL: '/api'` (relativo) en axios.
- Vite proxya `/api` y `/uploads` al backend.

### 2.2 Autenticación

- Guardar `token` y `user` en `localStorage` (`frontend/src/context/AuthContext.jsx`).
- Enviar `Authorization: Bearer <token>` vía interceptor (`frontend/src/api/axios.js`).

### 2.3 Manejo de errores HTTP

- En **401**: borrar sesión de `localStorage` y redirigir a `/login`.
- Leer `error.response.data.error` para mostrar mensajes al usuario.

## 3. Manejo de errores (GlobalExceptionHandler)

`exception/GlobalExceptionHandler.java` unifica la API de errores:

| Tipo de error | HTTP | Respuesta |
|---------------|------|-----------|
| `RuntimeException` | 400 | `{ "error": "<mensaje en español>" }` |
| `MethodArgumentNotValidException` | 400 | `{ "<campo>": "<mensaje en español>" }` |

**Regla obligatoria**: al agregar nuevos endpoints, mantener este contrato. Lanzar `RuntimeException` con mensaje en español para errores de negocio.

## 4. Seguridad

### 4.1 Credenciales

- **Nunca** exponer credenciales por defecto en repositorios públicos.
- Las credenciales en `application.yml` y `docker-compose.yml` son para desarrollo y se sobrescriben vía env vars.

### 4.2 CORS

- `SecurityConfig` permite `http://localhost`, `http://localhost:*`, `http://127.0.0.1`, `http://127.0.0.1:*`.
- Si se sirve el frontend desde otro origen (IP, dominio), agregarlo explícitamente a la configuración CORS.
- Error típico: 403 `Invalid CORS request` al entrar por un puerto no permitido.

### 4.3 Reglas de acceso (SecurityConfig)

| Ruta | Acceso |
|------|--------|
| `/api/auth/**` | Público |
| `/uploads/**` | Público |
| `/api/admin/**` | Solo ADMIN |
| `DELETE /api/incidents/**` | Solo ADMIN |
| `/api/users/**` (GET/PUT) | Autenticado |
| Resto de `/api/**` | Autenticado |

### 4.4 Autenticación

- Rutas autenticadas exigen header `Authorization: Bearer <token>`.
- JWT: `subject` = email, claims `userId` y `rol`, firmado con HMAC-SHA, expiración 24h.
- `JwtAuthFilter` carga el `User` desde BD por email y lo deja en el `SecurityContext`.

## 5. Verificación obligatoria

**No existe suite de tests.** Después de cada cambio, ejecutar:

1. **Compilar backend**: `cd backend && mvn -q -DskipTests package`
2. **Levantar stack**: `docker compose up --build`
3. **Smoke test con curl**:
   ```bash
   TOKEN=$(curl -s -X POST http://localhost/api/auth/login -H "Content-Type: application/json" \
     -d '{"email":"admin@helpdesk.com","password":"admin123"}' | python -c "import sys,json;print(json.load(sys.stdin)['token'])")
   curl -s http://localhost/api/incidents -H "Authorization: Bearer $TOKEN"
   ```
4. **Verificar frontend en navegador**: login, registro y flujo de incidencia.

## 6. Advertencias conocidas

- **`ddl-auto: update`** NO crea la BD ni siembra datos. La BD y el admin dependen de `db/init.sql` (solo se ejecuta cuando el volumen MySQL está vacío).
- **Subida de archivos**: límite 10 MB; archivos guardados con nombre UUID en `app.upload-dir`.
- **Hash del admin**: si `db/init.sql` se toca, el hash BCrypt debe corresponder a la contraseña documentada (`admin123`).
- **Puerto 80**: el frontend se publica en `localhost` (puerto 80); si está ocupado, usar `localhost:5173`.
- **Proxy de Vite**: si el backend no está en `8080`, ajustar `VITE_PROXY_TARGET`.
- **En Docker**, el backend conecta a `mysql:3306`, **no** a `localhost`.
- **Archivo `nul`** en la raíz: artefacto de Windows; ignorar/eliminar.
