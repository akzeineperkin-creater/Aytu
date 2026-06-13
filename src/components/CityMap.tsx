'use client'

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export interface Complaint {
  id: number | string
  category: string
  priority: string
  text: string
  city: string
  district: string
  latitude: number
  longitude: number
  summary: string
}

interface CityMapProps {
  complaints: Complaint[]
  onSelect: (c: Complaint) => void
}

const PRIORITY_COLOR: Record<string, string> = {
  'Высокий': '#ef4444',
  'Средний': '#f59e0b',
  'Низкий':  '#3b82f6',
}

export default function CityMap({ complaints, onSelect }: CityMapProps) {
  return (
    <MapContainer
      center={[48.0196, 66.9237]}
      zoom={5}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      {complaints.map((c) => {
        const color = PRIORITY_COLOR[c.priority] ?? '#3b82f6'
        return (
          <CircleMarker
            key={String(c.id)}
            center={[c.latitude, c.longitude]}
            radius={c.priority === 'Высокий' ? 10 : 8}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.82, weight: 2.5 }}
            eventHandlers={{ click: () => onSelect(c) }}
          >
            <Popup className="city-popup">
              <div style={{ fontFamily: 'sans-serif', minWidth: 160 }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 3 }}>{c.category}</div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 5 }}>📍 {c.city} · {c.district}</div>
                <div style={{ fontSize: 11, marginBottom: 6, lineHeight: 1.5 }}>{c.text}</div>
                <span style={{
                  display: 'inline-block', padding: '2px 10px',
                  borderRadius: 9999, background: color,
                  color: '#fff', fontSize: 10, fontWeight: 700,
                }}>{c.priority}</span>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
