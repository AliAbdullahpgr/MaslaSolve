"use client";

import React, { useRef, useState, useCallback } from "react";
import { MS_TOKENS } from "~/lib/tokens";

const palettes = {
  paper: {
    bg: MS_TOKENS.mapBg,
    water: MS_TOKENS.mapWater,
    park: MS_TOKENS.mapPark,
    road: MS_TOKENS.mapRoad,
    roadSm: MS_TOKENS.mapRoadSm,
    stroke: MS_TOKENS.mapStroke,
    blockA: "#F4EFE0",
    blockB: "#EAE2CC",
    label: MS_TOKENS.ink[600],
    landmark: MS_TOKENS.ink[700],
  },
  cool: {
    bg: "#E8EEF1",
    water: "#A8C6D6",
    park: "#BFD4B5",
    road: "#FFFFFF",
    roadSm: "#F1F4F6",
    stroke: "#C5CFD5",
    blockA: "#EDF2F4",
    blockB: "#DDE5E9",
    label: "#3B4C56",
    landmark: "#22343D",
  },
};

type Palette = typeof palettes.paper;

function MapContent({ p, showLandmarks }: { p: Palette; showLandmarks: boolean }) {
  return (
    <>
      <rect x="0" y="0" width="1000" height="700" fill={p.bg} />

      <path d="M -20 80 C 80 110, 180 70, 280 110 S 460 90, 540 40 L 540 0 L -20 0 Z" fill={p.water} opacity="0.75" />
      <path d="M -20 80 C 80 110, 180 70, 280 110 S 460 90, 540 40" fill="none" stroke={p.stroke} strokeWidth="1" />

      <path d="M 980 110 C 820 220, 720 280, 600 380 S 400 600, 240 700" fill="none" stroke={p.water} strokeWidth="14" strokeLinecap="round" opacity="0.7" />
      <path d="M 980 110 C 820 220, 720 280, 600 380 S 400 600, 240 700" fill="none" stroke={p.stroke} strokeWidth="0.7" strokeDasharray="2 4" />

      {[
        { d: "M 220 180 L 360 170 L 380 250 L 360 320 L 240 330 L 200 260 Z", f: p.blockB },
        { d: "M 200 340 L 340 340 L 360 460 L 240 510 L 180 460 Z", f: p.blockA },
        { d: "M 380 250 L 540 250 L 580 350 L 420 360 L 380 320 Z", f: p.blockA },
        { d: "M 460 360 L 640 360 L 660 460 L 480 480 Z", f: p.blockB },
        { d: "M 540 480 L 740 470 L 760 600 L 560 620 Z", f: p.blockA },
        { d: "M 700 380 L 880 360 L 920 520 L 760 540 L 700 480 Z", f: p.blockB },
        { d: "M 760 200 L 920 180 L 940 320 L 800 340 Z", f: p.blockA },
        { d: "M 540 30 L 760 50 L 780 90 L 600 100 Z", f: p.blockB, op: 0.6 },
      ].map((b, i) => (
        <path key={i} d={b.d} fill={b.f} opacity={b.op ?? 1} stroke={p.stroke} strokeWidth="0.6" />
      ))}

      <ellipse cx="490" cy="305" rx="42" ry="22" fill={p.park} stroke={p.stroke} strokeWidth="0.5" />
      <ellipse cx="610" cy="420" rx="58" ry="28" fill={p.park} stroke={p.stroke} strokeWidth="0.5" />
      <ellipse cx="820" cy="460" rx="50" ry="26" fill={p.park} stroke={p.stroke} strokeWidth="0.5" />

      <g stroke={p.stroke} strokeWidth="0.6" fill="none">
        <path d="M 220 270 C 380 260, 520 280, 700 300" stroke={p.stroke} strokeWidth="14" />
        <path d="M 220 270 C 380 260, 520 280, 700 300" stroke={p.road} strokeWidth="11" strokeLinecap="round" />
        <path d="M 480 200 C 520 320, 580 460, 620 640" stroke={p.stroke} strokeWidth="12" />
        <path d="M 480 200 C 520 320, 580 460, 620 640" stroke={p.road} strokeWidth="9" strokeLinecap="round" />
        <path d="M 360 480 C 480 440, 580 400, 720 380" stroke={p.stroke} strokeWidth="10" />
        <path d="M 360 480 C 480 440, 580 400, 720 380" stroke={p.road} strokeWidth="7" strokeLinecap="round" />
        <path d="M 100 130 C 280 160, 440 140, 620 120 S 900 110, 980 100" stroke={p.stroke} strokeWidth="11" />
        <path d="M 100 130 C 280 160, 440 140, 620 120 S 900 110, 980 100" stroke={p.road} strokeWidth="8" strokeLinecap="round" />
        <path d="M 540 600 L 920 540" stroke={p.stroke} strokeWidth="9" />
        <path d="M 540 600 L 920 540" stroke={p.road} strokeWidth="6.5" strokeLinecap="round" />
      </g>

      <g stroke={p.roadSm} strokeWidth="2" opacity="0.9">
        {Array.from({ length: 18 }).map((_, i) => (
          <line key={"h" + i} x1={120 + i * 8} y1={180 + (i % 4) * 20} x2={920 + (i % 3) * 4} y2={200 + i * 22} />
        ))}
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={"v" + i} x1={180 + i * 50} y1={130} x2={220 + i * 48} y2={680} />
        ))}
      </g>

      <g>
        <circle cx="540" cy="360" r="8" fill={p.road} stroke={p.stroke} strokeWidth="1" />
        <circle cx="540" cy="360" r="3" fill={p.park} />
        <circle cx="700" cy="420" r="6" fill={p.road} stroke={p.stroke} strokeWidth="1" />
      </g>

      {showLandmarks && (
        <g fontFamily={MS_TOKENS.fontMono} fontSize="9" fill={p.landmark} letterSpacing="0.04em">
          <Landmark x={300} y={220} label="WALLED CITY" />
          <Landmark x={490} y={300} label="LAWRENCE GDN." />
          <Landmark x={620} y={420} label="RACE COURSE" align="start" />
          <Landmark x={540} y={362} label="LIBERTY" align="start" dy={-14} />
          <Landmark x={820} y={460} label="DHA PARK" />
          <Landmark x={840} y={250} label="JOHAR TOWN" />
          <Landmark x={620} y={580} label="CANTT" />
          <Landmark x={170} y={540} label="MULTAN RD" align="start" />
          <Landmark x={680} y={70} label="RAVI →" align="start" />
        </g>
      )}

      <g transform="translate(940, 80)" fontFamily={MS_TOKENS.fontMono} fontSize="9" fill={p.landmark}>
        <circle r="14" fill={p.road} stroke={p.stroke} />
        <path d="M 0 -10 L 3 0 L 0 10 L -3 0 Z" fill={p.landmark} />
        <text x="0" y="-18" textAnchor="middle">N</text>
      </g>
    </>
  );
}

