"use client";

import React from "react";

export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="flex flex-col items-center gap-4">
        <div 
          className="w-12 h-12 border-4 rounded-full animate-spin"
          style={{ 
            borderColor: "var(--primary-light)",
            borderTopColor: "var(--primary)"
          }}
        />
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Loading...
        </p>
      </div>
    </div>
  );
}
