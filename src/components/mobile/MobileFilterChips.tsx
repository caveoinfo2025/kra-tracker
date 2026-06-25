"use client";

export type MobileFilterChip = { key: string; label: string };

interface MobileFilterChipsProps {
  chips: MobileFilterChip[];
  active: string;
  onChange: (key: string) => void;
}

export default function MobileFilterChips({ chips, active, onChange }: MobileFilterChipsProps) {
  return (
    <div className="m-chip-row">
      {chips.map((chip) => (
        <button
          key={chip.key}
          className={`m-chip${active === chip.key ? " active" : ""}`}
          onClick={() => onChange(chip.key)}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
