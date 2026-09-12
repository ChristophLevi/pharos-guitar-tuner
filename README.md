# Pharos Guitar Tuner

A focused, browser based electric guitar tuner designed for quick, reliable tuning on a local network.

## Features

- Standard tuning (E A D G B E)
- Half step down tuning (E♭ A♭ D♭ G♭ B♭ E♭)
- Manual string selection for predictable note tracking
- Continuous pitch tracking while a string is ringing or being adjusted
- Clear visual feedback with a minimal, touch friendly interface
- Fretboard reference page for memorizing natural note locations
- Works on phones, tablets, and desktop browsers

## Run locally

The app is a static website and needs no build step. Serve this directory with any static file server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/apple.html` in a browser and allow microphone access.

Microphone input requires a secure context. Use HTTPS when accessing the tuner from another device, or use `localhost` during local development.

## Deploy on a NAS

Copy the contents of this directory to a static web server or container on your NAS. Expose the service over HTTPS so mobile browsers can request microphone access. Open `apple.html` from a device on the same network and grant microphone permission when prompted.

## Browser support

Pharos uses the Web Audio API and AudioWorklets. Recent versions of Safari, Chrome, Edge, and Firefox are recommended.

## License

This project is provided for personal use. Add a license before redistributing it publicly.
