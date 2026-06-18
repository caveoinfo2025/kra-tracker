"use client";
/**
 * CustomerNameCombobox (Phase 17 upgrade)
 *
 * Autocomplete for customerName fields. Fetches from /api/customers/suggestions
 * which now returns Customer master records (with id) ranked before historical strings.
 *
 * Props:
 *   value        — current display string
 *   onChange     — called with the display string (backward-compat)
 *   onSelect     — called with (name, customerId | null) when a suggestion is chosen
 *   linkedId     — currently linked Customer master id (shows green badge when set)
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface Suggestion {
  name: string;
  id: number | null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (name: string, customerId: number | null) => void;
  linkedId?: number | null;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export default function CustomerNameCombobox({
  value,
  onChange,
  onSelect,
  linkedId,
  placeholder = "Type customer name…",
  required,
  disabled,
  className = "",
  id,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 1) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/customers/suggestions?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          const list: Suggestion[] = data.suggestions ?? [];
          setSuggestions(list);
          if (list.length > 0) { updatePosition(); setOpen(true); } else { setOpen(false); }
          setActiveIdx(-1);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
  }, [updatePosition]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    // Clear the master link when user manually types
    if (onSelect) onSelect(v, null);
    fetchSuggestions(v);
  }

  function select(s: Suggestion) {
    onChange(s.name);
    if (onSelect) onSelect(s.name, s.id);
    setSuggestions([]);
    setOpen(false);
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); select(suggestions[activeIdx]); }
    else if (e.key === "Escape") { setOpen(false); setActiveIdx(-1); }
  }

  const dropdown = open && suggestions.length > 0 ? (
    <ul
      style={{
        position: "fixed", zIndex: 99999,
        top: dropPos.top, left: dropPos.left, width: dropPos.width,
        background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        margin: 0, padding: "4px 0", listStyle: "none",
        maxHeight: 220, overflowY: "auto",
      }}
      role="listbox"
    >
      {suggestions.map((s, i) => (
        <li
          key={`${s.name}-${s.id}`}
          role="option"
          aria-selected={i === activeIdx}
          onMouseDown={e => { e.preventDefault(); select(s); }}
          onMouseEnter={() => setActiveIdx(i)}
          style={{
            padding: "8px 14px", cursor: "pointer", fontSize: 13,
            background: i === activeIdx ? "#fff5f5" : "transparent",
            color: i === activeIdx ? "#C8102E" : "#1a1a2e",
            fontWeight: i === activeIdx ? 600 : 400,
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span style={{ flex: 1 }}>{s.name}</span>
          {s.id !== null && (
            <span style={{ fontSize: 10, color: "#16a34a", background: "#dcfce7", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
              Master
            </span>
          )}
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (value.length >= 1 && suggestions.length > 0) { updatePosition(); setOpen(true); } }}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className={className}
          style={{ width: "100%", paddingRight: linkedId ? 80 : undefined }}
        />
        {linkedId && (
          <span style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            fontSize: 10, color: "#16a34a", background: "#dcfce7",
            borderRadius: 4, padding: "2px 6px", fontWeight: 600, pointerEvents: "none",
          }}>
            ✓ Linked
          </span>
        )}
        {loading && !linkedId && (
          <span style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 11, color: "#aaa", pointerEvents: "none",
          }}>…</span>
        )}
      </div>
      {typeof document !== "undefined" && dropdown ? createPortal(dropdown, document.body) : null}
    </>
  );
}
