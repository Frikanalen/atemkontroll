// Audio level metering. The ATEM sends levels about ten times a second
// once asked to. Classic-audio ATEMs (the older 1 M/E models) send AMLv,
// which atem-connection does not decode, so it is decoded here; Fairlight
// models send FMLv, which atem-connection decodes and emits as
// 'levelChanged'. Both end up as the same shape.

export interface ChannelLevels {
  leftDbfs: number
  rightDbfs: number
  leftPeakDbfs: number
  rightPeakDbfs: number
}

export interface AudioLevels {
  // 'classic' or 'fairlight' once levels have arrived, otherwise null.
  system: 'classic' | 'fairlight' | null
  // When the last level update arrived (ISO 8601), or null if none has.
  // Levels arrive ~10 times a second, so an old timestamp means stale
  // levels: treat them as unknown, not as silence.
  updatedAt: string | null
  master: ChannelLevels | null
  // Keyed by the ATEM's audio source id, which for video inputs is the
  // input id (1 = input 1).
  inputs: Array<{ input: number } & ChannelLevels>
}

// Levels below this are reported as this, so silence is a number rather
// than -Infinity. It matches the bottom of the ATEM's own meters.
export const FLOOR_DBFS = -60

export class AudioMeter {
  private system: AudioLevels['system'] = null
  private updatedAt: Date | null = null
  private master: ChannelLevels | null = null
  private readonly inputs = new Map<number, ChannelLevels>()
  private readonly listeners = new Set<(levels: AudioLevels) => void>()

  update(system: 'classic' | 'fairlight', inputs: Map<number, ChannelLevels>, master?: ChannelLevels, now = new Date()) {
    this.system = system
    this.updatedAt = now
    if (master) this.master = master
    for (const [input, levels] of inputs) this.inputs.set(input, levels)
    if (this.listeners.size === 0) return
    const levels = this.levels()
    for (const listener of this.listeners) listener(levels)
  }

  // Forget everything, e.g. when the connection drops, so nobody mistakes
  // the last levels before a disconnect for current ones.
  reset() {
    this.system = null
    this.updatedAt = null
    this.master = null
    this.inputs.clear()
  }

  levels(): AudioLevels {
    return {
      system: this.system,
      updatedAt: this.updatedAt?.toISOString() ?? null,
      master: this.master,
      inputs: [...this.inputs].sort(([a], [b]) => a - b).map(([input, levels]) => ({ input, ...levels })),
    }
  }

  onUpdate(listener: (levels: AudioLevels) => void) {
    this.listeners.add(listener)
    return () => void this.listeners.delete(listener)
  }
}

const round = (db: number) => Math.round(Math.max(db, FLOOR_DBFS) * 10) / 10

// Classic AMLv carries linear levels where 2^23 is full scale.
export const classicToDbfs = (value: number) => (value <= 0 ? FLOOR_DBFS : round(20 * Math.log10(value / 0x800000)))

// Fairlight levels are hundredths of a dB, -10000 to 0.
export const fairlightToDbfs = (value: number) => round(value / 100)

// AMLv payload (after the 8-byte command header), per pyatem's notes:
//   u16 source count, 2 bytes padding
//   4 x u32 master  (left, right, left peak, right peak)
//   4 x u32 monitor (same)
//   u16 source id x count, padded to a multiple of 4 bytes
//   4 x u32 per source (left, right, left peak, right peak)
export function decodeClassicLevels(payload: Buffer) {
  const count = payload.readUInt16BE(0)
  const quad = (offset: number): ChannelLevels => ({
    leftDbfs: classicToDbfs(payload.readUInt32BE(offset)),
    rightDbfs: classicToDbfs(payload.readUInt32BE(offset + 4)),
    leftPeakDbfs: classicToDbfs(payload.readUInt32BE(offset + 8)),
    rightPeakDbfs: classicToDbfs(payload.readUInt32BE(offset + 12)),
  })
  const master = quad(4)
  const idsAt = 36
  const levelsAt = idsAt + Math.ceil((count * 2) / 4) * 4
  const inputs = new Map<number, ChannelLevels>()
  for (let i = 0; i < count; i++) {
    inputs.set(payload.readUInt16BE(idsAt + i * 2), quad(levelsAt + i * 16))
  }
  return { master, inputs }
}
