# Tecnologías del proyecto y su contexto de uso

Este documento describe las tecnologías detectadas en el repositorio y el contexto donde se usan (backend, frontend, DB y herramientas de desarrollo).

## Backend

- **Java 17**: Versión objetivo del proyecto (definida en `pom.xml`).
- **Spring Boot 3.2.1**: Framework principal para construir la aplicación backend.
  - Contexto: aplicación web REST ubicada en `backend/src/main/java/com/helpdesk`.
- **Spring Web (spring-boot-starter-web)**: Exposición de APIs REST mediante controladores (`controller/`).
- **Spring Data JPA (spring-boot-starter-data-jpa)**: Persistencia y acceso a datos mediante repositorios (`repository/`).
- **Hibernate (jpa + dialecto MySQL)**: Implementación JPA configurada en `application.yml`.
- **Spring Security (spring-boot-starter-security)**: Seguridad de la aplicación (configuración en `config/SecurityConfig.java`).
- **JWT (io.jsonwebtoken - jjwt)**: Autenticación basada en tokens JWT; utilidades en `config/JwtUtil.java` y filtro `config/JwtAuthFilter.java`.
- **Validation (spring-boot-starter-validation)**: Validación de entradas (DTOs en `dto/`).
- **MySQL (mysql-connector-j)**: Base de datos relacional indicada en `application.yml` (`jdbc:mysql://localhost:3306/helpdesk`).
  - Contexto: `db/init.sql` contiene el esquema/inicialización de la base de datos.
- **File upload (multipart servlet + FileStorageService)**: Gestión de subida/almacenamiento de archivos (configuración en `application.yml` y servicio `service/FileStorageService.java`).
- **Lombok**: Reducción de boilerplate en modelos (`model/`) usando anotaciones de Lombok.
- **Maven**: Sistema de construcción y gestión de dependencias (`pom.xml`).

## Frontend

- **React 18**: Librería para construir la UI (archivos en `frontend/src/`, páginas en `frontend/src/pages`).
- **Vite**: Herramienta de construcción y servidor de desarrollo (`dev`, `build`, `preview` en `package.json`).
- **Tailwind CSS**: Sistema de utilidades CSS para estilos (`tailwind.config.js`, configurado en `postcss.config.js`).
- **Axios**: Cliente HTTP usado para consumir las APIs del backend (`src/api/axios.js`).
- **React Router (react-router-dom)**: Enrutado de la aplicación de una sola página (rutas y `ProtectedRoute.jsx`).
- **Context + Hooks**: Autenticación y estado compartido vía `context/AuthContext.jsx` y `hooks/useAuth.js`.

## Base de datos y datos

- **MySQL**: Motor de base de datos usado en entorno de ejecución (detalles en `application.yml`).
- **db/init.sql**: Script de inicialización/creación de tablas y datos de ejemplo.

## Herramientas y entorno de desarrollo

- **JDK 17**: Requisito para compilar y ejecutar el backend.
- **Node.js / npm**: Requisitos para ejecutar el frontend (Vite + dependencias listadas en `package.json`).
- **Puertos**: Backend en `8080` (configurado en `application.yml`), frontend por defecto con Vite (normalmente `5173` en dev).

## Bibliotecas y utilidades clave (resumen rápido)

- Backend: Spring Boot, Spring Web, Spring Data JPA, Spring Security, jjwt, Hibernate, MySQL, Lombok, Maven.
- Frontend: React, Vite, Tailwind CSS, Axios, React Router.

## Notas de uso

- El backend expone APIs REST consumidas por el frontend mediante `axios`.
- La autenticación usa JWT: el backend emite tokens y aplica un filtro (`JwtAuthFilter`) para proteger rutas; el frontend mantiene el estado de sesión en `AuthContext` y usa `ProtectedRoute` para rutas privadas.
- Las subidas de archivos están soportadas en el backend mediante multipart configurado en `application.yml` y almacenados en la carpeta configurada `app.upload-dir`.

---

Si quieres, puedo añadir instrucciones rápidas de arranque (`README` pequeño) o enlazar partes concretas del código al documento.