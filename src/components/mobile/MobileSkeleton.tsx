"use client";

interface MobileSkeletonProps {
  variant?: "line" | "card" | "kpi" | "circle";
  width?: string | number;
  height?: string | number;
}

export default function MobileSkeleton({ variant = "line", width, height }: MobileSkeletonProps) {
  const presets: Record<string, { width: string | number; height: string | number; borderRadius?: string }> = {
    line: { width: width ?? "100%", height: height ?? 14 },
    card: { width: width ?? "100%", height: height ?? 80, borderRadius: "14px" },
    kpi: { width: width ?? "100%", height: height ?? 64, borderRadius: "14px" },
    circle: { width: width ?? 40, height: height ?? 40, borderRadius: "50%" },
  };
  const style = presets[variant];
  return <div className="m-skeleton" style={style} />;
}
