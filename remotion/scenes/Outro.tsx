import { AbsoluteFill, useCurrentFrame } from "remotion";
import { T } from "../tokens";
import { useFadeIn, useFadeOut, useSpringIn } from "../helpers";

export const Outro: React.FC<{ startFrame: number; endFrame: number }> = ({
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const fadeIn = useFadeIn(startFrame, 18);
  const fadeOut = useFadeOut(endFrame - 18, 18);
  const logoSpring = useSpringIn(startFrame + 6);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 100% at 50% 50%, #16273a 0%, ${T.ink[900]} 60%, #050d14 100%)`,
        opacity: Math.min(fadeIn, fadeOut),
        fontFamily: T.fontUI,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 32,
            background: `linear-gradient(135deg, ${T.blue[500]}, ${T.purple})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontFamily: T.fontDisplay,
            fontWeight: 700,
            fontSize: 60,
            margin: "0 auto 32px",
            transform: `scale(${0.7 + 0.3 * logoSpring})`,
            boxShadow: "0 30px 80px rgba(110,72,240,0.4)",
          }}
        >
          M
        </div>
        <div
          style={{
            fontFamily: T.fontDisplay,
            fontSize: 96,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            opacity: useFadeIn(startFrame + 24, 18),
          }}
        >
          Maslahal
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 26,
            marginTop: 18,
            opacity: useFadeIn(startFrame + 36, 18),
          }}
        >
          Civic action, in any language you speak.
        </div>
        <div
          style={{
            marginTop: 60,
            fontFamily: T.fontMono,
            fontSize: 18,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "0.22em",
            opacity: useFadeIn(startFrame + 60, 18),
          }}
        >
          MASLAHAL.APP
        </div>
      </div>
      <span style={{ display: "none" }}>{frame}</span>
    </AbsoluteFill>
  );
};
