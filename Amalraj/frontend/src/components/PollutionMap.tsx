import { useState, useEffect, useRef, useCallback } from "react";
import { CircleMarker, Popup, TileLayer, useMap } from "react-leaflet";
import { MapContainer } from "react-leaflet";
import L, { Canvas } from "leaflet";
import { MdLocationPin } from "react-icons/md";
import { ISensors } from "../models/ISensors";
import { Loader } from "./Loader";
import { fetchAllSensors } from "../service/fetchData";

type OnLocated = (e: L.LocationEvent, map: L.Map) => void | Promise<void>;

/**
 * Uses Leaflet's geolocation API to get the user's position.
 * Returns a Promise resolved with the location event.
 */
export function locateWithLeaflet(map: L.Map): Promise<L.LocationEvent> {
  return new Promise((resolve, reject) => {
    const onFound = (e: L.LocationEvent) => { cleanup(); resolve(e); };
    const onError = (e: L.ErrorEvent) => { cleanup(); reject(e); };
    const cleanup = () => {
      map.off("locationfound", onFound);
      map.off("locationerror", onError);
    };
    map.on("locationfound", onFound);
    map.on("locationerror", onError);
    map.locate({ setView: false, enableHighAccuracy: true, maxZoom: 12, timeout: 10000 });
  });
}

/**
 * Automatically locates the user on map load.
 * Displays a loader while the location is being fetched.
 */
const MapAutoLocate = ({ onLocated, setLoading }: { onLocated: OnLocated; setLoading: (v: boolean) => void }) => {
  const map = useMap();
  const doneRef = useRef(false);
  const onLocatedRef = useRef<OnLocated>(onLocated);

  useEffect(() => { onLocatedRef.current = onLocated; }, [onLocated]);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const run = async () => {
      try {
        const e = await locateWithLeaflet(map);
        await onLocatedRef.current(e, map);
      } catch (err) {
        console.warn("Auto locate failed:", err);
        setLoading(false);
      }
    };
    // Double requestAnimationFrame ensures map is ready
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [map, setLoading]);

  return null;
};

/**
 * Adds a button allowing the user to manually re-center on their location.
 */
const LocateControl = ({ onLocate, loading, setZoomLevel, disabled }: {
  onLocate: (map: L.Map) => void;
  loading: boolean;
  setZoomLevel: (z: number) => void;
  disabled: boolean;
}) => {
  const map = useMap();
  useEffect(() => {
    const updateZoom = () => setZoomLevel(map.getZoom());
    updateZoom();
    map.on("zoomend", updateZoom);
    return () => {
      map.off("zoomend", updateZoom);
    };
  }, [map]);

  return (
    <button
      className="location-button"
      onClick={() => onLocate(map)}
      style={{ position: "absolute", top: 10, right: 10, zIndex: 1000 }}
      disabled={loading || disabled}
    >
      <MdLocationPin className="pin-icon" />
      Find nearest point
    </button>
  );
};

const canvasRenderer = new Canvas();

/**
 * Handles map clicks to fetch and display pollution data at the clicked location.
 */
