import axios from "axios";
import { ISensors } from "../models/ISensors";
import tzlookup from "tz-lookup";
import { DateTime } from "luxon";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

/// For PollutionMap.tsx
export const fetchAllSensors = async (): Promise<ISensors[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/allsensors`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch pollution data: ${axios.isAxiosError(error) ? error.message : "Unknown error"}`);
  }
};

/// For Dashboard.tsx
export type point = { timestamp: string; LAeq: number; LA_max: number; LA_min: number };
export type location = { latitude: number; longitude: number; altitude: number;
                        country: string; timezone: string ; indoor: boolean; source?: string };

// ---------- Historical data from backend ----------
export async function fetchHistorical(id: string, mode: string): Promise<{ histData: point[], location: location | null }> {
  const res = await fetch(`http://localhost:8080/api/${mode}/${id}`);
  if (!res.ok) return { histData: [], location: null };
  const data = await res.json();
  console.log("Fetched historical data:", data);
  const location = data.locationResponse;
  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

  // Get the location of the sensor
  const locationData: location = {
    altitude: location.altitude,
    country: regionNames.of(location.country.toUpperCase()) || location.country,
    latitude: location.latitude,
    longitude: location.longitude,
    indoor: location.indoor,
    timezone: tzlookup(location.latitude, location.longitude),
    source: data.source
  };

  console.log("Location data:", locationData);

  let histData: point[] = [];
  if (mode === "day") {
    // Create a Map to keep track of unique timestamps (hour:minute)
    const uniquePoints = new Map<string, any>();
    (data.noiseResponses || []).forEach((noise: any) => {
      const key = noise.timestamp ? DateTime.fromISO(noise.timestamp).toFormat("HH:mm") : "";
      if (key && !uniquePoints.has(key)) {
        // Overwrite the timestamp to be hour:minute
        uniquePoints.set(key, { ...noise, timestamp: key });
      }
    });
    histData = Array.from(uniquePoints.values()).map((noise: any) => ({
      timestamp: noise.timestamp,
      LAeq: noise.noise_LAeq,
      LA_max: noise.noise_LAmax,
      LA_min: noise.noise_LAmin,
    }));
  } else {
    // Create a Map to keep track of unique timestamps (day)
    const uniquePoints = new Map<string, any>();
    (data.noiseResponses || []).forEach((noise: any) => {
      const key = noise.timestamp ? DateTime.fromISO(noise.timestamp).toFormat("yyyy-MM-dd") : "";
      if (key && !uniquePoints.has(key)) {
        // Overwrite the timestamp to be day only
        uniquePoints.set(key, { ...noise, timestamp: key });
      }
    });
    histData = Array.from(uniquePoints.values()).map((noise: any) => ({
      timestamp: noise.timestamp,
      LAeq: noise.noise_LAeq,
      LA_max: noise.noise_LAmax,
      LA_min: noise.noise_LAmin,
    }));
  }
  histData.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  console.log("Transformed historical data:", histData);
  return { histData, location: locationData };
}

// ---------- Recent data from backend ----------
export async function fetchRecent(id: string, location?: location): Promise<{ liveData: point }> {
  const res = await fetch(`http://localhost:8080/api/recentdata/${id}`);
  if (!res.ok) {
    return { liveData: { timestamp: "", LAeq: 0, LA_max: 0, LA_min: 0 } };
  }

  const data = await res.json();
  console.log("Fetched recent data:", data);

  let localTimestamp = data.timestamp;
  
  // Convert timestamp to local timezone if location is provided
  if (localTimestamp && location) {
    try {      
      // Parse as UTC
      let dt = DateTime.fromISO(data.timestamp, { zone: "UTC" });
      if (!dt.isValid) {
        dt = DateTime.fromFormat(data.timestamp, "yyyy-MM-dd HH:mm:ss", { zone: "UTC" });
      }
      
      if (dt.isValid) {
        const localDt = dt.setZone(location.timezone);
        localTimestamp = localDt.toISO();
        console.log("Converted local timestamp:", localTimestamp);
        
      } else {
        console.warn("Could not parse timestamp:", data.timestamp);
      }
    } catch (e) {
      console.warn("Could not convert timestamp to local timezone:", e);
    }
  }

  console.log("Final local timestamp:", localTimestamp);
  
  const liveData = {
    timestamp: localTimestamp || "",
    LAeq: data.noise_LAeq,
    LA_max: data.noise_LAmax,
    LA_min: data.noise_LAmin,
  };

  console.log("Transformed live data:", liveData);
  return { liveData };
}
