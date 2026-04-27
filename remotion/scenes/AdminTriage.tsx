import { AbsoluteFill, useCurrentFrame } from "remotion";
import { T } from "../tokens";
import { useFadeIn, useFadeOut } from "../helpers";

type Step = {
  tag: string;
  title: string;
  detail: string;
  delayFrames: number;
  durationFrames: number;
};

const STEPS: Step[] = [
  {
    tag: "✓ VISION CHECK",
    title: "Photo validated against category",
    detail: "Looks legit. Photo shows a streetlight pole, matches reported category.",
    delayFrames: 30,
    durationFrames: 70,
  },
  {
    tag: "▦ EMBEDDING SEARCH",
    title: "Found 3 likely duplicates",
    detail: "92%, 87%, 81% match · same 2km radius · last 30 days",
    delayFrames: 110,
    durationFrames: 80,
  },
  {
    tag: "⌖ DEPARTMENT ROUTER",
    title: "Routed to WAPDA / LDA",
    detail: "Electrical Maintenance · standard SLA",
    delayFrames: 200,
    durationFrames: 70,
  },
  {
    tag: "✎ CITIZEN REPLY (URDU)",
    title: "Acknowledgment drafted",
    detail: "آپ کی شکایت موصول ہوگئی ہے۔ WAPDA کو بھیج دی گئی ہے۔",
    delayFrames: 280,
    durationFrames: 100,
  },
  {
    tag: "✎ DISPATCH ORDER",
    title: "Field crew work order ready",
    detail:
      "Subject: Dispatch — STREETLIGHT — G-9\nInspect & restore streetlight near G-9 Markaz.\nPriority: MEDIUM",
    delayFrames: 390,
    durationFrames: 130,
  },
];

const StepCard: React.FC<{ step: Step; baseFrame: number; index: number }> = ({
  step,
  baseFrame,
  index,
}) => {
  const frame = useCurrentFrame();
  const startAt = baseFrame + step.delayFrames;
  const opacity = useFadeIn(startAt, 14);
  const completeAt = startAt + 28;
  const isDone = frame >= completeAt;
  const localFrame = frame - startAt;

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${(1 - opacity) * 40}px)`,
        background: "#fff",
        borderRadius: 14,
        padding: "16px 18px",
        marginBottom: 12,
        border: `1px solid ${isDone ? "#D5C2FF" : "#EADBFF"}`,
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        boxShadow: isDone ? "0 4px 12px rgba(110,72,240,0.12)" : "none",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 99,
          background: isDone ? T.resolved : "#F4EEFF",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {isDone ? (
          "✓"
        ) : (
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 99,
              border: `3px solid ${T.blue[600]}`,
              borderTopColor: "transparent",
              transform: `rotate(${localFrame * 14}deg)`,
            }}
          />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: T.fontMono,
            fontSize: 13,
            color: T.purple,
            letterSpacing: "0.16em",
            marginBottom: 4,
          }}
        >
          {step.tag}
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, color: T.ink[900], marginBottom: 6 }}>
          {step.title}
        </div>
        <pre
          style={{
            margin: 0,
            fontFamily: index >= 4 ? T.fontMono : T.fontUI,
            fontSize: 16,
            color: T.ink[700],
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            // @ts-expect-error – CSS direction `auto` is fine in browsers / Chromium
            direction: "auto",
          }}
        >
          {step.detail}
        </pre>
      </div>
    </div>
  );
};

export const AdminTriage: React.FC<{ startFrame: number; endFrame: number }> = ({
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const fadeIn = useFadeIn(startFrame, 18);
  const fadeOut = useFadeOut(endFrame - 18, 18);

  return (
    <AbsoluteFill
      style={{
        background: T.paper,
        opacity: Math.min(fadeIn, fadeOut),
        fontFamily: T.fontUI,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: useFadeIn(startFrame + 6, 18),
        }}
      >
        <div
          style={{
            fontFamily: T.fontMono,
            fontSize: 18,
            color: T.purple,
            letterSpacing: "0.32em",
            marginBottom: 10,
          }}
        >
          STEP 3 · AGENTIC TRIAGE
        </div>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 56, fontWeight: 700, letterSpacing: "-0.02em", color: T.ink[900] }}>
          5 AI tools work in sequence — live
        </div>
      </div>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
        <div
          style={{
            width: 1100,
            background: "linear-gradient(180deg, #FAF7FF 0%, #F0E9FF 100%)",
            borderRadius: 24,
            padding: 28,
            border: "2px solid #DBC9FF",
            boxShadow: "0 30px 60px rgba(110,72,240,0.18)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${T.blue[600]}, ${T.purple})`,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              ✱
            </div>
            <div>
              <div
                style={{
                  fontFamily: T.fontMono,
                  fontSize: 13,
                  color: T.purple,
                  letterSpacing: "0.18em",
                }}
              >
                MASLAHAL · TRIAGE AGENT
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: T.ink[800] }}>
                Running tools…
              </div>
            </div>
          </div>

          {STEPS.map((s, i) => (
            <StepCard key={i} step={s} baseFrame={startFrame} index={i} />
          ))}
        </div>
      </AbsoluteFill>
      <span style={{ display: "none" }}>{frame}</span>
    </AbsoluteFill>
  );
};
