"use client";
import { useState } from "react";
import { X, CheckCircle2, FolderOpen } from "lucide-react";
import { CategoryTemplate, DEFAULT_TEMPLATES, todayISO } from "../data";

export default function CategoryTemplateLoader({
  onClose,
  onLoad,
}: {
  onClose: () => void;
  onLoad: (template: CategoryTemplate) => void;
}) {
  const [loaded, setLoaded] = useState<Set<string>>(new Set());

  function handleLoad(t: CategoryTemplate) {
    setLoaded((s) => new Set([...s, t.parentCode]));
    onLoad(t);
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, width: "min(660px, 95vw)", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.22)", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-1)" }}>Load Default Categories</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
              Select a template group to import its parent + sub-categories.
            </div>
          </div>
          <button onClick={onClose} className="btn-cav btn-cav-ghost btn-cav-sm"><X size={16} /></button>
        </div>

        {/* Template list */}
        <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          {DEFAULT_TEMPLATES.map((t) => {
            const isLoaded = loaded.has(t.parentCode);
            return (
              <div
                key={t.parentCode}
                style={{
                  border: `1px solid ${isLoaded ? "var(--success)" : "var(--border)"}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  background: isLoaded ? "rgba(31,157,85,0.04)" : "var(--surface-alt)",
                  transition: "border-color .15s, background .15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{t.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg-1)" }}>{t.parentName}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--caveo-red)", background: "rgba(200,16,46,.07)", padding: "1px 6px", borderRadius: 4 }}>{t.parentCode}</span>
                      <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Tally: {t.tallyLedger}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {t.subCategories.map((s) => (
                        <span key={s.code} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "var(--bg-muted)", color: "var(--fg-2)", border: "1px solid var(--border-subtle)" }}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--fg-3)" }}>
                      1 parent + {t.subCategories.length} sub-categories
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {isLoaded ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--success)", fontWeight: 600 }}>
                        <CheckCircle2 size={15} /> Loaded
                      </div>
                    ) : (
                      <button className="btn-cav btn-cav-primary btn-cav-sm" onClick={() => handleLoad(t)}>
                        <FolderOpen size={13} /> Load
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
            {loaded.size > 0 ? `${loaded.size} template${loaded.size > 1 ? "s" : ""} loaded` : "No templates loaded yet"}
          </div>
          <button className="btn-cav btn-cav-ghost" onClick={onClose}>
            {loaded.size > 0 ? "Done" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
