import { AbsoluteFill, useCurrentFrame } from "remotion";
import { T } from "../tokens";
import { useFadeIn, useFadeOut, useRise, useSpringIn } from "../helpers";

export const HeroIntro: React.FC<{ startFrame: number; endFrame: number }> = ({
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;
  const logoSpring = useSpringIn(startFrame + 6);
  const titleFade = useFadeIn(startFrame + 30, 24);
  const subFade = useFadeIn(startFrame + 60, 24);
  const fadeOut = useFadeOut(endFrame - 18, 18);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 90% at 50% 30%, #1a2a3a 0%, ${T.ink[900]} 60%, #050d14 100%)`,
        opacity: fadeOut,
        fontFamily: T.fontUI,
      }}
    >
      {/* Subtle grid */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06 }}
      >
        <defs>
          <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#fff" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)" />
      </svg>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        {/* Logo M */}
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 36,
            background: `linear-gradient(135deg, ${T.blue[500]}, ${T.purple})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontFamily: T.fontDisplay,
            fontWeight: 700,
            fontSize: 72,
            transform: `scale(${0.6 + 0.4 * logoSpring})`,
            boxShadow: "0 30px 80px rgba(110,72,240,0.45)",
            marginBottom: 36,
          }}
        >
          M
        </div>

        <div
          style={{
            opacity: titleFade,
            transform: `translateY(${(1 - titleFade) * 16}px)`,
            fontFamily: T.fontDisplay,
            color: "#fff",
            fontSize: 116,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            marginBottom: 18,
          }}
        >
          Maslahal
        </div>

        <div
          style={{
            opacity: subFade,
            transform: `translateY(${(1 - subFade) * 12}px)`,
            color: "rgba(255,255,255,0.78)",
            fontSize: 30,
            fontWeight: 400,
            maxWidth: 900,
            lineHeight: 1.35,
          }}
        >
          AI-powered civic reporting, built for Pakistan
        </div>

        {/* Bottom hook */}
        <div
          style={{
            position: "absolute",
            bottom: 80,
            opacity: useFadeIn(startFrame + 110, 24),
            color: "#FF8A65",
            fontFamily: T.fontMono,
            fontSize: 16,
            letterSpacing: "0.32em",
          }}
        >
          70% OF CITIZENS CAN SPEAK IT — BUT NOT TYPE IT
        </div>
      </AbsoluteFill>
      {/* unused but kept for parity */}
      <span style={{ display: "none" }}>{local}</span>
    </AbsoluteFill>
  );
};
