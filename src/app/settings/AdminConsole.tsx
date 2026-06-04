"use client";

import { useState, useMemo } from "react";
import { ADMIN_MODULES, ADMIN_STATS } from "./data/adminModules";
import AdminHeader from "./components/AdminHeader";
import AdminSearch from "./components/AdminSearch";
import AdminStatsCard from "./components/AdminStatsCard";
import AdminModuleCard from "./components/AdminModuleCard";
import RecentChanges from "./components/RecentChanges";
import QuickActions from "./components/QuickActions";

export default function AdminConsole() {
  const [query, setQuery] = useState("");

  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ADMIN_MODULES;
    return ADMIN_MODULES.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.ownerRole.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div style={{ maxWidth: 1180, padding: "28px 32px" }}>
      {/* Header */}
      <AdminHeader moduleCount={ADMIN_MODULES.length} />

      {/* Divider */}
      <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 24 }} />

      {/* Quick stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12,
        marginBottom: 28,
      }}>
        {ADMIN_STATS.map((stat) => (
          <AdminStatsCard key={stat.label} stat={stat} />
        ))}
      </div>

      {/* Search */}
      <AdminSearch
        value={query}
        onChange={setQuery}
        resultCount={query ? filteredModules.length : undefined}
      />

      {/* Module grid */}
      <div style={{ marginBottom: 36 }}>
        {/* Section label */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--fg-4)",
          }}>
            {query ? `Results (${filteredModules.length})` : `Configuration Modules (${ADMIN_MODULES.length})`}
          </div>
        </div>

        {filteredModules.length > 0 ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 12,
          }}>
            {filteredModules.map((mod) => (
              <AdminModuleCard key={mod.id} module={mod} />
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: "48px 24px",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-lg)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-3)" }}>
              No modules match &ldquo;{query}&rdquo;
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 6 }}>
              Try searching by module name, description, or owner role
            </div>
          </div>
        )}
      </div>

      {/* Bottom row: Recent Changes + Quick Actions */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
      }}>
        <RecentChanges />
        <QuickActions />
      </div>

      {/* Footer note */}
      <div style={{
        marginTop: 24,
        padding: "12px 16px",
        background: "var(--bg-muted)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <div style={{
          width: 6, height: 6,
          borderRadius: "50%",
          background: "var(--infra-blue)",
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
          <strong style={{ color: "var(--fg-2)" }}>Enterprise Admin Console — Phase 1.</strong>
          {" "}Modules marked <em>Planned</em> are under active development. Current settings
          remain accessible via <strong style={{ color: "var(--fg-2)" }}>Settings → Administration</strong>.
        </span>
      </div>
    </div>
  );
}
