# UAT Pre-Migration Snapshot Output
Captured: 2026-06-24T03:32:43.735Z (script-local time; see server_time query below for DB server time)
DB: u686730471_Caveo_UAT (confirmed via live SELECT DATABASE())

## Statement 1
```sql
SELECT DATABASE() AS current_database
```
Result:
```json
[
  {
    "current_database": "u686730471_Caveo_UAT"
  }
]
```

## Statement 2
```sql
SELECT VERSION()  AS mysql_version
```
Result:
```json
[
  {
    "mysql_version": "11.8.6-MariaDB-log"
  }
]
```

## Statement 3
```sql
SELECT NOW()      AS server_time
```
Result:
```json
[
  {
    "server_time": "2026-06-23T22:02:43.000Z"
  }
]
```

## Statement 4
```sql
SELECT migration_name, started_at, finished_at, rolled_back_at
FROM `_prisma_migrations`
ORDER BY started_at
```
Result:
```json
[
  {
    "migration_name": "20260601000000_init_mysql",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260602120000_finance_operations_phase1",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260604000000_admin_console_foundation",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260604120000_policy_engine_foundation",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260604180000_workflow_engine",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260604220000_master_data_management",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260605000000_opportunity_discount_pct",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260605010000_crm_admin_engine",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260605020000_opportunity_won_fields",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260605030000_legacy_promote_and_net_profit",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260605050000_finance_admin_engine",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260609060000_performance_management_engine",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260609070000_communication_engine",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260610080000_integration_center",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260610090000_security_center",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260615000000_add_advance_category",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260617100000_employeetarget_relations",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260618000000_master_data_linkage",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260618100000_crm_lead_customer_ref",
    "started_at": "2026-06-18T12:21:19.608Z",
    "finished_at": "2026-06-18T12:21:19.608Z",
    "rolled_back_at": null
  }
]
```

## Statement 5
```sql
SELECT COUNT(*) AS total_migration_rows FROM `_prisma_migrations`
```
Result:
```json
[
  {
    "total_migration_rows": "19"
  }
]
```

## Statement 6
```sql
SELECT migration_name
FROM `_prisma_migrations`
WHERE migration_name IN (
  '20260621120000_add_soft_delete_fields_phase_a',
  '20260622120000_decimal_release1_lakhs_to_inr',
  '20260623060000_decimal_release2_combined_inr_canonical'
)
```
Result:
```json
[]
```

## Statement 7
```sql
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND (
    (TABLE_NAME = 'Expense'          AND COLUMN_NAME IN ('amountLakhs', 'gstAmountLakhs', 'deletedAt', 'deletedById', 'deleteReason')) OR
    (TABLE_NAME = 'EmployeeAdvance'  AND COLUMN_NAME IN ('amountLakhs', 'disbursedAmountLakhs', 'settledAmountLakhs', 'balanceLakhs', 'deletedAt', 'deletedById', 'deleteReason')) OR
    (TABLE_NAME = 'TravelClaim'      AND COLUMN_NAME IN ('amountLakhs', 'amountRupees', 'ratePerKm', 'deletedAt', 'deletedById', 'deleteReason')) OR
    (TABLE_NAME = 'Payment'          AND COLUMN_NAME IN ('amountLakhs', 'deletedAt', 'deletedById', 'deleteReason')) OR
    (TABLE_NAME = 'Collection'       AND COLUMN_NAME IN ('invoiceValueLakhs', 'amountWithoutGstLakhs', 'amountReceivedLakhs', 'deletedAt', 'deletedById', 'deleteReason')) OR
    (TABLE_NAME = 'OrderAdvance'     AND COLUMN_NAME IN ('amountLakhs')) OR
    (TABLE_NAME = 'CrmLead'          AND COLUMN_NAME IN ('expectedValue')) OR
    (TABLE_NAME = 'CrmOpportunity'   AND COLUMN_NAME IN ('value', 'dealValueExTax', 'netProfitLakhs')) OR
    (TABLE_NAME = 'SalesFunnel'      AND COLUMN_NAME IN ('dealValueLakhs', 'billingValueLakhs')) OR
    (TABLE_NAME = 'Customer'         AND COLUMN_NAME IN ('deletedAt', 'deletedById', 'deleteReason')) OR
    (TABLE_NAME = 'Vendor'           AND COLUMN_NAME IN ('deletedAt', 'deletedById', 'deleteReason')) OR
    (TABLE_NAME = 'kra_template_item' AND COLUMN_NAME IN ('expectedTarget', 'stretchTarget', 'minimumTarget')) OR
    (TABLE_NAME = 'KRA'              AND COLUMN_NAME IN ('target')) OR
    (TABLE_NAME = 'employee_target'  AND COLUMN_NAME IN ('targetJson')) OR
    (TABLE_NAME = 'team_target'      AND COLUMN_NAME IN ('targetJson')) OR
    (TABLE_NAME = 'Voucher'          AND COLUMN_NAME IN ('amountLakhs')) OR
    (TABLE_NAME = 'Ledger'           AND COLUMN_NAME IN ('amountLakhs')) OR
    (TABLE_NAME = 'FinAccount'       AND COLUMN_NAME IN ('openingBalance', 'currentBalance'))
  )
ORDER BY TABLE_NAME, COLUMN_NAME
```
Result:
```json
[
  {
    "TABLE_NAME": "Collection",
    "COLUMN_NAME": "amountReceivedLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "Collection",
    "COLUMN_NAME": "amountWithoutGstLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "Collection",
    "COLUMN_NAME": "invoiceValueLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": null
  },
  {
    "TABLE_NAME": "CrmLead",
    "COLUMN_NAME": "expectedValue",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "CrmOpportunity",
    "COLUMN_NAME": "dealValueExTax",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "CrmOpportunity",
    "COLUMN_NAME": "netProfitLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "CrmOpportunity",
    "COLUMN_NAME": "value",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "EmployeeAdvance",
    "COLUMN_NAME": "amountLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": null
  },
  {
    "TABLE_NAME": "EmployeeAdvance",
    "COLUMN_NAME": "balanceLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "EmployeeAdvance",
    "COLUMN_NAME": "disbursedAmountLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "EmployeeAdvance",
    "COLUMN_NAME": "settledAmountLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "employee_target",
    "COLUMN_NAME": "targetJson",
    "DATA_TYPE": "text",
    "COLUMN_TYPE": "text",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "''"
  },
  {
    "TABLE_NAME": "Expense",
    "COLUMN_NAME": "amountLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": null
  },
  {
    "TABLE_NAME": "Expense",
    "COLUMN_NAME": "gstAmountLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "FinAccount",
    "COLUMN_NAME": "currentBalance",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "FinAccount",
    "COLUMN_NAME": "openingBalance",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "KRA",
    "COLUMN_NAME": "target",
    "DATA_TYPE": "text",
    "COLUMN_TYPE": "text",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": null
  },
  {
    "TABLE_NAME": "kra_template_item",
    "COLUMN_NAME": "expectedTarget",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "kra_template_item",
    "COLUMN_NAME": "minimumTarget",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "kra_template_item",
    "COLUMN_NAME": "stretchTarget",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "Ledger",
    "COLUMN_NAME": "amountLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": null
  },
  {
    "TABLE_NAME": "OrderAdvance",
    "COLUMN_NAME": "amountLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": null
  },
  {
    "TABLE_NAME": "Payment",
    "COLUMN_NAME": "amountLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": null
  },
  {
    "TABLE_NAME": "SalesFunnel",
    "COLUMN_NAME": "billingValueLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "SalesFunnel",
    "COLUMN_NAME": "dealValueLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "team_target",
    "COLUMN_NAME": "targetJson",
    "DATA_TYPE": "text",
    "COLUMN_TYPE": "text",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "''"
  },
  {
    "TABLE_NAME": "TravelClaim",
    "COLUMN_NAME": "amountLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "TravelClaim",
    "COLUMN_NAME": "amountRupees",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "TravelClaim",
    "COLUMN_NAME": "ratePerKm",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0"
  },
  {
    "TABLE_NAME": "Voucher",
    "COLUMN_NAME": "amountLakhs",
    "DATA_TYPE": "double",
    "COLUMN_TYPE": "double",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": null
  }
]
```

## Statement 8
```sql
SELECT 'Expense'         AS table_name, COUNT(*) AS row_count FROM `Expense`
UNION ALL SELECT 'EmployeeAdvance',  COUNT(*) FROM `EmployeeAdvance`
UNION ALL SELECT 'TravelClaim',      COUNT(*) FROM `TravelClaim`
UNION ALL SELECT 'Payment',          COUNT(*) FROM `Payment`
UNION ALL SELECT 'Collection',       COUNT(*) FROM `Collection`
UNION ALL SELECT 'OrderAdvance',     COUNT(*) FROM `OrderAdvance`
UNION ALL SELECT 'CrmLead',          COUNT(*) FROM `CrmLead`
UNION ALL SELECT 'CrmOpportunity',   COUNT(*) FROM `CrmOpportunity`
UNION ALL SELECT 'SalesFunnel',      COUNT(*) FROM `SalesFunnel`
UNION ALL SELECT 'kra_template_item', COUNT(*) FROM `kra_template_item`
UNION ALL SELECT 'KRA',              COUNT(*) FROM `KRA`
UNION ALL SELECT 'employee_target',  COUNT(*) FROM `employee_target`
UNION ALL SELECT 'team_target',      COUNT(*) FROM `team_target`
UNION ALL SELECT 'Voucher',          COUNT(*) FROM `Voucher`
UNION ALL SELECT 'Ledger',           COUNT(*) FROM `Ledger`
UNION ALL SELECT 'FinAccount',       COUNT(*) FROM `FinAccount`
```
Result:
```json
[
  {
    "table_name": "Expense",
    "row_count": "0"
  },
  {
    "table_name": "EmployeeAdvance",
    "row_count": "0"
  },
  {
    "table_name": "TravelClaim",
    "row_count": "0"
  },
  {
    "table_name": "Payment",
    "row_count": "26"
  },
  {
    "table_name": "Collection",
    "row_count": "141"
  },
  {
    "table_name": "OrderAdvance",
    "row_count": "3"
  },
  {
    "table_name": "CrmLead",
    "row_count": "280"
  },
  {
    "table_name": "CrmOpportunity",
    "row_count": "49"
  },
  {
    "table_name": "SalesFunnel",
    "row_count": "100"
  },
  {
    "table_name": "kra_template_item",
    "row_count": "0"
  },
  {
    "table_name": "KRA",
    "row_count": "34"
  },
  {
    "table_name": "employee_target",
    "row_count": "0"
  },
  {
    "table_name": "team_target",
    "row_count": "0"
  },
  {
    "table_name": "Voucher",
    "row_count": "0"
  },
  {
    "table_name": "Ledger",
    "row_count": "0"
  },
  {
    "table_name": "FinAccount",
    "row_count": "0"
  }
]
```

