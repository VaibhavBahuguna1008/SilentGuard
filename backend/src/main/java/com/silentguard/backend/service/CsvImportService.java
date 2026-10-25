package com.silentguard.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.silentguard.backend.model.DatasetEntity;
import com.silentguard.backend.repository.DatasetRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class CsvImportService {

    private final JdbcTemplate jdbcTemplate;
    private final DatasetRepository datasetRepository;
    private final ObjectMapper objectMapper;

    public CsvImportService(JdbcTemplate jdbcTemplate, DatasetRepository datasetRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.datasetRepository = datasetRepository;
        this.objectMapper = new ObjectMapper();
    }

    public DatasetEntity importCsv(MultipartFile file, String pipelineType, String sourceSystem) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("CSV file cannot be empty. Please select a valid CSV file.");
        }

        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.trim().isEmpty()) {
            throw new IllegalArgumentException("File name is missing.");
        }

        if (!originalName.toLowerCase().endsWith(".csv")) {
            throw new IllegalArgumentException("Only .csv files are supported. Received: " + originalName);
        }

        byte[] bytes = file.getBytes();
        String csvContent = new String(bytes, StandardCharsets.UTF_8);

        return processCsvContent(originalName, csvContent, pipelineType, sourceSystem);
    }

    public DatasetEntity processCsvContent(String filename, String csvContent, String pipelineType, String sourceSystem) throws Exception {
        if (csvContent == null || csvContent.trim().isEmpty()) {
            throw new IllegalArgumentException("CSV content is empty.");
        }

        String tableName = buildTableName(filename);

        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreEmptyLines(true)
                .setTrim(true)
                .build();

        CSVParser parser;
        try {
            parser = new CSVParser(new StringReader(csvContent), format);
        } catch (Exception e) {
            throw new IllegalArgumentException("Malformed CSV format: " + e.getMessage());
        }

        List<String> rawHeaders = new ArrayList<>(parser.getHeaderNames());
        if (rawHeaders.isEmpty()) {
            parser.close();
            throw new IllegalArgumentException("CSV file has no headers. Please provide a header row with column names.");
        }

        // Sanitize headers for dynamic PostgreSQL column names
        List<String> columns = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String h : rawHeaders) {
            String sanitized = sanitizeColumnName(h);
            if (seen.contains(sanitized)) {
                int count = 2;
                while (seen.contains(sanitized + "_" + count)) {
                    count++;
                }
                sanitized = sanitized + "_" + count;
            }
            seen.add(sanitized);
            columns.add(sanitized);
        }

        // Create the table in PostgreSQL if it doesn't already exist
        boolean tableAlreadyExisted = tableExists(tableName);
        if (!tableAlreadyExisted) {
            createTable(tableName, columns);
        }

        // Insert rows and convert to List<Map<String, String>> for rawDataJson
        List<CSVRecord> records = parser.getRecords();
        List<Map<String, String>> rowList = new ArrayList<>();

        for (CSVRecord record : records) {
            Map<String, String> rowMap = new LinkedHashMap<>();
            Object[] values = new Object[columns.size()];

            for (int i = 0; i < columns.size(); i++) {
                String val = null;
                try {
                    val = record.get(i);
                } catch (Exception ignored) {}

                values[i] = val;
                rowMap.put(columns.get(i), val != null ? val : "");
            }

            insertRow(tableName, columns, values);
            rowList.add(rowMap);
        }
        parser.close();

        String rawDataJson = objectMapper.writeValueAsString(rowList);
        String columnsJson = objectMapper.writeValueAsString(columns);

        // Save metadata into datasets table
        DatasetEntity entity = new DatasetEntity();
        entity.setDatasetId("ds-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 5));
        entity.setFileName(filename);
        entity.setTableName(tableName);
        entity.setPipelineType(pipelineType != null && !pipelineType.isEmpty() ? pipelineType : "BATCH");
        entity.setSourceSystem(sourceSystem != null && !sourceSystem.isEmpty() ? sourceSystem : "CSV_UPLOAD");
        entity.setReportedSuccess(true);
        entity.setRowCount(records.size());
        entity.setColumnCount(columns.size());
        entity.setColumnsJson(columnsJson);
        entity.setRawDataJson(rawDataJson);
        entity.setOriginalCsv(csvContent);
        entity.setCreatedAt(LocalDateTime.now());

        return datasetRepository.save(entity);
    }

    private boolean tableExists(String tableName) {
        String sql = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, tableName);
        return count != null && count > 0;
    }

    private String buildTableName(String filename) {
        int dot = filename.lastIndexOf('.');
        String base = (dot > 0) ? filename.substring(0, dot) : filename;
        String clean = base.toLowerCase().replaceAll("[^a-z0-9_]", "_");
        clean = clean.replaceAll("^_+", "");
        if (clean.length() > 40) clean = clean.substring(0, 40);
        return "ds_" + clean + "_" + (System.currentTimeMillis() % 100000);
    }

    private String sanitizeColumnName(String name) {
        String clean = name.toLowerCase().replaceAll("[^a-z0-9_]", "_");
        clean = clean.replaceAll("^_+", "");
        if (clean.isEmpty()) clean = "col";
        return clean;
    }

    private void createTable(String tableName, List<String> columns) {
        StringBuilder sql = new StringBuilder("CREATE TABLE ");
        sql.append(tableName).append(" (");
        sql.append("_row_id SERIAL PRIMARY KEY");
        for (String col : columns) {
            sql.append(", \"").append(col).append("\" TEXT");
        }
        sql.append(")");
        jdbcTemplate.execute(sql.toString());
    }

    private void insertRow(String tableName, List<String> columns, Object[] values) {
        StringBuilder sql = new StringBuilder("INSERT INTO ");
        sql.append(tableName).append(" (");
        for (int i = 0; i < columns.size(); i++) {
            sql.append("\"").append(columns.get(i)).append("\"");
            if (i < columns.size() - 1) sql.append(", ");
        }
        sql.append(") VALUES (");
        for (int i = 0; i < columns.size(); i++) {
            sql.append("?");
            if (i < columns.size() - 1) sql.append(", ");
        }
        sql.append(")");
        jdbcTemplate.update(sql.toString(), values);
    }
}
