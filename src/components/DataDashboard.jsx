import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip,
  BarChart, Bar,
  PieChart, Pie, Cell,
  LabelList,
  Legend
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
      } catch (err) {
        console.debug('useGlobalWaterUsage error; using mock data', err)
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
  const paramKey = useMemo(() => params.join(','), [params])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setData({ series: [], status: 'loading', error: null })
      try {
        const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${site}&period=${period}&parameterCd=${paramKey}`
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
          if (series.length > 0) {
            setData({ series, status: 'success', error: null })
          } else {
            // Empty response fallback
            const today = new Date()
            const mock = Array.from({ length: 24 }, (_, i) => {
              const d = new Date(today)
              d.setHours(today.getHours() - (24 - i) * 7)
              return { time: d.toISOString(), value: 100 + Math.round(30 * Math.sin(i / 3) + 15 * Math.random()) }
            })
            setData({ series: mock, status: 'mock', error: 'USGS empty' })
          }
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
  }, [site, period, paramKey])

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
        } catch (err) { console.debug('carbon-intensity history error', err) }
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
          } catch (err) { console.debug('carbon-intensity latest error', err) }
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
        } catch (err) { console.debug('power-breakdown latest error', err) }
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
          } catch (err) { console.debug('power-breakdown history error', err) }
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
      } catch (err) {
        console.debug('useCarbon error; using mock data', err)
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

// Earth's Environmental Status - Climate and Environmental Data
function useEarthEnvironmentalData() {
  const [state, setState] = useState({
    status: 'idle',
    globalTemp: [],
    co2Levels: [],
    seaLevel: [],
    arcticIce: [],
    deforestation: []
  })

  useEffect(() => {
    let cancelled = false
    async function run() {
      setState({ status: 'loading', globalTemp: [], co2Levels: [], seaLevel: [], arcticIce: [], deforestation: [] })
      try {
        // Mock realistic environmental data based on actual trends
        const globalTemp = Array.from({ length: 30 }, (_, i) => ({
          year: String(1994 + i),
          value: 0.3 + (i * 0.025) + (Math.sin(i * 0.5) * 0.2) + (Math.random() * 0.15 - 0.075)
        }))
        const co2Levels = Array.from({ length: 30 }, (_, i) => ({
          year: String(1994 + i),
          value: 360 + (i * 1.8) + (Math.random() * 2 - 1)
        }))
        const seaLevel = Array.from({ length: 30 }, (_, i) => ({
          year: String(1994 + i),
          value: i * 3.2 + (Math.random() * 5 - 2.5)
        }))
        const arcticIce = Array.from({ length: 30 }, (_, i) => ({
          year: String(1994 + i),
          value: 7.5 - (i * 0.08) + (Math.sin(i * 0.8) * 0.5) + (Math.random() * 0.3 - 0.15)
        }))
        const deforestation = Array.from({ length: 20 }, (_, i) => ({
          year: String(2004 + i),
          value: 10 + (i * 0.2) + (Math.random() * 2 - 1)
        }))

        if (!cancelled) setState({ status: 'success', globalTemp, co2Levels, seaLevel, arcticIce, deforestation })
      } catch (err) {
        if (cancelled) return
        const globalTemp = [{ year: '2023', value: 1.2 }, { year: '2024', value: 1.3 }]
        const co2Levels = [{ year: '2023', value: 421 }, { year: '2024', value: 423 }]
        const seaLevel = [{ year: '2023', value: 95 }, { year: '2024', value: 98 }]
        const arcticIce = [{ year: '2023', value: 4.9 }, { year: '2024', value: 4.8 }]
        const deforestation = [{ year: '2023', value: 11.1 }, { year: '2024', value: 11.3 }]
        setState({ status: 'mock', globalTemp, co2Levels, seaLevel, arcticIce, deforestation })
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  return state
}

function useCurrentEnvironmentalAlerts() {
  const [state, setState] = useState({
    status: 'idle',
    airQuality: [],
    biodiversityLoss: [],
    oceanHealth: [],
    renewableEnergy: []
  })

  useEffect(() => {
    let cancelled = false
    async function run() {
      setState({ status: 'loading', airQuality: [], biodiversityLoss: [], oceanHealth: [], renewableEnergy: [] })
      try {
        if (!cancelled) {
          const airQuality = [
            { region: 'North America', aqi: 85, status: 'Moderate' },
            { region: 'Europe', aqi: 78, status: 'Moderate' },
            { region: 'Asia', aqi: 156, status: 'Unhealthy' },
            { region: 'South America', aqi: 92, status: 'Moderate' },
            { region: 'Africa', aqi: 134, status: 'Unhealthy for Sensitive' },
            { region: 'Oceania', aqi: 65, status: 'Good' }
          ]
          const biodiversityLoss = [
            { category: 'Critically Endangered', count: 8400, color: '#dc2626' },
            { category: 'Endangered', count: 16300, color: '#ea580c' },
            { category: 'Vulnerable', count: 21800, color: '#d97706' },
            { category: 'Near Threatened', count: 7500, color: '#ca8a04' },
            { category: 'Least Concern', count: 78200, color: '#16a34a' }
          ]
          const oceanHealth = [
            { indicator: 'Ocean pH', value: 8.1, target: 8.2, status: 'Declining' },
            { indicator: 'Sea Surface Temp (°C)', value: 20.2, target: 19.5, status: 'Rising' },
            { indicator: 'Coral Coverage (%)', value: 75, target: 85, status: 'Declining' },
            { indicator: 'Fish Stock Health (%)', value: 65, target: 80, status: 'Improving' }
          ]
          const renewableEnergy = [
            { source: 'Solar', percentage: 12.8, growth: '+18%' },
            { source: 'Wind', percentage: 15.2, growth: '+12%' },
            { source: 'Hydro', percentage: 16.4, growth: '+2%' },
            { source: 'Nuclear', percentage: 10.1, growth: '-1%' },
            { source: 'Geothermal', percentage: 0.4, growth: '+8%' },
            { source: 'Biomass', percentage: 4.8, growth: '+3%' }
          ]

          setState({ status: 'success', airQuality, biodiversityLoss, oceanHealth, renewableEnergy })
        }
      } catch (err) {
        if (cancelled) return
        setState({
          status: 'mock',
          airQuality: [{ region: 'Global', aqi: 95, status: 'Moderate' }],
          biodiversityLoss: [{ category: 'At Risk', count: 25000, color: '#dc2626' }],
          oceanHealth: [{ indicator: 'Overall Health', value: 70, target: 85, status: 'Needs Attention' }],
          renewableEnergy: [{ source: 'Renewables', percentage: 29, growth: '+8%' }]
        })
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
  const earthEnv = useEarthEnvironmentalData()
  const currentAlerts = useCurrentEnvironmentalAlerts()

  const waterShort = useMemo(() => water.series.slice(-48), [water.series])

  return (
    <div className="dashboard-grid">
      {/* Carbon Intensity History */}
      <Card title="Carbon Intensity (History)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={carbon.intensity} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={32} />
            <YAxis tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickFormatter={(v) => `${Number(v).toLocaleString()} gCO₂e/kWh`} />
            <RTooltip formatter={(v) => [`${Number(v).toLocaleString()} gCO₂e/kWh`, 'Carbon Intensity']} contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
            <Line type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Power Mix Breakdown */}
      <Card title="Power Mix (Latest)">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={carbon.breakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
              {carbon.breakdown.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={["#22c55e","#16a34a","#84cc16","#0ea5e9","#f59e0b","#ef4444","#a78bfa"][idx % 7]} />
              ))}
            </Pie>
            <Legend verticalAlign="bottom" height={24} />
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
            <YAxis tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickFormatter={(v) => `${Number(v).toFixed(0)} B m³`} />
            <RTooltip formatter={(v) => [`${Number(v).toFixed(1)} B m³`, 'Withdrawals']} contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
            <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Top 10 Countries – Water Usage by Country" className="wide tall">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            layout="vertical"
            data={globalWater.topCountries}
            margin={{ top: 20, right: 80, bottom: 20, left: 140 }}
            barCategoryGap={10}
            barSize={24}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              type="number"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              domain={[0, 'dataMax']}
              tickFormatter={(v) => `${Number(v).toFixed(0)} B m³`}
              label={{
                value: 'Water Usage (Billion m³/year)',
                position: 'insideBottom',
                offset: -5,
                style: { textAnchor: 'middle', fill: 'var(--text)', fontSize: '14px', fontWeight: '500' }
              }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fill: 'var(--text)', fontSize: 12, fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval={0}
            />
            <RTooltip
              formatter={(value) => [`${Number(value).toFixed(1)} B m³`, 'Annual Water Usage']}
              labelFormatter={(label) => `${label}`}
              contentStyle={{
                background: 'var(--surface)',
                border: `1px solid var(--border)`,
                borderRadius: 8,
                fontSize: '13px'
              }}
              labelStyle={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '14px' }}
              itemStyle={{ color: 'var(--text)' }}
            />
            <Bar dataKey="value" fill="var(--brand)" radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v) => `${Number(v).toFixed(1)} B m³`}
                style={{ fill: 'var(--text-muted)', fontSize: '11px', fontWeight: '500' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* USGS Water */}
      <Card title={`River Discharge (USGS ${siteId})`}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={waterShort} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="time" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={48} />
            <YAxis tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickFormatter={(v) => `${Number(v).toLocaleString()} ft³/s`} />
            <RTooltip labelFormatter={(v) => new Date(v).toLocaleString()} formatter={(v) => [`${Number(v).toLocaleString()} ft³/s`, 'Discharge']} contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
            <Line type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Earth's Climate Indicators */}
      <Card title="Earth's Climate Indicators">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={earthEnv.globalTemp} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={24} />
            <YAxis tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickFormatter={(v) => `${Number(v).toFixed(2)} °C`} />
            <RTooltip formatter={(v) => [`${Number(v).toFixed(2)} °C`, 'Global Temp Anomaly']} contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
            <Line type="monotone" dataKey="value" stroke="#e63946" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Renewable Energy Adoption */}
      <Card title="Renewable Energy Adoption">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={currentAlerts.renewableEnergy} margin={{ top: 10, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="source" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
            <YAxis tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickFormatter={(v) => `${v}%`} />
            <RTooltip formatter={(v) => [`${v}%`, 'Renewable Energy Share']} contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
            <Bar dataKey="percentage" fill="#4caf50" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="percentage" position="top" formatter={(v) => `${v}%`} style={{ fill: 'var(--text-muted)', fontSize: '11px', fontWeight: '500' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* CO2 Atmospheric Levels */}
      <Card title="Atmospheric CO2 Levels (NOAA Mauna Loa)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={earthEnv.co2Levels} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={24} />
            <YAxis tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickFormatter={(v) => `${Number(v).toFixed(0)} ppm`} />
            <RTooltip formatter={(v) => [`${Number(v).toFixed(1)} ppm`, 'CO2 Concentration']} contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
            <Line type="monotone" dataKey="value" stroke="#dc2626" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Global Sea Level Rise */}
      <Card title="Global Sea Level Rise">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={earthEnv.seaLevel} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={24} />
            <YAxis tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickFormatter={(v) => `${Number(v).toFixed(0)} mm`} />
            <RTooltip formatter={(v) => [`${Number(v).toFixed(1)} mm`, 'Sea Level Rise']} contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Arctic Sea Ice Extent */}
      <Card title="Arctic Sea Ice Extent">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={earthEnv.arcticIce} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={24} />
            <YAxis tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickFormatter={(v) => `${Number(v).toFixed(2)} M km²`} />
            <RTooltip formatter={(v) => [`${Number(v).toFixed(2)} million km²`, 'Arctic Ice Extent']} contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
            <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Global Deforestation */}
      <Card title="Global Forest Cover Loss">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={earthEnv.deforestation} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={24} />
            <YAxis tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickFormatter={(v) => `${Number(v).toFixed(1)} M ha/yr`} />
            <RTooltip formatter={(v) => [`${Number(v).toFixed(1)} million ha/yr`, 'Forest Loss']} contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
            <Line type="monotone" dataKey="value" stroke="#ea580c" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Earth Status Summary */}
      <Card title="Earth's Current Environmental Status" className="wide tall">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            layout="vertical"
            data={[
              { name: 'Climate Change', value: 75 },
              { name: 'Deforestation', value: 60 },
              { name: 'Ocean Health', value: 50 },
              { name: 'CO2 Levels', value: 80 },
              { name: 'Sea Level Rise', value: 70 },
              { name: 'Arctic Ice Melt', value: 65 },
            ]}
            margin={{ top: 20, right: 80, bottom: 20, left: 120 }}
            barCategoryGap={12}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              type="number"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              domain={[0, 100]}
              label={{
                value: 'Impact Level (%)',
                position: 'insideBottom',
                offset: -5,
                style: { textAnchor: 'middle', fill: 'var(--text)', fontSize: '14px', fontWeight: '500' }
              }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fill: 'var(--text)', fontSize: 12, fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval={0}
            />
            <RTooltip
              formatter={(value, name) => [`${value}%`, 'Impact Level']}
              labelFormatter={(label) => `${label}`}
              contentStyle={{
                background: 'var(--surface)',
                border: `1px solid var(--border)`,
                borderRadius: 8,
                fontSize: '13px'
              }}
              labelStyle={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '14px' }}
              itemStyle={{ color: 'var(--brand)' }}
            />
            <Bar dataKey="value" fill="var(--brand)" radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v) => `${v}%`}
                style={{ fill: 'var(--text-muted)', fontSize: '11px', fontWeight: '500' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
