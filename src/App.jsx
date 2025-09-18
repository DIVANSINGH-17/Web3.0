import { useMemo, useState } from 'react'
import './App.css'
import NavBar from './components/NavBar'

const SECTIONS = [
  { id: 'carbon', title: 'Carbon Footprint', content: 'Understand emissions from travel, energy use, and food choices. Learn where your biggest impacts are and how to shrink them.' },
  { id: 'water', title: 'Water Use', content: 'Track your daily water consumption at home and outdoors. Discover easy ways to save water without sacrificing comfort.' },
  { id: 'waste', title: 'Waste', content: 'Reduce, reuse, and recycle with confidence. See how your household waste impacts the planet and how to cut it down.' },
  { id: 'habits', title: 'Daily Habits', content: 'Small actions add up. Build momentum with simple, repeatable wins you can adopt right now.' },
  { id: 'commute', title: 'Commute', content: 'Measure the impact of your daily travel. Compare options like walking, cycling, transit, and EV driving.' },
  { id: 'home-water', title: 'Home Water', content: 'Find and fix hidden water waste—from leaky taps to inefficient fixtures—to lower your bill and footprint.' },
  { id: 'community', title: 'Local Groups', content: 'Join nearby sustainability groups to learn, act, and stay motivated with others on the same journey.' },
  { id: 'challenges', title: 'Challenges', content: 'Stay engaged with weekly goals and friendly challenges that reward consistent, positive habits.' },
  { id: 'cleanups', title: 'Cleanups', content: 'Find cleanup events near you and make a direct impact in your community.' },
]

function App() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SECTIONS
    return SECTIONS.filter((s) => (s.title + ' ' + s.content).toLowerCase().includes(q))
  }, [query])

  return (
    <>
      <NavBar query={query} onQueryChange={setQuery} />

      <main className="container">
        <header className="hero">
          <h1>Earth Balance Tracker</h1>
          <p className="muted">Know your impact. Take action with confidence.</p>
        </header>

        <div className="results-bar">
          {query
            ? `Showing ${filtered.length} of ${SECTIONS.length} results for "${query}"`
            : 'Explore key areas to balance your footprint'}
        </div>

        {filtered.map((s) => (
          <section key={s.id} id={s.id} data-section="" data-title={s.title} className="section">
            <h2>{s.title}</h2>
            <p>{s.content}</p>
            <a className="cta" href="#root">Back to top</a>
          </section>
        ))}

        {filtered.length === 0 && (
          <p className="muted">No matches. Try searching for “water”, “waste”, or “commute”.</p>
        )}
      </main>

      <footer className="site-footer">
        <p className="muted">© {new Date().getFullYear()} Earth Balance. Built with Vite + React.</p>
      </footer>
    </>
  )
}

export default App
