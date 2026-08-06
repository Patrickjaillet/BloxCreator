import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

let configured = false;

/**
 * Bundles the Monaco editor worker locally via Vite's native `?worker` import
 * (offline-first: no CDN fallback). Only the base editor worker is needed —
 * we use a custom GLSL Monarch language, not Monaco's JSON/TS/CSS modes.
 */
export function configureMonacoEnvironment(): void {
  if (configured) {
    return;
  }
  configured = true;
  // monaco-editor's .d.ts declares `MonacoEnvironment` as a module-local
  // ambient var rather than a real global, so consumers must reach around
  // the types to set the one every Monaco standalone build actually reads.
  (self as unknown as { MonacoEnvironment: { getWorker: () => Worker } }).MonacoEnvironment = {
    getWorker: () => new EditorWorker(),
  };
}
