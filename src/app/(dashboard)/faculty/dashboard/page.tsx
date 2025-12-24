"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect to the main faculty report page with the better UI
export default function FacultyDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/faculty/report");
  }, [router]);

  return (
    <main className="max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p style={{ color: "var(--text-muted)" }}>Redirecting...</p>
      </div>
    </main>
  );
}
