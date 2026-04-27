import { AbsoluteFill, useCurrentFrame } from "remotion";
import { T } from "../tokens";
import { useFadeIn, useFadeOut, useSpringIn } from "../helpers";

const ROWS = [
  { title: "Streetlight pole flickering on Service Rd", area: "G-9", match: 92, votes: 8 },
  { title: "Two streetlights out on Margalla Avenue", area: "G-9", match: 87, votes: 5 },
  { title: "Dark patch near G-9 Markaz at night", area: "G-9", match: 81, votes: 11 },
];

export const Duplicates: React.FC<{ startFrame: number; endFrame: number }> = ({
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;
  const fadeIn = useFadeIn(startFrame, 18);
  const fadeOut = useFadeOut(endFrame - 18, 18);
  const cardSpring = useSpringIn(startFrame + 16);

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
          STEP 2 · SEMANTIC DUPLICATE DETECTION
        </div>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 56, fontWeight: 700, letterSpacing: "-0.02em", color: T.ink[900] }}>
          AI checks if neighbors already reported it
        </div>
      </div>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: 80 }}>
        <div
          style={{
            width: 980,
            background: "linear-gradient(180deg, #FFFDE7 0%, #FFF8C4 100%)",
            borderRadius: 24,
            padding: 32,
            border: "2px solid #FDD835",
            boxShadow: "0 30px 60px rgba(245,127,23,0.18)",
            transform: `scale(${0.9 + 0.1 * cardSpring})`,
          }}
        >
          <div
            style={{
              fontFamily: T.fontMono,
              fontSize: 16,
              color: "#F57F17",
              letterSpacing: "0.18em",
              marginBottom: 8,
            }}
          >
            ✱ AI FOUND 3 NEARBY MATCHES
          </div>
          <div style={{ fontSize: 28, color: "#5D4037", marginBottom: 24, fontWeight: 500 }}>
            These look like the same problem. Upvote one instead of duplicating.
          </div>
          {ROWS.map((r, i) => {
            const rowStart = startFrame + 30 + i * 16;
            const rowOpacity = useFadeIn(rowStart, 18);
            return (
              <div
                key={i}
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  padding: "16px 20px",
                  marginBottom: 10,
                  border: `1px solid ${T.ink[100]}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  opacity: rowOpacity,
                  transform: `translateX(${(1 - rowOpacity) * 30}px)`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: T.ink[900] }}>{r.title}</div>
                  <div style={{ fontFamily: T.fontMono, fontSize: 13, color: T.ink[500], marginTop: 4 }}>
                    {r.match}% match · {r.area}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: 18,
                    fontWeight: 700,
                    color: T.blue[600],
                  }}
                >
                  ▲ {r.votes}
                </div>
              </div>
            );
          })}
          <div
            style={{
              marginTop: 16,
              fontFamily: T.fontMono,
              fontSize: 13,
              color: T.ink[500],
              letterSpacing: "0.06em",
              opacity: useFadeIn(startFrame + 90, 18),
            }}
          >
            ↳ Powered by Gemini text-embedding-001 · cosine similarity over 2km bbox
          </div>
        </div>
      </AbsoluteFill>
      <span style={{ display: "none" }}>{local}</span>
    </AbsoluteFill>
  );
};
