import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { get, post } from '../api.js'

export default function Replay() {
  const [deliveries, setDeliveries] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState('')

  async function loadDeliveries() {
    setLoading(true)
    setError('')
    try {
      const response = await get('/api/replay/failed')
      setDeliveries(response.data || [])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeliveries()
  }, [])

  async function retry(deliveryId) {
    setActionId(deliveryId)
    setError('')
    try {
      const response = await post(`/api/replay/${deliveryId}/retry`)
      const updated = response.data
      setDeliveries((current) =>
        updated.status === 'failed'
          ? current.map((delivery) =>
              delivery.delivery_id === deliveryId ? updated : delivery,
            )
          : current.filter((delivery) => delivery.delivery_id !== deliveryId),
      )
    } catch (retryError) {
      setError(retryError.message)
    } finally {
      setActionId('')
    }
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <h2>Failed deliveries</h2>
        <span className="count-badge">{deliveries.length}</span>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="empty-state">Loading failed deliveries.</div>
      ) : deliveries.length === 0 ? (
        <div className="empty-state">No failed deliveries.</div>
      ) : (
        <div className="event-list">
          {deliveries.map((delivery) => (
            <article className="card delivery-card" key={delivery.delivery_id}>
              <div className="card-header">
                <span className="status-badge">{delivery.status}</span>
                <span className="mono">attempts {delivery.attempts}</span>
              </div>
              <dl className="meta-grid">
                <div>
                  <dt>Delivery ID</dt>
                  <dd className="mono">{delivery.delivery_id}</dd>
                </div>
                <div>
                  <dt>Webhook URL</dt>
                  <dd className="mono">{delivery.webhook_url}</dd>
                </div>
                <div>
                  <dt>Last error</dt>
                  <dd className="mono">{delivery.last_error || 'Unknown error'}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="secondary-button"
                disabled={actionId === delivery.delivery_id}
                onClick={() => retry(delivery.delivery_id)}
              >
                <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
                Retry
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
