import { RulePreset, ValidationRule, DepartmentReference, FieldDefinition } from '../types';

export const GENERIC_DATA_DICTIONARY: Record<string, FieldDefinition> = {
  employee_id: {
    columnName: 'employee_id',
    displayName: 'Employee ID',
    plainMeaning: 'A unique personal ID number given to each worker.',
    acceptableValues: 'Any positive unique number (e.g. 101, 102, 103). No two workers can have the same ID.',
    exampleGoodValue: '101',
    whyItMatters: 'If IDs are duplicated or missing, paychecks and access permissions get sent to the wrong person.'
  },
  name: {
    columnName: 'name',
    displayName: 'Employee Name',
    plainMeaning: 'The employee\'s full name (first and last name).',
    acceptableValues: 'Real names in text (e.g. Amit Sharma, Priya Patel).',
    exampleGoodValue: 'Amit Sharma',
    whyItMatters: 'Human identification on payroll registers and contracts.'
  },
  email: {
    columnName: 'email',
    displayName: 'Work Email Address',
    plainMeaning: 'The employee\'s official company email address.',
    acceptableValues: 'Must contain an @ sign and a domain name (e.g. priya@example.com).',
    exampleGoodValue: 'priya@example.com',
    whyItMatters: 'Required for system login, payslips, and corporate communications.'
  },
  salary: {
    columnName: 'salary',
    displayName: 'Monthly Salary',
    plainMeaning: 'The amount of money paid to the employee each month.',
    acceptableValues: 'Must be a positive number greater than zero (typically 20,000 to 150,000).',
    exampleGoodValue: '52000',
    whyItMatters: 'Negative numbers (like -5000) or zero break bank wire transfers and accounting balances.'
  },
  department_id: {
    columnName: 'department_id',
    displayName: 'Department Code',
    plainMeaning: 'A code showing which team or division the person belongs to.',
    acceptableValues: 'Approved codes: 10 (Engineering), 20 (Sales), 30 (Finance), 40 (HR), 50 (Operations), up to 160.',
    exampleGoodValue: '10',
    whyItMatters: 'Assigns employee costs to the correct managerial budget center.'
  },
  part_number: {
    columnName: 'part_number',
    displayName: 'Manufactured Part Number',
    plainMeaning: 'The unique component code for a car or machine part.',
    acceptableValues: 'Part code text like MTH-8821.',
    exampleGoodValue: 'MTH-8821',
    whyItMatters: 'Ensures the vehicle factory receives the exact right part for assembly.'
  },
  batch_id: {
    columnName: 'batch_id',
    displayName: 'Manufacturing Batch ID',
    plainMeaning: 'The production lot or run number that made these parts together.',
    acceptableValues: 'Batch label like BATCH-2026-A.',
    exampleGoodValue: 'BATCH-2026-A',
    whyItMatters: 'Required for vehicle safety recalls and quality traceability.'
  },
  supplier_code: {
    columnName: 'supplier_code',
    displayName: 'Supplier Vendor Code',
    plainMeaning: 'The code of the supplier or factory that manufactured the component.',
    acceptableValues: 'Approved vendor codes like SUP-IND-01, SUP-GER-04.',
    exampleGoodValue: 'SUP-IND-01',
    whyItMatters: 'Identifies who made the part if a defect is found.'
  },
  quantity: {
    columnName: 'quantity',
    displayName: 'Production Quantity',
    plainMeaning: 'The number of physical parts being shipped or manufactured.',
    acceptableValues: 'Must be at least 1 unit. Cannot be negative or zero.',
    exampleGoodValue: '150',
    whyItMatters: 'Negative numbers (like -20) or 0 cause warehouse and delivery calculation errors.'
  },
  unit_price: {
    columnName: 'unit_price',
    displayName: 'Unit Price',
    plainMeaning: 'Cost of one single manufactured item.',
    acceptableValues: 'Any positive price greater than zero.',
    exampleGoodValue: '42.50',
    whyItMatters: 'Required to compute purchase invoices.'
  },
  manufacturing_date: {
    columnName: 'manufacturing_date',
    displayName: 'Manufacturing Date',
    plainMeaning: 'The calendar date the part was produced on the factory floor.',
    acceptableValues: 'Standard date in YYYY-MM-DD format (e.g. 2026-09-01).',
    exampleGoodValue: '2026-09-01',
    whyItMatters: 'Sets the warranty date and manufacturing trace.'
  },
  delivery_date: {
    columnName: 'delivery_date',
    displayName: 'Delivery Date',
    plainMeaning: 'The date the parts will be or were delivered to the customer.',
    acceptableValues: 'Date that is on or after the manufacturing date.',
    exampleGoodValue: '2026-09-15',
    whyItMatters: 'An item cannot physically be delivered before the day it was manufactured.'
  },
  status: {
    columnName: 'status',
    displayName: 'Order / Part Status',
    plainMeaning: 'The current approval state of the item.',
    acceptableValues: 'Approved, Pending, Shipped, or Quality_Check.',
    exampleGoodValue: 'Approved',
    whyItMatters: 'Blocks uninspected or rejected parts from being shipped to car plants.'
  },
  order_id: {
    columnName: 'order_id',
    displayName: 'Order ID Number',
    plainMeaning: 'Sales transaction identifier for a customer purchase.',
    acceptableValues: 'Unique order numbers like ORD-5001.',
    exampleGoodValue: 'ORD-5001',
    whyItMatters: 'Links payments and shipments to customer accounts.'
  },
  total_amount: {
    columnName: 'total_amount',
    displayName: 'Total Order Amount',
    plainMeaning: 'The final total money billed for the order.',
    acceptableValues: 'Positive currency amount greater than 0.00.',
    exampleGoodValue: '1250.00',
    whyItMatters: 'Incorrect or truncated numbers (e.g. 612 instead of 6120) lead to billing revenue loss.'
  },
  currency: {
    columnName: 'currency',
    displayName: 'Currency Type',
    plainMeaning: 'The monetary currency code used for payment.',
    acceptableValues: 'Approved codes: USD, EUR, GBP, INR, JPY.',
    exampleGoodValue: 'USD',
    whyItMatters: 'Prevents charging a customer in the wrong currency.'
  }
};

