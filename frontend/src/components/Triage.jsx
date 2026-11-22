import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { get, post } from '../api.js'

export default function Triage({ onReviewed, onLiveEvent }) {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState('')

  async function loadPending() {
    setLoading(true)
    setError('')
    try {
      const response = await get('/api/triage/pending')
      setEvents(response.data || [])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPending()
  }, [])

  async function review(eventId, decision) {
    setActionId(eventId)
    setError('')
    try {
      const response = await post(`/api/triage/${eventId}/${decision}`)
      const reviewed = response.data.event
      setEvents((current) => current.filter((event) => event.event_id !== eventId))
      onReviewed?.(reviewed)
      if (decision === 'approve') {
        onLiveEvent?.(reviewed)
      }
    } catch (reviewError) {
      setError(reviewError.message)
    } finally {
      setActionId('')
    }
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <h2>Pending triage</h2>
        <span className="count-badge">{events.length}</span>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="empty-state">Loading pending events.</div>
      ) : events.length === 0 ? (
        <div className="empty-state">No events awaiting review.</div>
      ) : (
        <div className="event-list">
          {events.map((event) => (
            <article className="card event-card" key={event.event_id}>
              <div className="card-header">
                <span className="status-badge">{event.verified_status}</span>
                <span className="mono timestamp">{event.created_at}</span>
              </div>
              <h3>{event.title}</h3>
              <p>{event.summary}</p>
              <div className="meta-row">
                <span className="mono">{event.event_id}</span>
              </div>
              {event.citations?.length > 0 && (
                <div className="citation-list">
                  {event.citations.map((citation) => (
                    <a
                      key={typeof citation === 'string' ? citation : citation.url}
                      href={typeof citation === 'string' ? citation : citation.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mono"
                    >
                      {typeof citation === 'string' ? citation : citation.url}
                    </a>
                  ))}
                </div>
              )}
              <div className="button-row">
                <button
                  type="button"
                  className="primary-button"
                  disabled={actionId === event.event_id}
                  onClick={() => review(event.event_id, 'approve')}
                >
                  <Check size={16} strokeWidth={1.75} aria-hidden="true" />
                  Approve
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={actionId === event.event_id}
                  onClick={() => review(event.event_id, 'reject')}
                >
                  <X size={16} strokeWidth={1.75} aria-hidden="true" />
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