## Statement 9
```sql
SELECT id, amountLakhs FROM `Payment` ORDER BY id
```
Result:
```json
[
  {
    "id": 1,
    "amountLakhs": 1.61
  },
  {
    "id": 2,
    "amountLakhs": 2.05
  },
  {
    "id": 3,
    "amountLakhs": 0.01
  },
  {
    "id": 4,
    "amountLakhs": 500000
  },
  {
    "id": 5,
    "amountLakhs": 1.54
  },
  {
    "id": 6,
    "amountLakhs": 17.42
  },
  {
    "id": 7,
    "amountLakhs": 341964
  },
  {
    "id": 8,
    "amountLakhs": 341964
  },
  {
    "id": 9,
    "amountLakhs": 341964
  },
  {
    "id": 10,
    "amountLakhs": 341964
  },
  {
    "id": 11,
    "amountLakhs": 341961
  },
  {
    "id": 12,
    "amountLakhs": 6.66
  },
  {
    "id": 13,
    "amountLakhs": 1.66
  },
  {
    "id": 14,
    "amountLakhs": 1.33
  },
  {
    "id": 15,
    "amountLakhs": 1.78
  },
  {
    "id": 16,
    "amountLakhs": 114755
  },
  {
    "id": 17,
    "amountLakhs": 114755
  },
  {
    "id": 18,
    "amountLakhs": 107380
  },
  {
    "id": 19,
    "amountLakhs": 64900
  },
  {
    "id": 20,
    "amountLakhs": 107380
  },
  {
    "id": 21,
    "amountLakhs": 65855.8
  },
  {
    "id": 22,
    "amountLakhs": 66516.6
  },
  {
    "id": 23,
    "amountLakhs": 66516.6
  },
  {
    "id": 24,
    "amountLakhs": 1000000
  },
  {
    "id": 25,
    "amountLakhs": 79827
  },
  {
    "id": 26,
    "amountLakhs": 112100
  }
]
```

