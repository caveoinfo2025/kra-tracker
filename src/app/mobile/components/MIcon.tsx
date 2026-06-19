"use client";

interface MIconProps {
  name: string;
  size?: number;
  color?: string;
}

export default function MIcon({ name, size = 18, color = "currentColor" }: MIconProps) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24" as string,
    fill: "none",
    stroke: color,
    strokeWidth: 1.7 as number,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "home":
      return <svg {...p}><path d="M3 12L12 3l9 9"/><path d="M5 10v10h14V10"/></svg>;
    case "pipeline":
      return <svg {...p}><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="4" height="8" rx="1"/></svg>;
    case "updates":
      return <svg {...p}><path d="M21 12c0 5-4 9-9 9a9 9 0 0 1-7.5-4L3 21l1-4.5A9 9 0 1 1 21 12z"/></svg>;
    case "user":
      return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case "plus":
      return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case "search":
      return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "bell":
      return <svg {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case "back":
      return <svg {...p}><path d="m15 6-6 6 6 6"/></svg>;
    case "chev":
      return <svg {...p}><path d="m9 6 6 6-6 6"/></svg>;
    case "x":
      return <svg {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case "more":
      return <svg {...p}><circle cx="5" cy="12" r="1.5" fill={color}/><circle cx="12" cy="12" r="1.5" fill={color}/><circle cx="19" cy="12" r="1.5" fill={color}/></svg>;
    case "trend-up":
      return <svg {...p}><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>;
    case "target":
      return <svg {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill={color}/></svg>;
    case "phone":
      return <svg {...p}><path d="M5 4h4l2 5-3 2a13 13 0 0 0 6 6l2-3 5 2v4a1 1 0 0 1-1 1A18 18 0 0 1 4 5a1 1 0 0 1 1-1z"/></svg>;
    case "mail":
      return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>;
    case "doc":
      return <svg {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>;
    case "calendar":
      return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>;
    case "alert":
      return <svg {...p}><path d="M12 2l10 18H2z"/><path d="M12 9v5"/><circle cx="12" cy="17.5" r="0.7" fill={color}/></svg>;
    case "check":
      return <svg {...p}><path d="m5 12 5 5L20 7"/></svg>;
    case "filter":
      return <svg {...p}><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>;
    case "shield":
      return <svg {...p}><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/></svg>;
    case "mic":
      return <svg {...p}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>;
    case "attach":
      return <svg {...p}><path d="M21 11.5l-9 9a5.5 5.5 0 0 1-7.78-7.78l9-9a4 4 0 0 1 5.66 5.66l-9 9a2.5 2.5 0 0 1-3.54-3.54l8-8"/></svg>;
    case "log-out":
      return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
    case "wallet":
      return <svg {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12h2"/><path d="M2 10h20"/></svg>;
    case "funnel":
      return <svg {...p}><path d="M3 4h18l-7 9v6l-4 2v-8z"/></svg>;
    case "receipt":
      return <svg {...p}><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2"/><path d="M8 8h8M8 12h6M8 16h4"/></svg>;
    case "opp":
      return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg>;
    case "bar-chart":
      return <svg {...p}><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>;
    default:
      return null;
  }
}
