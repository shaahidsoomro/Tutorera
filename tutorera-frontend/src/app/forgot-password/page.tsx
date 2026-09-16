"use client";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import { UI_COLORS } from "@/lib/brand";
import { Eye,EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const C = UI_COLORS;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const { forgotPassword, resetPassword } = useAuth();
  const router = useRouter();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const message = await forgotPassword(email);
      setInfo(message);
      setStep("reset");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      router.push("/login?reset=success");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2.5rem', width: '100%', maxWidth: '440px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <BrandLogo size="lg" /><h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: C.primary, marginBottom: '0.3rem' }}>
            {step === "email" ? "Forgot your password?" : "Reset your password"}
          </h1>
          <p style={{ color: C.gray500, fontSize: '0.875rem' }}>
            {step === "email"
              ? "Enter your email and we'll send you a reset code."
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: C.error, fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
            </div>
            <button type="submit" disabled={loading}
              style={{ backgroundColor: loading ? '#93c5fd' : C.accent, color: 'white', padding: '0.85rem', borderRadius: '0.5rem', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {info && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem 1rem', color: C.success, fontSize: '0.8rem' }}>
                {info}
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Verification Code</label>
              <input
                type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} required
                placeholder="123456" maxLength={6}
                style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '1.1rem', letterSpacing: '0.3em', textAlign: 'center', outline: 'none', boxSizing: 'border-box', color: C.primary, fontWeight: '700' }}
                onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                  placeholder="Min. 6 characters"
                  style={{ width: '100%', padding: '0.75rem 2.75rem 0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                  onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.gray500 }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ backgroundColor: loading ? '#93c5fd' : C.accent, color: 'white', padding: '0.85rem', borderRadius: '0.5rem', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <button type="button" onClick={() => { setStep("email"); setError(""); setInfo(""); }}
              style={{ background: 'none', border: 'none', color: C.gray500, fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center' }}>
              ← Use a different email
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: C.gray500 }}>
          Remember your password?{" "}
          <Link href="/login" style={{ color: C.accent, fontWeight: '600', textDecoration: 'none' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}