"use client";
import AdminGuard from "@/components/AdminGuard";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import {
  Activity,
  ActivitySquare,
  AlertTriangle,
  Banknote,BarChart2,
  BookOpen,
  Calculator,
  CheckCircle,
  ClipboardList,
  CreditCard,
  FileText,
  Gift,
  Globe,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Radio,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Star,
  TrendingDown,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname,useRouter } from "next/navigation";
import { useEffect,useRef,useState } from "react";
import MuiAdminProvider from "./MuiAdminProvider";

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  marketplace_operations: ["request.read","request.extend","request.rematch","request.close","request.escalate","matching.read","matching.configure","matching.simulate","bookings.read","bookings.manage","market.read","market.configure","analytics.read","system.monitor"],
  student_success: ["student.read","request.read","request.extend","request.rematch","request.close","request.escalate","bookings.read","claims.read","analytics.read"],
  tutor_operations: ["tutor.read","tutor.quality_manage","tutor.verify","tutor.reject","tutor.suspend","bookings.read","analytics.read"],
  verification_officer: ["tutor.read","tutor.verify","tutor.reject","audit.read"],
  trust_and_safety: ["safety.read","safety.create","safety.update","safety.resolve","claims.read","claims.manage","users.read","tutor.suspend","audit.read"],
  finance: ["payment.read","payment.manage","payment.refund","payout.read","payout.approve","payout.process","finance.reconcile","finance.fee_configure","bookings.read","analytics.read"],
  support: ["student.read","tutor.read","request.read","bookings.read","claims.read","safety.create","payment.read"],
  growth: ["growth.read","growth.manage","broadcast.send","analytics.read","users.read"],
  content: ["growth.read","analytics.read"],
  analyst: ["analytics.read","request.read","tutor.read","student.read","bookings.read","payment.read","matching.read","growth.read","market.read","audit.read","system.monitor"],
  country_admin: ["market.read","market.configure","analytics.read","tutor.read","student.read","request.read","bookings.read","payment.read","payout.read","finance.fee_configure","audit.read"],
};

function hasPermission(adminRole?: string, adminPermissions?: string[], required?: string): boolean {
  if (!required) return true;
  if (adminRole === "super_admin" || adminPermissions?.includes("*")) return true;
  if (adminPermissions?.includes(required)) return true;
  const perms = ROLE_PERMISSIONS[adminRole || ""] || [];
  if (perms.includes("*") || perms.includes(required)) return true;
  return false;
}

interface NavSection {
  title: string;
  items: { href: string; label: string; icon: React.ReactNode; badge?: string; permission?: string }[];
}

