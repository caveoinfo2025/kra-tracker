/**
 * Master Data — Public API
 *
 * Re-exports all service functions and types from the master-data module.
 */

export type { MasterAuditAction, MasterAuditType, MasterAuditEntry } from "./audit";
export {
  logMasterEvent,
  getMasterAudit,
  listMasterAudit,
} from "./audit";

export type { MasterCategory, MasterDefinition, MasterValue } from "./masters";
export {
  listCategories,
  createCategory,
  listDefinitions,
  getDefinitionByCode,
  createDefinition,
  updateDefinitionStatus,
  listValues,
  getMasterValues,
  createValue,
  updateValue,
} from "./masters";

export type { MasterOverride } from "./override";
export {
  listOverrides,
  createOverride,
  updateOverride,
  upsertOverride,
} from "./override";

export type { ValidationResult, MasterValidationRule } from "./validation";
export {
  listValidationRules,
  createValidationRule,
  validateMasterData,
} from "./validation";

export type { CustomerPolicy } from "./customer-policy";
export {
  getCustomerPolicy,
  listCustomerPolicies,
  upsertCustomerPolicy,
} from "./customer-policy";

export type { VendorPolicy } from "./vendor-policy";
export {
  getVendorPolicy,
  listVendorPolicies,
  upsertVendorPolicy,
} from "./vendor-policy";
