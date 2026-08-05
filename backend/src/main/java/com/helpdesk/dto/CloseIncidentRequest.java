package com.helpdesk.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CloseIncidentRequest {
    @NotBlank
    @Size(max = 2000)
    private String nota;
}
