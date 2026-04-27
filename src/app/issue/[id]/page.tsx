"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { MS_TOKENS } from "~/lib/tokens";
import { MSGetCat, getIcon } from "~/lib/data";
import { StatusBadge, PriorityBadge, SectionHead } from "~/components/ui";
import { useIssue, toggleVote, addComment } from "~/lib/api";

const LeafletMap = dynamic(() => import("~/components/leaflet-map"), { ssr: false, loading: () => <div style={{ width: "100%", height: "100%", background: "#e8e0d0" }} /> });

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
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [nearbyData, setNearbyData] = useState<{ count: number; urgent: number } | null>(null);
  const [similarIssues, setSimilarIssues] = useState<any[]>([]);
  const [escalated, setEscalated] = useState(false);

  useEffect(() => {
    if (issue) {
      setVoteCount(issue.upvotes ?? 0);
      setComments(issue.comments ?? []);
    }
  }, [issue]);

  // Fetch nearby issues count using browser geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      fetch(`/api/issues/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
        .then((r) => r.json())
        .then(setNearbyData)
        .catch(() => {});
    }, () => {}, { timeout: 5000 });
  }, []);

  // Fetch similar/duplicate issues once issue is loaded
  useEffect(() => {
    if (!issue) return;
    fetch(`/api/issues/similar?category=${issue.category}&area=${encodeURIComponent(issue.area ?? "")}&excludeId=${issue.id}${issue.lat != null && issue.lng != null ? `&lat=${issue.lat}&lng=${issue.lng}` : ""}`)
      .then((r) => r.json())
      .then(setSimilarIssues)
      .catch(() => {});
  }, [issue]);

  const handleVote = async () => {
    if (!session?.user?.id) { window.location.href = "/auth/signin"; return; }
    try {
      const res = await toggleVote(id, session.user.id);
      setVoted(res.voted);
      setVoteCount((c) => res.voted ? c + 1 : c - 1);
      if (res.escalated) setEscalated(true);
    } catch { /* silent */ }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    if (!session?.user?.id) { window.location.href = "/auth/signin"; return; }
    setSubmittingComment(true);
    try {
      const body = replyTo ? `↩ @${replyTo.author}: ${commentText.trim()}` : commentText.trim();
      const newComment = await addComment(id, body, session.user.id);
      setComments((prev) => [newComment, ...prev]);
      setCommentText("");
      setReplyTo(null);
    } catch { /* silent */ } finally {
      setSubmittingComment(false);
    }
  };

  const handleWhatsApp = () => {
    const text = `🚨 ${issue?.title}\n📍 ${issue?.location}\nReport: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
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

  const resolvedAt = isResolved ? new Date(issue.updatedAt).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "ETA pending";
  const timeline = issue.timeline?.length > 0
    ? issue.timeline.map((t: any) => {
        const isResolvedStep = t.label?.toLowerCase() === "resolved";
        return {
          t: t.label,
          at: isResolved && isResolvedStep && !t.done ? resolvedAt : (t.note || new Date(t.timestamp).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })),
          done: isResolved ? true : t.done,
          note: t.note,
        };
      })
    : [
        { t: "Reported", at: new Date(issue.createdAt).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), done: true },
        { t: "Verified", at: "—", done: isResolved || issue.status === "IN_PROGRESS" },
        { t: "In Progress", at: "—", done: isResolved || issue.status === "IN_PROGRESS" },
        { t: "Resolved", at: isResolved ? resolvedAt : "ETA pending", done: isResolved },
      ];

  const reporterName = issue.isAnonymous ? "Anonymous" : (issue.reporter?.name ?? "Anonymous");
  const T = MS_TOKENS;

  return (
    <div className="mx-auto h-[100dvh] max-w-md overflow-auto" style={{ background: T.paper, fontFamily: T.fontUI, color: T.ink[900], position: "relative" }}>
      {/* Hero image */}
      <div style={{ position: "relative", height: 280, overflow: "hidden", background: `url(${(isResolved && issue.resolvedPhoto) || issue.photo}) center/cover, ${T.ink[300]}` }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(11,26,36,0.5) 0%, transparent 30%, transparent 70%, rgba(11,26,36,0.6) 100%)" }} />
        <Link href="/">
          <button style={{ all: "unset", cursor: "pointer", position: "absolute", left: 14, top: 14, width: 38, height: 38, borderRadius: 99, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ink[900]} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        </Link>
        <div style={{ position: "absolute", right: 14, top: 14, display: "flex", gap: 8 }}>
          {/* WhatsApp share */}
          <div
            style={{ width: 38, height: 38, borderRadius: 99, background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
            onClick={handleWhatsApp}
            title="Share on WhatsApp"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.845L0 24l6.293-1.505A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.947 0-3.772-.528-5.335-1.449l-.38-.225-3.736.893.945-3.635-.246-.38A9.944 9.944 0 0 1 2 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z" />
            </svg>
          </div>
          {/* Native share */}
          <div
            style={{ width: 38, height: 38, borderRadius: 99, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", color: T.ink[900], cursor: "pointer" }}
            onClick={() => navigator.share?.({ title: issue.title, url: window.location.href }).catch(() => {})}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
            </svg>
          </div>
        </div>
        <div style={{ position: "absolute", left: 14, bottom: 12, display: "flex", gap: 6 }}>
          <PriorityBadge priority={issue.priority} />
          <StatusBadge status={issue.status} />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 18px 110px" }}>

        {/* Auto-escalation toast */}
        {escalated && (
          <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 12, background: "#FFF3E0", border: "1px solid #FFB74D", display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span style={{ fontSize: 18 }}>🚨</span>
            <div>
              <b style={{ color: "#E65100" }}>Priority escalated to URGENT</b>
              <div style={{ fontSize: 11, color: "#BF360C", marginTop: 1 }}>This issue crossed 50 upvotes and has been escalated automatically.</div>
            </div>
          </div>
        )}

        {/* Nearby issues alert */}
        {nearbyData && nearbyData.count > 0 && (
          <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 12, background: T.blue[50], border: `1px solid ${T.blue[100]}`, display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span style={{ fontSize: 18 }}>📍</span>
            <div>
              <b style={{ color: T.blue[700] }}>{nearbyData.count} issue{nearbyData.count !== 1 ? "s" : ""} within 500m of you</b>
              {nearbyData.urgent > 0 && <div style={{ fontSize: 11, color: T.urgent, marginTop: 1 }}>Including {nearbyData.urgent} urgent</div>}
            </div>
          </div>
        )}

        {/* Duplicate / similar issues */}
        {similarIssues.length > 0 && (
          <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 12, background: "#FFFDE7", border: "1px solid #FDD835" }}>
            <div style={{ fontFamily: T.fontMono, fontSize: 9, color: "#F57F17", letterSpacing: "0.12em", marginBottom: 6 }}>SIMILAR OPEN ISSUES NEARBY</div>
            {similarIssues.map((s) => (
              <Link key={s.id} href={`/issue/${s.id}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer" }}>
                  <span style={{ fontSize: 11, color: "#795548", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                  <span style={{ fontFamily: T.fontMono, fontSize: 10, color: "#9E9E9E" }}>▲ {s.upvotes}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ID + category */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.ink[600], background: T.ink[100], padding: "3px 7px", borderRadius: 5 }}>
            {issue.id}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: T.ink[600] }}>
            <span style={{ color: cat.hue, display: "inline-flex" }}><CatIcon s={14} /></span>
            {cat.label}
          </span>
        </div>

        {/* Title */}
        <h1 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          {issue.title}
        </h1>

        {/* Reporter & location */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, fontSize: 12, color: T.ink[600] }}>
          <div style={{ width: 24, height: 24, borderRadius: 99, background: T.blue[100], color: T.blue[700], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
            {reporterName.split(" ").map((s: string) => s[0]).join("")}
          </div>
          <span>
            <b style={{ color: T.ink[800] }}>{reporterName}</b>
            {" · "}{new Date(issue.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
          </span>
          <span style={{ color: T.ink[300] }}>·</span>
          <span>{issue.location}</span>
        </div>

        {/* Upvote bar */}
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, background: "#fff", borderRadius: 16, overflow: "hidden", border: `1px solid ${T.ink[100]}`, boxShadow: T.shadow.sm }}>
          <button
            onClick={handleVote}
            style={{ all: "unset", cursor: "pointer", padding: "14px 12px", textAlign: "center", background: voted ? T.blue[600] : "transparent", color: voted ? "#fff" : T.ink[900], transition: "all 0.15s" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={voted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4l8 9h-5v7h-6v-7H4z" />
              </svg>
              <span style={{ fontFamily: T.fontDisplay, fontSize: 18, fontWeight: 700 }}>{voteCount}</span>
            </div>
            <div style={{ fontSize: 10, fontFamily: T.fontMono, opacity: voted ? 0.85 : 0.6, marginTop: 2, letterSpacing: "0.08em" }}>
              {voted ? "YOU UPVOTED" : "TAP TO UPVOTE"}
            </div>
          </button>
          <Stat label="COMMENTS" value={String(issue._count?.comments ?? comments.length)} sub="updates" />
          <Stat label="WATCHING" value="217" sub="neighbours" last />
        </div>

        {/* Description */}
        <p style={{ marginTop: 18, fontSize: 15, lineHeight: 1.55, color: T.ink[800] }}>
          {issue.description}
        </p>

        {/* Timeline */}
        <div style={{ marginTop: 22 }}>
          <SectionHead eyebrow="Status" title="Tracker" />
          <div style={{ background: "#fff", borderRadius: 16, padding: "6px 14px", border: `1px solid ${T.ink[100]}` }}>
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
              <BeforeAfter label="BEFORE" img={issue.photo} tone={T.urgent} />
              <BeforeAfter label="AFTER" img={issue.resolvedPhoto} tone={T.resolved} />
            </div>
          </div>
        )}

        {/* Map — real Leaflet */}
        {issue.lat != null && issue.lng != null && (
          <div style={{ marginTop: 22 }}>
            <SectionHead eyebrow="Location" title="On the map" />
            <div style={{ height: 180, borderRadius: 16, overflow: "hidden", border: `1px solid ${T.ink[100]}` }}>
              <LeafletMap
                center={[issue.lat, issue.lng]}
                zoom={15}
                interactive={false}
                pinLat={issue.lat}
                pinLng={issue.lng}
                pinColor={T.urgent}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: T.ink[600] }}>
              📍 {issue.location}
              <span style={{ fontFamily: T.fontMono, fontSize: 10, color: T.ink[400], marginLeft: 8 }}>
                {issue.lat.toFixed(4)}° N, {issue.lng.toFixed(4)}° E
              </span>
            </div>
          </div>
        )}

        {/* Comments */}
        <div style={{ marginTop: 22 }}>
          <SectionHead eyebrow="Updates" title={`Comments (${comments.length})`} />
          {comments.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: T.ink[400], fontSize: 13, background: "#fff", borderRadius: 14, border: `1px solid ${T.ink[100]}` }}>
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
                onReply={() => setReplyTo({ id: c.id, author: c.author?.name ?? "Anonymous" })}
              />
            ))
          )}
        </div>
      </div>

      {/* Sticky comment input */}
      <div style={{ position: "sticky", bottom: 0, left: 0, right: 0, padding: 12, background: "rgba(244,241,234,0.92)", backdropFilter: "blur(10px)", borderTop: `1px solid ${T.ink[100]}` }}>
        {replyTo && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "5px 10px", background: T.blue[50], borderRadius: 8, fontSize: 12 }}>
            <span style={{ color: T.blue[700] }}>↩ Replying to <b>{replyTo.author}</b></span>
            <button onClick={() => setReplyTo(null)} style={{ all: "unset", cursor: "pointer", marginLeft: "auto", color: T.ink[400], fontSize: 16 }}>×</button>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
            placeholder={session ? (replyTo ? `Reply to ${replyTo.author}…` : "Add an update or comment…") : "Sign in to comment…"}
            disabled={!session || submittingComment}
            style={{
              all: "unset", flex: 1, height: 44, borderRadius: 12, background: "#fff",
              border: `1px solid ${T.ink[200]}`, padding: "0 14px",
              fontSize: 13, color: T.ink[900], boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleComment}
            disabled={!commentText.trim() || !session || submittingComment}
            style={{
              all: "unset", cursor: !commentText.trim() || !session ? "not-allowed" : "pointer",
              width: 44, height: 44, borderRadius: 12,
              background: commentText.trim() && session ? T.ink[900] : T.ink[300],
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

function Comment({ author, official, avatar, time, body, onReply }: { author: string; official?: boolean; avatar: string; time: string; body: string; onReply?: () => void }) {
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
      {onReply && (
        <button
          onClick={onReply}
          style={{ all: "unset", cursor: "pointer", marginTop: 6, fontSize: 11, color: T.blue[600], fontWeight: 500 }}
        >
          ↩ Reply
        </button>
      )}
    </div>
  );
}
