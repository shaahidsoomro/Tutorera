"use client";
import BrandLogo from "@/components/BrandLogo";
import GoogleButton from "@/components/GoogleButton";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { Eye,EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter,useSearchParams } from "next/navigation";
import { Suspense,useEffect,useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterFormData } from "@/lib/auth-schemas";
import { FormField, FormInput, FormSelect } from "@/components/Auth/FormField";
import { PasswordStrengthIndicator } from "@/components/Auth/PasswordStrengthIndicator";
import { LoadingOverlay } from "@/components/Auth/LoadingOverlay";

const C = UI_COLORS;

const launchMarkets = [{ code: "PK", name: "Pakistan", dial: "+92" }, { code: "AE", name: "United Arab Emirates", dial: "+971" }, { code: "GB", name: "United Kingdom", dial: "+44" }];

function RegisterForm() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, setError: setFormError, clearErrors } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: { role: 'student', countryCode: 'PK', preferredLanguage: 'en' }
  });

  const watchRole = watch('role');
  const watchDateOfBirth = watch('dateOfBirth');
  const watchPassword = watch('password');

  const studentAge = (() => {
    if (!watchDateOfBirth) return null;
    const date = new Date(watchDateOfBirth + "T00:00:00.000Z");
    if (!Number.isFinite(date.getTime())) return null;
    const now = new Date();
    let years = now.getUTCFullYear() - date.getUTCFullYear();
    if (now.getUTCMonth() < date.getUTCMonth() || (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate())) years--;
    return years;
  })();

  const needsGuardian = watchRole === "student" && studentAge !== null && studentAge >= 13 && studentAge < 18;

  const [citySuggestions, setCitySuggestions] = useState<Array<{ _id?: string; name: string }>>([]);
  const [referralCode, setReferralCode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState("");
  const { register: authRegister, loginWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setReferralCode(ref.toUpperCase());
  }, [searchParams]);

  const watchCountryCode = watch('countryCode');
  const watchCity = watch('city');

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!watchCity) { setCitySuggestions([]); return; }
      try {
        const response = await api.get("/geo/cities", { params: { country: watchCountryCode || 'PK', q: watchCity, limit: 20 } });
        if (active) setCitySuggestions(response.data.cities || []);
      } catch { if (active) setCitySuggestions([]); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [watchCountryCode, watchCity]);

  const onSubmit = async (data: RegisterFormData) => {
    setServerError("");
    clearErrors();
    try {
      const contactValidation = await api.post("/auth/validate-contacts", {
        email: data.email,
        phone: data.phone || undefined,
      });
      const validation = contactValidation.data?.validation;
      if (validation?.email && (!validation.email.valid || validation.email.disposable)) {
        setServerError(validation.email.disposable
          ? "Please use a non-disposable email address."
          : "Please enter a valid, deliverable email address.");
        return;
      }
      if (validation?.phone && !validation.phone.valid) {
        setServerError("Please enter a valid phone number in international format.");
        return;
      }

      await authRegister(data);

      if (referralCode.trim()) {
        try {
          await api.post("/referral/apply", { code: referralCode.trim() });
        } catch {
          // Referral code invalid — don't block registration
        }
      }

      if (data.role === "tutor") {
        router.push("/onboarding/tutor");
      } else if (data.role === "parent") {
        router.push("/dashboard");
      } else {
        router.push(needsGuardian ? "/guardian-consent-pending" : "/onboarding/student");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setServerError(error.response?.data?.message || "Registration failed. Please try again.");
    }
  };

  const handleGoogleToken = async (idToken: string) => {
    setServerError("");
    try {
      if (watchRole === "student" && (studentAge === null || studentAge < 13 || (needsGuardian && (!watch('guardianEmail') || !watch('guardianName'))))) {
        setServerError("Enter a valid date of birth and any required guardian details before Google sign-up.");
        return;
      }
      const { user: gUser, needsRole } = await loginWithGoogle(idToken, watchRole, watch('countryCode') || 'PK', 'en', {
        dateOfBirth: watchRole === "student" ? watchDateOfBirth : undefined,
        guardianEmail: needsGuardian ? watch('guardianEmail') : undefined,
        guardianName: needsGuardian ? watch('guardianName') : undefined,
      });
      if (needsRole) {
        router.push("/select-role");
      } else if (gUser.role === "tutor") {
        router.push("/onboarding/tutor");
      } else if (gUser.role === "student") {
        router.push(gUser.isMinor && !gUser.parentConsentVerified ? "/guardian-consent-pending" : "/onboarding/student");
      } else if (gUser.role === "parent") {
        router.push("/dashboard");
      } else if (gUser.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setServerError(error.response?.data?.message || "Google sign-up failed. Please try again.");
    }
  };

  return (
    <>
      <LoadingOverlay isVisible={isSubmitting} message="Creating your account..." />
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(1rem, env(safe-area-inset-left)) max(1rem, env(safe-area-inset-right))' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: 'clamp(1.5rem, 5vw, 2.5rem)', width: '100%', maxWidth: '500px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <BrandLogo size="lg" /><h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: C.primary, marginBottom: '0.3rem' }}>Create your account</h1>
          <p style={{ color: C.gray500, fontSize: '0.875rem' }}>Join the global student-led tutoring marketplace</p>
        </div>

        {/* Role Toggle */}
        <div style={{ display: 'flex', backgroundColor: '#f3f4f6', borderRadius: '0.625rem', padding: '0.25rem', marginBottom: '1.5rem' }}>
          {(["student", "tutor", "parent"] as const).map((role) => (
            <button key={role} type="button" onClick={() => clearErrors() || true}
              style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', transition: 'all 0.2s', backgroundColor: watchRole === role ? 'white' : 'transparent', color: watchRole === role ? C.primary : C.gray500, boxShadow: watchRole === role ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', textTransform: 'capitalize' }}>
              {role === "parent" ? "Parent / Guardian" : `I'm a ${role}`}
            </button>
          ))}
        </div>

        {/* Error */}
        {serverError && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: C.error, fontSize: '0.875rem' }}>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          {/* Name */}
          <FormField label="Full Name" error={errors.name?.message} required>
            <FormInput {...register('name')} type="text" placeholder="Muhammad Ahmad" error={errors.name?.message} />
          </FormField>

          {/* Email */}
          <FormField label="Email address" error={errors.email?.message} required>
            <FormInput {...register('email')} type="email" placeholder="you@example.com" error={errors.email?.message} />
          </FormField>

          {/* Country */}
          <FormField label="Country or market" required>
            <FormSelect {...register('countryCode')} error={errors.countryCode?.message} options={launchMarkets.map(m => ({ value: m.code, label: `${m.name} (${m.dial})` }))} />
            {watchCountryCode !== "PK" && <p style={{ margin: '.45rem 0 0', color: C.gray500, fontSize: '.78rem', lineHeight: 1.5 }}>Discovery beta: profiles, requests, offers, and negotiation are available. Acceptance and payment are not available yet.</p>}
          </FormField>

          {watchRole === "student" && (
            <FormField label="Student date of birth" error={errors.dateOfBirth?.message} required helperText="Students aged 13–17 require an adult guardian to approve their account. Children under 13 cannot register independently.">
              <FormInput {...register('dateOfBirth')} type="date" max={new Date().toISOString().slice(0, 10)} error={errors.dateOfBirth?.message} />
            </FormField>
          )}

          {needsGuardian && (
            <div style={{ padding: "1rem", background: "#eef5ff", borderRadius: "0.75rem", display: "grid", gap: "0.75rem", border: `2px solid ${C.accent}` }}>
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: C.primary, margin: "0 0 0.5rem" }}>👤 Guardian Consent Required</p>
                <p style={{ fontSize: "0.78rem", color: C.gray600, margin: 0, lineHeight: 1.5 }}>
                  Students aged 13–17 need parent/guardian approval. Your guardian will receive a verification email and must approve your account before lessons can start.
                </p>
              </div>
              <FormField label="Guardian's full name" error={errors.guardianName?.message} required>
                <FormInput {...register('guardianName')} type="text" placeholder="e.g. Sarah Smith" error={errors.guardianName?.message} aria-describedby="guardian-name-help" />
                <p id="guardian-name-help" style={{ fontSize: "0.75rem", color: C.gray500, margin: "0.3rem 0 0" }}>Parent or legal guardian name</p>
              </FormField>
              <FormField label="Guardian's email address" error={errors.guardianEmail?.message} required>
                <FormInput {...register('guardianEmail')} type="email" placeholder="guardian@example.com" error={errors.guardianEmail?.message} aria-describedby="guardian-email-help" />
                <p id="guardian-email-help" style={{ fontSize: "0.75rem", color: C.gray500, margin: "0.3rem 0 0" }}>Must be different from your email. They will receive verification code here.</p>
              </FormField>
              <div style={{ backgroundColor: "white", padding: "0.75rem", borderRadius: "0.5rem", fontSize: "0.75rem", color: C.gray600, lineHeight: 1.6, border: `1px solid #bfdbfe` }}>
                <strong style={{ color: C.primary }}>What happens next:</strong>
                <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
                  <li>Your account will be created but lessons won't start yet</li>
                  <li>Your guardian receives an email with a verification code</li>
                  <li>They sign into their parent account and enter the code</li>
                  <li>Tutoring begins after approval</li>
                </ol>
              </div>
            </div>
          )}

          {/* Phone + City */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <FormField label="Phone" error={errors.phone?.message}>
              <FormInput {...register('phone')} type="tel" placeholder={`${launchMarkets.find((m) => m.code === (watchCountryCode || 'PK'))?.dial} …`} error={errors.phone?.message} />
            </FormField>
            <FormField label="City" error={errors.city?.message} required>
              <input
                {...register('city')}
                type="text"
                list="city-suggestions"
                placeholder="e.g. Islamabad"
                autoComplete="off"
                style={{ width: '100%', padding: '0.75rem 1rem', border: errors.city ? '1.5px solid #ef4444' : '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.primary, backgroundColor: 'white', transition: 'border-color 0.2s' }} />
              <datalist id="city-suggestions">
                {citySuggestions.map((city) => <option key={city._id || city.name} value={city.name} />)}
              </datalist>
              {errors.city && <p style={{ fontSize: '0.75rem', color: C.error, marginTop: '0.3rem' }}>⚠ {errors.city.message}</p>}
            </FormField>
          </div>

          {/* Password */}
          <FormField label="Password" error={errors.password?.message} required>
            <div style={{ position: 'relative' }}>
              <FormInput {...register('password')} type={showPass ? "text" : "password"} placeholder="Min. 6 characters" style={{ paddingRight: '2.75rem' }} error={errors.password?.message} />
              <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? "Hide password" : "Show password"}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.gray500, padding: '0.5rem' }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {watchPassword && <PasswordStrengthIndicator password={watchPassword} />}
          </FormField>

          {/* Referral Code */}
          <FormField label={<span>Referral Code <span style={{ color: C.gray500, fontWeight: 400 }}>(optional)</span></span>}>
            <FormInput
              type="text"
              value={referralCode}
              onChange={e => setReferralCode(e.target.value.toUpperCase())}
              placeholder="e.g. AHMAD3F2A"
              maxLength={12}
              style={{ letterSpacing: '0.05em', fontWeight: 600 }} />
            {referralCode && (
              <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.3rem', fontWeight: 600 }}>
                🎁 You'll get Rs. 200 credit on your first booking!
              </p>
            )}
          </FormField>

          <button type="submit" disabled={isSubmitting}
            style={{ backgroundColor: isSubmitting ? '#93c5fd' : C.accent, color: 'white', padding: '0.85rem', borderRadius: '0.5rem', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '0.25rem' }}>
            {isSubmitting ? "Creating account..." : `Create ${watchRole === "parent" ? "parent" : watchRole} account`}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
          <span style={{ fontSize: '0.8rem', color: C.gray500 }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
        </div>

        <GoogleButton onToken={handleGoogleToken} text="signup_with" roleLabel={watchRole === "tutor" ? "Tutor" : watchRole === "parent" ? "Parent/Guardian" : "Student"} />

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: C.gray500 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: C.accent, fontWeight: '600', textDecoration: 'none' }}>Log in</Link>
        </p>
      </div>
    </div>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
