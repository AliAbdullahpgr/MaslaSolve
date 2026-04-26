"use client";

import React, { useEffect, useState } from "react";
import { MS_TOKENS } from "~/lib/tokens";

const QUOTES = [
  { en: "Every pothole has a story.", ur: "ہر شکایت کی ایک آواز ہے۔" },
  { en: "Lahore, fixed together.", ur: "لاہور، ہم مل کر۔" },
  { en: "Your report reaches the right desk.", ur: "آپ کی بات صحیح جگہ پہنچے گی۔" },
];

export default function Loader() {
  const T = MS_TOKENS;
  const [q, setQ] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setQ((x) => (x + 1) % QUOTES.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        flex: 1,
        overflow: "hidden",
        background: `radial-gradient(ellipse at 50% 30%, #FFF7E6 0%, ${T.paper} 60%)`,
        color: T.ink[900],
        fontFamily: T.fontUI,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.4 }}>
        <defs>
          <pattern id="msDotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill={T.ink[200]} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#msDotGrid)" />
      </svg>

      <div style={{ marginTop: 60, textAlign: "center", position: "relative", zIndex: 1 }}>
        <div
          style={{
            fontFamily: T.fontMono,
            fontSize: 10,
            color: T.ink[500],
            letterSpacing: "0.2em",
          }}
        >
          MASLASOLVE
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          width: "100%",
          zIndex: 1,
        }}
      >
        <div style={{ position: "relative", width: 220, height: 220 }}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 28,
              width: 80,
              height: 14,
              transform: "translateX(-50%)",
              background: "radial-gradient(ellipse, rgba(11,26,36,0.25) 0%, transparent 70%)",
              animation: "msShadow 1.6s ease-in-out infinite",
            }}
          />
          <svg
            viewBox="0 0 200 200"
            width="220"
            height="220"
            style={{ position: "absolute", inset: 0, animation: "msBounce 1.6s ease-in-out infinite" }}
          >
            <circle cx="100" cy="156" r="8" fill="none" stroke={T.blue[600]} strokeWidth="1.5">
              <animate attributeName="r" values="8;38;8" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <path
              d="M 100 30 C 140 30 155 65 155 95 C 155 125 130 145 100 156 C 70 145 45 125 45 95 C 45 65 60 30 100 30 Z"
              fill={T.blue[600]}
              stroke={T.ink[900]}
              strokeWidth="3"
            />
            <circle cx="100" cy="88" r="22" fill={T.paper} stroke={T.ink[900]} strokeWidth="2.5" />
            <text
              x="100"
              y="96"
              textAnchor="middle"
              fontFamily={T.fontDisplay}
              fontSize="26"
              fontWeight="700"
              fill={T.ink[900]}
            >
              M
            </text>
            <ellipse cx="84" cy="60" rx="10" ry="6" fill="rgba(255,255,255,0.35)" />
          </svg>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "0 32px", maxWidth: 360, zIndex: 1 }}>
        <div
          key={q}
          style={{
            fontFamily: T.fontDisplay,
            fontSize: 22,
            fontWeight: 600,
            color: T.ink[900],
            letterSpacing: "-0.01em",
            lineHeight: 1.3,
            animation: "msFadeQuote 0.5s ease",
          }}
        >
          {QUOTES[q]!.en}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 18,
            color: T.ink[600],
            fontFamily: '"Noto Naskh Arabic", "Noto Nastaliq Urdu", serif',
            direction: "rtl",
            lineHeight: 1.6,
          }}
        >
          {QUOTES[q]!.ur}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, margin: "36px 0 26px", zIndex: 1 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: T.ink[300],
              animation: `msDot 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>

      <div
        style={{
          padding: "0 22px 28px",
          textAlign: "center",
          zIndex: 1,
          fontFamily: T.fontMono,
          fontSize: 9,
          color: T.ink[500],
          letterSpacing: "0.14em",
        }}
      >
        BUILT IN LAHORE · FOR LAHORE
      </div>

      <style>{`
        @keyframes msBounce {
          0%   { transform: translateY(-30px); }
          25%  { transform: translateY(0); }
          35%  { transform: translateY(-12px); }
          50%  { transform: translateY(0); }
          60%  { transform: translateY(-4px); }
          70%  { transform: translateY(0); }
          100% { transform: translateY(-30px); }
        }
        @keyframes msShadow {
          0%   { transform: translateX(-50%) scale(0.4); opacity: 0.2; }
          25%  { transform: translateX(-50%) scale(1);   opacity: 0.7; }
          50%  { transform: translateX(-50%) scale(0.85); opacity: 0.5; }
          100% { transform: translateX(-50%) scale(0.4); opacity: 0.2; }
        }
        @keyframes msDot { 0%,100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.5); opacity: 1; background: ${T.blue[600]}; } }
        @keyframes msFadeQuote { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
