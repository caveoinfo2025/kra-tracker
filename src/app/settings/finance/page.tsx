// Phase 9: Finance Administration Engine
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import {
  listExpenseCategories,
  listExpenseLimitRules,
  listConveyancePolicies,
  listAdvancePolicies,
  listCreditPolicies,
  listVoucherConfigs,
  listCollectionPolicies,
} from "@/lib/finance-engine";
import FinanceAdminClient from "./FinanceAdminClient";

export default async function FinanceAdminPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!session.user.isManager) redirect("/dashboard");

  const [
    categories,
    limitRules,
    conveyancePolicies,
    advancePolicies,
    creditPolicies,
    voucherConfigs,
    collectionPolicies,
  ] = await Promise.all([
    listExpenseCategories(),
    listExpenseLimitRules(),
    listConveyancePolicies(),
    listAdvancePolicies(),
    listCreditPolicies(),
    listVoucherConfigs(),
    listCollectionPolicies(),
  ]);

  return (
    <FinanceAdminClient
      initialCategories={categories}
      initialLimitRules={limitRules}
      initialConveyancePolicies={conveyancePolicies}
      initialAdvancePolicies={advancePolicies}
      initialCreditPolicies={creditPolicies}
      initialVoucherConfigs={voucherConfigs}
      initialCollectionPolicies={collectionPolicies}
    />
  );
}
