import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate.js'
import { getWeather } from '../lib/weather.js'

// eslint-disable-next-line @typescript-eslint/require-await
export async function weatherRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', async (req, reply) => {
    const queryIcao = (req.query as { icao?: string } | undefined)?.icao
    const icao = queryIcao?.trim() || process.env.AIRPORT_ICAO || ''
    if (!icao) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'No ICAO provided and AIRPORT_ICAO env var is not set',
      })
    }
    if (!/^[A-Za-z0-9]{4}$/.test(icao)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ICAO must be 4 alphanumeric characters',
      })
    }

    const snapshot = await getWeather(icao)
    return snapshot
  })
}
