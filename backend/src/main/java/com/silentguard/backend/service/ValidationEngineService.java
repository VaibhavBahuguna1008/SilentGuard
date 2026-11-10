package com.silentguard.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.silentguard.backend.model.DatasetEntity;
import com.silentguard.backend.model.ValidationIssueEntity;
import com.silentguard.backend.model.ValidationRuleEntity;
import com.silentguard.backend.model.ValidationRunEntity;
import com.silentguard.backend.repository.DatasetRepository;
import com.silentguard.backend.repository.ValidationIssueRepository;
import com.silentguard.backend.repository.ValidationRuleRepository;
import com.silentguard.backend.repository.ValidationRunRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class ValidationEngineService {

    private final ValidationRunRepository runRepository;
    private final ValidationIssueRepository issueRepository;
    private final ValidationRuleRepository ruleRepository;
    private final DatasetRepository datasetRepository;
    private final ObjectMapper objectMapper;

    public ValidationEngineService(
            ValidationRunRepository runRepository,
            ValidationIssueRepository issueRepository,
            ValidationRuleRepository ruleRepository,
            DatasetRepository datasetRepository
    ) {
        this.runRepository = runRepository;
        this.issueRepository = issueRepository;
        this.ruleRepository = ruleRepository;
        this.datasetRepository = datasetRepository;
        this.objectMapper = new ObjectMapper();
    }

    public static class ValidationResult {
        private ValidationRunEntity run;
        private List<ValidationIssueEntity> issues;

        public ValidationResult(ValidationRunEntity run, List<ValidationIssueEntity> issues) {
            this.run = run;
            this.issues = issues;
        }

        public ValidationRunEntity getRun() { return run; }
        public List<ValidationIssueEntity> getIssues() { return issues; }
    }

    @Transactional
    public ValidationResult executeValidation(String datasetId, List<String> ruleIds) {
        DatasetEntity dataset = datasetRepository.findById(datasetId)
                .orElseThrow(() -> new IllegalArgumentException("Dataset not found with id: " + datasetId));

        List<ValidationRuleEntity> rules;
        if (ruleIds != null && !ruleIds.isEmpty()) {
            rules = ruleRepository.findAllById(ruleIds);
        } else {
            rules = ruleRepository.findByEnabled(true);
        }

        return runValidationOnDataset(dataset, rules);
    }

    @Transactional
    public ValidationResult runValidationOnDataset(DatasetEntity dataset, List<ValidationRuleEntity> rules) {
        long startTime = System.currentTimeMillis();
        String runId = "run-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 5);

        List<Map<String, String>> rows = parseRawData(dataset.getRawDataJson());
        List<String> columns = parseColumns(dataset.getColumnsJson());
        Set<String> columnSet = new HashSet<>(columns);

        List<ValidationRuleEntity> activeRules = rules.stream()
                .filter(ValidationRuleEntity::isEnabled)
                .toList();

        List<ValidationIssueEntity> issues = new ArrayList<>();

        // 1. Schema Drift Checks
        for (ValidationRuleEntity rule : activeRules) {
            if (!columnSet.contains(rule.getColumnName())) {
                ValidationIssueEntity driftIssue = new ValidationIssueEntity();
                driftIssue.setIssueId("drift-" + rule.getRuleId() + "-" + System.currentTimeMillis());
                driftIssue.setRunId(runId);
                driftIssue.setDatasetId(dataset.getDatasetId());
                driftIssue.setRowNumber(0);
                driftIssue.setColumnName(rule.getColumnName());
                driftIssue.setRuleId(rule.getRuleId());
                driftIssue.setRuleName(rule.getRuleName());
                driftIssue.setRuleType(rule.getRuleType());
                driftIssue.setSeverity("CRITICAL");
                driftIssue.setFoundValue("<MISSING HEADER>");
                driftIssue.setExpectedCondition("Dataset must provide column '" + rule.getColumnName() + "'");
                driftIssue.setErrorMessage("Schema Drift: Configured rule '" + rule.getRuleName() +
                        "' expects column '" + rule.getColumnName() + "', but it is absent from dataset columns.");
                driftIssue.setResolutionStatus("OPEN");
                driftIssue.setCategory("Missing Data");
                driftIssue.setRowDataJson(rows.isEmpty() ? "{}" : serializeRow(rows.get(0)));
                issues.add(driftIssue);
            }

            if ("CROSS_FIELD".equalsIgnoreCase(rule.getRuleType()) && rule.getSecondColumn() != null) {
                if (!columnSet.contains(rule.getSecondColumn())) {
                    ValidationIssueEntity crossDrift = new ValidationIssueEntity();
                    crossDrift.setIssueId("drift-cross-" + rule.getRuleId() + "-" + System.currentTimeMillis());
                    crossDrift.setRunId(runId);
                    crossDrift.setDatasetId(dataset.getDatasetId());
                    crossDrift.setRowNumber(0);
                    crossDrift.setColumnName(rule.getSecondColumn());
                    crossDrift.setRuleId(rule.getRuleId());
                    crossDrift.setRuleName(rule.getRuleName());
                    crossDrift.setRuleType(rule.getRuleType());
                    crossDrift.setSeverity("CRITICAL");
                    crossDrift.setFoundValue("<MISSING SECOND COLUMN>");
                    crossDrift.setExpectedCondition("Relational column '" + rule.getSecondColumn() + "' must exist");
                    crossDrift.setErrorMessage("Schema Inconsistency: Cross-field rule '" + rule.getRuleName() +
                            "' compares with '" + rule.getSecondColumn() + "', which does not exist in dataset.");
                    crossDrift.setResolutionStatus("OPEN");
                    crossDrift.setCategory("Relationship Logic");
                    crossDrift.setRowDataJson(rows.isEmpty() ? "{}" : serializeRow(rows.get(0)));
                    issues.add(crossDrift);
                }
            }
        }

        // 2. Frequency counting for UNIQUE rules
        Map<String, Map<String, Integer>> uniqueFrequencies = new HashMap<>();
        for (ValidationRuleEntity rule : activeRules) {
            if ("UNIQUE".equalsIgnoreCase(rule.getRuleType()) && columnSet.contains(rule.getColumnName())) {
                Map<String, Integer> freq = new HashMap<>();
                for (Map<String, String> row : rows) {
                    String val = row.getOrDefault(rule.getColumnName(), "").trim();
                    if (!val.isEmpty()) {
                        freq.put(val, freq.getOrDefault(val, 0) + 1);
                    }
                }
                uniqueFrequencies.put(rule.getColumnName(), freq);
            }
        }

        // 3. Row-level Rule Evaluations
        for (int i = 0; i < rows.size(); i++) {
            Map<String, String> row = rows.get(i);
            int rowNumber = i + 1;

            for (ValidationRuleEntity rule : activeRules) {
                String col = rule.getColumnName();
                if (!columnSet.contains(col)) continue;

                String rawVal = row.getOrDefault(col, "");
                String trimmedVal = rawVal != null ? rawVal.trim() : "";

                boolean isViolation = false;
                String errorMsg = "";
                String expected = "";

                String ruleType = rule.getRuleType().toUpperCase();
                switch (ruleType) {
                    case "REQUIRED":
                        expected = "Must be filled in (cannot be empty)";
                        if (trimmedVal.isEmpty()) {
                            isViolation = true;
                            errorMsg = col + " is required but left blank. Every record must have this field filled.";
                        }
                        break;

                    case "UNIQUE":
                        expected = "Must be unique (no duplicates in this column)";
                        if (!trimmedVal.isEmpty()) {
                            int count = uniqueFrequencies.getOrDefault(col, Collections.emptyMap()).getOrDefault(trimmedVal, 0);
                            if (count > 1) {
                                isViolation = true;
                                errorMsg = "'" + trimmedVal + "' is used " + count + " times in '" + col + "'. Records cannot share the same identifier.";
                            }
                        }
                        break;

                    case "MIN_VALUE":
                        try {
                            double minBound = Double.parseDouble(rule.getParameter() != null ? rule.getParameter() : "0");
                            expected = "Number must be >= " + minBound;
                            if (!trimmedVal.isEmpty()) {
                                double num = Double.parseDouble(trimmedVal);
                                if (num < minBound) {
                                    isViolation = true;
                                    errorMsg = "Value '" + trimmedVal + "' in '" + col + "' is below minimum threshold of " + minBound + ".";
                                }
                            }
                        } catch (NumberFormatException e) {
                            if (!trimmedVal.isEmpty()) {
                                isViolation = true;
                                errorMsg = "Expected a numeric value in '" + col + "', but found '" + trimmedVal + "'.";
                            }
                        }
                        break;

                    case "MAX_VALUE":
                        try {
                            double maxBound = Double.parseDouble(rule.getParameter() != null ? rule.getParameter() : "100");
                            expected = "Number must be <= " + maxBound;
                            if (!trimmedVal.isEmpty()) {
                                double num = Double.parseDouble(trimmedVal);
                                if (num > maxBound) {
                                    isViolation = true;
                                    errorMsg = "Value '" + trimmedVal + "' in '" + col + "' exceeds maximum allowed limit of " + maxBound + ".";
                                }
                            }
                        } catch (NumberFormatException e) {
                            if (!trimmedVal.isEmpty()) {
                                isViolation = true;
                                errorMsg = "Expected a numeric value in '" + col + "', but found '" + trimmedVal + "'.";
                            }
                        }
                        break;

                    case "CHECK_CONSTRAINT":
                    case "FORMAT":
                        expected = "Must match format: " + rule.getParameter();
                        if (!trimmedVal.isEmpty() && rule.getParameter() != null && !rule.getParameter().isEmpty()) {
                            try {
                                if (!Pattern.compile(rule.getParameter()).matcher(trimmedVal).find()) {
                                    isViolation = true;
                                    errorMsg = "'" + trimmedVal + "' in '" + col + "' does not match standard pattern.";
                                }
                            } catch (Exception ignored) {}
                        }
                        break;

                    case "ALLOWED_VALUES":
                        if (rule.getParameter() != null) {
                            String[] parts = rule.getParameter().split(",");
                            Set<String> allowed = new HashSet<>();
                            for (String p : parts) allowed.add(p.trim().toLowerCase());
                            expected = "Must be one of: [" + rule.getParameter() + "]";
                            if (!trimmedVal.isEmpty() && !allowed.contains(trimmedVal.toLowerCase())) {
                                isViolation = true;
                                errorMsg = "'" + trimmedVal + "' is not permitted in '" + col + "'. Allowed options: " + rule.getParameter() + ".";
                            }
                        }
                        break;

                    case "CROSS_FIELD":
                        String secCol = rule.getSecondColumn();
                        if (secCol != null && columnSet.contains(secCol)) {
                            String secVal = row.getOrDefault(secCol, "").trim();
                            expected = "'" + col + "' must relate (" + rule.getOperator() + ") to '" + secCol + "'";
                            if (!trimmedVal.isEmpty() && !secVal.isEmpty()) {
                                // Date comparison check
                                if (isIsoDate(trimmedVal) && isIsoDate(secVal)) {
                                    LocalDate d1 = LocalDate.parse(trimmedVal);
                                    LocalDate d2 = LocalDate.parse(secVal);
                                    String op = rule.getOperator() != null ? rule.getOperator() : "GREATER_EQUAL";
                                    if ("GREATER_EQUAL".equalsIgnoreCase(op) && d1.isBefore(d2)) {
                                        isViolation = true;
                                        errorMsg = "Date in '" + col + "' (" + trimmedVal + ") cannot precede '" + secCol + "' (" + secVal + ").";
                                    } else if ("GREATER_THAN".equalsIgnoreCase(op) && !d1.isAfter(d2)) {
                                        isViolation = true;
                                        errorMsg = "Date in '" + col + "' (" + trimmedVal + ") must be strictly after '" + secCol + "' (" + secVal + ").";
                                    }
                                }
                            }
                        }
                        break;

                    case "REFERENTIAL_INTEGRITY":
                        if (rule.getParameter() != null && !rule.getParameter().isEmpty()) {
                            Set<String> refSet = new HashSet<>(Arrays.asList(rule.getParameter().split(",")));
                            expected = "Must exist in approved directory: [" + rule.getParameter() + "]";
                            if (!trimmedVal.isEmpty() && !refSet.contains(trimmedVal)) {
                                isViolation = true;
                                errorMsg = "'" + trimmedVal + "' is not an approved reference in '" + col + "'.";
                            }
                        }
                        break;
                }

                if (isViolation) {
                    ValidationIssueEntity issue = new ValidationIssueEntity();
                    issue.setIssueId("iss-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 5));
                    issue.setRunId(runId);
                    issue.setDatasetId(dataset.getDatasetId());
                    issue.setRowNumber(rowNumber);
                    issue.setColumnName(col);
                    issue.setRuleId(rule.getRuleId());
                    issue.setRuleName(rule.getRuleName());
                    issue.setRuleType(rule.getRuleType());
                    issue.setSeverity(rule.getSeverity() != null ? rule.getSeverity() : "ERROR");
                    issue.setFoundValue(trimmedVal.isEmpty() ? "<EMPTY>" : trimmedVal);
                    issue.setExpectedCondition(expected);
                    issue.setErrorMessage(errorMsg);
                    issue.setResolutionStatus("OPEN");
                    issue.setCategory(rule.getCategory() != null ? rule.getCategory() : "Data Integrity");
                    issue.setRowDataJson(serializeRow(row));
                    issues.add(issue);
                }
            }
        }

        long executionTimeMs = System.currentTimeMillis() - startTime;

        // Calculate summary counts
        Set<Integer> failedRowSet = new HashSet<>();
        int criticalCount = 0;
        int errorCount = 0;
        int warningCount = 0;

        for (ValidationIssueEntity iss : issues) {
            String sev = iss.getSeverity() != null ? iss.getSeverity().toUpperCase() : "ERROR";
            if ("CRITICAL".equals(sev)) {
                criticalCount++;
                failedRowSet.add(iss.getRowNumber());
            } else if ("ERROR".equals(sev)) {
                errorCount++;
                failedRowSet.add(iss.getRowNumber());
            } else if ("WARNING".equals(sev)) {
                warningCount++;
            }
        }

        int failedRecords = failedRowSet.size();
        int totalRecords = rows.size();
        int passedRecords = Math.max(0, totalRecords - failedRecords);

        int healthScore = 100;
        if (totalRecords > 0) {
            int totalIssues = issues.size();
            if (totalIssues == 0) {
                healthScore = 100;
            } else if (passedRecords == 0) {
                healthScore = 0;
            } else {
                double passRatio = (double) passedRecords / totalRecords;
                double weightedDefects = (criticalCount * 2.5) + (errorCount * 1.0) + (warningCount * 0.2);
                double defectDensity = weightedDefects / totalRecords;
                double densityDeduction = Math.min(30.0, defectDensity * 20.0);
                int calculated = (int) Math.round(passRatio * (100.0 - densityDeduction));
                healthScore = Math.max(1, Math.min(99, calculated));
            }
        }

        String runStatus = "PASSED";
        if (criticalCount > 0 || errorCount > 0) {
            runStatus = "FAILED";
        } else if (warningCount > 0) {
            runStatus = "WARNING";
        }

        int existingRunsCount = runRepository.findByDatasetIdOrderByExecutedAtDesc(dataset.getDatasetId()).size();

        ValidationRunEntity runEntity = new ValidationRunEntity();
        runEntity.setRunId(runId);
        runEntity.setDatasetId(dataset.getDatasetId());
        runEntity.setRunNumber(existingRunsCount + 1);
        runEntity.setRunStatus(runStatus);
        runEntity.setTotalRecords(totalRecords);
        runEntity.setPassedRecords(passedRecords);
        runEntity.setFailedRecords(failedRecords);
        runEntity.setHealthScore(healthScore);
        runEntity.setCriticalIssuesCount(criticalCount);
        runEntity.setErrorIssuesCount(errorCount);
        runEntity.setWarningIssuesCount(warningCount);
        runEntity.setTotalIssuesCount(issues.size());
        runEntity.setExecutionTimeMs(executionTimeMs);
        runEntity.setRuleCountExecuted(activeRules.size());
        runEntity.setExecutedAt(LocalDateTime.now());

        // Persist run and issues
        ValidationRunEntity savedRun = runRepository.save(runEntity);
        if (!issues.isEmpty()) {
            issueRepository.saveAll(issues);
        }

        return new ValidationResult(savedRun, issues);
    }

    private boolean isIsoDate(String val) {
        return val != null && val.matches("^\\d{4}-\\d{2}-\\d{2}$");
    }

    private List<Map<String, String>> parseRawData(String rawDataJson) {
        if (rawDataJson == null || rawDataJson.trim().isEmpty()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(rawDataJson, new TypeReference<List<Map<String, String>>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<String> parseColumns(String columnsJson) {
        if (columnsJson == null || columnsJson.trim().isEmpty()) {
            return Collections.emptyList();
        }
        try {
            if (columnsJson.startsWith("[")) {
                return objectMapper.readValue(columnsJson, new TypeReference<List<String>>() {});
            } else {
                return Arrays.asList(columnsJson.split(","));
            }
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private String serializeRow(Map<String, String> row) {
        try {
            return objectMapper.writeValueAsString(row);
        } catch (Exception e) {
            return "{}";
        }
    }
}