export function getFieldDefinition(colName: string): FieldDefinition {
  const normalized = colName.toLowerCase().trim();
  if (GENERIC_DATA_DICTIONARY[normalized]) {
    return GENERIC_DATA_DICTIONARY[normalized];
  }
  // Fallbacks for common variations
  if (normalized.includes('dept')) return GENERIC_DATA_DICTIONARY['department_id'];
  if (normalized.includes('sal') || normalized.includes('wage') || normalized.includes('pay')) return GENERIC_DATA_DICTIONARY['salary'];
  if (normalized.includes('email')) return GENERIC_DATA_DICTIONARY['email'];
  if (normalized.includes('emp') && normalized.includes('id')) return GENERIC_DATA_DICTIONARY['employee_id'];
  if (normalized.includes('part')) return GENERIC_DATA_DICTIONARY['part_number'];
  if (normalized.includes('batch')) return GENERIC_DATA_DICTIONARY['batch_id'];
  if (normalized.includes('supp')) return GENERIC_DATA_DICTIONARY['supplier_code'];
  if (normalized.includes('qty') || normalized.includes('quant')) return GENERIC_DATA_DICTIONARY['quantity'];
  if (normalized.includes('price') || normalized.includes('cost')) return GENERIC_DATA_DICTIONARY['unit_price'];
  if (normalized.includes('curr')) return GENERIC_DATA_DICTIONARY['currency'];
  if (normalized.includes('order')) return GENERIC_DATA_DICTIONARY['order_id'];
  if (normalized.includes('amt') || normalized.includes('total')) return GENERIC_DATA_DICTIONARY['total_amount'];
  if (normalized.includes('status')) return GENERIC_DATA_DICTIONARY['status'];
  if (normalized.includes('deliver')) return GENERIC_DATA_DICTIONARY['delivery_date'];
  if (normalized.includes('manuf')) return GENERIC_DATA_DICTIONARY['manufacturing_date'];

  const friendlyName = colName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return {
    columnName: colName,
    displayName: friendlyName,
    plainMeaning: `Data field recording ${friendlyName.toLowerCase()} information for this dataset.`,
    acceptableValues: `Appropriate text or numeric values conforming to ${friendlyName.toLowerCase()} standards.`,
    exampleGoodValue: 'ValidEntry',
    whyItMatters: `Ensures accurate record processing and prevents downstream pipeline exceptions.`
  };
}

