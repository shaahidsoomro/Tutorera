import { UI_COLORS } from "@/lib/brand";

const C = UI_COLORS;

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const calculateStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[!@#$%^&*]/.test(pwd)) strength++;
    return Math.min(strength, 4);
  };

  const strength = calculateStrength(password);
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

  return (
    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: '2rem',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: i < strength ? strengthColors[strength - 1] : '#e5e7eb',
            transition: 'all 0.2s',
          }}
        />
      ))}
      <span style={{ fontSize: '0.75rem', color: strengthColors[strength - 1], fontWeight: 600 }}>
        {strengthLabels[strength - 1]}
      </span>
    </div>
  );
}
