import type { WebSocket } from '@fastify/websocket'

declare module 'fastify' {
  interface FastifyInstance {
    wsClients: Set<WebSocket>
  }
}
