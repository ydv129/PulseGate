function reviewerHeaders() {
  const reviewerId =
    localStorage.getItem('reviewer_id') || 'reviewer-1'
  return { 'X-Reviewer-Id': reviewerId }
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...reviewerHeaders(),
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({
    ok: false,
    error: 'Invalid server response',
  }))
  if (!response.ok || body.ok === false) {
    throw new Error(body.error || `Request failed: ${response.status}`)
  }
  return body
}

export function get(path) {
  return request(path)
}

export function post(path, data) {
  return request(path, {
    method: 'POST',
    body: data === undefined ? undefined : JSON.stringify(data),
  })
}
