"use client";

import Link from "next/link";
import { MS_TOKENS } from "~/lib/tokens";

export default function ComingSoonPage() {
  const T = MS_TOKENS;
  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.ink[900],
        color: "#fff",
        fontFamily: T.fontUI,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div
        style={{
          fontFamily: T.fontDisplay,
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: "-0.03em",
        }}
      >
        COMING SOON
      </div>
      <Link
        href="/dashboard"
        style={{
          fontFamily: T.fontMono,
          fontSize: 12,
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.6)",
          textDecoration: "none",
        }}
      >
        ← BACK
      </Link>
    </div>
  );
}
