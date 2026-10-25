package com.silentguard.backend.repository;

import com.silentguard.backend.model.ResolutionHistoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResolutionHistoryRepository extends JpaRepository<ResolutionHistoryEntity, String> {
    List<ResolutionHistoryEntity> findAllByOrderByUpdatedAtDesc();
    List<ResolutionHistoryEntity> findByIssueId(String issueId);
}
