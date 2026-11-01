"use client";
import { UI_COLORS, STATUS_COLORS } from "@/lib/brand";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BrandLogo from "@/components/BrandLogo";
import {
  LayoutDashboard, Bell, Settings, LogOut,
  ChevronLeft, ChevronRight, MessageSquare,
  CreditCard, User, Search, Menu, TrendingUp, BriefcaseBusiness, BookOpen,
  PlusCircle, FileText, Handshake, Calendar, Wallet, ShieldCheck, HelpCircle, Users,
} from "lucide-react";

const C = UI_COLORS;

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

// Spec §22 — student/parent sidebar, in order, real routes only.
const studentNav: NavItem[] = [
  { href: "/dashboard",             label: "Overview",          icon: <LayoutDashboard size={18} /> },
  { href: "/post-tuition-request",  label: "Post Requirement",  icon: <PlusCircle size={18} /> },
  { href: "/requests",              label: "My Requirements",   icon: <FileText size={18} /> },
  { href: "/offers",                label: "Tutor Offers",      icon: <Handshake size={18} /> },
  { href: "/book",                  label: "Bookings",          icon: <Calendar size={18} /> },
  { href: "/chat",                  label: "Messages",          icon: <MessageSquare size={18} /> },
  { href: "/transactions",          label: "Payments",          icon: <Wallet size={18} /> },
  { href: "/notifications",         label: "Notifications",     icon: <Bell size={18} /> },
  { href: "/safety",                label: "Safety",            icon: <ShieldCheck size={18} /> },
  { href: "/protection",            label: "Protection Center", icon: <ShieldCheck size={18} /> },
  { href: "/support",               label: "Support",           icon: <HelpCircle size={18} /> },
  { href: "/profile",               label: "Profile",           icon: <User size={18} /> },
  { href: "/student/guidebook",     label: "Student Guidebook", icon: <BookOpen size={18} /> },
  { href: "/settings",              label: "Settings",          icon: <Settings size={18} /> },
];

// Spec §23 — tutor sidebar, in order, real routes only.
const tutorNav: NavItem[] = [
  { href: "/dashboard",             label: "Overview",            icon: <LayoutDashboard size={18} /> },
  { href: "/opportunities",         label: "Tuition Opportunities", icon: <BriefcaseBusiness size={18} /> },
  { href: "/browse-requests",       label: "Browse Requests",     icon: <Search size={18} /> },
  { href: "/offers",                label: "My Offers",           icon: <Handshake size={18} /> },
  { href: "/book",                  label: "Bookings",            icon: <Calendar size={18} /> },
  { href: "/students",              label: "Students",            icon: <Users size={18} /> },
  { href: "/chat",                  label: "Messages",            icon: <MessageSquare size={18} /> },
  { href: "/earnings",              label: "Earnings",            icon: <TrendingUp size={18} /> },
  { href: "/notifications",         label: "Notifications",       icon: <Bell size={18} /> },
  { href: "/profile",               label: "Profile",             icon: <User size={18} /> },
  { href: "/support",               label: "Support",             icon: <HelpCircle size={18} /> },
  { href: "/tutor/guidebook",       label: "Tutor Guidebook",     icon: <BookOpen size={18} /> },
  { href: "/settings",              label: "Settings",            icon: <Settings size={18} /> },
];

