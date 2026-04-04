"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  )},
  { href: "/apply", label: "Apply for Loan", icon: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
  )},
];

export default function DashboardLayout({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
  }

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0f1e30; font-family: 'DM Sans', system-ui, sans-serif; }

        .layout { display: flex; min-height: 100vh; }

        /* ── Sidebar ── */
        .sidebar {
          width: ${collapsed ? "72px" : "240px"};
          background: linear-gradient(180deg, #162C4D 0%, #0f1e30 100%);
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          transition: width 0.3s cubic-bezier(0.4,0,0.2,1);
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 100;
          overflow: hidden;
        }

        .sidebar-logo {
          padding: 24px 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 72px;
        }

        .sidebar-logo img {
          height: 28px;
          width: auto;
          flex-shrink: 0;
          filter: brightness(1.1);
        }

        .logo-text {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          white-space: nowrap;
          opacity: ${collapsed ? 0 : 1};
          transition: opacity 0.2s;
        }

        .collapse-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          transition: all 0.2s;
          margin-left: auto;
          flex-shrink: 0;
          display: flex;
        }
        .collapse-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }

        .sidebar-nav {
          flex: 1;
          padding: 16px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 12px;
          border-radius: 12px;
          text-decoration: none;
          color: rgba(255,255,255,0.5);
          font-size: 13.5px;
          font-weight: 500;
          transition: all 0.2s;
          white-space: nowrap;
          position: relative;
          overflow: hidden;
        }
        .nav-item:hover {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.85);
        }
        .nav-item.active {
          background: rgba(59,130,246,0.15);
          color: #60a5fa;
          box-shadow: inset 3px 0 0 #3b82f6;
        }
        .nav-item .icon { flex-shrink: 0; }
        .nav-label {
          opacity: ${collapsed ? 0 : 1};
          transition: opacity 0.15s;
        }

        .sidebar-footer {
          padding: 16px 10px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 12px;
          border-radius: 12px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.4);
          font-size: 13.5px;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s;
          white-space: nowrap;
          font-family: inherit;
        }
        .logout-btn:hover {
          background: rgba(239,68,68,0.1);
          color: #f87171;
        }
        .logout-label {
          opacity: ${collapsed ? 0 : 1};
          transition: opacity 0.15s;
        }

        /* ── Main content ── */
        .main {
          margin-left: ${collapsed ? "72px" : "240px"};
          flex: 1;
          transition: margin-left 0.3s cubic-bezier(0.4,0,0.2,1);
          min-height: 100vh;
        }

        /* ── Top bar ── */
        .topbar {
          height: 64px;
          background: rgba(22,44,77,0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .topbar-title {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 99px;
          padding: 6px 14px 6px 6px;
        }

        .user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: #fff;
        }

        .user-name {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
        }

        .page-content {
          padding: 28px;
        }

        @media (max-width: 768px) {
          .sidebar { width: 72px; }
          .logo-text, .nav-label, .logout-label { opacity: 0; }
          .main { margin-left: 72px; }
          .page-content { padding: 16px; }
        }
      `}</style>

      <div className="layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <img src="https://radcred.com/media/2022/11/RadCred-Logo-Small-Size.png" alt="RadCred" />
            <span className="logo-text">RadCred</span>
            <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {collapsed
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                }
              </svg>
            </button>
          </div>

          <nav className="sidebar-nav">
            {NAV.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-item ${pathname === href ? "active" : ""}`}
                title={collapsed ? label : ""}
              >
                <span className="icon">{icon}</span>
                <span className="nav-label">{label}</span>
              </Link>
            ))}
          </nav>

          <div className="sidebar-footer">
            <button className="logout-btn" onClick={handleLogout} disabled={loggingOut}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{flexShrink:0}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              <span className="logout-label">{loggingOut ? "Signing out..." : "Sign Out"}</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="main">
          <header className="topbar">
            <span className="topbar-title">
              {NAV.find(n => n.href === pathname)?.label || "Dashboard"}
            </span>
            <div className="topbar-right">
              <div className="user-pill">
                <div className="user-avatar">RC</div>
                <span className="user-name">Admin</span>
              </div>
            </div>
          </header>
          <div className="page-content">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}