export function LahoreMap({
  width = 1000,
  height = 700,
  viewBox = "0 0 1000 700",
  showLabels: _showLabels = true,
  showLandmarks = true,
  mood = "paper",
  interactive = false,
  children,
  style = {},
}: {
  width?: string | number;
  height?: string | number;
  viewBox?: string;
  showLabels?: boolean;
  showLandmarks?: boolean;
  mood?: "paper" | "cool";
  interactive?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const p = palettes[mood] ?? palettes.paper;

  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const lastPinchDist = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const clampZoom = (z: number) => Math.min(5, Math.max(0.4, z));

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!interactive) return;
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    setIsDragging(true);
  }, [interactive, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!interactive || !dragStart.current) return;
    const parts = (viewBox || "0 0 1000 700").split(" ").map(Number);
    const vw = (parts[2] ?? 1000) / zoom;
    const svgW = svgRef.current?.clientWidth ?? 400;
    const scale = vw / svgW;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.mx) * scale,
      y: dragStart.current.py + (e.clientY - dragStart.current.my) * scale,
    });
  }, [interactive, zoom, viewBox]);

  const handleMouseUp = useCallback(() => {
    dragStart.current = null;
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!interactive) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.2 : 0.85;
    setZoom(z => clampZoom(z * factor));
  }, [interactive]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!interactive) return;
    if (e.touches.length === 1) {
      dragStart.current = { mx: e.touches[0]!.clientX, my: e.touches[0]!.clientY, px: pan.x, py: pan.y };
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    }
  }, [interactive, pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!interactive) return;
    e.preventDefault();
    if (e.touches.length === 1 && dragStart.current) {
      const parts = (viewBox || "0 0 1000 700").split(" ").map(Number);
      const vw = (parts[2] ?? 1000) / zoom;
      const svgW = svgRef.current?.clientWidth ?? 400;
      const scale = vw / svgW;
      setPan({
        x: dragStart.current.px + (e.touches[0]!.clientX - dragStart.current.mx) * scale,
        y: dragStart.current.py + (e.touches[0]!.clientY - dragStart.current.my) * scale,
      });
    } else if (e.touches.length === 2 && lastPinchDist.current != null) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      const dist = Math.hypot(dx, dy);
      setZoom(z => clampZoom(z * (dist / lastPinchDist.current!)));
      lastPinchDist.current = dist;
    }
  }, [interactive, zoom, viewBox]);

  const handleTouchEnd = useCallback(() => {
    dragStart.current = null;
    lastPinchDist.current = null;
    setIsDragging(false);
  }, []);

  if (!interactive) {
    return (
      <svg width={width} height={height} viewBox={viewBox} style={style} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <MapContent p={p} showLandmarks={showLandmarks} />
        {children}
      </svg>
    );
  }

  const parts = (viewBox || "0 0 1000 700").split(" ").map(Number);
  const [vx, vy, vw, vh] = parts as [number, number, number, number];
  const transformedViewBox = `${vx - pan.x} ${vy - pan.y} ${vw / zoom} ${vh / zoom}`;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={transformedViewBox}
      style={{ ...style, cursor: isDragging ? "grabbing" : "grab", touchAction: "none", userSelect: "none" }}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <MapContent p={p} showLandmarks={showLandmarks} />
      {children}
    </svg>
  );
}

