# Blox Creator

Offline desktop application to manage and assemble reusable GLSL code blocks into complete, Shadertoy-compatible shaders.

## Status

`v1.0.0`. The core pipeline is functional end-to-end: import a Markdown block library or decompose pasted GLSL, browse and search the block database, assemble blocks visually with live conflict detection, and preview the result in real time. The Windows build (NSIS/MSI) has been produced and tested; the Linux and macOS bundle targets are configured but not yet built or tested on those platforms. See [`docs/CHANGELOG.md`](docs/CHANGELOG.md) for details.

## Features

- Import a structured Markdown library of GLSL blocks (drag-and-drop or paste) into a local SQLite database, or decompose a shader pasted into the Monaco editor into reusable blocks.
- Deduplicate blocks via SHA-256 hashing of normalized code, with a clear import report and jump-to-duplicate.
- Full-text search and tag filters across the block library.
- Visually reorder and assemble selected blocks into a complete shader, with automatic function-name conflict detection (rename or disable) and a live combined-code preview.
- Real-time WebGL2 preview (800×450) with the standard Shadertoy uniforms (`iResolution`, `iTime`, `iTimeDelta`, `iFrame`, `iMouse`, `iDate`, `iFrameRate`) and compile errors mapped back to the exact editor line.
- 100% offline: SQLite is bundled, the Monaco editor and its assets are bundled locally, and the app's Content-Security-Policy blocks all outbound network connections at runtime.

## Screenshot

![Blox Creator screenshot](docs/screenshot.png)

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Enter` | Compile and run the shader in the viewport |
| `Ctrl+S` | Save the current shader |
| `Ctrl+Shift+A` | Send the current assembly to the Monaco editor |
| `Ctrl+F` | Focus the library search bar |
| `Space` | Play/pause the viewport |
| `Ctrl+R` | Reset the viewport clock |

## Installation

See [`docs/COMPILATION.md`](docs/COMPILATION.md) for build instructions and prerequisites.

## License

MIT — see [`LICENSE`](LICENSE).

## Author

Patrick JAILLET
E-mail: sandefjord.development@proton.me
Website: https://patrickjaillet.github.io/sandefjord-software
