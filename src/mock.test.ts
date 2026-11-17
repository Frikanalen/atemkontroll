import { describe, expect, it } from 'vitest'
import { MockMixer } from './mock.js'

describe('MockMixer', () => {
  it('behaves like a mixer', async () => {
    const mixer = new MockMixer()
    const seen: number[] = []
    mixer.onChange((s) => seen.push(s.mixEffects[0].program))
    await mixer.preview(3, 0)
    await mixer.cut(0)
    expect(mixer.summary().mixEffects[0]).toMatchObject({ program: 3, preview: 1 })
    expect(seen).toEqual([1, 3])
    await expect(mixer.program(42, 0)).rejects.toThrow('no source 42')
    await expect(mixer.cut(1)).rejects.toThrow('no M/E 1')
  })
})
