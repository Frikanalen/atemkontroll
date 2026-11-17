import { AudioMeter, FLOOR_DBFS, type ChannelLevels } from './levels.js'
import { HttpError, type Mixer } from './server.js'
import type { Summary } from './summary.js'

// Inputs the mock sends audio levels for, like a mixer with four sources
// that have sound.
const AUDIO_INPUTS = [1, 2, 3, 4]

// A pretend ATEM 1 M/E for staging and local development, so the API can
// be exercised without the studio's mixer. Set ATEM_ADDRESS=mock.
export class MockMixer implements Mixer {
  readonly meter = new AudioMeter()
  private readonly silent = new Set<number>()
  private readonly timer: NodeJS.Timeout
  private readonly listeners = new Set<(summary: Summary) => void>()
  private readonly state: Omit<Summary, 'audio'> = {
    connected: true,
    connectedSince: new Date().toISOString(),
    stateUpdatedAt: new Date().toISOString(),
    model: 'Mock ATEM 1 M/E',
    inputs: [
      { id: 0, shortName: 'BLK', longName: 'Black' },
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({ id, shortName: `CAM${id}`, longName: `Camera ${id}` })),
      { id: 1000, shortName: 'BARS', longName: 'Color Bars' },
      { id: 3010, shortName: 'MP1', longName: 'Media Player 1' },
      { id: 10010, shortName: 'PGM', longName: 'Program' },
    ],
    mixEffects: [{ index: 0, program: 1, preview: 2, inTransition: false, fadeToBlack: { fullyBlack: false, inTransition: false } }],
    downstreamKeyers: [0, 1].map((index) => ({ index, onAir: false, tie: false, inTransition: false })),
    auxes: [{ index: 0, source: 10010 }],
    macros: [{ index: 0, name: 'Mock macro' }],
  }

  // Levels ten times a second, wandering around -18 dBFS, or the floor
  // for an input set silent with setSilent.
  constructor() {
    this.timer = setInterval(() => this.sendLevels(), 100)
    this.timer.unref()
  }

  stop() {
    clearInterval(this.timer)
  }

  sendLevels() {
    const level = (input: number): ChannelLevels => {
      if (this.silent.has(input)) {
        return { leftDbfs: FLOOR_DBFS, rightDbfs: FLOOR_DBFS, leftPeakDbfs: FLOOR_DBFS, rightPeakDbfs: FLOOR_DBFS }
      }
      const db = () => Math.round((-18 + (Math.random() - 0.5) * 6) * 10) / 10
      return { leftDbfs: db(), rightDbfs: db(), leftPeakDbfs: -12, rightPeakDbfs: -12 }
    }
    this.meter.update('classic', new Map(AUDIO_INPUTS.map((input) => [input, level(input)])), level(0))
  }

  setSilent(input: number, silent: boolean) {
    this.source(input)
    if (silent) this.silent.add(input)
    else this.silent.delete(input)
  }

  summary(): Summary {
    return { ...structuredClone(this.state), audio: this.meter.levels() }
  }

  onChange(listener: (summary: Summary) => void) {
    this.listeners.add(listener)
    return () => void this.listeners.delete(listener)
  }

  private changed() {
    this.state.stateUpdatedAt = new Date().toISOString()
    const summary = this.summary()
    for (const listener of this.listeners) listener(summary)
  }

  private source(input: number) {
    if (!this.state.inputs.some((i) => i.id === input)) throw new HttpError(400, `the mixer has no source ${input}`)
    return input
  }

  private me(me: number) {
    const found = this.state.mixEffects[me]
    if (!found) throw new HttpError(400, `the mixer has no M/E ${me}`)
    return found
  }

  private dsk(key: number) {
    const found = this.state.downstreamKeyers[key]
    if (!found) throw new HttpError(400, `the mixer has no DSK ${key}`)
    return found
  }

  async program(input: number, me: number) {
    this.me(me).program = this.source(input)
    this.changed()
  }
  async preview(input: number, me: number) {
    this.me(me).preview = this.source(input)
    this.changed()
  }
  async cut(me: number) {
    const m = this.me(me)
    ;[m.program, m.preview] = [m.preview, m.program]
    this.changed()
  }
  // Transitions are instant in the mock.
  async auto(me: number) {
    return this.cut(me)
  }
  async fadeToBlack(me: number) {
    const ftb = this.me(me).fadeToBlack
    ftb.fullyBlack = !ftb.fullyBlack
    this.changed()
  }
  async downstreamKey(key: number, onAir: boolean) {
    this.dsk(key).onAir = onAir
    this.changed()
  }
  async downstreamKeyAuto(key: number) {
    const dsk = this.dsk(key)
    dsk.onAir = !dsk.onAir
    this.changed()
  }
  async aux(bus: number, input: number) {
    const aux = this.state.auxes[bus]
    if (!aux) throw new HttpError(400, `the mixer has no aux ${bus}`)
    aux.source = this.source(input)
    this.changed()
  }
  async macroRun(index: number) {
    if (!this.state.macros.some((m) => m.index === index)) throw new HttpError(400, `macro ${index} is empty`)
  }
  async macroStop() {}
}
