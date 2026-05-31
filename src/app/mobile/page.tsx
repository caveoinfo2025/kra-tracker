import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/dev-session";
import MobileApp from "./MobileApp";
import ServiceWorkerRegistrar from "./ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Caveo CRM",
  description: "Caveo Infosystems Sales CRM — Pipeline, KRAs, Collections & Daily Updates",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Caveo CRM",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/icon-192.png",
    icon: "/icons/icon-192.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#C8102E",
    "msapplication-TileImage": "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#C8102E",
};

export default async function MobilePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <>
      <ServiceWorkerRegistrar />
      <MobileApp
        userName={session.user.employeeName ?? session.user.name ?? "You"}
        userEmail={session.user.email ?? ""}
        isManager={session.user.isManager ?? false}
        employeeId={session.user.employeeId ?? 0}
      />
    </>
  );
}
