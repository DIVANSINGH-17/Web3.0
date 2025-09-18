import { useMemo, useState } from 'react'
import useLocalStorage from './useLocalStorage'
import './EcoChallenge.css'

export default function EcoChallenge() {
  const [todayKey] = useState(() => new Date().toISOString().slice(0, 10))
  const [state, setState] = useLocalStorage('eco.quest', { })
  const daily = state[todayKey] || { points: 0, spins: 0, completed: [] }

  const maxSpins = 3
  const dailyTarget = 20
  const spinsLeft = Math.max(0, maxSpins - daily.spins)
  const percent = Math.min(100, Math.round((daily.points / dailyTarget) * 100))

  const challenges = useMemo(() => ([
    { id: 'short-shower', label: '5‑min shower', pts: 8, theme: 'water' },
    { id: 'reusable-bottle', label: 'Use reusable bottle', pts: 6, theme: 'waste' },
    { id: 'walk-errand', label: 'Walk a short errand', pts: 7, theme: 'transport' },
    { id: 'lights-off', label: 'Lights off when leaving', pts: 5, theme: 'energy' },
    { id: 'meatless', label: 'One meatless meal', pts: 10, theme: 'food' },
    { id: 'litter-pick', label: 'Pick up 5 litter items', pts: 6, theme: 'community' },
  ]), [])

  const [current, setCurrent] = useState(null)
  const [flash, setFlash] = useState('')

  const update = (updater) => {
    const next = updater(daily)
    setState({ ...state, [todayKey]: next })
  }

  const spin = () => {
    if (spinsLeft === 0) return
    const pick = challenges[Math.floor(Math.random() * challenges.length)]
    setCurrent(pick)
    update((d) => ({ ...d, spins: d.spins + 1 }))
  }

  const complete = () => {
    if (!current) return
    if (daily.completed.includes(current.id)) return
    update((d) => ({
      ...d,
      points: d.points + current.pts,
      completed: [...d.completed, current.id],
    }))
    setFlash('Nice work!')
    setTimeout(() => setFlash(''), 900)
    setCurrent(null)
  }

  const reset = () => setState({ ...state, [todayKey]: { points: 0, spins: 0, completed: [] } })

  return (
    <div className="eco-quest">
      <div className="eco-head">
        <h4>Daily Eco Quest</h4>
        <button className="link" onClick={reset}>Reset</button>
      </div>

      <div className="eco-progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="bar" style={{ width: percent + '%' }} />
        <div className="meta">
          <span>{daily.points}/{dailyTarget} pts</span>
          <span>{spinsLeft} spins left</span>
        </div>
      </div>

      <div className="eco-actions">
        <button onClick={spin} disabled={spinsLeft === 0}>{spinsLeft ? 'Spin challenge' : 'Come back tomorrow'}</button>
        {current && (
          <div className="eco-card">
            <div className={`pill ${current.theme}`}>{current.label}</div>
            <div className="sub">Worth +{current.pts} pts</div>
            <div className="buttons">
              <button className="primary" onClick={complete}>Completed</button>
              <button onClick={() => setCurrent(null)}>Skip</button>
            </div>
          </div>
        )}
      </div>

      {flash && <div className="flash">{flash} 🌿</div>}

      {daily.completed.length > 0 && (
        <div className="eco-history">
          <div className="sub">Completed today</div>
          <div className="tags">
            {daily.completed.map(id => {
              const c = challenges.find(x => x.id === id)
              return <span key={id} className="tag">{c ? c.label : id}</span>
            })}
          </div>
        </div>
      )}
    </div>
  )
}