export const EMPLOYEE_CSV = `employee_id,name,email,salary,department_id
101,Amit Sharma,amit@example.com,45000,10
102,Priya Patel,,52000,20
102,Rahul Verma,rahul@example.com,-5000,10
,Neha Gupta,neha@example.com,38000,30
105,Vikram Singh,vikram@example.com,60000,99
106,Sneha Roy,sneha-at-corp.com,41000,20
107,Rajesh Kumar,rajesh@example.com,75000,10
108,Ananya Das,ananya@example.com,58000,10`;

export const MOTHERSON_PARTS_CSV = `part_number,batch_id,supplier_code,quantity,unit_price,manufacturing_date,delivery_date,status
MTH-8821,BATCH-2026-A,SUP-IND-01,150,42.50,2026-09-01,2026-09-15,Approved
MTH-9042,BATCH-2026-A,SUP-GER-04,-20,118.00,2026-09-05,2026-09-20,Approved
MTH-8821,BATCH-2026-A,SUP-IND-01,75,42.50,2026-09-02,2026-09-16,Approved
MTH-4410,BATCH-2026-B,,500,12.00,2026-10-01,2026-09-25,Pending
MTH-7731,BATCH-2026-C,SUP-JPN-09,0,85.20,2026-10-10,2026-10-25,InvalidStatus
MTH-3319,BATCH-2026-C,SUP-MEX-02,320,5.75,2026-10-11,2026-10-28,Shipped
MTH-5562,BATCH-2026-D,SUP-IND-03,450,24.00,2026-10-12,2026-10-30,Quality_Check
MTH-1190,BATCH-2026-D,SUP-GER-02,80,310.00,2026-10-15,2026-11-05,Approved`;

export const FINANCIAL_ORDERS_CSV = `order_id,customer_id,order_date,total_amount,currency,fulfillment_status
ORD-5001,CUST-901,2026-10-01,1250.00,USD,COMPLETED
ORD-5002,CUST-902,2026-10-02,3400.50,USD,COMPLETED
ORD-5003,CUST-903,2026-10-02,890.00,USD,PROCESSING
ORD-5004,CUST-904,2026-10-03,450.25,USD,COMPLETED
ORD-5005,CUST-905,2026-10-04,6120.00,USD,COMPLETED
ORD-5006,CUST-906,2026-10-04,230.00,USD,REFUNDED
ORD-5007,CUST-907,2026-10-05,1780.00,USD,COMPLETED
ORD-5008,CUST-908,2026-10-05,9500.00,USD,COMPLETED`;

// Master department reference catalog
export const MASTER_DEPARTMENT_CATALOG: DepartmentReference[] = [
  { id: 'dept-10', code: '10', name: 'Engineering', division: 'Product & Technology', costCenter: 'CC-ENG-101', headOfDepartment: 'A. Thorne', active: true },
  { id: 'dept-20', code: '20', name: 'Sales & Accounts', division: 'Commercial', costCenter: 'CC-SLS-201', headOfDepartment: 'E. Rostova', active: true },
  { id: 'dept-30', code: '30', name: 'Finance & Controlling', division: 'Finance', costCenter: 'CC-FIN-301', headOfDepartment: 'M. Vance', active: true },
  { id: 'dept-40', code: '40', name: 'Human Resources', division: 'People & Culture', costCenter: 'CC-HRO-401', headOfDepartment: 'S. Jenkins', active: true },
  { id: 'dept-50', code: '50', name: 'Plant Operations', division: 'Manufacturing', costCenter: 'CC-OPS-501', headOfDepartment: 'K. Takahashi', active: true },
  { id: 'dept-60', code: '60', name: 'Quality Assurance', division: 'Quality', costCenter: 'CC-QAS-601', headOfDepartment: 'D. Lindholm', active: true },
  { id: 'dept-70', code: '70', name: 'Supply Chain & Logistics', division: 'Procurement', costCenter: 'CC-SCL-701', headOfDepartment: 'A. Rao', active: true },
  { id: 'dept-80', code: '80', name: 'Research & Development', division: 'Innovation', costCenter: 'CC-RND-801', headOfDepartment: 'K. Becker', active: true },
  { id: 'dept-90', code: '90', name: 'Legal & Compliance', division: 'Legal', costCenter: 'CC-LGL-901', headOfDepartment: 'R. Stern', active: true },
  { id: 'dept-100', code: '100', name: 'Executive Office', division: 'Administration', costCenter: 'CC-EXE-001', headOfDepartment: 'Executive Director', active: true },
  { id: 'dept-110', code: '110', name: 'IT & Infrastructure', division: 'Technology', costCenter: 'CC-ITC-110', headOfDepartment: 'P. Novak', active: true },
  { id: 'dept-120', code: '120', name: 'Customer Support', division: 'Operations', costCenter: 'CC-CSS-120', headOfDepartment: 'M. Lin', active: true },
  { id: 'dept-130', code: '130', name: 'Health & Safety', division: 'Administration', costCenter: 'CC-HSE-130', headOfDepartment: 'C. Mendez', active: true },
  { id: 'dept-140', code: '140', name: 'Procurement & Vendor Sourcing', division: 'Procurement', costCenter: 'CC-PRC-140', headOfDepartment: 'F. Al-Mansoor', active: true },
  { id: 'dept-150', code: '150', name: 'Internal Audit', division: 'Finance', costCenter: 'CC-AUD-150', headOfDepartment: 'J. Hayes', active: true },
  { id: 'dept-160', code: '160', name: 'Tooling & Machining', division: 'Manufacturing', costCenter: 'CC-TLS-160', headOfDepartment: 'W. Meyer', active: true },
];

