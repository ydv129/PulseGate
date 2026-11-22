import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number.parseInt(process.env.PORT || '8000', 10),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:8000',
  mockMode: (process.env.MOCK_MODE || 'true').toLowerCase() === 'true',
  serpApiKey: process.env.SERPAPI_KEY || '',
  youApiKey: process.env.YOU_API_KEY || '',
  nexconnAppSecret: process.env.NEXCONN_APP_SECRET || '',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || '',
  discordBotToken: process.env.DISCORD_BOT_TOKEN || '',
  discordGuildId: process.env.DISCORD_GUILD_ID || '',
}
