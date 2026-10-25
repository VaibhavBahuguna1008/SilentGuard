package com.silentguard.backend.repository;

import com.silentguard.backend.model.ValidationRunEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ValidationRunRepository extends JpaRepository<ValidationRunEntity, String> {
    List<ValidationRunEntity> findByDatasetIdOrderByExecutedAtDesc(String datasetId);
    List<ValidationRunEntity> findAllByOrderByExecutedAtDesc();
}