## Statement 10
```sql
SELECT id, invoiceValueLakhs, amountWithoutGstLakhs, amountReceivedLakhs FROM `Collection` ORDER BY id
```
Result:
```json
[
  {
    "id": 159,
    "invoiceValueLakhs": 7788000,
    "amountWithoutGstLakhs": 6600000,
    "amountReceivedLakhs": 7788000
  },
  {
    "id": 160,
    "invoiceValueLakhs": 177000,
    "amountWithoutGstLakhs": 150000,
    "amountReceivedLakhs": 177000
  },
  {
    "id": 161,
    "invoiceValueLakhs": 6313000,
    "amountWithoutGstLakhs": 5350000,
    "amountReceivedLakhs": 2104333
  },
  {
    "id": 162,
    "invoiceValueLakhs": 424800,
    "amountWithoutGstLakhs": 360000,
    "amountReceivedLakhs": 424800
  },
  {
    "id": 163,
    "invoiceValueLakhs": 72275,
    "amountWithoutGstLakhs": 61250,
    "amountReceivedLakhs": 72275
  },
  {
    "id": 164,
    "invoiceValueLakhs": 4922.96,
    "amountWithoutGstLakhs": 4172,
    "amountReceivedLakhs": 4922.96
  },
  {
    "id": 165,
    "invoiceValueLakhs": 87025,
    "amountWithoutGstLakhs": 73750,
    "amountReceivedLakhs": 0
  },
  {
    "id": 166,
    "invoiceValueLakhs": 254600,
    "amountWithoutGstLakhs": 254600,
    "amountReceivedLakhs": 254600
  },
  {
    "id": 167,
    "invoiceValueLakhs": 53100,
    "amountWithoutGstLakhs": 45000,
    "amountReceivedLakhs": 53100
  },
  {
    "id": 168,
    "invoiceValueLakhs": 30505.36,
    "amountWithoutGstLakhs": 25852,
    "amountReceivedLakhs": 30507.04
  },
  {
    "id": 169,
    "invoiceValueLakhs": 74935.78199999999,
    "amountWithoutGstLakhs": 63504.899999999994,
    "amountReceivedLakhs": 74936
  },
  {
    "id": 170,
    "invoiceValueLakhs": 554836,
    "amountWithoutGstLakhs": 470200,
    "amountReceivedLakhs": 554836
  },
  {
    "id": 171,
    "invoiceValueLakhs": 131275,
    "amountWithoutGstLakhs": 111250,
    "amountReceivedLakhs": 131275
  },
  {
    "id": 172,
    "invoiceValueLakhs": 5077775.2212000005,
    "amountWithoutGstLakhs": 4303199.34,
    "amountReceivedLakhs": 5077776
  },
  {
    "id": 173,
    "invoiceValueLakhs": 18800,
    "amountWithoutGstLakhs": 18800,
    "amountReceivedLakhs": 18800
  },
  {
    "id": 174,
    "invoiceValueLakhs": 177637.2,
    "amountWithoutGstLakhs": 150540,
    "amountReceivedLakhs": 177637.2
  },
  {
    "id": 175,
    "invoiceValueLakhs": 177637.2,
    "amountWithoutGstLakhs": 150540,
    "amountReceivedLakhs": 177637.2
  },
  {
    "id": 176,
    "invoiceValueLakhs": 42480,
    "amountWithoutGstLakhs": 36000,
    "amountReceivedLakhs": 42480
  },
  {
    "id": 177,
    "invoiceValueLakhs": 366744,
    "amountWithoutGstLakhs": 310800,
    "amountReceivedLakhs": 366744
  },
  {
    "id": 178,
    "invoiceValueLakhs": 240130,
    "amountWithoutGstLakhs": 203500,
    "amountReceivedLakhs": 240130
  },
  {
    "id": 179,
    "invoiceValueLakhs": 44427,
    "amountWithoutGstLakhs": 37650,
    "amountReceivedLakhs": 0
  },
  {
    "id": 180,
    "invoiceValueLakhs": 44136.1772,
    "amountWithoutGstLakhs": 37403.54,
    "amountReceivedLakhs": 0
  },
  {
    "id": 181,
    "invoiceValueLakhs": 665520,
    "amountWithoutGstLakhs": 554000,
    "amountReceivedLakhs": 665520
  },
  {
    "id": 182,
    "invoiceValueLakhs": 166380,
    "amountWithoutGstLakhs": 138500,
    "amountReceivedLakhs": 166380
  },
  {
    "id": 183,
    "invoiceValueLakhs": 156468,
    "amountWithoutGstLakhs": 132600,
    "amountReceivedLakhs": 156468
  },
  {
    "id": 184,
    "invoiceValueLakhs": 736320.0472,
    "amountWithoutGstLakhs": 624000.04,
    "amountReceivedLakhs": 368160
  },
  {
    "id": 185,
    "invoiceValueLakhs": 114755,
    "amountWithoutGstLakhs": 97250,
    "amountReceivedLakhs": 114755
  },
  {
    "id": 186,
    "invoiceValueLakhs": 23600,
    "amountWithoutGstLakhs": 20000,
    "amountReceivedLakhs": 23600
  },
  {
    "id": 187,
    "invoiceValueLakhs": 205320,
    "amountWithoutGstLakhs": 174000,
    "amountReceivedLakhs": 205320
  },
  {
    "id": 188,
    "invoiceValueLakhs": 114755,
    "amountWithoutGstLakhs": 97250,
    "amountReceivedLakhs": 114755
  },
  {
    "id": 189,
    "invoiceValueLakhs": 114755,
    "amountWithoutGstLakhs": 97250,
    "amountReceivedLakhs": 114755
  },
  {
    "id": 190,
    "invoiceValueLakhs": 644.6104,
    "amountWithoutGstLakhs": 546.28,
    "amountReceivedLakhs": 645
  },
  {
    "id": 191,
    "invoiceValueLakhs": 32815.469600000004,
    "amountWithoutGstLakhs": 27809.72,
    "amountReceivedLakhs": 32815.47
  },
  {
    "id": 192,
    "invoiceValueLakhs": 76936,
    "amountWithoutGstLakhs": 65200,
    "amountReceivedLakhs": 76936
  },
  {
    "id": 193,
    "invoiceValueLakhs": 109150,
    "amountWithoutGstLakhs": 92500,
    "amountReceivedLakhs": 109150
  },
  {
    "id": 194,
    "invoiceValueLakhs": 133104,
    "amountWithoutGstLakhs": 110800,
    "amountReceivedLakhs": 133104
  },
  {
    "id": 195,
    "invoiceValueLakhs": 9758.6,
    "amountWithoutGstLakhs": 8270,
    "amountReceivedLakhs": 9759
  },
  {
    "id": 196,
    "invoiceValueLakhs": 21830,
    "amountWithoutGstLakhs": 18400,
    "amountReceivedLakhs": 21830
  },
  {
    "id": 197,
    "invoiceValueLakhs": 86661.8904,
    "amountWithoutGstLakhs": 73442.28,
    "amountReceivedLakhs": 86661.8904
  },
  {
    "id": 198,
    "invoiceValueLakhs": 114755,
    "amountWithoutGstLakhs": 97250,
    "amountReceivedLakhs": 114755
  },
  {
    "id": 199,
    "invoiceValueLakhs": 1222480,
    "amountWithoutGstLakhs": 1036000,
    "amountReceivedLakhs": 1222480
  },
  {
    "id": 200,
    "invoiceValueLakhs": 60180,
    "amountWithoutGstLakhs": 51000,
    "amountReceivedLakhs": 60180
  },
  {
    "id": 201,
    "invoiceValueLakhs": 114755,
    "amountWithoutGstLakhs": 97250,
    "amountReceivedLakhs": 114755
  },
  {
    "id": 202,
    "invoiceValueLakhs": 79827,
    "amountWithoutGstLakhs": 67650,
    "amountReceivedLakhs": 79827
  },
  {
    "id": 203,
    "invoiceValueLakhs": 5310,
    "amountWithoutGstLakhs": 4500,
    "amountReceivedLakhs": 0
  },
  {
    "id": 204,
    "invoiceValueLakhs": 161070,
    "amountWithoutGstLakhs": 136500,
    "amountReceivedLakhs": 161070
  },
  {
    "id": 205,
    "invoiceValueLakhs": 396940,
    "amountWithoutGstLakhs": 396940,
    "amountReceivedLakhs": 396940
  },
  {
    "id": 206,
    "invoiceValueLakhs": 114755,
    "amountWithoutGstLakhs": 97250,
    "amountReceivedLakhs": 114755
  },
  {
    "id": 207,
    "invoiceValueLakhs": 114755,
    "amountWithoutGstLakhs": 97250,
    "amountReceivedLakhs": 114755
  },
  {
    "id": 208,
    "invoiceValueLakhs": 2133440,
    "amountWithoutGstLakhs": 1808000,
    "amountReceivedLakhs": 1500000
  },
  {
    "id": 209,
    "invoiceValueLakhs": 37524,
    "amountWithoutGstLakhs": 31800,
    "amountReceivedLakhs": 37524
  },
  {
    "id": 210,
    "invoiceValueLakhs": 53100,
    "amountWithoutGstLakhs": 45000,
    "amountReceivedLakhs": 53100
  },
  {
    "id": 211,
    "invoiceValueLakhs": 3202638,
    "amountWithoutGstLakhs": 2714100,
    "amountReceivedLakhs": 1067546
  },
  {
    "id": 212,
    "invoiceValueLakhs": 126397.824,
    "amountWithoutGstLakhs": 107116.79999999999,
    "amountReceivedLakhs": 126398
  },
  {
    "id": 213,
    "invoiceValueLakhs": 53277,
    "amountWithoutGstLakhs": 45150,
    "amountReceivedLakhs": 0
  },
  {
    "id": 214,
    "invoiceValueLakhs": 1741680,
    "amountWithoutGstLakhs": 1476000,
    "amountReceivedLakhs": 1741680
  },
  {
    "id": 215,
    "invoiceValueLakhs": 150096,
    "amountWithoutGstLakhs": 127200,
    "amountReceivedLakhs": 150096
  },
  {
    "id": 216,
    "invoiceValueLakhs": 112100,
    "amountWithoutGstLakhs": 95000,
    "amountReceivedLakhs": 112100
  },
  {
    "id": 217,
    "invoiceValueLakhs": 136526,
    "amountWithoutGstLakhs": 115700,
    "amountReceivedLakhs": 136526
  },
  {
    "id": 218,
    "invoiceValueLakhs": 56037.350399999996,
    "amountWithoutGstLakhs": 47489.28,
    "amountReceivedLakhs": 56037.4
  },
  {
    "id": 219,
    "invoiceValueLakhs": 175820,
    "amountWithoutGstLakhs": 149000,
    "amountReceivedLakhs": 175820
  },
  {
    "id": 220,
    "invoiceValueLakhs": 107380,
    "amountWithoutGstLakhs": 91000,
    "amountReceivedLakhs": 107380
  },
  {
    "id": 221,
    "invoiceValueLakhs": 177000,
    "amountWithoutGstLakhs": 150000,
    "amountReceivedLakhs": 177000
  },
  {
    "id": 222,
    "invoiceValueLakhs": 37524,
    "amountWithoutGstLakhs": 31800,
    "amountReceivedLakhs": 37524
  },
  {
    "id": 223,
    "invoiceValueLakhs": 380472.88700000005,
    "amountWithoutGstLakhs": 322434.65,
    "amountReceivedLakhs": 380472.895
  },
  {
    "id": 224,
    "invoiceValueLakhs": 31529.6,
    "amountWithoutGstLakhs": 26720,
    "amountReceivedLakhs": 0
  },
  {
    "id": 225,
    "invoiceValueLakhs": 64900,
    "amountWithoutGstLakhs": 55000,
    "amountReceivedLakhs": 64900
  },
  {
    "id": 226,
    "invoiceValueLakhs": 4811400.44,
    "amountWithoutGstLakhs": 4077458.0000000005,
    "amountReceivedLakhs": 0
  },
  {
    "id": 227,
    "invoiceValueLakhs": 57385.76,
    "amountWithoutGstLakhs": 48632,
    "amountReceivedLakhs": 57386
  },
  {
    "id": 228,
    "invoiceValueLakhs": 71000.62359999999,
    "amountWithoutGstLakhs": 60170.02,
    "amountReceivedLakhs": 0
  },
  {
    "id": 229,
    "invoiceValueLakhs": 161081.8,
    "amountWithoutGstLakhs": 136510,
    "amountReceivedLakhs": 161082
  },
  {
    "id": 230,
    "invoiceValueLakhs": 153872,
    "amountWithoutGstLakhs": 130400,
    "amountReceivedLakhs": 153872
  },
  {
    "id": 231,
    "invoiceValueLakhs": 513750.76,
    "amountWithoutGstLakhs": 435382,
    "amountReceivedLakhs": 513751
  },
  {
    "id": 232,
    "invoiceValueLakhs": 2832,
    "amountWithoutGstLakhs": 2400,
    "amountReceivedLakhs": 0
  },
  {
    "id": 233,
    "invoiceValueLakhs": 107380,
    "amountWithoutGstLakhs": 91000,
    "amountReceivedLakhs": 107380
  },
  {
    "id": 234,
    "invoiceValueLakhs": 65855.8,
    "amountWithoutGstLakhs": 55810,
    "amountReceivedLakhs": 65855.8
  },
  {
    "id": 235,
    "invoiceValueLakhs": 42480,
    "amountWithoutGstLakhs": 36000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 236,
    "invoiceValueLakhs": 2950,
    "amountWithoutGstLakhs": 2500,
    "amountReceivedLakhs": 0
  },
  {
    "id": 237,
    "invoiceValueLakhs": 11800,
    "amountWithoutGstLakhs": 10000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 238,
    "invoiceValueLakhs": 309360.6,
    "amountWithoutGstLakhs": 262170,
    "amountReceivedLakhs": 0
  },
  {
    "id": 239,
    "invoiceValueLakhs": 3635.58,
    "amountWithoutGstLakhs": 3081,
    "amountReceivedLakhs": 3635.58
  },
  {
    "id": 240,
    "invoiceValueLakhs": 946950,
    "amountWithoutGstLakhs": 802500,
    "amountReceivedLakhs": 0
  },
  {
    "id": 241,
    "invoiceValueLakhs": 109150,
    "amountWithoutGstLakhs": 92500,
    "amountReceivedLakhs": 109150
  },
  {
    "id": 242,
    "invoiceValueLakhs": 262550,
    "amountWithoutGstLakhs": 222500,
    "amountReceivedLakhs": 0
  },
  {
    "id": 243,
    "invoiceValueLakhs": 88736,
    "amountWithoutGstLakhs": 75200,
    "amountReceivedLakhs": 0
  },
  {
    "id": 244,
    "invoiceValueLakhs": 85137,
    "amountWithoutGstLakhs": 72150,
    "amountReceivedLakhs": 0
  },
  {
    "id": 245,
    "invoiceValueLakhs": 10974,
    "amountWithoutGstLakhs": 9300,
    "amountReceivedLakhs": 10974
  },
  {
    "id": 246,
    "invoiceValueLakhs": 11219.44,
    "amountWithoutGstLakhs": 9508,
    "amountReceivedLakhs": 11219.44
  },
  {
    "id": 247,
    "invoiceValueLakhs": 23600,
    "amountWithoutGstLakhs": 20000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 248,
    "invoiceValueLakhs": 41842.5876,
    "amountWithoutGstLakhs": 35459.82,
    "amountReceivedLakhs": 0
  },
  {
    "id": 249,
    "invoiceValueLakhs": 65195,
    "amountWithoutGstLakhs": 55250,
    "amountReceivedLakhs": 0
  },
  {
    "id": 250,
    "invoiceValueLakhs": 66516.6,
    "amountWithoutGstLakhs": 56370,
    "amountReceivedLakhs": 66516.6
  },
  {
    "id": 251,
    "invoiceValueLakhs": 66516.6,
    "amountWithoutGstLakhs": 56370,
    "amountReceivedLakhs": 66516.6
  },
  {
    "id": 252,
    "invoiceValueLakhs": 322.494,
    "amountWithoutGstLakhs": 273.3,
    "amountReceivedLakhs": 0
  },
  {
    "id": 253,
    "invoiceValueLakhs": 195909.5,
    "amountWithoutGstLakhs": 166025,
    "amountReceivedLakhs": 195909.5
  },
  {
    "id": 254,
    "invoiceValueLakhs": 107380,
    "amountWithoutGstLakhs": 91000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 255,
    "invoiceValueLakhs": 53100,
    "amountWithoutGstLakhs": 45000,
    "amountReceivedLakhs": 53100
  },
  {
    "id": 256,
    "invoiceValueLakhs": 29028,
    "amountWithoutGstLakhs": 24600,
    "amountReceivedLakhs": 0
  },
  {
    "id": 257,
    "invoiceValueLakhs": 81880.90800000001,
    "amountWithoutGstLakhs": 69390.6,
    "amountReceivedLakhs": 0
  },
  {
    "id": 258,
    "invoiceValueLakhs": 114755,
    "amountWithoutGstLakhs": 97250,
    "amountReceivedLakhs": 0
  },
  {
    "id": 259,
    "invoiceValueLakhs": 53100,
    "amountWithoutGstLakhs": 45000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 260,
    "invoiceValueLakhs": 428139.4,
    "amountWithoutGstLakhs": 362830,
    "amountReceivedLakhs": 0
  },
  {
    "id": 261,
    "invoiceValueLakhs": 64900,
    "amountWithoutGstLakhs": 55000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 262,
    "invoiceValueLakhs": 64900,
    "amountWithoutGstLakhs": 55000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 263,
    "invoiceValueLakhs": 64900,
    "amountWithoutGstLakhs": 55000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 264,
    "invoiceValueLakhs": 64900,
    "amountWithoutGstLakhs": 55000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 265,
    "invoiceValueLakhs": 64900,
    "amountWithoutGstLakhs": 55000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 266,
    "invoiceValueLakhs": 114755,
    "amountWithoutGstLakhs": 97250,
    "amountReceivedLakhs": 0
  },
  {
    "id": 267,
    "invoiceValueLakhs": 114755,
    "amountWithoutGstLakhs": 97250,
    "amountReceivedLakhs": 0
  },
  {
    "id": 268,
    "invoiceValueLakhs": 64900,
    "amountWithoutGstLakhs": 55000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 269,
    "invoiceValueLakhs": 64900,
    "amountWithoutGstLakhs": 55000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 270,
    "invoiceValueLakhs": 64900,
    "amountWithoutGstLakhs": 55000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 271,
    "invoiceValueLakhs": 64900,
    "amountWithoutGstLakhs": 55000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 272,
    "invoiceValueLakhs": 114755,
    "amountWithoutGstLakhs": 97250,
    "amountReceivedLakhs": 0
  },
  {
    "id": 273,
    "invoiceValueLakhs": 64900,
    "amountWithoutGstLakhs": 55000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 274,
    "invoiceValueLakhs": 64900,
    "amountWithoutGstLakhs": 55000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 275,
    "invoiceValueLakhs": 64900,
    "amountWithoutGstLakhs": 55000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 276,
    "invoiceValueLakhs": 64900,
    "amountWithoutGstLakhs": 55000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 277,
    "invoiceValueLakhs": 64900,
    "amountWithoutGstLakhs": 55000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 278,
    "invoiceValueLakhs": 42480,
    "amountWithoutGstLakhs": 36000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 279,
    "invoiceValueLakhs": 114755,
    "amountWithoutGstLakhs": 97250,
    "amountReceivedLakhs": 0
  },
  {
    "id": 280,
    "invoiceValueLakhs": 7979986,
    "amountWithoutGstLakhs": 6762700,
    "amountReceivedLakhs": 7000000
  },
  {
    "id": 293,
    "invoiceValueLakhs": 21.3344,
    "amountWithoutGstLakhs": 18.08,
    "amountReceivedLakhs": 5
  },
  {
    "id": 294,
    "invoiceValueLakhs": 30680,
    "amountWithoutGstLakhs": 26000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 295,
    "invoiceValueLakhs": 120360,
    "amountWithoutGstLakhs": 102000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 297,
    "invoiceValueLakhs": 35400,
    "amountWithoutGstLakhs": 30000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 298,
    "invoiceValueLakhs": 92335,
    "amountWithoutGstLakhs": 78250,
    "amountReceivedLakhs": 0
  },
  {
    "id": 299,
    "invoiceValueLakhs": 178304.136,
    "amountWithoutGstLakhs": 151105.2,
    "amountReceivedLakhs": 178304.154
  },
  {
    "id": 300,
    "invoiceValueLakhs": 341964,
    "amountWithoutGstLakhs": 289800,
    "amountReceivedLakhs": 341964
  },
  {
    "id": 301,
    "invoiceValueLakhs": 341964,
    "amountWithoutGstLakhs": 2.5424,
    "amountReceivedLakhs": 683928
  },
  {
    "id": 302,
    "invoiceValueLakhs": 341964,
    "amountWithoutGstLakhs": 2.5424,
    "amountReceivedLakhs": 341964
  },
  {
    "id": 303,
    "invoiceValueLakhs": 49855,
    "amountWithoutGstLakhs": 3.3898,
    "amountReceivedLakhs": 0
  },
  {
    "id": 304,
    "invoiceValueLakhs": 7375,
    "amountWithoutGstLakhs": 6250,
    "amountReceivedLakhs": 0
  },
  {
    "id": 305,
    "invoiceValueLakhs": 48380,
    "amountWithoutGstLakhs": 41000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 306,
    "invoiceValueLakhs": 41300,
    "amountWithoutGstLakhs": 35000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 307,
    "invoiceValueLakhs": 145140,
    "amountWithoutGstLakhs": 123000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 308,
    "invoiceValueLakhs": 48380,
    "amountWithoutGstLakhs": 41000,
    "amountReceivedLakhs": 0
  },
  {
    "id": 309,
    "invoiceValueLakhs": 271400,
    "amountWithoutGstLakhs": 230000,
    "amountReceivedLakhs": 67850
  },
  {
    "id": 310,
    "invoiceValueLakhs": 95273,
    "amountWithoutGstLakhs": 80739.8305,
    "amountReceivedLakhs": 0
  },
  {
    "id": 311,
    "invoiceValueLakhs": 1221200,
    "amountWithoutGstLakhs": 1034915.2542,
    "amountReceivedLakhs": 0
  },
  {
    "id": 312,
    "invoiceValueLakhs": 454300,
    "amountWithoutGstLakhs": 385000,
    "amountReceivedLakhs": 0
  }
]
```

