import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { Summary } from './summary.js'

// What the HTTP layer needs from the mixer. main.ts backs it with
// atem-connection; the tests back it with a fake.
export interface Mixer {
  summary(): Summary
  onChange(listener: (summary: Summary) => void): () => void
  program(input: number, me: number): Promise<void>
  preview(input: number, me: number): Promise<void>
  cut(me: number): Promise<void>
  auto(me: number): Promise<void>
  fadeToBlack(me: number): Promise<void>
  downstreamKey(key: number, onAir: boolean): Promise<void>
  downstreamKeyAuto(key: number): Promise<void>
  aux(bus: number, input: number): Promise<void>
  macroRun(index: number): Promise<void>
  macroStop(): Promise<void>
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

type Body = Record<string, unknown>
type Route = (mixer: Mixer, body: Body, params: number[]) => Promise<void>

const MAX_BODY = 16 * 1024

const int = (body: Body, key: string, fallback?: number): number => {
  const value = body[key] ?? fallback
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new HttpError(400, `"${key}" must be a non-negative integer`)
  }
  return value
}

const bool = (body: Body, key: string): boolean => {
  if (typeof body[key] !== 'boolean') throw new HttpError(400, `"${key}" must be true or false`)
  return body[key] as boolean
}

// POST routes. A pattern's (\d+) groups arrive as params. Every command
// that acts on an M/E takes an optional "me" in the body, default 0: the
// 1 M/E only has one, but the API works the same on a bigger ATEM.
const routes: Array<[RegExp, Route]> = [
  [/^\/program$/, (m, b) => m.program(int(b, 'input'), int(b, 'me', 0))],
  [/^\/preview$/, (m, b) => m.preview(int(b, 'input'), int(b, 'me', 0))],
  [/^\/cut$/, (m, b) => m.cut(int(b, 'me', 0))],
  [/^\/auto$/, (m, b) => m.auto(int(b, 'me', 0))],
  [/^\/fade-to-black$/, (m, b) => m.fadeToBlack(int(b, 'me', 0))],
  [/^\/dsk\/(\d+)$/, (m, b, [key]) => m.downstreamKey(key, bool(b, 'onAir'))],
  [/^\/dsk\/(\d+)\/auto$/, (m, _b, [key]) => m.downstreamKeyAuto(key)],
  [/^\/aux\/(\d+)$/, (m, b, [bus]) => m.aux(bus, int(b, 'input'))],
  [/^\/macros\/(\d+)\/run$/, (m, _b, [index]) => m.macroRun(index)],
  [/^\/macros\/stop$/, (m) => m.macroStop()],
]

async function readJson(req: IncomingMessage): Promise<Body> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) throw new HttpError(413, 'body too large')
    chunks.push(chunk)
  }
  if (size === 0) return {}
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Body
  } catch {
    // fall through
  }
  throw new HttpError(400, 'body must be a JSON object')
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

function events(mixer: Mixer, req: IncomingMessage, res: ServerResponse) {
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  })
  const push = (summary: Summary) => res.write(`data: ${JSON.stringify(summary)}\n\n`)
  push(mixer.summary())
  const unsubscribe = mixer.onChange(push)
  // A comment line every 20 s keeps proxies from closing an idle stream.
  const keepalive = setInterval(() => res.write(': keepalive\n\n'), 20_000)
  req.on('close', () => {
    clearInterval(keepalive)
    unsubscribe()
  })
}

export function createApp(mixer: Mixer, opts: { token?: string } = {}): Server {
  return createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname
    try {
      if (req.method === 'GET' && path === '/healthz') return send(res, 200, { ok: true })
      if (req.method === 'GET' && path === '/readyz') {
        const { connected } = mixer.summary()
        return send(res, connected ? 200 : 503, { connected })
      }

      if (opts.token && req.headers.authorization !== `Bearer ${opts.token}`) {
        throw new HttpError(401, 'missing or wrong bearer token')
      }

      if (req.method === 'GET' && path === '/state') return send(res, 200, mixer.summary())
      if (req.method === 'GET' && path === '/events') return events(mixer, req, res)

      const route = routes.find(([pattern]) => pattern.test(path))
      if (!route) throw new HttpError(404, 'no such endpoint')
      if (req.method !== 'POST') throw new HttpError(405, 'use POST')

      const params = (path.match(route[0]) ?? []).slice(1).map(Number)
      const body = await readJson(req)
      if (!mixer.summary().connected) throw new HttpError(503, 'not connected to the mixer')
      await route[1](mixer, body, params)
      send(res, 200, mixer.summary())
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message })
      console.error(err)
      send(res, 502, { error: err instanceof Error ? err.message : String(err) })
    }
  })
}
