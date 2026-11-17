import { HttpError, type Mixer } from './server.js'
import type { Summary } from './summary.js'

// A pretend ATEM 1 M/E for staging and local development, so the API can
// be exercised without the studio's mixer. Set ATEM_ADDRESS=mock.
export class MockMixer implements Mixer {
  private readonly listeners = new Set<(summary: Summary) => void>()
  private readonly state: Summary = {
    connected: true,
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

  summary() {
    return structuredClone(this.state)
  }

  onChange(listener: (summary: Summary) => void) {
    this.listeners.add(listener)
    return () => void this.listeners.delete(listener)
  }

  private changed() {
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
