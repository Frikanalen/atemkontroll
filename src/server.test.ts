import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { AudioMeter } from './levels.js'
import { createApp, HttpError, metrics, type Mixer } from './server.js'
import type { Summary } from './summary.js'

function fakeMixer(connected = true) {
  const calls: unknown[][] = []
  const listeners = new Set<(s: Summary) => void>()
  const meter = new AudioMeter()
  const state: Summary = {
    connected,
    connectedSince: null,
    stateUpdatedAt: null,
    audio: { system: null, updatedAt: null, master: null, inputs: [] },
    inputs: [{ id: 1, shortName: 'CAM1', longName: 'Camera 1' }],
    mixEffects: [{ index: 0, program: 1, preview: 2, inTransition: false, fadeToBlack: { fullyBlack: false, inTransition: false } }],
    downstreamKeyers: [],
    auxes: [],
    macros: [],
  }
  const record =
    (name: string) =>
    async (...args: unknown[]) => {
      if (args[0] === 99) throw new HttpError(400, 'the mixer has no source 99')
      calls.push([name, ...args])
    }
  const mixer: Mixer = {
    meter,
    summary: () => ({ ...state, audio: meter.levels() }),
    onChange: (l) => {
      listeners.add(l)
      return () => void listeners.delete(l)
    },
    program: record('program'),
    preview: record('preview'),
    cut: record('cut'),
    auto: record('auto'),
    fadeToBlack: record('fadeToBlack'),
    downstreamKey: record('downstreamKey'),
    downstreamKeyAuto: record('downstreamKeyAuto'),
    aux: record('aux'),
    macroRun: record('macroRun'),
    macroStop: record('macroStop'),
  }
  return { mixer, calls, emit: (s: Summary) => listeners.forEach((l) => l(s)) }
}

let close: (() => void) | undefined
afterEach(() => close?.())

async function start(mixer: Mixer, token?: string) {
  const server = createApp(mixer, { token })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  close = () => {
    server.closeAllConnections()
    server.close()
  }
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

const post = (url: string, body?: unknown, headers: Record<string, string> = {}) =>
  fetch(url, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body), headers })

describe('vision mixer API', () => {
  it('returns the state', async () => {
    const { mixer } = fakeMixer()
    const res = await fetch(`${await start(mixer)}/state`)
    expect(res.status).toBe(200)
    expect((await res.json()).mixEffects[0].program).toBe(1)
  })

  it('switches program, defaulting to M/E 0', async () => {
    const { mixer, calls } = fakeMixer()
    const res = await post(`${await start(mixer)}/program`, { input: 3 })
    expect(res.status).toBe(200)
    expect(calls).toEqual([['program', 3, 0]])
  })

  it('takes path parameters', async () => {
    const { mixer, calls } = fakeMixer()
    const base = await start(mixer)
    await post(`${base}/dsk/1`, { onAir: true })
    await post(`${base}/aux/0`, { input: 2 })
    await post(`${base}/macros/4/run`)
    await post(`${base}/cut`)
    expect(calls).toEqual([
      ['downstreamKey', 1, true],
      ['aux', 0, 2],
      ['macroRun', 4],
      ['cut', 0],
    ])
  })

  it('rejects bad bodies', async () => {
    const { mixer, calls } = fakeMixer()
    const base = await start(mixer)
    expect((await post(`${base}/program`, { input: 'cam' })).status).toBe(400)
    expect((await post(`${base}/program`, [1])).status).toBe(400)
    expect((await post(`${base}/dsk/0`, { onAir: 'yes' })).status).toBe(400)
    expect((await post(`${base}/program`, { input: 99 })).status).toBe(400)
    expect(calls).toEqual([])
  })

  it('answers 404 and 405', async () => {
    const { mixer } = fakeMixer()
    const base = await start(mixer)
    expect((await post(`${base}/nope`)).status).toBe(404)
    expect((await fetch(`${base}/cut`)).status).toBe(405)
  })

  it('refuses commands while disconnected, and readyz says so', async () => {
    const { mixer, calls } = fakeMixer(false)
    const base = await start(mixer)
    expect((await post(`${base}/cut`)).status).toBe(503)
    expect((await fetch(`${base}/readyz`)).status).toBe(503)
    expect((await fetch(`${base}/healthz`)).status).toBe(200)
    expect(calls).toEqual([])
  })

  it('requires the token when one is set, except for health checks', async () => {
    const { mixer } = fakeMixer()
    const base = await start(mixer, 's3cret')
    expect((await fetch(`${base}/state`)).status).toBe(401)
    expect((await fetch(`${base}/state`, { headers: { authorization: 'Bearer s3cret' } })).status).toBe(200)
    expect((await fetch(`${base}/healthz`)).status).toBe(200)
  })

  it('streams state changes as server-sent events', async () => {
    const { mixer, emit } = fakeMixer()
    const res = await fetch(`${await start(mixer)}/events`)
    const reader = res.body!.getReader()
    const first = new TextDecoder().decode((await reader.read()).value)
    expect(first).toMatch(/^data: \{"connected":true/)
    emit({ ...mixer.summary(), connected: false })
    const second = new TextDecoder().decode((await reader.read()).value)
    expect(second).toMatch(/^data: \{"connected":false/)
    await reader.cancel()
  })

  it('streams levels only when asked', async () => {
    const { mixer } = fakeMixer()
    const res = await fetch(`${await start(mixer)}/events?levels=1`)
    const reader = res.body!.getReader()
    await reader.read() // the state
    mixer.meter.update('classic', new Map([[1, { leftDbfs: -20, rightDbfs: -21, leftPeakDbfs: -10, rightPeakDbfs: -10 }]]))
    const levels = new TextDecoder().decode((await reader.read()).value)
    expect(levels).toMatch(/^event: levels\ndata: \{"system":"classic"/)
    expect(levels).toContain('"input":1,"leftDbfs":-20')
    await reader.cancel()
  })

  it('serves levels and metrics without a token', async () => {
    const { mixer } = fakeMixer()
    mixer.meter.update('classic', new Map([[1, { leftDbfs: -60, rightDbfs: -60, leftPeakDbfs: -60, rightPeakDbfs: -60 }]]))
    const base = await start(mixer, 's3cret')
    const text = await (await fetch(`${base}/metrics`)).text()
    expect(text).toContain('atem_input_audio_level_dbfs{input="1",channel="left"} -60')
    expect(text).toContain('atem_program_input{me="0"} 1')
    expect(text).toContain('atem_program_audio_level_dbfs{input="1"} -60')
    expect((await fetch(`${base}/levels`)).status).toBe(401)
  })

  it('only lets the mock be silenced', async () => {
    const { mixer } = fakeMixer()
    expect((await post(`${await start(mixer)}/mock/silence/1`, { silent: true })).status).toBe(404)
  })
})

describe('metrics', () => {
  it('leaves out audio until levels have arrived', () => {
    const { mixer } = fakeMixer()
    const text = metrics(mixer.summary())
    expect(text).toContain('atem_connected 1')
    expect(text).not.toContain('audio')
  })

  it('reports how old the levels are', () => {
    const { mixer } = fakeMixer()
    mixer.meter.update('classic', new Map(), undefined, new Date(1_000_000))
    expect(metrics(mixer.summary(), 1_002_500)).toContain('atem_audio_levels_age_seconds 2.5')
  })
})
