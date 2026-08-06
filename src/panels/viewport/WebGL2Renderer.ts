import type { CompileError } from "../../state/store";
import { compileProgram, ShaderCompileError } from "./ShaderCompiler";

const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 450;
const FRAME_RATE_WINDOW = 30;

const UNIFORM_NAMES = [
  "iResolution",
  "iTime",
  "iTimeDelta",
  "iFrame",
  "iMouse",
  "iDate",
  "iFrameRate",
] as const;

type UniformName = (typeof UNIFORM_NAMES)[number];

export interface RendererCallbacks {
  onCompileError: (errors: CompileError[]) => void;
  onCompileSuccess: () => void;
  onFrameRateUpdate: (fps: number) => void;
}

export class WebGL2Renderer {
  readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly callbacks: RendererCallbacks;

  private program: WebGLProgram | null = null;
  private uniforms: Partial<Record<UniformName, WebGLUniformLocation | null>> = {};

  private playing = true;
  private time = 0;
  private frame = 0;
  private lastTimestamp: number | null = null;
  private mouse: [number, number, number, number] = [0, 0, 0, 0];
  private frameDurations: number[] = [];
  private rafHandle: number | undefined;

  constructor(callbacks: RendererCallbacks) {
    this.callbacks = callbacks;

    this.canvas = document.createElement("canvas");
    this.canvas.width = VIEWPORT_WIDTH;
    this.canvas.height = VIEWPORT_HEIGHT;
    this.canvas.className = "webgl2-viewport";

    const gl = this.canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      throw new Error("WebGL2 is not supported in this environment");
    }
    this.gl = gl;

    this.canvas.addEventListener("mousemove", (event) => this.handleMouseMove(event));
    this.canvas.addEventListener("mousedown", (event) => this.handleMouseDown(event));
    this.canvas.addEventListener("mouseup", () => this.handleMouseUp());

    this.start();
  }

  isPlaying(): boolean {
    return this.playing;
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
  }

  reset(): void {
    this.time = 0;
    this.frame = 0;
    this.frameDurations = [];
  }

  compile(userCode: string): void {
    try {
      const program = compileProgram(this.gl, userCode);
      if (this.program) {
        this.gl.deleteProgram(this.program);
      }
      this.program = program;
      this.uniforms = this.resolveUniformLocations(program);
      this.callbacks.onCompileSuccess();
    } catch (err) {
      if (err instanceof ShaderCompileError) {
        this.callbacks.onCompileError(err.errors);
      } else {
        throw err;
      }
    }
  }

  private resolveUniformLocations(
    program: WebGLProgram,
  ): Partial<Record<UniformName, WebGLUniformLocation | null>> {
    const locations: Partial<Record<UniformName, WebGLUniformLocation | null>> = {};
    for (const name of UNIFORM_NAMES) {
      locations[name] = this.gl.getUniformLocation(program, name);
    }
    return locations;
  }

  private canvasToViewportCoords(event: MouseEvent): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * VIEWPORT_WIDTH;
    const y = VIEWPORT_HEIGHT - ((event.clientY - rect.top) / rect.height) * VIEWPORT_HEIGHT;
    return [x, y];
  }

  private handleMouseMove(event: MouseEvent): void {
    const [x, y] = this.canvasToViewportCoords(event);
    this.mouse[0] = x;
    this.mouse[1] = y;
  }

  private handleMouseDown(event: MouseEvent): void {
    const [x, y] = this.canvasToViewportCoords(event);
    this.mouse = [x, y, x, y];
  }

  private handleMouseUp(): void {
    this.mouse[2] = -Math.abs(this.mouse[2]);
    this.mouse[3] = -Math.abs(this.mouse[3]);
  }

  private start(): void {
    const step = (timestamp: number) => {
      this.renderFrame(timestamp);
      this.rafHandle = requestAnimationFrame(step);
    };
    this.rafHandle = requestAnimationFrame(step);
  }

  private renderFrame(timestamp: number): void {
    const gl = this.gl;
    const delta = this.lastTimestamp === null ? 0 : (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    if (this.playing) {
      this.time += delta;
      this.frame += 1;
    }

    if (delta > 0) {
      this.frameDurations.push(delta);
      if (this.frameDurations.length > FRAME_RATE_WINDOW) {
        this.frameDurations.shift();
      }
    }
    const averageDuration =
      this.frameDurations.reduce((sum, d) => sum + d, 0) / (this.frameDurations.length || 1);
    const fps = averageDuration > 0 ? 1 / averageDuration : 0;
    this.callbacks.onFrameRateUpdate(fps);

    gl.viewport(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (!this.program) {
      return;
    }
    gl.useProgram(this.program);

    const now = new Date();
    const secondsSinceMidnight =
      now.getHours() * 3600 +
      now.getMinutes() * 60 +
      now.getSeconds() +
      now.getMilliseconds() / 1000;

    const { iResolution, iTime, iTimeDelta, iFrame, iMouse, iDate, iFrameRate } = this.uniforms;
    if (iResolution) gl.uniform3f(iResolution, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, 1.0);
    if (iTime) gl.uniform1f(iTime, this.time);
    if (iTimeDelta) gl.uniform1f(iTimeDelta, delta);
    if (iFrame) gl.uniform1i(iFrame, this.frame);
    if (iMouse) gl.uniform4f(iMouse, ...this.mouse);
    if (iDate) {
      gl.uniform4f(iDate, now.getFullYear(), now.getMonth() + 1, now.getDate(), secondsSinceMidnight);
    }
    if (iFrameRate) gl.uniform1f(iFrameRate, fps);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose(): void {
    if (this.rafHandle !== undefined) {
      cancelAnimationFrame(this.rafHandle);
    }
    if (this.program) {
      this.gl.deleteProgram(this.program);
    }
  }
}
