"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MS_TOKENS } from "~/lib/tokens";
import { MSGetCat, getIcon, MSCategories } from "~/lib/data";
import { LahoreMap, MapPin } from "~/components/map";
import { UploadButton } from "~/lib/uploadthing";
import { createIssue } from "~/lib/api";

const LAT_MIN = 31.45, LAT_MAX = 31.59, LNG_MIN = 74.27, LNG_MAX = 74.46;
const X_MIN = 160, X_MAX = 840, Y_MIN = 210, Y_MAX = 580;

function latlngToSvg(lat: number, lng: number) {
  const tx = (lng - LNG_MIN) / (LNG_MAX - LNG_MIN);
  const ty = 1 - (lat - LAT_MIN) / (LAT_MAX - LAT_MIN);
  return { x: X_MIN + tx * (X_MAX - X_MIN), y: Y_MIN + ty * (Y_MAX - Y_MIN) };
}

function svgToLatLng(x: number, y: number) {
  const lng = LNG_MIN + ((x - X_MIN) / (X_MAX - X_MIN)) * (LNG_MAX - LNG_MIN);
  const lat = LAT_MAX - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (LAT_MAX - LAT_MIN);
  return { lat, lng };
}

const LAHORE_AREAS: Record<string, string> = {
  Gulberg: "Gulberg",
  DHA: "DHA",
  Cantt: "Cantt",
  "Old Lahore": "Old Lahore",
  "Iqbal Town": "Iqbal Town",
  "Johar Town": "Johar Town",
  "Model Town": "Model Town",
  "Walled City": "Walled City",
};

function areaFromLatLng(lat: number, lng: number): string {
  if (lat > 31.53 && lng < 74.35) return "Gulberg";
  if (lat > 31.52 && lng > 74.38) return "DHA";
  if (lat < 31.52 && lng > 74.36) return "Cantt";
  if (lat > 31.55 && lng < 74.34) return "Walled City";
  if (lat < 31.50 && lng < 74.35) return "Iqbal Town";
  if (lat > 31.52 && lng > 74.28 && lng < 74.34) return "Johar Town";
  return "Lahore";
}

