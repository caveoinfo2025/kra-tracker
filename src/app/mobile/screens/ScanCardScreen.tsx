"use client";
import { useRef, useState } from "react";
import MIcon from "../components/MIcon";

interface Props {
  onBack: () => void;
  onCreated: () => void;
}

interface Fields {
  contactPerson: string;
  companyName: string;
  email: string;
  phone: string;
  website: string;
  title: string;
  raw: string;
}

type Phase = "capture" | "processing" | "review";

const EMPTY: Fields = {
  contactPerson: "", companyName: "", email: "", phone: "", website: "", title: "", raw: "",
};

/** Downscale + JPEG-compress an image file to keep the OCR payload small. */
function compressImage(file: File, maxDim = 1600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
          else { width = Math.round((width * maxDim) / height); height = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ScanCardScreen({ onBack, onCreated }: Props) {
  const [phase, setPhase] = useState<Phase>("capture");
  const [preview, setPreview] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [expectedValue, setExpectedValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // separate inputs: camera (capture=environment) vs gallery upload
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setPhase("processing");
    try {
      const dataUrl = await compressImage(file);
      setPreview(dataUrl);
      const res = await fetch("/api/ocr/business-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Scan failed. Enter details manually.");
        setFields(EMPTY);
        setPhase("review"); // let them fill manually
        return;
      }
      if (!data.fields) {
        setError(data.error ?? "No text found. Enter details manually.");
        setFields(EMPTY);
        setPhase("review");
        return;
      }
      setFields({ ...EMPTY, ...data.fields });
      setPhase("review");
    } catch {
      setError("Could not process the image. Enter details manually.");
      setFields(EMPTY);
      setPhase("review");
    }
  }

  function set<K extends keyof Fields>(k: K, v: string) {
    setFields((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setError("");
    if (!fields.companyName.trim() && !fields.contactPerson.trim()) {
      setError("Add at least a company or contact name.");
      return;
    }
    setSaving(true);
    try {
      const titleBits = [fields.companyName || fields.contactPerson, fields.title].filter(Boolean);
      const remarks = [
        fields.website ? `Website: ${fields.website}` : "",
        fields.title ? `Designation: ${fields.title}` : "",
        "— Captured via business-card scan —",
        fields.raw ? `\nOCR text:\n${fields.raw}` : "",
      ].filter(Boolean).join("\n");

      const res = await fetch("/api/pipeline/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleBits.join(" — ") || "New lead",
          companyName: fields.companyName || fields.contactPerson,
          contactPerson: fields.contactPerson,
          email: fields.email,
          phone: fields.phone,
          source: "Business Card",
          expectedValue: Number(expectedValue) || 0,
          remarks,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Could not create the lead.");
        return;
      }
      onCreated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="m-screen m-screen-enter">
      <div className="m-content has-tabbar">
        {/* Navbar */}
        <div className="m-navbar">
          <button className="m-back" onClick={onBack}>
            <MIcon name="back" size={18} /> Pipeline
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ width: 36 }} />
        </div>

        {/* Header */}
        <div className="m-header">
          <div className="m-eyebrow">New Lead</div>
          <h1 className="m-title">Scan Business Card</h1>
          <div className="m-subtitle">
            {phase === "review" ? "Check the details, then save" : "Snap or upload a card — we'll read it"}
          </div>
        </div>

        {/* Hidden inputs */}
        <input
          ref={cameraRef} type="file" accept="image/*" capture="environment"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <input
          ref={uploadRef} type="file" accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {error && (
          <div className="m-section">
            <div style={{ background: "rgba(200,16,46,0.08)", color: "var(--caveo-red)", fontSize: 12.5, padding: "10px 14px", borderRadius: 12 }}>
              {error}
            </div>
          </div>
        )}

        {/* ── Capture phase ── */}
        {phase === "capture" && (
          <div className="m-section">
            <div className="m-card" style={{ textAlign: "center", padding: "28px 18px" }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18, margin: "0 auto 16px",
                background: "rgba(200,16,46,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <MIcon name="doc" size={28} color="var(--caveo-red)" />
              </div>
              <div style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.5, marginBottom: 20 }}>
                Take a photo of a business card and we'll pull out the name,
                company, email and phone automatically.
              </div>
              <button className="m-btn" style={{ width: "100%", marginBottom: 10 }} onClick={() => cameraRef.current?.click()}>
                <MIcon name="phone" size={16} color="#fff" /> Take Photo
              </button>
              <button className="m-btn m-btn-secondary" style={{ width: "100%" }} onClick={() => uploadRef.current?.click()}>
                <MIcon name="attach" size={16} /> Upload from Gallery
              </button>
            </div>
          </div>
        )}

        {/* ── Processing phase ── */}
        {phase === "processing" && (
          <div className="m-section">
            <div className="m-card" style={{ textAlign: "center", padding: "32px 18px" }}>
              {preview && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={preview} alt="card" style={{ width: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 12, marginBottom: 18, opacity: 0.85 }} />
              )}
              <div className="m-spinner" style={{ margin: "0 auto 12px" }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-1)" }}>Reading card…</div>
              <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 4 }}>Extracting contact details</div>
            </div>
          </div>
        )}

        {/* ── Review phase ── */}
        {phase === "review" && (
          <>
            {preview && (
              <div className="m-section">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="card" style={{ width: "100%", maxHeight: 150, objectFit: "contain", borderRadius: 12, border: "1px solid var(--border)" }} />
              </div>
            )}
            <div className="m-section">
              <div className="m-card">
                <div className="m-field">
                  <label className="m-field-label">Contact Name</label>
                  <input className="m-input" value={fields.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} placeholder="Full name" />
                </div>
                <div className="m-field">
                  <label className="m-field-label">Company</label>
                  <input className="m-input" value={fields.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Company name" />
                </div>
                <div className="m-field">
                  <label className="m-field-label">Designation</label>
                  <input className="m-input" value={fields.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Procurement Manager" />
                </div>
                <div className="m-field">
                  <label className="m-field-label">Email</label>
                  <input className="m-input" type="email" value={fields.email} onChange={(e) => set("email", e.target.value)} placeholder="name@company.com" />
                </div>
                <div className="m-field">
                  <label className="m-field-label">Phone</label>
                  <input className="m-input" type="tel" value={fields.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91…" />
                </div>
                <div className="m-field">
                  <label className="m-field-label">Est. Deal Value (₹L)</label>
                  <input className="m-input" type="number" inputMode="decimal" value={expectedValue} onChange={(e) => setExpectedValue(e.target.value)} placeholder="0" />
                </div>
              </div>
            </div>
            <div className="m-section" style={{ display: "flex", gap: 8 }}>
              <button className="m-btn m-btn-secondary" style={{ flex: 1 }} onClick={() => { setPhase("capture"); setPreview(null); setError(""); }}>
                Rescan
              </button>
              <button className="m-btn" style={{ flex: 2 }} onClick={save} disabled={saving}>
                <MIcon name="check" size={15} color="#fff" /> {saving ? "Saving…" : "Create Lead"}
              </button>
            </div>
          </>
        )}

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