function Landmark({ x, y, label, align = "middle", dy = 4 }: { x: number; y: number; label: string; align?: "middle" | "start"; dy?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="2.2" fill={MS_TOKENS.ink[700]} />
      <text x={align === "start" ? x + 6 : x} y={y + dy + 10} textAnchor={align}>
        {label}
      </text>
    </g>
  );
}

export function MapPin({
  x,
  y,
  color = "#1F6FEB",
  label,
  size = 24,
  pulse = false,
  glyph,
}: {
  x: number;
  y: number;
  color?: string;
  label?: string;
  size?: number;
  pulse?: boolean;
  glyph?: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {pulse && (
        <circle r="22" fill={color} opacity="0.18">
          <animate attributeName="r" values="14;28;14" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.28;0;0.28" dur="2.4s" repeatCount="indefinite" />
        </circle>
      )}
      <path
        d={`M 0 -${size} C ${size * 0.7} -${size} ${size * 0.7} -${size * 0.2} 0 0 C -${size * 0.7} -${size * 0.2} -${size * 0.7} -${size} 0 -${size} Z`}
        transform={`translate(0 ${-2})`}
        fill={color}
        stroke="white"
        strokeWidth="2"
      />
      <circle cx="0" cy={-size + 2} r={size * 0.32} fill="white" />
      {glyph && (
        <text x="0" y={-size + 5} textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>
          {glyph}
        </text>
      )}
      {label && (
        <g transform={`translate(${size * 0.55} -${size + 6})`}>
          <rect x="0" y="-9" width={label.length * 5.5 + 12} height="16" rx="8" fill="white" stroke="rgba(0,0,0,0.08)" />
          <text x="6" y="3" fontSize="10" fontFamily={MS_TOKENS.fontMono} fill="#22343D">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}
