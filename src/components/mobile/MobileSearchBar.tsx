"use client";
import MIcon from "@/app/mobile/components/MIcon";

interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function MobileSearchBar({ value, onChange, placeholder = "Search" }: MobileSearchBarProps) {
  return (
    <div className="m-searchbar">
      <span className="ico">
        <MIcon name="search" size={16} />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="text"
      />
    </div>
  );
}
