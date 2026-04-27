import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { T } from "../tokens";
import { useFadeIn, useFadeOut, useSpringIn } from "../helpers";

const TRANSCRIPT = "G-9 markaz ke paas streetlight kharab hai, do din se";

function useTypewriter(text: string, startFrame: number, charsPerFrame = 0.55) {
  const frame = useCurrentFrame();
  const visible = Math.max(0, Math.floor((frame - startFrame) * charsPerFrame));
  return text.slice(0, Math.min(visible, text.length));
}

const FieldRow: React.FC<{
  label: string;
  value: string;
  startFrame: number;
}> = ({ label, value, startFrame }) => {
  const opacity = useFadeIn(startFrame, 14);
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${(1 - opacity) * 8}px)`,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontFamily: T.fontMono,
          fontSize: 12,
          color: T.ink[500],
          letterSpacing: "0.14em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          background: T.ink[50],
          borderRadius: 10,
          padding: "12px 14px",
          fontSize: 18,
          color: T.ink[900],
          border: `1px solid ${T.ink[100]}`,
        }}
      >
        {value}
      </div>
    </div>
  );
};

export const VoiceReport: React.FC<{ startFrame: number; endFrame: number }> = ({
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;
  const fadeIn = useFadeIn(startFrame, 18);
  const fadeOut = useFadeOut(endFrame - 18, 18);
  const phoneSpring = useSpringIn(startFrame + 4);

  // Mic pulses while recording (frames 30 → 240)
  const micActive = local >= 30 && local <= 260;
  const pulse = 1 + (micActive ? Math.sin(local / 6) * 0.08 : 0);

  // Transcript types in from frame 60 → ~210
  const transcript = useTypewriter(TRANSCRIPT, startFrame + 60, 0.5);

  // Analyzing indicator from frame 230 → 290
  const analyzing = local >= 230 && local < 305;

  // Form fields cascade in starting frame 305
  const formStart = startFrame + 305;

  // Section title
  return (
    <AbsoluteFill
      style={{
        background: T.paper,
        opacity: Math.min(fadeIn, fadeOut),
        fontFamily: T.fontUI,
      }}
    >
      {/* Top label */}
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
          STEP 1 · VOICE REPORT
        </div>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 56, fontWeight: 700, letterSpacing: "-0.02em", color: T.ink[900] }}>
          Speak the issue. In Urdu.
        </div>
      </div>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: 80, gap: 60, flexDirection: "row" }}>
        {/* Phone mockup */}
        <div
          style={{
            width: 480,
            height: 760,
            borderRadius: 56,
            background: "#000",
            padding: 14,
            boxShadow: "0 40px 100px rgba(11,26,36,0.35)",
            transform: `scale(${0.85 + 0.15 * phoneSpring})`,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 44,
              background: T.paper,
              padding: 24,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* App header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `linear-gradient(135deg, ${T.blue[500]}, ${T.purple})`,
                  color: "#fff",
                  fontFamily: T.fontDisplay,
                  fontWeight: 700,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                M
              </div>
              <div style={{ fontFamily: T.fontMono, fontSize: 10, color: T.ink[500], letterSpacing: "0.14em" }}>
                NEW REPORT
              </div>
            </div>

            <div style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 600, color: T.ink[900] }}>
              Report an issue
            </div>

            {/* Voice card */}
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${T.ink[100]}`,
                boxShadow: "0 1px 2px rgba(11,26,36,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    background: `linear-gradient(135deg, ${T.blue[600]}, ${T.purple})`,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  ✱
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.fontMono, fontSize: 8, color: T.ink[500], letterSpacing: "0.14em" }}>
                    VOICE · اردو · ROMAN URDU · ENGLISH
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink[800] }}>
                    Tap and speak in your language
                  </div>
                </div>
              </div>

              {/* Mic button OR rec state */}
              {!micActive ? (
                <div
                  style={{
                    height: 50,
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${T.blue[600]}, ${T.purple})`,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    transform: `scale(${pulse})`,
                  }}
                >
                  ● Start voice report
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 99,
                        background: T.urgent,
                        opacity: 0.6 + 0.4 * Math.sin(local / 4),
                      }}
                    />
                    <div style={{ fontFamily: T.fontMono, fontSize: 11, color: T.urgent, fontWeight: 700 }}>
                      REC · 00:0{Math.min(9, Math.floor((local - 30) / 30))}
                    </div>
                    <div style={{ flex: 1, height: 6, background: T.ink[100], borderRadius: 99, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${50 + 40 * Math.sin(local / 3)}%`,
                          background: `linear-gradient(90deg, ${T.blue[500]}, ${T.purple})`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Transcript */}
              {transcript && (
                <div
                  style={{
                    marginTop: 10,
                    background: T.ink[50],
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 13,
                    color: T.ink[800],
                    fontStyle: "italic",
                    minHeight: 22,
                  }}
                >
                  &quot;{transcript}
                  {transcript.length < TRANSCRIPT.length && (
                    <span style={{ opacity: 0.6 }}>|</span>
                  )}
                  &quot;
                </div>
              )}

              {analyzing && (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: T.purple,
                    fontWeight: 600,
                  }}
                >
                  ✱ Gemini is listening…
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side — auto-filled form preview */}
        <div
          style={{
            width: 540,
            background: "#fff",
            borderRadius: 22,
            padding: 28,
            boxShadow: "0 30px 60px rgba(11,26,36,0.18)",
            border: `1px solid ${T.ink[100]}`,
            opacity: useFadeIn(formStart - 12, 20),
          }}
        >
          <div
            style={{
              fontFamily: T.fontMono,
              fontSize: 12,
              color: T.purple,
              letterSpacing: "0.16em",
              marginBottom: 4,
            }}
          >
            ✱ AUTO-FILLED FROM VOICE
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: T.ink[900], marginBottom: 18 }}>
            Issue details
          </div>
          <FieldRow label="TITLE" value="Broken streetlight near G-9 Markaz" startFrame={formStart + 0} />
          <FieldRow label="CATEGORY" value="🔆 Streetlight" startFrame={formStart + 18} />
          <FieldRow label="PRIORITY" value="● Medium" startFrame={formStart + 36} />
          <FieldRow
            label="DESCRIPTION"
            value="Streetlight near G-9 Markaz has been out for two days, creating a safety hazard for evening pedestrians."
            startFrame={formStart + 54}
          />
          <FieldRow label="AREA" value="G-9 · Islamabad" startFrame={formStart + 72} />
        </div>
      </AbsoluteFill>
      <span style={{ display: "none" }}>{frame}</span>
    </AbsoluteFill>
  );
};
