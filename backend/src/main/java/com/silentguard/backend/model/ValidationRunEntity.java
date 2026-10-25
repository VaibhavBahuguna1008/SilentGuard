package com.silentguard.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "validation_runs")
public class ValidationRunEntity {

    @Id
    private String runId;

    private String datasetId;
    private int runNumber;
    private String runStatus;

    private int totalRecords;
    private int passedRecords;
    private int failedRecords;
    private int healthScore;

    private int criticalIssuesCount;
    private int errorIssuesCount;
    private int warningIssuesCount;
    private int totalIssuesCount;

    private long executionTimeMs;
    private int ruleCountExecuted;

    private LocalDateTime executedAt;

    public ValidationRunEntity() {
        this.executedAt = LocalDateTime.now();
    }

    public String getRunId() { return runId; }
    public void setRunId(String runId) { this.runId = runId; }

    public String getDatasetId() { return datasetId; }
    public void setDatasetId(String datasetId) { this.datasetId = datasetId; }

    public int getRunNumber() { return runNumber; }
    public void setRunNumber(int runNumber) { this.runNumber = runNumber; }

    public String getRunStatus() { return runStatus; }
    public void setRunStatus(String runStatus) { this.runStatus = runStatus; }

    public int getTotalRecords() { return totalRecords; }
    public void setTotalRecords(int totalRecords) { this.totalRecords = totalRecords; }

    public int getPassedRecords() { return passedRecords; }
    public void setPassedRecords(int passedRecords) { this.passedRecords = passedRecords; }

    public int getFailedRecords() { return failedRecords; }
    public void setFailedRecords(int failedRecords) { this.failedRecords = failedRecords; }

    public int getHealthScore() { return healthScore; }
    public void setHealthScore(int healthScore) { this.healthScore = healthScore; }

    public int getCriticalIssuesCount() { return criticalIssuesCount; }
    public void setCriticalIssuesCount(int criticalIssuesCount) { this.criticalIssuesCount = criticalIssuesCount; }

    public int getErrorIssuesCount() { return errorIssuesCount; }
    public void setErrorIssuesCount(int errorIssuesCount) { this.errorIssuesCount = errorIssuesCount; }

    public int getWarningIssuesCount() { return warningIssuesCount; }
    public void setWarningIssuesCount(int warningIssuesCount) { this.warningIssuesCount = warningIssuesCount; }

    public int getTotalIssuesCount() { return totalIssuesCount; }
    public void setTotalIssuesCount(int totalIssuesCount) { this.totalIssuesCount = totalIssuesCount; }

    public long getExecutionTimeMs() { return executionTimeMs; }
    public void setExecutionTimeMs(long executionTimeMs) { this.executionTimeMs = executionTimeMs; }

    public int getRuleCountExecuted() { return ruleCountExecuted; }
    public void setRuleCountExecuted(int ruleCountExecuted) { this.ruleCountExecuted = ruleCountExecuted; }

    public LocalDateTime getExecutedAt() { return executedAt; }
    public void setExecutedAt(LocalDateTime executedAt) { this.executedAt = executedAt; }
}
