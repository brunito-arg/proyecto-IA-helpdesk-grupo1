CREATE DATABASE IF NOT EXISTS helpdesk;
USE helpdesk;

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('USER', 'TECNICO', 'ADMIN') NOT NULL DEFAULT 'USER',
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE incidents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    categoria ENUM('HARDWARE', 'SOFTWARE', 'RED', 'OTRO') NOT NULL DEFAULT 'OTRO',
    prioridad ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA') NOT NULL DEFAULT 'MEDIA',
    estado ENUM('ABIERTO', 'EN_PROCESO', 'RESUELTO', 'CERRADO') NOT NULL DEFAULT 'ABIERTO',
    archivo_url VARCHAR(500) DEFAULT NULL,
    usuario_id BIGINT NOT NULL,
    tecnico_id BIGINT DEFAULT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES users(id),
    FOREIGN KEY (tecnico_id) REFERENCES users(id)
);

-- Admin por defecto: admin@helpdesk.com / admin123
INSERT INTO users (nombre, email, password, rol) VALUES
('Admin Helpdesk', 'admin@helpdesk.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMIN');
