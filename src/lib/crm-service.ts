/**
 * External CRM Service
 * --------------------
 * Fetches master data (Customers, OEMs, Categories, Products) from the
 * external CRM. If CRM_API_BASE_URL is not configured it falls back to
 * built-in mock data so development and staging never break.
 *
 * Set these env vars to point at your real CRM:
 *   CRM_API_BASE_URL=https://crm.example.com/api
 *   CRM_API_KEY=<bearer token>
 */

export type CrmOption = { id: string; name: string; meta?: Record<string, unknown> };

// ── Mock master data (used when CRM_API_BASE_URL is absent) ───────────────────

const MOCK_CATEGORIES: CrmOption[] = [
  { id: "cat-1", name: "Network & Security" },
  { id: "cat-2", name: "Server & Storage" },
  { id: "cat-3", name: "MSSP Services" },
  { id: "cat-4", name: "Cloud Security & Services" },
  { id: "cat-5", name: "Endpoint Security" },
  { id: "cat-6", name: "IAM & PAM" },
  { id: "cat-7", name: "Other" },
];

const MOCK_OEMS: CrmOption[] = [
  { id: "oem-1",  name: "Cisco" },
  { id: "oem-2",  name: "Fortinet" },
  { id: "oem-3",  name: "Palo Alto Networks" },
  { id: "oem-4",  name: "CrowdStrike" },
  { id: "oem-5",  name: "Microsoft" },
  { id: "oem-6",  name: "Dell Technologies" },
  { id: "oem-7",  name: "HPE" },
  { id: "oem-8",  name: "Nutanix" },
  { id: "oem-9",  name: "VMware" },
  { id: "oem-10", name: "SentinelOne" },
  { id: "oem-11", name: "Check Point" },
  { id: "oem-12", name: "Trend Micro" },
];

const MOCK_PRODUCTS: CrmOption[] = [
  { id: "prod-1",  name: "Next-Gen Firewall", meta: { oemId: "oem-1" } },
  { id: "prod-2",  name: "SD-WAN",             meta: { oemId: "oem-1" } },
  { id: "prod-3",  name: "FortiGate NGFW",      meta: { oemId: "oem-2" } },
  { id: "prod-4",  name: "FortiEDR",            meta: { oemId: "oem-2" } },
  { id: "prod-5",  name: "Prisma Access",        meta: { oemId: "oem-3" } },
  { id: "prod-6",  name: "Cortex XDR",           meta: { oemId: "oem-3" } },
  { id: "prod-7",  name: "Falcon Platform",      meta: { oemId: "oem-4" } },
  { id: "prod-8",  name: "Microsoft 365 E5",     meta: { oemId: "oem-5" } },
  { id: "prod-9",  name: "Azure Sentinel",        meta: { oemId: "oem-5" } },
  { id: "prod-10", name: "PowerEdge Server",      meta: { oemId: "oem-6" } },
  { id: "prod-11", name: "ProLiant Server",        meta: { oemId: "oem-7" } },
  { id: "prod-12", name: "HCI Platform",           meta: { oemId: "oem-8" } },
];

const MOCK_CUSTOMERS: CrmOption[] = [
  { id: "cust-1",  name: "HDFC Bank" },
  { id: "cust-2",  name: "Tata Motors" },
  { id: "cust-3",  name: "Infosys" },
  { id: "cust-4",  name: "Wipro" },
  { id: "cust-5",  name: "Sun Pharma" },
  { id: "cust-6",  name: "Reliance Industries" },
  { id: "cust-7",  name: "ICICI Bank" },
  { id: "cust-8",  name: "Bajaj Auto" },
  { id: "cust-9",  name: "HCL Technologies" },
  { id: "cust-10", name: "Larsen & Toubro" },
];

// ── Internal helpers ──────────────────────────────────────────────────────────

const BASE = process.env.CRM_API_BASE_URL;
const KEY  = process.env.CRM_API_KEY ?? "";

async function fetchFromCrm<T>(path: string): Promise<T | null> {
  if (!BASE) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      next: { revalidate: 300 }, // cache 5 min
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getCrmCategories(query = ""): Promise<CrmOption[]> {
  const live = await fetchFromCrm<CrmOption[]>(`/categories?q=${encodeURIComponent(query)}`);
  const list = live ?? MOCK_CATEGORIES;
  return query ? list.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())) : list;
}

export async function getCrmOems(query = ""): Promise<CrmOption[]> {
  const live = await fetchFromCrm<CrmOption[]>(`/oems?q=${encodeURIComponent(query)}`);
  const list = live ?? MOCK_OEMS;
  return query ? list.filter((o) => o.name.toLowerCase().includes(query.toLowerCase())) : list;
}

export async function getCrmProducts(query = "", oemId?: string): Promise<CrmOption[]> {
  const qs = new URLSearchParams({ q: query, ...(oemId ? { oemId } : {}) });
  const live = await fetchFromCrm<CrmOption[]>(`/products?${qs}`);
  let list = live ?? MOCK_PRODUCTS;
  if (oemId) list = list.filter((p) => !p.meta?.oemId || p.meta.oemId === oemId);
  if (query) list = list.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  return list;
}

export async function getCrmCustomers(query = ""): Promise<CrmOption[]> {
  const live = await fetchFromCrm<CrmOption[]>(`/customers?q=${encodeURIComponent(query)}`);
  const list = live ?? MOCK_CUSTOMERS;
  return query ? list.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())) : list;
}
