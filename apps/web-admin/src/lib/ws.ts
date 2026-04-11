const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/ws`

type Handler = (data: unknown) => void

let ws: WebSocket | null = null
const handlers = new Map<string, Set<Handler>>()

function connect() {
  ws = new WebSocket(WS_URL)

  ws.onmessage = (e) => {
    try {
      const { event, data } = JSON.parse(e.data as string) as { event: string; data: unknown }
      handlers.get(event)?.forEach((h) => h(data))
    } catch {
      /* ignore */
    }
  }

  ws.onclose = () => {
    setTimeout(connect, 3000)
  }

  ws.onerror = () => {
    ws?.close()
  }
}

export function onWsEvent(event: string, handler: Handler): () => void {
  if (!handlers.has(event)) handlers.set(event, new Set())
  handlers.get(event)!.add(handler)
  if (!ws || ws.readyState > 1) connect()
  return () => {
    handlers.get(event)?.delete(handler)
  }
}
