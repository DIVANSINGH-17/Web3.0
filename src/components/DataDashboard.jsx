import { useEffect, useMemo, useState } from 'react'
import useLocalStorage from './useLocalStorage'
import {
  ResponsiveContainer,
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip,
  BarChart, Bar,
  PieChart, Pie, Cell
} from 'recharts'

// Fetch World Bank freshwater withdrawals (billion m³)
function useGlobalWaterUsage() {
  const [state, setState] = useState({ status: 'idle', worldSeries: [], topCountries: [] })

  useEffect(() => {
    let cancelled = false
    async function run() {
      setState({ status: 'loading', worldSeries: [], topCountries: [] })
      try {
        // 1) World time series
        const worldUrl = 'https://api.worldbank.org/v2/country/WLD/indicator/ER.H2O.FWTL.K3?date=1990:2023&format=json&per_page=20000'
        // 2) All countries latest few years (for top-10 latest)
        const allUrl = 'https://api.worldbank.org/v2/country/all/indicator/ER.H2O.FWTL.K3?date=2015:2023&format=json&per_page=20000'
        const [wRes, aRes] = await Promise.all([fetch(worldUrl), fetch(allUrl)])

        let worldSeries = []
        if (wRes.ok) {
          const wJson = await wRes.json()
          const arr = Array.isArray(wJson?.[1]) ? wJson[1] : []
          worldSeries = arr
            .filter(d => d?.value != null)
            .map(d => ({ year: d.date, value: Number(d.value) }))
            .sort((a, b) => Number(a.year) - Number(b.year))
        }

        let topCountries = []
        if (aRes.ok) {
          const aJson = await aRes.json()
          const data = Array.isArray(aJson?.[1]) ? aJson[1] : []
          // Pick the latest year available per country
          const latestMap = new Map()
          for (const d of data) {
            if (!d?.country?.value) continue
            const name = d.country.value
            const year = Number(d.date)
            const value = d.value == null ? null : Number(d.value)
            if (value == null) continue
            const prev = latestMap.get(name)
            if (!prev || year > prev.year) latestMap.set(name, { name, value, year })
          }
          // Exclude aggregate regions
          const isAggregate = (n) => /world|income|area|union|members|caribbean|asia|europe|africa|america|pacific|emerging|high|low|upper|lower|oecd|euro/i.test(n)
          const rows = Array.from(latestMap.values()).filter(r => !isAggregate(r.name))
          topCountries = rows.sort((a, b) => b.value - a.value).slice(0, 10)
        }

        if (!cancelled) setState({ status: 'success', worldSeries, topCountries })
      } catch (e) {
        if (cancelled) return
        // Minimal mock fallback
        const worldSeries = Array.from({ length: 10 }, (_, i) => ({ year: String(2012 + i), value: 400 + i * 8 }))
        const topCountries = [
          { name: 'Country A', value: 120 },
          { name: 'Country B', value: 115 },
          { name: 'Country C', value: 100 },
          { name: 'Country D', value: 95 },
          { name: 'Country E', value: 90 },
          { name: 'Country F', value: 85 },
          { name: 'Country G', value: 80 },
          { name: 'Country H', value: 75 },
          { name: 'Country I', value: 70 },
          { name: 'Country J', value: 65 },
        ]
        setState({ status: 'mock', worldSeries, topCountries })
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  return state
}

function useUSGSWater(site = '01646500', params = ['00060'], period = 'P7D') {
  const [data, setData] = useState({ series: [], status: 'idle', error: null })

  useEffect(() => {
    let cancelled = false
    async function run() {
      setData({ series: [], status: 'loading', error: null })
      try {
        const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${site}&period=${period}&parameterCd=${params.join(',')}`
        const headers = {}
        const apiKey = import.meta?.env?.VITE_USGS_API_KEY
        if (apiKey) headers['X-Api-Key'] = apiKey
        const res = await fetch(url, { headers })
        let series = []
        if (res.ok) {
          const json = await res.json()
          const ts = json?.value?.timeSeries?.[0]
          const points = ts?.values?.[0]?.value ?? []
          series = points.map(p => ({ time: p.dateTime, value: Number(p.value) }))
        }
        if (!cancelled) {
          if (series.length > 0) setData({ series, status: 'success', error: null })
          else throw new Error(`USGS empty`)
        }
      } catch (err) {
        // Fallback mock: gentle weekly pattern
        const today = new Date()
        const series = Array.from({ length: 24 }, (_, i) => {
          const d = new Date(today)
          d.setHours(today.getHours() - (24 - i) * 7)
          return { time: d.toISOString(), value: 100 + Math.round(30 * Math.sin(i / 3) + 15 * Math.random()) }
        })
        if (!cancelled) setData({ series, status: 'mock', error: String(err) })
      }
    }
    run()
    return () => { cancelled = true }
  }, [site, period, params.join(',')])

  return data
}

// CarbonFootprint API hooks
function useCarbon() {
  const [state, setState] = useState({ status: 'idle', intensity: [], breakdown: [] })

  useEffect(() => {
    let cancelled = false
    async function run() {
      setState({ status: 'loading', intensity: [], breakdown: [] })
      const isDev = !!import.meta?.env?.DEV
      const base = (import.meta?.env?.VITE_CARBON_BASE || (isDev ? '/cf' : 'https://api.electricitymap.org')).replace(/\/$/, '')
      const apiKey = import.meta?.env?.VITE_CARBON_API_KEY
      const authHeader = import.meta?.env?.VITE_CARBON_AUTH_HEADER || 'auth-token'
      const headers = apiKey ? { [authHeader]: apiKey } : {}

      // Optional scoping for the API (provider dependent)
      const zone = import.meta?.env?.VITE_CARBON_ZONE || 'US'
      const qs = new URLSearchParams()
      if (zone) qs.set('zone', zone)
      if (apiKey) qs.set('token', apiKey)
      const q = qs.toString()
      const qmark = q ? `?${q}` : ''

      // Helper: parse arrays defensively
      const toArray = (j) => (Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : Array.isArray(j?.result) ? j.result : Array.isArray(j?.history) ? j.history : Array.isArray(j?.breakdown) ? j.breakdown : typeof j === 'object' ? Object.entries(j) : [])

      try {
        // Intensity: try history then latest with ElectricityMaps endpoints
        let intensity = []
        try {
          const histRes = await fetch(`${base}/v3/carbon-intensity/history${qmark}`, { headers })
          if (histRes.ok) {
            const j = await histRes.json()
            const arr = j?.history || toArray(j)
            intensity = arr.map((p, i) => ({
              time: p.datetime || p.time || p.timestamp || i,
              value: Number(p.carbonIntensity || p.intensity || p.value || 0),
            })).filter(d => Number.isFinite(d.value) && d.value >= 0)
          }
        } catch {}
        if (!intensity.length) {
          try {
            const latestRes = await fetch(`${base}/v3/carbon-intensity/latest${qmark}`, { headers })
            if (latestRes.ok) {
              const j = await latestRes.json()
              const val = Math.max(0, Number(j?.carbonIntensity || j?.intensity || j?.value || 0))
              if (val > 0) {
                intensity = [{ time: j?.datetime || 'now', value: val }]
              }
            }
          } catch {}
        }

        // Breakdown: try latest then history with ElectricityMaps endpoints
        let breakdown = []
        try {
          const mixRes = await fetch(`${base}/v3/power-breakdown/latest${qmark}`, { headers })
          if (mixRes.ok) {
            const j = await mixRes.json()
            const mix = j?.powerConsumptionBreakdown || j?.powerProductionBreakdown || j
            if (mix && typeof mix === 'object') {
              breakdown = Object.entries(mix).map(([fuel, value]) => ({
                name: fuel.charAt(0).toUpperCase() + fuel.slice(1),
                value: Math.max(0, Number(value) || 0),
              })).filter(d => d.value > 0)
            }
          }
        } catch {}
        if (!breakdown.length) {
          try {
            const mixHistRes = await fetch(`${base}/v3/power-breakdown/history${qmark}`, { headers })
            if (mixHistRes.ok) {
              const j = await mixHistRes.json()
              const hist = j?.history || []
              if (hist.length > 0) {
                const last = hist[hist.length - 1]
                const mix = last?.powerConsumptionBreakdown || last?.powerProductionBreakdown
                if (mix && typeof mix === 'object') {
                  breakdown = Object.entries(mix).map(([fuel, value]) => ({
                    name: fuel.charAt(0).toUpperCase() + fuel.slice(1),
                    value: Math.max(0, Number(value) || 0),
                  })).filter(d => d.value > 0)
                }
              }
            }
          } catch {}
        }

        if (!cancelled) {
          if (intensity.length || breakdown.length) setState({ status: 'success', intensity, breakdown })
          else {
            // Mock fallback if API returned nothing
            const intensityMock = Array.from({ length: 24 }, (_, i) => ({ time: i, value: 150 + Math.round(40 * Math.sin(i / 3) + 10 * Math.random()) }))
            const breakdownMock = [
              { name: 'Wind', value: 28 },
              { name: 'Solar', value: 14 },
              { name: 'Hydro', value: 10 },
              { name: 'Gas', value: 38 },
              { name: 'Coal', value: 10 },
            ]
            setState({ status: 'mock', intensity: intensityMock, breakdown: breakdownMock })
          }
        }
      } catch (e) {
        if (cancelled) return
        // Global fallback
        const intensity = Array.from({ length: 24 }, (_, i) => ({ time: i, value: 150 + Math.round(40 * Math.sin(i / 3) + 10 * Math.random()) }))
        const breakdown = [
          { name: 'Wind', value: 28 },
          { name: 'Solar', value: 14 },
          { name: 'Hydro', value: 10 },
          { name: 'Gas', value: 38 },
          { name: 'Coal', value: 10 },
        ]
        setState({ status: 'mock', intensity, breakdown })
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  return state
}

// Helper to build headers from env/local settings
function buildAuthHeaders(prefix) {
  const headers = {}
  const envHeader = import.meta?.env?.[`${prefix}_AUTH_HEADER`]
  const envKey = import.meta?.env?.[`${prefix}_API_KEY`]
  if (envHeader && envKey) headers[envHeader] = envKey
  return headers
}

function useIWasteMeta() {
  const [state, setState] = useState({ status: 'loading', categoryCounts: [], structureTypes: [], paramCount: 0, error: null })

  useEffect(() => {
    let cancelled = false
    async function run() {
      setState({ status: 'loading', categoryCounts: [], structureTypes: [], paramCount: 0, error: null })
      try {
        const base = (import.meta?.env?.VITE_IWASTE_BASE || '/iwaste').replace(/\/$/, '')
        const headers = buildAuthHeaders('VITE_IWASTE')
        const [catsRes, paramsRes, structRes] = await Promise.all([
          fetch(`${base}/api/categories`, { headers }),
          fetch(`${base}/api/parameters`, { headers }),
          fetch(`${base}/api/structure-types`, { headers }),
        ])
        let cats = []
        let params = []
        let structs = []
        if (catsRes.ok) cats = await catsRes.json()
        if (paramsRes.ok) params = await paramsRes.json()
        if (structRes.ok) structs = await structRes.json()

        // Derive counts per category from categories or parameters
        // Try to detect category field names; fallback to array length
        const countsMap = new Map()
        const addCount = (name) => {
          const key = String(name || 'Unknown')
          countsMap.set(key, (countsMap.get(key) || 0) + 1)
        }
        if (Array.isArray(params) && params.length) {
          for (const p of params) addCount(p.category || p.Category || p.group || p.Group || p.type || p.Type)
        } else if (Array.isArray(cats) && cats.length) {
          for (const c of cats) addCount(c.name || c.Name || c.title || c.Title)
        }
        const categoryCounts = Array.from(countsMap.entries()).map(([category, count]) => ({ category, count }))

        const structureTypes = Array.isArray(structs) ? structs.map(s => s.name || s.Name || s.type || s.Type || String(s)).slice(0, 10) : []
        const paramCount = Array.isArray(params) ? params.length : 0

        if (!cancelled) setState({ status: 'success', categoryCounts, structureTypes, paramCount, error: null })
      } catch (e) {
        if (!cancelled) setState({ status: 'mock', categoryCounts: [
          { category: 'Recycling', count: 12 },
          { category: 'Composting', count: 7 },
          { category: 'Landfill', count: 9 },
        ], structureTypes: ['Facility', 'Community', 'Commercial'], paramCount: 42, error: String(e) })
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  return state
}

function Card({ title, subtitle, children, className }) {
  return (
    <section className={`viz-card ${className || ''}`}>
      <header className="viz-head">
        <h3>{title}</h3>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </header>
      <div className="viz-body">
        {children}
      </div>
    </section>
  )
}

export default function DataDashboard() {
  const siteId = import.meta?.env?.VITE_USGS_SITE_ID || '01646500'
  const water = useUSGSWater(siteId)
  const iwaste = useIWasteMeta()
  const carbon = useCarbon()
  const globalWater = useGlobalWaterUsage()

  const waterShort = useMemo(() => water.series.slice(-48), [water.series])

  return (
    <div className="dashboard-grid">
      {/* Carbon Intensity History */}
      <Card title="Carbon Intensity (History)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={carbon.intensity} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={32} />
            <YAxis tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
            <RTooltip contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
            <Line type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Power Mix Breakdown */}
      <Card title="Power Mix (Latest)">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={carbon.breakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
              {carbon.breakdown.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={["#22c55e","#16a34a","#84cc16","#0ea5e9","#f59e0b","#ef4444","#a78bfa"][idx % 7]} />
              ))}
            </Pie>
            <RTooltip formatter={(val, name) => [`${val}%`, name]} contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Global Water Usage (World Bank) */}
      <Card title="Global Water Withdrawals (World Bank)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={globalWater.worldSeries} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={24} />
            <YAxis tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
            <RTooltip formatter={(v) => [`${Number(v).toFixed(1)} B m³`, 'Withdrawals']} contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
            <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Top 10 Countries – Latest Withdrawals" className="wide tall">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart layout="vertical" data={globalWater.topCountries} margin={{ top: 10, right: 16, bottom: 10, left: 0 }} barCategoryGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
            <RTooltip formatter={(v) => [`${Number(v).toFixed(1)} B m³`, 'Withdrawals']} contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
            <Bar dataKey="value" fill="var(--brand)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* EPA iWASTE Overview */}
      <Card title="EPA iWASTE Overview">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={iwaste.categoryCounts} margin={{ top: 10, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="category" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
            <RTooltip contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
            <Bar dataKey="count" fill="var(--brand)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* USGS Water */}
      <Card title={`River Discharge (USGS ${siteId})`}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={waterShort} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="time" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={48} />
            <YAxis tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
            <RTooltip labelFormatter={(v) => new Date(v).toLocaleString()} contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
            <Line type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
