import React from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  FileSpreadsheet, 
  FileDown, 
  Database, 
  Users, 
  Lock, 
  Cpu, 
  Server, 
  Workflow, 
  Sparkles, 
  FileText, 
  BarChart3, 
  Sliders, 
  History,
  Sun,
  Moon,
  ExternalLink,
  Code2,
  CheckCircle,
  Building2,
  MapPin,
  ChevronRight
} from 'lucide-react';
import mothersonLogo from '../assets/motherson-logo.png';

interface LandingPageViewProps {
  onGoToLogin: () => void;
  onLaunchApp: () => void;
  isAuthenticated: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onGoToLogin,
  onLaunchApp,
  isAuthenticated,
  theme,
  onToggleTheme
}) => {
  // 6 Dedicated Engineering Team Members based on Notion Architecture
  const teamMembers = [
    {
      id: 'member-1',
      name: 'Pranav Sharma',
      designation: 'Engineer Trainee',
      role: 'UI Dashboard & Health Overview Architect',
      memberRole: 'Lead Role',
      division: 'MDTL - Motherson Digital Technology Limited',
      location: 'Sector 62, Noida',
      avatarColor: 'from-blue-500 to-indigo-600',
      quote: 'When a user opens SilentGuard, my code establishes the heartbeat check with the Spring Boot backend, displays the dataset selector, and renders the health score and execution timeline to track quality trends over time.',
      ownership: 'UI Dashboard, Lifecycle Orchestration, Navigation & Trends',
      files: 'App.tsx, Navbar.tsx, DashboardView.tsx, RunHistoryView.tsx',
      responsibilities: [
        'Top-level application state & dynamic view switching',
        'Heartbeat PostgreSQL connection monitoring & health status',
        'Graduated health index dial & run delta comparison engine',
        'State persistence & graceful offline-to-online fallback'
      ]
    },
    {
      id: 'member-2',
      name: 'Khushi Tiwari',
      designation: 'Engineer Trainee',
      role: 'Interactive Grid & Issue Resolution Steward',
      memberRole: 'Plant Role',
      division: 'MDTL - Motherson Digital Technology Limited',
      location: 'Sector 62, Noida',
      avatarColor: 'from-emerald-500 to-teal-600',
      quote: 'I own the Data Explorer and issue remediation flow. My components highlight corrupted values directly in the tabular grid, allow data stewards to correct records in-place with instant re-validation, and maintain a traceable audit history.',
      ownership: 'Tabular Record Explorer, Cell-Level Defect Flagging & In-Place Editing',
      files: 'DataExplorerView.tsx, IssueResolutionDrawer.tsx, AutoFixVerificationModal.tsx',
      responsibilities: [
        'High-density tabular grid with cell-level defect flagging',
        'In-place spreadsheet cell editing with instant re-validation and backend PUT',
        'Data steward remediation drawer with status & comment logging',
        'Automated fix preview & side-by-side diff verification modal'
      ]
    },
    {
      id: 'member-3',
      name: 'Vaibhav Bahuguna',
      designation: 'Engineer Trainee',
      role: 'API Integration & File Ingestion Specialist',
      memberRole: 'Admin Role',
      division: 'MDTL - Motherson Digital Technology Limited',
      location: 'Sector 62, Noida',
      avatarColor: 'from-rose-500 to-red-600',
      quote: 'I handle the integration bridge. I ensure files are securely transferred from the browser to Spring Boot via multipart REST APIs, manage CORS headers, map data into TypeScript contracts, and handle errors gracefully.',
      ownership: 'Client-to-Server Bridge, Drag-and-Drop Ingestion, CORS Security & RBAC',
      files: 'UploadModal.tsx, api.ts, UserManagementView.tsx, DatasetController.java, CorsConfig.java',
      responsibilities: [
        'Multi-format drag-and-drop file ingestion (CSV & XLSX)',
        'Multi-sheet workbook detection & dynamic sheet mapping',
        'Typed TypeScript API client with resilience fallback & CORS security',
        'Admin employee onboarding, user management & RBAC governance'
      ]
    },
    {
      id: 'member-4',
      name: 'Kiran Sharma',
      designation: 'Engineer Trainee',
      role: 'Core Validation Engine & Algorithm Specialist',
      memberRole: 'Plant Role',
      division: 'MDTL - Motherson Digital Technology Limited',
      location: 'Sector 62, Noida',
      avatarColor: 'from-amber-500 to-orange-600',
      quote: 'I designed the validation engine and algorithms. When a dataset is submitted, my service evaluates all 8 rule types, detects Schema Drift, computes the health score, and flags record-level defects for the database.',
      ownership: '8-Constraint Validation Suite, Schema Drift & Mathematical Health',
      files: 'ValidationEngineService.java, validationEngine.ts, mockDatasets.ts',
      responsibilities: [
        '8 core constraint algorithms: Required, Unique, Format, Range, Cross-field',
        'Schema Drift detection for missing headers & relational collisions',
        'Graduated continuous health scoring formula balancing defect density',
        'Record-level defect flagging with instant mathematical parity'
      ]
    },
    {
      id: 'member-5',
      name: 'Kanak Jain',
      designation: 'Engineer Trainee',
      role: 'Dynamic Database Architecture & CSV Streaming',
      memberRole: 'Lead Role',
      division: 'MDTL - Motherson Digital Technology Limited',
      location: 'Sector 62, Noida',
      avatarColor: 'from-purple-500 to-pink-600',
      quote: 'I am responsible for the dynamic data tier. Rather than dumping every CSV into a generic table, my service dynamically generates a strongly-isolated PostgreSQL table for each upload, sanitizes headers, and safely inserts rows using parameterized SQL.',
      ownership: 'Low-Level CSV Stream Parsing, Dynamic PostgreSQL DDL & Batch Insertion',
      files: 'CsvImportService.java, SpringBatchPartitioningService.java, pom.xml',
      responsibilities: [
        'Dynamic PostgreSQL table generation (ds_<filename>_<timestamp>)',
        'Sanitized header normalization and SQL injection prevention',
        'Chunk-oriented batch streaming processing 5,000-record partitions in O(1) memory',
        'High-throughput parallel worker execution with skip fault tolerance'
      ]
    },
    {
      id: 'member-6',
      name: 'Tushar Kumar',
      designation: 'Engineer Trainee',
      role: 'Persistence, JPA Modeling & Audit Trail Engineer',
      memberRole: 'Lead Role',
      division: 'MDTL - Motherson Digital Technology Limited',
      location: 'Sector 62, Noida',
      avatarColor: 'from-cyan-500 to-blue-600',
      quote: 'I maintain the relational schema, JPA entities, and database repositories. I built the DataInitializer that automatically prepares our database on first launch and manage the rule repository and audit persistence layer.',
      ownership: 'Relational Data Schema, JPA Entities, Startup Database Seeding & Audit Persistence',
      files: 'DataInitializer.java, DatasetEntity.java, pdfReportGenerator.ts, ExportAuditView.tsx',
      responsibilities: [
        'Relational schema modeling across core PostgreSQL JPA entities',
        'Tri-preset automated database seeding for automotive & HR domains',
        'Official signed PDF Quality Audit Reports with SHA-256 seals & Excel workbooks',
        'Audit trail persistence with complete lifecycle change history'
      ]
    }
  ];

  // Technologies Stack
  const techStack = [
    {
      category: 'Frontend Client Tier',
      items: [
        { name: 'React 19', version: 'v19.0.1', desc: 'Component architecture with zero-boilerplate hooks & fast client reconciliation' },
        { name: 'TypeScript', version: 'v7.0', desc: 'Strict compile-time type safety across dataset schemas and validation rules' },
        { name: 'Tailwind CSS', version: 'v4.3', desc: 'Custom enterprise Motherson red palette with smooth dark & light themes' },
        { name: 'Vite 8', version: 'v8.3', desc: 'Ultra-fast ESM build system with sub-second production bundle bundling' },
        { name: 'Lucide Icons', version: 'v0.546', desc: 'Consistent geometric enterprise iconography throughout all toolbars' }
      ]
    },
    {
      category: 'Backend & Processing Tier',
      items: [
        { name: 'Spring Boot', version: 'v4.1.2', desc: 'Enterprise Java REST API with dependency injection & high concurrency' },
        { name: 'Spring Batch', version: 'Core', desc: 'Parallel chunk partitioning streaming millions of records with constant memory' },
        { name: 'Apache Commons CSV', version: 'v1.11.0', desc: 'Memory-bounded RFC 4180 streaming parser preventing heap exhaustion' },
        { name: 'Spring Data JPA & Hibernate', version: 'ORM', desc: 'Automated entity persistence, transactional queries & schema migration' }
      ]
    },
    {
      category: 'Database & Ingestion Gateway',
      items: [
        { name: 'PostgreSQL 16', version: 'v16.x', desc: 'Isolated dynamic relational tables per dataset with parameterized inserts' },
        { name: 'HikariCP Pooling', version: 'High-perf', desc: 'Optimized low-latency JDBC connection pool for batch execution' },
        { name: 'SheetJS / XLSX', version: 'v0.18.5', desc: 'Native Microsoft Excel (.xlsx/.xls) multi-sheet workbook parsing & export' },
        { name: 'PapaParse', version: 'v5.7', desc: 'Browser-side streaming CSV parser with delimiter & header sanitization' }
      ]
    },
    {
      category: 'Compliance, PDF & Governance',
      items: [
        { name: 'jsPDF & AutoTable', version: 'Latest', desc: 'Official signed PDF Quality Audit Reports with multi-page table formatting' },
        { name: 'Role-Based Access Control', version: 'RBAC', desc: 'Fine-grained access segregation: Administrator, Lead Steward, Plant Viewer' },
        { name: 'Audit Trail Engine', version: 'SHA-256', desc: 'Traceable remediation ledger recording steward comments & defect waivers' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0c0e] text-slate-900 dark:text-zinc-100 selection:bg-red-600 selection:text-white flex flex-col font-sans">
      {/* Top red corporate accent line */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-red-600 via-red-500 to-red-700 fixed top-0 left-0 right-0 z-50" />

      {/* Header Navigation */}
      <header className="sticky top-[2.5px] z-40 bg-white/90 dark:bg-[#0c0d10]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#22242d] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center pr-3 border-r border-slate-200 dark:border-zinc-800">
              <img
                src={mothersonLogo}
                alt="Motherson"
                className="h-5 sm:h-6 w-auto object-contain select-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 border border-red-200 dark:bg-red-600/10 dark:border-red-500/30 dark:text-red-500 flex items-center justify-center shadow-2xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                Silent<span className="text-[#e31b23] ml-0.5">Guard</span>
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-600 dark:text-zinc-300">
            <a href="#features" className="hover:text-red-600 dark:hover:text-red-400 transition">Features</a>
            <a href="#technologies" className="hover:text-red-600 dark:hover:text-red-400 transition">Technologies</a>
            <a href="#team" className="hover:text-red-600 dark:hover:text-red-400 transition">Engineering Team</a>
            <a href="#architecture" className="hover:text-red-600 dark:hover:text-red-400 transition">System Architecture</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-[#242630] bg-white dark:bg-[#121317] hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition cursor-pointer"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {isAuthenticated ? (
              <button
                onClick={onLaunchApp}
                className="group relative inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#e31b23] via-[#d0151c] to-[#b30e14] hover:from-[#c41219] hover:to-[#9f0b11] shadow-md shadow-red-900/30 hover:shadow-lg hover:shadow-red-900/40 transition-all duration-200 cursor-pointer border border-red-400/40"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Enter Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <button
                onClick={onGoToLogin}
                className="group relative inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#e31b23] via-[#d0151c] to-[#b30e14] hover:from-[#c41219] hover:to-[#9f0b11] shadow-md shadow-red-900/30 hover:shadow-lg hover:shadow-red-900/40 transition-all duration-200 cursor-pointer border border-red-400/40"
              >
                <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center shrink-0">
                  <Lock className="w-2.5 h-2.5 text-white" />
                </div>
                <span>Employee Sign In</span>
                <ArrowRight className="w-3 h-3 text-red-200 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-slate-200 dark:border-[#22242d]">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs font-mono font-bold mb-6">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span>Motherson Industrial Quality &amp; Silent Failure Defense Gateway</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight max-w-4xl mx-auto leading-tight">
            Stop Silent Data Failures Before They Reach Downstream Systems
          </h1>

          <p className="mt-5 text-sm sm:text-base text-slate-600 dark:text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            Enterprise tabular quality gateway for automotive manufacturing, MES shopfloors, and corporate rosters. Catches corrupt records even when ETL pipelines return misleading HTTP 200 success codes.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={isAuthenticated ? onLaunchApp : onGoToLogin}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-bold bg-[#e31b23] hover:bg-[#c41219] text-white shadow-lg shadow-red-950/40 transition cursor-pointer border border-red-500/40"
            >
              <span>{isAuthenticated ? 'Launch Platform Workspace' : 'Sign In with Employee Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#technologies"
              className="inline-flex items-center space-x-1.5 px-5 py-3 rounded-xl text-sm font-semibold bg-white dark:bg-[#131418] hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-[#242630] transition shadow-2xs"
            >
              <span>Explore Tech Stack &amp; Architecture</span>
            </a>
          </div>

          {/* Live System Metrics Badges */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] shadow-sm">
              <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 block">Ingestion Engine</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block font-mono">CSV &amp; Excel (.xlsx)</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">Multi-sheet detection</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] shadow-sm">
              <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 block">Rule Execution</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block font-mono">&lt; 15ms Latency</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">Graduated health formula</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] shadow-sm">
              <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 block">Compliance Reports</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block font-mono">Signed PDF &amp; XLSX</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">SHA-256 verified seal</span>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] shadow-sm">
              <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 block">Governance</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block font-mono">3-Tier RBAC</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">Admin, Steward, Viewer</span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Platform Capabilities Section */}
      <section id="features" className="py-16 border-b border-slate-200 dark:border-[#22242d] bg-white/50 dark:bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider font-mono">
              Engineered for Industrial Quality
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              End-to-End Silent Failure Defense Lifecycle
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-2">
              From raw plant file intake to certified compliance sign-off, SilentGuard delivers automated data integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] shadow-sm hover:border-red-500/50 transition">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-500 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Multi-Format Ingest (CSV &amp; Excel)
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Seamless drag-and-drop ingestion of standard RFC 4180 CSV files as well as multi-sheet Microsoft Excel (.xlsx/.xls) workbooks with automatic schema and active sheet detection.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] shadow-sm hover:border-red-500/50 transition">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                8-Constraint Validation Intelligence
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Applies Required, Unique, Format, Min/Max Boundaries, Referential Integrity, and Cross-field Chronology checks (e.g. dispatch date before manufacturing date) in milliseconds.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] shadow-sm hover:border-red-500/50 transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500 flex items-center justify-center mb-4">
                <FileDown className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Executive PDF Audit Reports
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Instantly generates concise, human-readable PDF compliance certificates complete with health score KPIs, rule checklists, defect records, and digital sign-off seals.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] shadow-sm hover:border-red-500/50 transition">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-500 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Role-Based Access Control (RBAC)
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Restricted to authorized Motherson employees. Administrators manage team onboarding, Lead Stewards remediate data, and Plant Viewers access read-only audit certificates.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] shadow-sm hover:border-red-500/50 transition">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Interactive Grid &amp; Diff Preview
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Double-click corrupt cells to edit records in-place. Review automated algorithmic corrections in a side-by-side diff preview modal before committing changes to PostgreSQL.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] shadow-sm hover:border-red-500/50 transition">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-500 flex items-center justify-center mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Dynamic PostgreSQL Isolation
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Generates dedicated, sanitized database tables per ingestion run. Streams large batches in 5,000-record chunks using parallel threads without crashing memory.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technologies Used Section */}
      <section id="technologies" className="py-16 border-b border-slate-200 dark:border-[#22242d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider font-mono">
              Enterprise Technology Stack
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Engineered with Modern, Production-Grade Technologies
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-2">
              Combining high-performance frontend interactivity with scalable Spring Boot &amp; PostgreSQL persistence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {techStack.map((category) => (
              <div 
                key={category.category}
                className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-6 shadow-sm"
              >
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-3 border-b border-slate-200 dark:border-[#242630] flex items-center justify-between">
                  <span>{category.category}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-bold">
                    {category.items.length} Techs
                  </span>
                </h3>

                <div className="mt-4 space-y-3.5">
                  {category.items.map((tech) => (
                    <div key={tech.name} className="flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 dark:text-white">{tech.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                            {tech.version}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                          {tech.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engineering Team Section (6 Team Members) */}
      <section id="team" className="py-16 border-b border-slate-200 dark:border-[#22242d] bg-white/40 dark:bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider font-mono">
              The Engineering Team
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Meet the 6 Architects Behind SilentGuard
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-2">
              Each member spearheads an architectural tier across UI, API gateway, core validation algorithms, and dynamic database persistence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member, index) => (
              <div
                key={member.id}
                className="bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] rounded-2xl p-6 shadow-sm hover:border-red-500/50 transition flex flex-col justify-between group"
              >
                <div>
                  {/* Member Header */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${member.avatarColor} text-white font-extrabold text-base flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition`}>
                      {member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition">
                          {member.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-bold">
                          M{index + 1}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400 block leading-tight mt-0.5">
                        {member.role}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                          {member.designation}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400">
                          {member.memberRole}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Division & Location */}
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 space-y-1 mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>{member.division}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>{member.location}</span>
                    </div>
                  </div>

                  {/* Quote / Architectural Role Narrative */}
                  {member.quote && (
                    <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200/80 dark:border-zinc-800 text-[11px] text-slate-700 dark:text-zinc-300 italic relative">
                      <span className="text-red-500 font-serif text-lg leading-none absolute top-1 left-1.5 opacity-40">“</span>
                      <p className="pl-3.5 relative z-10 leading-relaxed">
                        {member.quote}
                      </p>
                    </div>
                  )}

                  {/* Core Ownership */}
                  <div className="mb-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block mb-1">
                      Core Ownership
                    </span>
                    <p className="text-xs font-medium text-slate-800 dark:text-zinc-200">
                      {member.ownership}
                    </p>
                  </div>

                  {/* Responsibilities list */}
                  <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-zinc-400 mb-4">
                    {member.responsibilities.map((resp, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Primary Codebase Files */}
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 block mb-1">
                    Key Code Modules:
                  </span>
                  <p className="text-[10px] font-mono text-slate-700 dark:text-zinc-300 truncate bg-slate-50 dark:bg-[#0b0c0e] p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800">
                    {member.files}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="py-16 border-b border-slate-200 dark:border-[#22242d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider font-mono">
              System Architecture &amp; Data Flow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              4-Tier Enterprise Architecture
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-2">
              Clean separation of concerns with dual-engine parity for high resilience.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] shadow-sm">
              <div className="text-xs font-mono font-bold text-red-600 dark:text-red-400 mb-1">Tier 1: Client UI</div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">React 19 + TypeScript</h4>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Data explorer grid, health score dashboard, in-cell spreadsheet editing, and client-side XLSX/PDF rendering.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] shadow-sm">
              <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mb-1">Tier 2: REST API</div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Spring Boot Web Gateway</h4>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Multipart file upload, CORS configuration, typed JSON serialization, and global error handling.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] shadow-sm">
              <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mb-1">Tier 3: Quality Core</div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Validation Engine Service</h4>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Evaluates 8 rule types, performs Schema Drift detection, and computes the graduated health score.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#131418] border border-slate-200 dark:border-[#242630] shadow-sm">
              <div className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 mb-1">Tier 4: Persistence</div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">PostgreSQL 16 + JPA</h4>
              <p className="text-xs text-slate-600 dark:text-zinc-400">
                Dynamic table generation per dataset, chunk-oriented parallel batch streaming, and immutable audit logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 bg-gradient-to-br from-red-600 to-[#c41219] text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Protect Your Industrial Data Ingestion?
          </h2>
          <p className="mt-3 text-sm text-red-100 max-w-xl mx-auto">
            Sign in with your Motherson corporate credentials to access the live dashboard, upload spreadsheets, and generate verifiable audit reports.
          </p>
          <div className="mt-8">
            <button
              onClick={isAuthenticated ? onLaunchApp : onGoToLogin}
              className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-[#e31b23] text-sm font-extrabold shadow-xl transition cursor-pointer"
            >
              <span>{isAuthenticated ? 'Enter Platform Workspace' : 'Sign In to SilentGuard Gateway'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-[#232530] bg-white dark:bg-[#0e0f13] py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-zinc-400 gap-4">
          <div className="flex items-center space-x-3">
            <img
              src={mothersonLogo}
              alt="Motherson"
              className="h-4 w-auto object-contain select-none"
            />
            <span className="text-slate-300 dark:text-zinc-600">|</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200">SilentGuard</span>
            <span className="text-slate-300 dark:text-zinc-600">•</span>
            <span>Motherson Automotive &amp; Industrial Quality Gateway</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-500">
            Internal Confidential • Designed for Motherson Enterprise Operations
          </div>
        </div>
      </footer>
    </div>
  );
};
