import { AtemStateUtil } from 'atem-connection'
import { describe, expect, it } from 'vitest'
import { summarize } from './summary.js'

describe('summarize', () => {
  it('is empty before the first state arrives', () => {
    expect(summarize(undefined, { connected: false })).toMatchObject({ connected: false, inputs: [], mixEffects: [] })
  })

  it('picks out program, preview, keyers and inputs', () => {
    const state = AtemStateUtil.Create()
    const me = AtemStateUtil.getMixEffect(state, 0)
    me.programInput = 2
    me.previewInput = 3
    AtemStateUtil.getDownstreamKeyer(state, 1).onAir = true
    state.inputs[2] = { inputId: 2, shortName: 'CAM2', longName: 'Camera 2' } as never
    const summary = summarize(state, { connected: true })
    expect(summary.mixEffects).toEqual([
      { index: 0, program: 2, preview: 3, inTransition: false, fadeToBlack: { fullyBlack: false, inTransition: false } },
    ])
    expect(summary.downstreamKeyers).toEqual([{ index: 1, onAir: true, tie: false, inTransition: false }])
    expect(summary.inputs).toEqual([{ id: 2, shortName: 'CAM2', longName: 'Camera 2' }])
  })
})
