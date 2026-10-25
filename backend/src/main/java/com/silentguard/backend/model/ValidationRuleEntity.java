package com.silentguard.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "validation_rules")
public class ValidationRuleEntity {

    @Id
    private String ruleId;

    @Column(nullable = false)
    private String ruleName;

    @Column(nullable = false)
    private String columnName;

    @Column(nullable = false)
    private String ruleType;

    private String parameter;
    private String severity;
    private boolean enabled;
    private String category;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String secondColumn;
    private String operator;

    public ValidationRuleEntity() {}

    public ValidationRuleEntity(String ruleId, String ruleName, String columnName, String ruleType, String parameter, String severity, boolean enabled, String category, String description) {
        this.ruleId = ruleId;
        this.ruleName = ruleName;
        this.columnName = columnName;
        this.ruleType = ruleType;
        this.parameter = parameter;
        this.severity = severity;
        this.enabled = enabled;
        this.category = category;
        this.description = description;
    }

    public String getRuleId() { return ruleId; }
    public void setRuleId(String ruleId) { this.ruleId = ruleId; }

    public String getRuleName() { return ruleName; }
    public void setRuleName(String ruleName) { this.ruleName = ruleName; }

    public String getColumnName() { return columnName; }
    public void setColumnName(String columnName) { this.columnName = columnName; }

    public String getRuleType() { return ruleType; }
    public void setRuleType(String ruleType) { this.ruleType = ruleType; }

    public String getParameter() { return parameter; }
    public void setParameter(String parameter) { this.parameter = parameter; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSecondColumn() { return secondColumn; }
    public void setSecondColumn(String secondColumn) { this.secondColumn = secondColumn; }

    public String getOperator() { return operator; }
    public void setOperator(String operator) { this.operator = operator; }
}
