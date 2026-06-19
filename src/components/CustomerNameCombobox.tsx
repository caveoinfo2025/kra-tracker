"use client";
/**
 * CustomerNameCombobox
 *
 * Drop-in replacement for <input type="text"> on any customerName field.
 * Fetches autocomplete suggestions from /api/customers/suggestions as the
 * user types, ranked by prefix match, deduped across all CRM modules.
 *
 * The dropdown uses position:fixed so it escapes overflow:hidden modals.
 *
 * Usage:
 *   <CustomerNameCombobox
 *     value={form.customerName}
 *     onChange={(v) => setForm(f => ({ ...f, customerName: v }))}
 *     required
 *   />
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export default function CustomerNameCombobox({
  value,
  onChange,
  placeholder = "Type customer name…",
  required,
  disabled,
  className = "",
  id,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  // Position for fixed dropdown (so it escapes overflow:hidden modals)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recalculate dropdown position whenever it opens or window resizes/scrolls
  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
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

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch suggestions with 200 ms debounce
  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/customers/suggestions?q=${encodeURIComponent(q)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions ?? []);
          if ((data.suggestions?.length ?? 0) > 0) {
            updatePosition();
            setOpen(true);
          } else {
            setOpen(false);
          }
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
    fetchSuggestions(v);
  }

  function select(name: string) {
    onChange(name);
    setSuggestions([]);
    setOpen(false);
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      select(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  const dropdown =
    open && suggestions.length > 0 ? (
      <ul
        style={{
          position: "fixed",
          zIndex: 99999,
          top: dropPos.top,
          left: dropPos.left,
          width: dropPos.width,
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          margin: 0,
          padding: "4px 0",
          listStyle: "none",
          maxHeight: 220,
          overflowY: "auto",
        }}
        role="listbox"
      >
        {suggestions.map((name, i) => (
          <li
            key={name}
            role="option"
            aria-selected={i === activeIdx}
            onMouseDown={(e) => {
              e.preventDefault(); // prevent blur before click
              select(name);
            }}
            onMouseEnter={() => setActiveIdx(i)}
            style={{
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: 13,
              background: i === activeIdx ? "#fff5f5" : "transparent",
              color: i === activeIdx ? "#C8102E" : "#1a1a2e",
              fontWeight: i === activeIdx ? 600 : 400,
              transition: "background 0.1s",
            }}
          >
            {name}
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
          onFocus={() => {
            if (value.length >= 1 && suggestions.length > 0) {
              updatePosition();
              setOpen(true);
            }
          }}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className={className}
          style={{ width: "100%" }}
        />
        {loading && (
          <span
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 11,
              color: "#aaa",
              pointerEvents: "none",
            }}
          >
            …
          </span>
        )}
      </div>

      {/* Portal so the dropdown renders outside any overflow:hidden ancestor */}
      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </>
  );
}