export default function ReportPage() {
  const T = MS_TOKENS;
  const router = useRouter();
  const { data: session } = useSession();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [aiCategory, setAiCategory] = useState("pothole");
  const [aiPriority, setAiPriority] = useState("medium");
  const [locked, setLocked] = useState(false);
  const [desc, setDesc] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rewriteLoading, setRewriteLoading] = useState(false);

  const [lat, setLat] = useState(31.5125);
  const [lng, setLng] = useState(74.3434);
  const [locationLabel, setLocationLabel] = useState("Liberty Roundabout, Gulberg III");
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const rewriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setGeoStatus("loading");
    if (!navigator.geolocation) { setGeoStatus("error"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const clampedLat = Math.max(LAT_MIN, Math.min(LAT_MAX, latitude));
        const clampedLng = Math.max(LNG_MIN, Math.min(LNG_MAX, longitude));
        setLat(clampedLat);
        setLng(clampedLng);
        setLocationLabel(`${areaFromLatLng(clampedLat, clampedLng)} · ${clampedLat.toFixed(4)}° N`);
        setGeoStatus("done");
      },
      () => setGeoStatus("error"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const pinCoords = latlngToSvg(lat, lng);
  const centerX = pinCoords.x;
  const centerY = pinCoords.y;
  const vbX = Math.max(160, Math.min(800, centerX - 100));
  const vbY = Math.max(210, Math.min(520, centerY - 65));
  const mapViewBox = `${vbX} ${vbY} 200 130`;

  const handleImageUpload = useCallback(async (url: string) => {
    setPhotoUrl(url);
    setAiThinking(true);
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
              setAiCategory(catMap[data.category] ?? "other");
              setAiPriority(data.priority?.toLowerCase() ?? "medium");
              if (data.description && !desc) setDesc(data.description);
            }
          }
        }
        setAiThinking(false);
      };
    } catch {
      setAiThinking(false);
    }
  }, [desc]);

  const handleDescChange = (value: string) => {
    setDesc(value);
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

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (locked) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const svgW = rect.width;
    const svgH = rect.height;
    const [vx, vy, vw, vh] = mapViewBox.split(" ").map(Number) as [number, number, number, number];
    const svgX = vx + ((e.clientX - rect.left) / svgW) * vw;
    const svgY = vy + ((e.clientY - rect.top) / svgH) * vh;
    const { lat: newLat, lng: newLng } = svgToLatLng(svgX, svgY);
    if (newLat >= LAT_MIN && newLat <= LAT_MAX && newLng >= LNG_MIN && newLng <= LNG_MAX) {
      setLat(newLat);
      setLng(newLng);
      setLocationLabel(`${areaFromLatLng(newLat, newLng)} · ${newLat.toFixed(4)}° N, ${newLng.toFixed(4)}° E`);
    }
  };

  const handleSubmit = async () => {
    if (!session?.user) { router.push("/auth/signin"); return; }
    if (!photoUrl) { alert("Please upload a photo first"); return; }
    setSubmitting(true);
    try {
      const categoryMap: Record<string, string> = {
        pothole: "POTHOLE", garbage: "GARBAGE", traffic: "TRAFFIC",
        streetlight: "STREETLIGHT", sewage: "SEWAGE", water: "WATER", other: "OTHER",
      };
      const priorityMap: Record<string, string> = {
        urgent: "URGENT", high: "HIGH", medium: "MEDIUM", low: "LOW",
      };
      await createIssue({
        title: desc ? desc.split(".")[0]?.slice(0, 80) || `${MSGetCat(aiCategory).label} reported` : `${MSGetCat(aiCategory).label} reported`,
        description: desc || "No description provided",
        category: categoryMap[aiCategory] ?? "OTHER",
        priority: priorityMap[aiPriority] ?? "MEDIUM",
        location: locationLabel,
        area: areaFromLatLng(lat, lng),
        lat,
        lng,
        photo: photoUrl,
        isAnonymous,
      });
      router.push("/");
    } catch {
      alert("Failed to submit issue. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const cat = MSGetCat(aiCategory);
  const CatIcon = getIcon(cat.icon);

  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden" style={{ background: T.paper, fontFamily: T.fontUI, color: T.ink[900] }}>
      {/* Header */}
      <div style={{ padding: "14px 18px 12px", background: T.paper, borderBottom: `1px solid ${T.ink[100]}`, display: "flex", alignItems: "center", gap: 12 }}>
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
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "16px 18px 120px" }}>
        {/* Photo block */}
        <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: T.ink[100], aspectRatio: "4 / 3", marginBottom: 14, border: `1px solid ${T.ink[100]}` }}>
          {photoUrl ? (
            <>
              <div style={{ position: "absolute", inset: 0, background: `url(${photoUrl}) center/cover` }} />
              {!aiThinking && (
                <div style={{ position: "absolute", left: "22%", top: "34%", width: "50%", height: "38%", border: `2px solid ${T.urgent}`, borderRadius: 6, boxShadow: "0 0 0 2px rgba(255,255,255,0.6) inset" }}>
                  <div style={{ position: "absolute", top: -22, left: -2, background: T.urgent, color: "#fff", padding: "2px 7px", fontFamily: T.fontMono, fontSize: 10, letterSpacing: "0.06em", borderRadius: 4 }}>
                    {cat.label.toUpperCase()} · AI DETECTED
                  </div>
                </div>
              )}
              <button onClick={() => setPhotoUrl(null)} style={{ all: "unset", cursor: "pointer", position: "absolute", right: 10, bottom: 10, background: "rgba(11,26,36,0.78)", color: "#fff", padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
                </svg>
                Retake
              </button>
              {aiThinking && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(11,26,36,0.55)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: "#fff" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${T.blue[500]}, #6E48F0)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 10 }}>✱</div>
                  <div style={{ fontFamily: T.fontMono, fontSize: 11, letterSpacing: "0.14em" }}>ANALYZING WITH AI...</div>
                </div>
              )}
            </>
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, background: `repeating-linear-gradient(45deg, ${T.ink[100]} 0 8px, ${T.ink[50]} 8px 16px)` }}>
              <UploadButton
                endpoint="imageUploader"
                onClientUploadComplete={(res) => { if (res?.[0]?.url) handleImageUpload(res[0].url); }}
                onUploadError={(error: Error) => alert(`Upload error: ${error.message}`)}
                appearance={{
                  button: { background: T.blue[600], color: "#fff", padding: "16px 24px", borderRadius: 18, fontSize: 16, fontWeight: 600, fontFamily: T.fontDisplay, cursor: "pointer" },
                  allowedContent: { display: "none" },
                }}
                content={{
                  button({ ready }) {
                    if (ready) return (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 4l1.5 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        Take or Upload Photo
                      </div>
                    );
                    return "Loading...";
                  },
                }}
              />
              <div style={{ fontSize: 12, color: T.ink[500], textAlign: "center" }}>AI will auto-detect the issue category</div>
            </div>
          )}
        </div>

        {/* AI category card */}
        {photoUrl && !aiThinking && (
          <AICategoryCard category={cat} CatIcon={CatIcon} aiPriority={aiPriority} onChange={(id) => setAiCategory(id)} />
        )}

        {/* Location */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 12, marginBottom: 14, border: `1px solid ${T.ink[100]}`, boxShadow: T.shadow.sm }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontFamily: T.fontMono, fontSize: 10, color: T.ink[500], letterSpacing: "0.12em" }}>
              LOCATION ·{" "}
              {geoStatus === "loading" ? "DETECTING…" : geoStatus === "done" ? "GPS DETECTED" : geoStatus === "error" ? "MANUAL" : "AUTO-DETECTED"}
            </div>
            <button
              onClick={() => setLocked(!locked)}
              style={{ all: "unset", cursor: "pointer", fontSize: 12, fontWeight: 600, color: locked ? T.resolved : T.blue[600], display: "flex", alignItems: "center", gap: 4 }}
            >
              {locked ? "✓ Locked" : "Tap map to adjust"}
            </button>
          </div>
          <div style={{ height: 130, borderRadius: 12, overflow: "hidden", position: "relative", border: `1px solid ${T.ink[100]}`, cursor: locked ? "default" : "crosshair" }}>
            <LahoreMap
              width="100%"
              height="100%"
              viewBox={mapViewBox}
              showLabels={false}
              showLandmarks={false}
            >
              <MapPin x={pinCoords.x} y={pinCoords.y} color={T.urgent} pulse glyph={cat.label[0]} />
              {/* invisible overlay for click */}
              {!locked && (
                <rect
                  x={Number(mapViewBox.split(" ")[0])}
                  y={Number(mapViewBox.split(" ")[1])}
                  width={200} height={130}
                  fill="transparent"
                  style={{ cursor: "crosshair" }}
                  onClick={(e) => {
                    const svg = (e.target as SVGRectElement).ownerSVGElement!;
                    const rect = svg.getBoundingClientRect();
                    const [vx, vy, vw, vh] = mapViewBox.split(" ").map(Number) as [number, number, number, number];
                    const svgX = vx + ((e.clientX - rect.left) / rect.width) * vw;
                    const svgY = vy + ((e.clientY - rect.top) / rect.height) * vh;
                    const { lat: newLat, lng: newLng } = svgToLatLng(svgX, svgY);
                    if (newLat >= LAT_MIN && newLat <= LAT_MAX && newLng >= LNG_MIN && newLng <= LNG_MAX) {
                      setLat(newLat);
                      setLng(newLng);
                      setLocationLabel(`${areaFromLatLng(newLat, newLng)} · ${newLat.toFixed(4)}° N, ${newLng.toFixed(4)}° E`);
                    }
                  }}
                />
              )}
            </LahoreMap>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: T.ink[800], fontWeight: 500 }}>{locationLabel}</div>
          <div style={{ fontSize: 11, color: T.ink[500], fontFamily: T.fontMono, marginTop: 2 }}>
            {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
            {geoStatus === "loading" && <span style={{ marginLeft: 8, color: T.blue[600] }}>Locating…</span>}
          </div>
        </div>

        {/* Description */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 14, marginBottom: 14, border: `1px solid ${T.ink[100]}` }}>
          <div style={{ fontFamily: T.fontMono, fontSize: 10, color: T.ink[500], letterSpacing: "0.12em", marginBottom: 6 }}>
            DESCRIPTION · OPTIONAL
          </div>
          <textarea
            value={desc}
            onChange={(e) => handleDescChange(e.target.value)}
            placeholder="Add a short note. AI will improve it for civic clarity."
            style={{ all: "unset", width: "100%", minHeight: 60, fontSize: 14, fontFamily: T.fontUI, color: T.ink[900], lineHeight: 1.4 }}
          />
          {rewriteLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, padding: "6px 10px", background: T.blue[50], borderRadius: 8, fontSize: 11, color: T.blue[700] }}>
              <span>✱</span> AI improving clarity…
            </div>
          )}
          {desc.length > 0 && !rewriteLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, padding: "6px 10px", background: T.ink[50], borderRadius: 8, fontSize: 11, color: T.ink[500] }}>
              AI-enhanced after 1.5s pause
            </div>
          )}
        </div>

        {/* Privacy */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, background: T.ink[50], cursor: "pointer" }}
          onClick={() => setIsAnonymous(!isAnonymous)}
        >
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${T.ink[200]}` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.ink[700]} strokeWidth="2" strokeLinecap="round">
              <rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Report anonymously</div>
            <div style={{ fontSize: 10, color: T.ink[500] }}>Your name &amp; phone hidden from public</div>
          </div>
          <div style={{ width: 36, height: 22, borderRadius: 99, background: isAnonymous ? T.blue[600] : T.ink[300], position: "relative", transition: "background 0.2s" }}>
            <div style={{ position: "absolute", left: isAnonymous ? 16 : 2, top: 2, width: 18, height: 18, borderRadius: 99, background: "#fff", transition: "left 0.2s" }} />
          </div>
        </div>
      </div>

      {/* Submit bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, background: "rgba(244,241,234,0.92)", backdropFilter: "blur(10px)", borderTop: `1px solid ${T.ink[100]}` }}>
        <button
          onClick={handleSubmit}
          disabled={submitting || !photoUrl}
          style={{
            all: "unset", cursor: submitting || !photoUrl ? "not-allowed" : "pointer",
            width: "100%", height: 54, borderRadius: 14,
            background: T.ink[900], color: "#fff",
            fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            boxSizing: "border-box", opacity: submitting || !photoUrl ? 0.7 : 1,
          }}
        >
          {submitting ? "Submitting…" : photoUrl ? "Submit Issue" : "Upload Photo First"}
        </button>
      </div>
    </div>
  );
}

function AICategoryCard({ category, CatIcon, aiPriority, onChange }: { category: ReturnType<typeof MSGetCat>; CatIcon: React.FC<{ s?: number; c?: string }>; aiPriority: string; onChange: (id: string) => void }) {
  const T = MS_TOKENS;
  const others = MSCategories.filter((c) => c.id !== category.id).slice(0, 4);
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: 14, marginBottom: 14, border: `1px solid ${T.ink[200]}`, boxShadow: T.shadow.sm }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(135deg, ${T.blue[600]}, #6E48F0)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>✱</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], letterSpacing: "0.12em" }}>MASLA AI · CATEGORY DETECTED</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            I see a <span style={{ color: category.hue }}>{category.label.toLowerCase()}</span>
            {aiPriority && <span> · Priority: <span style={{ textTransform: "capitalize" }}>{aiPriority}</span></span>}
          </div>
        </div>
        <span style={{ fontFamily: T.fontMono, fontSize: 9, padding: "3px 6px", background: T.blue[50], color: T.blue[700], borderRadius: 4, letterSpacing: "0.06em" }}>AI</span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={() => onChange(category.id)} style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 99, background: category.hue, color: "#fff", fontWeight: 600, fontSize: 12 }}>
          <CatIcon s={14} c="#fff" /> {category.label} ✓
        </button>
        {others.map((c) => {
          const Icon = getIcon(c.icon);
          return (
            <button key={c.id} onClick={() => onChange(c.id)} style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 99, border: `1px solid ${T.ink[200]}`, color: T.ink[700], fontSize: 12 }}>
              <Icon s={13} /> {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