// Fallback for pending / admin / parent — the pre-existing common items.
const fallbackNav: NavItem[] = [
  { href: "/dashboard",     label: "Dashboard",     icon: <LayoutDashboard size={18} /> },
  { href: "/notifications", label: "Notifications", icon: <Bell size={18} /> },
  { href: "/offers",        label: "Offers",        icon: <CreditCard size={18} /> },
  { href: "/chat",          label: "Messages",      icon: <MessageSquare size={18} /> },
  { href: "/profile",       label: "Profile",       icon: <User size={18} /> },
  { href: "/settings",      label: "Settings",      icon: <Settings size={18} /> },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':            'Overview',
  '/post-tuition-request': 'Post Requirement',
  '/requests':             'My Requirements',
  '/offers':               'Offers',
  '/book':                 'Bookings',
  '/transactions':         'Payments',
  '/earnings':             'Earnings',
  '/notifications':        'Notifications',
  '/safety':               'Safety',
  '/protection':           'Protection Center',
  '/support':              'Support',
  '/settings':             'Settings',
  '/opportunities':        'Tuition Opportunities',
  '/browse-requests':      'Browse Requests',
  '/students':             'Students',
  '/profile':              'Profile',
  '/student/guidebook':    'Student Guidebook',
  '/tutor/guidebook':      'Tutor Guidebook',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout }            = useAuth();
  const pathname                    = usePathname();
  const router                      = useRouter();

  const handleLogout = async () => { await logout(); router.replace("/"); };
  const sidebarNav: NavItem[] = user?.role === "tutor"
    ? tutorNav
    : user?.role === "student" || user?.role === "parent"
      ? studentNav
      : fallbackNav;

  const pageTitle = PAGE_TITLES[pathname]
    ?? (pathname.startsWith('/chat') ? 'Messages' : 'Dashboard');

  const SidebarContent = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      backgroundColor: C.sidebar, borderRight: `1px solid ${C.sidebarBorder}`,
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '1.25rem 0.75rem' : '1.25rem 1.25rem',
        borderBottom: `1px solid ${C.sidebarBorder}`,
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {!collapsed && (
          <BrandLogo variant="light" size="sm" showByline={false} />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: `1px solid ${C.border}`, cursor: 'pointer', color: C.gray500, borderRadius: '0.375rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '44px', minHeight: '44px' }}
          className="hidden-mobile">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${C.sidebarBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '0.875rem', overflow: 'hidden', flexShrink: 0 }}>
              {user?.avatar ? <img src={user.avatar} alt="User Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: '700', color: '#fff', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{user?.name}</p>
              <p style={{ color: C.accent, fontSize: '0.7rem', fontWeight: '600', textTransform: 'capitalize', margin: 0 }}>{user?.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav — single ordered list per role, per spec §22 / §23. */}
      <nav style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
        {sidebarNav.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: collapsed ? '0.625rem' : '0.625rem 0.875rem',
                borderRadius: '0.5rem', textDecoration: 'none',
                justifyContent: collapsed ? 'center' : 'flex-start',
                backgroundColor: isActive ? C.accentLight : 'transparent',
                color: isActive ? C.accent : C.gray500,
                fontWeight: isActive ? '600' : '400',
                fontSize: '0.875rem', transition: 'background-color 160ms ease, color 160ms ease, transform 160ms var(--ease-out)',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = C.gray50; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}>
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div style={{ padding: '0.75rem', borderTop: `1px solid ${C.sidebarBorder}` }}>
        <button onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: collapsed ? '0.625rem' : '0.625rem 0.875rem',
            borderRadius: '0.5rem', border: 'none', background: 'none',
            cursor: 'pointer', color: STATUS_COLORS.danger.color, width: '100%',
            justifyContent: collapsed ? 'center' : 'flex-start',
            fontSize: '0.875rem', fontWeight: '500',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = STATUS_COLORS.danger.bg)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
          <LogOut size={18} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: C.gray50 }}>

      {/* Desktop Sidebar */}
      <div style={{
        width: collapsed ? '60px' : '240px',
        flexShrink: 0, transition: 'width 0.25s ease',
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 30,
      }} className="hidden-mobile">
        <SidebarContent />
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div id="mobile-nav" style={{ width: '240px', height: '100vh' }}><SidebarContent /></div>
          <div
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
            role="button"
            tabIndex={0}
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setMobileOpen(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <div style={{
        flex: 1,
        marginLeft: collapsed ? '60px' : '240px',
        transition: 'margin-left 0.25s ease',
        display: 'flex', flexDirection: 'column',
        minHeight: '100vh', minWidth: 0, maxWidth: '100%', overflowX: 'hidden',
      }} className="dashboard-main">

        {/* Top Bar */}
        <div style={{
          backgroundColor: 'white', borderBottom: `1px solid ${C.sidebarBorder}`,
          padding: '0.875rem 1.5rem', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.primary, display: 'none', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              className="show-mobile">
              <Menu size={22} aria-hidden="true" />
            </button>
            <div>
              <p style={{ fontWeight: '700', color: C.primary, fontSize: '1rem', margin: 0 }}>{pageTitle}</p>
              <p style={{ color: C.gray500, fontSize: '0.75rem', margin: 0 }}>TUTORERA® learning workspace</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/notifications" style={{ position: 'relative', color: C.gray500, display: 'flex' }}>
              <Bell size={20} />
            </Link>
            <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.25rem 0.75rem', border: `1px solid ${C.border}`, borderRadius: '2rem', backgroundColor: 'white' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: '700', overflow: 'hidden' }}>
                {user?.avatar ? <img src={user.avatar} alt="User Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.name?.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: C.primary }}>{user?.name?.split(' ')[0]}</span>
            </Link>
          </div>
        </div>

        {/* Page Content */}
        <div className="dashboard-content" style={{ flex: 1, padding: '1.5rem', width: '100%', boxSizing: 'border-box', overflowX: 'hidden', minWidth: 0 }}>
          {children}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
          .dashboard-main { margin-left: 0 !important; width: 100% !important; max-width: 100vw !important; overflow-x: hidden !important; }
          .dashboard-content { padding: 1rem 1rem calc(var(--mobile-bottom-nav-height, 64px) + 2rem + env(safe-area-inset-bottom, 0px)) !important; }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
