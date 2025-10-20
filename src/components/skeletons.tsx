import React from "react";

export function SkeletonPulse({ className = "" }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
      style={{ 
        background: "var(--hover-overlay)",
        opacity: 0.6
      }}
    />
  );
}

export function SkeletonText({ 
  lines = 1, 
  className = "" 
}: { 
  lines?: number; 
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonPulse 
          key={i} 
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} 
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`card card-body ${className}`}>
      {children}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="card content-spacing">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <SkeletonPulse className="h-4 w-24 mb-3" />
          <SkeletonPulse className="h-8 w-16" />
        </div>
        <SkeletonPulse className="h-12 w-12 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonTaskCard() {
  return (
    <article className="card content-spacing flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <SkeletonPulse className="h-10 w-10 rounded-lg" />
        <div className="flex-1 min-w-0">
          <SkeletonPulse className="h-3 w-16 mb-2" />
          <SkeletonPulse className="h-5 w-32" />
        </div>
      </div>
      <SkeletonPulse className="h-4 w-full" />
      <div className="flex items-center gap-3 mt-auto pt-3 border-t" style={{ borderColor: "var(--card-border)" }}>
        <SkeletonPulse className="h-10 w-full rounded-lg" />
      </div>
    </article>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="text-left p-3">
                <SkeletonPulse className="h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-t" style={{ borderColor: "var(--card-border)" }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="p-3">
                  <SkeletonPulse className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonMetricRow() {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "var(--hover-overlay)" }}>
      <div className="flex items-center gap-3 flex-1">
        <SkeletonPulse className="h-5 w-5 rounded" />
        <SkeletonPulse className="h-4 w-32" />
      </div>
      <SkeletonPulse className="h-6 w-12" />
    </div>
  );
}

export function SkeletonList({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--hover-overlay)" }}>
          <SkeletonPulse className="h-10 w-10 rounded-lg" />
          <div className="flex-1">
            <SkeletonPulse className="h-4 w-3/4 mb-2" />
            <SkeletonPulse className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboardStats() {
  return (
    <div className="stats-grid section-spacing">
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
    </div>
  );
}

export function SkeletonReportCard() {
  return (
    <SkeletonCard>
      <div className="mb-4">
        <SkeletonPulse className="h-6 w-48 mb-2" />
        <SkeletonPulse className="h-4 w-32" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center border-b py-2" style={{ borderColor: "var(--card-border)" }}>
            <SkeletonPulse className="h-4 w-2/3" />
            <SkeletonPulse className="h-4 w-16" />
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}
