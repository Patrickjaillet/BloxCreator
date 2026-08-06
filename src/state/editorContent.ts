export const EMPTY_SHADERTOY_TEMPLATE = `void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

const MAIN_IMAGE_RE = /void\s+mainImage\s*\(/;

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
