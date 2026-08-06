export const EMPTY_SHADERTOY_TEMPLATE = `void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

const MAIN_IMAGE_RE = /void\s+mainImage\s*\(/;
const MAIN_IMAGE_OPEN_BRACE_RE = /void\s+mainImage\s*\([^)]*\)\s*\{/;

export function insertBeforeMainImage(existingCode: string, newCode: string): string {
  const trimmedNew = newCode.trim();
  if (!trimmedNew) {
    return existingCode;
  }

  const match = MAIN_IMAGE_RE.exec(existingCode);
  if (!match) {
    const trimmedExisting = existingCode.trim();
    return trimmedExisting ? `${trimmedExisting}\n\n${trimmedNew}` : trimmedNew;
  }

  const before = existingCode.slice(0, match.index).trimEnd();
  const after = existingCode.slice(match.index);
  return before ? `${before}\n\n${trimmedNew}\n\n${after}` : `${trimmedNew}\n\n${after}`;
}

/**
 * Inserts code as the first statements inside mainImage's body, so it can
 * see fragCoord/fragColor (mainImage's own parameters, out of scope for
 * anything spliced in ahead of the function).
 */
export function insertIntoMainImageBody(existingCode: string, newCode: string): string {
  const trimmedNew = newCode.trim();
  if (!trimmedNew) {
    return existingCode;
  }

  const match = MAIN_IMAGE_OPEN_BRACE_RE.exec(existingCode);
  if (!match) {
    return insertBeforeMainImage(existingCode, newCode);
  }

  const insertPos = match.index + match[0].length;
  const before = existingCode.slice(0, insertPos);
  const after = existingCode.slice(insertPos);
  const indented = trimmedNew
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
  return `${before}\n${indented}\n${after}`;
}

interface IntegratableBlock {
  blockKind: string;
  codeRaw: string;
}

/**
 * Routes a block into the right region of the shader depending on its kind:
 * global declarations/structs/functions are top-level (before mainImage),
 * a main_body block replaces the shader outright, and everything else
 * (snippet) is a body statement that belongs inside mainImage.
 */
export function integrateCodeByKind(existingCode: string, block: IntegratableBlock): string {
  if (block.blockKind === "main_body") {
    return block.codeRaw;
  }
  if (block.blockKind === "snippet") {
    return insertIntoMainImageBody(existingCode, block.codeRaw);
  }
  return insertBeforeMainImage(existingCode, block.codeRaw);
}
