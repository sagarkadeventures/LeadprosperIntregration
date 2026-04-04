"use client";

export default function ApplyPage() {
  return (
    <>
      <style>{`
        .apply-banner {
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          min-height: 240px;
          background: linear-gradient(135deg, #162C4D 0%, #1e40af 50%, #162C4D 100%);
          display: flex;
          align-items: center;
          padding: 48px;
          margin-bottom: 32px;
        }

        .apply-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 80% 50%, rgba(99,179,237,0.15) 0%, transparent 60%),
            radial-gradient(circle at 20% 80%, rgba(59,130,246,0.1) 0%, transparent 50%);
        }

        .banner-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .banner-content { position: relative; z-index: 2; max-width: 520px; }

        .banner-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(99,179,237,0.15);
          border: 1px solid rgba(99,179,237,0.3);
          border-radius: 99px;
          padding: 5px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #93c5fd;
          margin-bottom: 16px;
          letter-spacing: 0.3px;
        }

        .banner-title {
          font-size: 36px;
          font-weight: 800;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }

        .banner-title span { color: #60a5fa; }

        .banner-sub {
          font-size: 15px;
          color: rgba(255,255,255,0.6);
          margin-bottom: 28px;
          line-height: 1.6;
        }

        .banner-btns { display: flex; gap: 12px; flex-wrap: wrap; }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border: none;
          border-radius: 12px;
          padding: 14px 28px;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(37,99,235,0.4);
          font-family: inherit;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(37,99,235,0.5);
        }
        .btn-primary:active { transform: scale(0.98); }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 12px;
          padding: 14px 28px;
          color: rgba(255,255,255,0.8);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          font-family: inherit;
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.25);
          color: #fff;
          transform: translateY(-1px);
        }

        .banner-deco {
          position: absolute;
          right: 48px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.08;
          font-size: 120px;
          font-weight: 900;
          color: #fff;
          user-select: none;
          pointer-events: none;
        }

        /* Info cards */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        @media(max-width: 768px) { .info-grid { grid-template-columns: 1fr; } }

        .info-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 24px;
          transition: all 0.2s;
          cursor: default;
        }
        .info-card:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(99,179,237,0.2);
          transform: translateY(-2px);
        }

        .info-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          font-size: 20px;
        }

        .info-label { font-size: 12px; color: "#64748b"; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .info-value { font-size: 22px; font-weight: 800; color: #f1f5f9; }
        .info-sub   { font-size: 12px; color: #475569; margin-top: 4px; }

        /* Iframe section */
        .form-section {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          overflow: hidden;
        }

        .form-header {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .form-dot {
          width: 10px; height: 10px; border-radius: 50%;
        }

        .section-title {
          font-size: 15px; font-weight: 700; color: #f1f5f9;
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 16px;
        }
        .section-title::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
      `}</style>

      {/* Banner */}
      <div className="apply-banner">
        <div className="banner-grid" />
        <div className="banner-content">
          <div className="banner-tag">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Fast Approval
          </div>
          <h1 className="banner-title">
            Apply for a<br/><span>Personal Loan</span>
          </h1>
          <p className="banner-sub">
            Get matched with top lenders in minutes. Amounts from $100 to $50,000. No credit score impact to check your rate.
          </p>
          <div className="banner-btns">
            <a
              href="https://radcred.com/apply-now"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Start Application
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </a>
            <button className="btn-secondary">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Learn More
            </button>
          </div>
        </div>
        <div className="banner-deco">$</div>
      </div>

      {/* Info cards */}
      <p className="section-title">Loan Details</p>
      <div className="info-grid">
        {[
          { icon: "💰", label: "Loan Range", value: "$100 – $50K", sub: "Flexible amounts", color: "#22c55e" },
          { icon: "⚡", label: "Decision Time", value: "< 2 min", sub: "Instant matching", color: "#f59e0b" },
          { icon: "🔒", label: "Credit Impact", value: "None", sub: "Soft inquiry only", color: "#3b82f6" },
        ].map(({ icon, label, value, sub, color }) => (
          <div key={label} className="info-card">
            <div className="info-icon" style={{ background: `${color}15` }}>
              {icon}
            </div>
            <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</p>
            <p className="info-value">{value}</p>
            <p className="info-sub">{sub}</p>
          </div>
        ))}
      </div>

      {/* Form embed */}
      <p className="section-title">Quick Apply</p>
      <div className="form-section">
        <div className="form-header">
          <div className="form-dot" style={{ background: "#ef4444" }} />
          <div className="form-dot" style={{ background: "#f59e0b" }} />
          <div className="form-dot" style={{ background: "#22c55e" }} />
          <span style={{ marginLeft: 8, fontSize: 12, color: "#475569" }}>radcred.com — Secure Form</span>
        </div>
        <iframe
          src="https://leadprosper-intregration-gold.vercel.app/form"
          style={{ width: "100%", minHeight: "80vh", border: "none", display: "block" }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; top-navigation"
          allowFullScreen
        />
      </div>
    </>
  );
}