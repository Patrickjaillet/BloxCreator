import type { FunctionConflict } from "../types/dto";

const FUNCTION_NAME_RE = /(?:vec[234]|float|int|bool|mat[234]|void)\s+(\w+)\s*\(/g;

export interface CodeEntry {
  blockId: number;
  code: string;
}

/** Mirrors the Rust detection in commands/shaders.rs (spec 8.3), run client-side for live preview. */
export function detectFunctionConflicts(entries: CodeEntry[]): FunctionConflict[] {
  const firstSeen = new Map<string, number>();
  const conflicts: FunctionConflict[] = [];

  for (const { blockId, code } of entries) {
    for (const match of code.matchAll(FUNCTION_NAME_RE)) {
      const name = match[1];
      const existing = firstSeen.get(name);
      if (existing === undefined) {
        firstSeen.set(name, blockId);
      } else if (existing !== blockId) {
        conflicts.push({ name, blockA: existing, blockB: blockId });
      }
    }
  }

  return conflicts;
}
