package com.silentguard.backend.controller;

import com.silentguard.backend.model.ResolutionHistoryEntity;
import com.silentguard.backend.repository.ResolutionHistoryRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final ResolutionHistoryRepository historyRepository;

    public AuditController(ResolutionHistoryRepository historyRepository) {
        this.historyRepository = historyRepository;
    }

    @GetMapping("/history")
    public ResponseEntity<List<ResolutionHistoryEntity>> getAllHistory() {
        return ResponseEntity.ok(historyRepository.findAllByOrderByUpdatedAtDesc());
    }

    @PostMapping("/resolutions")
    public ResponseEntity<ResolutionHistoryEntity> addResolution(
            @RequestBody ResolutionHistoryEntity history
    ) {
        if (history.getResolutionId() == null || history.getResolutionId().isEmpty()) {
            history.setResolutionId("res-" + System.currentTimeMillis());
        }
        return ResponseEntity.ok(historyRepository.save(history));
    }
}
