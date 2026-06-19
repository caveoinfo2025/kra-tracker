CREATE TABLE IF NOT EXISTS `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `applied_steps_count`) VALUES
('a1b2c3d4-0001-0001-0001-000000000001', 'uat-init', NOW(3), '20260601000000_init_mysql', 1),
('a1b2c3d4-0002-0002-0002-000000000002', 'uat-init', NOW(3), '20260602120000_finance_operations_phase1', 1),
('a1b2c3d4-0003-0003-0003-000000000003', 'uat-init', NOW(3), '20260604000000_admin_console_foundation', 1),
('a1b2c3d4-0004-0004-0004-000000000004', 'uat-init', NOW(3), '20260604120000_policy_engine_foundation', 1),
('a1b2c3d4-0005-0005-0005-000000000005', 'uat-init', NOW(3), '20260604180000_workflow_engine', 1),
('a1b2c3d4-0006-0006-0006-000000000006', 'uat-init', NOW(3), '20260604220000_master_data_management', 1),
('a1b2c3d4-0007-0007-0007-000000000007', 'uat-init', NOW(3), '20260605000000_opportunity_discount_pct', 1),
('a1b2c3d4-0008-0008-0008-000000000008', 'uat-init', NOW(3), '20260605010000_crm_admin_engine', 1),
('a1b2c3d4-0009-0009-0009-000000000009', 'uat-init', NOW(3), '20260605020000_opportunity_won_fields', 1),
('a1b2c3d4-0010-0010-0010-000000000010', 'uat-init', NOW(3), '20260605030000_legacy_promote_and_net_profit', 1),
('a1b2c3d4-0011-0011-0011-000000000011', 'uat-init', NOW(3), '20260605050000_finance_admin_engine', 1),
('a1b2c3d4-0012-0012-0012-000000000012', 'uat-init', NOW(3), '20260609060000_performance_management_engine', 1),
('a1b2c3d4-0013-0013-0013-000000000013', 'uat-init', NOW(3), '20260609070000_communication_engine', 1),
('a1b2c3d4-0014-0014-0014-000000000014', 'uat-init', NOW(3), '20260610080000_integration_center', 1),
('a1b2c3d4-0015-0015-0015-000000000015', 'uat-init', NOW(3), '20260610090000_security_center', 1),
('a1b2c3d4-0016-0016-0016-000000000016', 'uat-init', NOW(3), '20260615000000_add_advance_category', 1),
('a1b2c3d4-0017-0017-0017-000000000017', 'uat-init', NOW(3), '20260617100000_employeetarget_relations', 1),
('a1b2c3d4-0018-0018-0018-000000000018', 'uat-init', NOW(3), '20260618000000_master_data_linkage', 1),
('a1b2c3d4-0019-0019-0019-000000000019', 'uat-init', NOW(3), '20260618100000_crm_lead_customer_ref', 1);
