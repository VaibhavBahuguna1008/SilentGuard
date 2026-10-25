package com.silentguard.backend.controller;

import com.silentguard.backend.model.DatasetEntity;
import com.silentguard.backend.repository.DatasetRepository;
import com.silentguard.backend.service.CsvImportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/datasets")
public class DatasetController {

    private final DatasetRepository datasetRepository;
    private final CsvImportService csvImportService;

    public DatasetController(DatasetRepository datasetRepository, CsvImportService csvImportService) {
        this.datasetRepository = datasetRepository;
        this.csvImportService = csvImportService;
    }

    @GetMapping
    public ResponseEntity<List<DatasetEntity>> getAllDatasets() {
        return ResponseEntity.ok(datasetRepository.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DatasetEntity> getDatasetById(@PathVariable String id) {
        Optional<DatasetEntity> ds = datasetRepository.findById(id);
        return ds.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Handles multipart CSV file upload — parses CSV, creates dynamic table in PostgreSQL, stores metadata & JSON
    @PostMapping("/upload")
    public ResponseEntity<?> uploadCsv(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "pipelineType", defaultValue = "BATCH") String pipelineType,
            @RequestParam(value = "sourceSystem", defaultValue = "CSV_UPLOAD") String sourceSystem
    ) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Please select a non-empty CSV file before uploading"));
        }
        String name = file.getOriginalFilename();
        if (name == null || !name.toLowerCase().endsWith(".csv")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only .csv files are supported. Received: " + name));
        }
        try {
            DatasetEntity saved = csvImportService.importCsv(file, pipelineType, sourceSystem);
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to process CSV: " + e.getMessage()));
        }
    }

    // Saves dataset entity directly (e.g. from frontend state or json payload)
    @PostMapping
    public ResponseEntity<DatasetEntity> saveDataset(@RequestBody DatasetEntity dataset) {
        if (dataset.getDatasetId() == null || dataset.getDatasetId().isEmpty()) {
            dataset.setDatasetId("ds-" + System.currentTimeMillis());
        }
        DatasetEntity saved = datasetRepository.save(dataset);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/records")
    public ResponseEntity<DatasetEntity> updateRecords(
            @PathVariable String id,
            @RequestBody Map<String, Object> payload
    ) {
        Optional<DatasetEntity> existingOpt = datasetRepository.findById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        DatasetEntity ds = existingOpt.get();
        if (payload.containsKey("rawDataJson")) {
            ds.setRawDataJson((String) payload.get("rawDataJson"));
        }
        if (payload.containsKey("rowCount")) {
            ds.setRowCount(((Number) payload.get("rowCount")).intValue());
        }
        if (payload.containsKey("columnsJson")) {
            ds.setColumnsJson((String) payload.get("columnsJson"));
        }
        DatasetEntity updated = datasetRepository.save(ds);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDataset(@PathVariable String id) {
        if (!datasetRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        datasetRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
