package com.silentguard.backend.repository;

import com.silentguard.backend.model.DatasetEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DatasetRepository extends JpaRepository<DatasetEntity, String> {
    List<DatasetEntity> findAllByOrderByCreatedAtDesc();
}
