import { useEffect, useMemo, useRef, useState } from 'react'
import './NavBar.css'

// Tiny inline SVG icons to avoid extra deps
const Icon = ({ name }) => {
  const icons = {
    carbon: (
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10.012 10.012 0 0 0 12 2Zm0 2a8 8 0 1 1-8 8a8.009 8.009 0 0 1 8-8Zm-.5 3a.5.5 0 0 0-.5.5V12a.5.5 0 0 0 .276.447l4 2a.5.5 0 1 0 .448-.894L12 11.764V7.5a.5.5 0 0 0-.5-.5Z"/></svg>
    ),
    water: (
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2s7 8 7 12a7 7 0 0 1-14 0c0-4 7-12 7-12Zm0 18a5 5 0 0 0 5-5c0-2.23-2.55-6.12-5-8.98C9.55 8.88 7 12.77 7 15a5 5 0 0 0 5 5Z"/></svg>
    ),
    waste: (
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 3h6a1 1 0 0 1 1 1v1h4v2H4V5h4V4a1 1 0 0 1 1-1Zm1 2v0h4V5h-4ZM6 9h12l-1 10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 9Zm4 2v8h2v-8h-2Zm4 0v8h2v-8h-2Zm-8 0v8h2v-8H6Z"/></svg>
    ),
    tips: (
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2h1a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2Zm0 2a5 5 0 0 1 3 9.11a1 1 0 0 0-.41.8V16h-5v-2.09a1 1 0 0 0-.41-.8A5 5 0 0 1 12 4Z"/></svg>
    ),
    community: (
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 12a4 4 0 1 0-4-4a4 4 0 0 0 4 4Zm-7 9a7 7 0 0 1 14 0H5Z"/></svg>
    ),
    search: (
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 2a8 8 0 1 0 4.9 14.4l4.35 4.35l1.41-1.41l-4.35-4.35A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12a6 6 0 0 1 0-12Z"/></svg>
    ),
    menu: (
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z"/></svg>
    ),
    close: (
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29l-1.41 1.42L10.59 13.4L4.29 19.7L2.88 18.3L9.18 12L2.88 5.71L4.29 4.29l6.3 6.3l6.29-6.3z"/></svg>
    ),
  }
  return <span className="icon" aria-hidden="true">{icons[name]}</span>
}

const NAV = [
  {
    label: 'Learn',
    key: 'learn',
    items: [
      { icon: 'carbon', title: 'Carbon Footprint', desc: 'Understand emissions', href: '#carbon' },
      { icon: 'water', title: 'Water Use', desc: 'Track consumption', href: '#water' },
      { icon: 'waste', title: 'Waste', desc: 'Reduce & recycle', href: '#waste' },
    ],
  },
  {
    label: 'Track',
    key: 'track',
    items: [
      { icon: 'tips', title: 'Daily Habits', desc: 'Simple wins', href: '#habits' },
      { icon: 'carbon', title: 'Commute', desc: 'Travel impact', href: '#commute' },
      { icon: 'water', title: 'Home Water', desc: 'Smart savings', href: '#home-water' },
    ],
  },
  {
    label: 'Community',
    key: 'community',
    items: [
      { icon: 'community', title: 'Local Groups', desc: 'Join & act', href: '#community' },
      { icon: 'tips', title: 'Challenges', desc: 'Friendly goals', href: '#challenges' },
      { icon: 'waste', title: 'Cleanups', desc: 'Events near you', href: '#cleanups' },
    ],
  },
]

export default function NavBar({ query, onQueryChange }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openKey, setOpenKey] = useState(null)
  const navRef = useRef(null)

  const onOutsideClick = (e) => {
    if (!navRef.current) return
    if (!navRef.current.contains(e.target)) {
      setOpenKey(null)
    }
  }

  useEffect(() => {
    document.addEventListener('click', onOutsideClick)
    return () => document.removeEventListener('click', onOutsideClick)
  }, [])

  const isDesktop = useMemo(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(min-width: 768px)').matches
  }, [])

  const toggleDropdown = (key) => {
    setOpenKey((prev) => (prev === key ? null : key))
  }

  const handleNavItemEnter = (key) => {
    if (isDesktop) setOpenKey(key)
  }
  const handleNavItemLeave = (key) => {
    if (isDesktop) setOpenKey((prev) => (prev === key ? null : prev))
  }

  const submitSearch = (e) => {
    e.preventDefault()
    // Try to scroll to first matching section anchor if exists
    const q = (query || '').trim().toLowerCase()
    if (!q) return
    const anchors = Array.from(document.querySelectorAll('[data-section]'))
    const first = anchors.find((el) =>
      (el.getAttribute('data-title') || '').toLowerCase().includes(q)
    )
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <header ref={navRef} className={`nav-header ${mobileOpen ? 'open' : ''}`}>
      <div className="nav-inner">
        <a className="brand" href="#root" aria-label="Earth Balance Tracker home">
          <span className="brand-dot" />
          Earth Balance
        </a>

        <nav className="nav-links" aria-label="Primary">
          {NAV.map((group) => (
            <div
              key={group.key}
              className={`nav-item ${openKey === group.key ? 'active' : ''}`}
              onMouseEnter={() => handleNavItemEnter(group.key)}
              onMouseLeave={() => handleNavItemLeave(group.key)}
            >
              <button
                className="nav-trigger"
                aria-expanded={openKey === group.key}
                aria-controls={`panel-${group.key}`}
                onClick={() => toggleDropdown(group.key)}
              >
                {group.label}
              </button>
              <div
                id={`panel-${group.key}`}
                role="region"
                className="mega-panel"
              >
                <ul className="mega-grid">
                  {group.items.map((it) => (
                    <li key={it.title} className="mega-item">
                      <a href={it.href} onClick={() => { onQueryChange(''); setMobileOpen(false) }}>
                        <Icon name={it.icon} />
                        <div className="mega-text">
                          <span className="mega-title">{it.title}</span>
                          <span className="mega-desc">{it.desc}</span>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </nav>

        <form className="nav-search" role="search" onSubmit={submitSearch}>
          <Icon name="search" />
          <input
            type="search"
            placeholder="Search sections..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Search sections"
          />
        </form>

        <button
          className="nav-burger"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <Icon name={mobileOpen ? 'close' : 'menu'} />
        </button>
      </div>

      {/* Mobile drawer */}
      <div className="mobile-drawer">
        <div className="mobile-groups">
          {NAV.map((group) => (
            <details key={group.key} open={openKey === group.key} onToggle={(e) => setOpenKey(e.target.open ? group.key : null)}>
              <summary>{group.label}</summary>
              <ul className="mobile-list">
                {group.items.map((it) => (
                  <li key={it.title}>
                    <a href={it.href} onClick={() => { onQueryChange(''); setMobileOpen(false) }}>
                      <Icon name={it.icon} />
                      <span>{it.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>
    </header>
  )
}
