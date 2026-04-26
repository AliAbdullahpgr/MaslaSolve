"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MS_TOKENS } from "~/lib/tokens";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      router.push("/auth/signin");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: MS_TOKENS.paperAlt, fontFamily: MS_TOKENS.fontUI }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#fff",
          borderRadius: 20,
          padding: "40px 32px",
          boxShadow: MS_TOKENS.shadow.lg,
          border: `1px solid ${MS_TOKENS.ink[100]}`,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${MS_TOKENS.blue[500]}, #6E48F0)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#fff",
              fontFamily: MS_TOKENS.fontDisplay,
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            M
          </div>
          <h1
            style={{
              fontFamily: MS_TOKENS.fontDisplay,
              fontSize: 24,
              fontWeight: 600,
              color: MS_TOKENS.ink[900],
              margin: 0,
            }}
          >
            Create account
          </h1>
          <p style={{ color: MS_TOKENS.ink[500], marginTop: 4, fontSize: 14 }}>
            Join MaslaSolve to report civic issues
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: MS_TOKENS.urgentSoft,
              color: MS_TOKENS.urgent,
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: MS_TOKENS.ink[700],
                marginBottom: 6,
                fontFamily: MS_TOKENS.fontMono,
                letterSpacing: "0.06em",
              }}
            >
              FULL NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: "100%",
                height: 48,
                padding: "0 14px",
                borderRadius: 12,
                border: `1px solid ${MS_TOKENS.ink[200]}`,
                fontSize: 15,
                fontFamily: MS_TOKENS.fontUI,
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="Ayesha Khan"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: MS_TOKENS.ink[700],
                marginBottom: 6,
                fontFamily: MS_TOKENS.fontMono,
                letterSpacing: "0.06em",
              }}
            >
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                height: 48,
                padding: "0 14px",
                borderRadius: 12,
                border: `1px solid ${MS_TOKENS.ink[200]}`,
                fontSize: 15,
                fontFamily: MS_TOKENS.fontUI,
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="you@example.com"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: MS_TOKENS.ink[700],
                marginBottom: 6,
                fontFamily: MS_TOKENS.fontMono,
                letterSpacing: "0.06em",
              }}
            >
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: "100%",
                height: 48,
                padding: "0 14px",
                borderRadius: 12,
                border: `1px solid ${MS_TOKENS.ink[200]}`,
                fontSize: 15,
                fontFamily: MS_TOKENS.fontUI,
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 14,
              background: MS_TOKENS.ink[900],
              color: "#fff",
              border: "none",
              fontFamily: MS_TOKENS.fontDisplay,
              fontWeight: 600,
              fontSize: 16,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div
          style={{
            marginTop: 24,
            textAlign: "center",
            fontSize: 13,
            color: MS_TOKENS.ink[500],
          }}
        >
          Already have an account?{" "}
          <Link
            href="/auth/signin"
            style={{ color: MS_TOKENS.blue[600], fontWeight: 600, textDecoration: "none" }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
