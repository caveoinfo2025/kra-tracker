"use client";

import type {
  ExpenseCategoryRecord,
  ConveyancePolicyRecord,
  AdvancePolicyRecord,
  CustomerCreditPolicyRecord,
  VoucherConfigRecord,
  CollectionPolicyRecord,
} from "@/lib/finance-engine";

interface Props {
  categories:         ExpenseCategoryRecord[];
  conveyancePolicies: ConveyancePolicyRecord[];
  advancePolicies:    AdvancePolicyRecord[];
  creditPolicies:     CustomerCreditPolicyRecord[];
  voucherConfigs:     VoucherConfigRecord[];
  collectionPolicies: CollectionPolicyRecord[];
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background:   "var(--card)",
      border:       "1px solid var(--border)",
      borderRadius: 10,
      padding:      "16px 20px",
    }}>
      <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "var(--foreground)", marginTop: 6 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function FinanceDashboard({
  categories,
  conveyancePolicies,
  advancePolicies,
  creditPolicies,
  voucherConfigs,
  collectionPolicies,
}: Props) {
  const maxAdvance = advancePolicies[0]?.maxAdvanceLakhs ?? 0;
  const defaultCredit = creditPolicies[0]?.defaultCreditLimitLakhs ?? 0;
  const collectionPolicy = collectionPolicies[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        <StatCard label="Expense Categories" value={categories.length} sub="active categories" />
        <StatCard label="Conveyance Rates" value={conveyancePolicies.length} sub="vehicle types" />
        <StatCard label="Max Advance" value={`₹${maxAdvance}L`} sub="per employee" />
        <StatCard label="Default Credit" value={`₹${defaultCredit}L`} sub="standard customers" />
        <StatCard label="Voucher Types" value={voucherConfigs.length} sub="configured" />
        <StatCard
          label="Collection Cycle"
          value={collectionPolicy ? `${collectionPolicy.reminderDays}d` : "—"}
          sub="first reminder"
        />
      </div>

      {/* Summary sections */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Expense categories */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--foreground)" }}>
            Expense Categories
          </h3>
          {categories.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No categories configured.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {categories.slice(0, 6).map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--foreground)" }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>{c.code}</span>
                </div>
              ))}
              {categories.length > 6 && (
                <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>+{categories.length - 6} more</p>
              )}
            </div>
          )}
        </div>

        {/* Conveyance rates */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--foreground)" }}>
            Conveyance Rates
          </h3>
          {conveyancePolicies.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No rates configured.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {conveyancePolicies.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--foreground)" }}>{p.vehicleType}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                    ₹{p.ratePerKm}/km
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Credit policies */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--foreground)" }}>
            Customer Credit Policies
          </h3>
          {creditPolicies.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No credit policies configured.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {creditPolicies.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--foreground)" }}>{p.customerType}</span>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    Default: ₹{p.defaultCreditLimitLakhs}L · Max: ₹{p.maxCreditLimitLakhs}L
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Voucher configs */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--foreground)" }}>
            Voucher Configuration
          </h3>
          {voucherConfigs.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>No voucher types configured.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {voucherConfigs.map((v) => (
                <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--foreground)" }}>{v.voucherType}</span>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                    {v.prefix}/FY/XXXXX
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
