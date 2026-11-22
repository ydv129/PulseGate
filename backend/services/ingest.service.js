import { env } from '../config/env.js'

const mockFixtureSets = [
  [
    {
      title: 'PulseGate verified market update',
      link: 'https://example.com/pulsegate-market-update',
      content: 'A verified public-market update from the PulseGate fixture.',
      source: 'Mock News',
      price: null,
    },
    {
      title: 'PulseGate fixture price drop',
      link: 'https://example.com/pulsegate-price-drop',
      content: 'The fixture price changed from 120 to 99.',
      source: 'Mock Shopping',
      price: 99,
    },
    {
      title: 'PulseGate content update',
      link: 'https://example.com/pulsegate-content-update',
      content: 'Fixture content at 2026-11-22 07:49.',
      source: 'Mock Feed',
      price: null,
    },
  ],
  [
    {
      title: 'PulseGate rotating news fixture',
      link: 'https://example.com/pulsegate-rotating-news',
      content: 'A second verified news fixture.',
      source: 'Mock News',
      price: null,
    },
    {
      title: 'PulseGate rotating shopping fixture',
      link: 'https://example.com/pulsegate-rotating-shopping',
      content: 'A second verified shopping fixture.',
      source: 'Mock Shopping',
      price: 79,
    },
    {
      title: 'PulseGate rotating feed fixture',
      link: 'https://example.com/pulsegate-rotating-feed',
      content: 'A second verified feed fixture.',
      source: 'Mock Feed',
      price: null,
    },
  ],
]

let mockCallCount = 0

export async function fetchItems(topic) {
  if (env.mockMode) {
    mockCallCount += 1
    if (mockCallCount >= 3) {
      return mockFixtureSets[1].map((item) => ({ ...item }))
    }
    return mockFixtureSets[0].map((item) => ({ ...item }))
  }

  if (!env.serpApiKey) {
    throw new Error(
      'Live SerpApi ingestion requires an official quickstart from API_SNIPPETS.md. Live endpoint implementation is stopped.',
    )
  }

  throw new Error(
    'Live SerpApi ingestion is not implemented. Provide an official SerpApi quickstart from API_SNIPPETS.md.',
  )
}
