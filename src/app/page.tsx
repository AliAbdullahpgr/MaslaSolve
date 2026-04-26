"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { MS_TOKENS } from "~/lib/tokens";
import { MSGetCat, getIcon } from "~/lib/data";
import { StatusBadge, PriorityBadge, Upvote, IconBtn } from "~/components/ui";
import { LahoreMap, MapPin } from "~/components/map";
import { useIssues } from "~/lib/api";

const LAT_MIN = 31.45, LAT_MAX = 31.59;
const LNG_MIN = 74.27, LNG_MAX = 74.46;
const SVG_X_MIN = 160, SVG_X_MAX = 840;
const SVG_Y_MIN = 210, SVG_Y_MAX = 580;

function projectLatLng(lat: number | null | undefined, lng: number | null | undefined, idx = 0) {
  if (lat == null || lng == null) {
    const cols = 4;
    const x = SVG_X_MIN + ((idx % cols) + 0.5) * ((SVG_X_MAX - SVG_X_MIN) / cols);
    const y = SVG_Y_MIN + (Math.floor(idx / cols) + 0.5) * 80;
    return { x, y };
  }
  const tx = (lng - LNG_MIN) / (LNG_MAX - LNG_MIN);
  const ty = 1 - (lat - LAT_MIN) / (LAT_MAX - LAT_MIN);
  const x = SVG_X_MIN + tx * (SVG_X_MAX - SVG_X_MIN);
  const y = SVG_Y_MIN + ty * (SVG_Y_MAX - SVG_Y_MIN);
  return { x, y };
}

