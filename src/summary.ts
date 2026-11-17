import type { AtemState } from 'atem-connection'
import type { AudioLevels } from './levels.js'

// The part of the ATEM's state that callers of this API care about. The
// library's own AtemState is large and changes shape between versions, so
// the API promises this smaller shape instead.
export interface Summary {
  connected: boolean
  // ISO 8601. connectedSince is null while disconnected. stateUpdatedAt is
  // the last change the mixer reported, so it is old whenever nobody
  // touches the mixer; use audio.updatedAt to tell whether data is live.
  connectedSince: string | null
  stateUpdatedAt: string | null
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
  audio: AudioLevels
}

export interface Meta {
  connected: boolean
  connectedSince?: Date | null
  stateUpdatedAt?: Date | null
  audio?: AudioLevels
}

const NO_AUDIO: AudioLevels = { system: null, updatedAt: null, master: null, inputs: [] }

export function summarize(state: AtemState | undefined, meta: Meta): Summary {
  const base = {
    connected: meta.connected,
    connectedSince: meta.connectedSince?.toISOString() ?? null,
    stateUpdatedAt: meta.stateUpdatedAt?.toISOString() ?? null,
    audio: meta.audio ?? NO_AUDIO,
  }
  if (!state) {
    return { ...base, inputs: [], mixEffects: [], downstreamKeyers: [], auxes: [], macros: [] }
  }
  const present = <T>(list: Array<T | undefined>) =>
    list.flatMap((item, index) => (item === undefined ? [] : [{ item, index }]))

  return {
    ...base,
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
