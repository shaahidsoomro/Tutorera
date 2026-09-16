"use client";

import { useEffect,useRef,useState } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleButtonProps {
  onToken: (idToken: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
  roleLabel?: string;
  width?: number;
}

const DEFAULT_GOOGLE_CLIENT_ID = "896228082480-4rj6gcpgbtjihver9shi0u59umkh4bh8.apps.googleusercontent.com";

export default function GoogleButton({
  onToken,
  text = "continue_with",
  roleLabel,
  width = 340,
}: GoogleButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) return;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential: string }) => {
            if (response?.credential) {
              onToken(response.credential);
            }
          },
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          width: Math.min(width, 380),
          text,
          shape: "rectangular",
          logo_alignment: "left",
        });
        setRendered(true);
      } catch (e) {
        console.error("Google GSI render error:", e);
      }
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
    } else {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.addEventListener("load", initializeGoogle);
      } else {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = initializeGoogle;
        document.body.appendChild(script);
      }
    }
  }, [onToken, text, width]);

  const actionText = text === "signup_with" ? "Sign up" : text === "signin_with" ? "Sign in" : "Continue";
  const buttonLabel = roleLabel ? `${actionText} as ${roleLabel} with Google` : `${actionText} with Google`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", minHeight: "44px" }}>
      <div ref={buttonRef} style={{ display: "flex", justifyContent: "center", width: "100%" }} />
      {!rendered && (
        <button
          type="button"
          onClick={() => {
            if (window.google?.accounts?.id) {
              window.google.accounts.id.prompt();
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            width: "100%",
            maxWidth: width,
            height: "44px",
            background: "white",
            border: "1px solid #dadce0",
            borderRadius: "4px",
            color: "#3c4043",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(60,64,67, 0.08)",
            transition: "background-color .2s, box-shadow .2s",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
            />
          </svg>
          <span>{buttonLabel}</span>
        </button>
      )}
    </div>
  );
}