## Statement 11
```sql
SELECT id, amountLakhs FROM `OrderAdvance` ORDER BY id
```
Result:
```json
[
  {
    "id": 1,
    "amountLakhs": 341964
  },
  {
    "id": 2,
    "amountLakhs": 341964
  },
  {
    "id": 3,
    "amountLakhs": 37967
  }
]
```

## Statement 12
```sql
SELECT 'Payment.amountLakhs' AS field, SUM(amountLakhs) AS total, COUNT(*) AS row_count FROM `Payment`
```
Result:
```json
[
  {
    "field": "Payment.amountLakhs",
    "total": 4109837.06,
    "row_count": "26"
  }
]
```

## Statement 13
```sql
SELECT 'Collection.invoiceValueLakhs' AS field, SUM(invoiceValueLakhs) AS total, COUNT(*) AS row_count FROM `Collection`
```
Result:
```json
[
  {
    "field": "Collection.invoiceValueLakhs",
    "total": 58499554.543,
    "row_count": "141"
  }
]
```

## Statement 14
```sql
SELECT 'Collection.amountWithoutGstLakhs' AS field, SUM(amountWithoutGstLakhs) AS total, COUNT(*) AS row_count FROM `Collection`
```
Result:
```json
[
  {
    "field": "Collection.amountWithoutGstLakhs",
    "total": 49041707.40930001,
    "row_count": "141"
  }
]
```

## Statement 15
```sql
SELECT 'Collection.amountReceivedLakhs' AS field, SUM(amountReceivedLakhs) AS total, COUNT(*) AS row_count FROM `Collection`
```
Result:
```json
[
  {
    "field": "Collection.amountReceivedLakhs",
    "total": 38666388.729399994,
    "row_count": "141"
  }
]
```

## Statement 16
```sql
SELECT 'OrderAdvance.amountLakhs' AS field, SUM(amountLakhs) AS total, COUNT(*) AS row_count FROM `OrderAdvance`
```
Result:
```json
[
  {
    "field": "OrderAdvance.amountLakhs",
    "total": 721895,
    "row_count": "3"
  }
]
```

