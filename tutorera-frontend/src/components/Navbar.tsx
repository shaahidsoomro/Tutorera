"use client";

import Image from "next/image";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import {
  Bell,
  ChevronDown,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PlusCircle,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import s from "./Navbar.module.css";

const megaMenus = {
  tuition: {
    label: "Find Tuition",
    featured: { title: "Post Your Requirement", desc: "Tell us what you need — tutors come to you with offers.", href: "/post-tuition-request", cta: "Post for free" },
    columns: [
      { heading: "By Format", links: [{ label: "Home Tuition", href: "/pk/home-tuition" }, { label: "Online Tuition", href: "/pk/online-tuition" }] },
      { heading: "By Level", links: [{ label: "O Level & IGCSE", href: "/subjects?level=o-level" }, { label: "A Level", href: "/subjects?level=a-level" }, { label: "MDCAT Prep", href: "/subjects?level=mdcat" }, { label: "Primary & Middle", href: "/subjects?level=primary" }] },
      { heading: "Popular Cities", links: [{ label: "Karachi", href: "/tutors?city=karachi" }, { label: "Lahore", href: "/tutors?city=lahore" }, { label: "Islamabad", href: "/tutors?city=islamabad" }, { label: "Rawalpindi", href: "/tutors?city=rawalpindi" }] },
    ],
  },
  tutors: {
    label: "Find Tutors",
    featured: { title: "Verified Tutors Only", desc: "Every tutor on TUTORERA® passes identity & qualification checks.", href: "/verification-policy", cta: "Learn how" },
    columns: [
      { heading: "By Subject", links: [{ label: "Mathematics", href: "/tutors?subject=mathematics" }, { label: "Physics", href: "/tutors?subject=physics" }, { label: "Chemistry", href: "/tutors?subject=chemistry" }, { label: "English", href: "/tutors?subject=english" }, { label: "Biology", href: "/tutors?subject=biology" }] },
      { heading: "Resources", links: [{ label: "All Subjects", href: "/subjects" }, { label: "How It Works", href: "/how-it-works" }, { label: "Safety", href: "/safety" }, { label: "Pricing", href: "/pricing" }, { label: "Research", href: "/research" }] },
    ],
  },
};

function notificationIcon(type: string) {
  if (type === "verification") return "🛡️";
  if (type === "bid") return "📬";
  if (type === "booking") return "📅";
  if (type === "payment") return "💰";
  return "🔔";
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [megaOpen, setMegaOpen] = useState<string | null>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const { user, logout } = useAuth();
  const router = useRouter();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setShowNotifications(false);
        setShowAccountMenu(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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
    setShowNotifications(false);
    setShowAccountMenu(false);
    setIsOpen(false);
    setMegaOpen(null);
  };

  const handleLogout = async () => {
    await logout();
    closeMenus();
    router.replace("/");
  };

  const handleMegaMenuKeyDown = (e: React.KeyboardEvent, key: string) => {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      setMegaOpen(key);
      setTimeout(() => {
        document.querySelector(`.${s.megaPanel} a`)?.focus();
      }, 0);
    } else if (e.key === "Escape") {
      setMegaOpen(null);
      (e.target as HTMLElement).focus();
    }
  };

  const dashboardHref = user?.role === "admin"
    ? "/admin"
    : user?.role === "pending"
      ? "/select-role"
      : "/dashboard";
  const profileHref = user?.role === "pending" ? "/select-role" : "/profile";

  // Role-aware "For Tutors" slot on the top nav (§5): tutors see their
  // opportunities feed; everyone else sees the tutor acquisition page.
  const forTutorsHref = user?.role === "tutor" ? "/opportunities" : "/become-a-tutor";
  const forTutorsLabel = user?.role === "tutor" ? "Tuition Opportunities" : "For Tutors";

  return (
    <header ref={navRef} className={s.header}>
      <nav id="main-nav" className={s.nav} aria-label="Main navigation">
        <BrandLogo className={s.logo} imageClassName={s.logoImage} priority />

        {/* Desktop main links with mega menus */}
        <div className={s.desktopNav}>
          {(Object.entries(megaMenus) as [string, typeof megaMenus.tuition][]).map(([key, menu]) => (
            <div
              key={key}
              className={s.megaWrap}
              onMouseEnter={() => setMegaOpen(key)}
              onMouseLeave={() => setMegaOpen(null)}
            >
              <button
                type="button"
                className={s.navButton}
                aria-expanded={megaOpen === key}
                aria-haspopup="true"
                onKeyDown={(e) => handleMegaMenuKeyDown(e, key)}
                onClick={() => setMegaOpen(megaOpen === key ? null : key)}
              >
                {menu.label} <ChevronDown size={13} />
              </button>
              {megaOpen === key && (
                <div className={s.megaPanel} role="dialog" aria-label={`${menu.label} menu`}>
                  <div className={s.megaFeature}>
                    <p style={{ fontWeight: 900, fontSize: "0.95rem", margin: "0 0 0.3rem", color: "white" }}>{menu.featured.title}</p>
                    <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.75)", margin: "0 0 0.75rem" }}>{menu.featured.desc}</p>
                    <Link href={menu.featured.href} onClick={closeMenus} style={{ display: "inline-block", padding: "0.4rem 1rem", background: "rgba(255,255,255,0.15)", borderRadius: "0.375rem", color: "white", fontWeight: 700, fontSize: "0.82rem", textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)" }}>
                      {menu.featured.cta} →
                    </Link>
                  </div>
                  <div className={s.megaColumns}>
                    {menu.columns.map((col) => (
                      <div key={col.heading}>
                        <p style={{ fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", margin: "0 0 0.5rem", padding: "0 0.75rem" }}>{col.heading}</p>
                        {col.links.map((link) => (
                          <Link key={link.href} href={link.href} className={s.megaLink} onClick={closeMenus}>{link.label}</Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          <Link href="/refer-and-earn" className={s.navLink} onClick={closeMenus} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "#0329b2", fontWeight: 800 }}>
            <Gift size={14} /> Refer &amp; Earn
          </Link>
          <Link href="/how-it-works" className={s.navLink} onClick={closeMenus}>How It Works</Link>
          <Link href="/safety" className={s.navLink} onClick={closeMenus}>Safety</Link>
          <Link href={forTutorsHref} className={s.navLink} onClick={closeMenus}>
            {forTutorsLabel}
          </Link>
        </div>

        {/* Actions / CTA */}
        <div className={s.desktopActions}>
          <Link
            href="/post-tuition-request"
            className={s.primaryCta}
          >
            <PlusCircle size={16} />
            <span>Post Requirement</span>
          </Link>

          {user ? (
            <>
              <div className={s.notifications}>
                <button
                  type="button"
                  className={s.iconButton}
                  aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                  aria-expanded={showNotifications}
                  onClick={() => { setShowNotifications(!showNotifications); setShowAccountMenu(false); }}
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
                  onClick={() => { setShowAccountMenu((open) => !open); setShowNotifications(false); }}
                >
                  <span className={s.avatar}>
                    {user.avatar ? <Image src={user.avatar} alt="" width={32} height={32} unoptimized /> : user.name.charAt(0).toUpperCase()}
                  </span>
                  <span>{user.name.split(" ")[0]}</span>
                </button>
                {showAccountMenu && (
                  <div id="account-menu" className={s.accountLinks}>
                    <Link href={dashboardHref} onClick={closeMenus}>
                      <LayoutDashboard size={16} /> {user.role === "student" || user.role === "parent" ? "My Learning" : "Dashboard"}
                    </Link>
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
          {/* Mobile top action — Post Requirement is priority §6 */}
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
                padding: "0.85rem",
                borderRadius: "0.5rem",
                fontWeight: 800,
                fontSize: "0.95rem",
                textDecoration: "none",
                minHeight: 48,
              }}
            >
              <PlusCircle size={18} /> Post Requirement
            </Link>
          </div>

          {/* Spec §6 mobile order — wrapped in .mobileGroup so its
              already-defined `a` selector styles rows uniformly. */}
          <div className={s.mobileGroup}>
            <Link href="/tutors" onClick={closeMenus}>Find Tutors</Link>
            <Link href="/pk/home-tuition" onClick={closeMenus}>Home Tuition</Link>
            <Link href="/pk/online-tuition" onClick={closeMenus}>Online Tuition</Link>
            <Link href="/subjects" onClick={closeMenus}>Subjects</Link>
            <Link href="/how-it-works" onClick={closeMenus}>How It Works</Link>
            <Link href="/safety" onClick={closeMenus}>Safety</Link>
            <Link href={forTutorsHref} onClick={closeMenus}>{forTutorsLabel}</Link>
            <Link href="/refer-and-earn" onClick={closeMenus} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#0329b2", fontWeight: 800 }}>
              <Gift size={16} /> Refer &amp; Earn
            </Link>
          </div>

          <div className={s.mobileActions}>
            {user ? (
              <>
                <Link href={dashboardHref} onClick={closeMenus}>
                  {user.role === "student" || user.role === "parent" ? "My Learning" : "Dashboard"}
                </Link>
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
