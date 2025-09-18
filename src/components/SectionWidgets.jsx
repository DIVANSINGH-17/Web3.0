import { useMemo, useState } from 'react'
import useLocalStorage from './useLocalStorage'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts'

// Colors aligned with theme
const COLORS = ['#22c55e', '#16a34a', '#84cc16', '#0ea5e9', '#f59e0b']

// 1) Commute Calculator
export function CommuteCalculator() {
  const [unit, setUnit] = useLocalStorage('commute.unit', 'km') // 'km' | 'mi'
  const [distance, setDistance] = useLocalStorage('commute.distance', 10)
  const [tripsPerWeek, setTripsPerWeek] = useLocalStorage('commute.tripsPerWeek', 10) // 2 trips per day * 5 days

  // kg CO2e per km factors (approx.):
  // Source-like approximations: Car (petrol): 0.192, Bus: 0.105, Train: 0.041, EV: 0.053 (varies by grid), Bike/Walk: 0
  const factorsPerKm = {
    Car: 0.192,
    EV: 0.053,
    Bus: 0.105,
    Train: 0.041,
    Bike: 0,
    Walk: 0,
  }

  const distKm = unit === 'km' ? Math.max(0, Number(distance) || 0) : Math.max(0, Number(distance) || 0) * 1.60934
  const weeklyData = useMemo(() => {
    const oneWay = Math.max(distKm, 0)
    const totalKm = oneWay * Math.max(Number(tripsPerWeek) || 0, 0)
    return Object.entries(factorsPerKm).map(([mode, f]) => ({
      mode,
      kg: +(f * totalKm).toFixed(2),
    }))
  }, [distKm, tripsPerWeek])

  return (
    <div className="widget-card">
      <h3>Commute Impact Calculator</h3>
      <div className="widget-grid">
        <label>
          Distance (one-way)
          <div className="row">
            <input
              type="number"
              min="0"
              max="1000"
              step="0.1"
              value={distance}
              onChange={(e) => setDistance(Math.max(0, parseFloat(e.target.value) || 0))}
            />
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="km">km</option>
              <option value="mi">mi</option>
            </select>
          </div>
        </label>
        <label>
          Trips per week
          <input
            type="number"
            min="0"
            max="50"
            step="1"
            value={tripsPerWeek}
            onChange={(e) => setTripsPerWeek(Math.max(0, parseInt(e.target.value) || 0))}
          />
        </label>
      </div>
      <div className="widget-chart">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weeklyData} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mode" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
            <YAxis tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
            <RTooltip contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
            <Bar dataKey="kg" fill="var(--brand)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 2) Home Water Savings (enhanced with charts and multiple categories)
export function HomeWaterSavings() {
  const [showersPerWeek, setShowersPerWeek] = useLocalStorage('water.showersPerWeek', 7)
  const [minutesPerShower, setMinutesPerShower] = useLocalStorage('water.minutesPerShower', 8)
  const [lowFlow, setLowFlow] = useLocalStorage('water.lowFlow', false)
  const [dishwasherLoads, setDishwasherLoads] = useLocalStorage('water.dishwasherLoads', 4)
  const [washingLoads, setWashingLoads] = useLocalStorage('water.washingLoads', 3)
  const [toiletFlushes, setToiletFlushes] = useLocalStorage('water.toiletFlushes', 35)
  const [lowFlowToilet, setLowFlowToilet] = useLocalStorage('water.lowFlowToilet', false)

  // Water usage calculations (liters per week)
  const showerFlow = lowFlow ? 7.0 : 9.5 // L/min
  const showerWater = Math.max(0, Number(showersPerWeek) || 0) * Math.max(0, Number(minutesPerShower) || 0) * showerFlow

  const dishwasherWater = Math.max(0, Number(dishwasherLoads) || 0) * 15 // ~15L per load for efficient dishwasher
  const washingWater = Math.max(0, Number(washingLoads) || 0) * 60 // ~60L per load

  const toiletFlow = lowFlowToilet ? 4.8 : 9.5 // L/flush
  const toiletWater = Math.max(0, Number(toiletFlushes) || 0) * toiletFlow

  // Total current usage
  const totalCurrent = showerWater + dishwasherWater + washingWater + toiletWater

  // Savings calculations
  const showerSaving = lowFlow ? 0 : Math.max(0, Number(showersPerWeek) || 0) * Math.max(0, Number(minutesPerShower) || 0) * (9.5 - 7.0)
  const toiletSaving = lowFlowToilet ? 0 : Math.max(0, Number(toiletFlushes) || 0) * (9.5 - 4.8)
  const totalSaving = showerSaving + toiletSaving

  // Data for charts
  const usageData = [
    { category: 'Showers', current: showerWater, potential: showerWater - showerSaving },
    { category: 'Toilets', current: toiletWater, potential: toiletWater - toiletSaving },
    { category: 'Dishwasher', current: dishwasherWater, potential: dishwasherWater },
    { category: 'Washing', current: washingWater, potential: washingWater },
  ]

  const savingsData = [
    { name: 'Current Usage', value: totalCurrent - totalSaving, color: '#ef4444' },
    { name: 'Potential Savings', value: totalSaving, color: '#22c55e' }
  ]

  return (
    <div className="widget-card">
      <h3>Home Water Savings Calculator</h3>

      {/* Input Controls */}
      <div className="widget-grid" style={{ marginBottom: '1rem' }}>
        <label>
          Showers per week
          <input
            type="number"
            min="0"
            max="21"
            step="1"
            value={showersPerWeek}
            onChange={(e) => setShowersPerWeek(Math.max(0, parseInt(e.target.value) || 0))}
          />
        </label>
        <label>
          Minutes per shower
          <input
            type="number"
            min="0"
            max="60"
            step="1"
            value={minutesPerShower}
            onChange={(e) => setMinutesPerShower(Math.max(0, parseInt(e.target.value) || 0))}
          />
        </label>
        <label>
          Dishwasher loads/week
          <input
            type="number"
            min="0"
            max="14"
            step="1"
            value={dishwasherLoads}
            onChange={(e) => setDishwasherLoads(Math.max(0, parseInt(e.target.value) || 0))}
          />
        </label>
        <label>
          Washing loads/week
          <input
            type="number"
            min="0"
            max="14"
            step="1"
            value={washingLoads}
            onChange={(e) => setWashingLoads(Math.max(0, parseInt(e.target.value) || 0))}
          />
        </label>
        <label>
          Toilet flushes/week
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={toiletFlushes}
            onChange={(e) => setToiletFlushes(Math.max(0, parseInt(e.target.value) || 0))}
          />
        </label>
      </div>

      {/* Efficiency Options */}
      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0', color: 'var(--brand)' }}>
          Water-Saving Options
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="row">
            <input type="checkbox" checked={lowFlow} onChange={(e) => setLowFlow(e.target.checked)} />
            <span>Low-flow showerhead (7 L/min vs 9.5 L/min)</span>
          </label>
          <label className="row">
            <input type="checkbox" checked={lowFlowToilet} onChange={(e) => setLowFlowToilet(e.target.checked)} />
            <span>Low-flow toilet (4.8 L/flush vs 9.5 L/flush)</span>
          </label>
        </div>
      </div>

      {/* Usage Breakdown Chart */}
      <div className="widget-chart" style={{ marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>Weekly Water Usage by Category</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={usageData} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="category" tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
            <YAxis tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
            <RTooltip
              contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }}
              labelStyle={{ color: 'var(--text)' }}
              itemStyle={{ color: 'var(--text)' }}
              formatter={(value, name) => [`${value.toFixed(0)} L`, name]}
            />
            <Bar dataKey="current" fill="#94a3b8" radius={[2, 2, 0, 0]} />
            <Bar dataKey="potential" fill="var(--brand)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Savings Potential Pie Chart */}
      {totalSaving > 0 && (
        <div className="widget-chart" style={{ marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>Savings Potential</h4>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={savingsData}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={3}
              >
                {savingsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RTooltip
                formatter={(val, name) => [`${val.toFixed(0)} L/week`, name]}
                contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }}
                labelStyle={{ color: 'var(--text)' }}
                itemStyle={{ color: 'var(--text)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '0.75rem',
        padding: '0.75rem',
        background: 'var(--surface-2)',
        borderRadius: '0.5rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--brand)' }}>
            {totalCurrent.toFixed(0)}L
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Usage/Week</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#22c55e' }}>
            {totalSaving.toFixed(0)}L
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Potential Savings/Week</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#0ea5e9' }}>
            {(totalSaving * 52).toFixed(0)}L
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Annual Savings</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#f59e0b' }}>
            {totalCurrent > 0 ? ((totalSaving / totalCurrent) * 100).toFixed(0) : 0}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reduction Potential</div>
        </div>
      </div>

      {/* Tips Section */}
      <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: '0.5rem' }}>
        <h4 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0', color: 'var(--brand)' }}>💡 Water Saving Tips</h4>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', lineHeight: '1.4' }}>
          <li>Fix leaky faucets - a dripping tap can waste 15L+ per day</li>
          <li>Run dishwasher and washing machine only with full loads</li>
          <li>Consider collecting shower warm-up water for plants</li>
          <li>Install aerators on taps to reduce flow without losing pressure</li>
        </ul>
      </div>
    </div>
  )
}

