import { describe, expect, it } from 'vitest'
import { AtemMixer } from './atem.js'
import { classicToDbfs, decodeClassicLevels, fairlightToDbfs, FLOOR_DBFS } from './levels.js'

const FULL = 0x800000

// An AMLv payload as the ATEM sends it: count, padding, master, monitor,
// source ids padded to 4 bytes, then four u32 per source.
function amlv(sources: Array<[number, number[]]>, master = [FULL, FULL, FULL, FULL]) {
  const ids = Math.ceil((sources.length * 2) / 4) * 4
  const buf = Buffer.alloc(36 + ids + sources.length * 16)
  buf.writeUInt16BE(sources.length, 0)
  master.forEach((v, i) => buf.writeUInt32BE(v, 4 + i * 4))
  sources.forEach(([id], i) => buf.writeUInt16BE(id, 36 + i * 2))
  sources.forEach(([, levels], i) => levels.forEach((v, j) => buf.writeUInt32BE(v, 36 + ids + i * 16 + j * 4)))
  return buf
}

describe('level conversion', () => {
  it('converts classic linear levels', () => {
    expect(classicToDbfs(FULL)).toBe(0)
    expect(classicToDbfs(FULL / 2)).toBe(-6)
    expect(classicToDbfs(0)).toBe(FLOOR_DBFS)
    expect(classicToDbfs(1)).toBe(FLOOR_DBFS)
  })

  it('converts Fairlight hundredths of a dB', () => {
    expect(fairlightToDbfs(-1850)).toBe(-18.5)
    expect(fairlightToDbfs(-10000)).toBe(FLOOR_DBFS)
  })
})

describe('decodeClassicLevels', () => {
  it('decodes an odd number of sources (padded ids)', () => {
    const { master, inputs } = decodeClassicLevels(
      amlv([
        [1, [FULL / 2, FULL / 4, FULL, FULL]],
        [2, [0, 0, 0, 0]],
        [1301, [FULL, FULL, FULL, FULL]],
      ]),
    )
    expect(master.leftDbfs).toBe(0)
    expect(inputs.get(1)).toEqual({ leftDbfs: -6, rightDbfs: -12, leftPeakDbfs: 0, rightPeakDbfs: 0 })
    expect(inputs.get(2)?.leftDbfs).toBe(FLOOR_DBFS)
    expect(inputs.get(1301)?.rightDbfs).toBe(0)
  })
})

describe('AtemMixer', () => {
  it('decodes AMLv through atem-connection once registered', async () => {
    const mixer = new AtemMixer('127.0.0.1')
    // Feed a raw command through the library's own parser, as if it had
    // arrived from the mixer: 8-byte header (length, 2 bytes, name).
    const payload = amlv([[1, [FULL / 2, FULL / 2, FULL, FULL]]])
    const header = Buffer.alloc(8)
    header.writeUInt16BE(8 + payload.length, 0)
    header.write('AMLv', 4, 'ascii')
    type Internals = { atem: { client: { socket: { _parseCommands(b: Buffer): unknown } } } }
    const socket = (mixer as unknown as Internals).atem.client.socket
    socket._parseCommands(Buffer.concat([header, payload]))
    const levels = mixer.meter.levels()
    expect(levels.system).toBe('classic')
    expect(levels.inputs).toEqual([{ input: 1, leftDbfs: -6, rightDbfs: -6, leftPeakDbfs: 0, rightPeakDbfs: 0 }])
    await mixer.disconnect()
  })
})