## Statement 17
```sql
SELECT id, expectedValue FROM `CrmLead` ORDER BY id
```
Result:
```json
[
  {
    "id": 1,
    "expectedValue": 0
  },
  {
    "id": 2,
    "expectedValue": 19
  },
  {
    "id": 3,
    "expectedValue": 14
  },
  {
    "id": 4,
    "expectedValue": 0
  },
  {
    "id": 5,
    "expectedValue": 10
  },
  {
    "id": 6,
    "expectedValue": 0
  },
  {
    "id": 7,
    "expectedValue": 0
  },
  {
    "id": 8,
    "expectedValue": 5
  },
  {
    "id": 9,
    "expectedValue": 40
  },
  {
    "id": 10,
    "expectedValue": 2.06
  },
  {
    "id": 11,
    "expectedValue": 0
  },
  {
    "id": 12,
    "expectedValue": 41
  },
  {
    "id": 13,
    "expectedValue": 3
  },
  {
    "id": 14,
    "expectedValue": 2.7
  },
  {
    "id": 15,
    "expectedValue": 8
  },
  {
    "id": 16,
    "expectedValue": 3
  },
  {
    "id": 17,
    "expectedValue": 1
  },
  {
    "id": 18,
    "expectedValue": 0
  },
  {
    "id": 19,
    "expectedValue": 13
  },
  {
    "id": 20,
    "expectedValue": 0
  },
  {
    "id": 21,
    "expectedValue": 0
  },
  {
    "id": 22,
    "expectedValue": 0
  },
  {
    "id": 23,
    "expectedValue": 2.3
  },
  {
    "id": 24,
    "expectedValue": 59.1244
  },
  {
    "id": 25,
    "expectedValue": 1.14
  },
  {
    "id": 26,
    "expectedValue": 1.9
  },
  {
    "id": 27,
    "expectedValue": 4.2
  },
  {
    "id": 28,
    "expectedValue": 0
  },
  {
    "id": 29,
    "expectedValue": 0
  },
  {
    "id": 30,
    "expectedValue": 1.3
  },
  {
    "id": 31,
    "expectedValue": 27
  },
  {
    "id": 32,
    "expectedValue": 0
  },
  {
    "id": 33,
    "expectedValue": 0
  },
  {
    "id": 34,
    "expectedValue": 3
  },
  {
    "id": 35,
    "expectedValue": 2
  },
  {
    "id": 36,
    "expectedValue": 0.3
  },
  {
    "id": 37,
    "expectedValue": 0
  },
  {
    "id": 38,
    "expectedValue": 0
  },
  {
    "id": 39,
    "expectedValue": 0
  },
  {
    "id": 40,
    "expectedValue": 0
  },
  {
    "id": 41,
    "expectedValue": 6.7
  },
  {
    "id": 42,
    "expectedValue": 4.34
  },
  {
    "id": 43,
    "expectedValue": 0.5
  },
  {
    "id": 44,
    "expectedValue": 55
  },
  {
    "id": 45,
    "expectedValue": 0
  },
  {
    "id": 46,
    "expectedValue": 3.3
  },
  {
    "id": 47,
    "expectedValue": 3
  },
  {
    "id": 48,
    "expectedValue": 9
  },
  {
    "id": 49,
    "expectedValue": 4
  },
  {
    "id": 50,
    "expectedValue": 0.5
  },
  {
    "id": 51,
    "expectedValue": 120
  },
  {
    "id": 52,
    "expectedValue": 1.2
  },
  {
    "id": 53,
    "expectedValue": 1.99
  },
  {
    "id": 54,
    "expectedValue": 0.26
  },
  {
    "id": 55,
    "expectedValue": 25
  },
  {
    "id": 56,
    "expectedValue": 0.52
  },
  {
    "id": 57,
    "expectedValue": 6.9
  },
  {
    "id": 58,
    "expectedValue": 0
  },
  {
    "id": 59,
    "expectedValue": 0
  },
  {
    "id": 60,
    "expectedValue": 0
  },
  {
    "id": 61,
    "expectedValue": 0
  },
  {
    "id": 62,
    "expectedValue": 0
  },
  {
    "id": 63,
    "expectedValue": 1.5
  },
  {
    "id": 64,
    "expectedValue": 0
  },
  {
    "id": 65,
    "expectedValue": 0
  },
  {
    "id": 66,
    "expectedValue": 0
  },
  {
    "id": 67,
    "expectedValue": 0
  },
  {
    "id": 68,
    "expectedValue": 0
  },
  {
    "id": 69,
    "expectedValue": 0
  },
  {
    "id": 70,
    "expectedValue": 0
  },
  {
    "id": 71,
    "expectedValue": 0
  },
  {
    "id": 72,
    "expectedValue": 0
  },
  {
    "id": 73,
    "expectedValue": 0
  },
  {
    "id": 74,
    "expectedValue": 0
  },
  {
    "id": 75,
    "expectedValue": 0
  },
  {
    "id": 76,
    "expectedValue": 0
  },
  {
    "id": 77,
    "expectedValue": 0
  },
  {
    "id": 78,
    "expectedValue": 0
  },
  {
    "id": 79,
    "expectedValue": 0
  },
  {
    "id": 80,
    "expectedValue": 0
  },
  {
    "id": 81,
    "expectedValue": 0
  },
  {
    "id": 82,
    "expectedValue": 0
  },
  {
    "id": 83,
    "expectedValue": 0
  },
  {
    "id": 84,
    "expectedValue": 0
  },
  {
    "id": 85,
    "expectedValue": 0
  },
  {
    "id": 86,
    "expectedValue": 0
  },
  {
    "id": 87,
    "expectedValue": 0
  },
  {
    "id": 88,
    "expectedValue": 0
  },
  {
    "id": 89,
    "expectedValue": 0
  },
  {
    "id": 90,
    "expectedValue": 0
  },
  {
    "id": 91,
    "expectedValue": 0
  },
  {
    "id": 92,
    "expectedValue": 0
  },
  {
    "id": 93,
    "expectedValue": 0
  },
  {
    "id": 94,
    "expectedValue": 0
  },
  {
    "id": 95,
    "expectedValue": 0
  },
  {
    "id": 96,
    "expectedValue": 0
  },
  {
    "id": 97,
    "expectedValue": 0
  },
  {
    "id": 98,
    "expectedValue": 0
  },
  {
    "id": 99,
    "expectedValue": 0
  },
  {
    "id": 100,
    "expectedValue": 0
  },
  {
    "id": 101,
    "expectedValue": 0
  },
  {
    "id": 102,
    "expectedValue": 0
  },
  {
    "id": 103,
    "expectedValue": 0
  },
  {
    "id": 104,
    "expectedValue": 0
  },
  {
    "id": 105,
    "expectedValue": 0
  },
  {
    "id": 106,
    "expectedValue": 0
  },
  {
    "id": 107,
    "expectedValue": 0
  },
  {
    "id": 108,
    "expectedValue": 0
  },
  {
    "id": 109,
    "expectedValue": 0
  },
  {
    "id": 110,
    "expectedValue": 0
  },
  {
    "id": 111,
    "expectedValue": 0
  },
  {
    "id": 112,
    "expectedValue": 1
  },
  {
    "id": 113,
    "expectedValue": 0
  },
  {
    "id": 114,
    "expectedValue": 0
  },
  {
    "id": 115,
    "expectedValue": 0
  },
  {
    "id": 116,
    "expectedValue": 0
  },
  {
    "id": 117,
    "expectedValue": 0
  },
  {
    "id": 118,
    "expectedValue": 0
  },
  {
    "id": 119,
    "expectedValue": 0
  },
  {
    "id": 120,
    "expectedValue": 0
  },
  {
    "id": 121,
    "expectedValue": 0
  },
  {
    "id": 122,
    "expectedValue": 0
  },
  {
    "id": 123,
    "expectedValue": 0
  },
  {
    "id": 124,
    "expectedValue": 0
  },
  {
    "id": 125,
    "expectedValue": 0
  },
  {
    "id": 126,
    "expectedValue": 0
  },
  {
    "id": 127,
    "expectedValue": 0
  },
  {
    "id": 128,
    "expectedValue": 0
  },
  {
    "id": 129,
    "expectedValue": 0
  },
  {
    "id": 130,
    "expectedValue": 0
  },
  {
    "id": 131,
    "expectedValue": 0
  },
  {
    "id": 132,
    "expectedValue": 0
  },
  {
    "id": 133,
    "expectedValue": 0
  },
  {
    "id": 134,
    "expectedValue": 0
  },
  {
    "id": 135,
    "expectedValue": 0
  },
  {
    "id": 136,
    "expectedValue": 0
  },
  {
    "id": 137,
    "expectedValue": 0
  },
  {
    "id": 138,
    "expectedValue": 0
  },
  {
    "id": 139,
    "expectedValue": 0
  },
  {
    "id": 140,
    "expectedValue": 0
  },
  {
    "id": 141,
    "expectedValue": 0
  },
  {
    "id": 142,
    "expectedValue": 0
  },
  {
    "id": 143,
    "expectedValue": 0
  },
  {
    "id": 144,
    "expectedValue": 0
  },
  {
    "id": 145,
    "expectedValue": 0
  },
  {
    "id": 146,
    "expectedValue": 0
  },
  {
    "id": 147,
    "expectedValue": 0
  },
  {
    "id": 148,
    "expectedValue": 0
  },
  {
    "id": 149,
    "expectedValue": 0
  },
  {
    "id": 150,
    "expectedValue": 0
  },
  {
    "id": 151,
    "expectedValue": 0
  },
  {
    "id": 152,
    "expectedValue": 0
  },
  {
    "id": 153,
    "expectedValue": 0
  },
  {
    "id": 154,
    "expectedValue": 0
  },
  {
    "id": 155,
    "expectedValue": 0
  },
  {
    "id": 156,
    "expectedValue": 0
  },
  {
    "id": 157,
    "expectedValue": 0
  },
  {
    "id": 158,
    "expectedValue": 0
  },
  {
    "id": 159,
    "expectedValue": 0
  },
  {
    "id": 160,
    "expectedValue": 0
  },
  {
    "id": 161,
    "expectedValue": 0
  },
  {
    "id": 162,
    "expectedValue": 0
  },
  {
    "id": 163,
    "expectedValue": 0
  },
  {
    "id": 164,
    "expectedValue": 0
  },
  {
    "id": 165,
    "expectedValue": 0
  },
  {
    "id": 166,
    "expectedValue": 0
  },
  {
    "id": 167,
    "expectedValue": 0
  },
  {
    "id": 168,
    "expectedValue": 0
  },
  {
    "id": 169,
    "expectedValue": 0
  },
  {
    "id": 170,
    "expectedValue": 0
  },
  {
    "id": 171,
    "expectedValue": 0
  },
  {
    "id": 172,
    "expectedValue": 0
  },
  {
    "id": 173,
    "expectedValue": 0
  },
  {
    "id": 174,
    "expectedValue": 0
  },
  {
    "id": 175,
    "expectedValue": 0
  },
  {
    "id": 176,
    "expectedValue": 0
  },
  {
    "id": 177,
    "expectedValue": 0
  },
  {
    "id": 178,
    "expectedValue": 0
  },
  {
    "id": 179,
    "expectedValue": 0
  },
  {
    "id": 180,
    "expectedValue": 0
  },
  {
    "id": 181,
    "expectedValue": 0
  },
  {
    "id": 182,
    "expectedValue": 0
  },
  {
    "id": 183,
    "expectedValue": 0
  },
  {
    "id": 184,
    "expectedValue": 0
  },
  {
    "id": 185,
    "expectedValue": 0
  },
  {
    "id": 186,
    "expectedValue": 0
  },
  {
    "id": 187,
    "expectedValue": 0
  },
  {
    "id": 188,
    "expectedValue": 0
  },
  {
    "id": 189,
    "expectedValue": 0
  },
  {
    "id": 190,
    "expectedValue": 0
  },
  {
    "id": 191,
    "expectedValue": 0
  },
  {
    "id": 192,
    "expectedValue": 0
  },
  {
    "id": 193,
    "expectedValue": 0
  },
  {
    "id": 194,
    "expectedValue": 0
  },
  {
    "id": 195,
    "expectedValue": 0
  },
  {
    "id": 196,
    "expectedValue": 0
  },
  {
    "id": 197,
    "expectedValue": 0
  },
  {
    "id": 198,
    "expectedValue": 0
  },
  {
    "id": 199,
    "expectedValue": 0
  },
  {
    "id": 200,
    "expectedValue": 0
  },
  {
    "id": 201,
    "expectedValue": 0
  },
  {
    "id": 202,
    "expectedValue": 0
  },
  {
    "id": 203,
    "expectedValue": 0
  },
  {
    "id": 204,
    "expectedValue": 0
  },
  {
    "id": 205,
    "expectedValue": 0
  },
  {
    "id": 206,
    "expectedValue": 0
  },
  {
    "id": 207,
    "expectedValue": 0
  },
  {
    "id": 208,
    "expectedValue": 0
  },
  {
    "id": 209,
    "expectedValue": 0
  },
  {
    "id": 210,
    "expectedValue": 0
  },
  {
    "id": 211,
    "expectedValue": 0
  },
  {
    "id": 212,
    "expectedValue": 0
  },
  {
    "id": 213,
    "expectedValue": 0
  },
  {
    "id": 214,
    "expectedValue": 0
  },
  {
    "id": 215,
    "expectedValue": 1.2
  },
  {
    "id": 216,
    "expectedValue": 0
  },
  {
    "id": 217,
    "expectedValue": 7
  },
  {
    "id": 218,
    "expectedValue": 0
  },
  {
    "id": 219,
    "expectedValue": 0
  },
  {
    "id": 220,
    "expectedValue": 0.95
  },
  {
    "id": 221,
    "expectedValue": 1.7
  },
  {
    "id": 222,
    "expectedValue": 0
  },
  {
    "id": 223,
    "expectedValue": 15
  },
  {
    "id": 224,
    "expectedValue": 0
  },
  {
    "id": 225,
    "expectedValue": 0
  },
  {
    "id": 226,
    "expectedValue": 0
  },
  {
    "id": 227,
    "expectedValue": 0
  },
  {
    "id": 228,
    "expectedValue": 0
  },
  {
    "id": 229,
    "expectedValue": 0
  },
  {
    "id": 230,
    "expectedValue": 0
  },
  {
    "id": 231,
    "expectedValue": 0
  },
  {
    "id": 232,
    "expectedValue": 15
  },
  {
    "id": 233,
    "expectedValue": 15
  },
  {
    "id": 234,
    "expectedValue": 0
  },
  {
    "id": 235,
    "expectedValue": 0
  },
  {
    "id": 236,
    "expectedValue": 0
  },
  {
    "id": 237,
    "expectedValue": 1.5
  },
  {
    "id": 238,
    "expectedValue": 0
  },
  {
    "id": 239,
    "expectedValue": 0
  },
  {
    "id": 240,
    "expectedValue": 0
  },
  {
    "id": 241,
    "expectedValue": 0
  },
  {
    "id": 242,
    "expectedValue": 0
  },
  {
    "id": 243,
    "expectedValue": 0
  },
  {
    "id": 244,
    "expectedValue": 0
  },
  {
    "id": 245,
    "expectedValue": 0
  },
  {
    "id": 246,
    "expectedValue": 0
  },
  {
    "id": 247,
    "expectedValue": 0
  },
  {
    "id": 248,
    "expectedValue": 0
  },
  {
    "id": 249,
    "expectedValue": 0
  },
  {
    "id": 250,
    "expectedValue": 0
  },
  {
    "id": 251,
    "expectedValue": 0
  },
  {
    "id": 252,
    "expectedValue": 0
  },
  {
    "id": 253,
    "expectedValue": 0
  },
  {
    "id": 254,
    "expectedValue": 0
  },
  {
    "id": 255,
    "expectedValue": 0
  },
  {
    "id": 256,
    "expectedValue": 0
  },
  {
    "id": 257,
    "expectedValue": 0
  },
  {
    "id": 258,
    "expectedValue": 0
  },
  {
    "id": 259,
    "expectedValue": 1.2
  },
  {
    "id": 260,
    "expectedValue": 0
  },
  {
    "id": 261,
    "expectedValue": 0
  },
  {
    "id": 262,
    "expectedValue": 0
  },
  {
    "id": 263,
    "expectedValue": 0
  },
  {
    "id": 264,
    "expectedValue": 0
  },
  {
    "id": 265,
    "expectedValue": 0
  },
  {
    "id": 266,
    "expectedValue": 0
  },
  {
    "id": 267,
    "expectedValue": 0
  },
  {
    "id": 268,
    "expectedValue": 0
  },
  {
    "id": 269,
    "expectedValue": 0
  },
  {
    "id": 270,
    "expectedValue": 0
  },
  {
    "id": 271,
    "expectedValue": 0
  },
  {
    "id": 272,
    "expectedValue": 0
  },
  {
    "id": 273,
    "expectedValue": 0
  },
  {
    "id": 274,
    "expectedValue": 0
  },
  {
    "id": 275,
    "expectedValue": 0
  },
  {
    "id": 276,
    "expectedValue": 0
  },
  {
    "id": 277,
    "expectedValue": 2.6
  },
  {
    "id": 278,
    "expectedValue": 0
  },
  {
    "id": 279,
    "expectedValue": 3.5
  },
  {
    "id": 280,
    "expectedValue": 0
  }
]
```

