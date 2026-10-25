package com.silentguard.backend.repository;

import com.silentguard.backend.model.ValidationIssueEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ValidationIssueRepository extends JpaRepository<ValidationIssueEntity, String> {
    List<ValidationIssueEntity> findByRunId(String runId);
    List<ValidationIssueEntity> findByDatasetId(String datasetId);
}
