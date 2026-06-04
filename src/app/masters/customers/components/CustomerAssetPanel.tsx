"use client";
import { HardDrive, ShieldCheck, AlertTriangle, Plus } from "lucide-react";
import { CustomerAsset, CustomerSite, CustomerCaps, fmtDate, todayISO } from "../data";

function AssetRow({ asset, sites }: { asset: CustomerAsset; sites: CustomerSite[] }) {
  const site = sites.find((s) => s.id === asset.siteId);
  const amcActive = asset.amcEnd >= todayISO();
  const amcExpiringSoon = amcActive && asset.amcEnd < new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
  return (
    <div style={{ border: `1px solid ${amcExpiringSoon ? "var(--ot-orange)" : "var(--border)"}`, borderRadius: 10, padding: "12px 14px", background: "var(--surface-alt)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <HardDrive size={16} style={{ color: "var(--fg-3)", marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{asset.product}</div>
          <div className="cell-sub">S/N: <span style={{ fontFamily: "var(--font-mono)" }}>{asset.serialNo}</span>{site ? ` · ${site.siteName}` : ""}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap", fontSize: 11.5 }}>
            <div><span style={{ color: "var(--fg-4)" }}>Warranty:</span> <b>{fmtDate(asset.warrantyEnd)}</b></div>
            <div><span style={{ color: "var(--fg-4)" }}>AMC:</span> <b>{fmtDate(asset.amcStart)} → {fmtDate(asset.amcEnd)}</b></div>
            <div><span style={{ color: "var(--fg-4)" }}>SLA:</span> <b>{asset.sla}</b></div>
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          {amcActive ? (
            amcExpiringSoon
              ? <span className="badge badge-warning" style={{ fontSize: 10, display: "inline-flex", alignItems: "center", gap: 3 }}><AlertTriangle size={10} /> AMC expiring</span>
              : <span className="badge badge-success" style={{ fontSize: 10, display: "inline-flex", alignItems: "center", gap: 3 }}><ShieldCheck size={10} /> AMC active</span>
          ) : <span className="badge badge-neutral" style={{ fontSize: 10 }}>AMC expired</span>}
        </div>
      </div>
    </div>
  );
}

export default function CustomerAssetPanel({ assets, sites, caps, onAdd }: { assets: CustomerAsset[]; sites: CustomerSite[]; caps: CustomerCaps; onAdd?: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
        Installed products, warranty, AMC, and SLA — referenced by AMC Contracts, Support, and Asset Management.
      </div>
      {assets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "36px 16px", color: "var(--fg-4)" }}>
          <HardDrive size={26} strokeWidth={1.2} style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: 13 }}>No assets recorded for this customer yet.</div>
        </div>
      ) : (
        assets.map((a) => <AssetRow key={a.id} asset={a} sites={sites} />)
      )}
      {caps.canEdit && (
        <button className="btn-cav btn-cav-secondary btn-cav-sm" style={{ alignSelf: "flex-start" }} onClick={onAdd}>
          <Plus size={13} /> Add Asset
        </button>
      )}
    </div>
  );
}
