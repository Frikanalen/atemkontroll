import type { AtemState } from 'atem-connection'

// The part of the ATEM's state that callers of this API care about. The
// library's own AtemState is large and changes shape between versions, so
// the API promises this smaller shape instead.
export interface Summary {
  connected: boolean
  model?: string
  inputs: Array<{ id: number; shortName: string; longName: string }>
  mixEffects: Array<{
    index: number
    program: number
    preview: number
    inTransition: boolean
    fadeToBlack: { fullyBlack: boolean; inTransition: boolean }
  }>
  downstreamKeyers: Array<{ index: number; onAir: boolean; tie: boolean; inTransition: boolean }>
  auxes: Array<{ index: number; source: number }>
  macros: Array<{ index: number; name: string }>
}

export function summarize(state: AtemState | undefined, connected: boolean): Summary {
  if (!state) {
    return { connected, inputs: [], mixEffects: [], downstreamKeyers: [], auxes: [], macros: [] }
  }
  const present = <T>(list: Array<T | undefined>) =>
    list.flatMap((item, index) => (item === undefined ? [] : [{ item, index }]))

  return {
    connected,
    model: state.info.productIdentifier,
    inputs: Object.values(state.inputs)
      .filter((input) => input !== undefined)
      .map((input) => ({ id: input.inputId, shortName: input.shortName, longName: input.longName }))
      .sort((a, b) => a.id - b.id),
    mixEffects: present(state.video.mixEffects).map(({ item, index }) => ({
      index,
      program: item.programInput,
      preview: item.previewInput,
      inTransition: item.transitionPosition.inTransition,
      fadeToBlack: {
        fullyBlack: item.fadeToBlack?.isFullyBlack ?? false,
        inTransition: item.fadeToBlack?.inTransition ?? false,
      },
    })),
    downstreamKeyers: present(state.video.downstreamKeyers).map(({ item, index }) => ({
      index,
      onAir: item.onAir,
      tie: item.properties?.tie ?? false,
      inTransition: item.inTransition,
    })),
    auxes: present(state.video.auxilliaries).map(({ item, index }) => ({ index, source: item })),
    macros: present(state.macro.macroProperties)
      .filter(({ item }) => item.isUsed)
      .map(({ item, index }) => ({ index, name: item.name })),
  }
}
