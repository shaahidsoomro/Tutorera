import { UI_COLORS } from "@/lib/brand";

const C = UI_COLORS;

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message = "Processing..." }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          maxWidth: '90vw',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            border: `3px solid ${C.accent}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p
          style={{
            fontSize: '0.95rem',
            color: C.primary,
            fontWeight: 500,
            margin: 0,
          }}
        >
          {message}
        </p>
        <p
          style={{
            fontSize: '0.75rem',
            color: C.gray500,
            margin: 0,
          }}
        >
          Please wait...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
