package com.silentguard.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "resolution_history")
public class ResolutionHistoryEntity {

    @Id
    private String resolutionId;

    private String issueId;
    private String resolvedBy;

    @Column(columnDefinition = "TEXT")
    private String resolutionComment;

    private String resolutionStatus;
    private LocalDateTime updatedAt;

    public ResolutionHistoryEntity() {
        this.updatedAt = LocalDateTime.now();
    }

    public ResolutionHistoryEntity(String resolutionId, String issueId, String resolvedBy, String resolutionComment, String resolutionStatus) {
        this.resolutionId = resolutionId;
        this.issueId = issueId;
        this.resolvedBy = resolvedBy;
        this.resolutionComment = resolutionComment;
        this.resolutionStatus = resolutionStatus;
        this.updatedAt = LocalDateTime.now();
    }

    public String getResolutionId() { return resolutionId; }
    public void setResolutionId(String resolutionId) { this.resolutionId = resolutionId; }

    public String getIssueId() { return issueId; }
    public void setIssueId(String issueId) { this.issueId = issueId; }

    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }

    public String getResolutionComment() { return resolutionComment; }
    public void setResolutionComment(String resolutionComment) { this.resolutionComment = resolutionComment; }

    public String getResolutionStatus() { return resolutionStatus; }
    public void setResolutionStatus(String resolutionStatus) { this.resolutionStatus = resolutionStatus; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
