import type { FastifyInstance } from 'fastify'

export function broadcast(app: FastifyInstance, event: string, data: unknown) {
  const msg = JSON.stringify({ event, data })
  for (const client of app.wsClients) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if ((client as unknown as { readyState: number }).readyState === 1 /* OPEN */) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      ;(client as unknown as { send: (m: string) => void }).send(msg)
    }
  }
}
