import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { T } from "../tokens";
import { useFadeIn, useFadeOut } from "../helpers";

const STATS = [
  { value: 70, suffix: "%", label: "of Pakistanis prefer voice", sub: "Urdu / Roman Urdu / English supported natively" },
  { value: 5, suffix: "x", label: "fewer duplicate reports", sub: "Embeddings cluster the same incident" },
  { value: 8, suffix: "s", label: "from voice to dispatch", sub: "End-to-end with the agentic triage pipeline" },
];

const Counter: React.FC<{ target: number; suffix: string; startFrame: number }> = ({
  target,
  suffix,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [startFrame, startFrame + 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const eased = 1 - Math.pow(1 - t, 3);
  const value = Math.round(target * eased);
  return (
    <div
      style={{
        fontFamily: T.fontDisplay,
        fontSize: 130,
        fontWeight: 700,
        letterSpacing: "-0.05em",
        color: "#fff",
        lineHeight: 1,
      }}
    >
      {value}
      <span style={{ color: "#FF8A65" }}>{suffix}</span>
    </div>
  );
};

export const ImpactStats: React.FC<{ startFrame: number; endFrame: number }> = ({
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const fadeIn = useFadeIn(startFrame, 18);
  const fadeOut = useFadeOut(endFrame - 18, 18);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 90% at 50% 50%, #1a2a3a 0%, ${T.ink[900]} 60%, #050d14 100%)`,
        opacity: Math.min(fadeIn, fadeOut),
        fontFamily: T.fontUI,
      }}
    >
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 100px" }}>
        <div
          style={{
            fontFamily: T.fontMono,
            fontSize: 18,
            color: "#FF8A65",
            letterSpacing: "0.32em",
            marginBottom: 16,
            opacity: useFadeIn(startFrame + 6, 18),
          }}
        >
          ENGINEERED FOR IMPACT
        </div>
        <div
          style={{
            fontFamily: T.fontDisplay,
            fontSize: 60,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.03em",
            marginBottom: 60,
            opacity: useFadeIn(startFrame + 18, 18),
            textAlign: "center",
          }}
        >
          Real AI. Real outcomes.
        </div>
        <div style={{ display: "flex", gap: 60 }}>
          {STATS.map((s, i) => {
            const opacity = useFadeIn(startFrame + 30 + i * 14, 18);
            return (
              <div
                key={i}
                style={{
                  textAlign: "center",
                  opacity,
                  transform: `translateY(${(1 - opacity) * 16}px)`,
                  width: 380,
                }}
              >
                <Counter target={s.value} suffix={s.suffix} startFrame={startFrame + 30 + i * 14} />
                <div style={{ fontSize: 22, color: "#fff", marginTop: 12, fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", marginTop: 6, lineHeight: 1.4 }}>
                  {s.sub}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <span style={{ display: "none" }}>{frame}</span>
    </AbsoluteFill>
  );
};
