"use client";
/**
 * Debounced search-able dropdown that fetches from /api/pipeline/crm-data.
 */
import { useState, useEffect, useRef } from "react";

type Option = { id: string; name: string };

type Props = {
  type: "categories" | "oems" | "products" | "customers";
  value: string;
  name: string;
  placeholder?: string;
  oemId?: string;
  onChange: (id: string, name: string) => void;
  disabled?: boolean;
};

export function CrmSelect({ type, value, name, placeholder, oemId, onChange, disabled }: Props) {
  const [query,   setQuery]   = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Display text for current value
  const displayText = name || (value ? value : "");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ type, q: query });
        if (oemId) qs.set("oemId", oemId);
        const res  = await fetch(`/api/pipeline/crm-data?${qs}`);
        const data = await res.json();
        setOptions(data);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, open, type, oemId]);

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        placeholder={placeholder ?? `Search ${type}…`}
        value={open ? query : displayText}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC2229] disabled:bg-gray-50"
      />
      {value && !open && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange("", ""); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
        >✕</button>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border max-h-56 overflow-y-auto">
          {loading && <p className="text-xs text-gray-400 px-3 py-2">Loading…</p>}
          {!loading && options.length === 0 && (
            <p className="text-xs text-gray-400 px-3 py-2">No results</p>
          )}
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 hover:text-[#CC2229] transition-colors"
              onClick={() => { onChange(opt.id, opt.name); setOpen(false); }}
            >
              {opt.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
