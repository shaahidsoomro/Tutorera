import BrandLogo from "@/components/BrandLogo";
import { SUPPORT_EMAIL } from "@/lib/site";
import { BookOpen, Mail, Globe, BookMarked } from "lucide-react";
import Link from "next/link";
import { FiFacebook } from "react-icons/fi";
import { RiTwitterLine } from "react-icons/ri";
import { SiInstagram } from "react-icons/si";
import { SlSocialLinkedin } from "react-icons/sl";
import s from "./Footer.module.css";

// ─── Navigation columns ───────────────────────────────────────────────────────
const footerColumns = [
  {
    title: "Students",
    links: [
      { label: "Post Requirement", href: "/post-tuition-request" },
      { label: "Home Tuition", href: "/pk/home-tuition" },
      { label: "Online Tuition", href: "/pk/online-tuition" },
      { label: "Find Tutors", href: "/tutors" },
      { label: "Subjects", href: "/subjects" },
      { label: "Safety", href: "/safety" },
      { label: "Refer & Earn", href: "/refer-and-earn" },
    ],
  },
  {
    title: "Tutors",
    links: [
      { label: "Become a Tutor", href: "/become-a-tutor" },
      { label: "Tuition Opportunities", href: "/opportunities" },
      { label: "Tutor Guide", href: "/tutor/guidebook" },
      { label: "Verification", href: "/verification-policy" },
      { label: "Tutor Agreement", href: "/terms/tutors" },
    ],
  },
  {
    title: "TUTORERA",
    links: [
      { label: "About", href: "/about" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Research", href: "/research" },
      { label: "Tutoring Index", href: "/research/tutoring-index" },
      { label: "Guides", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Cookies", href: "/cookies" },
      { label: "Refund & Cancellation", href: "/refund-policy" },
      { label: "Community Standards", href: "/community-guidelines" },
      { label: "Safeguarding", href: "/child-safety" },
    ],
  },
];

// ─── Marketplace geography — 5 markets ───────────────────────────────────────
const markets = [
  {
    flag: "🇵🇰",
    country: "Pakistan",
    cities: [
      { label: "Karachi",     href: "/tutors/city/karachi" },
      { label: "Lahore",      href: "/tutors/city/lahore" },
      { label: "Islamabad",   href: "/tutors/city/islamabad" },
      { label: "Rawalpindi",  href: "/tutors/city/rawalpindi" },
      { label: "Peshawar",    href: "/tutors/city/peshawar" },
      { label: "Faisalabad",  href: "/tutors/city/faisalabad" },
      { label: "Multan",      href: "/tutors/city/multan" },
      { label: "Quetta",      href: "/tutors/city/quetta" },
      { label: "Sialkot",     href: "/tutors/city/sialkot" },
      { label: "Hyderabad",   href: "/tutors/city/hyderabad" },
    ],
  },
  {
    flag: "🇦🇪",
    country: "United Arab Emirates",
    cities: [
      { label: "Dubai",           href: "/tutors/city/dubai" },
      { label: "Abu Dhabi",       href: "/tutors/city/abu-dhabi" },
      { label: "Sharjah",         href: "/tutors/city/sharjah" },
      { label: "Ajman",           href: "/tutors/city/ajman" },
      { label: "Ras Al Khaimah",  href: "/tutors/city/ras-al-khaimah" },
      { label: "Fujairah",        href: "/tutors/city/fujairah" },
    ],
  },
  {
    flag: "🇸🇦",
    country: "Saudi Arabia",
    cities: [
      { label: "Riyadh",   href: "/tutors/city/riyadh" },
      { label: "Jeddah",   href: "/tutors/city/jeddah" },
      { label: "Dammam",   href: "/tutors/city/dammam" },
      { label: "Mecca",    href: "/tutors/city/mecca" },
      { label: "Medina",   href: "/tutors/city/medina" },
      { label: "Khobar",   href: "/tutors/city/khobar" },
      { label: "Tabuk",    href: "/tutors/city/tabuk" },
    ],
  },
  {
    flag: "🇬🇧",
    country: "United Kingdom",
    cities: [
      { label: "London",       href: "/tutors/city/london" },
      { label: "Birmingham",   href: "/tutors/city/birmingham" },
      { label: "Manchester",   href: "/tutors/city/manchester" },
      { label: "Leeds",        href: "/tutors/city/leeds" },
      { label: "Glasgow",      href: "/tutors/city/glasgow" },
      { label: "Edinburgh",    href: "/tutors/city/edinburgh" },
      { label: "Bradford",     href: "/tutors/city/bradford" },
    ],
  },
  {
    flag: "🇺🇸",
    country: "United States",
    cities: [
      { label: "New York",     href: "/tutors/city/new-york" },
      { label: "Los Angeles",  href: "/tutors/city/los-angeles" },
      { label: "Chicago",      href: "/tutors/city/chicago" },
      { label: "Houston",      href: "/tutors/city/houston" },
      { label: "Dallas",       href: "/tutors/city/dallas" },
      { label: "Washington DC", href: "/tutors/city/washington-dc" },
      { label: "Atlanta",      href: "/tutors/city/atlanta" },
    ],
  },
];

// ─── Subject offerings — 5 categories ───────────────────────────────────────
const subjectColumns = [
  {
    heading: "Sciences",
    subjects: [
      { label: "Physics",                 href: "/tutors/subject/physics" },
      { label: "Chemistry",               href: "/tutors/subject/chemistry" },
      { label: "Biology",                 href: "/tutors/subject/biology" },
      { label: "Computer Science",        href: "/tutors/subject/computer-science" },
      { label: "Environmental Science",   href: "/tutors/subject/environmental-science" },
      { label: "Combined Science",        href: "/tutors/subject/combined-science" },
      { label: "Human Biology",           href: "/tutors/subject/human-biology" },
    ],
  },
  {
    heading: "Mathematics",
    subjects: [
      { label: "Mathematics",             href: "/tutors/subject/mathematics" },
      { label: "Statistics",              href: "/tutors/subject/statistics" },
      { label: "Further Mathematics",     href: "/tutors/subject/further-mathematics" },
      { label: "Applied Mathematics",     href: "/tutors/subject/applied-mathematics" },
      { label: "Pure Mathematics",        href: "/tutors/subject/pure-mathematics" },
      { label: "MDCAT Mathematics",       href: "/tutors/subject/mathematics" },
      { label: "ECAT Mathematics",        href: "/tutors/subject/mathematics" },
    ],
  },
  {
    heading: "Languages & Arts",
    subjects: [
      { label: "English",                 href: "/tutors/subject/english" },
      { label: "Urdu",                    href: "/tutors/subject/urdu" },
      { label: "Arabic",                  href: "/tutors/subject/arabic" },
      { label: "French",                  href: "/tutors/subject/french" },
      { label: "German",                  href: "/tutors/subject/german" },
      { label: "Islamiyat",               href: "/tutors/subject/islamiyat" },
      { label: "Pakistan Studies",        href: "/tutors/subject/pakistan-studies" },
    ],
  },
  {
    heading: "Business & Humanities",
    subjects: [
      { label: "Economics",               href: "/tutors/subject/economics" },
      { label: "Business Studies",        href: "/tutors/subject/business-studies" },
      { label: "Accounting",              href: "/tutors/subject/accounting" },
      { label: "Geography",               href: "/tutors/subject/geography" },
      { label: "History",                 href: "/tutors/subject/history" },
      { label: "Sociology",               href: "/tutors/subject/sociology" },
      { label: "Psychology",              href: "/tutors/subject/psychology" },
    ],
  },
  {
    heading: "Exam Prep",
    subjects: [
      { label: "O Level / IGCSE",         href: "/tutors/subject/o-level" },
      { label: "A Level",                 href: "/tutors/subject/a-level" },
      { label: "MDCAT",                   href: "/tutors/subject/mdcat" },
      { label: "ECAT",                    href: "/tutors/subject/ecat" },
      { label: "SAT",                     href: "/tutors/subject/sat" },
      { label: "IELTS",                   href: "/tutors/subject/ielts" },
      { label: "TOEFL",                   href: "/tutors/subject/toefl" },
      { label: "Entry Test Prep",         href: "/tutors/subject/entry-tests" },
    ],
  },
];

const socialLinks = [
  { label: "Twitter / X", icon: RiTwitterLine, href: "https://twitter.com/mentiserapk" },
  { label: "Facebook", icon: FiFacebook, href: "https://facebook.com/mentiserapk" },
  { label: "Instagram", icon: SiInstagram, href: "https://instagram.com/mentiserapk" },
  { label: "LinkedIn", icon: SlSocialLinkedin, href: "https://linkedin.com/company/mentiserapk" },
];

export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.container}>

        {/* ── Top: Brand + nav columns ── */}
        <div className={s.top}>
          <div className={s.brand}>
            <BrandLogo className={s.logo} imageClassName={s.logoImage} variant="light" size="lg" />
            <p>
              TUTORERA is a student-first tutoring marketplace. Students and parents post their learning requirements and preferred budget; eligible tutors can respond with offers to compare before a tutor is chosen.
            </p>
            <div className={s.contactList} aria-label="Contact information">
              <a href={`mailto:${SUPPORT_EMAIL}`}><Mail size={16} aria-hidden="true" /> {SUPPORT_EMAIL}</a>
              <Link href="/"><BookOpen size={16} aria-hidden="true" /> tutorera.ac.pk</Link>
              <Link href="/contact"><Mail size={16} aria-hidden="true" /> Contact support</Link>
            </div>
            <div className={s.socials} aria-label="Social links">
              {socialLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.label}>
                    <Icon size={18} aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </div>

          <nav className={s.columns} aria-label="Footer navigation">
            {footerColumns.map((column) => (
              <section key={column.title} aria-labelledby={`footer-${column.title.replace(/\s|&/g, "-").toLowerCase()}`}>
                <h2 id={`footer-${column.title.replace(/\s|&/g, "-").toLowerCase()}`}>{column.title}</h2>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>
        </div>

        {/* ── Marketplace geography ── */}
        <div className={s.markets}>
          <p className={s.marketsHeading}>
            <Globe size={14} aria-hidden="true" />
            Find Tutors Near You — Global Marketplace
          </p>
          <div className={s.marketsGrid}>
            {markets.map((market) => (
              <div key={market.country} className={s.marketCol}>
                <h3>
                  <span aria-hidden="true">{market.flag}</span>
                  {market.country}
                </h3>
                <ul>
                  {market.cities.map((city) => (
                    <li key={city.href}>
                      <Link href={city.href}>{city.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Subject offerings ── */}
        <div className={s.subjects}>
          <p className={s.subjectsHeading}>
            <BookMarked size={14} aria-hidden="true" />
            Browse Subjects — Find a Tutor for Any Topic
          </p>
          <div className={s.subjectsGrid}>
            {subjectColumns.map((col) => (
              <div key={col.heading} className={s.subjectCol}>
                <h3>{col.heading}</h3>
                <ul>
                  {col.subjects.map((sub) => (
                    <li key={`${col.heading}-${sub.href}-${sub.label}`}>
                      <Link href={sub.href}>{sub.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className={s.bottom}>
          <p>TUTORERA® — a student-first tutoring marketplace. Serving Pakistan, UAE, Saudi Arabia, UK &amp; USA.</p>
          <p>© 2026 TUTORERA®. All rights reserved.</p>
        </div>

      </div>
    </footer>
  );
}
