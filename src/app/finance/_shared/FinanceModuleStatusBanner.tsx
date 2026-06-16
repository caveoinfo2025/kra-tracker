/**
 * FinanceModuleStatusBanner
 *
 * Shared server-component banner that indicates the live/preview/coming-soon
 * status of each Finance module. Used at the top of Finance page.tsx files.
 *
 * Variants:
 *   live-readonly     — connected to real data, write actions gated
 *   live-operational  — fully wired including approval/action APIs
 *   partially-live    — some APIs wired, some actions still pending
 *   preview           — mock/sample data, backend not yet wired
 *   coming-soon       — module not yet implemented
 */

import { CheckCircle2, Eye, Clock, Construction, Radio } from "lucide-react";

export type FinanceBannerVariant =
  | "live-readonly"
  | "live-operational"
  | "partially-live"
  | "preview"
  | "coming-soon";

interface Props {
  variant: FinanceBannerVariant;
  /** Override the default message for this variant. */
  message?: string;
}

// ── Per-variant defaults ───────────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  FinanceBannerVariant,
  {
    icon:        React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
    badge:       string;
    message:     string;
    borderColor: string;
    bgColor:     string;
    iconColor:   string;
    badgeBg:     string;
    badgeColor:  string;
  }
> = {
  "live-readonly": {
    icon:        CheckCircle2,
    badge:       "Live · Read-only",
    message:     "This page is connected to live data. Create, edit, posting, and export actions will be enabled in upcoming phases.",
    borderColor: "var(--fg-success, #27AE60)",
    bgColor:     "rgba(39,174,96,0.05)",
    iconColor:   "var(--fg-success, #27AE60)",
    badgeBg:     "rgba(39,174,96,0.12)",
    badgeColor:  "var(--fg-success, #27AE60)",
  },
  "live-operational": {
    icon:        Radio,
    badge:       "Live · Operational",
    message:     "This page is connected to the live backend and all primary actions are enabled.",
    borderColor: "var(--fg-success, #27AE60)",
    bgColor:     "rgba(39,174,96,0.05)",
    iconColor:   "var(--fg-success, #27AE60)",
    badgeBg:     "rgba(39,174,96,0.12)",
    badgeColor:  "var(--fg-success, #27AE60)",
  },
  "partially-live": {
    icon:        Clock,
    badge:       "Partially Live",
    message:     "Some features on this page are connected to live data. Certain actions may be disabled until backend workflows are completed.",
    borderColor: "var(--caveo-orange, #E67E22)",
    bgColor:     "rgba(230,126,34,0.05)",
    iconColor:   "var(--caveo-orange, #E67E22)",
    badgeBg:     "rgba(230,126,34,0.12)",
    badgeColor:  "var(--caveo-orange, #E67E22)",
  },
  "preview": {
    icon:        Eye,
    badge:       "Preview",
    message:     "This page is currently in preview mode and may show sample data. Live backend wiring is pending.",
    borderColor: "var(--fg-accent, #2980B9)",
    bgColor:     "rgba(41,128,185,0.05)",
    iconColor:   "var(--fg-accent, #2980B9)",
    badgeBg:     "rgba(41,128,185,0.12)",
    badgeColor:  "var(--fg-accent, #2980B9)",
  },
  "coming-soon": {
    icon:        Construction,
    badge:       "Coming Soon",
    message:     "This module is under development. Features shown here are not yet enabled for production use.",
    borderColor: "var(--fg-3, #888)",
    bgColor:     "var(--bg-2)",
    iconColor:   "var(--fg-4)",
    badgeBg:     "var(--bg-2)",
    badgeColor:  "var(--fg-3)",
  },
};

// ── Component ──────────────────────────────────────────────────────────────

export default function FinanceModuleStatusBanner({ variant, message }: Props) {
  const cfg = VARIANT_CONFIG[variant];
  const Icon = cfg.icon;
  const displayMsg = message ?? cfg.message;

  return (
    <div
      style={{
        display:      "flex",
        alignItems:   "flex-start",
        gap:          10,
        padding:      "10px 14px",
        borderRadius: 8,
        border:       "1px solid var(--border-1)",
        borderLeft:   `3px solid ${cfg.borderColor}`,
        background:   cfg.bgColor,
        fontSize:     12,
        lineHeight:   1.55,
        marginBottom: 4,
      }}
    >
      <Icon
        size={14}
        style={{ color: cfg.iconColor, flexShrink: 0, marginTop: 1 }}
      />

      <span style={{ color: "var(--fg-3)", flex: 1 }}>{displayMsg}</span>

      <span
        style={{
          fontSize:     10,
          fontWeight:   600,
          letterSpacing:"0.04em",
          padding:      "2px 8px",
          borderRadius: 20,
          whiteSpace:   "nowrap",
          background:   cfg.badgeBg,
          color:        cfg.badgeColor,
          flexShrink:   0,
          alignSelf:    "center",
        }}
      >
        {cfg.badge}
      </span>
    </div>
  );
}
