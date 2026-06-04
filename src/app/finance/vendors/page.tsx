/**
 * Finance > Vendors — permanently redirects to the Global Vendor Master.
 * The Vendor Master is a global CRM master, not a Finance-only resource.
 * Route: /masters/vendors
 */
import { redirect } from "next/navigation";

export default function FinanceVendorsRedirectPage() {
  redirect("/masters/vendors");
}