## Statement 18
```sql
SELECT id, value, dealValueExTax, netProfitLakhs FROM `CrmOpportunity` ORDER BY id
```
Result:
```json
[
  {
    "id": 1,
    "value": 2.06,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 2,
    "value": 13,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 3,
    "value": 10,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 4,
    "value": 2.7,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 5,
    "value": 3,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 6,
    "value": 10,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 7,
    "value": 44,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 8,
    "value": 2.3,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 9,
    "value": 59.1244,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 10,
    "value": 1.14,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 11,
    "value": 4.2,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 12,
    "value": 1.9,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 13,
    "value": 1.3,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 14,
    "value": 27,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 15,
    "value": 2,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 16,
    "value": 14.8,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 17,
    "value": 1,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 18,
    "value": 4,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 19,
    "value": 0.3,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 20,
    "value": 4.34,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 21,
    "value": 0.55,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 22,
    "value": 55,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 23,
    "value": 3.3,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 24,
    "value": 13,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 25,
    "value": 0,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 26,
    "value": 3,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 27,
    "value": 3,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 28,
    "value": 9,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 29,
    "value": 4,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 30,
    "value": 0.5,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 31,
    "value": 120,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 32,
    "value": 1.2,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 33,
    "value": 1.99,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 34,
    "value": 0.26,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 35,
    "value": 25,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 36,
    "value": 6,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 37,
    "value": 0.52,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 38,
    "value": 1.5,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 39,
    "value": 1,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 40,
    "value": 1.2,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 41,
    "value": 0,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 42,
    "value": -0.1,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 43,
    "value": 15,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 44,
    "value": 15,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 45,
    "value": 1.5,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 46,
    "value": 0.9,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 47,
    "value": 1.2,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 48,
    "value": 6.9,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  },
  {
    "id": 49,
    "value": 2.6,
    "dealValueExTax": 0,
    "netProfitLakhs": 0
  }
]
```

