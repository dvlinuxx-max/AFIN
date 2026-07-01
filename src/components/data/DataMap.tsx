"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Locale } from "@/lib/i18n";
import type { ExportSubmission } from "@/lib/export";
import { useI18n } from "@/components/I18nProvider";

export default function DataMap({ submissions, locale }: { submissions: ExportSubmission[]; locale: Locale }) {
  const { t } = useI18n();
  const points = submissions.filter((s) => s.geoLat !== null && s.geoLng !== null);

  if (points.length === 0) {
    return <div className="card p-10 text-center" style={{ color: "var(--color-muted)" }}>{t.data.noData}</div>;
  }

  const center: [number, number] = [
    points.reduce((a, p) => a + (p.geoLat as number), 0) / points.length,
    points.reduce((a, p) => a + (p.geoLng as number), 0) / points.length,
  ];

  return (
    <div className="card overflow-hidden" style={{ height: 480 }}>
      <MapContainer center={center} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((s) => (
          <CircleMarker
            key={s.id}
            center={[s.geoLat as number, s.geoLng as number]}
            radius={7}
            pathOptions={{ color: "#059669", fillColor: "#10b981", fillOpacity: 0.7 }}
          >
            <Popup>{new Date(s.createdAt).toLocaleString(locale === "ar" ? "ar" : "en")}</Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
