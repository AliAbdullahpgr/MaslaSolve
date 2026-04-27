"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { MS_TOKENS } from "~/lib/tokens";
import { MSGetCat, getIcon } from "~/lib/data";
import { StatusBadge, PriorityBadge } from "~/components/ui";
import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("~/components/leaflet-map"), { ssr: false, loading: () => <div style={{ width: "100%", height: "100%", background: "#e8e0d0" }} /> });
import { useIssues } from "~/lib/api";

const AREAS = ["All Lahore", "Gulberg", "DHA", "Cantt", "Old Lahore", "Iqbal Town", "Johar Town"];
const CATEGORIES = ["All types", "POTHOLE", "GARBAGE", "TRAFFIC", "STREETLIGHT", "SEWAGE", "WATER", "OTHER"];
const STATUSES = ["All", "REPORTED", "IN_PROGRESS", "RESOLVED"];
const PRIORITIES = ["All", "URGENT", "HIGH", "MEDIUM", "LOW"];

async function patchIssue(id: string, data: Record<string, string>) {
  const res = await fetch(`/api/issues/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update issue");
  return res.json();
}

export default function DashboardPage() {
  const T = MS_TOKENS;
  const { issues, loading } = useIssues();

  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("All Lahore");
  const [categoryFilter, setCategoryFilter] = useState("All types");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "map" | "analytics" | "crews">("inbox");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [localIssues, setLocalIssues] = useState<any[]>([]);
  React.useEffect(() => { setLocalIssues(issues); }, [issues]);

  const displayedIssues = useMemo(() => {
    return localIssues
      .map((issue: any) => ({
        ...issue,
        statusLower: issue.status.toLowerCase(),
        priorityLower: issue.priority.toLowerCase(),
        categoryLower: issue.category.toLowerCase(),
      }))
      .filter((i) => {
        if (areaFilter !== "All Lahore" && i.area !== areaFilter) return false;
        if (categoryFilter !== "All types" && i.category !== categoryFilter) return false;
        if (statusFilter !== "All" && i.status !== statusFilter) return false;
        if (priorityFilter !== "All" && i.priority !== priorityFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          if (!i.title?.toLowerCase().includes(q) && !i.area?.toLowerCase().includes(q) && !i.id?.toLowerCase().includes(q) && !i.location?.toLowerCase().includes(q)) return false;
        }
        return true;
      });
  }, [localIssues, areaFilter, categoryFilter, statusFilter, priorityFilter, search]);

  const selectedIssue = selectedId ? displayedIssues.find((i) => i.id === selectedId) ?? null : null;

  const openCount = localIssues.filter((i: any) => i.status === "REPORTED").length;
  const inProgressCount = localIssues.filter((i: any) => i.status === "IN_PROGRESS").length;
  const resolvedCount = localIssues.filter((i: any) => i.status === "RESOLVED").length;

  const doAction = async (id: string, data: Record<string, string>) => {
    setActionLoading(true);
    try {
      const updated = await patchIssue(id, data);
      setLocalIssues(prev => prev.map((i: any) => i.id === id ? { ...i, ...updated } : i));
    } catch { /* silent */ } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", height: "100vh", overflow: "hidden", background: T.ink[50], fontFamily: T.fontUI, color: T.ink[900], display: isMobile ? "flex" : "grid", flexDirection: isMobile ? "column" : undefined, gridTemplateColumns: isMobile ? undefined : "220px 1fr", position: "relative" }}>
      {/* Mobile top bar */}
      {isMobile && (
        <div style={{ background: T.ink[900], color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ all: "unset", cursor: "pointer", width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${T.blue[500]}, #6E48F0)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fontDisplay, fontWeight: 700, fontSize: 13 }}>M</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 14, fontWeight: 600 }}>MaslaSolve</div>
            <div style={{ fontFamily: T.fontMono, fontSize: 8, opacity: 0.55, letterSpacing: "0.1em" }}>LDA · ADMIN</div>
          </div>
        </div>
      )}

      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1500 }} />
      )}

      {/* Sidebar */}
      <aside style={{
        background: T.ink[900], color: "#fff", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 4, overflow: "auto",
        ...(isMobile ? {
          position: "fixed", top: 0, left: 0, bottom: 0, width: 260, zIndex: 1600,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
          boxShadow: sidebarOpen ? "0 0 30px rgba(0,0,0,0.4)" : "none",
        } : {}),
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.blue[500]}, #6E48F0)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.fontDisplay, fontWeight: 700 }}>M</div>
          <div>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 15, fontWeight: 600 }}>MaslaSolve</div>
            <div style={{ fontFamily: T.fontMono, fontSize: 9, opacity: 0.55, letterSpacing: "0.1em" }}>LDA · ADMIN</div>
          </div>
        </div>
        <div style={{ fontFamily: T.fontMono, fontSize: 9, opacity: 0.45, letterSpacing: "0.14em", padding: "8px 8px 4px" }}>OPERATIONS</div>
        {([
          { l: "Inbox", n: openCount, k: "inbox", i: "◆" },
          { l: "Map view", k: "map", i: "⌘" },
          { l: "Analytics", k: "analytics", i: "▤" },
          { l: "Crews", k: "crews", i: "⊞" },
        ] as const).map((item) => {
          const active = activeTab === item.k;
          return (
            <div
              key={item.l}
              onClick={() => { setActiveTab(item.k); setSidebarOpen(false); }}
              style={{ padding: "9px 10px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: active ? "rgba(255,255,255,0.1)" : "transparent", color: active ? "#fff" : "rgba(255,255,255,0.65)", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
            >
              <span style={{ width: 14, opacity: 0.7 }}>{item.i}</span>
              <span style={{ flex: 1 }}>{item.l}</span>
              {"n" in item && item.n != null && item.n > 0 && <span style={{ fontSize: 10, fontFamily: T.fontMono, padding: "1px 5px", background: T.urgent, borderRadius: 4 }}>{item.n}</span>}
            </div>
          );
        })}
        <div style={{ fontFamily: T.fontMono, fontSize: 9, opacity: 0.45, letterSpacing: "0.14em", padding: "20px 8px 4px" }}>AREAS</div>
        {AREAS.slice(1).map((a) => (
          <div
            key={a}
            onClick={() => setAreaFilter(a === areaFilter ? "All Lahore" : a)}
            style={{ padding: "7px 10px", fontSize: 12, color: areaFilter === a ? "#fff" : "rgba(255,255,255,0.6)", display: "flex", justifyContent: "space-between", cursor: "pointer", borderRadius: 6, background: areaFilter === a ? "rgba(255,255,255,0.12)" : "transparent" }}
          >
            <span>{a}</span>
            <span style={{ fontFamily: T.fontMono, fontSize: 10, opacity: 0.6 }}>{localIssues.filter((i: any) => i.area === a).length}</span>
          </div>
        ))}
        <div style={{ marginTop: "auto", padding: 10, background: "rgba(255,255,255,0.05)", borderRadius: 10, fontSize: 11 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>SLA this week</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 700 }}>
              {localIssues.length > 0 ? Math.round((resolvedCount / localIssues.length) * 100) : 0}%
            </span>
            <span style={{ color: T.resolved, fontSize: 11 }}>↑ resolved</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      {activeTab !== "inbox" ? (
        <main style={{
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5 }}>
            <defs>
              <pattern id="csDotGrid" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill={T.ink[200]} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#csDotGrid)" />
          </svg>

          <div style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            maxWidth: 480,
            padding: "0 24px",
          }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 99,
              background: T.blue[50],
              border: `1px solid ${T.blue[100]}`,
              color: T.blue[700],
              fontFamily: T.fontMono,
              fontSize: 10,
              letterSpacing: "0.18em",
              marginBottom: 24,
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                background: T.blue[600],
                boxShadow: `0 0 0 4px ${T.blue[100]}`,
                animation: "csPulse 1.6s ease-in-out infinite",
              }} />
              IN DEVELOPMENT
            </div>

            <h1 style={{
              margin: 0,
              fontFamily: T.fontDisplay,
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              color: T.ink[900],
            }}>
              Coming <span style={{ color: T.blue[600], fontStyle: "italic" }}>soon</span>
            </h1>

            <p style={{
              marginTop: 16,
              fontSize: 15,
              lineHeight: 1.55,
              color: T.ink[500],
            }}>
              {activeTab === "map" && "A live operational map view of every open issue across Lahore — with crew positions, route overlays, and SLA timers."}
              {activeTab === "analytics" && "Deeper analytics — resolution time trends, area performance breakdowns, category drill-downs, and exportable reports."}
              {activeTab === "crews" && "Crew management — assign teams, track active dispatches, log on-site reports, and balance load across districts."}
            </p>

            <div style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              marginTop: 28,
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: T.ink[200],
                  animation: `csDot 1.4s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>

            <button
              onClick={() => setActiveTab("inbox")}
              style={{
                all: "unset",
                cursor: "pointer",
                marginTop: 32,
                padding: "10px 18px",
                borderRadius: 10,
                background: T.ink[900],
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              ← Back to Inbox
            </button>
          </div>

          <style>{`
            @keyframes csPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
            @keyframes csDot { 0%, 100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.5); opacity: 1; background: ${T.blue[600]}; } }
          `}</style>
        </main>
      ) : (
      <main style={{ overflow: "auto", padding: isMobile ? "16px 14px 24px" : `20px ${selectedIssue ? 356 : 28}px 32px 28px`, transition: "padding 0.2s" }}>
        {/* Top bar */}
        <header style={{ display: "flex", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", marginBottom: 18, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
          <div>
            <div style={{ fontFamily: T.fontMono, fontSize: 10, color: T.ink[500], letterSpacing: "0.14em" }}>OPERATIONS / INBOX</div>
            <h1 style={{ margin: "2px 0 0", fontFamily: T.fontDisplay, fontSize: isMobile ? 22 : 28, fontWeight: 600, letterSpacing: "-0.02em" }}>
              Issues across Lahore <span style={{ color: T.ink[400], fontWeight: 400 }}>· today</span>
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", width: isMobile ? "100%" : "auto" }}>
            <div style={{ padding: "8px 14px", height: 38, borderRadius: 10, background: "#fff", border: `1px solid ${T.ink[200]}`, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.ink[500], width: isMobile ? "100%" : 220, boxSizing: "border-box" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search MS-ID, area…"
                style={{ all: "unset", flex: 1, fontSize: 13 }}
              />
              {search && <span onClick={() => setSearch("")} style={{ cursor: "pointer", color: T.ink[400] }}>×</span>}
            </div>
            <Link href="/report">
              <button style={{ all: "unset", cursor: "pointer", padding: "8px 14px", borderRadius: 10, background: T.ink[900], color: "#fff", fontSize: 13, fontWeight: 600 }}>
                + New Issue
              </button>
            </Link>
          </div>
        </header>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          <KPI label="Open issues" value={String(openCount)} delta={`${openCount} pending`} accent={T.urgent} />
          <KPI label="In progress" value={String(inProgressCount)} delta="active crews" accent={T.progress} />
          <KPI label="Resolved" value={String(resolvedCount)} delta={`${localIssues.length > 0 ? Math.round((resolvedCount / localIssues.length) * 100) : 0}% rate`} deltaPos accent={T.resolved} />
          <KPI label="Total issues" value={String(localIssues.length)} delta="all time" accent={T.blue[600]} />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: 10, background: "#fff", borderRadius: 12, border: `1px solid ${T.ink[200]}`, flexWrap: "wrap" }}>
          {[
            { l: "Area", v: areaFilter, opts: AREAS, set: setAreaFilter },
            { l: "Category", v: categoryFilter, opts: CATEGORIES, set: setCategoryFilter },
            { l: "Status", v: statusFilter, opts: STATUSES, set: setStatusFilter },
            { l: "Priority", v: priorityFilter, opts: PRIORITIES, set: setPriorityFilter },
          ].map((f) => (
            <select
              key={f.l}
              value={f.v}
              onChange={(e) => f.set(e.target.value)}
              style={{
                border: `1px solid ${T.ink[200]}`, borderRadius: 8, padding: "6px 10px", fontSize: 12,
                fontFamily: T.fontUI, background: T.ink[50], color: T.ink[900], cursor: "pointer", outline: "none",
              }}
            >
              {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 11, color: T.ink[500] }}>
            Showing <b style={{ color: T.ink[800] }}>{displayedIssues.length}</b> of <b style={{ color: T.ink[800] }}>{localIssues.length}</b>
          </div>
        </div>

        {/* Main grid: list + map */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: 16, marginBottom: 20 }}>
          {/* Issue list */}
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${T.ink[200]}`, overflow: "hidden" }}>
            {!isMobile && (
              <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 100px 100px 80px 60px", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${T.ink[100]}`, fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], letterSpacing: "0.1em" }}>
                <span>ID</span><span>ISSUE</span><span>AREA</span><span>STATUS</span><span>PRIORITY</span><span>VOTES</span>
              </div>
            )}
            <div style={{ maxHeight: 420, overflow: "auto" }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: "center", color: T.ink[400], fontSize: 13 }}>Loading…</div>
              ) : displayedIssues.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: T.ink[400], fontSize: 13 }}>No issues match filters</div>
              ) : (
                displayedIssues.map((i) => (
                  <DashRow key={i.id} issue={i} selected={selectedId === i.id} onClick={() => setSelectedId(i.id)} isMobile={isMobile} />
                ))
              )}
            </div>
          </div>

          {/* Heatmap */}
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${T.ink[200]}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.ink[100]}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], letterSpacing: "0.12em" }}>HEATMAP</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Problem density</div>
              </div>
            </div>
            <div style={{ flex: 1, position: "relative", minHeight: 280 }}>
              <LeafletMap
                center={[31.5204, 74.3587]}
                zoom={12}
                markers={displayedIssues
                  .filter((i) => i.lat != null && i.lng != null)
                  .map((i) => ({
                    id: i.id,
                    lat: i.lat,
                    lng: i.lng,
                    color: i.priorityLower === "urgent" ? T.urgent : i.statusLower === "resolved" ? T.resolved : T.progress,
                    title: i.title,
                    status: i.statusLower,
                    priority: i.priorityLower,
                    selected: selectedId === i.id,
                    onClick: () => setSelectedId(i.id),
                  }))}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Analytics row */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16 }}>
          <Card eyebrow="Analytics" title="Most affected areas">
            {AREAS.slice(1).map((area) => {
              const count = localIssues.filter((i: any) => i.area === area).length;
              const max = Math.max(1, ...AREAS.slice(1).map(a => localIssues.filter((i: any) => i.area === a).length));
              return (
                <div key={area} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: T.ink[800] }}>{area}</span>
                    <span style={{ fontFamily: T.fontMono, color: T.ink[500] }}>{count} issues</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: T.ink[100], overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: T.blue[600], transition: "width 0.3s" }} />
                  </div>
                </div>
              );
            })}
          </Card>

          <Card eyebrow="Analytics" title="Most common issues">
            {(() => {
              const cats = ["POTHOLE","GARBAGE","TRAFFIC","STREETLIGHT","SEWAGE","WATER","OTHER"];
              const counts = cats.map(c => ({ l: c.charAt(0) + c.slice(1).toLowerCase(), v: localIssues.filter((i: any) => i.category === c).length, c: MSGetCat(c.toLowerCase()).hue }));
              const total = Math.max(1, counts.reduce((s, c) => s + c.v, 0));
              return counts.filter(c => c.v > 0).map(r => (
                <div key={r.l} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: r.c }} />
                  <span style={{ flex: 1, color: T.ink[800] }}>{r.l}</span>
                  <span style={{ fontFamily: T.fontMono, color: T.ink[500] }}>{r.v} ({Math.round(r.v / total * 100)}%)</span>
                </div>
              ));
            })()}
          </Card>

          <Card eyebrow="Status" title="Issue breakdown">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { l: "Reported", v: openCount, c: T.urgent, bg: T.urgentSoft },
                { l: "In Progress", v: inProgressCount, c: T.progress, bg: T.progressSoft },
                { l: "Resolved", v: resolvedCount, c: T.resolved, bg: T.resolvedSoft },
              ].map(s => (
                <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: s.bg, borderRadius: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 99, background: s.c }} />
                  <span style={{ flex: 1, fontSize: 13, color: T.ink[800], fontWeight: 500 }}>{s.l}</span>
                  <span style={{ fontFamily: T.fontMono, fontSize: 16, fontWeight: 700, color: s.c }}>{s.v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
      )}

      {/* Detail drawer */}
      {activeTab === "inbox" && selectedIssue && (
        <DetailDrawer
          issue={selectedIssue}
          loading={actionLoading}
          onClose={() => setSelectedId(null)}
          onAction={(status) => doAction(selectedIssue.id, { status })}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

function KPI({ label, value, delta, deltaPos, accent }: { label: string; value: string; delta: string; deltaPos?: boolean; accent: string }) {
  const T = MS_TOKENS;
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: `1px solid ${T.ink[200]}`, borderLeft: `3px solid ${accent}` }}>
      <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], letterSpacing: "0.12em" }}>{label.toUpperCase()}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>{value}</div>
        <div style={{ fontSize: 11, color: deltaPos ? T.resolved : T.ink[500] }}>{delta}</div>
      </div>
    </div>
  );
}

