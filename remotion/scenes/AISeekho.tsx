import { AbsoluteFill, useCurrentFrame } from "remotion";
import { T } from "../tokens";
import { useFadeIn, useFadeOut, useSpringIn } from "../helpers";

const TOOLS = [
  { name: "Google Stitch", role: "UI design system" },
  { name: "Google AI Studio", role: "Gemini prototyping" },
  { name: "Google Antigravity", role: "Agentic vibe coding" },
];

const STACK = [
  { label: "Gemini 2.5 Flash", desc: "Multimodal understanding (image + audio)" },
  { label: "Gemini Embeddings", desc: "Semantic duplicate detection" },
  { label: "Web Speech API", desc: "Urdu voice acknowledgments" },
  { label: "Next.js 15 + Prisma", desc: "App stack on Neon Postgres" },
];

const ToolCard: React.FC<{ name: string; role: string; index: number; baseFrame: number }> = ({
  name,
  role,
  index,
  baseFrame,
}) => {
  const startAt = baseFrame + 36 + index * 12;
  const opacity = useFadeIn(startAt, 18);
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 18,
        padding: "20px 26px",
        flex: 1,
        opacity,
        transform: `translateY(${(1 - opacity) * 16}px)`,
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          fontFamily: T.fontMono,
          fontSize: 12,
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.5)",
          marginBottom: 6,
        }}
      >
        TOOL · {String(index + 1).padStart(2, "0")}
      </div>
      <div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
        {name}
      </div>
      <div style={{ fontSize: 16, color: "rgba(255,255,255,0.65)" }}>{role}</div>
    </div>
  );
};

const StackRow: React.FC<{ label: string; desc: string; index: number; baseFrame: number }> = ({
  label,
  desc,
  index,
  baseFrame,
}) => {
  const startAt = baseFrame + 130 + index * 8;
  const opacity = useFadeIn(startAt, 16);
  return (
    <div
      style={{
        display: "flex",
        gap: 18,
        alignItems: "center",
        padding: "10px 0",
        opacity,
        transform: `translateX(${(1 - opacity) * 16}px)`,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          fontFamily: T.fontMono,
          fontSize: 12,
          color: "#FF8A65",
          letterSpacing: "0.16em",
          width: 36,
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 600, color: "#fff" }}>
          {label}
        </div>
      </div>
      <div style={{ fontSize: 16, color: "rgba(255,255,255,0.55)" }}>{desc}</div>
    </div>
  );
};

export const AISeekho: React.FC<{ startFrame: number; endFrame: number }> = ({
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const fadeIn = useFadeIn(startFrame, 18);
  const fadeOut = useFadeOut(endFrame - 18, 18);
  const badgeSpring = useSpringIn(startFrame + 8);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #0d1b2a 0%, #1a1140 50%, #0d1b2a 100%)`,
        opacity: Math.min(fadeIn, fadeOut),
        fontFamily: T.fontUI,
      }}
    >
      {/* ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "30%",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${T.purple}40 0%, transparent 60%)`,
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: "15%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${T.blue[500]}40 0%, transparent 60%)`,
          filter: "blur(80px)",
        }}
      />

      <AbsoluteFill style={{ padding: "80px 100px", flexDirection: "column" }}>
        {/* Top badge */}
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            alignItems: "center",
            gap: 14,
            padding: "12px 22px",
            borderRadius: 99,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
            backdropFilter: "blur(16px)",
            transform: `scale(${0.9 + 0.1 * badgeSpring})`,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 99,
              background: "#34A853",
              boxShadow: "0 0 16px #34A853",
            }}
          />
          <div
            style={{
              fontFamily: T.fontMono,
              fontSize: 13,
              letterSpacing: "0.22em",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            BUILT FOR · AI SEEKHO 2026 · GOOGLE DEVELOPER GROUPS · PAKISTAN
          </div>
        </div>

        <div
          style={{
            fontFamily: T.fontDisplay,
            fontSize: 78,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            marginBottom: 16,
            opacity: useFadeIn(startFrame + 14, 18),
          }}
        >
          Vibe-coded with Google&rsquo;s AI stack
        </div>
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.7)",
            maxWidth: 1100,
            marginBottom: 36,
            opacity: useFadeIn(startFrame + 22, 18),
          }}
        >
          Designed in Stitch, prototyped in AI Studio, built in Antigravity — the entire workflow Google
          launched for AI Seekho 2026.
        </div>

        <div style={{ display: "flex", gap: 18, marginBottom: 40 }}>
          {TOOLS.map((tool, i) => (
            <ToolCard key={tool.name} name={tool.name} role={tool.role} index={i} baseFrame={startFrame} />
          ))}
        </div>

        <div
          style={{
            fontFamily: T.fontMono,
            fontSize: 14,
            letterSpacing: "0.22em",
            color: "rgba(255,255,255,0.55)",
            marginBottom: 16,
            opacity: useFadeIn(startFrame + 110, 18),
          }}
        >
          UNDER THE HOOD
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {STACK.map((row, i) => (
            <StackRow key={row.label} label={row.label} desc={row.desc} index={i} baseFrame={startFrame} />
          ))}
        </div>
      </AbsoluteFill>
      <span style={{ display: "none" }}>{frame}</span>
    </AbsoluteFill>
  );
};
