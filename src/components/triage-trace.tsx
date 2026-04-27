"use client";

import { useEffect, useRef, useState } from "react";
import { MS_TOKENS } from "~/lib/tokens";

const T = MS_TOKENS;

type Step = {
  n: number;
  tool: string;
  status: "running" | "done";
  label: string;
  result?: any;
};

type Props = {
  issueId: string;
  autoStart?: boolean;
};

const TOOL_LABELS: Record<string, string> = {
  validateImage: "✓ Vision check",
  findDuplicates: "▦ Embedding search",
  pickDepartment: "⌖ Department router",
  draftCitizenReply: "✎ Citizen reply (Urdu)",
  draftDispatchOrder: "✎ Dispatch order",
};

export default function TriageTrace({ issueId, autoStart }: Props) {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef<string | null>(null);

  useEffect(() => {
    if (autoStart && startedRef.current !== issueId) {
      startedRef.current = issueId;
      run();
    }
    // reset when issue changes
    setSteps([]);
    setSummary(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId]);

  async function run() {
    setSteps([]);
    setSummary(null);
    setError(null);
    setRunning(true);
    try {
      const res = await fetch(`/api/triage/${issueId}`, { method: "POST" });
      if (!res.ok || !res.body) {
        setError("Triage failed to start");
        setRunning(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE frames are separated by blank lines
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          try {
            const payload = JSON.parse(line.slice(5).trim());
            handleEvent(payload);
          } catch {
            /* ignore parse */
          }
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "Triage failed");
    } finally {
      setRunning(false);
    }
  }

  function handleEvent(payload: any) {
    if (payload.event === "step") {
      setSteps((prev) => {
        const i = prev.findIndex((s) => s.n === payload.n);
        const next: Step = {
          n: payload.n,
          tool: payload.tool,
          status: payload.status,
          label: payload.label,
          result: payload.result,
        };
        if (i >= 0) {
          const copy = prev.slice();
          copy[i] = next;
          return copy;
        }
        return [...prev, next];
      });
    } else if (payload.event === "complete") {
      setSummary(payload.summary);
    } else if (payload.event === "error") {
      setError(payload.message);
    }
  }

  return (
    <div
      style={{
        marginTop: 14,
        background: "linear-gradient(180deg, #FAF7FF 0%, #F4EEFF 100%)",
        border: `1px solid #DBC9FF`,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div
          style={{
            width: 22, height: 22, borderRadius: 6,
            background: `linear-gradient(135deg, ${T.blue[600]}, #6E48F0)`,
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 11,
          }}
        >
          ✱
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.fontMono, fontSize: 9, color: "#6E48F0", letterSpacing: "0.14em" }}>
            MASLAHAL · TRIAGE AGENT
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.ink[800] }}>
            {running ? "Running tools…" : summary ? "Triage complete" : "Auto-investigate this issue"}
          </div>
        </div>
        {!running && (
          <button
            onClick={run}
            style={{
              all: "unset", cursor: "pointer",
              fontSize: 11, fontWeight: 600,
              padding: "5px 10px", borderRadius: 7,
              background: T.ink[900], color: "#fff",
            }}
          >
            {summary ? "Re-run" : "Run agent"}
          </button>
        )}
      </div>

      {steps.length === 0 && !running && !error && (
        <div style={{ fontSize: 11, color: T.ink[500], lineHeight: 1.5 }}>
          The agent will validate the photo, search for duplicates with embeddings, route to a department,
          and draft both a citizen reply and a dispatch order.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {steps.map((s) => (
          <div
            key={s.n}
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: "8px 10px",
              border: `1px solid ${s.status === "done" ? "#D5C2FF" : "#EADBFF"}`,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 16, height: 16, borderRadius: 99,
                  background: s.status === "done" ? T.resolved : "#F4EEFF",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700,
                }}
              >
                {s.status === "done" ? "✓" : (
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: 99,
                      border: `2px solid ${T.blue[600]}`,
                      borderTopColor: "transparent",
                      animation: "spin 0.8s linear infinite",
                      display: "inline-block",
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.fontMono, fontSize: 9, color: "#6E48F0", letterSpacing: "0.1em" }}>
                  {TOOL_LABELS[s.tool] ?? s.tool}
                </div>
                <div style={{ fontSize: 12, color: T.ink[800], fontWeight: 500 }}>
                  {s.label}
                </div>
              </div>
            </div>
            {s.status === "done" && s.result && <StepResult tool={s.tool} result={s.result} />}
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {error && (
        <div style={{ marginTop: 8, padding: "6px 10px", background: "#FFEBEE", borderRadius: 8, fontSize: 11, color: "#C62828" }}>
          {error}
        </div>
      )}
    </div>
  );
}

function StepResult({ tool, result }: { tool: string; result: any }) {
  if (tool === "validateImage") {
    const ok = result.valid && result.matchesCategory;
    return (
      <div style={{ fontSize: 11, color: ok ? T.ink[700] : "#B71C1C", lineHeight: 1.4, paddingLeft: 24 }}>
        <span style={{ fontWeight: 600 }}>{ok ? "Looks legit." : "Flagged."}</span>{" "}
        {result.reason}
      </div>
    );
  }
  if (tool === "findDuplicates") {
    const dupes: any[] = result.duplicates ?? [];
    if (!dupes.length) {
      return (
        <div style={{ fontSize: 11, color: T.ink[500], paddingLeft: 24 }}>
          No close duplicates found in {result.totalNearby} nearby reports.
        </div>
      );
    }
    return (
      <div style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 4 }}>
        {dupes.map((d) => (
          <a
            key={d.id}
            href={`/issue/${d.id}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 11, color: T.ink[700],
              textDecoration: "none",
              padding: "4px 6px", borderRadius: 6,
              background: T.ink[50],
            }}
          >
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</span>
            <span style={{ fontFamily: T.fontMono, fontSize: 10, color: "#6E48F0", fontWeight: 600 }}>
              {Math.round((d.similarity ?? 0) * 100)}%
            </span>
          </a>
        ))}
      </div>
    );
  }
  if (tool === "pickDepartment") {
    return (
      <div style={{ fontSize: 11, paddingLeft: 24 }}>
        <span style={{ fontWeight: 600, color: T.ink[800] }}>{result.department}</span>
        <span style={{ color: T.ink[500] }}> · {result.lead}</span>
      </div>
    );
  }
  if (tool === "draftCitizenReply") {
    return (
      <div
        style={{
          fontSize: 12, color: T.ink[800],
          paddingLeft: 24, paddingTop: 4,
          fontStyle: "italic",
          direction: "auto" as any,
          lineHeight: 1.45,
        }}
      >
        "{result.reply}"
      </div>
    );
  }
  if (tool === "draftDispatchOrder") {
    return (
      <pre
        style={{
          fontSize: 11, color: T.ink[700],
          paddingLeft: 24, paddingTop: 4,
          margin: 0, fontFamily: T.fontMono,
          whiteSpace: "pre-wrap",
          lineHeight: 1.45,
        }}
      >
        {result.dispatch}
      </pre>
    );
  }
  return null;
}
