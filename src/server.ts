import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AudioLevels, AudioMeter } from './levels.js'
import type { Summary } from './summary.js'

// What the HTTP layer needs from the mixer. main.ts backs it with
// atem-connection; the tests back it with a fake.
export interface Mixer {
  readonly meter: AudioMeter
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
  // Only the mock has this: silence an input's audio, to rehearse whatever
  // watches the levels.
  setSilent?(input: number, silent: boolean): void
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
  [
    /^\/mock\/silence\/(\d+)$/,
    async (m, b, [input]) => {
      if (!m.setSilent) throw new HttpError(404, 'only the mock mixer can be silenced')
      m.setSilent(input, bool(b, 'silent'))
    },
  ],
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

// State changes arrive as unnamed events (EventSource's onmessage). With
// ?levels=1, audio levels also arrive as "levels" events, about ten a
// second; they are left out otherwise, since most callers only want state.
function events(mixer: Mixer, req: IncomingMessage, res: ServerResponse, withLevels: boolean) {
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  })
  const push = (summary: Summary) => res.write(`data: ${JSON.stringify(summary)}\n\n`)
  push(mixer.summary())
  const unsubscribers = [mixer.onChange(push)]
  if (withLevels) {
    const pushLevels = (levels: AudioLevels) => res.write(`event: levels\ndata: ${JSON.stringify(levels)}\n\n`)
    unsubscribers.push(mixer.meter.onUpdate(pushLevels))
  }
  // A comment line every 20 s keeps proxies from closing an idle stream.
  const keepalive = setInterval(() => res.write(': keepalive\n\n'), 20_000)
  req.on('close', () => {
    clearInterval(keepalive)
    for (const unsubscribe of unsubscribers) unsubscribe()
  })
}

// Prometheus text format, by hand: a handful of gauges does not need a
// client library.
export function metrics(summary: Summary, now = Date.now()): string {
  const lines: string[] = []
  const gauge = (name: string, help: string, samples: Array<[Record<string, string | number>, number]>) => {
    lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} gauge`)
    for (const [labels, value] of samples) {
      const l = Object.entries(labels).map(([k, v]) => `${k}="${v}"`)
      lines.push(`${name}${l.length ? `{${l.join(',')}}` : ''} ${value}`)
    }
  }
  gauge('atem_connected', 'Whether the API is connected to the mixer.', [[{}, summary.connected ? 1 : 0]])
  gauge('atem_program_input', 'Input on program, per M/E.', summary.mixEffects.map((m) => [{ me: m.index }, m.program]))
  gauge('atem_preview_input', 'Input on preview, per M/E.', summary.mixEffects.map((m) => [{ me: m.index }, m.preview]))
  gauge(
    'atem_in_transition',
    'Whether a transition is running, per M/E.',
    summary.mixEffects.map((m) => [{ me: m.index }, m.inTransition ? 1 : 0]),
  )
  gauge(
    'atem_fade_to_black',
    'Whether the M/E is faded to black.',
    summary.mixEffects.map((m) => [{ me: m.index }, m.fadeToBlack.fullyBlack ? 1 : 0]),
  )
  const audio = summary.audio
  if (audio.updatedAt) {
    gauge('atem_audio_levels_age_seconds', 'Seconds since the last audio level update.', [
      [{}, Math.max(0, (now - Date.parse(audio.updatedAt)) / 1000)],
    ])
    gauge(
      'atem_input_audio_level_dbfs',
      'Audio level per input and channel, dBFS (-60 is the floor).',
      audio.inputs.flatMap((i) => [
        [{ input: i.input, channel: 'left' }, i.leftDbfs],
        [{ input: i.input, channel: 'right' }, i.rightDbfs],
      ]),
    )
    // The level of whatever is on program (M/E 0), so an alert can say
    // "on air but silent" without joining a value to a label in PromQL.
    const program = summary.mixEffects[0]?.program
    const onAir = audio.inputs.find((i) => i.input === program)
    if (onAir) {
      gauge('atem_program_audio_level_dbfs', 'Audio level of the input on program (M/E 0), loudest channel, dBFS.', [
        [{ input: onAir.input }, Math.max(onAir.leftDbfs, onAir.rightDbfs)],
      ])
    }
    if (audio.master) {
      gauge('atem_master_audio_level_dbfs', 'Master audio level per channel, dBFS.', [
        [{ channel: 'left' }, audio.master.leftDbfs],
        [{ channel: 'right' }, audio.master.rightDbfs],
      ])
    }
  }
  return lines.join('\n') + '\n'
}

export function createApp(mixer: Mixer, opts: { token?: string } = {}): Server {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x')
    const path = url.pathname
    try {
      if (req.method === 'GET' && path === '/healthz') return send(res, 200, { ok: true })
      if (req.method === 'GET' && path === '/readyz') {
        const { connected } = mixer.summary()
        return send(res, connected ? 200 : 503, { connected })
      }
      // Unauthenticated like the health checks, so Prometheus needs no token.
      if (req.method === 'GET' && path === '/metrics') {
        res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4' })
        return res.end(metrics(mixer.summary()))
      }

      if (opts.token && req.headers.authorization !== `Bearer ${opts.token}`) {
        throw new HttpError(401, 'missing or wrong bearer token')
      }

      if (req.method === 'GET' && path === '/state') return send(res, 200, mixer.summary())
      if (req.method === 'GET' && path === '/levels') return send(res, 200, mixer.meter.levels())
      if (req.method === 'GET' && path === '/events') {
        return events(mixer, req, res, url.searchParams.get('levels') === '1')
      }

      const route = routes.find(([pattern]) => pattern.test(path))
      if (!route) throw new HttpError(404, 'no such endpoint')
      if (req.method !== 'POST') throw new HttpError(405, 'use POST')

      const params = (path.match(route[0]) ?? []).slice(1).map(Number)
      const body = await readJson(req)
      if (!path.startsWith('/mock/') && !mixer.summary().connected) {
        throw new HttpError(503, 'not connected to the mixer')
      }
      await route[1](mixer, body, params)
      send(res, 200, mixer.summary())
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message })
      console.error(err)
      send(res, 502, { error: err instanceof Error ? err.message : String(err) })
    }
  })
}
