package com.helpdesk.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    private Path uploadPath;

    @PostConstruct
    public void init() {
        uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadPath);
        } catch (IOException e) {
            throw new RuntimeException("No se pudo crear el directorio de uploads", e);
        }
    }

    public String storeFile(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String filename = UUID.randomUUID().toString() + extension;

        try {
            Path targetPath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), targetPath);
            return filename;
        } catch (IOException e) {
            throw new RuntimeException("No se pudo almacenar el archivo", e);
        }
    }

    public void deleteFile(String filename) {
        try {
            Files.deleteIfExists(uploadPath.resolve(filename));
        } catch (IOException e) {
            throw new RuntimeException("No se pudo eliminar el archivo adjunto", e);
        }
    }
}
