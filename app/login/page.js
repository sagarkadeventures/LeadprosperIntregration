"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// ── Password strength checker ─────────────────────────────
function getStrength(pwd) {
  return {
    length:    pwd.length >= 12,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number:    /[0-9]/.test(pwd),
    special:   /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
  };
}

function strengthScore(pwd) {
  return Object.values(getStrength(pwd)).filter(Boolean).length;
}

const strengthLabels = ["", "Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
const strengthColors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];

// ── Bubble component ──────────────────────────────────────
function Bubbles() {
  const [bubbles, setBubbles] = useState([]);

  useEffect(() => {
    setBubbles(
      [...Array(15)].map((_, i) => ({
        id: i,
        left:     `${Math.random() * 100}%`,
        width:    `${20 + Math.random() * 60}px`,
        height:   `${20 + Math.random() * 60}px`,
        duration: `${8 + Math.random() * 12}s`,
        delay:    `${Math.random() * 5}s`,
        opacity:  0.1 + Math.random() * 0.15,
      }))
    );
  }, []);

  return (
    <div className="bubbles-container">
      {bubbles.map((b) => (
        <div key={b.id} className="bubble" style={{
          left:              b.left,
          width:             b.width,
          height:            b.height,
          animationDuration: b.duration,
          animationDelay:    b.delay,
          opacity:           b.opacity,
        }} />
      ))}
    </div>
  );
}

