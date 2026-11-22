function reviewerHeaders() {
  const reviewerId = localStorage.getItem('reviewer_id')
  return reviewerId ? { 'X-Reviewer-Id': reviewerId } : {}
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
  if (!response.ok) {
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
    body: JSON.stringify(data),
  })
}

export function patch(path, data) {
  return request(path, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function del(path) {
  return request(path, {
    method: 'DELETE',
  })
}
