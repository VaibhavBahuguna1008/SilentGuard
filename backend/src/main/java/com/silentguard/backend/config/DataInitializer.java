package com.silentguard.backend.config;

import com.silentguard.backend.model.DatasetEntity;
import com.silentguard.backend.model.ValidationRuleEntity;
import com.silentguard.backend.repository.DatasetRepository;
import com.silentguard.backend.repository.ValidationRuleRepository;
import com.silentguard.backend.service.CsvImportService;
import com.silentguard.backend.service.ValidationEngineService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final ValidationRuleRepository ruleRepository;
    private final DatasetRepository datasetRepository;
    private final CsvImportService csvImportService;
    private final ValidationEngineService validationEngineService;

    public DataInitializer(
            ValidationRuleRepository ruleRepository,
            DatasetRepository datasetRepository,
            CsvImportService csvImportService,
            ValidationEngineService validationEngineService
    ) {
        this.ruleRepository = ruleRepository;
        this.datasetRepository = datasetRepository;
        this.csvImportService = csvImportService;
        this.validationEngineService = validationEngineService;
    }

    @Override
    public void run(String... args) {
        seedValidationRules();
        seedInitialDatasets();
    }

    private void seedValidationRules() {
        if (ruleRepository.count() > 0) {
            log.info("Validation rules already present in PostgreSQL database ({})", ruleRepository.count());
            return;
        }

        log.info("Seeding standard validation rules into PostgreSQL...");
        List<ValidationRuleEntity> rules = new ArrayList<>();

        // Employee Rules
        rules.add(new ValidationRuleEntity(
                "emp-rule-1", "Mandatory Employee ID", "employee_id",
                "REQUIRED", null, "CRITICAL", true, "Missing Data",
                "Every record must contain a valid, non-empty employee identification number."
        ));

        rules.add(new ValidationRuleEntity(
                "emp-rule-2", "Unique Employee Identifier", "employee_id",
                "UNIQUE", null, "CRITICAL", true, "Uniqueness",
                "Employee ID must be unique across all records in the batch."
        ));

        rules.add(new ValidationRuleEntity(
                "emp-rule-3", "Valid Work Email Address", "email",
                "REQUIRED", null, "ERROR", true, "Missing Data",
                "Corporate email is mandatory for all onboarded personnel."
        ));

        rules.add(new ValidationRuleEntity(
                "emp-rule-4", "Email Format Standard", "email",
                "FORMAT", "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", "ERROR", true, "Data Format",
                "Email must conform to standard RFC 5322 format (e.g. name@company.com)."
        ));

        rules.add(new ValidationRuleEntity(
                "emp-rule-5", "Positive Salary Compensation", "salary",
                "MIN_VALUE", "1", "CRITICAL", true, "Range & Boundaries",
                "Monthly salary must be strictly positive and greater than zero."
        ));

        rules.add(new ValidationRuleEntity(
                "emp-rule-6", "Department Referential Integrity", "department_id",
                "REFERENTIAL_INTEGRITY", "10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160", "ERROR", true, "Referential",
                "Department ID must correspond to an approved enterprise department (10 to 160)."
        ));

        // Motherson Parts Dispatch Rules
        rules.add(new ValidationRuleEntity(
                "mth-rule-1", "Mandatory Part Number", "part_number",
                "REQUIRED", null, "CRITICAL", true, "Missing Data",
                "Every manufactured item or component must specify a designated part number."
        ));

        rules.add(new ValidationRuleEntity(
                "mth-rule-2", "Unique Part Per Batch", "part_number",
                "UNIQUE", null, "ERROR", true, "Uniqueness",
                "A part cannot appear multiple times within the same manufacturing batch."
        ));

        rules.add(new ValidationRuleEntity(
                "mth-rule-3", "Mandatory Supplier Code", "supplier_code",
                "REQUIRED", null, "CRITICAL", true, "Missing Data",
                "Supplier origin code is required for trace-and-track audit compliance."
        ));

        rules.add(new ValidationRuleEntity(
                "mth-rule-4", "Positive Production Quantity", "quantity",
                "MIN_VALUE", "1", "CRITICAL", true, "Range & Boundaries",
                "Dispatched quantity must be at least 1 unit."
        ));

        ValidationRuleEntity crossDateRule = new ValidationRuleEntity(
                "mth-rule-5", "Delivery Date Chronology", "delivery_date",
                "CROSS_FIELD", null, "CRITICAL", true, "Relationship Logic",
                "Delivery date cannot precede the component manufacturing date."
        );
        crossDateRule.setSecondColumn("manufacturing_date");
        crossDateRule.setOperator("GREATER_EQUAL");
        rules.add(crossDateRule);

        rules.add(new ValidationRuleEntity(
                "mth-rule-6", "Permitted Lifecycle Statuses", "status",
                "ALLOWED_VALUES", "Approved,Pending,Shipped,Quality_Check", "ERROR", true, "Data Format",
                "Part status must be one of: Approved, Pending, Shipped, Quality_Check."
        ));

        // Financial Orders Rules
        rules.add(new ValidationRuleEntity(
                "fin-rule-1", "Required Order ID", "order_id",
                "REQUIRED", null, "CRITICAL", true, "Missing Data",
                "Order reference cannot be empty."
        ));

        rules.add(new ValidationRuleEntity(
                "fin-rule-2", "Unique Order Identifier", "order_id",
                "UNIQUE", null, "CRITICAL", true, "Uniqueness",
                "Order reference must be unique."
        ));

        rules.add(new ValidationRuleEntity(
                "fin-rule-3", "Positive Order Amount", "total_amount",
                "MIN_VALUE", "0.01", "CRITICAL", true, "Range & Boundaries",
                "Order total amount must be strictly greater than 0.00."
        ));

        rules.add(new ValidationRuleEntity(
                "fin-rule-4", "Supported Settlement Currency", "currency",
                "ALLOWED_VALUES", "USD,EUR,GBP,INR,JPY", "ERROR", true, "Data Format",
                "Currency must be an approved settlement ISO currency."
        ));

        ruleRepository.saveAll(rules);
        log.info("Successfully seeded {} validation rules into PostgreSQL.", rules.size());
    }

    private void seedInitialDatasets() {
        if (datasetRepository.count() > 0) {
            log.info("Datasets already present in PostgreSQL database ({})", datasetRepository.count());
            return;
        }

        log.info("Seeding demo datasets into PostgreSQL...");

        String employeeCsv =
                "employee_id,name,email,salary,department_id\n" +
                "101,Amit Sharma,amit@example.com,45000,10\n" +
                "102,Priya Patel,,52000,20\n" +
                "102,Rahul Verma,rahul@example.com,-5000,10\n" +
                ",Neha Gupta,neha@example.com,38000,30\n" +
                "105,Vikram Singh,vikram@example.com,60000,99\n" +
                "106,Sneha Roy,sneha-at-corp.com,41000,20\n" +
                "107,Rajesh Kumar,rajesh@example.com,75000,10\n" +
                "108,Ananya Das,ananya@example.com,58000,10";

        String mothersonCsv =
                "part_number,batch_id,supplier_code,quantity,unit_price,manufacturing_date,delivery_date,status\n" +
                "MTH-8821,BATCH-2026-A,SUP-IND-01,150,42.50,2026-09-01,2026-09-15,Approved\n" +
                "MTH-9042,BATCH-2026-A,SUP-GER-04,-20,118.00,2026-09-05,2026-09-20,Approved\n" +
                "MTH-8821,BATCH-2026-A,SUP-IND-01,75,42.50,2026-09-02,2026-09-16,Approved\n" +
                "MTH-4410,BATCH-2026-B,,500,12.00,2026-10-01,2026-09-25,Pending\n" +
                "MTH-7731,BATCH-2026-C,SUP-JPN-09,0,85.20,2026-10-10,2026-10-25,InvalidStatus\n" +
                "MTH-3319,BATCH-2026-C,SUP-MEX-02,320,5.75,2026-10-11,2026-10-28,Shipped\n" +
                "MTH-5562,BATCH-2026-D,SUP-IND-03,450,24.00,2026-10-12,2026-10-30,Quality_Check\n" +
                "MTH-1190,BATCH-2026-D,SUP-GER-02,80,310.00,2026-10-15,2026-11-05,Approved";

        try {
            DatasetEntity empDataset = csvImportService.processCsvContent(
                    "employee_master_roster.csv",
                    employeeCsv,
                    "HR Ops Sync",
                    "Workday HCM Cloud"
            );
            log.info("Imported demo employee dataset: {}", empDataset.getDatasetId());

            DatasetEntity mthDataset = csvImportService.processCsvContent(
                    "motherson_parts_batch_dispatch.csv",
                    mothersonCsv,
                    "MES Quality Gateway",
                    "Motherson Shopfloor MES"
            );
            log.info("Imported demo motherson dataset: {}", mthDataset.getDatasetId());

            // Run initial validation on each
            List<ValidationRuleEntity> allRules = ruleRepository.findByEnabled(true);
            validationEngineService.runValidationOnDataset(empDataset, allRules);
            validationEngineService.runValidationOnDataset(mthDataset, allRules);

            log.info("Executed initial validation runs for demo datasets in PostgreSQL.");
        } catch (Exception e) {
            log.warn("Could not seed demo datasets: {}", e.getMessage());
        }
    }
}
