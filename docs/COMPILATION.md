# Compilation

## Prerequisites

- **Rust** (stable channel) — install via [rustup](https://rustup.rs/).
- **Node.js LTS** (v20 or later) and npm.
- **Tauri CLI** — no separate install needed, it is a devDependency (`@tauri-apps/cli`) invoked through `npm run tauri`.

### Windows

- [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (preinstalled on up-to-date Windows 10/11).
- Visual Studio Build Tools with the "Desktop development with C++" workload (provides the MSVC linker Rust needs).
- Optional, only to build the alternative Windows installer: [Inno Setup 7](https://jrsoftware.org/isinfo.php) (`ISCC.exe` on your `PATH`).

### Linux

Install the packages Tauri's webview and bundler need (Debian/Ubuntu names; adjust for your distribution):

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

### macOS

- Xcode Command Line Tools: `xcode-select --install`.

## Commands

```bash
npm install        # install frontend dependencies (Rust deps are fetched by Cargo on first build)

npm run tauri dev    # run the app in development mode (hot-reloading frontend + debug Rust build)
npm run tauri build  # produce the release bundle(s) for the current OS in src-tauri/target/release/bundle

cargo test --manifest-path src-tauri/Cargo.toml   # run the Rust backend test suite
npx tsc --noEmit                                  # typecheck the frontend
```

`npm run tauri build` produces the native installers configured in `src-tauri/tauri.conf.json` (`bundle.targets`): NSIS and MSI on Windows, `.deb`/AppImage on Linux, `.dmg` on macOS.

### Alternative Windows installer (Inno Setup)

After a release build has produced `src-tauri/target/release/bloxcreator.exe`, compile the alternative installer:

```bash
ISCC.exe installer\inno-setup.iss
```

The output installer is written to `installer/output/`.

## Offline-first

The build has no network dependency at runtime: SQLite is statically linked (`rusqlite` with the `bundled` feature), the Monaco editor worker and its icon font are bundled by Vite, and the app's Content-Security-Policy blocks outbound connections (`connect-src 'none'`). No internet connection is required to run the built application.
