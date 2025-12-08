// src/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, Legend
} from "recharts";

// t is nu een timestamp (number), geen string
type LivePoint = { t: number; dba: number };
type HistPoint = { date: string; leq: number; l10: number; l90: number };

// ---- ESP32 endpoint ----
const ESP_BASE_URL = "http://192.168.0.128"; // <-- jouw ESP32 IP

// ---------- Mock data helpers (historical) ----------
function makeHistorical(days = 14): HistPoint[] {
  const out: HistPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const base = 48 + Math.random() * 10;
    out.push({
      date: d.toLocaleDateString(),
      leq: Math.round((base + Math.random() * 6) * 10) / 10,
      l10: Math.round((base + 6 + Math.random() * 6) * 10) / 10,
      l90: Math.round((base - 6 + Math.random() * 4) * 10) / 10,
    });
  }
  return out;
}

// ---------- Themes ----------
const THEMES = {
  light: {
    name: "light" as const,
    bg: "#ffffff",
    ink: "#111827",
    panel: "#ffffff",
    border: "#e5e7eb",
    grid: "#e5e7eb",
    primary: "#E11D48",
    primaryFill: "#FCE7F3",
    secondary: "#1f2937",
    accent: "#7C3AED",
    tooltipBg: "#ffffff",
  },
  dark: {
    name: "dark" as const,
    bg: "#0e1a2b",
    ink: "#e6eef7",
    panel: "#152235",
    border: "#23344e",
    grid: "#23344e",
    primary: "#31c48d",
    primaryFill: "rgba(49,196,141,0.25)",
    secondary: "#60a5fa",
    accent: "#a78bfa",
    tooltipBg: "#152235",
  },
};

