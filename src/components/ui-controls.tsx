"use client";

import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export function PrimaryButton({ children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`w-full px-4 py-2 rounded-md text-white bg-blue-700 hover:bg-blue-800 transition disabled:opacity-50 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function TextInput({
  label,
  placeholder,
  type = "text",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; placeholder?: string }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        {...props}
        className={`w-full px-3 py-2 rounded-md border border-gray-300 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 ${props.className ?? ""}`}
      />
    </div>
  );
}

// no default export
