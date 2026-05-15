import 'dotenv/config'
import * as Sentry from '@sentry/node'
import { buildApp } from './app.js'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  })
}

const host = process.env.HOST ?? '0.0.0.0'
const port = Number(process.env.PORT ?? 4000)

const app = await buildApp()

try {
  await app.listen({ host, port })
  console.warn(`API running at http://${host}:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
