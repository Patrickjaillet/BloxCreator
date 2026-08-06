import type { CompileError } from "../../state/store";

export const VERTEX_SHADER_SOURCE = `#version 300 es
void main() {
  vec2 positions[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_HEADER = `#version 300 es
precision highp float;
uniform vec3  iResolution;
uniform float iTime;
uniform float iTimeDelta;
uniform int   iFrame;
uniform vec4  iMouse;
uniform vec4  iDate;
uniform float iFrameRate;
out vec4 fragColor;

`;

const FRAGMENT_SHADER_FOOTER = `

void main() {
    mainImage(fragColor, gl_FragCoord.xy);
}
`;

const USER_CODE_LINE_OFFSET = (FRAGMENT_SHADER_HEADER.match(/\n/g) ?? []).length;

export function wrapFragmentShader(userCode: string): string {
  return `${FRAGMENT_SHADER_HEADER}${userCode}${FRAGMENT_SHADER_FOOTER}`;
}

export function mapCompiledLineToUserLine(compiledLine: number, userCode: string): number {
  const userLineCount = Math.max(1, userCode.split("\n").length);
  const userLine = compiledLine - USER_CODE_LINE_OFFSET;
  return Math.min(Math.max(userLine, 1), userLineCount);
}

const ERROR_LINE_RE = /ERROR:\s*\d+:(\d+):\s*(.+)/g;

export function parseCompileErrors(infoLog: string): CompileError[] {
  const errors: CompileError[] = [];
  for (const match of infoLog.matchAll(ERROR_LINE_RE)) {
    errors.push({ line: Number(match[1]), message: match[2].trim() });
  }
  return errors;
}

export class ShaderCompileError extends Error {
  constructor(
    public readonly errors: CompileError[],
    public readonly rawLog: string,
  ) {
    super(rawLog);
    this.name = "ShaderCompileError";
  }
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("failed to create shader");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown shader compile error";
    gl.deleteShader(shader);
    throw new ShaderCompileError(parseCompileErrors(log), log);
  }
  return shader;
}

function remapToUserCode(error: ShaderCompileError, userCode: string): ShaderCompileError {
  return new ShaderCompileError(
    error.errors.map((e) => ({ ...e, line: mapCompiledLineToUserLine(e.line, userCode) })),
    error.rawLog,
  );
}

export function compileProgram(
  gl: WebGL2RenderingContext,
  userCode: string,
): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);

  let fragmentShader: WebGLShader;
  try {
    fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, wrapFragmentShader(userCode));
  } catch (err) {
    gl.deleteShader(vertexShader);
    throw err instanceof ShaderCompileError ? remapToUserCode(err, userCode) : err;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error("failed to create program");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown link error";
    gl.deleteProgram(program);
    throw remapToUserCode(new ShaderCompileError(parseCompileErrors(log), log), userCode);
  }

  return program;
}
