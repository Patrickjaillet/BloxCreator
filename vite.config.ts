import { defineConfig } from "vite";
import monacoEditorPluginImport from "vite-plugin-monaco-editor";

// Vite loads this config file through Node's native ESM loader. For this CJS
// package (which has named exports alongside `default`), Node's interop binds
// a default import to the whole `module.exports` object rather than its
// `.default` property, even though the type declarations claim otherwise —
// so the real plugin factory has to be pulled out of it explicitly at runtime.
type MonacoEditorPluginFactory = typeof monacoEditorPluginImport;
const monacoEditorPlugin: MonacoEditorPluginFactory =
  (monacoEditorPluginImport as unknown as { default?: MonacoEditorPluginFactory }).default ??
  monacoEditorPluginImport;

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [
    monacoEditorPlugin({
      languageWorkers: ["editorWorkerService"],
      publicPath: "monacoeditorwork",
      globalAPI: true,
    }),
  ],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
