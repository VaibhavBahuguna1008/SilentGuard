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

    @PutMapping("/resolutions/{id}")
    public ResponseEntity<ResolutionHistoryEntity> updateResolution(
            @PathVariable String id,
            @RequestBody ResolutionHistoryEntity updated
    ) {
        return historyRepository.findById(id).map(existing -> {
            existing.setResolutionStatus(updated.getResolutionStatus());
            existing.setResolutionComment(updated.getResolutionComment());
            existing.setUpdatedAt(java.time.LocalDateTime.now());
            return ResponseEntity.ok(historyRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/resolutions/{id}")
    public ResponseEntity<Void> deleteResolution(@PathVariable String id) {
        if (historyRepository.existsById(id)) {
            historyRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
