"use client";
import { useAuth } from "@/context/AuthContext";
import { usePathname,useRouter } from "next/navigation";
import { useEffect } from "react";

const PATH_PERMISSIONS: Record<string, string> = {
  "/admin/payments": "payment.read",
  "/admin/payouts": "payout.read",
  "/admin/reconciliation": "finance.reconcile",
  "/admin/fee-config": "finance.fee_configure",
  "/admin/safety-cases": "safety.read",
  "/admin/guarantee-claims": "claims.read",
  "/admin/roles": "roles.manage",
  "/admin/audit-logs": "audit.read",
  "/admin/system-health": "system.monitor",
  "/admin/users": "users.read",
  "/admin/markets": "market.read",
  "/admin/control-tower": "system.monitor",
};

const ROUTE_PREFIX_PERMISSIONS: Record<string, string> = {
  "/admin/bookings": "bookings.read",
  "/admin/bookings/": "bookings.read",
  "/admin/requests": "request.read",
  "/admin/supply-gaps": "analytics.read",
  "/admin/liquidity": "analytics.read",
  "/admin/students": "student.read",
  "/admin/tutors": "tutor.read",
  "/admin/applications": "tutor.read",
  "/admin/verifications": "tutor.verify",
  "/admin/matching": "matching.read",
  "/admin/analytics": "analytics.read",
  "/admin/contacts": "student.read",
  "/admin/broadcasts": "broadcast.send",
  "/admin/student-ratings": "student.read",
  "/admin/referrals": "growth.read",
};

function hasPermission(adminRole?: string, adminPermissions?: string[], required?: string): boolean {
  if (!required) return true;
  if (adminRole === "super_admin" || adminPermissions?.includes("*")) return true;
  if (adminPermissions?.includes(required)) return true;
  if (adminRole && adminRole !== "super_admin") {
    const rolePerms: Record<string, string[]> = {
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
    };
    const perms = rolePerms[adminRole] || [];
    if (perms.includes("*") || perms.includes(required)) return true;
  }
  return false;
}

function getRequiredPermission(pathname: string): string | undefined {
  if (PATH_PERMISSIONS[pathname]) {
    return PATH_PERMISSIONS[pathname];
  }
  for (const [prefix, permission] of Object.entries(ROUTE_PREFIX_PERMISSIONS)) {
    if (pathname.startsWith(prefix + "/") || pathname === prefix) {
      return permission;
    }
  }
  return undefined;
}

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "pending") {
      router.replace("/select-role");
      return;
    }

    if (user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    const requiredPermission = getRequiredPermission(pathname);
    if (requiredPermission && !hasPermission(user.adminRole, user.adminPermissions, requiredPermission)) {
      router.replace("/admin");
    }
  }, [user, loading, router, pathname]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #0329B2', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user || user.role !== "admin") return null;

  return <>{children}</>;
}
