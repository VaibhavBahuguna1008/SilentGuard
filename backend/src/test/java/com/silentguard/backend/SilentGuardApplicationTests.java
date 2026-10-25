package com.silentguard.backend;

import com.silentguard.backend.model.DatasetEntity;
import com.silentguard.backend.model.ValidationRuleEntity;
import com.silentguard.backend.repository.DatasetRepository;
import com.silentguard.backend.repository.ValidationRuleRepository;
import com.silentguard.backend.service.ValidationEngineService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

@SpringBootTest
class SilentGuardApplicationTests {

    @Autowired
    private DatasetRepository datasetRepository;

    @Autowired
    private ValidationRuleRepository ruleRepository;

    @Autowired
    private ValidationEngineService validationEngineService;

    @Test
    void contextLoads() {
        Assertions.assertNotNull(datasetRepository);
        Assertions.assertNotNull(ruleRepository);
        Assertions.assertNotNull(validationEngineService);
    }

    @Test
    void testSeededDataAndRules() {
        List<ValidationRuleEntity> rules = ruleRepository.findAll();
        Assertions.assertFalse(rules.isEmpty(), "Rules should be seeded into database");

        List<DatasetEntity> datasets = datasetRepository.findAll();
        Assertions.assertFalse(datasets.isEmpty(), "Datasets should be seeded into database");
    }

    @Test
    void testValidationEngineExecution() {
        List<DatasetEntity> datasets = datasetRepository.findAll();
        DatasetEntity first = datasets.get(0);
        List<ValidationRuleEntity> activeRules = ruleRepository.findByEnabled(true);

        ValidationEngineService.ValidationResult result =
                validationEngineService.runValidationOnDataset(first, activeRules);

        Assertions.assertNotNull(result.getRun());
        Assertions.assertNotNull(result.getIssues());
        Assertions.assertTrue(result.getRun().getTotalRecords() > 0);
    }
}
