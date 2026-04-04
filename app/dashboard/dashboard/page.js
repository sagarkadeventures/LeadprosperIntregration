"use client";
import { useState, useEffect, useMemo } from "react";

// ── Masked field component ────────────────────────────────
function MaskedField({ value, label }) {
  const [show, setShow] = useState(false);
  const masked = value ? "•".repeat(Math.min(value.toString().length, 12)) : "—";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: show ? "inherit" : "monospace", color: show ? "#e2e8f0" : "#94a3b8", fontSize: 13 }}>
        {show ? value : masked}
      </span>
      <button onClick={() => setShow(!show)} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "#64748b", padding: "2px", display: "flex", transition: "color 0.2s"
      }}
        onMouseEnter={e => e.target.style.color = "#94a3b8"}
        onMouseLeave={e => e.target.style.color = "#64748b"}
      >
        {show
          ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
          : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        }
      </button>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    ACCEPTED:  { bg: "rgba(34,197,94,0.12)",  color: "#4ade80",  label: "Accepted" },
    REJECTED:  { bg: "rgba(239,68,68,0.12)",  color: "#f87171",  label: "Rejected" },
    DUPLICATED:{ bg: "rgba(234,179,8,0.12)",  color: "#facc15",  label: "Duplicate" },
    ERROR:     { bg: "rgba(239,68,68,0.12)",  color: "#f87171",  label: "Error" },
    TIMEOUT:   { bg: "rgba(148,163,184,0.12)",color: "#94a3b8",  label: "Timeout" },
    PENDING:   { bg: "rgba(99,102,241,0.12)", color: "#818cf8",  label: "Pending" },
  };
  const s = styles[status] || styles.PENDING;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "3px 10px", borderRadius: 99,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.3px",
      display: "inline-block",
    }}>{s.label}</span>
  );
}