## Statement 19
```sql
SELECT id, dealValueLakhs, billingValueLakhs FROM `SalesFunnel` ORDER BY id
```
Result:
```json
[
  {
    "id": 1,
    "dealValueLakhs": 0.752,
    "billingValueLakhs": 0.8873599999999999
  },
  {
    "id": 2,
    "dealValueLakhs": 0.093,
    "billingValueLakhs": 0.10973999999999999
  },
  {
    "id": 3,
    "dealValueLakhs": 0.5581,
    "billingValueLakhs": 0.658558
  },
  {
    "id": 4,
    "dealValueLakhs": 8.025,
    "billingValueLakhs": 9.4695
  },
  {
    "id": 5,
    "dealValueLakhs": 2.6217,
    "billingValueLakhs": 3.093606
  },
  {
    "id": 6,
    "dealValueLakhs": 2.225,
    "billingValueLakhs": 2.6255
  },
  {
    "id": 7,
    "dealValueLakhs": 0.03081,
    "billingValueLakhs": 0.0363558
  },
  {
    "id": 8,
    "dealValueLakhs": 0.91,
    "billingValueLakhs": 1.0738
  },
  {
    "id": 9,
    "dealValueLakhs": 0.024,
    "billingValueLakhs": 0.028319999999999998
  },
  {
    "id": 10,
    "dealValueLakhs": 1.304,
    "billingValueLakhs": 1.5387199999999999
  },
  {
    "id": 11,
    "dealValueLakhs": 4.35382,
    "billingValueLakhs": 5.137507599999999
  },
  {
    "id": 12,
    "dealValueLakhs": 0.807402,
    "billingValueLakhs": 0.9527343599999999
  },
  {
    "id": 13,
    "dealValueLakhs": 0.36,
    "billingValueLakhs": 0.42479999999999996
  },
  {
    "id": 14,
    "dealValueLakhs": 0.55,
    "billingValueLakhs": 0.649
  },
  {
    "id": 15,
    "dealValueLakhs": 2.898,
    "billingValueLakhs": 3.41964
  },
  {
    "id": 16,
    "dealValueLakhs": 0.2672,
    "billingValueLakhs": 0.31529599999999997
  },
  {
    "id": 17,
    "dealValueLakhs": 0.91,
    "billingValueLakhs": 1.0738
  },
  {
    "id": 18,
    "dealValueLakhs": 0.09508,
    "billingValueLakhs": 0.11219439999999999
  },
  {
    "id": 19,
    "dealValueLakhs": 1.5,
    "billingValueLakhs": 1.77
  },
  {
    "id": 20,
    "dealValueLakhs": 1.157,
    "billingValueLakhs": 1.36526
  },
  {
    "id": 21,
    "dealValueLakhs": 0.6017002,
    "billingValueLakhs": 0.710006236
  },
  {
    "id": 22,
    "dealValueLakhs": 0.95,
    "billingValueLakhs": 1.121
  },
  {
    "id": 23,
    "dealValueLakhs": 1.66025,
    "billingValueLakhs": 1.9590949999999998
  },
  {
    "id": 24,
    "dealValueLakhs": 0.9725,
    "billingValueLakhs": 1.14755
  },
  {
    "id": 25,
    "dealValueLakhs": 2.624,
    "billingValueLakhs": 3.09632
  },
  {
    "id": 26,
    "dealValueLakhs": 27.141,
    "billingValueLakhs": 32.026379999999996
  },
  {
    "id": 27,
    "dealValueLakhs": 1.272,
    "billingValueLakhs": 1.5009599999999998
  },
  {
    "id": 28,
    "dealValueLakhs": 0.9725,
    "billingValueLakhs": 1.14755
  },
  {
    "id": 29,
    "dealValueLakhs": 0.318,
    "billingValueLakhs": 0.37523999999999996
  },
  {
    "id": 30,
    "dealValueLakhs": 0.9725,
    "billingValueLakhs": 1.14755
  },
  {
    "id": 31,
    "dealValueLakhs": 0.318,
    "billingValueLakhs": 0.37523999999999996
  },
  {
    "id": 32,
    "dealValueLakhs": 0.4515,
    "billingValueLakhs": 0.53277
  },
  {
    "id": 33,
    "dealValueLakhs": 40.77458,
    "billingValueLakhs": 48.1140044
  },
  {
    "id": 34,
    "dealValueLakhs": 18.08,
    "billingValueLakhs": 21.334399999999995
  },
  {
    "id": 35,
    "dealValueLakhs": 0.4748928,
    "billingValueLakhs": 0.560373504
  },
  {
    "id": 36,
    "dealValueLakhs": 1.0711680000000001,
    "billingValueLakhs": 1.2639782400000001
  },
  {
    "id": 37,
    "dealValueLakhs": 0.51,
    "billingValueLakhs": 0.6018
  },
  {
    "id": 38,
    "dealValueLakhs": 1.365,
    "billingValueLakhs": 1.6106999999999998
  },
  {
    "id": 39,
    "dealValueLakhs": 0.045,
    "billingValueLakhs": 0.053099999999999994
  },
  {
    "id": 40,
    "dealValueLakhs": 0.6765,
    "billingValueLakhs": 0.7982699999999999
  },
  {
    "id": 41,
    "dealValueLakhs": 1.108,
    "billingValueLakhs": 1.30744
  },
  {
    "id": 42,
    "dealValueLakhs": 0.48632,
    "billingValueLakhs": 0.5738576
  },
  {
    "id": 43,
    "dealValueLakhs": 0.2780972,
    "billingValueLakhs": 0.32815469599999997
  },
  {
    "id": 44,
    "dealValueLakhs": 0.652,
    "billingValueLakhs": 0.7693599999999999
  },
  {
    "id": 45,
    "dealValueLakhs": 0.9725,
    "billingValueLakhs": 1.14755
  },
  {
    "id": 46,
    "dealValueLakhs": 0.185,
    "billingValueLakhs": 0.2183
  },
  {
    "id": 47,
    "dealValueLakhs": 0.0827,
    "billingValueLakhs": 0.09758599999999999
  },
  {
    "id": 48,
    "dealValueLakhs": 0.925,
    "billingValueLakhs": 1.0915
  },
  {
    "id": 49,
    "dealValueLakhs": 3.4,
    "billingValueLakhs": 4.012
  },
  {
    "id": 50,
    "dealValueLakhs": 0.45,
    "billingValueLakhs": 0.531
  },
  {
    "id": 51,
    "dealValueLakhs": 1.3651,
    "billingValueLakhs": 1.6108179999999999
  },
  {
    "id": 52,
    "dealValueLakhs": 0.2,
    "billingValueLakhs": 0.236
  },
  {
    "id": 53,
    "dealValueLakhs": 0.9725,
    "billingValueLakhs": 1.14755
  },
  {
    "id": 54,
    "dealValueLakhs": 14.76,
    "billingValueLakhs": 17.4168
  },
  {
    "id": 55,
    "dealValueLakhs": 1.385,
    "billingValueLakhs": 1.6342999999999999
  },
  {
    "id": 56,
    "dealValueLakhs": 5.54,
    "billingValueLakhs": 6.5371999999999995
  },
  {
    "id": 57,
    "dealValueLakhs": 1.49,
    "billingValueLakhs": 1.7582
  },
  {
    "id": 58,
    "dealValueLakhs": 0.7344228,
    "billingValueLakhs": 0.866618904
  },
  {
    "id": 59,
    "dealValueLakhs": 0.693906,
    "billingValueLakhs": 0.81880908
  },
  {
    "id": 60,
    "dealValueLakhs": 10.36,
    "billingValueLakhs": 12.224799999999998
  },
  {
    "id": 61,
    "dealValueLakhs": 0.3765,
    "billingValueLakhs": 0.44427
  },
  {
    "id": 62,
    "dealValueLakhs": 6.24,
    "billingValueLakhs": 7.3632
  },
  {
    "id": 63,
    "dealValueLakhs": 1.1125,
    "billingValueLakhs": 1.31275
  },
  {
    "id": 64,
    "dealValueLakhs": 2.035,
    "billingValueLakhs": 2.4013
  },
  {
    "id": 65,
    "dealValueLakhs": 0.3740354,
    "billingValueLakhs": 0.441361772
  },
  {
    "id": 66,
    "dealValueLakhs": 0.002733,
    "billingValueLakhs": 0.00322494
  },
  {
    "id": 67,
    "dealValueLakhs": 43.032004,
    "billingValueLakhs": 50.77776472
  },
  {
    "id": 68,
    "dealValueLakhs": 3.108,
    "billingValueLakhs": 3.66744
  },
  {
    "id": 69,
    "dealValueLakhs": 0.635049,
    "billingValueLakhs": 0.74935782
  },
  {
    "id": 70,
    "dealValueLakhs": 0.04172,
    "billingValueLakhs": 0.0492296
  },
  {
    "id": 71,
    "dealValueLakhs": 0.188,
    "billingValueLakhs": 0.22183999999999998
  },
  {
    "id": 72,
    "dealValueLakhs": 2.546,
    "billingValueLakhs": 3.0042799999999996
  },
  {
    "id": 73,
    "dealValueLakhs": 1.5,
    "billingValueLakhs": 1.77
  },
  {
    "id": 74,
    "dealValueLakhs": 1.59805,
    "billingValueLakhs": 1.8856989999999998
  },
  {
    "id": 75,
    "dealValueLakhs": 0.5733488,
    "billingValueLakhs": 0
  },
  {
    "id": 76,
    "dealValueLakhs": 0.45,
    "billingValueLakhs": 0
  },
  {
    "id": 77,
    "dealValueLakhs": 2.7978009999999998,
    "billingValueLakhs": 0
  },
  {
    "id": 78,
    "dealValueLakhs": 2.7978009999999998,
    "billingValueLakhs": 0
  },
  {
    "id": 79,
    "dealValueLakhs": 0.7215,
    "billingValueLakhs": 0.85137
  },
  {
    "id": 80,
    "dealValueLakhs": 3.57,
    "billingValueLakhs": 0
  },
  {
    "id": 81,
    "dealValueLakhs": 7.95,
    "billingValueLakhs": 0
  },
  {
    "id": 82,
    "dealValueLakhs": 0.6,
    "billingValueLakhs": 0
  },
  {
    "id": 83,
    "dealValueLakhs": 0.49,
    "billingValueLakhs": 0
  },
  {
    "id": 84,
    "dealValueLakhs": 4.35,
    "billingValueLakhs": 0
  },
  {
    "id": 85,
    "dealValueLakhs": 13.48,
    "billingValueLakhs": 0
  },
  {
    "id": 86,
    "dealValueLakhs": 0.6,
    "billingValueLakhs": 0
  },
  {
    "id": 87,
    "dealValueLakhs": 10.62,
    "billingValueLakhs": 0
  },
  {
    "id": 88,
    "dealValueLakhs": 0.49,
    "billingValueLakhs": 0
  },
  {
    "id": 89,
    "dealValueLakhs": 6.4,
    "billingValueLakhs": 0
  },
  {
    "id": 90,
    "dealValueLakhs": 13.59,
    "billingValueLakhs": 0
  },
  {
    "id": 91,
    "dealValueLakhs": 2.06,
    "billingValueLakhs": 0
  },
  {
    "id": 92,
    "dealValueLakhs": 40,
    "billingValueLakhs": 0
  },
  {
    "id": 93,
    "dealValueLakhs": 0.5637,
    "billingValueLakhs": 0
  },
  {
    "id": 94,
    "dealValueLakhs": 0.5637,
    "billingValueLakhs": 0
  },
  {
    "id": 95,
    "dealValueLakhs": 0.5525,
    "billingValueLakhs": 0
  },
  {
    "id": 96,
    "dealValueLakhs": 0.3545982,
    "billingValueLakhs": 0
  },
  {
    "id": 97,
    "dealValueLakhs": 2.3,
    "billingValueLakhs": 0
  },
  {
    "id": 98,
    "dealValueLakhs": 0.246,
    "billingValueLakhs": 0
  },
  {
    "id": 99,
    "dealValueLakhs": 0.4888,
    "billingValueLakhs": 0
  },
  {
    "id": 100,
    "dealValueLakhs": 0.2,
    "billingValueLakhs": 0
  }
]
```

