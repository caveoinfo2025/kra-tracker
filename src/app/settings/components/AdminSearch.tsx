"use client";

import { Search, X } from "lucide-react";

interface AdminSearchProps {
  value: string;
  onChange: (v: string) => void;
  resultCount?: number;
}

export default function AdminSearch({ value, onChange, resultCount }: AdminSearchProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ position: "relative", maxWidth: 440 }}>
        {/* Search icon */}
        <Search
          size={15}
          strokeWidth={1.8}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--fg-4)",
            pointerEvents: "none",
          }}
        />

        <input
          type="text"
          placeholder="Search settings..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            height: 38,
            paddingLeft: 36,
            paddingRight: value ? 36 : 14,
            fontSize: 13,
            color: "var(--fg-1)",
            background: "var(--bg-elev)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            outline: "none",
            fontFamily: "var(--font-sans)",
            transition: "border-color var(--duration-fast)",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--infra-blue)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
        />

        {/* Clear button */}
        {value && (
          <button
            onClick={() => onChange("")}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              padding: 2,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              color: "var(--fg-4)",
            }}
            aria-label="Clear search"
          >
            <X size={13} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Result count hint */}
      {value && resultCount !== undefined && (
        <p style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 6 }}>
          {resultCount === 0
            ? "No modules match your search"
            : `${resultCount} module${resultCount !== 1 ? "s" : ""} found`}
        </p>
      )}
    </div>
  );
}
