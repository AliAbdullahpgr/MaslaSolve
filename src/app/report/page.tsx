"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { MS_TOKENS } from "~/lib/tokens";
import { MSGetCat, getIcon, MSCategories } from "~/lib/data";
import { useUploadThing } from "~/lib/uploadthing";
import { createIssue } from "~/lib/api";

const LeafletMap = dynamic(() => import("~/components/leaflet-map"), {
  ssr: false,
  loading: () => <div style={{ width: "100%", height: "100%", background: "#e8e0d0", borderRadius: 12 }} />,
});
const VoiceReport = dynamic(() => import("~/components/voice-report"), { ssr: false });

const LAT_MIN = 31.45, LAT_MAX = 31.59, LNG_MIN = 74.27, LNG_MAX = 74.46;

function areaFromLatLng(lat: number, lng: number): string {
  if (lat > 31.53 && lng < 74.35) return "Gulberg";
  if (lat > 31.52 && lng > 74.38) return "DHA";
  if (lat < 31.52 && lng > 74.36) return "Cantt";
  if (lat > 31.55 && lng < 74.34) return "Walled City";
  if (lat < 31.50 && lng < 74.35) return "Iqbal Town";
  if (lat > 31.52 && lng > 74.28 && lng < 74.34) return "Johar Town";
  return "Lahore";
}