// 3) Waste Planner (simple split visual)
export function WastePlanner() {
  const [recycle, setRecycle] = useLocalStorage('waste.recycle', 45)
  const [compost, setCompost] = useLocalStorage('waste.compost', 15)
  const landfill = Math.max(0, 100 - Number(recycle) - Number(compost))
  const data = [
    { name: 'Recycled', value: Math.max(0, Number(recycle)) },
    { name: 'Compost', value: Math.max(0, Number(compost)) },
    { name: 'Landfill', value: Math.max(0, landfill) },
  ]

  return (
    <div className="widget-card">
      <h3>Waste Planner</h3>
      <div className="widget-grid">
        <label>
          Recycled (%)
          <input type="range" min="0" max="100" value={recycle} onChange={(e) => setRecycle(e.target.value)} />
        </label>
        <label>
          Compost (%)
          <input type="range" min="0" max="100" value={compost} onChange={(e) => setCompost(e.target.value)} />
        </label>
      </div>
      <div className="widget-chart">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
              {data.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <RTooltip formatter={(val, name) => [`${val}%`, name]} contentStyle={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 8 }} labelStyle={{ color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 4) Daily Habits (enhanced tracker)
export function HabitsTracker() {
  const [habits, setHabits] = useLocalStorage('habits.items', [
    { id: 'bring-bottle', name: 'Bring a reusable bottle', category: 'Reduce Waste', streak: 0, done: false, impact: 'Saves 1 plastic bottle' },
    { id: 'turn-off-lights', name: 'Turn off lights when leaving', category: 'Save Energy', streak: 0, done: false, impact: 'Reduces 0.5kg CO₂' },
    { id: 'shorter-shower', name: 'Take shorter showers (5 min)', category: 'Save Water', streak: 0, done: false, impact: 'Saves 30L water' },
    { id: 'walk-bike', name: 'Walk or bike for short trips', category: 'Transport', streak: 0, done: false, impact: 'Avoids car emissions' },
  ])

  const [newHabit, setNewHabit] = useState('')
  const [newCategory, setNewCategory] = useState('Save Energy')
  const [newImpact, setNewImpact] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const categories = ['Save Energy', 'Save Water', 'Reduce Waste', 'Transport', 'Food', 'Other']

  const toggle = (id) => {
    setHabits(habits.map(h => {
      if (h.id === id) {
        const newDone = !h.done
        return {
          ...h,
          done: newDone,
          streak: newDone ? h.streak + 1 : Math.max(0, h.streak - 1)
        }
      }
      return h
    }))
  }

  const deleteHabit = (id) => {
    setHabits(habits.filter(h => h.id !== id))
  }

  const addHabit = () => {
    if (!newHabit.trim()) return
    const habit = {
      id: `${Date.now()}`,
      name: newHabit.trim(),
      category: newCategory,
      impact: newImpact.trim() || 'Positive impact',
      streak: 0,
      done: false
    }
    setHabits([...habits, habit])
    setNewHabit('')
    setNewImpact('')
    setShowAddForm(false)
  }

  const resetDaily = () => {
    setHabits(habits.map(h => ({ ...h, done: false })))
  }

  const completedToday = habits.filter(h => h.done).length
  const totalHabits = habits.length
  const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0

  const groupedHabits = habits.reduce((acc, habit) => {
    if (!acc[habit.category]) acc[habit.category] = []
    acc[habit.category].push(habit)
    return acc
  }, {})

  return (
    <div className="widget-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Daily Habits</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="completion-badge" style={{
            background: `linear-gradient(90deg, var(--brand) ${completionRate}%, var(--border) ${completionRate}%)`,
            padding: '0.25rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: '600',
            color: completionRate > 50 ? 'white' : 'var(--text)'
          }}>
            {completedToday}/{totalHabits} ({completionRate}%)
          </span>
          <button onClick={resetDaily} style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>Reset Day</button>
        </div>
      </div>

      {Object.entries(groupedHabits).map(([category, categoryHabits]) => (
        <div key={category} style={{ marginBottom: '1rem' }}>
          <h4 style={{
            fontSize: '0.9rem',
            color: 'var(--brand)',
            margin: '0 0 0.5rem 0',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '0.25rem'
          }}>
            {category}
          </h4>
          <ul className="checklist" style={{ marginLeft: '0.5rem' }}>
            {categoryHabits.map(h => (
              <li key={h.id} style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className={`row ${h.done ? 'done' : ''}`} style={{ flex: 1, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={h.done}
                      onChange={() => toggle(h.id)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <div>
                      <span style={{ fontWeight: h.done ? '400' : '500' }}>{h.name}</span>
                      {h.streak > 0 && (
                        <span style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.8rem',
                          color: 'var(--brand)',
                          fontWeight: '600'
                        }}>
                          🔥 {h.streak}
                        </span>
                      )}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        {h.impact}
                      </div>
                    </div>
                  </label>
                  <button
                    onClick={() => deleteHabit(h.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      fontSize: '0.8rem'
                    }}
                    title="Delete habit"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {!showAddForm ? (
        <button onClick={() => setShowAddForm(true)} style={{ width: '100%', marginTop: '0.5rem' }}>
          + Add New Habit
        </button>
      ) : (
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          marginTop: '0.5rem',
          background: 'var(--surface-2)'
        }}>
          <div className="widget-grid" style={{ gap: '0.5rem' }}>
            <label>
              Habit Name
              <input
                type="text"
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                placeholder="e.g., Use reusable bags"
                autoFocus
              />
            </label>
            <label>
              Category
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
            <label>
              Impact (optional)
              <input
                type="text"
                value={newImpact}
                onChange={(e) => setNewImpact(e.target.value)}
                placeholder="e.g., Saves plastic waste"
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button onClick={addHabit} disabled={!newHabit.trim()}>Add Habit</button>
            <button onClick={() => setShowAddForm(false)} style={{ background: 'var(--border)' }}>Cancel</button>
          </div>
        </div>
      )}

      {totalHabits > 0 && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'var(--surface-2)',
          borderRadius: '0.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {completionRate === 100 ?
              "🎉 Perfect day! All habits completed!" :
              completionRate >= 75 ?
              "💪 Great job! You're almost there!" :
              completionRate >= 50 ?
              "👍 Good progress! Keep it up!" :
              "🌱 Every small action counts!"
            }
          </div>
        </div>
      )}
    </div>
  )
}

// 5) Challenges (lightweight weekly goals)
export function ChallengesBoard() {
  const [items, setItems] = useLocalStorage('challenges.items', [
    { id: 'walk-10k', name: 'Walk or bike 10 km', status: 'todo' },
    { id: 'meatless-2', name: '2 meatless meals', status: 'todo' },
    { id: 'bus-commute', name: 'Commute by bus once', status: 'todo' },
  ])

  const cycle = (id) => setItems(items.map(x => x.id === id ? { ...x, status: x.status === 'todo' ? 'doing' : x.status === 'doing' ? 'done' : 'todo' } : x))
  const add = () => {
    const name = prompt('New challenge?')
    if (!name) return
    setItems([...items, { id: `${Date.now()}`, name, status: 'todo' }])
  }

  return (
    <div className="widget-card">
      <h3>Weekly Challenges</h3>
      <ul className="challenges">
        {items.map(x => (
          <li key={x.id}>
            <button className={`pill ${x.status}`} onClick={() => cycle(x.id)}>{x.name} — {x.status}</button>
          </li>
        ))}
      </ul>
      <button onClick={add}>Add challenge</button>
    </div>
  )
}

// 6) Cleanups (simple event list)
export function CleanupsFinder() {
  const [events, setEvents] = useLocalStorage('cleanups.events', [
    { id: '1', title: 'Park cleanup', date: '2025-10-05', where: 'Riverside Park', saved: false },
    { id: '2', title: 'Beach sweep', date: '2025-10-12', where: 'Sandy Beach', saved: false },
  ])
  const toggle = (id) => setEvents(events.map(e => e.id === id ? { ...e, saved: !e.saved } : e))
  const add = () => {
    const title = prompt('Event title?')
    if (!title) return
    const date = prompt('Date (YYYY-MM-DD)?') || ''
    const where = prompt('Location?') || ''
    setEvents([...events, { id: `${Date.now()}`, title, date, where, saved: false }])
  }

  return (
    <div className="widget-card">
      <h3>Cleanups Near You</h3>
      <ul className="events">
        {events.map(e => (
          <li key={e.id} className="event">
            <div className="event-main">
              <strong>{e.title}</strong>
              <span className="muted">{e.date} • {e.where}</span>
            </div>
            <button className={`pill ${e.saved ? 'done' : 'todo'}`} onClick={() => toggle(e.id)}>
              {e.saved ? 'Saved' : 'Save'}
            </button>
          </li>
        ))}
      </ul>
      <button onClick={add}>Add event</button>
    </div>
  )
}

// 7) Local Groups (simple directory)
export function LocalGroupsFinder() {
  const [groups, setGroups] = useLocalStorage('groups.items', [
    { id: 'g1', name: 'Green Riders', city: 'Springfield', saved: false },
    { id: 'g2', name: 'Watershed Watch', city: 'Rivertown', saved: false },
  ])
  const [q, setQ] = useState('')
  const filtered = groups.filter(g => (g.name + ' ' + g.city).toLowerCase().includes(q.toLowerCase()))
  const toggle = (id) => setGroups(groups.map(g => g.id === id ? { ...g, saved: !g.saved } : g))
  const add = () => {
    const name = prompt('Group name?')
    if (!name) return
    const city = prompt('City?') || ''
    setGroups([...groups, { id: `${Date.now()}`, name, city, saved: false }])
  }

  return (
    <div className="widget-card">
      <h3>Local Groups</h3>
      <div className="widget-grid">
        <label>
          Search
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or city" />
        </label>
      </div>
      <ul className="events">
        {filtered.map(g => (
          <li key={g.id} className="event">
            <div className="event-main">
              <strong>{g.name}</strong>
              <span className="muted">{g.city}</span>
            </div>
            <button className={`pill ${g.saved ? 'done' : 'todo'}`} onClick={() => toggle(g.id)}>
              {g.saved ? 'Saved' : 'Save'}
            </button>
          </li>
        ))}
      </ul>
      <button onClick={add}>Add group</button>
    </div>
  )
}
