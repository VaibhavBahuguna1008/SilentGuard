package com.silentguard.backend.repository;

import com.silentguard.backend.model.ValidationRuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ValidationRuleRepository extends JpaRepository<ValidationRuleEntity, String> {
    List<ValidationRuleEntity> findByEnabled(boolean enabled);
}
