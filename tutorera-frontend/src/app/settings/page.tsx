"use client";
import { UI_COLORS } from "@/lib/brand";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { Camera, Save, Shield, Monitor, Smartphone, Landmark, Users } from "lucide-react";
import api from "@/lib/axios";
import { useAppGuard } from "@/hooks/useAppGuard";

const C = UI_COLORS;

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const guardStatus = useAppGuard();
  const router = useRouter(); 
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [profile, setProfile] = useState({ name: "", phone: "" });
  const [passwords, setPasswords] = useState({ current: "", newPass: "", confirm: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [parentSettings, setParentSettings] = useState({
    approvalRequiredForBookings: true,
    spendingLimitMonthly: "" as string | number,
    notificationsEnabled: true,
  });
  const [savingParent, setSavingParent] = useState(false);

  const [payoutAccount, setPayoutAccount] = useState({
    method: "bank_transfer",
    accountTitle: "",
    accountNumber: "",
    bankName: "",
    branchCode: "",
    swiftCode: "",
    notes: "",
  });
  const [savingPayout, setSavingPayout] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user) {
      api.get("/auth/me").then(res => {
        setProfile({ name: res.data.user.name || "", phone: res.data.user.phone || "" });
      }).catch(() => {});

      if (user.role === "parent") {
        api.get("/parent/profile").then(res => {
          const p = res.data?.profile;
          if (p) setParentSettings({
            approvalRequiredForBookings: !!p.approvalRequiredForBookings,
            spendingLimitMonthly: p.spendingLimitMonthly ?? "",
            notificationsEnabled: p.notificationsEnabled !== false,
          });
        }).catch(() => {});
      }

      if (user.role === "tutor") {
        api.get("/tutors/profile/me").then(res => {
          if (res.data?.profile?.payoutAccount) {
            setPayoutAccount(prev => ({
              ...prev,
              ...res.data.profile.payoutAccount,
            }));
          }
        }).catch(() => {});
      }
    }
  }, [user, loading, router]);

  // ← ADD: block pending/rejected tutors + show spinner while checking
  if (guardStatus !== "ok") return null;

  const handleProfileSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        await api.post("/upload/avatar", formData);
      }
      await api.patch("/auth/update-profile", profile);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch { setError("Failed to update profile."); }
    finally { setSaving(false); }
  };

  const handlePayoutSave = async () => {
    if (!payoutAccount.accountTitle.trim() || !payoutAccount.accountNumber.trim()) {
      setError("Please provide both Account Title and Account / IBAN Number.");
      return;
    }
    setSavingPayout(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/tutors/profile", { payoutAccount });
      setSuccess("Payout receiving details updated successfully!");
      setTimeout(() => setSuccess(""), 4000);
    } catch {
      setError("Failed to save payout account details. Please try again.");
    } finally {
      setSavingPayout(false);
    }
  };

  const handleParentSettingsSave = async () => {
    setSavingParent(true); setError(""); setSuccess("");
    try {
      await api.patch("/parent/settings", {
        approvalRequiredForBookings: parentSettings.approvalRequiredForBookings,
        spendingLimitMonthly: parentSettings.spendingLimitMonthly === "" ? undefined : Number(parentSettings.spendingLimitMonthly),
        notificationsEnabled: parentSettings.notificationsEnabled,
      });
      setSuccess("Parent settings saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to save parent settings.");
    } finally { setSavingParent(false); }
  };

  const handlePasswordChange = async () => {
    if (!passwords.current || !passwords.newPass || !passwords.confirm) { setError("Please fill all password fields."); return; }
    if (passwords.newPass !== passwords.confirm) { setError("New passwords don't match."); return; }
    if (passwords.newPass.length < 6) { setError("Password must be at least 6 characters."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      await api.patch("/auth/change-password", { currentPassword: passwords.current, newPassword: passwords.newPass });
      setSuccess("Password changed successfully!");
      setPasswords({ current: "", newPass: "", confirm: "" });
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || "Failed to change password.");
    } finally { setSaving(false); }
  };

  if (loading || !user) return null;

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '800px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: C.primary, marginBottom: '0.5rem' }}>Settings</h1>
        <p style={{ color: C.gray500, fontSize: '0.875rem', marginBottom: '2rem' }}>Manage your profile, preferences, and account security.</p>

        {/* Success/Error */}
        {success && <div role="status" aria-live="polite" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#16a34a', fontSize: '0.875rem' }}>✅ {success}</div>}
        {error && <div role="alert" aria-live="assertive" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#ef4444', fontSize: '0.875rem' }}>{error}</div>}

        {/* Profile Settings */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '2rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: C.primary, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            👤 Profile Settings
          </h2>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '88px', height: '88px', borderRadius: '50%', backgroundColor: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: '800', color: 'white', overflow: 'hidden', position: 'relative' }}>
                {avatarPreview || user.avatar ? (
                  <img src={avatarPreview || user.avatar} alt={user.name ? `${user.name}'s profile photo` : "Your profile photo"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : user.name.charAt(0).toUpperCase()}
              </div>
              <label style={{ cursor: 'pointer', backgroundColor: C.gray50, border: '1px solid #e5e7eb', borderRadius: '0.4rem', padding: '0.4rem 0.875rem', fontSize: '0.8rem', fontWeight: '600', color: C.primary, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Camera size={13} /> Change Photo
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); } }} style={{ display: 'none' }} />
              </label>
            </div>
            {/* Fields */}
            <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Full Name</label>
                <input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })}
                  style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                  onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Email Address</label>
                <input value={user.email} readOnly
                  style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', color: C.gray500, backgroundColor: C.gray50, cursor: 'not-allowed' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Phone Number</label>
                <input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+country code and number"
                  style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                  onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>
              <button onClick={handleProfileSave} disabled={saving}
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: saving ? '#93c5fd' : C.accent, color: 'white', padding: '0.65rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: '600', fontSize: '0.875rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
                <Save size={15} /> {saving ? "Saving..." : "Save Profile Changes"}
              </button>
            </div>
          </div>
        </div>

        {/* Payout & Banking Details — Tutors only */}
        {user.role === "tutor" && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '2rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: C.primary, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Landmark size={18} color="#0329b2" /> Payout & Banking Destination
            </h2>
            <p style={{ color: C.gray500, fontSize: '0.8rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Specify where TUTORERA should release your session earnings. Payouts are transferred under standard settlement cycles.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                  Payout Method
                </label>
                <select
                  value={payoutAccount.method}
                  onChange={e => setPayoutAccount({ ...payoutAccount, method: e.target.value })}
                  style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', color: C.primary, backgroundColor: C.surface }}
                >
                  <option value="bank_transfer">Bank Transfer (IBAN / Account)</option>
                  <option value="raast">Raast ID</option>
                  <option value="jazzcash">JazzCash Mobile Account</option>
                  <option value="easypaisa">EasyPaisa Mobile Account</option>
                  <option value="other">Other Digital Payment</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                  Account Title (as on bank/wallet) *
                </label>
                <input
                  type="text"
                  value={payoutAccount.accountTitle}
                  onChange={e => setPayoutAccount({ ...payoutAccount, accountTitle: e.target.value })}
                  placeholder="e.g. Muhammad Ali"
                  style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', color: C.primary, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                  Account / IBAN / Wallet Number *
                </label>
                <input
                  type="text"
                  value={payoutAccount.accountNumber}
                  onChange={e => setPayoutAccount({ ...payoutAccount, accountNumber: e.target.value })}
                  placeholder="e.g. PK36MEZN0001234567890101"
                  style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', color: C.primary, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                  Bank or Provider Name
                </label>
                <input
                  type="text"
                  value={payoutAccount.bankName}
                  onChange={e => setPayoutAccount({ ...payoutAccount, bankName: e.target.value })}
                  placeholder="e.g. Meezan Bank, HBL, Standard Chartered"
                  style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', color: C.primary, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                  Branch / Swift / Routing (optional)
                </label>
                <input
                  type="text"
                  value={payoutAccount.branchCode}
                  onChange={e => setPayoutAccount({ ...payoutAccount, branchCode: e.target.value })}
                  placeholder="Branch code or SWIFT BIC"
                  style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', color: C.primary, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                  Special Transfer Notes (optional)
                </label>
                <input
                  type="text"
                  value={payoutAccount.notes}
                  onChange={e => setPayoutAccount({ ...payoutAccount, notes: e.target.value })}
                  placeholder="Any special routing instructions"
                  style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', color: C.primary, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <button
              onClick={handlePayoutSave}
              disabled={savingPayout}
              style={{ backgroundColor: savingPayout ? '#93c5fd' : '#0329b2', color: 'white', padding: '0.65rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: '700', fontSize: '0.875rem', cursor: savingPayout ? 'not-allowed' : 'pointer' }}
            >
              {savingPayout ? "Saving Details..." : "Save Payout Destination"}
            </button>
          </div>
        )}

        {/* Parent Settings — Parents only */}
        {user.role === "parent" && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '2rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: C.primary, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#0329b2" /> Parent Preferences
            </h2>
            <p style={{ color: C.gray500, fontSize: '0.8rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Control how your children&apos;s tutoring bookings are managed.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer', fontSize: '0.875rem', color: C.primary, lineHeight: 1.45 }}>
                <input
                  type="checkbox"
                  checked={parentSettings.approvalRequiredForBookings}
                  onChange={e => setParentSettings({ ...parentSettings, approvalRequiredForBookings: e.target.checked })}
                  style={{ marginTop: '0.15rem', width: 16, height: 16, flexShrink: 0 }}
                />
                <span><strong>Require my approval before a booking is confirmed</strong><br /><span style={{ color: C.gray500, fontSize: '0.78rem' }}>When enabled, linked students must wait for your approval before a session is booked.</span></span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer', fontSize: '0.875rem', color: C.primary, lineHeight: 1.45 }}>
                <input
                  type="checkbox"
                  checked={parentSettings.notificationsEnabled}
                  onChange={e => setParentSettings({ ...parentSettings, notificationsEnabled: e.target.checked })}
                  style={{ marginTop: '0.15rem', width: 16, height: 16, flexShrink: 0 }}
                />
                <span><strong>Email notifications for bookings and activity</strong></span>
              </label>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                  Monthly spending limit (optional, in USD equivalent)
                </label>
                <input
                  type="number"
                  min={0}
                  value={parentSettings.spendingLimitMonthly}
                  onChange={e => setParentSettings({ ...parentSettings, spendingLimitMonthly: e.target.value })}
                  placeholder="Leave blank for no limit"
                  style={{ width: '100%', maxWidth: '220px', padding: '0.7rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', color: C.primary, boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <button
              onClick={handleParentSettingsSave}
              disabled={savingParent}
              style={{ backgroundColor: savingParent ? '#93c5fd' : C.accent, color: 'white', padding: '0.65rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: '700', fontSize: '0.875rem', cursor: savingParent ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Save size={15} /> {savingParent ? "Saving…" : "Save Preferences"}
            </button>
          </div>
        )}

        {/* Device Sessions */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '2rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: C.primary, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Monitor size={18} /> Device Sessions
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: C.gray50, borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Smartphone size={20} color={C.gray500} />
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: C.primary }}>Current Device</p>
                <p style={{ fontSize: '0.75rem', color: C.gray500 }}>Active session</p>
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#16a34a', backgroundColor: '#f0fdf4', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>Active</span>
          </div>
        </div>

        {/* Security */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '2rem', border: '1.5px solid #fecaca' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ef4444', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={18} /> Security
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: "Current Password", key: "current", type: "password", placeholder: "Enter current password" },
              { label: "New Password", key: "newPass", type: "password", placeholder: "Min. 6 characters" },
              { label: "Confirm New Password", key: "confirm", type: "password", placeholder: "Confirm new password" },
            ].map(field => (
              <div key={field.key}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>{field.label}</label>
                <input type={field.type} value={passwords[field.key as keyof typeof passwords]}
                  onChange={e => setPasswords({ ...passwords, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', color: C.primary }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#ef4444')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              </div>
            ))}
            <button onClick={handlePasswordChange} disabled={saving}
              style={{ alignSelf: 'flex-start', backgroundColor: saving ? '#fca5a5' : '#ef4444', color: 'white', padding: '0.65rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: '600', fontSize: '0.875rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? "Updating..." : "Update Password"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
