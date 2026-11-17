import { describe, expect, it } from 'vitest'
import { MockMixer } from './mock.js'

describe('MockMixer', () => {
  it('behaves like a mixer', async () => {
    const mixer = new MockMixer()
    mixer.stop()
    const seen: number[] = []
    mixer.onChange((s) => seen.push(s.mixEffects[0].program))
    await mixer.preview(3, 0)
    await mixer.cut(0)
    expect(mixer.summary().mixEffects[0]).toMatchObject({ program: 3, preview: 1 })
    expect(seen).toEqual([1, 3])
    await expect(mixer.program(42, 0)).rejects.toThrow('no source 42')
    await expect(mixer.cut(1)).rejects.toThrow('no M/E 1')
    mixer.stop()
  })

  it('sends levels, and silence on request', () => {
    const mixer = new MockMixer()
    mixer.stop()
    mixer.sendLevels()
    expect(mixer.meter.levels().inputs.find((i) => i.input === 1)?.leftDbfs).toBeGreaterThan(-30)
    mixer.setSilent(1, true)
    mixer.sendLevels()
    expect(mixer.meter.levels().inputs.find((i) => i.input === 1)?.leftDbfs).toBe(-60)
    expect(() => mixer.setSilent(42, true)).toThrow('no source 42')
  })
})
