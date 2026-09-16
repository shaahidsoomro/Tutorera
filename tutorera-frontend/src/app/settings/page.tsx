"use client";
import Image from "next/image";
import { UI_COLORS } from "@/lib/brand";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useAppGuard } from "@/hooks/useAppGuard";
import api from "@/lib/axios";
import { Camera,Monitor,Save,Shield,Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";

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

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user) {
      api.get("/auth/me").then(res => {
        setProfile({ name: res.data.user.name || "", phone: res.data.user.phone || "" });
      }).catch(() => {});
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
        {success && <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#16a34a', fontSize: '0.875rem' }}>✅ {success}</div>}
        {error && <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#ef4444', fontSize: '0.875rem' }}>{error}</div>}

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
                  <Image src={(avatarPreview || user.avatar) as string} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}  width={100} height={100} unoptimized/>
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
                <input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+92 300 0000000"
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
