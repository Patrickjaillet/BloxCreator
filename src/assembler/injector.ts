import { appStore } from "../state/store";
import type { CodeEntry } from "./conflictDetector";

/** Mirrors the Rust concatenation in commands/shaders.rs (assemble_code). */
export function assembleCode(entries: CodeEntry[]): string {
  return entries.map((entry) => entry.code.trim()).join("\n\n");
}

/** Sends the assembled code into the shared Monaco content (spec 8.5, "Envoyer dans l'éditeur"). */
export function injectIntoEditor(code: string): void {
  appStore.setState({ monacoContent: code });
}
