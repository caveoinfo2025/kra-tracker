"use client";

import { useState, useEffect } from "react";

type AuditEntry = {
  id: number;
  entityType: string;
  action: string;
  performedById: number;
  changes: string;
  notes: string;
  createdAt: string;
};

const FINANCE_ENTITY_TYPES = [
  "finance_policy",
  "expense_category",
  "expense_limit_rule",
  "conveyance_policy",
  "advance_policy",
  "customer_credit_policy",
  "voucher_configuration",
  "collection_policy",
];

const ACTION_LABEL: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deactivated",
};

const ACTION_COLOR: Record<string, string> = {
  create: "#00AA00",
  update: "#FF6B00",
  delete: "#C8102E",
};

export default function FinanceAudit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/audit?entityTypes=" + FINANCE_ENTITY_TYPES.join(",") + "&limit=50");
        if (res.ok) {
          const data = await res.json() as { entries: AuditEntry[] };
          setEntries(data.entries ?? []);
        }
      } catch {
        // audit is non-critical — show empty state
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = filter === "all"
    ? entries
    : entries.filter((e) => e.entityType === filter);

  function formatEntityType(type: string) {
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>Finance Audit Log</h2>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
            All changes to finance policies, limits, voucher rules, and credit settings.
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: "6px 10px", fontSize: 12, borderRadius: 6, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)" }}
        >
          <option value="all">All Changes</option>
          {FINANCE_ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{formatEntityType(t)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-foreground)", fontSize: 13 }}>
          Loading audit log…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 0",
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10,
          color: "var(--muted-foreground)", fontSize: 13,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          No audit entries yet. Changes to finance settings will appear here.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          {filtered.map((entry, idx) => (
            <div
              key={entry.id}
              style={{
                padding: "12px 18px",
                borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : "none",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              {/* Action badge */}
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: ACTION_COLOR[entry.action] ?? "var(--muted-foreground)",
                marginTop: 5, flexShrink: 0,
              }} />

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                    {ACTION_LABEL[entry.action] ?? entry.action}
                  </span>
                  <span style={{
                    fontSize: 11, padding: "1px 7px", borderRadius: 10,
                    background: "var(--accent)", color: "var(--muted-foreground)",
                  }}>
                    {formatEntityType(entry.entityType)}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    by Employee #{entry.performedById}
                  </span>
                </div>
                {entry.notes && (
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{entry.notes}</p>
                )}
                {entry.changes && entry.changes !== "{}" && (
                  <pre style={{
                    fontSize: 11, fontFamily: "monospace",
                    color: "var(--muted-foreground)", marginTop: 4,
                    background: "var(--accent)", padding: "4px 8px", borderRadius: 4,
                    whiteSpace: "pre-wrap", wordBreak: "break-all",
                  }}>
                    {(() => { try { return JSON.stringify(JSON.parse(entry.changes), null, 2); } catch { return entry.changes; } })()}
                  </pre>
                )}
              </div>

              <div style={{ fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap", flexShrink: 0 }}>
                {formatDate(entry.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
