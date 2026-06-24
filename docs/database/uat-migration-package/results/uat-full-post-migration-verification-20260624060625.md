# UAT Full Post-Migration Verification (Step 4G-1, after KRA transform + migration-history alignment)

Re-ran `uat-decimal-inr-post-migration-verification.sql` in full (27/27 statements, 0 errors).

```
Live DB: u686730471_Caveo_UAT
Running 27 read-only statement(s)...

--- Statement 1 ---
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND ( (TABLE_NAME = 'Expense' AND COL
[
  {
    "TABLE_NAME": "Collection",
    "COLUMN_NAME": "amountReceivedLakhs",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0.00"
  },
  {
    "TABLE_NAME": "Collection",
    "COLUMN_NAME": "amountWithoutGstLakhs",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0.00"
  },
  {
    "TABLE_NAME": "Collection",
    "COLUMN_NAME": "deletedAt",
    "DATA_TYPE": "datetime",
    "COLUMN_TYPE": "datetime(3)",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "Collection",
    "COLUMN_NAME": "deletedById",
    "DATA_TYPE": "int",
    "COLUMN_TYPE": "int(11)",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "Collection",
    "COLUMN_NAME": "deleteReason",
    "DATA_TYPE": "text",
    "COLUMN_TYPE": "text",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "Collection",
    "COLUMN_NAME": "invoiceValueLakhs",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": null
  },
  {
    "TABLE_NAME": "CrmLead",
    "COLUMN_NAME": "expectedValue",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0.00"
  },
  {
    "TABLE_NAME": "CrmOpportunity",
    "COLUMN_NAME": "dealValueExTax",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0.00"
  },
  {
    "TABLE_NAME": "CrmOpportunity",
    "COLUMN_NAME": "netProfitLakhs",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0.00"
  },
  {
    "TABLE_NAME": "CrmOpportunity",
    "COLUMN_NAME": "value",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0.00"
  },
  {
    "TABLE_NAME": "Customer",
    "COLUMN_NAME": "deletedAt",
    "DATA_TYPE": "datetime",
    "COLUMN_TYPE": "datetime(3)",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "Customer",
    "COLUMN_NAME": "deletedById",
    "DATA_TYPE": "int",
    "COLUMN_TYPE": "int(11)",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "Customer",
    "COLUMN_NAME": "deleteReason",
    "DATA_TYPE": "text",
    "COLUMN_TYPE": "text",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "EmployeeAdvance",
    "COLUMN_NAME": "amountLakhs",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": null
  },
  {
    "TABLE_NAME": "EmployeeAdvance",
    "COLUMN_NAME": "balanceLakhs",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0.00"
  },
  {
    "TABLE_NAME": "EmployeeAdvance",
    "COLUMN_NAME": "deletedAt",
    "DATA_TYPE": "datetime",
    "COLUMN_TYPE": "datetime(3)",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "EmployeeAdvance",
    "COLUMN_NAME": "deletedById",
    "DATA_TYPE": "int",
    "COLUMN_TYPE": "int(11)",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "EmployeeAdvance",
    "COLUMN_NAME": "deleteReason",
    "DATA_TYPE": "text",
    "COLUMN_TYPE": "text",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "EmployeeAdvance",
    "COLUMN_NAME": "disbursedAmountLakhs",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "EmployeeAdvance",
    "COLUMN_NAME": "settledAmountLakhs",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
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
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": null
  },
  {
    "TABLE_NAME": "Expense",
    "COLUMN_NAME": "deletedAt",
    "DATA_TYPE": "datetime",
    "COLUMN_TYPE": "datetime(3)",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "Expense",
    "COLUMN_NAME": "deletedById",
    "DATA_TYPE": "int",
    "COLUMN_TYPE": "int(11)",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "Expense",
    "COLUMN_NAME": "deleteReason",
    "DATA_TYPE": "text",
    "COLUMN_TYPE": "text",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "Expense",
    "COLUMN_NAME": "gstAmountLakhs",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0.00"
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
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": null
  },
  {
    "TABLE_NAME": "Payment",
    "COLUMN_NAME": "amountLakhs",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": null
  },
  {
    "TABLE_NAME": "Payment",
    "COLUMN_NAME": "deletedAt",
    "DATA_TYPE": "datetime",
    "COLUMN_TYPE": "datetime(3)",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "Payment",
    "COLUMN_NAME": "deletedById",
    "DATA_TYPE": "int",
    "COLUMN_TYPE": "int(11)",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "Payment",
    "COLUMN_NAME": "deleteReason",
    "DATA_TYPE": "text",
    "COLUMN_TYPE": "text",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "SalesFunnel",
    "COLUMN_NAME": "billingValueLakhs",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0.00"
  },
  {
    "TABLE_NAME": "SalesFunnel",
    "COLUMN_NAME": "dealValueLakhs",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0.00"
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
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0.00"
  },
  {
    "TABLE_NAME": "TravelClaim",
    "COLUMN_NAME": "amountRupees",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(18,2)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0.00"
  },
  {
    "TABLE_NAME": "TravelClaim",
    "COLUMN_NAME": "deletedAt",
    "DATA_TYPE": "datetime",
    "COLUMN_TYPE": "datetime(3)",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "TravelClaim",
    "COLUMN_NAME": "deletedById",
    "DATA_TYPE": "int",
    "COLUMN_TYPE": "int(11)",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "TravelClaim",
    "COLUMN_NAME": "deleteReason",
    "DATA_TYPE": "text",
    "COLUMN_TYPE": "text",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "TravelClaim",
    "COLUMN_NAME": "ratePerKm",
    "DATA_TYPE": "decimal",
    "COLUMN_TYPE": "decimal(10,4)",
    "IS_NULLABLE": "NO",
    "COLUMN_DEFAULT": "0.0000"
  },
  {
    "TABLE_NAME": "Vendor",
    "COLUMN_NAME": "deletedAt",
    "DATA_TYPE": "datetime",
    "COLUMN_TYPE": "datetime(3)",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "Vendor",
    "COLUMN_NAME": "deletedById",
    "DATA_TYPE": "int",
    "COLUMN_TYPE": "int(11)",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
  },
  {
    "TABLE_NAME": "Vendor",
    "COLUMN_NAME": "deleteReason",
    "DATA_TYPE": "text",
    "COLUMN_TYPE": "text",
    "IS_NULLABLE": "YES",
    "COLUMN_DEFAULT": "NULL"
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

--- Statement 2 ---
SELECT 'Payment.amountLakhs' AS field, SUM(amountLakhs) AS total, COUNT(*) AS row_count FROM `Payment`
[
  {
    "field": "Payment.amountLakhs",
    "total": "4109837.06",
    "row_count": "26"
  }
]

--- Statement 3 ---
SELECT 'Collection.invoiceValueLakhs' AS field, SUM(invoiceValueLakhs) AS total, COUNT(*) AS row_count FROM `Collection`
[
  {
    "field": "Collection.invoiceValueLakhs",
    "total": "58499554.54",
    "row_count": "141"
  }
]

--- Statement 4 ---
SELECT 'Collection.amountWithoutGstLakhs' AS field, SUM(amountWithoutGstLakhs) AS total, COUNT(*) AS row_count FROM `Collection`
[
  {
    "field": "Collection.amountWithoutGstLakhs",
    "total": "49041707.40",
    "row_count": "141"
  }
]

--- Statement 5 ---
SELECT 'Collection.amountReceivedLakhs' AS field, SUM(amountReceivedLakhs) AS total, COUNT(*) AS row_count FROM `Collection`
[
  {
    "field": "Collection.amountReceivedLakhs",
    "total": "38666388.73",
    "row_count": "141"
  }
]

--- Statement 6 ---
SELECT 'OrderAdvance.amountLakhs' AS field, SUM(amountLakhs) AS total, COUNT(*) AS row_count FROM `OrderAdvance`
[
  {
    "field": "OrderAdvance.amountLakhs",
    "total": "721895.00",
    "row_count": "3"
  }
]

--- Statement 7 ---
SELECT 'CrmLead.expectedValue' AS field, SUM(expectedValue) AS total, COUNT(*) AS row_count FROM `CrmLead`
[
  {
    "field": "CrmLead.expectedValue",
    "total": "57338440.00",
    "row_count": "280"
  }
]

--- Statement 8 ---
SELECT 'CrmOpportunity.value' AS field, SUM(value) AS total, COUNT(*) AS row_count FROM `CrmOpportunity`
[
  {
    "field": "CrmOpportunity.value",
    "total": "50118440.00",
    "row_count": "49"
  }
]

--- Statement 9 ---
SELECT 'CrmOpportunity.dealValueExTax' AS field, SUM(dealValueExTax) AS total, COUNT(*) AS row_count FROM `CrmOpportunity`
[
  {
    "field": "CrmOpportunity.dealValueExTax",
    "total": "0.00",
    "row_count": "49"
  }
]

--- Statement 10 ---
SELECT 'CrmOpportunity.netProfitLakhs' AS field, SUM(netProfitLakhs) AS total, COUNT(*) AS row_count FROM `CrmOpportunity`
[
  {
    "field": "CrmOpportunity.netProfitLakhs",
    "total": "0.00",
    "row_count": "49"
  }
]

--- Statement 11 ---
SELECT 'SalesFunnel.dealValueLakhs' AS field, SUM(dealValueLakhs) AS total, COUNT(*) AS row_count FROM `SalesFunnel`
[
  {
    "field": "SalesFunnel.dealValueLakhs",
    "total": "35633308.94",
    "row_count": "100"
  }
]

--- Statement 12 ---
SELECT 'SalesFunnel.billingValueLakhs' AS field, SUM(billingValueLakhs) AS total, COUNT(*) AS row_count FROM `SalesFunnel`
[
  {
    "field": "SalesFunnel.billingValueLakhs",
    "total": "28348891.16",
    "row_count": "100"
  }
]

--- Statement 13 ---
SELECT id, value, dealValueExTax, netProfitLakhs FROM `CrmOpportunity` WHERE id = 42
[
  {
    "id": 42,
    "value": "-10000.00",
    "dealValueExTax": "0.00",
    "netProfitLakhs": "0.00"
  }
]

--- Statement 14 ---
SELECT id, title, target FROM `KRA` ORDER BY id
[
  {
    "id": 38,
    "title": "Sales Revenue targets",
    "target": "total sales revenue - booking: 7000000; total sales revenue - billing: 6300000; average gross profit margin: 6.5; payment collections within due dates & credit days reduction: 0.9"
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
    "target": "total sales revenue - booking: 12000000; total sales revenue - billing: 10800000; average gross profit margin: 10; payment collections within due dates & credit days reduction: 0.9"
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
    "target": "total sales revenue - booking: 12000000; total sales revenue - billing: 10800000; average gross profit margin: 12; payment collections within due dates & credit days reduction: 0.9"
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
    "target": "total sales revenue - booking: 7500000; total sales revenue - billing: 6750000; average gross profit margin: 8; payment collections within due dates & credit days reduction: 0.9"
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
    "target": "total sales revenue - booking: 15000000; total sales revenue - billing: 13500000; average gross profit margin: 15; payment collections within due dates & credit days reduction: 0.9"
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
    "target": "total funnel / pipeline value created (₹ lakhs): 7500000; number of funnel opportunities created: 10"
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
    "target": "total team booking target achievement (₹ lakhs): 50000000; total team billing achievement: 45000000; gross profit margin (%): 12; collections efficiency (% within due dates): 0.9"
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
    "target": "total team pipeline coverage (₹ lakhs): 150000000; forecast accuracy: 0.9; average deal win rate: 0.3"
  }
]

--- Statement 15 ---
SELECT COUNT(*) AS kra_row_count FROM `KRA`
[
  {
    "kra_row_count": "34"
  }
]

--- Statement 16 ---
SELECT COUNT(*) AS employee_target_row_count FROM `employee_target`
[
  {
    "employee_target_row_count": "0"
  }
]

--- Statement 17 ---
SELECT COUNT(*) AS team_target_row_count FROM `team_target`
[
  {
    "team_target_row_count": "0"
  }
]

--- Statement 18 ---
SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME IN ('deletedAt', 'deletedById', 'deleteReason') AND TABLE_NAME IN ('Collection', 'Cus
[
  {
    "TABLE_NAME": "Collection",
    "COLUMN_NAME": "deletedAt"
  },
  {
    "TABLE_NAME": "Collection",
    "COLUMN_NAME": "deletedById"
  },
  {
    "TABLE_NAME": "Collection",
    "COLUMN_NAME": "deleteReason"
  },
  {
    "TABLE_NAME": "Customer",
    "COLUMN_NAME": "deletedAt"
  },
  {
    "TABLE_NAME": "Customer",
    "COLUMN_NAME": "deletedById"
  },
  {
    "TABLE_NAME": "Customer",
    "COLUMN_NAME": "deleteReason"
  },
  {
    "TABLE_NAME": "EmployeeAdvance",
    "COLUMN_NAME": "deletedAt"
  },
  {
    "TABLE_NAME": "EmployeeAdvance",
    "COLUMN_NAME": "deletedById"
  },
  {
    "TABLE_NAME": "EmployeeAdvance",
    "COLUMN_NAME": "deleteReason"
  },
  {
    "TABLE_NAME": "Expense",
    "COLUMN_NAME": "deletedAt"
  },
  {
    "TABLE_NAME": "Expense",
    "COLUMN_NAME": "deletedById"
  },
  {
    "TABLE_NAME": "Expense",
    "COLUMN_NAME": "deleteReason"
  },
  {
    "TABLE_NAME": "Payment",
    "COLUMN_NAME": "deletedAt"
  },
  {
    "TABLE_NAME": "Payment",
    "COLUMN_NAME": "deletedById"
  },
  {
    "TABLE_NAME": "Payment",
    "COLUMN_NAME": "deleteReason"
  },
  {
    "TABLE_NAME": "TravelClaim",
    "COLUMN_NAME": "deletedAt"
  },
  {
    "TABLE_NAME": "TravelClaim",
    "COLUMN_NAME": "deletedById"
  },
  {
    "TABLE_NAME": "TravelClaim",
    "COLUMN_NAME": "deleteReason"
  },
  {
    "TABLE_NAME": "Vendor",
    "COLUMN_NAME": "deletedAt"
  },
  {
    "TABLE_NAME": "Vendor",
    "COLUMN_NAME": "deletedById"
  },
  {
    "TABLE_NAME": "Vendor",
    "COLUMN_NAME": "deleteReason"
  }
]

--- Statement 19 ---
SHOW INDEX FROM `Collection` WHERE Key_name = 'Collection_deletedAt_idx'
[
  {
    "Table": "Collection",
    "Non_unique": "1",
    "Key_name": "Collection_deletedAt_idx",
    "Seq_in_index": 1,
    "Column_name": "deletedAt",
    "Collation": "A",
    "Cardinality": "1",
    "Sub_part": null,
    "Packed": null,
    "Null": "YES",
    "Index_type": "BTREE",
    "Comment": "",
    "Index_comment": "",
    "Ignored": "NO"
  }
]

--- Statement 20 ---
SHOW INDEX FROM `Customer` WHERE Key_name = 'Customer_deletedAt_idx'
[
  {
    "Table": "Customer",
    "Non_unique": "1",
    "Key_name": "Customer_deletedAt_idx",
    "Seq_in_index": 1,
    "Column_name": "deletedAt",
    "Collation": "A",
    "Cardinality": "1",
    "Sub_part": null,
    "Packed": null,
    "Null": "YES",
    "Index_type": "BTREE",
    "Comment": "",
    "Index_comment": "",
    "Ignored": "NO"
  }
]

--- Statement 21 ---
SHOW INDEX FROM `EmployeeAdvance` WHERE Key_name = 'EmployeeAdvance_deletedAt_idx'
[
  {
    "Table": "EmployeeAdvance",
    "Non_unique": "1",
    "Key_name": "EmployeeAdvance_deletedAt_idx",
    "Seq_in_index": 1,
    "Column_name": "deletedAt",
    "Collation": "A",
    "Cardinality": "0",
    "Sub_part": null,
    "Packed": null,
    "Null": "YES",
    "Index_type": "BTREE",
    "Comment": "",
    "Index_comment": "",
    "Ignored": "NO"
  }
]

--- Statement 22 ---
SHOW INDEX FROM `Expense` WHERE Key_name = 'Expense_deletedAt_idx'
[
  {
    "Table": "Expense",
    "Non_unique": "1",
    "Key_name": "Expense_deletedAt_idx",
    "Seq_in_index": 1,
    "Column_name": "deletedAt",
    "Collation": "A",
    "Cardinality": "0",
    "Sub_part": null,
    "Packed": null,
    "Null": "YES",
    "Index_type": "BTREE",
    "Comment": "",
    "Index_comment": "",
    "Ignored": "NO"
  }
]

--- Statement 23 ---
SHOW INDEX FROM `Payment` WHERE Key_name = 'Payment_deletedAt_idx'
[
  {
    "Table": "Payment",
    "Non_unique": "1",
    "Key_name": "Payment_deletedAt_idx",
    "Seq_in_index": 1,
    "Column_name": "deletedAt",
    "Collation": "A",
    "Cardinality": "1",
    "Sub_part": null,
    "Packed": null,
    "Null": "YES",
    "Index_type": "BTREE",
    "Comment": "",
    "Index_comment": "",
    "Ignored": "NO"
  }
]

--- Statement 24 ---
SHOW INDEX FROM `TravelClaim` WHERE Key_name = 'TravelClaim_deletedAt_idx'
[
  {
    "Table": "TravelClaim",
    "Non_unique": "1",
    "Key_name": "TravelClaim_deletedAt_idx",
    "Seq_in_index": 1,
    "Column_name": "deletedAt",
    "Collation": "A",
    "Cardinality": "0",
    "Sub_part": null,
    "Packed": null,
    "Null": "YES",
    "Index_type": "BTREE",
    "Comment": "",
    "Index_comment": "",
    "Ignored": "NO"
  }
]

--- Statement 25 ---
SHOW INDEX FROM `Vendor` WHERE Key_name = 'Vendor_deletedAt_idx'
[
  {
    "Table": "Vendor",
    "Non_unique": "1",
    "Key_name": "Vendor_deletedAt_idx",
    "Seq_in_index": 1,
    "Column_name": "deletedAt",
    "Collation": "A",
    "Cardinality": "0",
    "Sub_part": null,
    "Packed": null,
    "Null": "YES",
    "Index_type": "BTREE",
    "Comment": "",
    "Index_comment": "",
    "Ignored": "NO"
  }
]

--- Statement 26 ---
SELECT migration_name, started_at, finished_at, rolled_back_at FROM `_prisma_migrations` WHERE migration_name IN ( '20260621120000_add_soft_delete_fields_phase_a', '20260622120000_decimal_release1
[
  {
    "migration_name": "20260623060000_decimal_release2_combined_inr_canonical",
    "started_at": "2026-06-24T00:40:51.679Z",
    "finished_at": "2026-06-24T00:40:51.679Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260621120000_add_soft_delete_fields_phase_a",
    "started_at": "2026-06-24T00:39:32.721Z",
    "finished_at": "2026-06-24T00:39:32.721Z",
    "rolled_back_at": null
  },
  {
    "migration_name": "20260622120000_decimal_release1_lakhs_to_inr",
    "started_at": "2026-06-24T00:40:12.420Z",
    "finished_at": "2026-06-24T00:40:12.420Z",
    "rolled_back_at": null
  }
]

--- Statement 27 ---
SELECT COUNT(*) AS total_migration_rows FROM `_prisma_migrations`
[
  {
    "total_migration_rows": "22"
  }
]

```
