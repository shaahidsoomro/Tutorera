"use client";

import Image from "next/image";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import {
  Bell,
  Briefcase,
  BriefcaseBusiness,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PlusCircle,
  ShieldCheck,
  User,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect,useRef,useState } from "react";
import s from "./Navbar.module.css";

type MegaKey = "students" | "tutors" | "resources" | null;

const megaMenus = [
  {
    key: "students" as MegaKey,
    label: "For Students",
    eyebrow: "Global Student-Led Marketplace",
    title: "Post your need, receive offers worldwide or locally, compare & choose.",
    icon: GraduationCap,
    featured: { label: "Post a Tuition Request", href: "/post-tuition-request", desc: "Set subject, schedule, mode, and your proposed budget in any currency." },
    groups: [
      { title: "Learning Modes", links: [
        { label: "Home Tuition Requests", href: "/post-home-tuition-request", desc: "Verified tutors near your neighborhood." },
        { label: "Online Tuition Requests", href: "/post-online-tuition-request", desc: "1-on-1 live sessions with top global tutors." },
        { label: "Browse Tutors Directory", href: "/tutors", desc: "Search across verified profiles worldwide." },
        { label: "Tutors by Location", href: "/locations", desc: "Dubai, London, Lahore, New York & more." },
      ] },
      { title: "Transparency & Trust", links: [
        { label: "How Tutor Offers Work", href: "/how-tutor-offers-work", desc: "Understanding offers, counters & locking." },
        { label: "First-Session Guarantee", href: "/first-session-guarantee", desc: "Session quality protection policy." },
        { label: "Parent Safety Guide", href: "/help/for-parents", desc: "Safety & verification checks." },
        { label: "Pricing & Fee Clarity", href: "/pricing", desc: "0% student marketplace fee." },
      ] },
    ],
  },
  {
    key: "tutors" as MegaKey,
    label: "For Tutors",
    eyebrow: "Global Teaching Opportunities",
    title: "Discover real student demand and send offers across borders or locally.",
    icon: BriefcaseBusiness,
    featured: { label: "Browse Open Requests", href: "/browse-requests", desc: "Review student budgets and send counter-offers." },
    groups: [
      { title: "Tutor Marketplace", links: [
        { label: "Browse Student Requests", href: "/browse-requests", desc: "View real-time tutoring requirements worldwide." },
        { label: "Become a Verified Tutor", href: "/become-a-tutor", desc: "Join TUTORERA's global network." },
        { label: "Tutor Earnings Flow", href: "/earnings", desc: "Multi-currency payouts & net earnings." },
        { label: "Verification Standards", href: "/tutor-verification-standards", desc: "Identity & credential screening." },
      ] },
      { title: "Teaching Standards", links: [
        { label: "Screening Policy", href: "/tutor-screening-policy", desc: "How tutor profiles are approved." },
        { label: "Academic Standards", href: "/academic-standards", desc: "Professional conduct guidelines." },
        { label: "Safety Policy", href: "/safety-policy", desc: "In-person & online safety rules." },
      ] },
    ],
  },
  {
    key: "resources" as MegaKey,
    label: "How It Works",
    eyebrow: "Guides & Policies",
    title: "Everything you need to know about TUTORERA.",
    icon: ShieldCheck,
    featured: { label: "How TUTORERA Works", href: "/how-it-works", desc: "The global student-led demand marketplace loop." },
    groups: [
      { title: "Guides & Research", links: [
        { label: "Global Tutoring Index", href: "/research/tutoring-index", desc: "Country-specific tutoring market benchmarks." },
        { label: "Student Journey", href: "/student-journey", desc: "From posting need to completed session." },
        { label: "Payment Process", href: "/payment-process", desc: "Secure multi-currency checkout & guarantees." },
        { label: "Help Center", href: "/help", desc: "FAQs & support documentation." },
      ] },
      { title: "Company & Trust", links: [
        { label: "About TUTORERA", href: "/about", desc: "Mission & global team." },
        { label: "Safety & Privacy Policy", href: "/safety-policy", desc: "Address & identity protections." },
        { label: "Contact Support", href: "/contact", desc: "Direct 24/7 team assistance." },
      ] },
    ],
  },
];