// ── Generate strong password ──────────────────────────────
function generatePassword() {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const nums  = "0123456789";
  const spec  = "!@#$%^&*()_+-=[]{}";
  const all   = upper + lower + nums + spec;
  let pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    spec[Math.floor(Math.random() * spec.length)],
  ];
  for (let i = 4; i < 16; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }
  return pwd.sort(() => Math.random() - 0.5).join("");
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [newPassword, setNew]       = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mode, setMode]             = useState("login"); // login | set_password
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [copied, setCopied]         = useState(false);

  const score = strengthScore(newPassword);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "login") {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "login", email, password }),
        });
        const data = await res.json();

        if (data.needsPassword) {
          setMode("set_password");
          setLoading(false);
          return;
        }
        if (data.error) { setError(data.error); setLoading(false); return; }
        if (data.success) router.push("/dashboard");

      } else {
        if (newPassword !== confirm) {
          setError("Passwords do not match."); setLoading(false); return;
        }
        if (score < 5) {
          setError("Please use a stronger password."); setLoading(false); return;
        }
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "set_password", email, newPassword, confirmPassword: confirm }),
        });
        const data = await res.json();
        if (data.error) { setError(data.error); setLoading(false); return; }
        if (data.success) router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  function handleGenerate() {
    const pwd = generatePassword();
    setNew(pwd);
    setConfirm(pwd);
    navigator.clipboard.writeText(pwd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #162C4D; font-family: 'DM Sans', system-ui, sans-serif; }

        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0d1f35 0%, #162C4D 50%, #1a3560 100%);
          position: relative;
          overflow: hidden;
          padding: 20px;
        }

        /* ── Bubbles ── */
        .bubbles-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .bubble {
          position: absolute;
          bottom: -100px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(99,179,237,0.4), rgba(99,179,237,0.05));
          border: 1px solid rgba(99,179,237,0.2);
          animation: floatUp linear infinite;
        }
        @keyframes floatUp {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-110vh) rotate(720deg); opacity: 0; }
        }

        /* ── Glassmorphism card ── */
        .glass-card {
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 24px;
          padding: 48px 40px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
          position: relative;
          z-index: 10;
          animation: fadeInScale 0.5s cubic-bezier(0.22,1,0.36,1);
        }

        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.94) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .logo-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 32px;
          gap: 12px;
        }

        .logo-img { height: 36px; width: auto; filter: brightness(1.1); }

        .title {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          text-align: center;
          letter-spacing: -0.3px;
        }
        .subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          text-align: center;
          margin-top: 4px;
        }

        /* ── Input ── */
        .field { margin-bottom: 16px; }
        .field label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.6);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .input-wrap { position: relative; }
        .input-wrap input {
          width: 100%;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 13px 48px 13px 16px;
          font-size: 14px;
          color: #fff;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          font-family: inherit;
        }
        .input-wrap input::placeholder { color: rgba(255,255,255,0.25); }
        .input-wrap input:focus {
          border-color: rgba(99,179,237,0.6);
          background: rgba(255,255,255,0.1);
          box-shadow: 0 0 0 3px rgba(99,179,237,0.1);
        }
        .eye-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.4);
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.2s;
        }
        .eye-btn:hover { color: rgba(255,255,255,0.8); }

        /* ── Strength bar ── */
        .strength-bar {
          display: flex;
          gap: 4px;
          margin-top: 8px;
        }
        .strength-seg {
          flex: 1;
          height: 3px;
          border-radius: 99px;
          background: rgba(255,255,255,0.1);
          transition: background 0.3s;
        }

        .strength-checks {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 12px;
          margin-top: 8px;
        }
        .check-item {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          display: flex;
          align-items: center;
          gap: 4px;
          transition: color 0.2s;
        }
        .check-item.pass { color: #10b981; }

        /* ── Generate btn ── */
        .gen-btn {
          width: 100%;
          background: rgba(99,179,237,0.1);
          border: 1px dashed rgba(99,179,237,0.3);
          border-radius: 10px;
          padding: 10px;
          color: rgba(99,179,237,0.8);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
          transition: all 0.2s;
          font-family: inherit;
          letter-spacing: 0.3px;
        }
        .gen-btn:hover {
          background: rgba(99,179,237,0.15);
          border-color: rgba(99,179,237,0.5);
          color: #63b3ed;
        }

        /* ── Submit btn ── */
        .submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border: none;
          border-radius: 12px;
          padding: 14px;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 8px;
          transition: all 0.2s;
          font-family: inherit;
          letter-spacing: -0.2px;
          box-shadow: 0 4px 20px rgba(37,99,235,0.4);
          position: relative;
          overflow: hidden;
        }
        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0);
          transition: background 0.2s;
        }
        .submit-btn:hover::before { background: rgba(255,255,255,0.08); }
        .submit-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(37,99,235,0.5); }
        .submit-btn:active { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* ── Error ── */
        .error-box {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 10px;
          padding: 12px;
          color: #fca5a5;
          font-size: 13px;
          margin-bottom: 16px;
          text-align: center;
        }

        /* ── Glow decorations ── */
        .glow-1 {
          position: fixed;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%);
          top: -100px;
          right: -100px;
          pointer-events: none;
        }
        .glow-2 {
          position: fixed;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,179,237,0.08) 0%, transparent 70%);
          bottom: -50px;
          left: -50px;
          pointer-events: none;
        }
      `}</style>

      <div className="login-wrapper">
        <Bubbles />
        <div className="glow-1" />
        <div className="glow-2" />

        <div className="glass-card">
          {/* Logo */}
          <div className="logo-wrap">
            <img
              src="https://radcred.com/media/2022/11/RadCred-Logo-Small-Size.png"
              alt="RadCred"
              className="logo-img"
            />
            <div>
              <p className="title">
                {mode === "login" ? "Welcome Back" : "Create Your Password"}
              </p>
              <p className="subtitle">
                {mode === "login"
                  ? "Sign in to access your dashboard"
                  : "Set a strong password for your account"}
              </p>
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="field">
              <label>Email Address</label>
              <div className="input-wrap">
                <input
                  type="email"
                  placeholder="you@radcred.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={mode === "set_password"}
                />
              </div>
            </div>

            {/* Login password */}
            {mode === "login" && (
              <div className="field">
                <label>Password</label>
                <div className="input-wrap">
                  <input
                    type={showPwd ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? (
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Set password fields */}
            {mode === "set_password" && (
              <>
                <div className="field">
                  <label>New Password</label>
                  <div className="input-wrap">
                    <input
                      type={showNew ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={newPassword}
                      onChange={e => setNew(e.target.value)}
                      required
                    />
                    <button type="button" className="eye-btn" onClick={() => setShowNew(!showNew)}>
                      {showNew ? (
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {newPassword && (
                    <>
                      <div className="strength-bar">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className="strength-seg" style={{
                            background: i <= score ? strengthColors[score] : undefined
                          }} />
                        ))}
                      </div>
                      <p style={{ fontSize: 11, color: strengthColors[score], marginTop: 4 }}>
                        {strengthLabels[score]}
                      </p>
                      <div className="strength-checks">
                        {[
                          ["12+ characters", getStrength(newPassword).length],
                          ["Uppercase (A-Z)", getStrength(newPassword).uppercase],
                          ["Lowercase (a-z)", getStrength(newPassword).lowercase],
                          ["Number (0-9)",    getStrength(newPassword).number],
                          ["Special char",    getStrength(newPassword).special],
                        ].map(([label, pass]) => (
                          <div key={label} className={`check-item ${pass ? "pass" : ""}`}>
                            {pass ? "✓" : "○"} {label}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="field">
                  <label>Confirm Password</label>
                  <div className="input-wrap">
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repeat your password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      style={{ borderColor: confirm && confirm !== newPassword ? "rgba(239,68,68,0.5)" : undefined }}
                    />
                    <button type="button" className="eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? (
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                <button type="button" className="gen-btn" onClick={handleGenerate}>
                  {copied ? "✓ Copied to clipboard!" : "⚡ Generate Strong Password"}
                </button>
              </>
            )}

            <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: 20 }}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Set Password & Continue →"}
            </button>
          </form>

          {mode === "set_password" && (
            <button
              onClick={() => { setMode("login"); setError(""); }}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", width: "100%", marginTop: 16, fontFamily: "inherit" }}
            >
              ← Back to sign in
            </button>
          )}
        </div>
      </div>
    </>
  );
}