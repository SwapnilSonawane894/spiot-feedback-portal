"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

type Option = {
  value: string;
  label: string;
};

type CustomSelectProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
};

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  label,
  className = "",
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled) {
        setIsOpen(!isOpen);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && <label className="form-label">{label}</label>}
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="input-field w-full flex items-center justify-between cursor-pointer"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span style={{ color: selectedOption ? "var(--text-primary)" : "var(--text-muted)" }}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            style={{ color: "var(--text-muted)" }}
          />
        </button>

        {isOpen && (
          <div
            className="absolute z-50 w-full mt-2 rounded-lg overflow-hidden shadow-lg fade-in"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              maxHeight: "240px",
              overflowY: "auto",
            }}
            role="listbox"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className="w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors"
                style={{
                  color: "var(--text-primary)",
                  background: option.value === value ? "var(--primary-light)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (option.value !== value) {
                    e.currentTarget.style.background = "var(--hover-overlay)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (option.value !== value) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
                role="option"
                aria-selected={option.value === value}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Check size={16} style={{ color: "var(--primary)" }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