const MapClickHandler = ({ setLoading }: {
  setLoading: (loading: boolean) => void;
}) => {
  const map = useMap();

  useEffect(() => {
    const handleMapClick = async (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      console.log("Map clicked at:", { lat, lon });

      setLoading(true);

      const content = `
        <div style="font-family: Arial, sans-serif; font-size: 13px; padding: 5px 10px;">
          <b>📍 Location</b><br>
          <b>Latitude:</b> ${lat.toFixed(3)}<br>
          <b>Longitude:</b> ${lon.toFixed(3)}<br>
        </div>
      `;

      L.popup({ offset: [0, -10] })
        .setLatLng(e.latlng)
        .setContent(content)
        .openOn(map);

      setLoading(false);
    };

    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [map, setLoading]);

  return null;
};

/**
 * Main component rendering the noise pollution map.
 */
export const PollutionMap = () => {
  const mapRef = useRef<L.Map | null>(null);
  const [places, setPlaces] = useState<ISensors[]>([]);
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);
  const [, setNearestPoint] = useState<ISensors | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(2);
  const showSpinner = loading || locationLoading || dataLoading;

  // Update nearest sensor when user location changes
  useEffect(() => {
    if (userLocation && places.length) {
      setNearestPoint(findNearestPoint(userLocation));
    }
  }, [userLocation, places]);

  /**
   * Called after auto-location succeeds.
   * Displays a popup with the user's coordinates.
   */
  const handleAutoLocated = useCallback(async (e: L.LocationEvent, map: L.Map) => {
    setUserLocation(e.latlng);
    const nearest = findNearestPoint(e.latlng);
    setNearestPoint(nearest);

    try {
      L.popup({ offset: [0, -10] })
        .setLatLng(e.latlng)
        .setContent(`
        <div style="font-family: Arial, sans-serif; font-size: 13px; padding: 5px 10px;">
          <b>You are here</b><br/>
          <b>Latitude :</b> ${e.latlng.lat.toFixed(3)}<br/>
          <b>Longitude :</b> ${e.latlng.lng.toFixed(3)}<br/><br/>
        </div>
      `)
        .openOn(map);
    } catch (err) {
      console.warn("Prediction error on auto locate:", err);
    }

    map.panTo(e.latlng);
    setLocationLoading(false);
  }, []);

  /**
   * Fetch all pollution sensor data from the API.
   */
  useEffect(() => {
    const loadPlaces = async () => {
      setDataLoading(true);
      try {
        const filteredData = await fetchAllSensors();
        const validPlaces = filteredData
          .filter((place) => place.latitude !== null && place.longitude !== null)
          .map((place) => ({
            ...place,
            latitude: Number(place.latitude),
            longitude: Number(place.longitude),
          }));
        setPlaces(validPlaces);
        console.log("Fetched places:", validPlaces.length);
      } catch (err) {
        console.error("Error fetching places:", err);
        alert("Failed to load pollution data.");
      } finally {
        setDataLoading(false);
      }
    };
    loadPlaces();
  }, []);

  /**
   * Locates the user manually when the "Find nearest point" button is clicked.
   */
  const handleLocate = async (map: L.Map) => {
    if (!map) return;
    setLoading(true);
    try {
      const e = await locateWithLeaflet(map);
      setUserLocation(e.latlng);
      const nearest = findNearestPoint(e.latlng);
      setNearestPoint(nearest);

      if (nearest) {
        const nearestLatLng = L.latLng(nearest.latitude, nearest.longitude);
        map.flyTo(nearestLatLng, 10);
        const content = `
        <strong>Nearest Measurement Point:</strong><br/>
        Latitude: ${nearest.latitude.toFixed(2)}, Longitude: ${nearest.longitude.toFixed(2)}
      `;
        L.popup().setLatLng(nearestLatLng).setContent(content).openOn(map);
      }
    } catch {
      alert("Could not access your location.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Utility function: finds the closest pollution sensor to a given user location.
   */
  const findNearestPoint = (userLatLng: L.LatLng): ISensors | null => {
    let nearest: ISensors | null = null;
    let minDistance = Infinity;
    places.forEach((place) => {
      const distance = userLatLng.distanceTo(L.latLng(place.latitude, place.longitude));
      if (distance < minDistance) {
        minDistance = distance;
        nearest = place;
      }
    });
    return nearest;
  };

  const handleShowData = (id: string | number) => {
    window.location.href = `/sensor/${id}`;
  };

  return (
    <div className="box-container">
      <div className="map-container">
        <h2>Noise Pollution Map</h2>
        <p>Use this interactive map to track noise pollution levels at your location!</p>

        {/* Leaflet map setup */}
        <div className="map-wrapper">
          {showSpinner && <div className="loader-overlay"><Loader /></div>}
          <MapContainer
            center={[33, 10]}
            zoom={2}
            scrollWheelZoom={true}
            doubleClickZoom={false}
            ref={mapRef}
            minZoom={2}
            maxZoom={10}
            maxBounds={[[-85, -180], [85, 180]]}
            maxBoundsViscosity={1.0}
          >
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Components handling auto-location, manual locate, and clicks */}
            <MapAutoLocate onLocated={handleAutoLocated} setLoading={setLocationLoading} />
            <LocateControl
              onLocate={handleLocate}
              loading={loading}
              setZoomLevel={setZoomLevel}
              disabled={!userLocation}
            />
            <MapClickHandler setLoading={setLoading} />

            {/* Display all available pollution sensors */}
            {places.map((place, index) => (
              <CircleMarker
                key={`${place.latitude}-${place.longitude}-${index}`}
                center={[place.latitude, place.longitude]}
                radius={Math.max(5, zoomLevel)}
                renderer={canvasRenderer}
                pathOptions={{
                  fillColor: "black",
                  color: "#eee",
                  weight: 1,
                  opacity: 0.3,
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <b>📍 Location</b><br />
                  <strong>Country:</strong> {place.country}<br />
                  <div>
                    <strong>Latitude:</strong> {place.latitude.toFixed(2)}<br />
                    <strong>Longitude:</strong> {place.longitude.toFixed(2)}
                  </div>
                  {place.id && (
                    <button
                      onClick={() => handleShowData(place.id)}
                      style={{
                        marginTop: "10px",
                        padding: "5px 10px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      Data
                    </button>
                  )}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Educational section on noise and cardiovascular health */}
        <div className="image-about-pm-container">
          <div className="about-pm-container">
            <h3>Noise & Heart Health</h3>
            <div className="pm-text">
              Chronic noise exposure raises stress hormones, disrupts sleep,
              and impairs vascular function — linked to hypertension and ischemic
              heart disease. Keeping average levels below WHO guidance reduces risk.
              <br /><b>Awareness is the first step toward prevention.</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};