"use client";

import RequestWizard from "@/components/marketplace/RequestWizard";
import { PostRequestPayload } from "@/types/dashboard";
import { useEffect,useState } from "react";

export default function PostOnlineTuitionRequestPage() {
  const [prefill, setPrefill] = useState<Partial<PostRequestPayload>>({
    teachingMode: "online"
  });

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("tutorera_quick_request");
      if (stored) {
        setPrefill((prev) => ({ ...prev, ...JSON.parse(stored), teachingMode: "online" }));
      }
    } catch {}
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#f8faff", padding: "3rem 1.5rem 5rem" }}>
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#7c1bea", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Online 1-on-1 Tutoring
          </span>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 800, color: "#021550", margin: "0.25rem 0 0.5rem" }}>
            Post an Online Tuition Request
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem", maxWidth: 540, margin: "0 auto" }}>
            Post your subjects and schedule. Receive offers from verified online tutors nationwide and overseas with flexible timings.
          </p>
        </div>
        <RequestWizard initialMode="online" prefill={prefill} />
      </div>
    </main>
  );
}
