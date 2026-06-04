"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { AdminModule } from "../data/adminModules";
import { STATUS_BADGE, STATUS_LABEL } from "../data/adminModules";

interface AdminModuleCardProps {
  module: AdminModule;
}

export default function AdminModuleCard({ module }: AdminModuleCardProps) {
  const Icon = module.icon;

  return (
    <Link href={module.route} style={{ textDecoration: "none", display: "block" }}>
      <div
        className="card"
        style={{
          padding: "18px 20px",
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          cursor: "pointer",
          transition: "border-color var(--duration-base), box-shadow var(--duration-base), transform var(--duration-fast)",
          minHeight: 90,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = module.iconColor;
          e.currentTarget.style.boxShadow = `0 4px 14px ${module.iconBg.replace("0.09", "0.18")}`;
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {/* Icon */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: "var(--radius-md)",
          background: module.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={19} strokeWidth={1.6} style={{ color: module.iconColor }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg-1)", lineHeight: 1.2 }}>
              {module.name}
            </span>
            <span className={`badge ${STATUS_BADGE[module.status]}`} style={{ fontSize: 10, flexShrink: 0 }}>
              {STATUS_LABEL[module.status]}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.5, marginBottom: 6 }}>
            {module.description}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--fg-4)", fontWeight: 500 }}>
            {module.ownerRole}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight
          size={14}
          strokeWidth={2}
          style={{ color: "var(--fg-4)", flexShrink: 0, marginTop: 4 }}
        />
      </div>
    </Link>
  );
}
