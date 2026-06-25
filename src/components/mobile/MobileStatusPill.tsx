"use client";

export type MobileStatus = "approved" | "pending" | "rejected" | "info" | "neutral" | "success" | "warn" | "danger";

interface MobileStatusPillProps {
  status: MobileStatus;
  label: string;
}

export default function MobileStatusPill({ status, label }: MobileStatusPillProps) {
  return <span className={`m-status ${status}`}>{label}</span>;
}
