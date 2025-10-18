import React from "react";

type ContentCardProps = {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
};

export function ContentCard({ children, className = "", noPadding = false }: ContentCardProps) {
  return (
    <div className={`card ${noPadding ? "" : "content-spacing"} ${className}`}>
      {children}
    </div>
  );
}

type ContentCardHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function ContentCardHeader({ title, description, action }: ContentCardHeaderProps) {
  return (
    <div className="card-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
        {description && (
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function ContentCardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-body ${className}`}>{children}</div>;
}

export function ContentCardFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-footer ${className}`}>{children}</div>;
}
