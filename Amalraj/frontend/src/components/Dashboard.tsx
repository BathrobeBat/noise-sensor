import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip, AreaChart, Area, Legend, LineChart, Line
} from "recharts";
import "./Dashboard.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { DateTime } from "luxon";
import { point, location, fetchHistorical, fetchRecent } from "../service/fetchData";

// Type pour les données live en temps réel
type LivePoint = { t: number; dba: number };

// ---------- Themes ----------
const THEMES = {
  light: {
    name: "light" as const,
    bg: "#ffffff",
    ink: "#111827",
    panel: "#ffffff",
    border: "#e5e7eb",
    grid: "#e5e7eb",
    primary: "#E11D48",     // red
    primaryFill: "#FCE7F3", // light pink
    secondary: "#1f2937",   // dark gray/blue
    accent: "#7C3AED",      // violet
    tooltipBg: "#ffffff",
  },
  dark: {
    name: "dark" as const,
    bg: "#0e1a2b",
    ink: "#e6eef7",
    panel: "#152235",
    border: "#23344e",
    grid: "#23344e",
    primary: "#31c48d",     // green
    primaryFill: "rgba(49,196,141,0.25)",
    secondary: "#60a5fa",   // blue
    accent: "#a78bfa",      // violet
    tooltipBg: "#152235",
  },
};

