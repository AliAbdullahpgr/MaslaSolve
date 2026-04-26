"use client";

import React from "react";
import { MS_TOKENS } from "~/lib/tokens";
import { MSStatusMeta, MSPriorityMeta, MSGetCat, getIcon } from "~/lib/data";

export function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const m = (MSStatusMeta[status] ?? MSStatusMeta.reported)!;
  const pad = size === "sm" ? "3px 8px" : "5px 10px";
  const fs = size === "sm" ? 10 : 11;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: pad,
        borderRadius: 99,
        background: m.bg,
        color: m.fg,
        fontSize: fs,
        fontWeight: 600,
        fontFamily: MS_TOKENS.fontUI,
        letterSpacing: "0.02em",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 99, background: m.fg, marginRight: 6 }} />
      {m.label.toUpperCase()}
    </span>
  );
}

export function PriorityBadge({ priority, size = "md" }: { priority: string; size?: "sm" | "md" }) {
  const m = (MSPriorityMeta[priority] ?? MSPriorityMeta.medium)!;
  const pad = size === "sm" ? "2px 7px" : "4px 9px";
  const fs = size === "sm" ? 10 : 11;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: pad,
        borderRadius: 6,
        background: m.bg,
        color: m.fg,
        fontSize: fs,
        fontWeight: 700,
        fontFamily: MS_TOKENS.fontMono,
        letterSpacing: "0.04em",
      }}
    >
      {m.label.toUpperCase()}
    </span>
  );
}

export function CategoryChip({ catId, size = "md" }: { catId: string; size?: "sm" | "md" }) {
  const cat = MSGetCat(catId);
  const Icon = getIcon(cat.icon);
  const pad = size === "sm" ? "4px 9px 4px 6px" : "6px 12px 6px 8px";
  const fs = size === "sm" ? 11 : 12;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: pad,
        borderRadius: 99,
        background: MS_TOKENS.surface,
        border: `1px solid ${MS_TOKENS.ink[200]}`,
        color: MS_TOKENS.ink[800],
        fontSize: fs,
        fontWeight: 500,
        fontFamily: MS_TOKENS.fontUI,
      }}
    >
      <span style={{ color: cat.hue, display: "inline-flex" }}>
        <Icon s={size === "sm" ? 14 : 16} />
      </span>
      {cat.label}
    </span>
  );
}

export function Upvote({ count, voted, onToggle, size = "md" }: { count: number; voted: boolean; onToggle?: () => void; size?: "sm" | "md" | "lg" }) {
  const big = size === "lg";
  return (
    <button
      onClick={onToggle}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "inline-flex",
        flexDirection: big ? "column" : "row",
        alignItems: "center",
        gap: big ? 2 : 6,
        padding: big ? "10px 14px" : "6px 10px",
        borderRadius: big ? 14 : 10,
        background: voted ? MS_TOKENS.blue[600] : MS_TOKENS.surface,
        border: `1px solid ${voted ? MS_TOKENS.blue[600] : MS_TOKENS.ink[200]}`,
        color: voted ? "#fff" : MS_TOKENS.ink[800],
        fontFamily: MS_TOKENS.fontUI,
        fontWeight: 600,
        transition: "all 0.15s ease",
        minWidth: big ? 64 : "auto",
      }}
    >
      <svg
        width={big ? 18 : 14}
        height={big ? 18 : 14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 4l8 9h-5v7h-6v-7H4z" fill={voted ? "currentColor" : "none"} />
      </svg>
      <span style={{ fontSize: big ? 16 : 13, fontVariantNumeric: "tabular-nums" }}>{count}</span>
      {big && (
        <span style={{ fontSize: 9, fontFamily: MS_TOKENS.fontMono, opacity: 0.8, letterSpacing: "0.06em" }}>
          UPVOTES
        </span>
      )}
    </button>
  );
}

export function IconBtn({ children, onClick, label, active = false }: { children: React.ReactNode; onClick?: () => void; label?: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        all: "unset",
        cursor: "pointer",
        width: 38,
        height: 38,
        borderRadius: 10,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? MS_TOKENS.ink[900] : MS_TOKENS.surface,
        color: active ? "#fff" : MS_TOKENS.ink[700],
        border: `1px solid ${active ? MS_TOKENS.ink[900] : MS_TOKENS.ink[200]}`,
        boxShadow: MS_TOKENS.shadow.sm,
      }}
    >
      {children}
    </button>
  );
}

export function SectionHead({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 }}>
      <div>
        {eyebrow && (
          <div
            style={{
              fontFamily: MS_TOKENS.fontMono,
              fontSize: 10,
              color: MS_TOKENS.ink[500],
              letterSpacing: "0.12em",
              marginBottom: 2,
            }}
          >
            {eyebrow.toUpperCase()}
          </div>
        )}
        <div
          style={{
            fontFamily: MS_TOKENS.fontDisplay,
            fontSize: 18,
            fontWeight: 600,
            color: MS_TOKENS.ink[900],
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
      </div>
      {action}
    </div>
  );
}
