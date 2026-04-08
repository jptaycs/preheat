import 'dotenv/config'
import { buildApp } from './app.js'

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
