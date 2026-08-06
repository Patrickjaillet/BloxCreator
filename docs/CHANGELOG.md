# Changelog

All notable changes to this project are documented in this file, grouped by
version following [Semantic Versioning](https://semver.org/).

## [0.1.0-dev] - 2026-08-06

### Added

- Tauri 2 + Vite + TypeScript (strict) desktop application shell.
- SQLite persistence (`rusqlite`, bundled) with a schema for genres, categories, blocks (with full-text search via FTS5), shaders and app settings.
- GLSL code normalization and SHA-256 hashing for deduplication.
- Markdown block library parser (Role / Adaptation / Summary format), supporting English and French labels.
- Monaco-pasted code decomposer: splits raw GLSL into global declarations, structs, functions, the `mainImage` entry point, and unclassified snippets pending manual review.
- Full IPC command surface: import (file/pasted content/decomposed fragments), block CRUD and search, shader assembly preview, save/list/load/delete/export, and function-rename conflict resolution.
- Frontend: library panel (search, tag filters, drag-and-drop `.md` import, duplicate-aware import toast), Monaco-based editor with a custom GLSL language and compile-error decorations, assembler tab (palette, pinned head/foot with a drag-orderable middle section, live conflict detection, code preview and injection into the editor), and a WebGL2 viewport (800×450) with the standard Shadertoy uniforms and real-time compile-error reporting mapped back to the correct editor line.
- Automatic import of the bundled seed library (27 blocks across 6 genres) on first launch.
- Dark theme, global keyboard shortcuts (compile, save, send assembly to editor, focus search, play/pause, reset time), and an About panel with version/copyright/license information.
- Packaging: multi-resolution application icons, Tauri bundle targets (NSIS/MSI, deb/AppImage, dmg) and an alternative Inno Setup 7 Windows installer script.

### Notes

- The application is still in initial development (`0.x`); no `1.0.0` release has been cut yet.