## Statement 20
```sql
SELECT 'CrmLead.expectedValue' AS field, SUM(expectedValue) AS total, COUNT(*) AS row_count FROM `CrmLead`
```
Result:
```json
[
  {
    "field": "CrmLead.expectedValue",
    "total": 573.3844,
    "row_count": "280"
  }
]
```

## Statement 21
```sql
SELECT 'CrmOpportunity.value' AS field, SUM(value) AS total, COUNT(*) AS row_count FROM `CrmOpportunity`
```
Result:
```json
[
  {
    "field": "CrmOpportunity.value",
    "total": 501.1844,
    "row_count": "49"
  }
]
```

## Statement 22
```sql
SELECT 'CrmOpportunity.dealValueExTax' AS field, SUM(dealValueExTax) AS total, COUNT(*) AS row_count FROM `CrmOpportunity`
```
Result:
```json
[
  {
    "field": "CrmOpportunity.dealValueExTax",
    "total": 0,
    "row_count": "49"
  }
]
```

## Statement 23
```sql
SELECT 'CrmOpportunity.netProfitLakhs' AS field, SUM(netProfitLakhs) AS total, COUNT(*) AS row_count FROM `CrmOpportunity`
```
Result:
```json
[
  {
    "field": "CrmOpportunity.netProfitLakhs",
    "total": 0,
    "row_count": "49"
  }
]
```

## Statement 24
```sql
SELECT 'SalesFunnel.dealValueLakhs' AS field, SUM(dealValueLakhs) AS total, COUNT(*) AS row_count FROM `SalesFunnel`
```
Result:
```json
[
  {
    "field": "SalesFunnel.dealValueLakhs",
    "total": 356.33308939999995,
    "row_count": "100"
  }
]
```

## Statement 25
```sql
SELECT 'SalesFunnel.billingValueLakhs' AS field, SUM(billingValueLakhs) AS total, COUNT(*) AS row_count FROM `SalesFunnel`
```
Result:
```json
[
  {
    "field": "SalesFunnel.billingValueLakhs",
    "total": 283.4889116719999,
    "row_count": "100"
  }
]
```

## Statement 26
```sql
SELECT id, title, target FROM `KRA` ORDER BY id
```
Result:
```json
[
  {
    "id": 38,
    "title": "Sales Revenue targets",
    "target": "total sales revenue - booking: 70; total sales revenue - billing: 63; average gross profit margin: 6.5; payment collections within due dates & credit days reduction: 0.9"
  },
  {
    "id": 39,
    "title": "Customer & Business Development",
    "target": "customer retention rate: 0.9; qualified leads generation: 20"
  },
  {
    "id": 40,
    "title": "Sales management",
    "target": "non-obligatory\" proof of concept (poc): 4; new customers or upsell closure: 8; pipeline: 2"
  },
  {
    "id": 41,
    "title": "Focus area revenue achievement",
    "target": "network & security: 0.35; server & storage: 0.20; mssp services: 0.20; cloud security & services: 0.10"
  },
  {
    "id": 42,
    "title": "Sales Operations Excellence",
    "target": "forecast accuracy: 0.9; certification and product training: 2"
  },
  {
    "id": 43,
    "title": "Sales Revenue targets",
    "target": "total sales revenue - booking: 120; total sales revenue - billing: 108; average gross profit margin: 10; payment collections within due dates & credit days reduction: 0.9"
  },
  {
    "id": 44,
    "title": "Customer & Business Development",
    "target": "new customers: 8; qualified leads generation: 20"
  },
  {
    "id": 45,
    "title": "Sales management",
    "target": "non-obligatory\" proof of concept (poc): 4; pipeline: 2"
  },
  {
    "id": 46,
    "title": "Focus area revenue achievement",
    "target": "network & security: 0.35; server & storage: 0.20; mssp services: 0.20; cloud security & services: 0.10"
  },
  {
    "id": 47,
    "title": "Sales Operations Excellence",
    "target": "forecast accuracy: 0.9; certification and product training: 2"
  },
  {
    "id": 48,
    "title": "Sales Revenue targets",
    "target": "total sales revenue - booking: 120; total sales revenue - billing: 108; average gross profit margin: 12; payment collections within due dates & credit days reduction: 0.9"
  },
  {
    "id": 49,
    "title": "Customer & Business Development",
    "target": "customer retention rate: 0.9; qualified leads generation: 20"
  },
  {
    "id": 50,
    "title": "Sales management",
    "target": "non-obligatory\" proof of concept (poc): 4; new customers or upsell closure: 8; pipeline: 2"
  },
  {
    "id": 51,
    "title": "Focus area revenue achievement",
    "target": "network & security: 0.35; server & storage: 0.20; mssp services: 0.20; cloud security & services: 0.10"
  },
  {
    "id": 52,
    "title": "Sales Operations Excellence",
    "target": "forecast accuracy: 0.9; certification and product training: 2"
  },
  {
    "id": 53,
    "title": "Sales Revenue targets",
    "target": "total sales revenue - booking: 75; total sales revenue - billing: 67.5; average gross profit margin: 8; payment collections within due dates & credit days reduction: 0.9"
  },
  {
    "id": 54,
    "title": "Customer & Business Development",
    "target": "new customers: 5; qualified leads generation: 30"
  },
  {
    "id": 55,
    "title": "Sales management",
    "target": "non-obligatory\" proof of concept (poc): 10; pipeline: 2"
  },
  {
    "id": 56,
    "title": "Focus area revenue achievement",
    "target": "network & security: 0.35; server & storage: 0.20; mssp services: 0.20; cloud security & services: 0.10"
  },
  {
    "id": 57,
    "title": "Sales Operations Excellence",
    "target": "forecast accuracy: 0.9; certification and product training: 2"
  },
  {
    "id": 58,
    "title": "Sales Revenue targets",
    "target": "total sales revenue - booking: 150; total sales revenue - billing: 135; average gross profit margin: 15; payment collections within due dates & credit days reduction: 0.9"
  },
  {
    "id": 59,
    "title": "Customer & Business Development",
    "target": "new customers: 10; qualified leads generation: 20"
  },
  {
    "id": 60,
    "title": "Sales management",
    "target": "non-obligatory\" proof of concept (poc): 4; pipeline: 2"
  },
  {
    "id": 61,
    "title": "Focus area revenue achievement",
    "target": "network & security: 0.35; server & storage: 0.20; mssp services: 0.20; cloud security & services: 0.10"
  },
  {
    "id": 62,
    "title": "Sales Operations Excellence",
    "target": "forecast accuracy: 0.9; certification and product training: 2"
  },
  {
    "id": 63,
    "title": "Lead Generation Activity",
    "target": "total outbound calls made: 180; meaningful connects achieved: 50"
  },
  {
    "id": 64,
    "title": "Pipeline Building",
    "target": "qualified leads generated: 25; appointments fixed for bdm / sales closure team: 25"
  },
  {
    "id": 65,
    "title": "Funnel Creation",
    "target": "total funnel / pipeline value created (₹ lakhs): 75; number of funnel opportunities created: 10"
  },
  {
    "id": 66,
    "title": "Marketing Activities",
    "target": "customer webinars organised: 2; blitz days conducted: 3"
  },
  {
    "id": 67,
    "title": "Sales Operations Excellence",
    "target": "crm data accuracy & timely lead updates: 0.9; certification and product training: 2"
  },
  {
    "id": 68,
    "title": "Revenue & Profitability",
    "target": "total team booking target achievement (₹ lakhs): 500; total team billing achievement: 450; gross profit margin (%): 12; collections efficiency (% within due dates): 0.9"
  },
  {
    "id": 69,
    "title": "Market Growth & Business Development",
    "target": "new logos / strategic accounts acquired by team: 10; new projects & strategic deals initiated: 15; focus area revenue mix achievement (n&s, s&s, mssp, cloud): 0.85"
  },
  {
    "id": 70,
    "title": "Team Leadership & Talent Development",
    "target": "team aggregate kra achievement rate: 0.9; sales talent retention (attrition below threshold): 0.9; team training & certification completion rate: 0.9"
  },
  {
    "id": 71,
    "title": "Pipeline Health & Strategic Execution",
    "target": "total team pipeline coverage (₹ lakhs): 1500; forecast accuracy: 0.9; average deal win rate: 0.3"
  }
]
```

## Statement 27
```sql
SELECT COUNT(*) AS kra_row_count FROM `KRA`
```
Result:
```json
[
  {
    "kra_row_count": "34"
  }
]
```

## Statement 28
```sql
SELECT COUNT(*) AS employee_target_row_count FROM `employee_target`
```
Result:
```json
[
  {
    "employee_target_row_count": "0"
  }
]
```

## Statement 29
```sql
SELECT COUNT(*) AS team_target_row_count FROM `team_target`
```
Result:
```json
[
  {
    "team_target_row_count": "0"
  }
]
```
