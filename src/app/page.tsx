'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  Hexagon, Radio, MapPin, Upload, Send, Bot, User,
  AlertTriangle, Smartphone, ArrowRight, Wifi, Zap,
} from 'lucide-react'
import type { Complaint } from '../components/CityMap'

// ── SSR-safe map import ───────────────────────────────────────────────────────
const CityMap = dynamic(() => import('../components/CityMap'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage { role: 'user' | 'assistant'; content: string }
interface District    { name: string; lat: number; lng: number }

// ── Geo data ──────────────────────────────────────────────────────────────────

const CITY_DISTRICTS: Record<string, District[]> = {
  Almaty: [
    { name: 'Алмалинский район',   lat: 43.262, lng: 76.934 },
    { name: 'Бостандыкский район', lat: 43.197, lng: 76.852 },
    { name: 'Жетысуский район',    lat: 43.332, lng: 77.058 },
    { name: 'Медеуский район',     lat: 43.201, lng: 76.998 },
    { name: 'Наурызбайский район', lat: 43.183, lng: 76.763 },
    { name: 'Ауэзовский район',    lat: 43.270, lng: 76.869 },
  ],
  Taraz: [
    { name: 'Кордай (с. Кордай)',    lat: 42.898, lng: 74.763 },
    { name: 'Байзак (с. Сарыкемер)', lat: 43.011, lng: 71.320 },
    { name: 'Меркенский район',      lat: 42.868, lng: 73.184 },
  ],
  Shymkent: [
    { name: 'Район Аль-Фараби',   lat: 42.323, lng: 69.589 },
    { name: 'Енбекшинский район', lat: 42.301, lng: 69.603 },
    { name: 'Каратауский район',  lat: 42.280, lng: 69.572 },
  ],
  Astana: [
    { name: 'Алматинский район',   lat: 51.178, lng: 71.452 },
    { name: 'Сарыаркинский район', lat: 51.153, lng: 71.432 },
    { name: 'Есильский район',     lat: 51.124, lng: 71.421 },
  ],
}

// ── Mock data (5-10 realistic complaints) ─────────────────────────────────────

const MOCK_COMPLAINTS: Complaint[] = [
  {
    id: 1, category: 'Roads', priority: 'Высокий',
    text: 'Huge pothole on Abay Ave — two cars damaged this week, near the school entrance.',
    city: 'Almaty', district: 'Алмалинский район', latitude: 43.262, longitude: 76.934,
    summary: 'Critical road damage on main avenue',
  },
  {
    id: 2, category: 'Utilities', priority: 'Высокий',
    text: 'Strong gas leak smell from the manhole on Dostyk St. Residents are evacuating.',
    city: 'Almaty', district: 'Жетысуский район', latitude: 43.332, longitude: 77.058,
    summary: 'Emergency gas leak — immediate response required',
  },
  {
    id: 3, category: 'Utilities', priority: 'Средний',
    text: 'Broken water main flooding the sidewalk. Ice is forming overnight — hazardous.',
    city: 'Almaty', district: 'Бостандыкский район', latitude: 43.197, longitude: 76.852,
    summary: 'Water pipe burst causing street flooding',
  },
  {
    id: 4, category: 'Safety', priority: 'Высокий',
    text: 'All streetlights on the main road are completely out. Total darkness after 8 PM.',
    city: 'Taraz', district: 'Кордай (с. Кордай)', latitude: 42.898, longitude: 74.763,
    summary: 'Public safety risk: no street lighting',
  },
  {
    id: 5, category: 'Waste', priority: 'Средний',
    text: 'Illegal dump site growing near the children\'s playground. Smells and rats visible.',
    city: 'Taraz', district: 'Байзак (с. Сарыкемер)', latitude: 43.011, longitude: 71.320,
    summary: 'Illegal waste dumping near playground',
  },
  {
    id: 6, category: 'Roads', priority: 'Низкий',
    text: 'Broken sidewalk tiles near the metro entrance — elderly residents at risk of falls.',
    city: 'Almaty', district: 'Медеуский район', latitude: 43.201, longitude: 76.998,
    summary: 'Damaged pedestrian tiles near metro',
  },
  {
    id: 7, category: 'Waste', priority: 'Низкий',
    text: 'Overflowing bins near central market — not collected for 3 days. Flies everywhere.',
    city: 'Astana', district: 'Есильский район', latitude: 51.124, longitude: 71.421,
    summary: 'Waste collection failure at central market',
  },
  {
    id: 8, category: 'Safety', priority: 'Средний',
    text: 'Abandoned vehicle blocking fire hydrant access for over a week on Kabanbay Batyr.',
    city: 'Astana', district: 'Сарыаркинский район', latitude: 51.153, longitude: 71.432,
    summary: 'Fire hydrant blocked by abandoned vehicle',
  },
  {
    id: 9, category: 'Utilities', priority: 'Низкий',
    text: 'Street lamp flickering constantly on Furmanov St — causes headaches for pedestrians.',
    city: 'Almaty', district: 'Ауэзовский район', latitude: 43.270, longitude: 76.869,
    summary: 'Faulty street lamp — maintenance needed',
  },
  {
    id: 10, category: 'Roads', priority: 'Высокий',
    text: 'Bridge surface cracking visible — vehicles vibrate heavily while crossing.',
    city: 'Shymkent', district: 'Каратауский район', latitude: 42.280, longitude: 69.572,
    summary: 'Bridge structural damage — safety concern',
  },
]

// ── City skyline SVG background ───────────────────────────────────────────────

function CitySkyline() {
  return (
    <svg
      className="absolute bottom-0 left-0 w-full pointer-events-none select-none"
      viewBox="0 0 1400 160"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
    >
      {/* Buildings */}
      {[
        [0,90,70,70],[75,70,55,90],[135,80,45,80],[185,50,35,110],[225,75,50,85],
        [280,35,40,125],[325,85,55,75],[385,55,65,105],[455,80,40,80],[500,45,55,115],
        [560,75,45,85],[610,30,50,130],[665,80,40,80],[710,55,60,105],[775,85,45,75],
        [825,40,55,120],[885,70,50,90],[940,85,40,75],[985,50,60,110],[1050,80,40,80],
        [1095,35,55,125],[1155,75,50,85],[1210,55,65,105],[1280,80,45,80],[1330,60,70,100],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h + 50} fill={`rgba(74,120,160,${0.15 + (i % 3) * 0.05})`} />
      ))}
      {/* Window dots */}
      {[80,160,290,420,520,630,720,840,950,1060,1170,1290].map((x, i) => (
        <g key={i}>
          <rect x={x+8} y={55} width={5} height={5} fill="rgba(255,220,100,0.35)" />
          <rect x={x+18} y={55} width={5} height={5} fill="rgba(255,220,100,0.25)" />
          <rect x={x+8} y={68} width={5} height={5} fill="rgba(255,220,100,0.3)" />
          <rect x={x+18} y={68} width={5} height={5} fill="rgba(255,220,100,0.4)" />
        </g>
      ))}
      {/* Antenna spires */}
      {[295,518,627,835,1112].map((x, i) => (
        <g key={i}>
          <rect x={x} y={28} width={3} height={12} fill="rgba(100,160,200,0.4)" />
          <circle cx={x+1.5} cy={27} r={2} fill="rgba(255,80,80,0.5)" />
        </g>
      ))}
      {/* Clouds */}
      {[[180,22],[480,15],[820,18],[1180,20]].map(([cx, cy], i) => (
        <g key={i} opacity={0.45}>
          <ellipse cx={cx} cy={cy} rx={55} ry={17} fill="white" />
          <ellipse cx={cx+35} cy={cy+3} rx={38} ry={13} fill="white" />
          <ellipse cx={cx-32} cy={cy+4} rx={32} ry={11} fill="white" />
        </g>
      ))}
    </svg>
  )
}

