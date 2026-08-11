package com.helpdesk.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GithubIssueLinkRequest {
    @NotBlank
    @Size(max = 500)
    private String url;
}
