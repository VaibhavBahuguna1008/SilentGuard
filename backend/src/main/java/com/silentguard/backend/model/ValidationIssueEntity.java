package com.silentguard.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "validation_issues")
public class ValidationIssueEntity {

    @Id
    private String issueId;

    private String runId;
    private String datasetId;
    private int rowNumber;
    private String columnName;

    private String ruleId;
    private String ruleName;
    private String ruleType;
    private String severity;

    private String foundValue;

    @Column(columnDefinition = "TEXT")
    private String expectedCondition;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    private String resolutionStatus;
    private String category;

    @Column(columnDefinition = "TEXT")
    private String rowDataJson;

    public ValidationIssueEntity() {}

    public String getIssueId() { return issueId; }
    public void setIssueId(String issueId) { this.issueId = issueId; }

    public String getRunId() { return runId; }
    public void setRunId(String runId) { this.runId = runId; }

    public String getDatasetId() { return datasetId; }
    public void setDatasetId(String datasetId) { this.datasetId = datasetId; }

    public int getRowNumber() { return rowNumber; }
    public void setRowNumber(int rowNumber) { this.rowNumber = rowNumber; }

    public String getColumnName() { return columnName; }
    public void setColumnName(String columnName) { this.columnName = columnName; }

    public String getRuleId() { return ruleId; }
    public void setRuleId(String ruleId) { this.ruleId = ruleId; }

    public String getRuleName() { return ruleName; }
    public void setRuleName(String ruleName) { this.ruleName = ruleName; }

    public String getRuleType() { return ruleType; }
    public void setRuleType(String ruleType) { this.ruleType = ruleType; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getFoundValue() { return foundValue; }
    public void setFoundValue(String foundValue) { this.foundValue = foundValue; }

    public String getExpectedCondition() { return expectedCondition; }
    public void setExpectedCondition(String expectedCondition) { this.expectedCondition = expectedCondition; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public String getResolutionStatus() { return resolutionStatus; }
    public void setResolutionStatus(String resolutionStatus) { this.resolutionStatus = resolutionStatus; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getRowDataJson() { return rowDataJson; }
    public void setRowDataJson(String rowDataJson) { this.rowDataJson = rowDataJson; }
}
