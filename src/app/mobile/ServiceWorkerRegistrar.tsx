"use client";
import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => console.log("[PWA] Service worker registered:", reg.scope))
        .catch((err) => console.warn("[PWA] SW registration failed:", err));
    }
  }, []);
  return null;
}
