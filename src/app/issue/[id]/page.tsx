"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { MS_TOKENS } from "~/lib/tokens";
import { MSGetCat, getIcon } from "~/lib/data";
import { StatusBadge, PriorityBadge, SectionHead } from "~/components/ui";
import { LahoreMap, MapPin } from "~/components/map";
import { useIssue, toggleVote, addComment } from "~/lib/api";

export default function DetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { issue, loading, error } = useIssue(id);
  const { data: session } = useSession();
  const [voted, setVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (issue) {
      setVoteCount(issue.upvotes ?? 0);
      setComments(issue.comments ?? []);
    }
  }, [issue]);

  const handleVote = async () => {
    if (!session?.user?.id) {
      window.location.href = "/auth/signin";
      return;
    }
    try {
      const res = await toggleVote(id, session.user.id);
      setVoted(res.voted);
      setVoteCount(c => res.voted ? c + 1 : c - 1);
    } catch { /* silent */ }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    if (!session?.user?.id) {
      window.location.href = "/auth/signin";
      return;
    }
    setSubmittingComment(true);
    try {
      const newComment = await addComment(id, commentText.trim(), session.user.id);
      setComments(prev => [newComment, ...prev]);
      setCommentText("");
    } catch { /* silent */ } finally {
      setSubmittingComment(false);
    }
  };

  if (loading || !issue) {
    return (
      <div className="mx-auto flex h-[100dvh] max-w-md items-center justify-center" style={{ background: MS_TOKENS.paper }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${MS_TOKENS.ink[100]}`, borderTopColor: MS_TOKENS.blue[600], borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ color: MS_TOKENS.ink[500], fontSize: 14 }}>{error ? "Failed to load issue." : "Loading issue..."}</span>
        </div>
      </div>
    );
  }

  const cat = MSGetCat(issue.category.toLowerCase());
  const CatIcon = getIcon(cat.icon);
  const isResolved = issue.status === "RESOLVED";

  const coords = (() => {
    const LAT_MIN = 31.45, LAT_MAX = 31.59, LNG_MIN = 74.27, LNG_MAX = 74.46;
    const X_MIN = 160, X_MAX = 840, Y_MIN = 210, Y_MAX = 580;
    if (issue.lat == null || issue.lng == null) return { x: 500, y: 395 };
    const tx = (issue.lng - LNG_MIN) / (LNG_MAX - LNG_MIN);
    const ty = 1 - (issue.lat - LAT_MIN) / (LAT_MAX - LAT_MIN);
    return { x: X_MIN + tx * (X_MAX - X_MIN), y: Y_MIN + ty * (Y_MAX - Y_MIN) };
  })();

  const timeline = issue.timeline?.length > 0
    ? issue.timeline.map((t: any) => ({ t: t.label, at: t.note || new Date(t.timestamp).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), done: t.done, note: t.note }))
    : [
        { t: "Reported", at: new Date(issue.createdAt).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), done: true },
        { t: "Verified", at: "—", done: false },
        { t: "In Progress", at: "—", done: issue.status === "IN_PROGRESS" || issue.status === "RESOLVED", note: issue.status !== "REPORTED" ? "Assigned to crew" : undefined },
        { t: "Resolved", at: isResolved ? new Date(issue.updatedAt).toLocaleString("en-PK", { day: "numeric", month: "short" }) : "ETA pending", done: isResolved },
      ];

  const reporterName = issue.isAnonymous ? "Anonymous" : (issue.reporter?.name ?? "Anonymous");

  return (
    <div className="mx-auto h-[100dvh] max-w-md overflow-auto" style={{ background: MS_TOKENS.paper, fontFamily: MS_TOKENS.fontUI, color: MS_TOKENS.ink[900], position: "relative" }}>
      {/* Hero image */}
      <div style={{ position: "relative", height: 280, overflow: "hidden", background: `url(${issue.photo}) center/cover, ${MS_TOKENS.ink[300]}` }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(11,26,36,0.5) 0%, transparent 30%, transparent 70%, rgba(11,26,36,0.6) 100%)" }} />
        <Link href="/">
          <button style={{ all: "unset", cursor: "pointer", position: "absolute", left: 14, top: 14, width: 38, height: 38, borderRadius: 99, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MS_TOKENS.ink[900]} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        </Link>
        <div style={{ position: "absolute", right: 14, top: 14, display: "flex", gap: 8 }}>
          {["share", "bookmark"].map((k) => (
            <div key={k} style={{ width: 38, height: 38, borderRadius: 99, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", color: MS_TOKENS.ink[900], cursor: "pointer" }}
              onClick={() => k === "share" && navigator.share?.({ title: issue.title, url: window.location.href }).catch(() => {})}
            >
              {k === "share" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 4h12v18l-6-4-6 4z" />
                </svg>
              )}
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 14, bottom: 12, display: "flex", gap: 6 }}>
          <PriorityBadge priority={issue.priority} />
          <StatusBadge status={issue.status} />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 18px 110px" }}>
        {/* ID + category */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontFamily: MS_TOKENS.fontMono, fontSize: 11, color: MS_TOKENS.ink[600], background: MS_TOKENS.ink[100], padding: "3px 7px", borderRadius: 5 }}>
            {issue.id}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: MS_TOKENS.ink[600] }}>
            <span style={{ color: cat.hue, display: "inline-flex" }}><CatIcon s={14} /></span>
            {cat.label}
          </span>
        </div>

        {/* Title */}
        <h1 style={{ margin: 0, fontFamily: MS_TOKENS.fontDisplay, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          {issue.title}
        </h1>

        {/* Reporter & location */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, fontSize: 12, color: MS_TOKENS.ink[600] }}>
          <div style={{ width: 24, height: 24, borderRadius: 99, background: MS_TOKENS.blue[100], color: MS_TOKENS.blue[700], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
            {reporterName.split(" ").map((s: string) => s[0]).join("")}
          </div>
          <span>
            <b style={{ color: MS_TOKENS.ink[800] }}>{reporterName}</b>
            {" · "}{new Date(issue.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
          </span>
          <span style={{ color: MS_TOKENS.ink[300] }}>·</span>
          <span>{issue.location}</span>
        </div>

        {/* Upvote bar */}
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, background: "#fff", borderRadius: 16, overflow: "hidden", border: `1px solid ${MS_TOKENS.ink[100]}`, boxShadow: MS_TOKENS.shadow.sm }}>
          <button
            onClick={handleVote}
            style={{ all: "unset", cursor: "pointer", padding: "14px 12px", textAlign: "center", background: voted ? MS_TOKENS.blue[600] : "transparent", color: voted ? "#fff" : MS_TOKENS.ink[900], transition: "all 0.15s" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={voted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4l8 9h-5v7h-6v-7H4z" />
              </svg>
              <span style={{ fontFamily: MS_TOKENS.fontDisplay, fontSize: 18, fontWeight: 700 }}>{voteCount}</span>
            </div>
            <div style={{ fontSize: 10, fontFamily: MS_TOKENS.fontMono, opacity: voted ? 0.85 : 0.6, marginTop: 2, letterSpacing: "0.08em" }}>
              {voted ? "YOU UPVOTED" : "TAP TO UPVOTE"}
            </div>
          </button>
          <Stat label="REPORTS" value={String(issue._count?.comments ?? comments.length)} sub="comments" />
          <Stat label="WATCHING" value="217" sub="neighbours" last />
        </div>

        {/* Description */}
        <p style={{ marginTop: 18, fontSize: 15, lineHeight: 1.55, color: MS_TOKENS.ink[800] }}>
          {issue.description}
        </p>

        {/* Timeline */}
        <div style={{ marginTop: 22 }}>
          <SectionHead eyebrow="Status" title="Tracker" />
          <div style={{ background: "#fff", borderRadius: 16, padding: "6px 14px", border: `1px solid ${MS_TOKENS.ink[100]}` }}>
            {timeline.map((step: any, i: number) => (
              <TimelineStep key={i} step={step} last={i === timeline.length - 1} />
            ))}
          </div>
        </div>

        {/* Before / After */}
        {isResolved && issue.resolvedPhoto && (
          <div style={{ marginTop: 22 }}>
            <SectionHead eyebrow="Resolution" title="Before / After" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <BeforeAfter label="BEFORE" img={issue.photo} tone={MS_TOKENS.urgent} />
              <BeforeAfter label="AFTER" img={issue.resolvedPhoto} tone={MS_TOKENS.resolved} />
            </div>
          </div>
        )}

        {/* Map */}
        <div style={{ marginTop: 22 }}>
          <SectionHead eyebrow="Location" title="On the map" />
          <div style={{ height: 160, borderRadius: 16, overflow: "hidden", border: `1px solid ${MS_TOKENS.ink[100]}` }}>
            <LahoreMap width="100%" height="100%" viewBox="440 280 220 160" showLabels={false} showLandmarks={false}>
              <MapPin x={coords.x} y={coords.y} color={MS_TOKENS.urgent} pulse glyph={cat.label[0]} />
            </LahoreMap>
          </div>
          {issue.location && (
            <div style={{ marginTop: 8, fontSize: 12, color: MS_TOKENS.ink[600] }}>
              📍 {issue.location}
              {issue.lat && issue.lng && (
                <span style={{ fontFamily: MS_TOKENS.fontMono, fontSize: 10, color: MS_TOKENS.ink[400], marginLeft: 8 }}>
                  {issue.lat.toFixed(4)}° N, {issue.lng.toFixed(4)}° E
                </span>
              )}
            </div>
          )}
        </div>

        {/* Comments */}
        <div style={{ marginTop: 22 }}>
          <SectionHead eyebrow="Updates" title={`Comments (${comments.length})`} />
          {comments.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: MS_TOKENS.ink[400], fontSize: 13, background: "#fff", borderRadius: 14, border: `1px solid ${MS_TOKENS.ink[100]}` }}>
              No comments yet. Be the first to update!
            </div>
          ) : (
            comments.map((c: any) => (
              <Comment
                key={c.id}
                author={c.author?.name ?? "Anonymous"}
                official={c.isOfficial}
                avatar={(c.author?.name ?? "?").split(" ").map((s: string) => s[0]).join("").slice(0, 2)}
                time={new Date(c.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                body={c.body}
              />
            ))
          )}
        </div>
      </div>

      {/* Sticky comment input */}
      <div style={{ position: "sticky", bottom: 0, left: 0, right: 0, padding: 12, background: "rgba(244,241,234,0.92)", backdropFilter: "blur(10px)", borderTop: `1px solid ${MS_TOKENS.ink[100]}`, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
          placeholder={session ? "Add an update or comment…" : "Sign in to comment…"}
          disabled={!session || submittingComment}
          style={{
            all: "unset", flex: 1, height: 44, borderRadius: 12, background: "#fff",
            border: `1px solid ${MS_TOKENS.ink[200]}`, padding: "0 14px",
            fontSize: 13, color: MS_TOKENS.ink[900], boxSizing: "border-box",
          }}
        />
        <button
          onClick={handleComment}
          disabled={!commentText.trim() || !session || submittingComment}
          style={{
            all: "unset", cursor: !commentText.trim() || !session ? "not-allowed" : "pointer",
            width: 44, height: 44, borderRadius: 12,
            background: commentText.trim() && session ? MS_TOKENS.ink[900] : MS_TOKENS.ink[300],
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string; last?: boolean }) {
  const T = MS_TOKENS;
  return (
    <div style={{ padding: "14px 12px", textAlign: "center", borderLeft: `1px solid ${T.ink[100]}` }}>
      <div style={{ fontFamily: T.fontDisplay, fontSize: 18, fontWeight: 700, color: T.ink[900] }}>{value}</div>
      <div style={{ fontSize: 10, fontFamily: T.fontMono, color: T.ink[500], letterSpacing: "0.08em", marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 10, color: T.ink[400], marginTop: 1 }}>{sub}</div>
    </div>
  );
}

function TimelineStep({ step, last }: { step: { t: string; at: string; done: boolean; note?: string }; last: boolean }) {
  const T = MS_TOKENS;
  const c = step.done ? T.resolved : T.ink[300];
  return (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 36 }}>
        <div style={{ width: 18, height: 18, borderRadius: 99, background: step.done ? c : "#fff", border: `2px solid ${c}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {step.done && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </div>
        {!last && <div style={{ flex: 1, width: 2, marginTop: 2, background: step.done ? T.resolved : T.ink[100], minHeight: 18 }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: last ? 0 : 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: step.done ? T.ink[900] : T.ink[500] }}>{step.t}</div>
        <div style={{ fontFamily: T.fontMono, fontSize: 10, color: T.ink[500], letterSpacing: "0.04em", marginTop: 1 }}>{step.at}</div>
        {step.note && (
          <div style={{ fontSize: 11, color: T.ink[600], marginTop: 4, padding: "5px 8px", background: T.ink[50], borderRadius: 6, display: "inline-block" }}>
            {step.note}
          </div>
        )}
      </div>
    </div>
  );
}

function BeforeAfter({ label, img, tone }: { label: string; img: string; tone: string }) {
  const T = MS_TOKENS;
  return (
    <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "1", background: `url(${img}) center/cover, ${T.ink[100]}`, border: `1px solid ${T.ink[100]}` }}>
      <div style={{ position: "absolute", top: 8, left: 8, background: tone, color: "#fff", padding: "3px 7px", borderRadius: 4, fontFamily: T.fontMono, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>
        {label}
      </div>
    </div>
  );
}

function Comment({ author, official, avatar, time, body }: { author: string; official?: boolean; avatar: string; time: string; body: string; }) {
  const T = MS_TOKENS;
  return (
    <div style={{ padding: 12, marginBottom: 8, borderRadius: 14, background: official ? T.blue[50] : "#fff", border: `1px solid ${official ? T.blue[100] : T.ink[100]}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 24, height: 24, borderRadius: 99, background: official ? T.blue[600] : T.ink[200], color: official ? "#fff" : T.ink[700], fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {avatar}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.ink[900] }}>{author}</span>
        {official && (
          <span style={{ fontFamily: T.fontMono, fontSize: 9, padding: "2px 5px", background: T.blue[600], color: "#fff", borderRadius: 3, letterSpacing: "0.06em" }}>OFFICIAL</span>
        )}
        <span style={{ fontSize: 11, color: T.ink[500], marginLeft: "auto" }}>{time}</span>
      </div>
      <div style={{ fontSize: 13, color: T.ink[800], lineHeight: 1.45 }}>{body}</div>
    </div>
  );
}
