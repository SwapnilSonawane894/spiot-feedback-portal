import React from "react";

type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
};

export function StatCard({
  title,
  value,
  icon,
  iconBgColor = "var(--primary-light)",
  iconColor = "var(--primary)",
  trend,
  className = "",
}: StatCardProps) {
  return (
    <div className={`card p-6 hover-lift ${className}`}>
      <div className="flex items-start gap-4">
        <div
          className="p-3.5 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200"
          style={{ background: iconBgColor }}
        >
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            {title}
          </div>
          <div className="text-2xl md:text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            {value}
          </div>
          {trend && (
            <div 
              className="text-xs font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{
                background: trend.isPositive ? "var(--success-light)" : "var(--danger-light)",
                color: trend.isPositive ? "var(--success)" : "var(--danger)",
              }}
            >
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
