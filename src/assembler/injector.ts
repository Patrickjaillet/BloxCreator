import { appStore } from "../state/store";
import type { CodeEntry } from "./conflictDetector";

export function assembleCode(entries: CodeEntry[]): string {
  return entries.map((entry) => entry.code.trim()).join("\n\n");
}

export function injectIntoEditor(code: string): void {
  appStore.setState({ monacoContent: code });
}
