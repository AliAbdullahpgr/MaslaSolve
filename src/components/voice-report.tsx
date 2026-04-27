"use client";

import { useEffect, useRef, useState } from "react";
import { MS_TOKENS } from "~/lib/tokens";

type VoiceResult = {
  transcript: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  areaHint: string;
  followUp: string;
};

type Props = {
  onResult: (r: VoiceResult) => void;
  disabled?: boolean;
};

const T = MS_TOKENS;

// Picks a mime type the browser actually supports for MediaRecorder
function pickMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  if (typeof window === "undefined" || !("MediaRecorder" in window)) return "audio/webm";
  for (const m of candidates) {
    // @ts-ignore
    if (MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return "audio/webm";
}

export default function VoiceReport({ onResult, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [result, setResult] = useState<VoiceResult | null>(null);

  const [speaking, setSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    // Prime the voice list on mount; some browsers populate it async after first call.
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    return () => {
      cleanup();
      stopSpeaking();
    };
  }, []);

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      // Try to pick an Urdu voice, fall back to Hindi (closest phonology), then anything
      const voices = window.speechSynthesis.getVoices();
      const urdu = voices.find((v) => /ur(-|_)?PK|^ur$|urdu/i.test(v.lang + " " + v.name));
      const hindi = voices.find((v) => /hi(-|_)?IN|hindi/i.test(v.lang + " " + v.name));
      if (urdu) u.voice = urdu;
      else if (hindi) u.voice = hindi;
      u.lang = urdu ? urdu.lang : hindi ? hindi.lang : "ur-PK";
      u.rate = 0.95;
      u.pitch = 1;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {
      setSpeaking(false);
    }
  }

  function stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }

  function cleanup() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  async function start() {
    stopSpeaking();
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = pickMime();
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => handleStop(mime);
      mr.start();
      mediaRecorderRef.current = mr;

      // mic level meter
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        setLevel(Math.min(1, avg / 80));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      startedAtRef.current = Date.now();
      setElapsed(0);
      elapsedTimerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);

      setRecording(true);
    } catch (e: any) {
      setError(e?.message || "Microphone access denied");
    }
  }

  function stop() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    setLevel(0);
  }

  async function handleStop(mime: string) {
    setProcessing(true);
    try {
      const blob = new Blob(chunksRef.current, { type: mime });
      const arrBuf = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrBuf);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
      }
      const b64 = btoa(binary);

      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: b64, mimeType: mime }),
      });
      if (!res.ok) {
        setError("AI couldn't process the audio. Try again.");
        return;
      }
      const data = (await res.json()) as VoiceResult;
      setResult(data);
      onResult(data);
      if (data.followUp && data.followUp.trim()) {
        // Voices load async on first use; wait a tick so getVoices() is populated
        setTimeout(() => speak(data.followUp), 200);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to process audio");
    } finally {
      setProcessing(false);
      cleanup();
    }
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
        border: `1px solid ${T.ink[100]}`,
        boxShadow: T.shadow.sm,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${T.blue[600]}, #6E48F0)`,
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 13,
          }}
        >
          ✱
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], letterSpacing: "0.12em" }}>
            VOICE REPORT · اردو · ROMAN URDU · ENGLISH
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink[800] }}>
            Tap the mic and describe the issue in your language
          </div>
        </div>
      </div>

      {!recording && !processing && !result && (
        <button
          onClick={start}
          disabled={disabled}
          style={{
            all: "unset", cursor: disabled ? "not-allowed" : "pointer",
            display: "flex", width: "100%", boxSizing: "border-box",
            height: 56, borderRadius: 14,
            background: `linear-gradient(135deg, ${T.blue[600]}, #6E48F0)`,
            color: "#fff", alignItems: "center", justifyContent: "center", gap: 10,
            fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 15,
            opacity: disabled ? 0.5 : 1,
            boxShadow: "0 4px 14px rgba(110,72,240,0.3)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
          </svg>
          Start voice report
        </button>
      )}

      {recording && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 12, height: 12, borderRadius: 99,
                background: T.urgent,
                animation: "pulse 1s infinite",
              }}
            />
            <div style={{ fontFamily: T.fontMono, fontSize: 11, color: T.urgent, fontWeight: 600 }}>
              REC · {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
            </div>
            <div style={{ flex: 1, height: 6, background: T.ink[100], borderRadius: 99, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${level * 100}%`,
                  background: `linear-gradient(90deg, ${T.blue[500]}, #6E48F0)`,
                  transition: "width 0.08s ease",
                }}
              />
            </div>
          </div>
          <button
            onClick={stop}
            style={{
              all: "unset", cursor: "pointer",
              display: "flex", width: "100%", boxSizing: "border-box",
              height: 50, borderRadius: 12,
              background: T.ink[900], color: "#fff",
              alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 14,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
            Stop & analyze
          </button>
          <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
        </div>
      )}

      {processing && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 4px" }}>
          <div
            style={{
              width: 18, height: 18,
              border: `2px solid ${T.ink[100]}`,
              borderTopColor: T.blue[600],
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <div style={{ fontSize: 13, color: T.ink[700] }}>
            <div style={{ fontWeight: 600 }}>Gemini is listening…</div>
            <div style={{ fontSize: 11, color: T.ink[500] }}>Transcribing &amp; extracting issue details</div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {result && !processing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ background: T.ink[50], borderRadius: 10, padding: "10px 12px", border: `1px solid ${T.ink[100]}` }}>
            <div style={{ fontFamily: T.fontMono, fontSize: 9, color: T.ink[500], letterSpacing: "0.12em", marginBottom: 4 }}>
              YOU SAID
            </div>
            <div style={{ fontSize: 13, color: T.ink[800], fontStyle: "italic", direction: "auto" as any }}>
              "{result.transcript}"
            </div>
          </div>
          {result.followUp && (
            <div style={{ background: "#FFF8E1", border: "1px solid #FDD835", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <div style={{ fontFamily: T.fontMono, fontSize: 9, color: "#F57F17", letterSpacing: "0.12em", flex: 1 }}>
                  ✱ AI ASKS {speaking && <span style={{ marginLeft: 4 }}>· SPEAKING</span>}
                </div>
                <button
                  onClick={() => (speaking ? stopSpeaking() : speak(result.followUp))}
                  style={{
                    all: "unset", cursor: "pointer",
                    width: 26, height: 26, borderRadius: 99,
                    background: speaking ? "#F57F17" : "#FFE082",
                    color: speaking ? "#fff" : "#5D4037",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13,
                  }}
                  aria-label={speaking ? "Stop speaking" : "Replay"}
                  title={speaking ? "Stop" : "Replay"}
                >
                  {speaking ? "■" : "▶"}
                </button>
              </div>
              <div style={{ fontSize: 13, color: "#5D4037", direction: "auto" as any, lineHeight: 1.5 }}>{result.followUp}</div>
              {speaking && (
                <div style={{ display: "flex", gap: 3, marginTop: 6, alignItems: "flex-end", height: 12 }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 3, background: "#F57F17", borderRadius: 2,
                        animation: `vrwave 0.9s ease-in-out ${i * 0.12}s infinite`,
                      }}
                    />
                  ))}
                  <style>{`@keyframes vrwave { 0%,100% { height: 4px; } 50% { height: 12px; } }`}</style>
                </div>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setResult(null); }}
              style={{
                all: "unset", cursor: "pointer", flex: 1,
                padding: "10px 12px", borderRadius: 10, textAlign: "center",
                border: `1px solid ${T.ink[200]}`, background: "#fff",
                fontSize: 13, fontWeight: 500, color: T.ink[700],
              }}
            >
              Re-record
            </button>
            <button
              onClick={start}
              style={{
                all: "unset", cursor: "pointer", flex: 1,
                padding: "10px 12px", borderRadius: 10, textAlign: "center",
                background: T.blue[600], color: "#fff",
                fontSize: 13, fontWeight: 600,
              }}
            >
              Add more detail
            </button>
          </div>
          <div style={{ fontSize: 11, color: T.resolved, fontWeight: 600, textAlign: "center", marginTop: 4 }}>
            ✓ Auto-filled the form below
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 8, padding: "8px 10px", background: "#FFEBEE", borderRadius: 8, fontSize: 12, color: "#C62828" }}>
          {error}
        </div>
      )}
    </div>
  );
}