export const EXPANDED_DEPARTMENT_CODES = MASTER_DEPARTMENT_CATALOG.map(d => d.code);

export const DEFAULT_EMPLOYEE_RULES: ValidationRule[] = [
  {
    ruleId: 'emp-rule-1',
    ruleName: 'Mandatory Employee ID',
    columnName: 'employee_id',
    ruleType: 'REQUIRED',
    severity: 'CRITICAL',
    enabled: true,
    description: 'Every record must contain a valid, non-empty employee identification number.',
    category: 'Missing Data'
  },
  {
    ruleId: 'emp-rule-2',
    ruleName: 'Unique Employee Identifier',
    columnName: 'employee_id',
    ruleType: 'UNIQUE',
    severity: 'CRITICAL',
    enabled: true,
    description: 'Employee ID must be unique across all records in the batch.',
    category: 'Uniqueness'
  },
  {
    ruleId: 'emp-rule-3',
    ruleName: 'Valid Work Email Address',
    columnName: 'email',
    ruleType: 'REQUIRED',
    severity: 'ERROR',
    enabled: true,
    description: 'Corporate email is mandatory for all onboarded personnel.',
    category: 'Missing Data'
  },
  {
    ruleId: 'emp-rule-4',
    ruleName: 'Email Format Standard',
    columnName: 'email',
    ruleType: 'FORMAT',
    parameter: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    severity: 'ERROR',
    enabled: true,
    description: 'Email must conform to standard RFC 5322 format (e.g. name@company.com).',
    category: 'Data Format'
  },
  {
    ruleId: 'emp-rule-5',
    ruleName: 'Positive Salary Compensation',
    columnName: 'salary',
    ruleType: 'MIN_VALUE',
    parameter: '1',
    severity: 'CRITICAL',
    enabled: true,
    description: 'Monthly salary must be strictly positive and greater than zero.',
    category: 'Range & Boundaries'
  },
  {
    ruleId: 'emp-rule-6',
    ruleName: 'Department Referential Integrity',
    columnName: 'department_id',
    ruleType: 'REFERENTIAL_INTEGRITY',
    referenceList: EXPANDED_DEPARTMENT_CODES,
    severity: 'ERROR',
    enabled: true,
    description: `Department ID must correspond to an approved enterprise department in the 16-department registry (${EXPANDED_DEPARTMENT_CODES.length} departments: 10: Engineering, 20: Sales, 30: Finance, 40: HR, 50: Operations, 60: QA, 70: Supply Chain, 80: R&D, 90: Legal, 100: Executive, 110: IT, 120: Support, 130: HSE, 140: Procurement, 150: Audit, 160: Tooling).`,
    category: 'Referential'
  }
];

