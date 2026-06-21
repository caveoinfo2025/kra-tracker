/**
 * Legacy Customer Master — permanently redirects to the Global Customer Master.
 * Customer Master is a global CRM master, not a standalone operational page.
 * Route: /masters/customers
 *
 * Step 2O: this page was guarded in place (Masters/CustomerMaster/VIEW ||
 * isManager) rather than redirected, because /masters/customers was still
 * mock-data-only at the time — redirecting then would have replaced the only
 * functional Customer Master with a non-functional preview.
 *
 * Step 2P (Customer Master): /masters/customers was wired to the same real
 * Prisma data and the same CustomerMasterClient this page used, closing that
 * gap — both routes became functionally equivalent.
 *
 * Step 2Q (Customer Master): now that parity is confirmed, this page is the
 * compatibility redirect. CustomerMasterClient.tsx (in this folder) is NOT
 * deleted — /masters/customers imports it directly
 * (@/app/customers/CustomerMasterClient) and depends on it remaining here.
 */
import { redirect } from "next/navigation";

export default function CustomersRedirectPage() {
  redirect("/masters/customers");
}
