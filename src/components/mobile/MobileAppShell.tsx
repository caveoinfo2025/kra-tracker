"use client";
import type { ReactNode } from "react";

interface MobileAppShellProps {
  children: ReactNode;
  hasBottomNav?: boolean;
  /** Set when a MobileHeader sibling already reserves the top safe-area inset. */
  hasHeader?: boolean;
  className?: string;
}

/**
 * Renders the scrollable content region of a mobile screen. Must be placed
 * as a direct flex child inside an outer `.m-screen` container, alongside an
 * optional MobileHeader and MobileBottomNav.
 */
export default function MobileAppShell({ children, hasBottomNav = false, hasHeader = false, className = "" }: MobileAppShellProps) {
  return (
    <div
      className={`m-content${hasBottomNav ? " has-tabbar" : ""} ${className}`.trim()}
      style={hasHeader ? { paddingTop: 0 } : undefined}
    >
      {children}
    </div>
  );
}
