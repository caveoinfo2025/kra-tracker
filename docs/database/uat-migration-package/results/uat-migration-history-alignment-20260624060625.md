# UAT Migration History Alignment — Result

Ran `npx prisma migrate resolve --applied <name>` for all 3 target migrations against UAT.
Before: 19 rows, 0/3 target migrations present. After: 22 rows, 3/3 present, no duplicates, all finished_at populated, applied_steps_count=0 (expected for migrate resolve).

```
DB: u686730471_Caveo_UAT
Total rows: 22
20260601000000_init_mysql | 2026-06-18T12:21:19.608Z | 1
20260602120000_finance_operations_phase1 | 2026-06-18T12:21:19.608Z | 1
20260604000000_admin_console_foundation | 2026-06-18T12:21:19.608Z | 1
20260604120000_policy_engine_foundation | 2026-06-18T12:21:19.608Z | 1
20260604180000_workflow_engine | 2026-06-18T12:21:19.608Z | 1
20260604220000_master_data_management | 2026-06-18T12:21:19.608Z | 1
20260605000000_opportunity_discount_pct | 2026-06-18T12:21:19.608Z | 1
20260605010000_crm_admin_engine | 2026-06-18T12:21:19.608Z | 1
20260605020000_opportunity_won_fields | 2026-06-18T12:21:19.608Z | 1
20260605030000_legacy_promote_and_net_profit | 2026-06-18T12:21:19.608Z | 1
20260605050000_finance_admin_engine | 2026-06-18T12:21:19.608Z | 1
20260609060000_performance_management_engine | 2026-06-18T12:21:19.608Z | 1
20260609070000_communication_engine | 2026-06-18T12:21:19.608Z | 1
20260610080000_integration_center | 2026-06-18T12:21:19.608Z | 1
20260610090000_security_center | 2026-06-18T12:21:19.608Z | 1
20260615000000_add_advance_category | 2026-06-18T12:21:19.608Z | 1
20260617100000_employeetarget_relations | 2026-06-18T12:21:19.608Z | 1
20260618000000_master_data_linkage | 2026-06-18T12:21:19.608Z | 1
20260618100000_crm_lead_customer_ref | 2026-06-18T12:21:19.608Z | 1
20260621120000_add_soft_delete_fields_phase_a | 2026-06-24T00:39:32.721Z | 0
20260622120000_decimal_release1_lakhs_to_inr | 2026-06-24T00:40:12.420Z | 0
20260623060000_decimal_release2_combined_inr_canonical | 2026-06-24T00:40:51.679Z | 0
Target migrations already present: 3 [
  '20260623060000_decimal_release2_combined_inr_canonical',
  '20260621120000_add_soft_delete_fields_phase_a',
  '20260622120000_decimal_release1_lakhs_to_inr'
]
```
