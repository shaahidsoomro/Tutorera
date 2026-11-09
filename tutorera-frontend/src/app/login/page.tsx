"use client";

import { UI_COLORS } from "@/lib/brand";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Info } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import GoogleButton from "@/components/GoogleButton";
import BrandLogo from "@/components/BrandLogo";

const C = UI_COLORS;

function getSafeRedirect(target: string | null): string | null {
  if (!target) return null;
  // Must start with single slash, prevent protocol-relative (//) and backslash traversal (/\)
  if (target.startsWith("/") && !target.startsWith("//") && !target.startsWith("/\\")) {
    return target;
  }
  return null;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const safeRedirect = useMemo(() => {
    return getSafeRedirect(searchParams.get("redirect"));
  }, [searchParams]);

  const noticeMessage = useMemo(() => {
    if (searchParams.get("reset") === "success") {
      return {
        type: "success" as const,
        text: "Your password has been successfully reset. Please sign in with your new password.",
      };
    }
    if (searchParams.get("registered") === "true") {
      return {
        type: "success" as const,
        text: "Your account was created successfully! Please sign in below.",
      };
    }
    if (searchParams.get("session") === "expired") {
      return {
        type: "info" as const,
        text: "Your session has expired. Please sign in again to continue.",
      };
    }
    return null;
  }, [searchParams]);

  // If already authenticated, smoothly navigate to dashboard or redirect destination
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === "pending") {
        router.replace("/select-role");
      } else if (safeRedirect) {
        router.replace(safeRedirect);
      } else if (user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [user, authLoading, safeRedirect, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const sanitizedEmail = email.trim().toLowerCase();

    try {
      const loggedInUser = await login(sanitizedEmail, password);
      if (loggedInUser.role === "admin") {
        router.replace(safeRedirect && safeRedirect.startsWith("/admin") ? safeRedirect : "/admin");
      } else if (loggedInUser.role === "pending") {
        router.replace("/select-role");
      } else {
        router.replace(safeRedirect || "/dashboard");
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleToken = async (idToken: string) => {
    setError("");
    try {
      const { user: authedUser, needsRole } = await loginWithGoogle(idToken);
      if (needsRole || authedUser.role === "pending") {
        router.replace("/select-role");
      } else if (authedUser.role === "admin") {
        router.replace(safeRedirect && safeRedirect.startsWith("/admin") ? safeRedirect : "/admin");
      } else {
        router.replace(safeRedirect || "/dashboard");
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj.response?.data?.message || "Google sign-in failed. Please try again.");
    }
  };

  if (!authLoading && user) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F5F7FF", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
        <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "2.5rem", width: "100%", maxWidth: "440px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb" }}>
          <BrandLogo size="lg" />
          <p style={{ marginTop: "1rem", color: C.gray600, fontSize: "0.95rem" }}>
            Redirecting to your account...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F7FF", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "2.5rem", width: "100%", maxWidth: "440px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb" }}>

        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <BrandLogo size="lg" />
          <h1 style={{ fontSize: "1.4rem", fontWeight: "700", color: C.primary, marginBottom: "0.3rem", marginTop: "0.75rem" }}>
            Welcome back to TUTORERA
          </h1>
          <p style={{ color: C.gray500, fontSize: "0.875rem" }}>
            Sign in to your account
          </p>
        </div>

        {noticeMessage && (
          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              backgroundColor: noticeMessage.type === "success" ? "#f0fdf4" : "#eff6ff",
              border: `1px solid ${noticeMessage.type === "success" ? "#bbf7d0" : "#bfdbfe"}`,
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              color: noticeMessage.type === "success" ? "#166534" : "#1e40af",
              fontSize: "0.875rem",
              lineHeight: 1.4,
            }}
          >
            {noticeMessage.type === "success" ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : <Info size={18} style={{ flexShrink: 0 }} />}
            <span>{noticeMessage.text}</span>
          </div>
        )}

        {/* Google Sign In */}
        <div style={{ marginBottom: "1.25rem" }}>
          <GoogleButton
            onToken={handleGoogleToken}
            text="signin_with"
            roleLabel="account"
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.25rem 0" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e5e7eb" }} />
          <span style={{ fontSize: "0.8rem", color: C.gray500 }}>or continue with email</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e5e7eb" }} />
        </div>

        {error && (
          <div
            role="alert"
            data-testid="login-error"
            style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1.5rem", color: C.error, fontSize: "0.875rem" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: C.primary, marginBottom: "0.4rem" }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoCapitalize="none"
              spellCheck="false"
              placeholder="you@example.com"
              style={{ width: "100%", padding: "0.9rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: "0.5rem", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", color: C.primary, minHeight: "44px" }}
              onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
              onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: "600", color: C.primary }}>Password</label>
              <Link href="/forgot-password" style={{ fontSize: "0.8rem", color: C.accent, textDecoration: "none" }}>Forgot password?</Link>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{ width: "100%", padding: "0.9rem 2.75rem 0.9rem 1rem", border: "1.5px solid #e5e7eb", borderRadius: "0.5rem", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", color: C.primary, minHeight: "44px" }}
                onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? "Hide password" : "Show password"}
                style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.gray500, padding: "0.5rem", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: loading ? "#93c5fd" : C.accent, color: "white", padding: "0.9rem", borderRadius: "0.5rem", border: "none", fontWeight: "700", fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", transition: "background 0.2s", minHeight: "48px" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: C.gray500 }}>
          Don't have an account?{" "}
          <Link
            href={safeRedirect ? `/register?redirect=${encodeURIComponent(safeRedirect)}` : "/register"}
            style={{ color: C.accent, fontWeight: "600", textDecoration: "none" }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", backgroundColor: "#F5F7FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "36px", height: "36px", border: "3px solid #0329B2", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