// ── Stat card ─────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16,
      padding: "20px 24px",
      display: "flex",
      alignItems: "flex-start",
      gap: 16,
      transition: "all 0.2s",
      cursor: "default",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: `${color}20`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: color, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <p style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [leads, setLeads]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("ALL");
  const [sortKey, setSortKey]     = useState("created_at");
  const [sortDir, setSortDir]     = useState("desc");
  const [month, setMonth]         = useState("");
  const [page, setPage]           = useState(1);
  const PER_PAGE = 15;

  useEffect(() => {
    fetch("/api/leads")
      .then(r => r.json())
      .then(d => { setLeads(d.leads || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Stats ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const total    = leads.length;
    const accepted = leads.filter(l => l.status === "ACCEPTED").length;
    const revenue  = leads.reduce((s, l) => s + (l.price || 0), 0);
    const rate     = total ? ((accepted / total) * 100).toFixed(1) : 0;
    return { total, accepted, revenue, rate };
  }, [leads]);

  // ── Filter + sort ─────────────────────────────────────
  const filtered = useMemo(() => {
    let data = [...leads];

    if (month) {
      data = data.filter(l => {
        const d = new Date(l.created_at);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}` === month;
      });
    }

    if (statusFilter !== "ALL") data = data.filter(l => l.status === statusFilter);

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(l =>
        l.first_name?.toLowerCase().includes(q) ||
        l.last_name?.toLowerCase().includes(q)  ||
        l.email?.toLowerCase().includes(q)       ||
        l.state?.toLowerCase().includes(q)
      );
    }

    data.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === "created_at") { av = new Date(av); bv = new Date(bv); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [leads, search, statusFilter, month, sortKey, sortDir]);

  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ col }) {
    if (sortKey !== col) return <span style={{color:"#334155"}}>↕</span>;
    return <span style={{color:"#60a5fa"}}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  // ── Month options ─────────────────────────────────────
  const months = useMemo(() => {
    const seen = new Set();
    leads.forEach(l => {
      const d = new Date(l.created_at);
      seen.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
    });
    return Array.from(seen).sort().reverse();
  }, [leads]);

  const TH = ({ children, col, style }) => (
    <th onClick={col ? () => toggleSort(col) : undefined} style={{
      padding: "12px 16px", textAlign: "left",
      fontSize: 11, fontWeight: 700, color: "#64748b",
      textTransform: "uppercase", letterSpacing: "0.5px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      cursor: col ? "pointer" : "default",
      userSelect: "none", whiteSpace: "nowrap",
      ...style
    }}>
      {children} {col && <SortIcon col={col} />}
    </th>
  );

  return (
    <>
      <style>{`
        .dash-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        @media(max-width:1100px) { .dash-grid { grid-template-columns: repeat(2,1fr); } }
        @media(max-width:600px)  { .dash-grid { grid-template-columns: 1fr; } }

        .table-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          overflow: hidden;
        }

        .table-filters {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-wrap: wrap;
          align-items: center;
        }

        .filter-input, .filter-select {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 8px 14px;
          color: #e2e8f0;
          font-size: 13px;
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s;
        }
        .filter-input { flex: 1; min-width: 200px; }
        .filter-input::placeholder { color: #475569; }
        .filter-input:focus, .filter-select:focus { border-color: rgba(99,179,237,0.4); }

        .table-wrap { overflow-x: auto; }

        table { width: 100%; border-collapse: collapse; }

        tbody tr {
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background 0.15s;
        }
        tbody tr:hover { background: rgba(255,255,255,0.03); }

        td { padding: 12px 16px; font-size: 13px; color: #94a3b8; }
        td .primary { color: #e2e8f0; font-weight: 600; }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
          font-size: 12px;
          color: #64748b;
        }

        .page-btns { display: flex; gap: 6px; }
        .page-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 6px 12px;
          color: #94a3b8;
          cursor: pointer;
          font-size: 12px;
          font-family: inherit;
          transition: all 0.2s;
        }
        .page-btn:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }
        .page-btn.active { background: rgba(59,130,246,0.2); border-color: rgba(59,130,246,0.4); color: #60a5fa; }
        .page-btn:disabled { opacity: 0.4; cursor: default; }

        .section-title {
          font-size: 15px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.06);
        }
      `}</style>

      {/* Stats */}
      <div className="dash-grid">
        <StatCard label="Total Leads" value={stats.total.toLocaleString()} sub="All time" color="#3b82f6"
          icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
        />
        <StatCard label="Accepted" value={stats.accepted.toLocaleString()} sub={`${stats.rate}% rate`} color="#22c55e"
          icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <StatCard label="Revenue" value={`$${stats.revenue.toFixed(2)}`} sub="Total earned" color="#f59e0b"
          icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <StatCard label="Conversion" value={`${stats.rate}%`} sub="Accept rate" color="#a78bfa"
          icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>}
        />
      </div>

      {/* Table */}
      <p className="section-title">Lead History</p>

      <div className="table-card">
        <div className="table-filters">
          <input
            className="filter-input"
            placeholder="🔍 Search by name, email, state..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="filter-select" value={month} onChange={e => { setMonth(e.target.value); setPage(1); }}>
            <option value="">All Months</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="filter-select" value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="ALL">All Status</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="DUPLICATED">Duplicate</option>
            <option value="ERROR">Error</option>
            <option value="TIMEOUT">Timeout</option>
          </select>
          <span style={{ color: "#475569", fontSize: 12, marginLeft: "auto" }}>
            {filtered.length} results
          </span>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#475569" }}>Loading leads...</div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#475569" }}>No leads found.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <TH col="created_at">Date</TH>
                  <TH>Name</TH>
                  <TH col="email">Email</TH>
                  <TH col="state">State</TH>
                  <TH col="loan_amount">Loan</TH>
                  <TH>Bank</TH>
                  <TH col="status">Status</TH>
                  <TH col="price">Revenue</TH>
                </tr>
              </thead>
              <tbody>
                {paginated.map((lead, i) => (
                  <tr key={lead._id || i}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {new Date(lead.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
                    </td>
                    <td>
                      <span className="primary">{lead.first_name} {lead.last_name}</span>
                    </td>
                    <td>
                      <MaskedField value={lead.email} />
                    </td>
                    <td>{lead.state || "—"}</td>
                    <td>
                      <span className="primary">${(lead.loan_amount || 0).toLocaleString()}</span>
                    </td>
                    <td>
                      <MaskedField value={lead.lead_payload?.bank_name} />
                    </td>
                    <td><StatusBadge status={lead.status} /></td>
                    <td style={{ color: lead.price ? "#4ade80" : "#475569" }}>
                      {lead.price ? `$${parseFloat(lead.price).toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <span>Page {page} of {totalPages}</span>
            <div className="page-btns">
              <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
              <button className="page-btn" onClick={() => setPage(p => p-1)} disabled={page === 1}>‹</button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                if (p < 1 || p > totalPages) return null;
                return <button key={p} className={`page-btn ${p === page ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>;
              })}
              <button className="page-btn" onClick={() => setPage(p => p+1)} disabled={page === totalPages}>›</button>
              <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}