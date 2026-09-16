"use client";
// components/AIChatWidget.tsx
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { usePathname } from "next/navigation";
import { useEffect,useRef,useState } from "react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTED_QUESTIONS = [
  "How do I book a tutor?",
  "What is the platform fee?",
  "How does the referral program work?",
  "How do I become a tutor?",
];

const STORAGE_KEY = "tutorera_chat_messages";

function loadMessages(userId: string | undefined): Message[] {
  if (!userId || typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveMessages(userId: string | undefined, msgs: Message[]) {
  if (!userId || typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(msgs));
  } catch { /* quota exceeded or private mode */ }
}

function clearMessages(userId: string | undefined) {
  if (!userId || typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
  } catch { /* ignore */ }
}

export default function AIChatWidget() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => loadMessages(user?._id));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [persistedLoaded, setPersistedLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hide on chat and onboarding pages (same as WhatsApp button)
  const hide = ["/chat", "/onboarding"].some(p => pathname.startsWith(p));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Sync messages to localStorage whenever they change
  useEffect(() => {
    saveMessages(user?._id, messages);
  }, [messages, user?._id]);

  useEffect(() => {
    if (open && !hasGreeted && !persistedLoaded) {
      const firstName = user?.name?.split(" ")[0] || "there";
      if (messages.length === 0) {
        setMessages([{
          role: "assistant",
          text: `Hi ${firstName}! 👋 I'm TUTORERA's AI assistant. I can help you with questions about our platform — bookings, payments, tutors, policies, and more. What would you like to know?`,
        }]);
      }
      setHasGreeted(true);
    }
  }, [hasGreeted, open, user?.name, persistedLoaded, messages.length]);

  // Reset on logout — clear storage and state
  useEffect(() => {
    setMessages([]);
    setHasGreeted(false);
    setPersistedLoaded(false);
    setOpen(false);
    setInput("");
    clearMessages(user?._id);
  }, [user?._id]);

  // Reload persisted messages when user logs back in
  useEffect(() => {
    if (user?._id) {
      const stored = loadMessages(user._id);
      if (stored.length > 0) {
        setMessages(stored);
        setHasGreeted(true);
        setPersistedLoaded(true);
      }
    }
  }, [user?._id]);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open]);

  // Only show for logged-in students and tutors
  if (hide || !user || user.role === "admin") return null;

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", text: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      // Send all prior messages as history (excluding the greeting, which isn't from the API)
      const history = updatedMessages
        .slice(1) // skip greeting
        .map(m => ({ role: m.role, text: m.text }));

      const res = await api.post("/ai/chat", {
        message: text.trim(),
        history,
      });

      setMessages(prev => [...prev, { role: "assistant", text: res.data.reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Sorry, I'm having trouble responding right now. Please try again or contact us at hello@mentisera.pk",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '5.5rem', right: '1.5rem',
          width: '340px', height: '480px',
          backgroundColor: 'white', borderRadius: '1rem',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          zIndex: 998, border: '1px solid #e5e7eb',
          overflow: 'hidden',
          animation: 'slideUp 0.2s ease',
        }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #021550 0%, #16213e 100%)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
              🤖
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>TUTORERA® AI Assistant</p>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1, padding: 0 }}>
              ×
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === "user" ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '0.625rem 0.875rem',
                  borderRadius: msg.role === "user" ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                  backgroundColor: msg.role === "user" ? '#0329B2' : '#f3f4f6',
                  color: msg.role === "user" ? 'white' : '#021550',
                  fontSize: '0.8rem', lineHeight: 1.6,
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '0.625rem 0.875rem', backgroundColor: '#f3f4f6', borderRadius: '1rem 1rem 1rem 0.25rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, backgroundColor: '#9ca3af', borderRadius: '50%', animation: `bounce 1s infinite ${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Suggested questions — only show before first user message */}
            {messages.length === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
                <p style={{ fontSize: '0.7rem', color: '#9ca3af', margin: 0 }}>Suggested questions:</p>
                {SUGGESTED_QUESTIONS.map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    style={{ textAlign: 'left', padding: '0.4rem 0.75rem', backgroundColor: '#EEF5FF', color: '#0329B2', border: '1px solid #bfdbfe', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about TUTORERA®..."
              rows={1}
              style={{ flex: 1, padding: '0.6rem 0.875rem', border: '1.5px solid #e5e7eb', borderRadius: '0.75rem', fontSize: '0.8rem', outline: 'none', resize: 'none', fontFamily: 'inherit', color: '#021550', lineHeight: 1.5 }}
              onFocus={e => (e.currentTarget.style.borderColor = '#0329B2')}
              onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
            />
            <button title="button" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
              style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: loading || !input.trim() ? '#e5e7eb' : '#0329B2', border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
              <svg width={16} height={16} viewBox="0 0 20 20" fill={loading || !input.trim() ? '#9ca3af' : 'white'}>
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating bubble button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Open AI Assistant"
        style={{
          position: 'fixed', bottom: '5.5rem', right: '1.5rem',
          width: '56px', height: '56px',
          backgroundColor: '#021550', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(26,26,46,0.4)',
          border: 'none', cursor: 'pointer', zIndex: 999,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(26,26,46,0.5)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,26,46,0.4)';
        }}>
        {open ? (
          <svg width={24} height={24} viewBox="0 0 20 20" fill="white">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
            {/* Antenna */}
            <line x1="12" y1="2.5" x2="12" y2="5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12" cy="2" r="1.2" fill="white" />
            {/* Head */}
            <rect x="4.5" y="5" width="15" height="13" rx="4" fill="white" />
            {/* Eyes */}
            <circle cx="9" cy="11.2" r="1.6" fill="#021550" />
            <circle cx="15" cy="11.2" r="1.6" fill="#021550" />
            {/* Mouth */}
            <rect x="9" y="14.5" width="6" height="1.3" rx="0.65" fill="#021550" />
            {/* Side ears/antennae nubs */}
            <rect x="2.5" y="9.5" width="2" height="4" rx="1" fill="white" />
            <rect x="19.5" y="9.5" width="2" height="4" rx="1" fill="white" />
          </svg>
        )}
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}
