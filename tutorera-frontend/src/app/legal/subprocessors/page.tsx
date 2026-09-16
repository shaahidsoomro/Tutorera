import {
  LEGAL_OPERATOR,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_VERSION
} from "@/lib/site";
import {
  Activity,
  ArrowRight,
  HardDrive,
  Server
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import s from "../../compliance-pages.module.css";

export const metadata: Metadata = {
  title: "Authorized Subprocessors Directory | Privacy & Data Processing | TUTORERA",
  description:
    "Official directory of third-party subprocessors utilized by TUTORERA to process personal data, deliver cloud infrastructure, payments, and messaging.",
  alternates: {
    canonical: "/legal/subprocessors",
  },
};

interface SubprocessorItem {
  name: string;
  purpose: string;
  category: string;
  location: string;
  safeguard: string;
}

const SUBPROCESSORS: SubprocessorItem[] = [
  {
    name: "Amazon Web Services (AWS)",
    purpose: "Cloud compute, encrypted object storage for verification documents, and network perimeter security.",
    category: "Hosting & Infrastructure",
    location: "United States, Germany (EU), Singapore",
    safeguard: "Standard Contractual Clauses (SCCs), ISO 27001, SOC 2 Type II",
  },
  {
    name: "MongoDB Inc. (MongoDB Atlas)",
    purpose: "Managed database clusters, persistent user records, requests, bookings, and encrypted logs.",
    category: "Database Services",
    location: "Frankfurt (Germany) / Dublin (Ireland)",
    safeguard: "EU GDPR Compliance, AES-256 Encryption at Rest, SOC 2 Type II",
  },
  {
    name: "Stripe Inc. / Stripe Payments Europe",
    purpose: "Global credit/debit card processing, 3D-Secure 2 authentication, fraud scoring, and international payouts.",
    category: "Payment Processing",
    location: "United States, Ireland (EU), United Kingdom",
    safeguard: "PCI-DSS Level 1 Service Provider, GDPR DPA with SCCs",
  },
  {
    name: "PayFast (APPS Pvt Ltd)",
    purpose: "State Bank of Pakistan (SBP) regulated payment gateway processing domestic card and bank transfers.",
    category: "Payment Processing",
    location: "Pakistan",
    safeguard: "SBP PSO/PSP Regulatory License, PCI-DSS Certified",
  },
  {
    name: "1LINK / JazzCash / EasyPaisa",
    purpose: "Local digital wallet and interbank fund transfer processing for domestic Pakistani students and tutors.",
    category: "Payment Processing",
    location: "Pakistan",
    safeguard: "State Bank of Pakistan Oversight, SBP Authorized Platform Settlement",
  },
  {
    name: "Resend / SendGrid (Twilio Inc.)",
    purpose: "Transactional system emails, booking notifications, password resets, and verification messages.",
    category: "Communications",
    location: "United States, European Union",
    safeguard: "GDPR Compliant DPA, SCCs, TLS 1.3 Transmission Encryption",
  },
  {
    name: "Cloudflare Inc.",
    purpose: "Production frontend hosting through Cloudflare Workers/OpenNext, edge routing, Web Application Firewall (WAF), distributed denial of service (DDoS) mitigation, and SSL termination.",
    category: "Hosting, Security & Networking",
    location: "Global Edge Network",
    safeguard: "ISO 27001, SOC 2 Type II, Global Privacy Framework",
  },
  {
    name: "Google LLC / Google Ireland Ltd",
    purpose: "Aggregated, privacy-respecting website telemetry and performance diagnostics (Google Analytics 4).",
    category: "Analytics & Telemetry",
    location: "United States, Ireland (EU)",
    safeguard: "EU-US Data Privacy Framework, IP Anonymization, DPA",
  },
];

export default function SubprocessorsPage() {
  return (
    <div className={s.wrapper}>
      {/* Hero */}
      <section className={s.hero}>
        <div className={s.badge}>
          <Server size={16} /> Privacy & Compliance Architecture
        </div>
        <h1 className={s.title}>Authorized Subprocessors Directory</h1>
        <p className={s.subtitle}>
          In accordance with GDPR, UK GDPR, and international data protection standards,
          this directory discloses all third-party vendors and cloud providers engaged by{" "}
          {LEGAL_OPERATOR} (trading as TUTORERA) to process personal data.
        </p>
        <div className={s.meta}>
          <span>Directory Version: v{PRIVACY_VERSION}</span>
          <span>•</span>
          <span>Last Updated: September 2026</span>
          <span>•</span>
          <span>Privacy Officer: {PRIVACY_CONTACT_EMAIL}</span>
        </div>
      </section>

      <div className={s.container}>
        {/* Intro Highlight */}
        <div className={s.highlightBox}>
          <strong>Commitment to Rigorous Vendor Governance:</strong>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.95rem", lineHeight: "1.7" }}>
            Before onboarding any external cloud service or technology partner, TUTORERA conducts
            comprehensive data security and privacy impact evaluations. All subprocessors are legally
            bound by Data Protection Addenda (DPAs) mandating confidential treatment, adherence to
            Standard Contractual Clauses (SCCs) for international transfers, strict encryption standards,
            and an absolute prohibition against selling or using user data for unauthorized commercial purposes.
          </p>
        </div>

        {/* Directory Table */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <HardDrive size={22} color="var(--primary, #0f172a)" /> Current Infrastructure & Processing Partners
          </h2>
          <div style={{ overflowX: "auto", marginTop: "1.5rem" }}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th style={{ minWidth: "160px" }}>Subprocessor</th>
                  <th style={{ minWidth: "140px" }}>Category</th>
                  <th style={{ minWidth: "240px" }}>Purpose of Processing</th>
                  <th style={{ minWidth: "150px" }}>Entity Location</th>
                  <th style={{ minWidth: "180px" }}>Transfer Safeguards</th>
                </tr>
              </thead>
              <tbody>
                {SUBPROCESSORS.map((sp) => (
                  <tr key={sp.name}>
                    <td>
                      <strong>{sp.name}</strong>
                    </td>
                    <td>
                      <span className={s.tableBadge}>{sp.category}</span>
                    </td>
                    <td style={{ fontSize: "0.9rem", color: "#4b5563" }}>{sp.purpose}</td>
                    <td style={{ fontSize: "0.9rem" }}>{sp.location}</td>
                    <td style={{ fontSize: "0.85rem", color: "#4b5563" }}>{sp.safeguard}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section: Notification of Changes */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <Activity size={22} color="var(--primary, #0f172a)" /> Subprocessor Updates & Notification Mechanisms
          </h2>
          <p>
            TUTORERA reviews and updates this directory when engaging new technology vendors or replacing
            existing systems:
          </p>
          <ul className={s.list}>
            <li>
              <strong>Advance Notice:</strong> We post material additions or changes to this directory at least
              thirty (30) calendar days before any new subprocessor commences processing personal data.
            </li>
            <li>
              <strong>Right to Inquire or Object:</strong> Enterprise, institutional, or individual users with
              contractual data protection agreements may register inquiries or reasonable objections regarding
              new subprocessors by emailing <strong>{PRIVACY_CONTACT_EMAIL}</strong> within the notification period.
            </li>
          </ul>

          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/privacy" className={s.primaryBtn}>
              Read Privacy Policy <ArrowRight size={16} />
            </Link>
            <Link href="/privacy-center" className={s.secondaryBtn}>
              Visit Privacy Request Center
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
