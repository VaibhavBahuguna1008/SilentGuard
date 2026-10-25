package com.silentguard.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "datasets")
public class DatasetEntity {

    @Id
    private String datasetId;

    @Column(nullable = false)
    private String fileName;

    // name of the dynamic postgres table created for this csv
    private String tableName;

    private String pipelineType;
    private String sourceSystem;
    private boolean reportedSuccess;
    private int rowCount;
    private int columnCount;

    @Column(columnDefinition = "TEXT")
    private String columnsJson;

    @Column(columnDefinition = "TEXT")
    private String rawDataJson;

    @Column(columnDefinition = "TEXT")
    private String originalCsv;

    private LocalDateTime createdAt;

    public DatasetEntity() {
        this.createdAt = LocalDateTime.now();
    }

    public DatasetEntity(String datasetId, String fileName, String pipelineType,
                         String sourceSystem, boolean reportedSuccess, int rowCount,
                         String columnsJson, String rawDataJson, String originalCsv) {
        this.datasetId = datasetId;
        this.fileName = fileName;
        this.pipelineType = pipelineType;
        this.sourceSystem = sourceSystem;
        this.reportedSuccess = reportedSuccess;
        this.rowCount = rowCount;
        this.columnsJson = columnsJson;
        this.rawDataJson = rawDataJson;
        this.originalCsv = originalCsv;
        this.createdAt = LocalDateTime.now();
    }

    public String getDatasetId() { return datasetId; }
    public void setDatasetId(String datasetId) { this.datasetId = datasetId; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getTableName() { return tableName; }
    public void setTableName(String tableName) { this.tableName = tableName; }

    public String getPipelineType() { return pipelineType; }
    public void setPipelineType(String pipelineType) { this.pipelineType = pipelineType; }

    public String getSourceSystem() { return sourceSystem; }
    public void setSourceSystem(String sourceSystem) { this.sourceSystem = sourceSystem; }

    public boolean isReportedSuccess() { return reportedSuccess; }
    public void setReportedSuccess(boolean reportedSuccess) { this.reportedSuccess = reportedSuccess; }

    public int getRowCount() { return rowCount; }
    public void setRowCount(int rowCount) { this.rowCount = rowCount; }

    public int getColumnCount() { return columnCount; }
    public void setColumnCount(int columnCount) { this.columnCount = columnCount; }

    public String getColumnsJson() { return columnsJson; }
    public void setColumnsJson(String columnsJson) { this.columnsJson = columnsJson; }

    public String getRawDataJson() { return rawDataJson; }
    public void setRawDataJson(String rawDataJson) { this.rawDataJson = rawDataJson; }

    public String getOriginalCsv() { return originalCsv; }
    public void setOriginalCsv(String originalCsv) { this.originalCsv = originalCsv; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