function notificationIcon(type: string) {
  if (type === "verification") return "🛡️";
  if (type === "bid") return "📬";
  if (type === "booking") return "📅";
  if (type === "payment") return "💰";
  return "🔔";
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<MegaKey>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const { user, logout } = useAuth();
  const router = useRouter();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setActiveMega(null);
        setShowNotifications(false);
        setShowAccountMenu(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveMega(null);
        setShowNotifications(false);
        setShowAccountMenu(false);
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const closeMenus = () => {
    setActiveMega(null);
    setShowNotifications(false);
    setShowAccountMenu(false);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    closeMenus();
    router.replace("/");
  };

  const dashboardHref = user?.role === "admin"
    ? "/admin"
    : user?.role === "pending"
      ? "/select-role"
      : "/dashboard";
  const profileHref = user?.role === "pending" ? "/select-role" : "/profile";

  return (
    <header ref={navRef} className={s.header}>
      <nav id="main-nav" className={s.nav} aria-label="Main navigation">
        <BrandLogo className={s.logo} imageClassName={s.logoImage} priority />

        {/* Desktop Main Links */}
        <div className={s.desktopNav}>
          <Link href="/tutors" className={s.navLink} onClick={closeMenus}>
            Find Tutors
          </Link>

          {megaMenus.map((menu) => {
            const Icon = menu.icon;
            const open = activeMega === menu.key;
            return (
              <div key={menu.key} className={s.megaWrap}>
                <button
                  type="button"
                  className={s.navButton}
                  aria-expanded={open}
                  aria-controls={`${menu.key}-mega-menu`}
                  onClick={() => { setActiveMega(open ? null : menu.key); setShowNotifications(false); }}
                >
                  {menu.label}
                  <ChevronDown size={15} aria-hidden="true" />
                </button>
                {open && (
                  <div id={`${menu.key}-mega-menu`} className={s.megaPanel}>
                    <div className={s.megaFeature}>
                      <Icon size={28} aria-hidden="true" />
                      <p>{menu.eyebrow}</p>
                      <h2>{menu.title}</h2>
                      <Link href={menu.featured.href} onClick={closeMenus}>
                        <strong>{menu.featured.label}</strong>
                        <span>{menu.featured.desc}</span>
                      </Link>
                    </div>
                    <div className={s.megaColumns}>
                      {menu.groups.map((group) => (
                        <section key={group.title} aria-labelledby={`${menu.key}-${group.title.replace(/\s+/g, "-")}`}>
                          <h3 id={`${menu.key}-${group.title.replace(/\s+/g, "-")}`}>{group.title}</h3>
                          {group.links.map((link) => (
                            <Link key={link.href} href={link.href} onClick={closeMenus} className={s.megaLink}>
                              <strong>{link.label}</strong>
                              <span>{link.desc}</span>
                            </Link>
                          ))}
                        </section>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <Link href="/pricing" className={s.navLink} onClick={closeMenus}>
            Pricing
          </Link>
          <Link href="/support" className={s.navLink} onClick={closeMenus}>
            Support
          </Link>
        </div>

        {/* Actions / CTA Header Button */}
        <div className={s.desktopActions}>
          {/* Marketplace Hero CTA in Navbar */}
          {user?.role === "tutor" ? (
            <Link
              href="/browse-requests"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "#0329b2",
                color: "white",
                padding: "0.6rem 1.15rem",
                borderRadius: "0.5rem",
                fontWeight: 700,
                fontSize: "0.85rem",
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(3, 41, 178, 0.25)"
              }}
            >
              <Briefcase size={16} />
              <span>Matching Requests</span>
            </Link>
          ) : (
            <Link
              href="/post-tuition-request"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "#0329b2",
                color: "white",
                padding: "0.6rem 1.15rem",
                borderRadius: "0.5rem",
                fontWeight: 800,
                fontSize: "0.85rem",
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(3, 41, 178, 0.25)"
              }}
            >
              <PlusCircle size={16} />
              <span>{user ? "+ Post Request" : "Post Tuition Request"}</span>
            </Link>
          )}

          {user ? (
            <>
              <div className={s.notifications}>
                <button
                  type="button"
                  className={s.iconButton}
                  aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                  aria-expanded={showNotifications}
                  onClick={() => { setShowNotifications(!showNotifications); setActiveMega(null); setShowAccountMenu(false); }}
                >
                  <Bell size={20} aria-hidden="true" />
                  {unreadCount > 0 && <span className={s.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>}
                </button>
                {showNotifications && (
                  <div className={s.notificationPanel} role="dialog" aria-label="Notifications">
                    <div className={s.notificationHead}>
                      <strong>Notifications</strong>
                      {unreadCount > 0 && <button type="button" onClick={markAllAsRead}>Mark all read</button>}
                    </div>
                    <div className={s.notificationList}>
                      {notifications.length === 0 ? (
                        <p className={s.emptyState}>No notifications yet</p>
                      ) : notifications.slice(0, 8).map((notif) => (
                        <button
                          key={notif._id}
                          type="button"
                          className={notif.isRead ? s.notificationItem : `${s.notificationItem} ${s.unread}`}
                          onClick={() => { markAsRead(notif._id); closeMenus(); if (notif.link) router.push(notif.link); }}
                        >
                          <span aria-hidden="true">{notificationIcon(notif.type)}</span>
                          <span><strong>{notif.title}</strong><em>{notif.message}</em></span>
                        </button>
                      ))}
                    </div>
                    <Link href="/notifications" onClick={closeMenus} className={s.panelFooterLink}>
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>

              <div className={s.accountMenu}>
                <button
                  type="button"
                  className={s.accountButton}
                  aria-label="Account menu"
                  aria-expanded={showAccountMenu}
                  aria-controls="account-menu"
                  onClick={() => { setShowAccountMenu((open) => !open); setActiveMega(null); setShowNotifications(false); }}
                >
                  <span className={s.avatar}>
                    {user.avatar ? <Image src={user.avatar} alt="" width={32} height={32}  unoptimized/> : user.name.charAt(0).toUpperCase()}
                  </span>
                  <span>{user.name.split(" ")[0]}</span>
                </button>
                {showAccountMenu && (
                  <div id="account-menu" className={s.accountLinks}>
                    <Link href={dashboardHref} onClick={closeMenus}><LayoutDashboard size={16} /> Dashboard</Link>
                    <Link href={profileHref} onClick={closeMenus}><User size={16} /> {user.role === "pending" ? "Select role" : "Profile"}</Link>
                    {user.role !== "admin" && user.role !== "pending" && <Link href="/chat" onClick={closeMenus}><MessageSquare size={16} /> Messages</Link>}
                    <button type="button" onClick={handleLogout}><LogOut size={16} /> Logout</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className={s.loginLink}>Log in</Link>
              <Link href="/register" className={s.signupLink}>Sign up</Link>
            </>
          )}
        </div>

        <button
          type="button"
          className={s.mobileToggle}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      </nav>

      {isOpen && (
        <div className={s.mobilePanel}>
          <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f1f5f9" }}>
            <Link
              href="/post-tuition-request"
              onClick={closeMenus}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                background: "#0329b2",
                color: "white",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                fontWeight: 800,
                fontSize: "0.95rem",
                textDecoration: "none"
              }}
            >
              <PlusCircle size={18} /> Post Tuition Request
            </Link>
          </div>

          <Link href="/tutors" onClick={closeMenus} style={{ padding: "0.75rem 1rem", fontWeight: 700, display: "block" }}>
            Browse Verified Tutors
          </Link>

          {megaMenus.map((menu) => (
            <details key={menu.key} className={s.mobileGroup}>
              <summary>{menu.label}</summary>
              <Link href={menu.featured.href} onClick={closeMenus}>{menu.featured.label}</Link>
              {menu.groups.flatMap((group) => group.links).map((link) => (
                <Link key={link.href} href={link.href} onClick={closeMenus}>{link.label}</Link>
              ))}
            </details>
          ))}

          <div className={s.mobileActions}>
            {user ? (
              <>
                <Link href={dashboardHref} onClick={closeMenus}>Dashboard</Link>
                <Link href="/notifications" onClick={closeMenus}>Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}</Link>
                <button type="button" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={closeMenus}>Log in</Link>
                <Link href="/register" onClick={closeMenus}>Sign up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
