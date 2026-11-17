import { AtemMixer } from './atem.js'
import { MockMixer } from './mock.js'
import { createApp, type Mixer } from './server.js'

// ATEM_ADDRESS is the mixer's IP, or "mock" for a pretend mixer (staging).
const address = process.env.ATEM_ADDRESS
if (!address) {
  console.error('ATEM_ADDRESS is not set (an IP address, or "mock")')
  process.exit(1)
}
const port = Number(process.env.PORT ?? 8080)
const token = process.env.API_TOKEN || undefined

let mixer: Mixer
let disconnect = async () => {}
if (address === 'mock') {
  mixer = new MockMixer()
} else {
  const atem = new AtemMixer(address)
  atem.connect().catch((err) => console.error(`connect: ${err}`))
  disconnect = () => atem.disconnect()
  mixer = atem
}

const server = createApp(mixer, { token })
server.listen(port, () => console.log(`listening on :${port}, mixer at ${address}${token ? ', token required' : ''}`))

const stop = async () => {
  server.close()
  server.closeAllConnections()
  await disconnect().catch(() => {})
  process.exit(0)
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
