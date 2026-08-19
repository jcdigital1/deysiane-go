import { useEffect, useRef } from "react";
import L from "leaflet";

export type Point = { lat: number; lon: number } | null;

function pinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:${color};box-shadow:0 0 0 4px ${color}33, 0 0 14px ${color};border:2px solid #0a0a0a"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function RideMap({ origin, destination }: { origin: Point; destination: Point }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: [-18.9186, -48.2772],
      zoom: 12,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (origin) {
      L.marker([origin.lat, origin.lon], { icon: pinIcon("#ff2e88") }).addTo(layer);
    }
    if (destination) {
      L.marker([destination.lat, destination.lon], { icon: pinIcon("#ffffff") }).addTo(layer);
    }
    if (origin && destination) {
      const line = L.polyline(
        [
          [origin.lat, origin.lon],
          [destination.lat, destination.lon],
        ],
        { color: "#ff2e88", weight: 4, opacity: 0.9, dashArray: "8 10" },
      ).addTo(layer);
      map.fitBounds(line.getBounds(), { padding: [36, 36], maxZoom: 15 });
    } else if (origin) {
      map.setView([origin.lat, origin.lon], 15);
    } else if (destination) {
      map.setView([destination.lat, destination.lon], 15);
    }
    map.invalidateSize();
  }, [origin, destination]);

  return <div ref={containerRef} className="h-full w-full" />;
}