export default function Dashboard() {
  const { id } = useParams<{ id: string }>();

  // -------- UI state --------
  const [range, setRange] = useState<0 | 1 | 7 | 30>(7);
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

  const [historical, setHistorical] = useState<point[]>([]);
  const [liveData, setLiveData] = useState<point>({ timestamp: "", LAeq: 0, LA_max: 0, LA_min: 0 });
  const [location, setLocation] = useState<location | null>(null);
  
  // Live data history for real-time graph (format: {t: timestamp_ms, dba: value})
  const [liveHistory, setLiveHistory] = useState<LivePoint[]>([]);
  
  // -------- Polling logic based on source --------
  useEffect(() => {
    if (!id || !location) return;

    if (location.source === "sensorcommunity") {
      // SensorCommunity: poll every 60 seconds
      const fetchData = () => {
        fetchRecent(id, location).then(({ liveData }) => {
          setLiveData(liveData);
        });
      };
      
      fetchData(); // Initial fetch
      const intervalId = setInterval(fetchData, 60000); // 60s
      
      return () => clearInterval(intervalId);
    } else if (location.source === "nightingale") {
      // Nightingale: poll every 1 second, add to graph every 5 seconds
      let lastGraphUpdate = 0;
      
      const intervalId = setInterval(async () => {
        try {
          const { liveData: newData } = await fetchRecent(id, location);
          //const { liveData: newData } = { liveData:{ timestamp: "", LAeq: 0, LA_max: 0, LA_min: 0 } };
          setLiveData(newData);
          
          const now = Date.now();
          
          // Only add a new graph point every 5 seconds
          if (now - lastGraphUpdate >= 5000) {
            lastGraphUpdate = now;
            
            setLiveHistory((prev) => {
              const next: LivePoint = {
                t: now,
                dba: newData.LAeq,
              };
              return [...prev.slice(-59), next]; // keep last 60 points (~5min)
            });
          }
        } catch (err) {
          console.error("Could not fetch live data:", err);
        }
      }, 1000); // poll every 1s
      
      return () => clearInterval(intervalId);
    }
  }, [id, location]);

  // Initial fetch to get location
  useEffect(() => {
    if (!id) return;
    fetchRecent(id).then(({ liveData }) => {
      setLiveData(liveData);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    switch(range) {
      case 0:
        fetchHistorical(id, "alltime").then(({ histData, location }) => {
          setHistorical(histData);
          setLocation(location);
        });
        break;
      case 1:
        fetchHistorical(id, "day").then(({ histData, location }) => {
          setHistorical(histData);
          setLocation(location);
        });
        break;
      case 7:
        fetchHistorical(id, "week").then(({ histData, location }) => {
          setHistorical(histData);
          setLocation(location);
        });
        break;
      case 30:
        fetchHistorical(id, "month").then(({ histData, location }) => {
          setHistorical(histData);
          setLocation(location);
        });
        break;
    }
  }, [id, range]);

  // WHO classification helper
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    if (!liveData.timestamp) return;
    // Parse the timestamp in the sensor's local timezone
    const dt = DateTime.fromISO(liveData.timestamp, { zone: location?.timezone });
    const hour = dt.hour;
    // Night: 23h (11pm) to 7h (7am) inclusive
    setIsNight(hour >= 23 || hour < 7);
  }, [liveData.timestamp, location?.timezone]);

  function classify(dba: number, night: boolean) {
    const limit = night ? 45 : 55;
    if (dba <= limit - 5) return { label: "OK", color: "#10B981" };         // green
    if (dba <= limit + 5) return { label: "Caution", color: "#F59E0B" };    // amber
    return { label: "High", color: "#DC2626" };                             // red
  }

  const status = classify(liveData.LAeq, isNight);

  let infoText = "";
  if (status.label === "OK") {
    infoText = `Noise levels are within safe limits.
                Chronic exposure at this level is unlikely to impose major cardiovascular strain:
                your blood pressure, heart rate and vascular system can recover naturally without persistent acoustic stress.`;
  } else if (status.label === "Caution") {
    infoText = `Noise levels are approaching recommended limits.
                Prolonged exposure, even if seemingly moderate, can raise heart rate and blood pressure,
                promote stress hormone release and vascular inflammation, subtly increasing the risk of cardiovascular issues.
                Where possible, reduce your exposure and allow periods of quiet to support cardiovascular health.`;
  } else if (status.label === "High") {
    infoText = `Noise levels are high.
                Repeated or long-term exposure at this level can contribute significantly to cardiovascular risks
                such as hypertension, endothelial dysfunction, arterial inflammation and even increased risk of coronary events.
                Try to limit your exposure, incorporate quiet breaks, ensure good sleep and protect your cardiovascular system.`;
  }

  // Calculate dynamic Y axis domain
  const minLAmin = historical.length > 0 ? Math.min(...historical.map(d => d.LA_min)) : 35;
  const maxLAmax = historical.length > 0 ? Math.max(...historical.map(d => d.LA_max)) : 85;
  const yMin = Math.floor(minLAmin - 5);
  const yMax = Math.ceil(maxLAmax + 5);

  // Check if this is a Nightingale sensor
  const isNightingaleSensor = location?.source === "nightingale";
  console.log("Sensor source:", location?.source);
  // Formatter for live chart X-axis (HH:MM:SS)
  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className="dashboard-container" style={{ background: theme.bg, color: theme.ink }}>
      <header className="dashboard-header">
        <h1 className="dashboard-title" style={{ color: theme.ink }}>
          Nightingale · Noise Monitoring Dashboard
        </h1>
        <div className="header-controls">
          <button
            onClick={() => setMode(mode === "light" ? "dark" : "light")}
            className="theme-toggle-btn"
            style={{ background: theme.primary }}
            title="Toggle theme"
          >
            {mode === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          </button>
        </div>
      </header>

      {/* Top row: Info / KPI / Live Graph (for Nightingale) or Map (for SensorCommunity) */}
      <section className="top-row">
        {/* Info / Guidelines card */}
        <div className="card info-card" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
          <div className="card-title">Noise & Heart Health</div>
          <p className="info-text">
            {infoText}
          </p>
        </div>

        {/* KPI card */}
        <div className="card" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
          <div className="kpi-label">Live noise level</div>
          <div className="kpi-value" style={{ color: theme.primary }}>
            {liveData.LAeq.toFixed(1)} dB(A)
          </div>
          <div className="kpi-subtitle">
            WHO limits: <b>≤55 dB</b> day (<i>Lden</i>), <b>≤45 dB</b> night (<i>Lnight</i>)
          </div>
          <div>
            <small>Last updated:
                  {liveData.timestamp ? `${DateTime.fromISO(liveData.timestamp, {zone: location?.timezone}).toFormat('yyyy-MM-dd HH:mm:ss')} (local),
                  ${DateTime.fromISO(liveData.timestamp).toUTC().toFormat('yyyy-MM-dd HH:mm:ss')} (UTC)` : ''}
            </small>
          </div>
          {/* Status badge */}
          <div className="status-row">
            <span className="status-badge" style={{ background: status.color }}>
              {status.label}
            </span>
          </div>
          {/* Night/Day explanation */}
          <div className="nightday-explanation">
            <em>Day is defined as 7:00 am to 11:00 pm; night is all other hours.<br />
              This sensor is placed {location?.indoor ? "indoor" : "outdoor"}<br />
              Data from {isNightingaleSensor ? "Nightingale" : "SensorCommunity"}
            </em>
          </div>
        </div>

        {/* Conditional: Live Graph for Nightingale, Map for SensorCommunity */}
        {isNightingaleSensor ? (
          <div className="card" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
            <div className="card-title">Live Noise Levels</div>
            <p className="info-text" style={{ fontSize: '0.85rem', marginBottom: '10px' }}>
              Real-time noise measurements (last ~5 minutes)
            </p>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={liveHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="t" 
                    tick={{ fill: theme.ink, fontSize: 10 }}
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
                    name="dB(A)" 
                    stroke={theme.primary} 
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="card" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
            <div className="card-title">Sensor Location Map</div>
            <p className="info-text">
              {location ? `${location.country}` : "Loading location..."}
            </p>
            {location && (
              <MapContainer
                center={[location.latitude, location.longitude]}
                zoom={13}
                style={{ height: '300px', width: '100%', marginTop: '10px', borderRadius: '8px' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker position={[location.latitude, location.longitude]}>
                  <Popup>
                    <strong>Sensor Location</strong><br />
                    Lat: {location.latitude.toFixed(4)}°<br />
                    Lon: {location.longitude.toFixed(4)}°<br />
                    Alt: {location.altitude}m<br />
                    {location.country}
                  </Popup>
                </Marker>
              </MapContainer>
            )}
          </div>
        )}
      </section>

      {/* Map section - only for Nightingale sensors */}
      {isNightingaleSensor && (
        <section className="card" style={{ background: theme.panel, border: `1px solid ${theme.border}`, marginBottom: '20px' }}>
          <div className="card-title">Sensor Location Map</div>
          <p className="info-text">
            {location ? `${location.country}` : "Loading location..."}
          </p>
          {location && (
            <MapContainer
              center={[location.latitude, location.longitude]}
              zoom={13}
              style={{ height: '300px', width: '100%', marginTop: '10px', borderRadius: '8px' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker position={[location.latitude, location.longitude]}>
                <Popup>
                  <strong>Sensor Location</strong><br />
                  Lat: {location.latitude.toFixed(4)}°<br />
                  Lon: {location.longitude.toFixed(4)}°<br />
                  Alt: {location.altitude}m<br />
                  {location.country}
                </Popup>
              </Marker>
            </MapContainer>
          )}
        </section>
      )}

      {/* Historical chart */}
      <section className="card" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
        <div className="historical-header">
          <div className="historical-title">Historical Noise (LAeq, LA_max, LA_min)</div>

          <label className="range-selector">
            Range:
            <select
              value={range}
              onChange={(e) => setRange(Number(e.target.value) as 0 | 1 | 7 | 30)}
              className="range-select"
              style={{ background: theme.bg, color: theme.ink, border: `1px solid ${theme.border}` }}
            >
              <option value={0}>All time</option>
              <option value={1}>Today</option>
              <option value={7}>This week</option>
              <option value={30}>This month</option>
            </select>
          </label>
        </div>

        <div className="historical-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historical} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" tick={{ fill: theme.ink }} />
              <YAxis domain={[yMin, yMax]} tick={{ fill: theme.ink }} tickFormatter={(v) => `${v} dB`} />
              <Tooltip
                contentStyle={{
                  background: theme.tooltipBg,
                  border: `1px solid ${theme.border}`,
                  color: theme.ink,
                }}
              />
              <Legend wrapperStyle={{ color: theme.ink }} />
              <Area type="monotone" dataKey="LAeq" name="LAeq" stroke={theme.primary} fill={theme.primaryFill} fillOpacity={0.5} />
              <Area type="monotone" dataKey="LA_max" name="LA_max" stroke={theme.secondary} fill={theme.secondary} fillOpacity={0.12} />
              <Area type="monotone" dataKey="LA_min" name="LA_min" stroke={theme.accent} fill={theme.accent} fillOpacity={0.10} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <footer className="dashboard-footer" style={{ color: theme.ink }}>
        © {new Date().getFullYear()} Nightingale
      </footer>
    </div>
  );
}