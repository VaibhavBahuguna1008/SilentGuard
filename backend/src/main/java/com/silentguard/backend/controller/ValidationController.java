package com.silentguard.backend.controller;

import com.silentguard.backend.model.ValidationIssueEntity;
import com.silentguard.backend.model.ValidationRunEntity;
import com.silentguard.backend.repository.ValidationIssueRepository;
import com.silentguard.backend.repository.ValidationRunRepository;
import com.silentguard.backend.service.ValidationEngineService;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/validation")
public class ValidationController {

    private final ValidationRunRepository runRepository;
    private final ValidationIssueRepository issueRepository;
    private final ValidationEngineService validationEngineService;

    public ValidationController(
            ValidationRunRepository runRepository,
            ValidationIssueRepository issueRepository,
            ValidationEngineService validationEngineService
    ) {
        this.runRepository = runRepository;
        this.issueRepository = issueRepository;
        this.validationEngineService = validationEngineService;
    }

    @GetMapping("/runs")
    public ResponseEntity<List<ValidationRunEntity>> getRuns(
            @RequestParam(required = false) String datasetId
    ) {
        if (datasetId != null && !datasetId.isEmpty()) {
            return ResponseEntity.ok(runRepository.findByDatasetIdOrderByExecutedAtDesc(datasetId));
        }
        return ResponseEntity.ok(runRepository.findAllByOrderByExecutedAtDesc());
    }

    @GetMapping("/runs/{runId}/issues")
    public ResponseEntity<List<ValidationIssueEntity>> getRunIssues(@PathVariable String runId) {
        return ResponseEntity.ok(issueRepository.findByRunId(runId));
    }

    @PostMapping("/execute")
    public ResponseEntity<?> executeValidation(@RequestBody Map<String, Object> payload) {
        String datasetId = (String) payload.get("datasetId");
        if (datasetId == null || datasetId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "datasetId is required for validation execution"));
        }

        @SuppressWarnings("unchecked")
        List<String> ruleIds = (List<String>) payload.get("ruleIds");

        try {
            ValidationEngineService.ValidationResult result = validationEngineService.executeValidation(datasetId, ruleIds);
            return ResponseEntity.ok(Map.of(
                    "run", result.getRun(),
                    "issues", result.getIssues()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Validation execution failed: " + e.getMessage()));
        }
    }

    @PostMapping("/runs")
    @Transactional
    public ResponseEntity<ValidationRunEntity> saveValidationRun(
            @RequestBody Map<String, Object> payload
    ) {
        ValidationRunEntity run = new ValidationRunEntity();
        run.setRunId((String) payload.getOrDefault("runId", "run-" + System.currentTimeMillis()));
        run.setDatasetId((String) payload.get("datasetId"));
        run.setRunNumber(((Number) payload.getOrDefault("runNumber", 1)).intValue());
        run.setRunStatus((String) payload.getOrDefault("runStatus", "PASSED"));
        run.setTotalRecords(((Number) payload.getOrDefault("totalRecords", 0)).intValue());
        run.setPassedRecords(((Number) payload.getOrDefault("passedRecords", 0)).intValue());
        run.setFailedRecords(((Number) payload.getOrDefault("failedRecords", 0)).intValue());
        run.setHealthScore(((Number) payload.getOrDefault("healthScore", 100)).intValue());
        run.setCriticalIssuesCount(((Number) payload.getOrDefault("criticalIssuesCount", 0)).intValue());
        run.setErrorIssuesCount(((Number) payload.getOrDefault("errorIssuesCount", 0)).intValue());
        run.setWarningIssuesCount(((Number) payload.getOrDefault("warningIssuesCount", 0)).intValue());
        run.setTotalIssuesCount(((Number) payload.getOrDefault("totalIssuesCount", 0)).intValue());
        run.setExecutionTimeMs(((Number) payload.getOrDefault("executionTimeMs", 0)).longValue());
        run.setRuleCountExecuted(((Number) payload.getOrDefault("ruleCountExecuted", 0)).intValue());

        ValidationRunEntity savedRun = runRepository.save(run);
        return ResponseEntity.ok(savedRun);
    }
}
