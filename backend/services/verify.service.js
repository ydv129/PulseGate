import { env } from '../config/env.js'

export async function verifyItem(item) {
  if (env.mockMode) {
    return {
      verified_status: 'VERIFIED',
      summary: item.content || 'Mock fixture verified by PulseGate.',
      citations: ['https://example.com/mock-verification'],
    }
  }

  if (!env.youApiKey) {
    throw new Error(
      'Live You.com verification requires an official Answer API quickstart from API_SNIPPETS.md. Live endpoint implementation is stopped.',
    )
  }

  throw new Error(
    'Live You.com verification is not implemented. Provide an official Answer API quickstart from API_SNIPPETS.md.',
  )
}
