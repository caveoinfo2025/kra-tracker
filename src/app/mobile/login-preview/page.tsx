import type { Metadata, Viewport } from "next";
import "../mobile.css";
import LoginPreviewScreen from "../screens/LoginPreviewScreen";

export const metadata: Metadata = {
  title: "Caveo CRM — Sign in",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0F1115",
};

/**
 * UI-only preview of the secure sign-in screen, reachable without a session.
 * Real authentication is handled by /login (Microsoft Entra ID via NextAuth).
 */
export default function LoginPreviewPage() {
  return (
    <div className="mobile-root">
      <LoginPreviewScreen />
    </div>
  );
}
