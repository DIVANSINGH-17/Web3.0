import { useMemo, useState } from 'react'
import './App.css'
import NavBar from './components/NavBar'
import DataDashboard from './components/DataDashboard'
import { CommuteCalculator, HomeWaterSavings, HabitsTracker } from './components/SectionWidgets'

const SECTIONS = [
  { id: 'dashboard', title: 'Dashboard', content: 'Live data visualizations for water, carbon, and waste from EPA and USGS APIs.' },
  { id: 'habits', title: 'Daily Habits', content: 'Small actions add up. Build momentum with simple, repeatable wins you can adopt right now.' },
  { id: 'commute', title: 'Commute Calculator', content: 'Calculate the carbon impact of your daily travel. Compare walking, cycling, transit, and driving options.' },
  { id: 'home-water', title: 'Home Water Savings', content: 'Find and fix hidden water waste—from leaky taps to inefficient fixtures—to lower your bill and footprint.' },
]

function App() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SECTIONS
    return SECTIONS.filter((s) => (s.title + ' ' + s.content).toLowerCase().includes(q))
  }, [query])

  const renderWidget = (id) => {
    switch (id) {
      case 'commute': return <CommuteCalculator />
      case 'home-water': return <HomeWaterSavings />
      case 'habits': return <HabitsTracker />
      default: return null
    }
  }

  return (
    <>
      <NavBar query={query} onQueryChange={setQuery} />

      <main className="container">
        <header className="hero">
          <h1>GreenPulse</h1>
          <p className="muted">Know your impact. Take action with confidence.</p>
        </header>

        {/* Dashboard section */}
        <section id="dashboard" data-section="" data-title="Dashboard" className="section">
          <h2>Data Visualizations</h2>
          <p className="muted">Live USGS water data plus mock carbon and waste insights.</p>
          <div className="dashboard-wrap">
            <DataDashboard />
          </div>
        </section>

        <div className="results-bar">
          {query
            ? `Showing ${filtered.length} of ${SECTIONS.length} results for "${query}"`
            : 'Explore key areas to balance your footprint'}
        </div>

        {filtered.filter(s => s.id !== 'dashboard').map((s) => (
          <section key={s.id} id={s.id} data-section="" data-title={s.title} className="section">
            <h2>{s.title}</h2>
            <p>{s.content}</p>
            {renderWidget(s.id)}
            <a className="cta" href="#dashboard">Back to dashboard</a>
          </section>
        ))}

        {filtered.length === 0 && (
          <p className="muted">No matches. Try searching for “water”, “waste”, or “commute”.</p>
        )}
      </main>

      <footer className="site-footer">
        <p className="muted">© {new Date().getFullYear()} GreenPulse. Built with Vite + React.</p>
      </footer>
    </>
  )
}

export default App
