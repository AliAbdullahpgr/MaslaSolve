import React from "react";

export const MSIcons: Record<
  string,
  React.FC<{ s?: number; c?: string }>
> = {
  Pothole: ({ s = 22, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17c2-3 6-4 9-4s7 1 9 4" />
      <ellipse cx="12" cy="17" rx="5" ry="2.2" fill={c} fillOpacity=".15" />
      <path d="M8 9l1 2M14 7l1 2M19 11l1 1" />
    </svg>
  ),
  Garbage: ({ s = 22, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7h14l-1.2 12.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7z" />
      <path d="M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7" />
      <path d="M3 7h18M10 11v6M14 11v6" />
    </svg>
  ),
  Traffic: ({ s = 22, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="3" width="8" height="16" rx="3" />
      <circle cx="12" cy="7" r="1.2" fill={c} />
      <circle cx="12" cy="11" r="1.2" />
      <circle cx="12" cy="15" r="1.2" />
      <path d="M12 19v2M9 21h6" />
    </svg>
  ),
  Streetlight: ({ s = 22, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21V8" />
      <path d="M7 8h10l-1.5-3h-7L7 8z" />
      <path d="M12 8V5" />
      <path d="M5 21h14" />
      <path d="M9.5 5l1-1.5h3l1 1.5" />
    </svg>
  ),
  Sewage: ({ s = 22, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M5 9h14M5 15h14M9 5l-2 14M15 5l2 14" />
    </svg>
  ),
  Water: ({ s = 22, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c4 5 6 8 6 11a6 6 0 1 1-12 0c0-3 2-6 6-11z" />
    </svg>
  ),
  Other: ({ s = 22, c = "currentColor" }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9.5a3 3 0 1 1 4.5 2.6c-.9.4-1.5 1-1.5 2v.4M12 17h.01" />
    </svg>
  ),
};

export type Category = {
  id: string;
  label: string;
  icon: string;
  hue: string;
};

export const MSCategories: Category[] = [
  { id: "pothole", label: "Pothole", icon: "Pothole", hue: "#D83A1F" },
  { id: "garbage", label: "Garbage", icon: "Garbage", hue: "#7A5D2A" },
  { id: "traffic", label: "Traffic Signal", icon: "Traffic", hue: "#C68A12" },
  { id: "streetlight", label: "Streetlight", icon: "Streetlight", hue: "#1F6FEB" },
  { id: "sewage", label: "Sewage / Drain", icon: "Sewage", hue: "#1B7F4D" },
  { id: "water", label: "Water Leak", icon: "Water", hue: "#0E7C7B" },
];

export type Issue = {
  id: string;
  title: string;
  category: string;
  location: string;
  area: string;
  coords: { x: number; y: number };
  upvotes: number;
  status: "reported" | "progress" | "resolved";
  priority: "urgent" | "high" | "medium" | "low";
  reportedAt: string;
  resolvedAt?: string;
  reporter: string;
  distance: string;
  photo: string;
  photoBefore?: string;
  desc: string;
  timeline?: { t: string; at: string; done: boolean; note?: string }[];
};

export const MSIssues: Issue[] = [
  {
    id: "MS-2841",
    title: "Crater-sized pothole at Liberty roundabout",
    category: "pothole",
    location: "Liberty Chowk, Gulberg III",
    area: "Gulberg",
    coords: { x: 540, y: 360 },
    upvotes: 312,
    status: "progress",
    priority: "urgent",
    reportedAt: "2026-04-22",
    reporter: "Ayesha K.",
    distance: "0.4 km",
    photo: "https://j3iyjjcdsn.ufs.sh/f/d6eWO3XMcWqjLXNvNjbyt4NHIA2q76S13TkYrRxeWiKBcf8d",
    desc: "Massive pothole right at the Liberty roundabout exit toward MM Alam. Bikes have been crashing into it after dark.",
    timeline: [
      { t: "Reported", at: "22 Apr · 9:14 am", done: true },
      { t: "Verified", at: "22 Apr · 11:02 am", done: true, note: "12 neighbours confirmed" },
      { t: "In Progress", at: "24 Apr · 8:30 am", done: true, note: "Assigned to LDA Roads Div." },
      { t: "Resolved", at: "ETA 27 Apr", done: false },
    ],
  },
  {
    id: "MS-2839",
    title: "Streetlights out for 3 nights — Y Block",
    category: "streetlight",
    location: "Y Block, DHA Phase 3",
    area: "DHA",
    coords: { x: 760, y: 470 },
    upvotes: 184,
    status: "reported",
    priority: "urgent",
    reportedAt: "2026-04-23",
    reporter: "Hassan A.",
    distance: "2.1 km",
    photo: "https://j3iyjjcdsn.ufs.sh/f/d6eWO3XMcWqj4q7etzqhX6oWuLeOA4TsBvrzgDJkx0aRcYIH",
    desc: "Entire stretch from Y Block market to commercial area is pitch black. Women avoid the route after Maghrib.",
    timeline: [
      { t: "Reported", at: "23 Apr · 8:41 pm", done: true },
      { t: "Verified", at: "24 Apr · 10:00 am", done: true },
      { t: "In Progress", at: "—", done: false },
      { t: "Resolved", at: "—", done: false },
    ],
  },
  {
    id: "MS-2837",
    title: "Garbage pile blocking footpath",
    category: "garbage",
    location: "Mozang Chungi, near bus stop",
    area: "Old Lahore",
    coords: { x: 360, y: 410 },
    upvotes: 96,
    status: "reported",
    priority: "high",
    reportedAt: "2026-04-23",
    reporter: "Bilal R.",
    distance: "3.6 km",
    photo: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=900&q=70",
    desc: "Hasn't been picked in 4 days. Dogs are tearing it open. Smell is unbearable.",
  },
  {
    id: "MS-2830",
    title: "Traffic signal stuck on red — Ferozepur Rd",
    category: "traffic",
    location: "Ferozepur Rd × Walton Rd",
    area: "Cantt",
    coords: { x: 620, y: 540 },
    upvotes: 421,
    status: "progress",
    priority: "urgent",
    reportedAt: "2026-04-21",
    reporter: "Sana M.",
    distance: "5.2 km",
    photo: "https://j3iyjjcdsn.ufs.sh/f/d6eWO3XMcWqj4TN7iMhX6oWuLeOA4TsBvrzgDJkx0aRcYIH2",
    desc: "Signal stuck on red for southbound traffic. Causing 30-min jams during evening rush.",
  },
  {
    id: "MS-2820",
    title: "Sewage overflow on side street",
    category: "sewage",
    location: "Wahdat Rd, behind market",
    area: "Iqbal Town",
    coords: { x: 280, y: 480 },
    upvotes: 67,
    status: "reported",
    priority: "medium",
    reportedAt: "2026-04-22",
    reporter: "Rabia S.",
    distance: "6.0 km",
    photo: "https://j3iyjjcdsn.ufs.sh/f/d6eWO3XMcWqjKJCDv9y0mEBhjJMxYGH3rfS92sZVdc8IXD1i",
    desc: "Manhole overflowing, leaking into the lane. Has happened three monsoons in a row.",
  },
  {
    id: "MS-2811",
    title: "Pothole resolved — Mall Rd near GPO",
    category: "pothole",
    location: "Mall Rd, near GPO Chowk",
    area: "Mall Road",
    coords: { x: 470, y: 320 },
    upvotes: 211,
    status: "resolved",
    priority: "medium",
    reportedAt: "2026-04-15",
    resolvedAt: "2026-04-20",
    reporter: "Usman T.",
    distance: "4.1 km",
    photo: "https://j3iyjjcdsn.ufs.sh/f/d6eWO3XMcWqjdBTeZaXMcWqj20ewUs8typL3oxViaJEfmDZn",
    photoBefore: "https://j3iyjjcdsn.ufs.sh/f/d6eWO3XMcWqjD4y3aNsXiIP3GqJgKYpv2komya5ZsejdNcVw",
    desc: "Repaired by City District Government within 5 days. Smooth tarmac restored.",
  },
];

export function MSGetCat(id: string) {
  return MSCategories.find((c) => c.id === id) ?? { id: "other", label: "Other", icon: "Other", hue: "#8B98A0" };
}

export function getIcon(name: string): React.FC<{ s?: number; c?: string }> {
  return (MSIcons[name] ?? MSIcons.Other)!;
}

export const MSStatusMeta: Record<string, { label: string; fg: string; bg: string }> = {
  reported: { label: "Reported", fg: "#5C6B74", bg: "#E2E6E9" },
  progress: { label: "In Progress", fg: "#8C5E08", bg: "#F7E7BD" },
  resolved: { label: "Resolved", fg: "#155F39", bg: "#D8EBDD" },
};

export const MSPriorityMeta: Record<string, { label: string; fg: string; bg: string }> = {
  urgent: { label: "Urgent", fg: "#9A2113", bg: "#FAD9D2" },
  high: { label: "High", fg: "#8C5E08", bg: "#F7E7BD" },
  medium: { label: "Medium", fg: "#22343D", bg: "#DDE3E7" },
  low: { label: "Low", fg: "#3B4C56", bg: "#EEF1F3" },
};