const navSections: NavSection[] = [
  {
    title: "Control Tower",
    items: [
      { href: "/admin", label: "Control Tower", icon: <LayoutDashboard size={17} />, permission: "system.monitor" },
      { href: "/admin/marketplace", label: "Marketplace Feed", icon: <ClipboardList size={17} />, permission: "request.read" },
    ],
  },
  {
    title: "Students",
    items: [
      { href: "/admin/students", label: "Students", icon: <Users size={17} />, permission: "student.read" },
      { href: "/admin/at-risk-requests", label: "At-Risk Requests", icon: <AlertTriangle size={17} />, badge: "Action", permission: "request.extend" },
      { href: "/admin/student-ratings", label: "Student Ratings", icon: <Star size={17} />, permission: "student.read" },
    ],
  },
  {
    title: "Tutors",
    items: [
      { href: "/admin/tutors", label: "Tutors Directory", icon: <BookOpen size={17} />, permission: "tutor.read" },
      { href: "/admin/applications", label: "Applications", icon: <ClipboardList size={17} />, permission: "tutor.read" },
      { href: "/admin/verifications", label: "Verifications", icon: <ShieldCheck size={17} />, permission: "tutor.verify" },
      { href: "/admin/supply-gaps", label: "Supply Gaps", icon: <TrendingDown size={17} />, permission: "analytics.read" },
      { href: "/admin/liquidity", label: "Liquidity Scores", icon: <ActivitySquare size={17} />, permission: "analytics.read" },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { href: "/admin/matching", label: "Smart Matching", icon: <Sparkles size={17} />, permission: "matching.read" },
      { href: "/admin/bookings", label: "Bookings", icon: <CheckCircle size={17} />, permission: "bookings.read" },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/admin/payments", label: "Payments", icon: <CreditCard size={17} />, permission: "payment.read" },
      { href: "/admin/payouts", label: "Payouts", icon: <Banknote size={17} />, permission: "payout.read" },
      { href: "/admin/reconciliation", label: "Reconciliation", icon: <Calculator size={17} />, permission: "finance.reconcile" },
      { href: "/admin/fee-config", label: "Fee Config", icon: <Sliders size={17} />, permission: "finance.fee_configure" },
    ],
  },
  {
    title: "Trust & Safety",
    items: [
      { href: "/admin/safety-cases", label: "Safety Cases", icon: <ShieldAlert size={17} />, badge: "Cases", permission: "safety.read" },
      { href: "/admin/guarantee-claims", label: "Guarantee Claims", icon: <Shield size={17} />, permission: "claims.read" },
    ],
  },
  {
    title: "Growth",
    items: [
      { href: "/admin/referrals", label: "Referrals", icon: <Gift size={17} />, permission: "growth.read" },
      { href: "/admin/analytics", label: "Analytics", icon: <BarChart2 size={17} />, permission: "analytics.read" },
    ],
  },
  {
    title: "Global Operations",
    items: [
      { href: "/admin/markets", label: "Market Rules", icon: <Globe size={17} />, permission: "market.read" },
      { href: "/admin/geography", label: "Geography", icon: <MapPin size={17} />, permission: "market.read" },
      { href: "/admin/global-analytics", label: "Global Analytics", icon: <BarChart2 size={17} />, permission: "analytics.read" },
      { href: "/admin/tax-config", label: "Tax Configuration", icon: <Calculator size={17} />, permission: "finance.fee_configure" },
      { href: "/admin/exchange-rates", label: "Exchange Rates", icon: <Activity size={17} />, permission: "market.read" },
    ],
  },
  {
    title: "Communications",
    items: [
      { href: "/admin/broadcasts", label: "Broadcasts", icon: <Radio size={17} />, permission: "broadcast.send" },
      { href: "/admin/email-logs", label: "Email Logs", icon: <Mail size={17} />, permission: "growth.read" },
      { href: "/admin/contacts", label: "Inquiries", icon: <MessageSquare size={17} />, permission: "student.read" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/users", label: "Users & Accounts", icon: <Users size={17} />, permission: "users.read" },
      { href: "/admin/roles", label: "Admin Roles (RBAC)", icon: <KeyRound size={17} />, permission: "roles.manage" },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: <FileText size={17} />, permission: "audit.read" },
      { href: "/admin/system-health", label: "System Health", icon: <Activity size={17} />, permission: "system.monitor" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) || []);
    focusable()[0]?.focus();

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
        menuButtonRef.current?.focus();
      }
      if (e.key === "Tab") {
        const items = focusable();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "260px" }}>
      {/* Brand Header */}
      <div style={{ padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
        <BrandLogo variant="light" size="sm" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
          <span style={{ color: "#93c5fd", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Control Tower
          </span>
          <span style={{ fontSize: "0.68rem", background: "rgba(59, 130, 246, 0.2)", color: "#bfdbfe", padding: "0.15rem 0.45rem", borderRadius: "999px", border: "1px solid rgba(59,130,246,0.3)" }}>
            v2.6 RBAC
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav style={{ flex: 1, padding: "0.75rem 0.6rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {navSections.map((sec) => {
          const visibleItems = sec.items.filter((item) => hasPermission((user as any)?.adminRole, (user as any)?.adminPermissions, item.permission));
          if (visibleItems.length === 0) return null;
          return (
            <div key={sec.title}>
              <p style={{ fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", margin: "0 0 0.35rem 0.6rem" }}>
                {sec.title}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={isActive ? "bg-blue-800/55" : "hover:bg-white/[0.06]"}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "0.5rem",
                        textDecoration: "none",
                        fontSize: "0.82rem",
                        fontWeight: isActive ? 700 : 600,
                        color: isActive ? "#ffffff" : "#cbd5e1",
                        border: isActive ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
                        transition: "background-color 150ms ease, border-color 150ms ease, color 150ms ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span style={{ color: isActive ? "#60a5fa" : "#94a3b8" }}>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            padding: "0.1rem 0.4rem",
                            borderRadius: "999px",
                            backgroundColor: item.badge === "Action" ? "#ef4444" : "#f59e0b",
                            color: "white",
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Footer & Logout */}
      <div style={{ padding: "0.85rem 1rem", borderTop: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "0.5rem" }}>
          <div style={{ color: "white", fontSize: "0.8rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>
            {user?.name || "Admin"}
          </div>
          <div style={{ color: "#94a3b8", fontSize: "0.7rem", textTransform: "capitalize" }}>
            {(user as any)?.adminRole?.replace(/_/g, " ") || "Super Admin"}
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.replace("/");
          }}
          title="Sign out of Admin Panel"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "44px",
            height: "44px",
            borderRadius: "0.4rem",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.05)",
            color: "#f87171",
            cursor: "pointer",
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <AdminGuard>
      {/* WCAG 2.1 SC 2.4.1 Skip Links */}
      <a href="#main-content" className="skip-link" style={{ position: "absolute", top: "-100%", left: "1rem", background: "#021550", color: "white", padding: "0.75rem 1.25rem", borderRadius: "0 0 0.5rem 0.5rem", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none", zIndex: 99999, transition: "top 0.15s" }} onFocus={(e) => { (e.currentTarget as HTMLElement).style.top = "0"; }} onBlur={(e) => { (e.currentTarget as HTMLElement).style.top = "-100%"; }}>Skip to main content</a>
      <style>{`.skip-link:focus { outline: 3px solid #fbbf24; outline-offset: 2px; }`}</style>
      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
        {/* Desktop Sidebar */}
        <aside
          style={{
            width: "260px",
            backgroundColor: "#0a1128",
            display: "none",
            flexDirection: "column",
            position: "sticky",
            top: 0,
            height: "100vh",
            zIndex: 40,
            borderRight: "1px solid #1e293b",
          }}
          className="admin-desktop-sidebar"
        >
          <SidebarContent />
        </aside>

        {/* Mobile Header Bar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
          }}
        >
          <header
            style={{
              height: "56px",
              backgroundColor: "#0a1128",
              borderBottom: "1px solid #1e293b",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 1rem",
            }}
            className="admin-mobile-header"
          >
            <BrandLogo variant="light" size="sm" />
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                width: "44px",
                height: "44px",
                padding: "0.5rem",
              }}
              aria-label="Toggle navigation menu"
              aria-expanded={sidebarOpen}
              aria-controls="admin-mobile-navigation"
            >
              <Menu size={22} />
            </button>
          </header>

          {/* Mobile Drawer */}
          {sidebarOpen && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.65)",
                zIndex: 50,
                display: "flex",
              }}
              onClick={() => {
                setSidebarOpen(false);
                menuButtonRef.current?.focus();
              }}
            >
              <div
                ref={drawerRef}
                id="admin-mobile-navigation"
                role="dialog"
                aria-modal="true"
                aria-label="Admin navigation"
                style={{
                  width: "280px",
                  backgroundColor: "#0a1128",
                  height: "100%",
                  position: "relative",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSidebarOpen(false);
                    menuButtonRef.current?.focus();
                  }}
                  aria-label="Close admin navigation"
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "0.75rem",
                    zIndex: 2,
                    display: "grid",
                    width: "44px",
                    height: "44px",
                    placeItems: "center",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "0.65rem",
                    background: "rgba(255,255,255,0.08)",
                    color: "white",
                  }}
                >
                  <X size={20} aria-hidden="true" />
                </button>
                <SidebarContent />
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <main id="main-content" style={{ flex: 1, minWidth: 0 }}><MuiAdminProvider>{children}</MuiAdminProvider></main>
        </div>
      </div>

      <style jsx global>{`
        @media (min-width: 900px) {
          .admin-desktop-sidebar {
            display: flex !important;
          }
          .admin-mobile-header {
            display: none !important;
          }
        }
      `}</style>
    </AdminGuard>
  );
}
