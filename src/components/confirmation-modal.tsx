"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmationModal({ 
  open, 
  title = "Are you sure?", 
  description, 
  confirmLabel = "Confirm", 
  cancelLabel = "Cancel", 
  loading = false, 
  variant = "danger",
  onConfirm, 
  onCancel 
}: Props) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div 
        className="modal-content w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-4">
          <div 
            className="p-3 rounded-full shrink-0"
            style={{
              background: variant === "danger" ? "var(--danger-light)" : "var(--primary-light)",
            }}
          >
            <AlertTriangle 
              size={24} 
              style={{
                color: variant === "danger" ? "var(--danger)" : "var(--primary)",
              }}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              {title}
            </h3>
            {description && (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button 
            onClick={onCancel} 
            className="btn-outline"
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button 
            onClick={onConfirm} 
            disabled={loading} 
            className={variant === "danger" ? "btn-danger" : "btn-primary"}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="loading-spinner"></span>
                <span>Processing...</span>
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
