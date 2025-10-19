"use client";

import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
};

export function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  const baseClass = variant === "primary" ? "btn-primary" :
                    variant === "secondary" ? "btn-secondary" :
                    variant === "danger" ? "btn-danger" :
                    variant === "outline" ? "btn-outline" :
                    "btn-ghost";
  
  return (
    <button
      {...props}
      className={`${baseClass} ${className}`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`btn-primary ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`btn-secondary ${className}`}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`btn-danger ${className}`}
    >
      {children}
    </button>
  );
}

export function OutlineButton({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`btn-outline ${className}`}
    >
      {children}
    </button>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { 
  label?: string; 
  error?: string;
  helper?: string;
};

export function TextInput({
  label,
  error,
  helper,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="form-label">{label}</label>}
      <input
        {...props}
        className={`input-field ${error ? "border-red-500" : ""} ${className}`}
      />
      {error && <p className="form-error">{error}</p>}
      {helper && !error && <p className="form-helper">{helper}</p>}
    </div>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { 
  label?: string; 
  error?: string;
  helper?: string;
};

export function Select({
  label,
  error,
  helper,
  className = "",
  children,
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label && <label className="form-label">{label}</label>}
      <select
        {...props}
        className={`input-field ${error ? "border-red-500" : ""} ${className}`}
      >
        {children}
      </select>
      {error && <p className="form-error">{error}</p>}
      {helper && !error && <p className="form-helper">{helper}</p>}
    </div>
  );
}

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { 
  label?: string; 
  error?: string;
  helper?: string;
};

export function TextArea({
  label,
  error,
  helper,
  className = "",
  ...props
}: TextAreaProps) {
  return (
    <div className="w-full">
      {label && <label className="form-label">{label}</label>}
      <textarea
        {...props}
        className={`input-field ${error ? "border-red-500" : ""} ${className}`}
      />
      {error && <p className="form-error">{error}</p>}
      {helper && !error && <p className="form-helper">{helper}</p>}
    </div>
  );
}