function DashRow({ issue, selected, onClick, isMobile }: { issue: any; selected: boolean; onClick: () => void; isMobile?: boolean }) {
  const T = MS_TOKENS;
  const cat = MSGetCat(issue.categoryLower);
  const Icon = getIcon(cat.icon);

  if (isMobile) {
    return (
      <div
        onClick={onClick}
        style={{
          padding: "12px 14px", borderBottom: `1px solid ${T.ink[100]}`,
          cursor: "pointer", background: selected ? T.blue[50] : "transparent",
          display: "flex", flexDirection: "column", gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: cat.hue + "18", color: cat.hue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon s={14} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink[900], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{issue.title}</div>
            <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], marginTop: 1 }}>…{issue.id.slice(-4)} · {issue.area}</div>
          </div>
          <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.ink[700], flexShrink: 0 }}>▲ {issue.upvotes}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <StatusBadge status={issue.statusLower} size="sm" />
          <PriorityBadge priority={issue.priorityLower} size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: "grid", gridTemplateColumns: "50px 1fr 100px 100px 80px 60px", gap: 10,
        padding: "10px 14px", borderBottom: `1px solid ${T.ink[100]}`, alignItems: "center", fontSize: 12,
        cursor: "pointer", background: selected ? T.blue[50] : "transparent",
        transition: "background 0.1s",
      }}
    >
      <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.ink[500] }}>…{issue.id.slice(-4)}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: cat.hue + "18", color: cat.hue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon s={14} />
        </div>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.ink[900], fontWeight: 500 }}>{issue.title}</span>
      </div>
      <span style={{ color: T.ink[600], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{issue.area}</span>
      <StatusBadge status={issue.statusLower} size="sm" />
      <PriorityBadge priority={issue.priorityLower} size="sm" />
      <span style={{ fontFamily: T.fontMono, color: T.ink[700], textAlign: "right" }}>▲ {issue.upvotes}</span>
    </div>
  );
}

