import { useEffect, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { get, post } from '../api.js'

export default function Topics() {
  const [topics, setTopics] = useState([])
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState('')

  async function loadTopics() {
    setLoading(true)
    setError('')
    try {
      const response = await get('/api/topics')
      setTopics(response.data || [])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTopics()
  }, [])

  async function createTopic(event) {
    event.preventDefault()
    setError('')
    try {
      await post('/api/topics', { name, query })
      setName('')
      setQuery('')
      await loadTopics()
    } catch (createError) {
      setError(createError.message)
    }
  }

  async function pollTopic(topicId) {
    setActionId(topicId)
    setError('')
    try {
      await post(`/api/topics/${topicId}/poll`)
      await loadTopics()
    } catch (pollError) {
      setError(pollError.message)
    } finally {
      setActionId('')
    }
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <h2>Topics</h2>
        <span className="count-badge">{topics.length}</span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form className="card form-card" onSubmit={createTopic}>
        <div className="form-grid">
          <label>
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            <span>Query</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} required />
          </label>
        </div>
        <button type="submit" className="primary-button">
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          Create topic
        </button>
      </form>

      {loading ? (
        <div className="empty-state">Loading topics.</div>
      ) : topics.length === 0 ? (
        <div className="empty-state">No topics yet.</div>
      ) : (
        <div className="topic-grid">
          {topics.map((topic) => (
            <article className="card topic-card" key={topic.topic_id}>
              <div className="card-header">
                <h3>{topic.name}</h3>
                <span className="status-badge">{topic.status}</span>
              </div>
              <p>{topic.query}</p>
              <dl className="meta-grid">
                <div>
                  <dt>Topic ID</dt>
                  <dd className="mono">{topic.topic_id}</dd>
                </div>
                <div>
                  <dt>Poll interval</dt>
                  <dd className="mono">{topic.poll_interval_sec || 0}s</dd>
                </div>
                <div>
                  <dt>Last polled</dt>
                  <dd className="mono">{topic.last_polled_at || 'Never'}</dd>
                </div>
                <div>
                  <dt>Webhooks</dt>
                  <dd className="mono">{topic.webhooks?.length || 0}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="secondary-button"
                disabled={actionId === topic.topic_id}
                onClick={() => pollTopic(topic.topic_id)}
              >
                <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
                {actionId === topic.topic_id ? 'Polling' : 'Poll now'}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
