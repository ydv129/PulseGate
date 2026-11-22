import { useState } from 'react'
import {
  Activity,
  ClipboardCheck,
  Inbox,
  RefreshCw,
  Radio,
} from 'lucide-react'
import Topics from './components/Topics.jsx'
import Triage from './components/Triage.jsx'
import Replay from './components/Replay.jsx'
import LiveFeed from './components/LiveFeed.jsx'
import ReviewerSwitcher from './components/ReviewerSwitcher.jsx'
import './index.css'

const NAV_ITEMS = [
  { id: 'topics', label: 'Topics', icon: Inbox },
  { id: 'triage', label: 'Triage', icon: ClipboardCheck },
  { id: 'events', label: 'Events', icon: Activity },
  { id: 'replay', label: 'Replay', icon: RefreshCw },
  { id: 'live', label: 'Live feed', icon: Radio },
]

function App() {
  const [view, setView] = useState('topics')
  const [reviewedEvents, setReviewedEvents] = useState([])
  const [liveEvents, setLiveEvents] = useState([])

  function handleReview(event) {
    setReviewedEvents((current) => [event, ...current].slice(0, 100))
  }

  function handleLiveEvent(event) {
    setLiveEvents((current) => [event, ...current].slice(0, 100))
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">PulseGate</div>
        <nav className="nav-list" aria-label="Dashboard views">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={view === item.id ? 'nav-item active' : 'nav-item'}
                onClick={() => setView(item.id)}
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Verified web-to-event broker</p>
            <h1>{NAV_ITEMS.find((item) => item.id === view)?.label}</h1>
          </div>
          <ReviewerSwitcher />
        </header>

        <section className="content">
          {view === 'topics' && <Topics />}
          {view === 'triage' && (
            <Triage onReviewed={handleReview} onLiveEvent={handleLiveEvent} />
          )}
          {view === 'events' && (
            <EventsView reviewedEvents={reviewedEvents} liveEvents={liveEvents} />
          )}
          {view === 'replay' && <Replay />}
          {view === 'live' && <LiveFeed onLiveEvent={handleLiveEvent} />}
        </section>
      </main>
    </div>
  )
}

function EventsView({ reviewedEvents, liveEvents }) {
  const eventMap = new Map()
  for (const event of [...reviewedEvents, ...liveEvents]) {
    eventMap.set(event.event_id, event)
  }
  const events = [...eventMap.values()].slice(0, 100)

  return (
    <div className="page-stack">
      <div className="section-heading">
        <h2>Recent events</h2>
        <span className="count-badge">{events.length}</span>
      </div>
      {events.length === 0 ? (
        <div className="empty-state">Approve, reject, or receive an event to populate this view.</div>
      ) : (
        <div className="event-list">
          {events.map((event) => (
            <article className="card event-card" key={event.event_id}>
              <div className="card-header">
                <span className="status-badge">
                  {event.status || event.approval_status || event.verified_status}
                </span>
                <span className="mono timestamp">{event.created_at || ''}</span>
              </div>
              <h3>{event.title}</h3>
              {event.summary && <p>{event.summary}</p>}
              <div className="meta-row">
                <span className="mono">{event.event_id}</span>
                {event.reviewed_by && (
                  <span className="mono">reviewed by {event.reviewed_by}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
