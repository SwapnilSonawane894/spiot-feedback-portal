"use client";

import React from "react";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmationModal({ open, title = "Are you sure?", description, confirmLabel = "Yes", cancelLabel = "Cancel", loading = false, onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="text-sm text-gray-600 mt-2">{description}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-md border text-gray-700">{cancelLabel}</button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 rounded-md bg-red-600 text-white disabled:opacity-50">{loading ? "Working..." : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