export const MOTHERSON_PARTS_RULES: ValidationRule[] = [
  {
    ruleId: 'mth-rule-1',
    ruleName: 'Mandatory Part Number',
    columnName: 'part_number',
    ruleType: 'REQUIRED',
    severity: 'CRITICAL',
    enabled: true,
    description: 'Every manufactured item or component must specify a designated part number.',
    category: 'Missing Data'
  },
  {
    ruleId: 'mth-rule-2',
    ruleName: 'Unique Part Per Batch',
    columnName: 'part_number',
    ruleType: 'UNIQUE',
    severity: 'ERROR',
    enabled: true,
    description: 'A part cannot appear multiple times within the same manufacturing batch.',
    category: 'Uniqueness'
  },
  {
    ruleId: 'mth-rule-3',
    ruleName: 'Mandatory Supplier Code',
    columnName: 'supplier_code',
    ruleType: 'REQUIRED',
    severity: 'CRITICAL',
    enabled: true,
    description: 'Supplier origin code is required for trace-and-track audit compliance.',
    category: 'Missing Data'
  },
  {
    ruleId: 'mth-rule-4',
    ruleName: 'Positive Production Quantity',
    columnName: 'quantity',
    ruleType: 'MIN_VALUE',
    parameter: '1',
    severity: 'CRITICAL',
    enabled: true,
    description: 'Dispatched quantity must be at least 1 unit.',
    category: 'Range & Boundaries'
  },
  {
    ruleId: 'mth-rule-5',
    ruleName: 'Delivery Date Chronology',
    columnName: 'delivery_date',
    ruleType: 'CROSS_FIELD',
    severity: 'CRITICAL',
    enabled: true,
    description: 'Delivery date cannot precede the component manufacturing date.',
    category: 'Relationship Logic',
    crossFieldConfig: {
      secondColumn: 'manufacturing_date',
      operator: 'GREATER_EQUAL'
    }
  },
  {
    ruleId: 'mth-rule-6',
    ruleName: 'Permitted Lifecycle Statuses',
    columnName: 'status',
    ruleType: 'ALLOWED_VALUES',
    parameter: 'Approved,Pending,Shipped,Quality_Check',
    severity: 'ERROR',
    enabled: true,
    description: 'Part status must be one of: Approved, Pending, Shipped, Quality_Check.',
    category: 'Data Format'
  }
];

export const RULE_PRESETS: RulePreset[] = [
  {
    id: 'preset-employee',
    name: 'HR & Employee Master Records',
    domain: 'Human Resources / Personnel',
    description: 'Standard data quality constraints for employee rosters, payroll systems, and expanded department integrity.',
    expectedColumns: ['employee_id', 'name', 'email', 'salary', 'department_id'],
    rules: DEFAULT_EMPLOYEE_RULES
  },
  {
    id: 'preset-motherson-parts',
    name: 'Motherson Automotive Parts & Dispatch',
    domain: 'Automotive Manufacturing & Supply Chain',
    description: 'Integrity checks for component batches, supplier attribution, chronology, and positive quantities.',
    expectedColumns: ['part_number', 'batch_id', 'supplier_code', 'quantity', 'unit_price', 'manufacturing_date', 'delivery_date', 'status'],
    rules: MOTHERSON_PARTS_RULES
  },
  {
    id: 'preset-financial-orders',
    name: 'E-Commerce / ERP Financial Orders',
    domain: 'Financial Transactions & Billing',
    description: 'Ensures transaction uniqueness, positive currency values, and recognized currencies.',
    expectedColumns: ['order_id', 'customer_id', 'order_date', 'total_amount', 'currency', 'fulfillment_status'],
    rules: [
      {
        ruleId: 'fin-rule-1',
        ruleName: 'Required Order ID',
        columnName: 'order_id',
        ruleType: 'REQUIRED',
        severity: 'CRITICAL',
        enabled: true,
        description: 'Order reference cannot be empty.',
        category: 'Missing Data'
      },
      {
        ruleId: 'fin-rule-2',
        ruleName: 'Unique Transaction Key',
        columnName: 'order_id',
        ruleType: 'UNIQUE',
        severity: 'CRITICAL',
        enabled: true,
        description: 'Orders cannot have duplicate transaction references.',
        category: 'Uniqueness'
      },
      {
        ruleId: 'fin-rule-3',
        ruleName: 'Positive Order Value',
        columnName: 'total_amount',
        ruleType: 'MIN_VALUE',
        parameter: '0.01',
        severity: 'CRITICAL',
        enabled: true,
        description: 'Order transaction amount must be greater than zero.',
        category: 'Range & Boundaries'
      },
      {
        ruleId: 'fin-rule-4',
        ruleName: 'Approved Currency Code',
        columnName: 'currency',
        ruleType: 'ALLOWED_VALUES',
        parameter: 'USD,EUR,GBP,INR,JPY',
        severity: 'ERROR',
        enabled: true,
        description: 'Currency must be one of approved ISO codes: USD, EUR, GBP, INR, JPY.',
        category: 'Data Format'
      }
    ]
  }
];