export default function Dashboard() {
  // -------- Live stream from ESP (~60s buffer) --------
  const [live, setLive] = useState<LivePoint[]>([]);

  useEffect(() => {
    let lastGraphUpdate = 0; // timestamp of last datapoint added
  
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${ESP_BASE_URL}/api/live`);
        if (!res.ok) throw new Error("HTTP error " + res.status);
  
        const data = (await res.json()) as { dba_instant: number };
        const now = Date.now();
  
        // ---- Only add a new graph point every 5 seconds ----
        if (now - lastGraphUpdate >= 5000) {
          lastGraphUpdate = now;
  
          setLive((prev) => {
            const next: LivePoint = {
              t: now,
              dba: data.dba_instant,
            };
            return [...prev.slice(-59), next]; // keep last ~60 points (5min)
          });
        }
  
      } catch (err) {
        console.error("Kon live dB niet ophalen:", err);
      }
    }, 1000); // still poll the ESP every 1 sec
  
    return () => clearInterval(id);
  }, []);
  

  // -------- UI state --------
  const [range, setRange] = useState<7 | 14 | 30>(14);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const theme = mode === "light" ? THEMES.light : THEMES.dark;

  // Persist theme choice (optional)
  useEffect(() => {
    const saved = localStorage.getItem("ng-theme");
    if (saved === "light" || saved === "dark") setMode(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("ng-theme", mode);
  }, [mode]);

  const current = live[live.length - 1]?.dba ?? 0;
  const historical = useMemo(() => makeHistorical(range), [range]);

  // WHO classification helper
  const [isNight, setIsNight] = useState(false);
  function classify(dba: number, night: boolean) {
    const limit = night ? 45 : 55;
    if (dba <= limit - 5) return { label: "OK", color: "#10B981" };
    if (dba <= limit + 5) return { label: "Caution", color: "#F59E0B" };
    return { label: "High", color: "#DC2626" };
  }

  // formatter voor de X-as tijd (HH:MM:SS)
  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.ink,
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif",
        padding: "24px",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: theme.ink }}>
          Nightingale · Noise Monitoring Dashboard
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setMode(mode === "light" ? "dark" : "light")}
            style={{
              background: theme.primary,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
            }}
            title="Toggle theme"
          >
            {mode === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          </button>
          <div style={{ opacity: 0.7 }}>
            Prototype (live ESP32 + mock history)
          </div>
        </div>
      </header>

      {/* Top row: Info / KPI / Live chart */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 2fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Info / Guidelines card */}
        <div
          style={{
            background: theme.panel,
            borderRadius: 16,
            padding: 16,
            border: `1px solid ${theme.border}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700 }}>Noise & Heart Health</div>
          <p style={{ margin: 0, fontSize: 15, opacity: 0.9 }}>
            Chronic noise exposure raises stress hormones, disrupts sleep,
            and impairs vascular function-linked to hypertension and ischemic
            heart disease. Keeping average levels below WHO guidance reduces risk.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 6,
              gap: 10,
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              WHO limits: <b>≤55 dB</b> day (<i>Lden</i>), <b>≤45 dB</b> night (<i>Lnight</i>)
            </div>
            <label
              style={{
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Mode:
              <select
                value={isNight ? "night" : "day"}
                onChange={(e) => setIsNight(e.target.value === "night")}
                style={{
                  background: theme.bg,
                  color: theme.ink,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  padding: "4px 8px",
                }}
              >
                <option value="day">Day</option>
                <option value="night">Night</option>
              </select>
            </label>
          </div>

          {/* Status badge */}
          {(() => {
            const s = classify(current, isNight);
            return (
              <div
                style={{
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                  Current: <b>{current.toFixed(1)} dB(A)</b>
                </div>
                <span
                  style={{
                    background: s.color,
                    color: "#fff",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {s.label}
                </span>
              </div>
            );
          })()}
        </div>

        {/* KPI card */}
        <div
          style={{
            background: theme.panel,
            borderRadius: 16,
            padding: 16,
            border: `1px solid ${theme.border}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>
            Live dB(A)
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1,
              color: theme.primary,
            }}
          >
            {current.toFixed(1)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
            WHO guidance ~55 dB day / 45 dB night
          </div>
        </div>

        {/* Live chart */}
        <div
          style={{
            background: theme.panel,
            borderRadius: 16,
            padding: 16,
            border: `1px solid ${theme.border}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>
            Live Noise Levels (last ~60s)
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={live}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="t"
                  tick={{ fill: theme.ink }}
                  // elke tick formatten als echte tijd
                  tickFormatter={(value) => formatTime(value as number)}
                />
                <YAxis
                  domain={[35, 85]}
                  tick={{ fill: theme.ink }}
                  tickFormatter={(v) => `${v} dB`}
                />
                <Tooltip
                  labelFormatter={(value) => formatTime(value as number)}
                  contentStyle={{
                    background: theme.tooltipBg,
                    border: `1px solid ${theme.border}`,
                    color: theme.ink,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="dba"
                  stroke={theme.primary}
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Historical chart */}
      <section
        style={{
          background: theme.panel,
          borderRadius: 16,
          padding: 16,
          border: `1px solid ${theme.border}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.9, fontWeight: 700 }}>
            Historical Noise (Leq, L10, L90)
          </div>

          <label
            style={{
              fontSize: 13,
              opacity: 0.9,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            Range:
            <select
              value={range}
              onChange={(e) =>
                setRange(Number(e.target.value) as 7 | 14 | 30)
              }
              style={{
                background: theme.bg,
                color: theme.ink,
                border: `1px solid ${theme.border}`,
                borderRadius: 8,
                padding: "6px 10px",
              }}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </label>
        </div>

        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={historical}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: theme.ink }} />
              <YAxis
                domain={[35, 85]}
                tick={{ fill: theme.ink }}
                tickFormatter={(v) => `${v} dB`}
              />
              <Tooltip
                contentStyle={{
                  background: theme.tooltipBg,
                  border: `1px solid ${theme.border}`,
                  color: theme.ink,
                }}
              />
              <Legend wrapperStyle={{ color: theme.ink }} />
              <Area
                type="monotone"
                dataKey="leq"
                name="Leq"
                stroke={theme.primary}
                fill={theme.primaryFill}
                fillOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="l10"
                name="L10"
                stroke={theme.secondary}
                fill={theme.secondary}
                fillOpacity={0.12}
              />
              <Area
                type="monotone"
                dataKey="l90"
                name="L90"
                stroke={theme.accent}
                fill={theme.accent}
                fillOpacity={0.1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <footer
        style={{
          textAlign: "center",
          opacity: 0.65,
          fontSize: 12,
          marginTop: 24,
          color: theme.ink,
        }}
      >
        © {new Date().getFullYear()} Nightingale - Prototype UI (live ESP32 + mock history)
      </footer>
    </div>
  );
}
