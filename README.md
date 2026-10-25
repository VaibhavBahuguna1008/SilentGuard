# SilentGuard

> **A deterministic data quality and silent failure detection engine for tabular datasets, CSV file transfers, and enterprise data pipelines.**

---

## Architecture Overview

**SilentGuard** is a full-stack data quality application comprising:
1. **Frontend**: Single-page application built with **React 19**, **TypeScript**, **Tailwind CSS v4**, and **Vite 8**.
2. **Backend**: RESTful API service built with **Spring Boot 4 / Java 17**, **Spring Data JPA**, and **Apache Commons CSV**.
3. **Database**: **PostgreSQL 16** for persisting datasets, dynamic CSV tables, validation rules, validation run history, record-level issues, and resolution audit records.

```
       [ React 19 Frontend ]
                 │ (REST / Multipart HTTP)
                 ▼
     [ Spring Boot 4 Backend ]
      ├── DatasetController     ── CsvImportService
      ├── ValidationController  ── ValidationEngineService
      ├── RuleController
      └── AuditController
                 │ (Spring Data JPA / HikariCP)
                 ▼
      [ PostgreSQL 16 Database ]
      ├── datasets
      ├── validation_rules
      ├── validation_runs
      ├── validation_issues
      ├── resolution_history
      └── ds_* (dynamic CSV tables)
```

---

## Key Features

- **Multi-Category Rule Engine:**
  - **Required & Completeness:** Catch missing or whitespace-only fields.
  - **Uniqueness:** Fast hash-map duplicate detection on composite and single-column keys.
  - **Range & Boundary:** Numerical bounds (`MIN_VALUE`, `MAX_VALUE`).
  - **Format Validation:** Regular expression matching for emails, dates (`YYYY-MM-DD`), and identifiers.
  - **Cross-Field Logic:** Compare multiple columns per record (e.g. `delivery_date >= manufacturing_date`).
  - **Referential Integrity:** Verify foreign keys against approved enterprise catalog dictionaries.
  - **Schema Drift Alerting:** Detects when configured rules expect columns missing from the uploaded CSV.
- **Dynamic PostgreSQL Table Generation:**
  - Automatically creates typed tables (`ds_<filename>`) and inserts raw records using parameterized queries.
- **Interactive Data Explorer:**
  - Spreadsheet grid with cell-level error flagging.
  - In-place row editing with live re-validation and database persistence.
- **Contextual Value Inspector:**
  - Evaluates how polymorphic values (e.g. `"120"`) are interpreted across different schema domains (Department ID vs. Salary vs. Quantity).
- **Audit & Export:**
  - Corrected CSV export.
  - Audit trail logging and resolution tracking saved to PostgreSQL.

---

## REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend and PostgreSQL health check |
| `GET` | `/api/datasets` | List all uploaded and seeded datasets |
| `GET` | `/api/datasets/{id}` | Get dataset metadata and schema |
| `POST` | `/api/datasets/upload` | Multipart CSV file upload (creates table & stores rows) |
| `PUT` | `/api/datasets/{id}/records` | Update raw dataset records in PostgreSQL |
| `DELETE` | `/api/datasets/{id}` | Delete dataset |
| `GET` | `/api/rules` | List all validation rules |
| `POST` | `/api/rules` | Create or update a validation rule |
| `PUT` | `/api/rules/{id}/toggle` | Enable or disable a rule |
| `DELETE` | `/api/rules/{id}` | Delete a validation rule |
| `POST` | `/api/validation/execute` | Run server-side validation against a dataset and active rules |
| `GET` | `/api/validation/runs` | List validation execution run history |
| `GET` | `/api/validation/runs/{runId}/issues` | Get all record-level issues for a run |
| `GET` | `/api/audit/history` | List issue resolution audit logs |
| `POST` | `/api/audit/resolutions` | Record a data steward resolution |

---

## Running the Application

### 1. Prerequisites
- **Java 17+** (OpenJDK 17 recommended)
- **Node.js 18+** & npm
- **PostgreSQL 16** running on `localhost:5432` with database `silentguard_db`

### 2. Database Setup (PostgreSQL)
Ensure PostgreSQL is running and database `silentguard_db` exists:
```sql
CREATE DATABASE silentguard_db;
```
*(Default credentials configured in `backend/src/main/resources/application.properties`: user `postgres`, password `Mtc@1234` or configure via environment variables).*

Supported environment variables:
- `SPRING_DATASOURCE_URL` (default: `jdbc:postgresql://localhost:5432/silentguard_db`)
- `SPRING_DATASOURCE_USERNAME` (default: `postgres`)
- `SPRING_DATASOURCE_PASSWORD` (default: `Mtc@1234`)

### 3. Start the Spring Boot Backend
From the root or `backend/` directory:
```bash
cd backend
./mvnw spring-boot:run
```
The backend starts on `http://localhost:8080`.
Upon first start, `DataInitializer` automatically seeds the standard validation rules and initial datasets into PostgreSQL.

Verify backend health:
```bash
curl http://localhost:8080/api/health
```

### 4. Start the Frontend
From the root project directory:
```bash
npm install
npm run dev
```
Open `http://localhost:3000` (or `http://localhost:5173`) in your browser.
The Navbar will display `🟢 PostgreSQL 16 Connected`.

### 5. Run Backend Tests
```bash
cd backend
./mvnw test
```

### 6. Production Build
```bash
# Build frontend
npm run build

# Package backend JAR
cd backend
./mvnw clean package -DskipTests
```

---

## License

MIT License. Free for educational and organizational use.
