import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

let configured = false;

export function configureMonacoEnvironment(): void {
  if (configured) {
    return;
  }
  configured = true;
  (self as unknown as { MonacoEnvironment: { getWorker: () => Worker } }).MonacoEnvironment = {
    getWorker: () => new EditorWorker(),
  };
}
