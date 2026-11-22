export function errorHandler(error, _request, response, _next) {
  if (process.env.NODE_ENV !== 'production') {
    console.error(error)
  }
  const status = Number.isInteger(error.status) ? error.status : 500
  response.status(status).json({
    ok: false,
    error: status >= 500 ? 'Internal server error' : error.message,
  })
}