export default function HomePage() {
  const [view, setView] = useState<"map" | "list">("map");
  const [filter, setFilter] = useState<"all" | "urgent" | "mine">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const { data: session } = useSession();

  const { issues, loading } = useIssues(
    filter === "urgent" ? { priority: "URGENT" } : undefined
  );

  const allMapped = useMemo(() => issues.map((issue: any, idx: number) => ({
    ...issue,
    status: issue.status.toLowerCase(),
    priority: issue.priority.toLowerCase(),
    category: issue.category.toLowerCase(),
    distance: "0.5 km",
    coords: projectLatLng(issue.lat, issue.lng, idx),
  })), [issues]);

  const displayedIssues = useMemo(() => {
    let list = allMapped;
    if (filter === "mine" && session?.user?.id) {
      list = list.filter((i: any) => i.reporterId === session.user.id);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i: any) =>
        i.title?.toLowerCase().includes(q) ||
        i.location?.toLowerCase().includes(q) ||
        i.area?.toLowerCase().includes(q) ||
        i.id?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allMapped, filter, search, session]);

  const selectedIssue =
    displayedIssues.find((i: any) => i.id === selectedId) ?? displayedIssues[0];

  return (
    <div
      className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden"
      style={{
        background: MS_TOKENS.paper,
        fontFamily: MS_TOKENS.fontUI,
        color: MS_TOKENS.ink[900],
      }}
    >
      {/* Top header */}
      <div
        style={{
          padding: "14px 18px 10px",
          background: MS_TOKENS.paper,
          borderBottom: `1px solid ${MS_TOKENS.ink[100]}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: MS_TOKENS.fontMono, fontSize: 10, color: MS_TOKENS.ink[500], letterSpacing: "0.14em" }}>
              LAHORE · GULBERG III
            </div>
            <div style={{ fontFamily: MS_TOKENS.fontDisplay, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 1 }}>
              Assalam-o-alaikum,{" "}
              <span style={{ color: MS_TOKENS.blue[600] }}>
                {session?.user?.name?.split(" ")[0] ?? "Guest"}
              </span>
            </div>
          </div>
          <div
            style={{
              width: 38, height: 38, borderRadius: 99,
              background: MS_TOKENS.ink[900], color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: MS_TOKENS.fontDisplay, fontWeight: 600, fontSize: 14,
              cursor: "pointer",
            }}
            onClick={() => {
              if (session) window.location.href = "/api/auth/signout";
              else window.location.href = "/auth/signin";
            }}
          >
            {session?.user?.name?.split(" ").map((n: string) => n[0]).join("") ?? "?"}
          </div>
        </div>

        {/* Search bar */}
        <div
          style={{
            marginTop: 12, height: 42, borderRadius: 12,
            background: "#fff", border: `1px solid ${searchActive ? MS_TOKENS.blue[600] : MS_TOKENS.ink[200]}`,
            display: "flex", alignItems: "center", padding: "0 12px", gap: 10,
            transition: "border-color 0.15s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MS_TOKENS.ink[500]} strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchActive(true)}
            onBlur={() => setSearchActive(false)}
            placeholder="Search issues, areas, MS-IDs…"
            style={{
              all: "unset", flex: 1, fontSize: 14,
              color: MS_TOKENS.ink[900],
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ all: "unset", cursor: "pointer", color: MS_TOKENS.ink[400], fontSize: 16, lineHeight: 1 }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Map / List toggle */}
      <div style={{ padding: "12px 18px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "inline-flex", background: MS_TOKENS.ink[100], borderRadius: 10, padding: 3, gap: 2 }}>
          {([{ k: "map" as const, l: "Map" }, { k: "list" as const, l: "List" }]).map((o) => (
            <button
              key={o.k}
              onClick={() => setView(o.k)}
              style={{
                all: "unset", cursor: "pointer", padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: view === o.k ? "#fff" : "transparent",
                color: view === o.k ? MS_TOKENS.ink[900] : MS_TOKENS.ink[500],
                boxShadow: view === o.k ? MS_TOKENS.shadow.sm : "none",
              }}
            >
              {o.l}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "urgent", "mine"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                all: "unset", cursor: "pointer", padding: "6px 11px", borderRadius: 99, fontSize: 12, fontWeight: 500,
                background: filter === f ? MS_TOKENS.ink[900] : "transparent",
                color: filter === f ? "#fff" : MS_TOKENS.ink[600],
                border: `1px solid ${filter === f ? MS_TOKENS.ink[900] : MS_TOKENS.ink[200]}`,
              }}
            >
              {f === "all" ? "All" : f === "urgent" ? "Urgent" : "Mine"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 40, height: 40, border: `3px solid ${MS_TOKENS.ink[100]}`, borderTopColor: MS_TOKENS.blue[600], borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ color: MS_TOKENS.ink[500], fontSize: 14 }}>Loading issues...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Map view */}
          {view === "map" && (
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0 }}>
                <LahoreMap width="100%" height="100%" viewBox="120 180 740 420" interactive>
                  {displayedIssues.map((i: any) => {
                    const cat = MSGetCat(i.category);
                    const isUrgent = i.priority === "urgent";
                    const isSelected = selectedIssue?.id === i.id;
                    const color =
                      i.status === "resolved" ? MS_TOKENS.resolved
                      : i.status === "in_progress" ? MS_TOKENS.progress
                      : isUrgent ? MS_TOKENS.urgent
                      : cat.hue;
                    return (
                      <g key={i.id} style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setSelectedId(i.id); }}>
                        {isSelected && (
                          <circle cx={i.coords.x} cy={i.coords.y - 12} r={26} fill="none" stroke={color} strokeWidth={2} opacity={0.6} />
                        )}
                        <MapPin x={i.coords.x} y={i.coords.y} color={color} pulse={isUrgent && i.status !== "resolved"} glyph={cat.label[0]} size={isSelected ? 28 : 22} />
                      </g>
                    );
                  })}
                </LahoreMap>
              </div>

              <AIBanner urgentCount={displayedIssues.filter((i: any) => i.priority === "urgent" && i.status !== "resolved").length} totalCount={displayedIssues.length} />
              {selectedIssue && <BottomSheetCard issue={selectedIssue} />}

              <div style={{ position: "absolute", right: 14, top: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <IconBtn label="Layers">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /><path d="M3 18l9 5 9-5" />
                  </svg>
                </IconBtn>
                <IconBtn label="Locate">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                  </svg>
                </IconBtn>
              </div>

              {/* zoom hint */}
              <div style={{ position: "absolute", left: 14, bottom: 100, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)", padding: "4px 10px", borderRadius: 8, fontSize: 10, color: MS_TOKENS.ink[500], fontFamily: MS_TOKENS.fontMono, letterSpacing: "0.06em", pointerEvents: "none" }}>
                DRAG · PINCH TO ZOOM
              </div>
            </div>
          )}

          {/* List view */}
          {view === "list" && (
            <div style={{ flex: 1, overflow: "auto", padding: "4px 14px 100px" }}>
              <div style={{ margin: "4px 4px 10px", fontFamily: MS_TOKENS.fontMono, fontSize: 10, color: MS_TOKENS.ink[500], letterSpacing: "0.12em" }}>
                {search ? `RESULTS FOR "${search.toUpperCase()}" · ` : "NEARBY · RANKED BY PRIORITY · "}
                {displayedIssues.length} ISSUES
              </div>
              {displayedIssues.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: MS_TOKENS.ink[400] }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
                  <div style={{ fontSize: 14 }}>No issues found</div>
                </div>
              ) : (
                displayedIssues.map((i: any, idx: number) => (
                  <IssueCard key={i.id} issue={i} rank={idx + 1} />
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* FAB */}
      <Link href="/report">
        <button
          style={{
            all: "unset", cursor: "pointer", position: "absolute", right: 18, bottom: 22,
            height: 56, padding: "0 22px 0 18px", borderRadius: 99,
            background: MS_TOKENS.blue[600], color: "#fff",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 14px 28px -8px rgba(31,111,235,0.45), 0 4px 8px rgba(11,26,36,0.12)",
            fontFamily: MS_TOKENS.fontDisplay, fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em", zIndex: 10,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Report Issue
        </button>
      </Link>
    </div>
  );
}

function AIBanner({ urgentCount = 0, totalCount = 0 }: { urgentCount?: number; totalCount?: number }) {
  const T = MS_TOKENS;
  return (
    <div style={{ position: "absolute", left: 14, right: 14, top: 14, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)", border: `1px solid ${T.ink[200]}`, display: "flex", alignItems: "center", gap: 10, boxShadow: T.shadow.sm, pointerEvents: "none" }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${T.blue[600]}, #6E48F0)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: T.fontMono, fontWeight: 700, fontSize: 11 }}>
        ✱
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.ink[900] }}>{urgentCount} urgent {urgentCount === 1 ? "issue" : "issues"} within 1 km</div>
        <div style={{ fontSize: 11, color: T.ink[500] }}>AI grouped {totalCount} reports across the city</div>
      </div>
      <span style={{ fontFamily: T.fontMono, fontSize: 9, padding: "3px 6px", background: T.ink[100], color: T.ink[600], borderRadius: 4, letterSpacing: "0.08em" }}>AI · 96%</span>
    </div>
  );
}

function BottomSheetCard({ issue }: { issue: any }) {
  const T = MS_TOKENS;
  return (
    <Link href={`/issue/${issue.id}`}>
      <div style={{ position: "absolute", left: 14, right: 14, bottom: 90, background: "#fff", borderRadius: 18, padding: 12, display: "flex", gap: 12, alignItems: "center", boxShadow: T.shadow.lg, cursor: "pointer", border: `1px solid ${T.ink[100]}` }}>
        <div style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: T.urgent }} />
        <div style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: `url(${issue.photo}) center/cover, ${T.ink[100]}` }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 3 }}>
            <PriorityBadge priority={issue.priority} size="sm" />
            <StatusBadge status={issue.status} size="sm" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink[900], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>
            {issue.title}
          </div>
          <div style={{ fontSize: 11, color: T.ink[500], marginTop: 1 }}>{issue.distance} · {issue.upvotes} upvotes</div>
        </div>
        <div style={{ width: 4, height: 32, borderRadius: 99, background: T.ink[200] }} />
      </div>
    </Link>
  );
}

function IssueCard({ issue, rank }: { issue: any; rank: number }) {
  const T = MS_TOKENS;
  const cat = MSGetCat(issue.category);
  const Icon = getIcon(cat.icon);
  return (
    <Link href={`/issue/${issue.id}`}>
      <div style={{ background: "#fff", borderRadius: 18, marginBottom: 12, border: `1px solid ${T.ink[100]}`, overflow: "hidden", boxShadow: T.shadow.sm, cursor: "pointer" }}>
        <div style={{ display: "flex", gap: 12, padding: 12 }}>
          <div style={{ position: "relative", width: 84, height: 84, flexShrink: 0 }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 12, background: `url(${issue.photo}) center/cover, ${T.ink[100]}` }} />
            <div style={{ position: "absolute", top: 6, left: 6, width: 22, height: 22, borderRadius: 6, background: "rgba(11,26,36,0.78)", color: "#fff", fontFamily: T.fontMono, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
              #{rank}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
              <PriorityBadge priority={issue.priority} size="sm" />
              <StatusBadge status={issue.status} size="sm" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink[900], lineHeight: 1.3, marginBottom: 3 }}>{issue.title}</div>
            <div style={{ fontSize: 11, color: T.ink[500], display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: cat.hue, display: "inline-flex" }}><Icon s={12} /></span>
              <span>{cat.label}</span>
              <span style={{ color: T.ink[300] }}>·</span>
              <span>{issue.distance}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderTop: `1px solid ${T.ink[100]}`, background: T.ink[50] }}>
          <div style={{ fontSize: 11, color: T.ink[500] }}>
            <span style={{ fontFamily: T.fontMono, color: T.ink[700] }}>MS-{issue.id.slice(-4)}</span>
            <span style={{ margin: "0 6px", color: T.ink[300] }}>·</span>
            {issue.location}
          </div>
          <Upvote count={issue.upvotes} voted={false} size="sm" />
        </div>
      </div>
    </Link>
  );
}
