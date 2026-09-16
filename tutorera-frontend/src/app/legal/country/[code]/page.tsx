import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_OPERATOR,
  PRIVACY_CONTACT_EMAIL,
  TERMS_VERSION
} from "@/lib/site";
import {
  ArrowRight,
  Building,
  FileCheck,
  Globe2,
  Scale,
  ShieldCheck
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import s from "../../../compliance-pages.module.css";

interface CountryScheduleData {
  code: string;
  name: string;
  flag: string;
  legalEntity: string;
  governingLaw: string;
  disputeForum: string;
  consumerRights: string;
  dataPrivacyLaw: string;
  childAgeThreshold: number;
  taxNotes: string;
  inPersonScreening: string;
  coolingOffPeriod: string;
}

const COUNTRY_SCHEDULES: Record<string, CountryScheduleData> = {
  pk: {
    code: "pk",
    name: "Pakistan",
    flag: "🇵🇰",
    legalEntity: `${LEGAL_OPERATOR}`,
    governingLaw: "Laws of the Islamic Republic of Pakistan",
    disputeForum: "Competent Courts of Islamabad, Pakistan",
    consumerRights:
      "Consumer rights under the Islamabad Consumer Protection Act 1995, Punjab Consumer Protection Act 2005, and provincial consumer laws apply. Statutory remedies for service non-performance are preserved.",
    dataPrivacyLaw:
      "Protection under PECA 2016 (Prevention of Electronic Crimes Act), sector-specific banking regulations, and general constitutional privacy protections.",
    childAgeThreshold: 13,
    taxNotes:
      "Tutors operate as self-employed independent contractors and are personally responsible for filing income tax with the Federal Board of Revenue (FBR) and provincial sales tax on services (PRA, SRB, KPRA, BRA) where applicable.",
    inPersonScreening:
      "Mandatory Police Character Certificate issued by Police Khidmat Markaz (PKM) or local police authorities with official tracking diary number.",
    coolingOffPeriod:
      "First-Session Guarantee applies: student may cancel or dispute within 24 hours of first session if service is deficient.",
  },
  ae: {
    code: "ae",
    name: "United Arab Emirates",
    flag: "🇦🇪",
    legalEntity: `${LEGAL_OPERATOR}`,
    governingLaw: "Laws of the United Arab Emirates as applied in the Emirate of Dubai",
    disputeForum: "Dubai Courts / DIFC Small Claims Tribunal where eligible",
    consumerRights:
      "Protected under Federal Law No. 15 of 2020 on Consumer Protection. Transparent pricing, itemized receipts, and service clarity mandatory.",
    dataPrivacyLaw:
      "Federal Decree-Law No. 45 of 2021 regarding the Protection of Personal Data (UAE PDPL). Explicit cross-border transfer protections apply.",
    childAgeThreshold: 14,
    taxNotes:
      "5% UAE Value Added Tax (VAT) rules apply where applicable under Federal Tax Authority (FTA) guidelines. Tutors are independent service providers.",
    inPersonScreening:
      "UAE Good Conduct / Police Clearance Certificate issued through the Ministry of Interior (MOI), Dubai Police, or Abu Dhabi Police.",
    coolingOffPeriod:
      "Session refund available within 24 hours prior to scheduled lesson start; full satisfaction guarantee on introductory session.",
  },
  gb: {
    code: "gb",
    name: "United Kingdom",
    flag: "🇬🇧",
    legalEntity: `${LEGAL_OPERATOR}`,
    governingLaw: "Laws of England and Wales",
    disputeForum: "Courts of England and Wales",
    consumerRights:
      "Consumer Rights Act 2015 and Consumer Contracts Regulations 2013 apply. Statutory rights cannot be limited or excluded by contract.",
    dataPrivacyLaw:
      "UK General Data Protection Regulation (UK GDPR), Data Protection Act 2018, and ICO Age Appropriate Design Code (Children's Code).",
    childAgeThreshold: 13,
    taxNotes:
      "Independent tutors are responsible for declaring educational earnings to HM Revenue & Customs (HMRC) via Self Assessment and monitoring UK VAT thresholds.",
    inPersonScreening:
      "Basic or Enhanced Disclosure and Barring Service (DBS) check, or active subscription to the DBS Update Service.",
    coolingOffPeriod:
      "Statutory 14-day cancellation right applies under Consumer Contracts Regulations, which expires upon express request to commence early digital lesson delivery.",
  },
  us: {
    code: "us",
    name: "United States",
    flag: "🇺🇸",
    legalEntity: `${LEGAL_OPERATOR}`,
    governingLaw: "Federal Arbitration Act and laws of the State of Delaware (without regard to conflict of law principles)",
    disputeForum: "American Arbitration Association (AAA) Consumer Arbitration / Individual Small Claims Court",
    consumerRights:
      "Federal Trade Commission (FTC) Act and state-specific consumer protection legislation (e.g., California Consumer Legal Remedies Act).",
    dataPrivacyLaw:
      "Children's Online Privacy Protection Act (COPPA - requires verifiable parental consent under 13), California Consumer Privacy Act (CCPA/CPRA), and applicable state privacy statutes.",
    childAgeThreshold: 13,
    taxNotes:
      "Tutors receive Form 1099-K if gross transaction volumes exceed statutory IRS reporting thresholds. Independent contractor 1099 classification applies.",
    inPersonScreening:
      "Multi-jurisdictional criminal record search and National Sex Offender Public Website (NSOPW) screening via FCRA-accredited agency.",
    coolingOffPeriod:
      "Platform satisfaction guarantee: dispute lesson charge within 24 hours if tutor fails to attend or instruction is materially defective.",
  },
  sa: {
    code: "sa",
    name: "Saudi Arabia",
    flag: "🇸🇦",
    legalEntity: `${LEGAL_OPERATOR}`,
    governingLaw: "Laws and Regulations of the Kingdom of Saudi Arabia",
    disputeForum: "Competent Courts of the Kingdom of Saudi Arabia",
    consumerRights:
      "Consumer Protection rules issued by the Ministry of Commerce and Saudi E-Commerce Law (Royal Decree No. M/126).",
    dataPrivacyLaw:
      "Saudi Personal Data Protection Law (PDPL - Royal Decree No. M/19) overseen by the Saudi Data & AI Authority (SDAIA).",
    childAgeThreshold: 15,
    taxNotes:
      "Zakat, Tax and Customs Authority (ZATCA) VAT regulations apply where applicable. Independent tutors must comply with freelancing document requirements.",
    inPersonScreening:
      "Criminal Record Status Clearance Certificate issued via Absher / Public Security.",
    coolingOffPeriod:
      "In accordance with Saudi E-Commerce Law, cancellation right applies prior to the delivery of live instructional services.",
  },
};

export function generateStaticParams() {
  return [
    { code: "pk" },
    { code: "ae" },
    { code: "gb" },
    { code: "us" },
    { code: "sa" },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const schedule = COUNTRY_SCHEDULES[code.toLowerCase()];
  if (!schedule) {
    return {
      title: "Jurisdiction Legal Schedule | TUTORERA",
      description: "Jurisdiction-specific legal and regulatory addendum for TUTORERA global marketplace.",
    };
  }

  return {
    title: `${schedule.flag} ${schedule.name} Legal Schedule & Statutory Terms | TUTORERA`,
    description: `Specific consumer rights, dispute resolution, tax rules, and privacy regulations governing TUTORERA services in ${schedule.name}.`,
    alternates: {
      canonical: `/legal/country/${schedule.code}`,
    },
  };
}

export default async function CountryLegalSchedulePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const schedule = COUNTRY_SCHEDULES[code.toLowerCase()];

  if (!schedule) {
    notFound();
  }

  return (
    <div className={s.wrapper}>
      {/* Hero */}
      <section className={s.hero}>
        <div className={s.badge}>
          <Globe2 size={16} /> Jurisdiction Addendum: {schedule.name}
        </div>
        <h1 className={s.title}>
          {schedule.flag} {schedule.name} Legal & Regulatory Schedule
        </h1>
        <p className={s.subtitle}>
          This country-specific schedule forms a binding legal addendum to the TUTORERA Global
          Terms of Service and Privacy Policy for users residing or transacting in {schedule.name}.
        </p>
        <div className={s.meta}>
          <span>Schedule ID: {schedule.code.toUpperCase()}-{TERMS_VERSION}</span>
          <span>•</span>
          <span>Operating Entity: {schedule.legalEntity}</span>
          <span>•</span>
          <span>Legal Counsel: {LEGAL_CONTACT_EMAIL}</span>
        </div>
      </section>

      <div className={s.container}>
        {/* Country Selector Jump Bar */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "2rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "#4b5563" }}>View other countries:</span>
          {Object.values(COUNTRY_SCHEDULES).map((item) => (
            <Link
              key={item.code}
              href={`/legal/country/${item.code}`}
              style={{
                padding: "0.4rem 0.85rem",
                borderRadius: "2rem",
                fontSize: "0.85rem",
                fontWeight: item.code === schedule.code ? "700" : "500",
                backgroundColor: item.code === schedule.code ? "var(--primary, #0f172a)" : "#f1f5f9",
                color: item.code === schedule.code ? "white" : "#334155",
                textDecoration: "none",
              }}
            >
              {item.flag} {item.name}
            </Link>
          ))}
        </div>

        {/* Core Notice */}
        <div className={s.highlightBox}>
          <strong>Relationship to Global Terms:</strong>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.92rem", lineHeight: "1.6" }}>
            The TUTORERA Global Terms of Service apply universally to all marketplace participants.
            However, where mandatory consumer protection, child privacy, or local tax laws in{" "}
            <strong>{schedule.name}</strong> grant you greater statutory rights than set forth in
            the Global Terms, those local statutory rights take legal precedence.
          </p>
        </div>

        {/* Section 1: Governing Law & Jurisdiction */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <Scale size={22} color="var(--primary, #0f172a)" /> 1. Governing Law & Dispute Forum
          </h2>
          <div className={s.cardGrid}>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Governing Law</h3>
              <p className={s.cardText}>
                Subject to mandatory local consumer conflicts, transactions originating in {schedule.name}{" "}
                are governed by:
              </p>
              <p style={{ fontWeight: "700", marginTop: "0.5rem", color: "var(--primary, #0f172a)" }}>
                {schedule.governingLaw}
              </p>
            </div>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Dispute Resolution Forum</h3>
              <p className={s.cardText}>
                Any formal unresolved dispute, claim, or controversy shall be adjudicated before:
              </p>
              <p style={{ fontWeight: "700", marginTop: "0.5rem", color: "var(--primary, #0f172a)" }}>
                {schedule.disputeForum}
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Statutory Consumer Rights */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <ShieldCheck size={22} color="var(--primary, #0f172a)" /> 2. Statutory Consumer Protections
          </h2>
          <p>{schedule.consumerRights}</p>
          <div className={s.highlightBox} style={{ marginTop: "1rem" }}>
            <strong>Cooling-Off & Satisfaction Guarantee:</strong>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.92rem" }}>
              {schedule.coolingOffPeriod}
            </p>
          </div>
        </section>

        {/* Section 3: Data Privacy & Minor Safeguards */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <FileCheck size={22} color="var(--primary, #0f172a)" /> 3. Data Privacy & Age Thresholds
          </h2>
          <div className={s.cardGrid}>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Applicable Privacy Statute</h3>
              <p className={s.cardText}>{schedule.dataPrivacyLaw}</p>
              <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#6b7280" }}>
                Enquiries: <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>
              </p>
            </div>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Digital Age of Consent</h3>
              <p className={s.cardText}>
                In {schedule.name}, the statutory minimum age for direct digital account consent is{" "}
                <strong>{schedule.childAgeThreshold} years</strong>. Any student below this age must have their
                account created and supervised by a parent or verified guardian.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: In-Person Screening & Taxation */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <Building size={22} color="var(--primary, #0f172a)" /> 4. In-Person Screening & Local Tax Treatment
          </h2>
          <div className={s.cardGrid}>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Physical Tuition Background Standard</h3>
              <p className={s.cardText}>{schedule.inPersonScreening}</p>
            </div>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Tax Responsibility & Classification</h3>
              <p className={s.cardText}>{schedule.taxNotes}</p>
            </div>
          </div>

          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/terms" className={s.primaryBtn}>
              Read Global Terms <ArrowRight size={16} />
            </Link>
            <Link href="/legal" className={s.secondaryBtn}>
              Return to Legal Center
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
