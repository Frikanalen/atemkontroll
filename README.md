# atemkontroll

A small HTTP API for the studio's ATEM 1 M/E, built on NRK's
[atem-connection](https://github.com/nrkno/sofie-atem-connection).
It keeps one connection to the mixer open and reconnects by itself.

## Running

```sh
npm ci
npm run build
ATEM_ADDRESS=10.3.2.1 npm start
```

| Variable       | Default | Meaning                                                        |
| -------------- | ------- | -------------------------------------------------------------- |
| `ATEM_ADDRESS` |         | The mixer's IP address, or `mock` for a pretend 1 M/E (staging, local development). Required. |
| `PORT`         | `8080`  | HTTP port.                                                     |
| `API_TOKEN`    |         | If set, every request except health checks needs `Authorization: Bearer <token>`. |

## API

All bodies are JSON. Every command answers with the current state (below)
or `{"error": "..."}`. Commands that act on an M/E take an optional `me`
(default `0`). The ATEM acknowledges a command before its state update
arrives, so the state in a command's answer can be a moment behind. Use
`/events` if you need to see the result.

| Method | Path                | Body                       | Does                         |
| ------ | ------------------- | -------------------------- | ---------------------------- |
| GET    | `/state`            |                            | Current state                |
| GET    | `/events`           |                            | State as server-sent events, on every change |
| POST   | `/program`          | `{"input": 1}`             | Put a source on program      |
| POST   | `/preview`          | `{"input": 2}`             | Put a source on preview      |
| POST   | `/cut`              |                            | Cut                          |
| POST   | `/auto`             |                            | Auto transition              |
| POST   | `/fade-to-black`    |                            | Toggle fade to black         |
| POST   | `/dsk/{n}`          | `{"onAir": true}`          | Downstream key on or off air |
| POST   | `/dsk/{n}/auto`     |                            | Auto-transition a DSK        |
| POST   | `/aux/{n}`          | `{"input": 3}`             | Route a source to an aux     |
| POST   | `/macros/{n}/run`   |                            | Run a macro                  |
| POST   | `/macros/stop`      |                            | Stop the running macro       |
| GET    | `/healthz`          |                            | The process is up            |
| GET    | `/readyz`           |                            | 200 when connected to the mixer, else 503 |

Status codes: `400` for a bad body or a source, DSK, aux or macro the mixer
does not have; `401` for a missing token; `503` while the mixer is
unreachable; `502` if the mixer refused the command.

```sh
curl -s localhost:8080/state
curl -s -XPOST localhost:8080/program -d '{"input": 2}'
curl -s -XPOST localhost:8080/auto
curl -sN localhost:8080/events
```

State looks like:

```json
{
  "connected": true,
  "model": "ATEM 1 M/E Production Studio 4K",
  "inputs": [{ "id": 1, "shortName": "CAM1", "longName": "Camera 1" }],
  "mixEffects": [
    { "index": 0, "program": 1, "preview": 2, "inTransition": false,
      "fadeToBlack": { "fullyBlack": false, "inTransition": false } }
  ],
  "downstreamKeyers": [{ "index": 0, "onAir": false, "tie": false, "inTransition": false }],
  "auxes": [{ "index": 0, "source": 10010 }],
  "macros": [{ "index": 0, "name": "Opening" }]
}
```

## Deploying

The image is `ghcr.io/frikanalen/atemkontroll`, and `chart/` is its Helm
chart. Set `atemAddress`, and `tokenSecret` to a Secret holding
`API_TOKEN`. There is no ingress by default; callers inside the cluster use
the Service.

## Releases

Commits follow Conventional Commits (`feat: ...`, `fix: ...`).
release-please keeps a release pull request open on `main`; merging it tags
`vX.Y.Z`, which builds the image the chart points at.