function Card({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  const T = MS_TOKENS;
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${T.ink[200]}`, padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], letterSpacing: "0.12em" }}>{eyebrow.toUpperCase()}</div>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 16, fontWeight: 600 }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function DetailDrawer({ issue, loading, onClose, onAction, isMobile }: { issue: any; loading: boolean; onClose: () => void; onAction: (status: string) => void; isMobile?: boolean }) {
  const T = MS_TOKENS;
  return (
    <>
    {isMobile && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999 }} />}
    <div style={{
      position: "fixed",
      background: "#fff", border: `1px solid ${T.ink[200]}`, boxShadow: T.shadow.lg,
      overflow: "hidden", display: "flex", flexDirection: "column", zIndex: 1000,
      ...(isMobile ? {
        left: 0, right: 0, bottom: 0, top: 80,
        borderRadius: "18px 18px 0 0",
      } : {
        top: 12, right: 12, bottom: 12, width: 320,
        borderRadius: 14,
      }),
    }}>
      <div style={{ padding: 12, borderBottom: `1px solid ${T.ink[100]}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.ink[600], background: T.ink[100], padding: "3px 6px", borderRadius: 4 }}>
          …{issue.id.slice(-4)}
        </span>
        <PriorityBadge priority={issue.priorityLower} size="sm" />
        <span style={{ marginLeft: "auto", cursor: "pointer", color: T.ink[500], fontSize: 18, lineHeight: 1 }} onClick={onClose}>✕</span>
      </div>
      <div style={{ height: 130, background: `url(${issue.photo}) center/cover, ${T.ink[100]}`, position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", left: 10, bottom: 10 }}>
          <StatusBadge status={issue.statusLower} size="sm" />
        </div>
      </div>
      <div style={{ padding: 14, overflow: "auto", flex: 1 }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>{issue.title}</div>
        <div style={{ fontSize: 11, color: T.ink[500], marginTop: 4 }}>{issue.location}</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 12, fontSize: 11 }}>
          {[
            { l: "UPVOTES", v: issue.upvotes },
            { l: "AREA", v: issue.area ?? "—" },
            { l: "STATUS", v: issue.statusLower?.replace("_", " ") ?? "—" },
          ].map(s => (
            <div key={s.l} style={{ padding: 8, background: T.ink[50], borderRadius: 8 }}>
              <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], letterSpacing: "0.08em" }}>{s.l}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{s.v}</div>
            </div>
          ))}
        </div>

        {issue.description && (
          <div style={{ marginTop: 12, fontSize: 12, color: T.ink[700], lineHeight: 1.4, padding: "8px 10px", background: T.ink[50], borderRadius: 8 }}>
            {issue.description}
          </div>
        )}

        <div style={{ marginTop: 14, fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], letterSpacing: "0.12em" }}>ACTIONS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
          {issue.status !== "IN_PROGRESS" && issue.status !== "RESOLVED" && (
            <button
              onClick={() => onAction("IN_PROGRESS")}
              disabled={loading}
              style={{ all: "unset", cursor: loading ? "wait" : "pointer", padding: "10px 12px", borderRadius: 10, background: T.progress, color: "#fff", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 8, opacity: loading ? 0.7 : 1 }}
            >
              <span>▶</span> Mark as in progress
            </button>
          )}
          {issue.status !== "RESOLVED" && (
            <button
              onClick={() => onAction("RESOLVED")}
              disabled={loading}
              style={{ all: "unset", cursor: loading ? "wait" : "pointer", padding: "10px 12px", borderRadius: 10, background: T.resolved, color: "#fff", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 8, opacity: loading ? 0.7 : 1 }}
            >
              <span>✓</span> Mark as resolved
            </button>
          )}
          {issue.status !== "REPORTED" && (
            <button
              onClick={() => onAction("REPORTED")}
              disabled={loading}
              style={{ all: "unset", cursor: loading ? "wait" : "pointer", padding: "10px 12px", borderRadius: 10, background: "#fff", border: `1px dashed ${T.ink[300]}`, color: T.ink[700], fontWeight: 500, fontSize: 13, display: "flex", alignItems: "center", gap: 8, opacity: loading ? 0.7 : 1 }}
            >
              <span>↩</span> Reopen
            </button>
          )}
          <Link href={`/issue/${issue.id}`}>
            <button style={{ all: "unset", cursor: "pointer", width: "100%", padding: "8px", borderRadius: 8, background: T.ink[50], textAlign: "center", fontSize: 12, boxSizing: "border-box" }}>
              View full details →
            </button>
          </Link>
        </div>

        <div style={{ marginTop: 14, fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], letterSpacing: "0.12em" }}>AI BRIEF</div>
        <div style={{ marginTop: 6, padding: 10, borderRadius: 10, background: T.blue[50], border: `1px solid ${T.blue[100]}`, fontSize: 12, color: T.blue[700], lineHeight: 1.4 }}>
          <b>✱ Category:</b> {MSGetCat(issue.categoryLower).label} · Priority: {issue.priorityLower} · Area: {issue.area ?? "Unknown"}
        </div>
      </div>
    </div>
    </>
  );
}
