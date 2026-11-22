import { useEffect, useRef, useState } from 'react'
import { Radio } from 'lucide-react'
import { get } from '../api.js'

export default function LiveFeed({ onLiveEvent }) {
  const [topics, setTopics] = useState([])
  const [topicId, setTopicId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const eventSourceRef = useRef(null)

  useEffect(() => {
    let active = true
    get('/api/topics')
      .then((response) => {
        if (active) setTopics(response.data || [])
      })
      .catch((loadError) => {
        if (active) setError(loadError.message)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => () => {
    eventSourceRef.current?.close()
  }, [])

  function connect() {
    eventSourceRef.current?.close()
    setError('')
    if (!topicId || !apiKey.trim()) {
      setError('Select a topic and enter its API key.')
      setConnectionStatus('disconnected')
      return
    }

    setConnectionStatus('connecting')
    const url = `/v1/topics/${encodeURIComponent(topicId)}/stream?api_key=${encodeURIComponent(apiKey.trim())}`
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => setConnectionStatus('connected')
    eventSource.onerror = () => setConnectionStatus('disconnected')
    eventSource.addEventListener('pulse_event', (message) => {
      try {
        const event = JSON.parse(message.data)
        setEvents((current) => [event, ...current].slice(0, 100))
        onLiveEvent?.(event)
      } catch {
        setError('Received invalid SSE event data.')
      }
    })
  }

  function disconnect() {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    setConnectionStatus('disconnected')
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <h2>Live feed</h2>
        <span className={`status-badge ${connectionStatus}`}>
          {connectionStatus}
        </span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card form-card">
        <div className="form-grid">
          <label>
            <span>Topic</span>
            <select value={topicId} onChange={(event) => setTopicId(event.target.value)}>
              <option value="">Select topic</option>
              {topics.map((topic) => (
                <option key={topic.topic_id} value={topic.topic_id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Topic API key</span>
            <input
              type="password"
              className="mono"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk_live_..."
            />
          </label>
        </div>
        <div className="button-row">
          <button type="button" className="primary-button" onClick={connect}>
            <Radio size={16} strokeWidth={1.75} aria-hidden="true" />
            Connect
          </button>
          <button type="button" className="secondary-button" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="empty-state">Waiting for pulse_event messages.</div>
      ) : (
        <div className="event-list">
          {events.map((event, index) => (
            <article className="card event-card" key={`${event.event_id}-${index}`}>
              <div className="card-header">
                <span className="status-badge">{event.verified_status}</span>
                <span className="mono timestamp">{event.created_at}</span>
              </div>
              <h3>{event.title}</h3>
              <p>{event.summary}</p>
              <div className="meta-row">
                <span className="mono">{event.event_id}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