const CATEGORY_OPTIONS = MSCategories.map((c) => ({ value: c.id, label: c.label }));
const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function ReportPage() {
  const T = MS_TOKENS;
  const router = useRouter();
  const { data: session } = useSession();

  // Photo + AI state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoSkipped, setPhotoSkipped] = useState(false);
  const [aiCategory, setAiCategory] = useState("pothole");
  const [aiPriority, setAiPriority] = useState("medium");
  const [aiThinking, setAiThinking] = useState(false);

  // Manual overrides (shown when no photo or user edits)
  const [manualTitle, setManualTitle] = useState("");
  const [manualCategory, setManualCategory] = useState("pothole");
  const [manualPriority, setManualPriority] = useState("medium");
  const [showManual, setShowManual] = useState(false);

  // Form state
  const [desc, setDesc] = useState("");
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Location state
  const [lat, setLat] = useState(31.5125);
  const [lng, setLng] = useState(74.3434);
  const [locationLabel, setLocationLabel] = useState("Liberty Roundabout, Gulberg III");
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [locked, setLocked] = useState(false);

  // Duplicate detection
  const [similarIssues, setSimilarIssues] = useState<any[]>([]);

  const rewriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { startUpload } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res) => {
      if (res?.[0]?.url) handleImageUpload(res[0].url);
      setUploading(false);
    },
    onUploadError: (err) => {
      setErrors({ photo: `Upload failed: ${err.message}` });
      setUploading(false);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrors({});
    await startUpload([file]);
    // reset so same file can be re-selected
    e.target.value = "";
  };

  // Derived: which category/priority to actually use
  const activeCategory = (photoUrl && !showManual) ? aiCategory : manualCategory;
  const activePriority = (photoUrl && !showManual) ? aiPriority : manualPriority;
  const cat = MSGetCat(activeCategory);
  const CatIcon = getIcon(cat.icon);

  // Geolocation on mount
  useEffect(() => {
    setGeoStatus("loading");
    if (!navigator.geolocation) { setGeoStatus("error"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const clampedLat = Math.max(LAT_MIN, Math.min(LAT_MAX, pos.coords.latitude));
        const clampedLng = Math.max(LNG_MIN, Math.min(LNG_MAX, pos.coords.longitude));
        setLat(clampedLat);
        setLng(clampedLng);
        setLocationLabel(`${areaFromLatLng(clampedLat, clampedLng)} · ${clampedLat.toFixed(4)}° N`);
        setGeoStatus("done");
      },
      () => setGeoStatus("error"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const fetchSimilar = useCallback((category: string, titleArg?: string, descArg?: string) => {
    const area = areaFromLatLng(lat, lng);
    const params = new URLSearchParams({
      category, area,
      lat: String(lat), lng: String(lng),
      title: titleArg ?? manualTitle ?? "",
      description: descArg ?? desc ?? "",
    });
    fetch(`/api/issues/similar?${params}`)
      .then((r) => r.json())
      .then(setSimilarIssues)
      .catch(() => {});
  }, [lat, lng, manualTitle, desc]);

  // Debounced refetch of similar issues whenever description, title, or category changes
  const similarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!desc && !manualTitle) return;
    if (similarTimer.current) clearTimeout(similarTimer.current);
    similarTimer.current = setTimeout(() => {
      const cat = (showManual || photoSkipped ? manualCategory : aiCategory).toUpperCase();
      fetchSimilar(cat, manualTitle, desc);
    }, 700);
    return () => { if (similarTimer.current) clearTimeout(similarTimer.current); };
  }, [desc, manualTitle, manualCategory, aiCategory, showManual, photoSkipped, fetchSimilar]);

  const handleImageUpload = useCallback(async (url: string) => {
    setPhotoUrl(url);
    setPhotoSkipped(false);
    setAiThinking(true);
    setSimilarIssues([]);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = reader.result?.toString().split(",")[1];
        if (base64) {
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: base64 }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.category) {
              const catMap: Record<string, string> = {
                POTHOLE: "pothole", GARBAGE: "garbage", TRAFFIC: "traffic",
                STREETLIGHT: "streetlight", SEWAGE: "sewage", WATER: "water", OTHER: "other",
              };
              const detected = catMap[data.category] ?? "other";
              setAiCategory(detected);
              setManualCategory(detected);
              setAiPriority(data.priority?.toLowerCase() ?? "medium");
              setManualPriority(data.priority?.toLowerCase() ?? "medium");
              if (data.description && !desc) setDesc(data.description);
              fetchSimilar(data.category);
            }
          }
        }
        setAiThinking(false);
      };
    } catch {
      setAiThinking(false);
    }
  }, [desc, fetchSimilar]);

  const handleSkipPhoto = () => {
    setPhotoUrl(null);
    setPhotoSkipped(true);
    setShowManual(true);
    setAiThinking(false);
  };

  const handleDescChange = (value: string) => {
    setDesc(value);
    setErrors((e) => ({ ...e, desc: "" }));
    if (rewriteTimer.current) clearTimeout(rewriteTimer.current);
    if (value.length > 30 && value.length < 300) {
      rewriteTimer.current = setTimeout(async () => {
        setRewriteLoading(true);
        try {
          const res = await fetch("/api/rewrite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: value }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.rewritten) setDesc(data.rewritten);
          }
        } catch { /* silent */ } finally {
          setRewriteLoading(false);
        }
      }, 1500);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!session?.user) { router.push("/auth/signin"); return false; }
    if (!photoUrl && !photoSkipped) { newErrors.photo = "Upload a photo or skip to continue."; }
    if (photoSkipped && !manualTitle.trim()) { newErrors.title = "Please enter a title for the issue."; }
    if (photoSkipped && !desc.trim()) { newErrors.desc = "Please describe the issue."; }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const categoryMap: Record<string, string> = {
        pothole: "POTHOLE", garbage: "GARBAGE", traffic: "TRAFFIC",
        streetlight: "STREETLIGHT", sewage: "SEWAGE", water: "WATER", other: "OTHER",
      };
      const priorityMap: Record<string, string> = {
        urgent: "URGENT", high: "HIGH", medium: "MEDIUM", low: "LOW",
      };

      const derivedTitle = manualTitle.trim() ||
        (desc ? (desc.split(".")[0]?.slice(0, 80) || cat.label + " reported") : cat.label + " reported");

      await createIssue({
        title: derivedTitle,
        description: desc || "No description provided",
        category: categoryMap[activeCategory] ?? "OTHER",
        priority: priorityMap[activePriority] ?? "MEDIUM",
        location: locationLabel,
        area: areaFromLatLng(lat, lng),
        lat,
        lng,
        photo: photoUrl ?? undefined,
        isAnonymous,
      });
      router.push("/");
    } catch {
      setErrors({ submit: "Failed to submit. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const hasPhoto = !!photoUrl;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: T.paper,
        fontFamily: T.fontUI,
        color: T.ink[900],
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ maxWidth: 480, width: "100%", margin: "0 auto", flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "14px 18px 12px", background: T.paper, borderBottom: `1px solid ${T.ink[100]}`, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
          <Link href="/">
            <button style={{ all: "unset", cursor: "pointer", width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${T.ink[200]}`, background: "#fff" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ink[700]} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          </Link>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.fontMono, fontSize: 10, color: T.ink[500], letterSpacing: "0.12em" }}>NEW REPORT</div>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>Report an issue</div>
          </div>
          {/* Step indicator */}
          <div style={{ display: "flex", gap: 4 }}>
            {[hasPhoto || photoSkipped, !!locationLabel, true].map((done, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: 99, background: done ? T.blue[600] : T.ink[200] }} />
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 24px" }}>

          {/* ── PHOTO BLOCK ── */}
          <SectionLabel>📷 Photo</SectionLabel>
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: T.ink[100], marginBottom: 6, border: `1px solid ${hasPhoto ? T.ink[200] : errors.photo ? T.urgent : T.ink[100]}` }}>
            {hasPhoto ? (
              /* Photo preview */
              <div style={{ position: "relative", aspectRatio: "16/9" }}>
                <div style={{ position: "absolute", inset: 0, background: `url(${photoUrl}) center/cover` }} />
                {aiThinking && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(11,26,36,0.6)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: "#fff", gap: 10 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${T.blue[500]}, #6E48F0)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>✱</div>
                    <div style={{ fontFamily: T.fontMono, fontSize: 11, letterSpacing: "0.14em" }}>ANALYZING WITH AI…</div>
                  </div>
                )}
                {!aiThinking && (
                  <div style={{ position: "absolute", left: 10, top: 10, background: T.urgent, color: "#fff", padding: "3px 8px", borderRadius: 5, fontFamily: T.fontMono, fontSize: 9, letterSpacing: "0.06em" }}>
                    {cat.label.toUpperCase()} · AI DETECTED
                  </div>
                )}
                <button
                  onClick={() => { setPhotoUrl(null); setPhotoSkipped(false); setShowManual(false); setSimilarIssues([]); }}
                  style={{ all: "unset", cursor: "pointer", position: "absolute", right: 10, bottom: 10, background: "rgba(11,26,36,0.78)", color: "#fff", padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
                  Retake
                </button>
              </div>
            ) : photoSkipped ? (
              /* Skipped state */
              <div style={{ padding: "16px 14px", display: "flex", alignItems: "center", gap: 12, background: T.ink[50] }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: T.ink[200], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.ink[600]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4l1.5 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2z" /><circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink[700] }}>No photo — text report</div>
                  <div style={{ fontSize: 11, color: T.ink[500], marginTop: 1 }}>AI analysis disabled. Fill in details manually below.</div>
                </div>
                <button
                  onClick={() => { setPhotoSkipped(false); setShowManual(false); }}
                  style={{ all: "unset", cursor: "pointer", fontSize: 12, color: T.blue[600], fontWeight: 600 }}
                >
                  Add photo
                </button>
              </div>
            ) : (
              /* Upload state */
              <div style={{ padding: "24px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, background: `repeating-linear-gradient(45deg, ${T.ink[100]} 0 8px, ${T.ink[50]} 8px 16px)` }}>
                {/* Hidden native file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    all: "unset", cursor: uploading ? "wait" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    background: uploading ? T.ink[400] : T.blue[600],
                    color: "#fff", padding: "14px 28px", borderRadius: 14,
                    fontSize: 15, fontWeight: 600, fontFamily: T.fontDisplay,
                    boxShadow: "0 4px 14px rgba(31,111,235,0.35)",
                    transition: "background 0.15s",
                    width: "100%", maxWidth: 260, boxSizing: "border-box",
                  }}
                >
                  {uploading ? (
                    <>
                      <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 4l1.5 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      Take or Upload Photo
                    </>
                  )}
                </button>
                <div style={{ fontSize: 12, color: T.ink[500], textAlign: "center" }}>AI auto-detects category from your photo</div>
                <button
                  onClick={handleSkipPhoto}
                  style={{ all: "unset", cursor: "pointer", fontSize: 12, color: T.ink[500], textDecoration: "underline", textUnderlineOffset: 3 }}
                >
                  Skip — report without photo
                </button>
              </div>
            )}
          </div>
          {errors.photo && <FieldError>{errors.photo}</FieldError>}

          {/* ── VOICE REPORT (Urdu / Roman Urdu / English) ── */}
          <div style={{ marginTop: 14 }}>
            <SectionLabel>🎙️ Speak it instead</SectionLabel>
            <VoiceReport
              onResult={(r) => {
                const catMap: Record<string, string> = {
                  POTHOLE: "pothole", GARBAGE: "garbage", TRAFFIC: "traffic",
                  STREETLIGHT: "streetlight", SEWAGE: "sewage", WATER: "water", OTHER: "other",
                };
                const detected = catMap[r.category] ?? "other";
                setManualCategory(detected);
                setAiCategory(detected);
                setManualPriority(r.priority?.toLowerCase() ?? "medium");
                setAiPriority(r.priority?.toLowerCase() ?? "medium");
                if (r.title) setManualTitle(r.title);
                if (r.description) setDesc(r.description);
                // If user spoke without uploading a photo, switch to skip-photo mode so the
                // form is valid on submit.
                if (!photoUrl) {
                  setPhotoSkipped(true);
                  setShowManual(true);
                }
              }}
            />
          </div>

          {/* ── AI CATEGORY (when photo present) ── */}
          {hasPhoto && !aiThinking && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 12, marginBottom: 14, border: `1px solid ${T.ink[200]}`, boxShadow: T.shadow.sm }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: `linear-gradient(135deg, ${T.blue[600]}, #6E48F0)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>✱</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], letterSpacing: "0.12em" }}>MASLA AI · DETECTED</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    <span style={{ color: cat.hue }}>{cat.label}</span>
                    {" · "}
                    <span style={{ textTransform: "capitalize", color: T.ink[600] }}>{aiPriority} priority</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowManual(!showManual)}
                  style={{ all: "unset", cursor: "pointer", fontSize: 11, color: T.blue[600], fontWeight: 600 }}
                >
                  {showManual ? "Use AI" : "Override"}
                </button>
              </div>
              {!showManual && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {MSCategories.map((c) => {
                    const Icon = getIcon(c.icon);
                    const active = c.id === aiCategory;
                    return (
                      <button
                        key={c.id}
                        onClick={() => { setAiCategory(c.id); fetchSimilar(c.id.toUpperCase()); }}
                        style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 99, fontSize: 12, fontWeight: active ? 600 : 400, background: active ? c.hue : "transparent", color: active ? "#fff" : T.ink[700], border: `1px solid ${active ? c.hue : T.ink[200]}` }}
                      >
                        <Icon s={13} c={active ? "#fff" : c.hue} /> {c.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── MANUAL FIELDS (no photo or override) ── */}
          {(photoSkipped || showManual) && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 14, marginBottom: 14, border: `1px solid ${T.ink[200]}` }}>
              <SectionLabel compact>Issue details</SectionLabel>

              {/* Title */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], letterSpacing: "0.12em", display: "block", marginBottom: 5 }}>TITLE *</label>
                <input
                  value={manualTitle}
                  onChange={(e) => { setManualTitle(e.target.value); setErrors((er) => ({ ...er, title: "" })); }}
                  placeholder="e.g. Pothole on Liberty roundabout"
                  maxLength={100}
                  style={{
                    all: "unset", display: "block", width: "100%", boxSizing: "border-box",
                    padding: "10px 12px", borderRadius: 10, fontSize: 14,
                    border: `1px solid ${errors.title ? T.urgent : T.ink[200]}`,
                    background: T.ink[50], color: T.ink[900],
                  }}
                />
                {errors.title && <FieldError>{errors.title}</FieldError>}
              </div>

              {/* Category */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], letterSpacing: "0.12em", display: "block", marginBottom: 5 }}>CATEGORY</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {MSCategories.map((c) => {
                    const Icon = getIcon(c.icon);
                    const active = c.id === manualCategory;
                    return (
                      <button
                        key={c.id}
                        onClick={() => { setManualCategory(c.id); fetchSimilar(c.id.toUpperCase()); }}
                        style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 99, fontSize: 12, fontWeight: active ? 600 : 400, background: active ? c.hue : "transparent", color: active ? "#fff" : T.ink[700], border: `1px solid ${active ? c.hue : T.ink[200]}` }}
                      >
                        <Icon s={13} c={active ? "#fff" : c.hue} /> {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label style={{ fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], letterSpacing: "0.12em", display: "block", marginBottom: 5 }}>PRIORITY</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {PRIORITY_OPTIONS.map((p) => {
                    const active = p.value === manualPriority;
                    const colors: Record<string, string> = { urgent: T.urgent, high: "#E85D2C", medium: "#C68A12", low: T.resolved };
                    return (
                      <button
                        key={p.value}
                        onClick={() => setManualPriority(p.value)}
                        style={{ all: "unset", cursor: "pointer", padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: active ? 600 : 400, background: active ? colors[p.value] : "transparent", color: active ? "#fff" : T.ink[700], border: `1px solid ${active ? colors[p.value] : T.ink[200]}` }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── DUPLICATE WARNING (semantic embeddings) ── */}
          {similarIssues.length > 0 && (
            <div style={{ background: "#FFFDE7", border: "1px solid #FDD835", borderRadius: 14, padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontFamily: T.fontMono, fontSize: 9, color: "#F57F17", letterSpacing: "0.12em" }}>
                  ✱ AI FOUND {similarIssues.length} NEARBY MATCH{similarIssues.length === 1 ? "" : "ES"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#795548", marginBottom: 8 }}>
                These look like the same problem. Upvote one instead of duplicating.
              </div>
              {similarIssues.map((s: any) => (
                <a key={s.id} href={`/issue/${s.id}`} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#fff", borderRadius: 8, marginBottom: 4, textDecoration: "none", border: `1px solid ${T.ink[100]}` }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#4E342E", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                    <div style={{ fontSize: 10, color: "#9E9E9E", marginTop: 2 }}>
                      {typeof s.similarity === "number" && (
                        <span style={{ fontFamily: T.fontMono }}>{Math.round(s.similarity * 100)}% match</span>
                      )}
                      {s.area ? <span> · {s.area}</span> : null}
                    </div>
                  </div>
                  <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.blue[600], flexShrink: 0, fontWeight: 600 }}>▲ {s.upvotes}</span>
                </a>
              ))}
            </div>
          )}

          {/* ── LOCATION ── */}
          <SectionLabel>📍 Location</SectionLabel>
          <div style={{ background: "#fff", borderRadius: 14, padding: 12, marginBottom: 14, border: `1px solid ${T.ink[100]}`, boxShadow: T.shadow.sm }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], letterSpacing: "0.1em" }}>
                {geoStatus === "loading" ? "DETECTING GPS…" : geoStatus === "done" ? "GPS DETECTED" : geoStatus === "error" ? "MANUAL PIN" : "AUTO-DETECTED"}
              </div>
              <button
                onClick={() => setLocked(!locked)}
                style={{ all: "unset", cursor: "pointer", fontSize: 12, fontWeight: 600, color: locked ? T.resolved : T.blue[600] }}
              >
                {locked ? "✓ Locked" : "Tap map to adjust"}
              </button>
            </div>
            <div style={{ height: 200, borderRadius: 10, overflow: "hidden", position: "relative", border: `1px solid ${T.ink[100]}` }}>
              <LeafletMap
                center={[lat, lng]}
                zoom={15}
                pinLat={lat}
                pinLng={lng}
                pinColor={T.urgent}
                onMapClick={locked ? undefined : (newLat, newLng) => {
                  setLat(newLat);
                  setLng(newLng);
                  setLocationLabel(`${areaFromLatLng(newLat, newLng)} · ${newLat.toFixed(4)}° N, ${newLng.toFixed(4)}° E`);
                }}
                style={{ width: "100%", height: "100%" }}
              />
              {!locked && (
                <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)", padding: "4px 8px", borderRadius: 6, fontSize: 10, color: T.ink[600], fontFamily: T.fontMono, pointerEvents: "none", zIndex: 1000 }}>
                  TAP TO PIN
                </div>
              )}
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: T.ink[800], fontWeight: 500 }}>{locationLabel}</div>
            <div style={{ fontSize: 10, color: T.ink[400], fontFamily: T.fontMono, marginTop: 2 }}>
              {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
              {geoStatus === "loading" && <span style={{ marginLeft: 8, color: T.blue[600] }}>Locating…</span>}
            </div>
          </div>

          {/* ── DESCRIPTION ── */}
          <SectionLabel>{photoSkipped ? "📝 Description *" : "📝 Description"}</SectionLabel>
          <div style={{ background: "#fff", borderRadius: 14, padding: 12, marginBottom: 14, border: `1px solid ${errors.desc ? T.urgent : T.ink[100]}` }}>
            <textarea
              value={desc}
              onChange={(e) => handleDescChange(e.target.value)}
              placeholder={photoSkipped ? "Describe the issue clearly (required without photo)." : "Add a short note. AI will improve it for civic clarity."}
              rows={3}
              style={{ all: "unset", display: "block", width: "100%", boxSizing: "border-box", fontSize: 14, fontFamily: T.fontUI, color: T.ink[900], lineHeight: 1.5, resize: "none" }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
              <div style={{ fontSize: 10, color: T.ink[400] }}>{desc.length}/300</div>
              {rewriteLoading && (
                <div style={{ fontSize: 11, color: T.blue[700], display: "flex", alignItems: "center", gap: 4 }}>
                  <span>✱</span> AI improving…
                </div>
              )}
            </div>
          </div>
          {errors.desc && <FieldError>{errors.desc}</FieldError>}

          {/* ── PRIVACY ── */}
          <div
            onClick={() => setIsAnonymous(!isAnonymous)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: T.ink[50], cursor: "pointer", marginBottom: 8, border: `1px solid ${T.ink[100]}` }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${T.ink[200]}`, flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.ink[700]} strokeWidth="2" strokeLinecap="round">
                <rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Report anonymously</div>
              <div style={{ fontSize: 11, color: T.ink[500] }}>Your name &amp; details hidden from public</div>
            </div>
            <div style={{ width: 36, height: 22, borderRadius: 99, background: isAnonymous ? T.blue[600] : T.ink[300], position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", left: isAnonymous ? 16 : 2, top: 2, width: 18, height: 18, borderRadius: 99, background: "#fff", transition: "left 0.2s" }} />
            </div>
          </div>

          {/* ── SUBMIT ERROR ── */}
          {errors.submit && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "#FFEBEE", border: "1px solid #EF9A9A", fontSize: 13, color: "#C62828", marginBottom: 8 }}>
              {errors.submit}
            </div>
          )}

          {/* ── SUBMIT BUTTON ── */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              all: "unset", cursor: submitting ? "wait" : "pointer",
              display: "flex", width: "100%", boxSizing: "border-box",
              height: 54, borderRadius: 14,
              background: submitting ? T.ink[400] : T.ink[900],
              color: "#fff",
              fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em",
              alignItems: "center", justifyContent: "center", gap: 10,
              transition: "background 0.15s",
              marginBottom: 8,
            }}
          >
            {submitting ? (
              <>
                <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                Submitting…
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                Submit Issue
              </>
            )}
          </button>

          {!session && (
            <div style={{ textAlign: "center", fontSize: 12, color: T.ink[500], padding: "8px 0" }}>
              You'll be asked to{" "}
              <Link href="/auth/signin" style={{ color: T.blue[600], fontWeight: 600 }}>sign in</Link>
              {" "}before submitting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div style={{ fontFamily: MS_TOKENS.fontMono, fontSize: 10, color: MS_TOKENS.ink[600], letterSpacing: "0.1em", marginBottom: compact ? 8 : 6, marginTop: compact ? 0 : 4 }}>
      {children}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: MS_TOKENS.urgent, marginTop: 4, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
      <span>⚠</span> {children}
    </div>
  );
}
