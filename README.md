# Pharos Guitar Tuner

A focused, browser-based tuner for six-string electric guitar. Pharos is designed for quick tuning at home: choose a string, play one note, and adjust until the pitch settles in the center.

The application runs entirely in the browser. Microphone audio is processed locally and is never recorded or uploaded.

## Highlights

- Standard tuning: **E A D G B E**
- Half-step-down tuning: **E♭ A♭ D♭ G♭ B♭ E♭**
- Manual string selection for predictable tracking
- Continuous pitch feedback while a string is ringing or being adjusted
- Confirmation feedback when a string remains in tune
- Touch-friendly interface for phones, tablets, and desktop browsers
- Fretboard reference page for memorizing natural notes
- Static deployment with no backend, account, or build pipeline

## Quick start

Pharos is a static web application. Clone the repository and serve it with any static file server:

```bash
git clone https://github.com/ChristophLevi/pharos-guitar-tuner.git
cd pharos-guitar-tuner
python3 -m http.server 8080
```

Open the primary tuner page at:

```text
http://localhost:8080/apple.html
```

Choose **Start tuning**, allow microphone access, select a string, and play one note at a time. The **Fretboard** link opens the note-reference page.

## Secure microphone access

Browsers only expose microphone input to a secure context. `localhost` works for local development. When using another device on your network, serve the files over HTTPS and open the HTTPS address from that device.

For the best results with an electric guitar:

- Use a clean amplifier or pickup signal when possible.
- Mute the other strings.
- Play one string at a time and let the note ring while you adjust the tuning peg.
- Reduce nearby speakers, fans, and other sources of low-frequency noise.

## Deployment

Pharos can be deployed to any static web server, NAS, or container that serves HTML, CSS, and JavaScript files. Copy the repository contents to the server and expose the service over HTTPS for phone and tablet microphone access.

The application has no server-side component and does not require a database or external API.

## How it works

The tuner uses the Web Audio API to capture microphone input. An `AudioWorklet` collects short audio frames while a Web Worker performs pitch analysis away from the main UI thread. The detector evaluates several candidate fundamentals and the tuning engine stabilizes readings before reporting an in-tune state.

No audio leaves the device.

## Project layout

| File | Purpose |
| --- | --- |
| `apple.html` | Primary Pharos tuner interface |
| `apple.js` | Interface, microphone lifecycle, feedback, and tuning controls |
| `capture-worklet.js` | Real-time audio frame capture |
| `pitch.js` | Pitch candidate detection |
| `tuner-engine.js` | Smoothing, string locking, and in-tune confirmation |
| `tuner-worker.js` | Worker entry point for audio analysis |
| `fretboard.html` | Fretboard note-reference page |
| `fretboard.js` and `fretboard-*.css` | Fretboard rendering and responsive styling |
| `manifest.webmanifest` and `sw.js` | Installable web app metadata and offline cache |

## Browser support

Use a recent version of Safari, Chrome, Edge, or Firefox with Web Audio API and AudioWorklet support. Microphone permission is required for tuning.

## Development

There is no build step. Edit the files, then serve the repository locally:

```bash
python3 -m http.server 8080
```

Before opening a pull request, verify the tuner in the target browser and test both tuning modes with a real guitar signal.

## Contributing

Issues and pull requests are welcome. Please include the browser and device used, the selected tuning mode, and a short description of the audio setup when reporting detection problems.

## License

This project is currently shared for personal use. A formal open-source license will be added before redistribution.
