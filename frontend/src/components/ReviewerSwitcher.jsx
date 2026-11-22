import { useState } from 'react'
import { Save } from 'lucide-react'

export default function ReviewerSwitcher() {
  const [reviewerId, setReviewerId] = useState(
    () => localStorage.getItem('reviewer_id') || 'reviewer-1',
  )

  function saveReviewer() {
    const value = reviewerId.trim() || 'reviewer-1'
    localStorage.setItem('reviewer_id', value)
    setReviewerId(value)
  }

  return (
    <div className="reviewer-switcher">
      <label htmlFor="reviewer-id">Reviewer</label>
      <input
        id="reviewer-id"
        className="mono"
        value={reviewerId}
        onChange={(event) => setReviewerId(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') saveReviewer()
        }}
      />
      <button type="button" className="icon-button" onClick={saveReviewer} aria-label="Save reviewer">
        <Save size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  )
}
