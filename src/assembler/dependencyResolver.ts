import type { BlockDto } from "../types/dto";
import type { CompileError } from "../state/store";
import { integrateCodeByKind } from "../state/editorContent";

const UNDECLARED_IDENTIFIER_RE = /'(\w+)'\s*:\s*undeclared identifier/;

function splitTopLevelCommas(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
    }
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

/** Extracts every variable/function name declared at the top level of a code snippet. */
function extractDeclaredNames(code: string): Set<string> {
  const names = new Set<string>();
  const typeKeyword = "(?:float|int|bool|vec[234]|mat[234])";

  const statementRe = new RegExp(`\\b(?:const\\s+)?${typeKeyword}\\s+([^;{}]+);`, "g");
  for (const match of code.matchAll(statementRe)) {
    for (const part of splitTopLevelCommas(match[1])) {
      const nameMatch = /^\s*([a-zA-Z_]\w*)/.exec(part);
      if (nameMatch) {
        names.add(nameMatch[1]);
      }
    }
  }

  const functionRe = new RegExp(`\\b(?:void|${typeKeyword})\\s+([a-zA-Z_]\\w*)\\s*\\(`, "g");
  for (const match of code.matchAll(functionRe)) {
    names.add(match[1]);
  }

  return names;
}

function introducesConflict(existingCode: string, candidateCode: string, identifier: string): boolean {
  const existingNames = extractDeclaredNames(existingCode);
  const candidateNames = extractDeclaredNames(candidateCode);
  for (const name of candidateNames) {
    if (name !== identifier && existingNames.has(name)) {
      return true;
    }
  }
  return false;
}

export interface DependencyResolution {
  code: string;
  addedBlockIds: number[];
}

/**
 * Best-effort, name-based dependency resolution: for every "undeclared
 * identifier" compile error, look through the block library for a block
 * that declares a variable or function of that name and splice it in via
 * integrateCodeByKind. This is a heuristic (declared-name matching), not a
 * semantic analysis: a candidate is skipped if it would redeclare a name
 * that already exists (seed blocks are often alternative implementations of
 * the same idea, not complements, and blindly combining them just trades one
 * error for a redefinition error). Ambiguous short names (q, p, t, e...) may
 * still pick an unintended provider, or none may exist at all if the
 * identifier was never captured as its own block; either way the resulting
 * errors surface as usual in the compile-errors panel for manual adjustment
 * via the assembler.
 */
export function resolveMissingIdentifiers(
  code: string,
  errors: CompileError[],
  availableBlocks: BlockDto[],
  excludeBlockIds: ReadonlySet<number>,
): DependencyResolution {
  const missingIdentifiers = new Set<string>();
  for (const error of errors) {
    const match = UNDECLARED_IDENTIFIER_RE.exec(error.message);
    if (match) {
      missingIdentifiers.add(match[1]);
    }
  }

  let nextCode = code;
  const addedBlockIds: number[] = [];

  for (const identifier of missingIdentifiers) {
    const provider = availableBlocks.find((block) => {
      if (excludeBlockIds.has(block.id) || addedBlockIds.includes(block.id)) {
        return false;
      }
      if (nextCode.includes(block.codeRaw.trim())) {
        return false;
      }
      if (!extractDeclaredNames(block.codeRaw).has(identifier)) {
        return false;
      }
      return !introducesConflict(nextCode, block.codeRaw, identifier);
    });

    if (provider) {
      nextCode = integrateCodeByKind(nextCode, provider);
      addedBlockIds.push(provider.id);
    }
  }

  return { code: nextCode, addedBlockIds };
}
