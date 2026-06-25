"use client";
import type { ReactNode } from "react";

interface MobileFormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export default function MobileFormField({ label, hint, error, children }: MobileFormFieldProps) {
  return (
    <div className="m-formfield">
      <label className="ff-label">{label}</label>
      {children}
      {error ? <div className="ff-error">{error}</div> : hint ? <div className="ff-hint">{hint}</div> : null}
    </div>
  );
}
