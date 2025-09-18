import { useMemo, useState, useEffect } from 'react'
import useLocalStorage from './useLocalStorage'
import './EcoChallenge.css'

export default function EcoChallenge() {
  const [todayKey] = useState(() => new Date().toISOString().slice(0, 10))
  const [state, setState] = useLocalStorage('eco.quest', { })
  const daily = state[todayKey] || { points: 0, spins: 0, completed: [], spinHistory: [] }

  const maxSpins = 3
  const dailyTarget = 30 // Increased target for better balance
  const spinsLeft = Math.max(0, maxSpins - daily.spins)
  const percent = Math.min(100, Math.round((daily.points / dailyTarget) * 100))

  const challenges = useMemo(() => ([
    { id: 'short-shower', label: '5‑min shower', pts: 8, theme: 'water', difficulty: 'easy' },
    { id: 'reusable-bottle', label: 'Use reusable bottle', pts: 6, theme: 'waste', difficulty: 'easy' },
    { id: 'walk-errand', label: 'Walk a short errand', pts: 7, theme: 'transport', difficulty: 'medium' },
    { id: 'lights-off', label: 'Lights off when leaving', pts: 5, theme: 'energy', difficulty: 'easy' },
    { id: 'meatless', label: 'One meatless meal', pts: 10, theme: 'food', difficulty: 'medium' },
    { id: 'litter-pick', label: 'Pick up 5 litter items', pts: 6, theme: 'community', difficulty: 'easy' },
    { id: 'bike-commute', label: 'Bike to work/school', pts: 12, theme: 'transport', difficulty: 'hard' },
    { id: 'solar-dry', label: 'Air dry clothes', pts: 5, theme: 'energy', difficulty: 'easy' },
    { id: 'compost', label: 'Compost food scraps', pts: 8, theme: 'waste', difficulty: 'medium' },
    { id: 'plant-care', label: 'Water plants with greywater', pts: 9, theme: 'water', difficulty: 'medium' },
  ]), [])

  const [current, setCurrent] = useState(null)
  const [flash, setFlash] = useState('')
  const [streak, setStreak] = useState(0)

  // Calculate streak
  useEffect(() => {
    const calculateStreak = () => {
      let currentStreak = 0
      const today = new Date()

      for (let i = 0; i < 7; i++) { // Check last 7 days
        const checkDate = new Date(today)
        checkDate.setDate(today.getDate() - i)
        const dateKey = checkDate.toISOString().slice(0, 10)
        const dayData = state[dateKey]

        if (dayData && dayData.points >= 15) { // Minimum daily achievement
          currentStreak++
        } else {
          break
        }
      }

      setStreak(currentStreak)
    }

    calculateStreak()
  }, [state])

  const broadcast = (points) => {
    try {
      window.dispatchEvent(new CustomEvent('eco-points-changed', {
        detail: { points: points || 0, streak: streak }
      }))
    } catch {}
  }

  useEffect(() => {
    broadcast(daily.points || 0)
  }, [todayKey, daily.points, streak])

  const update = (updater) => {
    const next = updater(daily)
    setState({ ...state, [todayKey]: next })
    broadcast(next.points || 0)
  }

  // Improved spin logic - prevents immediate duplicates and ensures variety
  const spin = () => {
    if (spinsLeft === 0) return

    // Get available challenges (not completed and not recently spun)
    const recentSpins = daily.spinHistory || []
    const availableChallenges = challenges.filter(challenge =>
      !daily.completed.includes(challenge.id) &&
      !recentSpins.includes(challenge.id)
    )

    // If no variety available, allow any non-completed challenge
    const finalPool = availableChallenges.length > 0 ? availableChallenges :
      challenges.filter(challenge => !daily.completed.includes(challenge.id))

    if (finalPool.length === 0) {
      setFlash('All challenges completed! 🎉')
      setTimeout(() => setFlash(''), 1500)
      return
    }

    // Weight selection by difficulty for balanced gameplay
    const weightedPool = []
    finalPool.forEach(challenge => {
      const weight = challenge.difficulty === 'easy' ? 3 :
                    challenge.difficulty === 'medium' ? 2 : 1
      for (let i = 0; i < weight; i++) {
        weightedPool.push(challenge)
      }
    })

    const pick = weightedPool[Math.floor(Math.random() * weightedPool.length)]
    setCurrent(pick)

    // Update spin history (keep last 2 spins to prevent immediate repeats)
    const newSpinHistory = [pick.id, ...(recentSpins.slice(0, 1))]

    update((d) => ({
      ...d,
      spins: d.spins + 1,
      spinHistory: newSpinHistory
    }))
  }

  const complete = () => {
    if (!current) return
    if (daily.completed.includes(current.id)) {
      setFlash('Already completed today! 🌟')
      setTimeout(() => setFlash(''), 1500)
      return
    }

    // Bonus points for streaks and difficulty
    let bonusPoints = 0
    if (streak > 0) bonusPoints += Math.min(5, streak) // Max 5 bonus points
    if (current.difficulty === 'hard') bonusPoints += 2
    if (current.difficulty === 'medium') bonusPoints += 1

    const totalPoints = current.pts + bonusPoints

    update((d) => ({
      ...d,
      points: d.points + totalPoints,
      completed: [...d.completed, current.id],
    }))

    const message = bonusPoints > 0 ?
      `Nice work! +${totalPoints} pts (${bonusPoints} bonus)` :
      `Nice work! +${totalPoints} pts`

    setFlash(message)
    setTimeout(() => setFlash(''), 1500)
    setCurrent(null)
  }

  const skip = () => {
    setCurrent(null)
  }

  const reset = () => {
    setState({ ...state, [todayKey]: { points: 0, spins: 0, completed: [], spinHistory: [] } })
    setCurrent(null)
    setFlash('')
    broadcast(0)
  }

  // Achievement system
  const getAchievement = () => {
    if (daily.points >= dailyTarget) return { emoji: '🏆', text: 'Daily Goal Achieved!' }
    if (daily.completed.length >= 3) return { emoji: '⭐', text: 'Triple Threat!' }
    if (streak >= 3) return { emoji: '🔥', text: `${streak} Day Streak!` }
    return null
  }

  const achievement = getAchievement()

  return (
    <div className="eco-quest">
      <div className="eco-head">
        <h4>Daily Eco Quest</h4>
        <div className="quest-meta">
          {streak > 0 && <span className="streak">🔥 {streak} day streak</span>}
          <button className="link" onClick={reset}>Reset</button>
        </div>
      </div>

      {achievement && (
        <div className="achievement-banner">
          <span className="achievement-emoji">{achievement.emoji}</span>
          <span className="achievement-text">{achievement.text}</span>
        </div>
      )}

      <div className="eco-progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="bar" style={{ width: percent + '%' }} />
        <div className="meta">
          <span>{daily.points}/{dailyTarget} pts</span>
          <span>{spinsLeft} spins left</span>
        </div>
      </div>

      <div className="eco-actions">
        <button
          onClick={spin}
          disabled={spinsLeft === 0 || daily.completed.length === challenges.length}
          className={spinsLeft === 0 ? 'disabled' : ''}
        >
          {daily.completed.length === challenges.length ?
            'All challenges completed! 🎉' :
            spinsLeft ? 'Spin challenge' : 'Come back tomorrow'
          }
        </button>

        {current && (
          <div className="eco-card">
            <div className={`pill ${current.theme} ${current.difficulty}`}>
              {current.label}
              <span className="difficulty-badge">{current.difficulty}</span>
            </div>
            <div className="sub">
              Worth +{current.pts} pts
              {streak > 0 && <span className="bonus"> (+{Math.min(5, streak)} streak bonus)</span>}
            </div>
            <div className="buttons">
              <button className="primary" onClick={complete}>Completed</button>
              <button onClick={skip}>Skip</button>
            </div>
          </div>
        )}
      </div>

      {flash && <div className="flash">{flash} 🌿</div>}

      {daily.completed.length > 0 && (
        <div className="eco-history">
          <div className="sub">Completed today ({daily.completed.length}/{challenges.length})</div>
          <div className="tags">
            {daily.completed.map(id => {
              const c = challenges.find(x => x.id === id)
              return (
                <span key={id} className={`tag ${c?.theme || ''}`}>
                  {c ? c.label : `Unknown: ${id}`}
                  <span className="tag-points">+{c?.pts || 0}</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {daily.completed.length === challenges.length && (
        <div className="perfect-day">
          🌟 Perfect Day! All challenges completed! 🌟
        </div>
      )}
    </div>
  )
}
