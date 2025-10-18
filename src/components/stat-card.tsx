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
    <div className={`card p-5 ${className}`}>
      <div className="flex items-start gap-4">
        <div
          className="p-3 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: iconBgColor }}
        >
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            {title}
          </div>
          <div className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            {value}
          </div>
          {trend && (
            <div className={`text-xs font-medium ${trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
