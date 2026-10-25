package com.silentguard.backend.controller;

import com.silentguard.backend.model.ValidationRuleEntity;
import com.silentguard.backend.repository.ValidationRuleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/rules")
public class RuleController {

    private final ValidationRuleRepository ruleRepository;

    public RuleController(ValidationRuleRepository ruleRepository) {
        this.ruleRepository = ruleRepository;
    }

    @GetMapping
    public ResponseEntity<List<ValidationRuleEntity>> getAllRules() {
        return ResponseEntity.ok(ruleRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<ValidationRuleEntity> createRule(@RequestBody ValidationRuleEntity rule) {
        if (rule.getRuleId() == null || rule.getRuleId().isEmpty()) {
            rule.setRuleId("rule-" + System.currentTimeMillis());
        }
        return ResponseEntity.ok(ruleRepository.save(rule));
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<ValidationRuleEntity> toggleRule(@PathVariable String id) {
        Optional<ValidationRuleEntity> ruleOpt = ruleRepository.findById(id);
        if (ruleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ValidationRuleEntity rule = ruleOpt.get();
        rule.setEnabled(!rule.isEnabled());
        return ResponseEntity.ok(ruleRepository.save(rule));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable String id) {
        if (!ruleRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        ruleRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