// ── Category mini bar chart ───────────────────────────────────────────────────

function CategoryChart({ complaints }: { complaints: Complaint[] }) {
  const CATS = [
    { key: 'Roads',     label: 'Roads',     grad: 'from-amber-500 to-orange-500' },
    { key: 'Utilities', label: 'Utilities', grad: 'from-blue-500 to-cyan-500' },
    { key: 'Waste',     label: 'Waste',     grad: 'from-green-500 to-emerald-500' },
    { key: 'Safety',    label: 'Safety',    grad: 'from-red-500 to-rose-500' },
  ]
  const max = Math.max(1, ...CATS.map(c => complaints.filter(r => r.category === c.key).length))
  return (
    <div className="space-y-2">
      {CATS.map(c => {
        const n = complaints.filter(r => r.category === c.key).length
        return (
          <div key={c.key}>
            <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
              <span>{c.label}</span><span className="text-gray-400">{n}</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${c.grad} transition-all duration-700`}
                style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Root page ─────────────────────────────────────────────────────────────────

export default function CityPulseDashboard() {
  // ── Form state
  const [city, setCity]         = useState('')
  const [district, setDistrict] = useState<District | null>(null)
  const [text, setText]         = useState('')
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  // ── Dashboard state
  const [complaints]                  = useState<Complaint[]>(MOCK_COMPLAINTS)
  const [selectedIncident, setSelectedIncident] = useState<Complaint | null>(null)

  // ── Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: 'Online. I have access to live incident data. Ask me anything about current city alerts or request a dispatch summary.',
  }])
  const [chatInput, setChatInput]   = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const districts = CITY_DISTRICTS[city] ?? []

  function handleFileChange(f: File | null) {
    setFile(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!city || !district || !text.trim()) return
    setSubmitStatus('loading')
    const form = new FormData()
    form.append('complaint', text)
    form.append('city', city)
    form.append('district', district.name)
    form.append('latitude', String(district.lat))
    form.append('longitude', String(district.lng))
    if (file) form.append('image', file)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analyze`, { method: 'POST', body: form })
      if (!res.ok) throw new Error()
      await res.json()
      setSubmitStatus('success')
      setText(''); setFile(null); setPreview(null); setCity(''); setDistrict(null)
      setTimeout(() => setSubmitStatus('idle'), 3000)
    } catch {
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus('idle'), 3000)
    }
  }

  async function sendChat() {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: msg }])
    setChatLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      if (!res.ok) throw new Error()
      const { reply } = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Backend offline. Check port 8000.' }])
    } finally {
      setChatLoading(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  const critical = complaints.filter(c => c.priority === 'Высокий').length
  const pending  = complaints.filter(c => c.priority === 'Средний').length

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1 — Resident Portal (Light / Top half)
      ══════════════════════════════════════════════════════════════ */}
      <section className="h-[50vh] relative bg-[#cce9f0] flex flex-col overflow-hidden">
        <CitySkyline />

        {/* Header */}
        <header className="relative z-10 flex items-center gap-2 px-6 py-2 bg-white/55 backdrop-blur-sm border-b border-white/50 flex-shrink-0">
          <Hexagon size={18} className="text-[#2bb3c0]" fill="rgba(43,179,192,0.15)" />
          <span className="font-black text-[#0d3d52] text-sm tracking-wide">CITY PULSE</span>
          <span className="text-[#2bb3c0]/50 text-xs">|</span>
          <span className="text-[#1a5f7a] text-xs font-semibold">Resident Portal</span>
          <span className="text-[#2bb3c0]/50 text-xs">|</span>
          <span className="text-[#1a5f7a] text-xs font-semibold">Report a Problem</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            <span className="text-[9px] font-bold text-[#2bb3c0] uppercase tracking-widest">Live</span>
          </div>
        </header>

        {/* Body */}
        <div className="relative z-10 flex flex-1 min-h-0 px-6 gap-5 py-3">

          {/* Left 60% — Marketing */}
          <div className="w-[60%] flex flex-col justify-center">
            <h1 className="text-[2.3rem] font-black text-[#0d3d52] leading-[1.05] uppercase tracking-tight mb-2">
              Make Our Cities<br />Better Together.
            </h1>
            <p className="text-[#1a5f7a] text-[13px] leading-relaxed mb-4 max-w-lg">
              Report utility issues, potholes, or safety concerns.
              <br /><strong>Our AI analyzes every report instantly</strong> — 24 / 7, zero waiting.
            </p>

            {/* Phone callout */}
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-2xl px-4 py-2.5 w-fit border border-white/70 shadow-sm mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#2bb3c0] flex items-center justify-center flex-shrink-0">
                <Smartphone size={18} className="text-white" />
              </div>
              <div>
                <p className="text-[9px] font-black text-[#0d3d52] uppercase tracking-[0.2em]">Quick Report</p>
                <p className="text-[11px] text-[#1a5f7a]">Take a photo · Describe · Submit</p>
              </div>
              <ArrowRight size={15} className="text-[#2bb3c0] ml-1" />
            </div>

            {/* AI capability badges */}
            <div className="flex gap-2 flex-wrap">
              {[
                { icon: <Zap size={9} />, label: 'Text NLP' },
                { icon: <span className="text-[9px]">👁</span>, label: 'Image CV' },
                { icon: <span className="text-[9px]">📊</span>, label: 'AI Clustering' },
              ].map(({ icon, label }) => (
                <span key={label}
                  className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-[#0d3d52]/10 text-[#0d3d52] px-2.5 py-1 rounded-full border border-[#0d3d52]/20">
                  {icon} {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right 40% — NEW REPORT card */}
          <div className="w-[40%] flex items-center justify-center">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl shadow-[#2bb3c0]/15 border border-[#2bb3c0]/20 overflow-hidden">

              {/* Card header */}
              <div className="bg-[#0d3d52] px-5 py-2.5 flex items-center justify-between">
                <span className="text-white font-black text-sm tracking-[0.2em] uppercase">New Report</span>
                <div className="flex gap-1.5">
                  {['bg-red-400', 'bg-yellow-400', 'bg-green-400'].map(c => (
                    <span key={c} className={`w-2 h-2 rounded-full ${c}`} />
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-2.5">

                {/* Description */}
                <textarea
                  rows={2}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Explain the problem briefly..."
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2bb3c0]/30 resize-none"
                />

                {/* Cascading dropdowns */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-black tracking-[0.2em] text-gray-400 uppercase mb-1">
                      Region / City
                    </label>
                    <select
                      value={city}
                      onChange={e => { setCity(e.target.value); setDistrict(null) }}
                      required
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2bb3c0]/30"
                    >
                      <option value="">— City —</option>
                      {Object.keys(CITY_DISTRICTS).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-black tracking-[0.2em] text-gray-400 uppercase mb-1">
                      District / Village
                    </label>
                    <select
                      value={district?.name ?? ''}
                      onChange={e => setDistrict(districts.find(d => d.name === e.target.value) ?? null)}
                      required
                      disabled={!city}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2bb3c0]/30 disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">— District —</option>
                      {districts.map(d => (
                        <option key={d.name} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {district && (
                  <p className="text-[9px] text-[#2bb3c0] flex items-center gap-1">
                    <MapPin size={9} />
                    {district.lat.toFixed(4)}° N &nbsp;{district.lng.toFixed(4)}° E
                  </p>
                )}

                {/* Photo upload with preview */}
                <label className="block border-2 border-dashed border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-[#2bb3c0] transition-colors group">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="preview" className="w-full h-14 object-cover" />
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <Upload size={13} className="text-gray-400 group-hover:text-[#2bb3c0] transition-colors flex-shrink-0" />
                      <span className="text-[11px] text-gray-400 group-hover:text-[#2bb3c0] transition-colors truncate">
                        {file ? file.name : 'Upload photo (optional)'}
                      </span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => handleFileChange(e.target.files?.[0] ?? null)} />
                </label>

                {submitStatus === 'error' && (
                  <p className="text-red-500 text-[10px] flex items-center gap-1">
                    <AlertTriangle size={10} /> Backend offline — check port 8000.
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitStatus === 'loading'}
                  className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-[0.15em] transition-all ${
                    submitStatus === 'success'
                      ? 'bg-green-500 text-white'
                      : 'bg-[#2bb3c0] hover:bg-[#229ca8] disabled:bg-gray-300 text-white'
                  }`}
                >
                  {submitStatus === 'loading' ? 'Analyzing…' :
                   submitStatus === 'success' ? '✓ Report Sent!' : 'Submit Report'}
                </button>

                {/* Footer badges */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100 flex-wrap">
                  <span className="text-[8px] text-gray-400 uppercase tracking-wider font-black">Live AI:</span>
                  {['Text NLP', 'Image CV', 'Clustering'].map(b => (
                    <span key={b} className="text-[7px] font-bold uppercase tracking-wider bg-[#2bb3c0]/10 text-[#2bb3c0] px-1.5 py-0.5 rounded-full border border-[#2bb3c0]/20">
                      {b}
                    </span>
                  ))}
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2 — Situational Center (Dark / Bottom half)
      ══════════════════════════════════════════════════════════════ */}
      <section className="h-[50vh] flex flex-col bg-[#0d1117] overflow-hidden">

        {/* Dashboard header */}
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-1.5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Radio size={13} className="text-[#2bb3c0] animate-pulse" />
            <span className="text-white font-black text-xs tracking-wider uppercase">
              Situational Center Dashboard
            </span>
            <span className="text-gray-600 text-[9px]">(Real-Time Monitor)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[8px] font-bold text-[#2bb3c0] border border-[#2bb3c0]/30 rounded-full px-2 py-0.5 bg-[#2bb3c0]/5">
              <Wifi size={8} /> LIVE DATA
            </span>
            <span className="text-[8px] text-gray-600 border border-gray-800 rounded-full px-2 py-0.5">OpenStreetMap</span>
          </div>
        </header>

        {/* 3-column grid */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Column A: Live Statistics (20%) ── */}
          <aside className="w-[20%] flex-shrink-0 border-r border-gray-800 p-3 overflow-y-auto space-y-2">

            <div className="bg-gray-900 rounded-xl p-3">
              <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Total Reports</p>
              <p className="text-3xl font-black text-white"
                style={{ textShadow: '0 0 18px rgba(43,179,192,0.35)' }}>124</p>
            </div>

            <div className="bg-gray-900 rounded-xl p-3 border border-red-900/40">
              <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Active Critical</p>
              <p className="text-3xl font-black text-red-400"
                style={{ textShadow: '0 0 18px rgba(239,68,68,0.5)' }}>{critical}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                <span className="text-[8px] text-red-500">High priority</span>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-3 border border-yellow-900/40">
              <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Pending</p>
              <p className="text-3xl font-black text-yellow-400"
                style={{ textShadow: '0 0 18px rgba(245,158,11,0.5)' }}>{pending}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" />
                <span className="text-[8px] text-yellow-400">Medium priority</span>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-3">
              <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-2">Top Categories</p>
              <CategoryChart complaints={complaints} />
            </div>

            <div className="space-y-1.5 pt-1">
              {([['#ef4444','High 🔴'],['#f59e0b','Medium 🟡'],['#3b82f6','Low 🔵']] as const).map(([c, l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
                  <span className="text-[8px] text-gray-500">{l}</span>
                </div>
              ))}
            </div>
          </aside>

          {/* ── Column B: Interactive Map (55%) ── */}
          <main className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1">
              <CityMap complaints={complaints} onSelect={setSelectedIncident} />
            </div>
          </main>

          {/* ── Column C: Operator Command Panel (25%) ── */}
          <aside className="w-[25%] flex-shrink-0 border-l border-gray-800 flex flex-col overflow-hidden">

            {/* Selected Incident Card */}
            <div className="flex-shrink-0 border-b border-gray-800 overflow-y-auto" style={{ maxHeight: '52%' }}>
              {selectedIncident ? (
                <div className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[8px] font-black text-gray-500 tracking-[0.2em] uppercase">
                      {/* CRITICAL FIX: always convert id to String */}
                      Report #{String(selectedIncident.id)}
                    </span>
                    <button onClick={() => setSelectedIncident(null)}
                      className="text-gray-700 hover:text-gray-400 text-xs leading-none ml-2 flex-shrink-0">
                      ✕
                    </button>
                  </div>

                  <h3 className="text-sm font-black text-white mb-2.5">{selectedIncident.category}</h3>

                  <div className="space-y-2 mb-2.5">
                    <div>
                      <p className="text-[8px] text-gray-600 uppercase tracking-widest mb-0.5">AI Verdict</p>
                      <div className="flex gap-1 flex-wrap">
                        <span className="text-[9px] text-gray-300 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                          {selectedIncident.category}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold border ${
                          selectedIncident.priority === 'Высокий'
                            ? 'bg-red-900/30 text-red-400 border-red-800/50'
                            : selectedIncident.priority === 'Средний'
                            ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50'
                            : 'bg-blue-900/30 text-blue-400 border-blue-800/50'
                        }`}>{selectedIncident.priority}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[8px] text-gray-600 uppercase tracking-widest mb-0.5">Location</p>
                      <p className="text-[10px] text-gray-300">{selectedIncident.city} · {selectedIncident.district}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-gray-600 uppercase tracking-widest mb-0.5">Resident Report</p>
                      <p className="text-[10px] text-gray-400 leading-snug">{selectedIncident.text}</p>
                    </div>
                  </div>

                  {/* AI-Validated Photo placeholder */}
                  <div className="w-full h-10 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center mb-2.5">
                    <span className="text-[9px] text-gray-700">No photo attached</span>
                  </div>

                  {/* Dispatch badge */}
                  <div className="bg-[#2bb3c0]/10 border border-[#2bb3c0]/30 rounded-xl p-2.5">
                    <p className="text-[7px] font-black text-[#2bb3c0] uppercase tracking-[0.2em] mb-1">AI Recommendation</p>
                    <p className="text-[10px] font-black text-white mb-0.5">
                      {selectedIncident.priority === 'Высокий'
                        ? '⚡ AUTOMATIC DISPATCH RECOMMENDED'
                        : selectedIncident.priority === 'Средний'
                        ? '📋 SCHEDULE MAINTENANCE VISIT'
                        : '📝 LOG AND MONITOR'}
                    </p>
                    <p className="text-[9px] text-gray-500 leading-snug">{selectedIncident.summary}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-4" style={{ minHeight: 120 }}>
                  <MapPin size={18} className="text-gray-700 mb-1.5" />
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">No incident selected</p>
                  <p className="text-[9px] text-gray-700 mt-1">Click a map marker to view details</p>
                </div>
              )}
            </div>

            {/* Smart AI Analyst Chat */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-shrink-0 bg-gray-900/80 px-3 py-1.5 border-b border-gray-800 flex items-center gap-1.5">
                <Bot size={11} className="text-[#2bb3c0]" />
                <span className="text-[9px] font-black text-white uppercase tracking-wider">Smart AI Analyst</span>
                {chatLoading && (
                  <span className="text-[8px] text-[#2bb3c0] ml-auto animate-pulse">Thinking…</span>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <Bot size={11} className="text-[#2bb3c0] flex-shrink-0 mt-0.5" />
                    )}
                    <div className={`max-w-[88%] text-[10px] leading-relaxed px-2.5 py-1.5 rounded-xl ${
                      msg.role === 'user'
                        ? 'bg-[#2bb3c0]/15 text-[#2bb3c0] border border-[#2bb3c0]/20 rounded-tr-sm'
                        : 'bg-gray-900 text-gray-300 border border-gray-800 rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <User size={11} className="text-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-1.5">
                    <Bot size={11} className="text-[#2bb3c0] flex-shrink-0 mt-0.5" />
                    <div className="bg-gray-900 border border-gray-800 rounded-xl rounded-tl-sm px-2.5 py-1.5 flex gap-1">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#2bb3c0] animate-bounce"
                          style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div className="flex-shrink-0 border-t border-gray-800 p-2">
                <div className="flex gap-1.5 items-center">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="Ask the AI analyst..."
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder:text-gray-600 focus:outline-none focus:border-[#2bb3c0]/50"
                  />
                  <button
                    onClick={sendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="bg-[#2bb3c0] hover:bg-[#229ca8] disabled:bg-gray-700 text-white rounded-lg p-1.5 transition-colors flex-shrink-0"
                  >
                    <Send size={11} />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}
