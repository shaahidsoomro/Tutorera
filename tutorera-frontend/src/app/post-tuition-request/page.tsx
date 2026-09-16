"use client";

import RequestWizard from "@/components/marketplace/RequestWizard";
import { PostRequestPayload } from "@/types/dashboard";
import { useEffect,useState } from "react";

export default function PostTuitionRequestPage() {
  const [prefill, setPrefill] = useState<Partial<PostRequestPayload>>({});

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("tutorera_quick_request");
      if (stored) {
        setPrefill(JSON.parse(stored));
      }
    } catch {}
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#f8faff", padding: "3rem 1.5rem 5rem" }}>
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        <RequestWizard prefill={prefill} />
      </div>
    </main>
  );
}
