import { Atem, Commands } from 'atem-connection'
import { AudioMeter, decodeClassicLevels, fairlightToDbfs, type ChannelLevels } from './levels.js'
import { HttpError, type Mixer } from './server.js'
import { summarize, type Summary } from './summary.js'

// Classic-audio level metering, which atem-connection does not implement.
// SALN asks the ATEM to start or stop sending AMLv.
class ClassicSendLevelsCommand extends Commands.BasicWritableCommand<{ sendLevels: boolean }> {
  static readonly rawName = 'SALN'
  serialize() {
    const buffer = Buffer.alloc(4)
    buffer.writeUInt8(this.properties.sendLevels ? 1 : 0, 0)
    return buffer
  }
}

class ClassicLevelsCommand extends Commands.DeserializedCommand<ReturnType<typeof decodeClassicLevels>> {
  static readonly rawName = 'AMLv'
  static deserialize(payload: Buffer) {
    return new ClassicLevelsCommand(decodeClassicLevels(payload))
  }
  applyToState() {
    return [] // levels are not part of the state
  }
}

// Backs the Mixer interface with NRK's atem-connection. The library keeps
// the connection alive and reconnects by itself, so this only tracks
// whether we are connected and fans state changes out to listeners.
export class AtemMixer implements Mixer {
  private readonly atem = new Atem()
  private connected = false
  private connectedSince: Date | null = null
  private stateUpdatedAt: Date | null = null
  private readonly listeners = new Set<(summary: Summary) => void>()
  readonly meter = new AudioMeter()

  constructor(private readonly address: string) {
    registerClassicLevels(this.atem)
    this.atem.on('connected', () => {
      this.connected = true
      this.connectedSince = this.stateUpdatedAt = new Date()
      console.log(`connected to ${address} (${this.atem.state?.info.productIdentifier ?? 'unknown model'})`)
      this.emit()
      this.startLevels()
    })
    this.atem.on('disconnected', () => {
      this.connected = false
      this.connectedSince = null
      this.meter.reset()
      console.log(`lost connection to ${address}, retrying`)
      this.emit()
    })
    this.atem.on('stateChanged', () => {
      this.stateUpdatedAt = new Date()
      this.emit()
    })
    this.atem.on('receivedCommands', (commands) => {
      for (const command of commands) {
        if (command instanceof ClassicLevelsCommand) {
          this.meter.update('classic', command.properties.inputs, command.properties.master)
        }
      }
    })
    this.atem.on('levelChanged', (level) => {
      const l = level.levels
      const levels: ChannelLevels = {
        leftDbfs: fairlightToDbfs(l.leftLevel),
        rightDbfs: fairlightToDbfs(l.rightLevel),
        leftPeakDbfs: fairlightToDbfs(l.leftPeak),
        rightPeakDbfs: fairlightToDbfs(l.rightPeak),
      }
      if (level.type === 'master') this.meter.update('fairlight', new Map(), levels)
      else this.meter.update('fairlight', new Map([[level.index, levels]]))
    })
    this.atem.on('error', (message) => console.error(`atem: ${message}`))
  }

  // The ATEM stops sending levels when the connection drops, so ask again
  // on every connect. Fairlight models have state.fairlight; the rest have
  // the classic audio mixer.
  private startLevels() {
    const fairlight = this.atem.state?.fairlight !== undefined
    const start = fairlight
      ? this.atem.startFairlightMixerSendLevels()
      : this.atem.sendCommand(new ClassicSendLevelsCommand({ sendLevels: true }))
    start.then(
      () => console.log(`asked for ${fairlight ? 'Fairlight' : 'classic'} audio levels`),
      (err) => console.error(`could not start audio levels: ${err}`),
    )
  }

  connect() {
    return this.atem.connect(this.address)
  }

  disconnect() {
    return this.atem.disconnect()
  }

  summary() {
    return summarize(this.atem.state, {
      connected: this.connected,
      connectedSince: this.connectedSince,
      stateUpdatedAt: this.stateUpdatedAt,
      audio: this.meter.levels(),
    })
  }

  onChange(listener: (summary: Summary) => void) {
    this.listeners.add(listener)
    return () => void this.listeners.delete(listener)
  }

  private emit() {
    if (this.listeners.size === 0) return
    const summary = this.summary()
    for (const listener of this.listeners) listener(summary)
  }

  // The ATEM silently ignores a source it does not have, so check first.
  private source(input: number) {
    if (!this.atem.state?.inputs[input]) throw new HttpError(400, `the mixer has no source ${input}`)
    return input
  }

  private me(me: number) {
    if (!this.atem.state?.video.mixEffects[me]) throw new HttpError(400, `the mixer has no M/E ${me}`)
    return me
  }

  program(input: number, me: number) {
    return this.atem.changeProgramInput(this.source(input), this.me(me))
  }
  preview(input: number, me: number) {
    return this.atem.changePreviewInput(this.source(input), this.me(me))
  }
  cut(me: number) {
    return this.atem.cut(this.me(me))
  }
  auto(me: number) {
    return this.atem.autoTransition(this.me(me))
  }
  fadeToBlack(me: number) {
    return this.atem.fadeToBlack(this.me(me))
  }
  private dsk(key: number) {
    if (!this.atem.state?.video.downstreamKeyers[key]) throw new HttpError(400, `the mixer has no DSK ${key}`)
    return key
  }
  downstreamKey(key: number, onAir: boolean) {
    return this.atem.setDownstreamKeyOnAir(onAir, this.dsk(key))
  }
  downstreamKeyAuto(key: number) {
    return this.atem.autoDownstreamKey(this.dsk(key))
  }
  aux(bus: number, input: number) {
    if (this.atem.state?.video.auxilliaries[bus] === undefined) throw new HttpError(400, `the mixer has no aux ${bus}`)
    return this.atem.setAuxSource(this.source(input), bus)
  }
  macroRun(index: number) {
    if (!this.atem.state?.macro.macroProperties[index]?.isUsed) throw new HttpError(400, `macro ${index} is empty`)
    return this.atem.macroRun(index)
  }
  macroStop() {
    return this.atem.macroStop()
  }
}

// atem-connection drops commands it has no decoder for, and has no public
// way to add one, so add AMLv to its parser directly. If a library update
// moves the parser this throws at startup rather than silently losing the
// levels; the version is pinned in package.json for that reason.
function registerClassicLevels(atem: Atem) {
  type Internals = { client?: { socket?: { _commandParser?: { commands: Record<string, unknown[]> } } } }
  const parser = (atem as unknown as Internals).client?.socket?._commandParser
  if (!parser?.commands) throw new Error('atem-connection internals changed: cannot register AMLv (classic audio levels)')
  parser.commands[ClassicLevelsCommand.rawName] = [ClassicLevelsCommand]
}
