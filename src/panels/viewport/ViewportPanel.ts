import { appStore } from "../../state/store";
import { ControlsToolbar } from "./ControlsToolbar";
import { WebGL2Renderer } from "./WebGL2Renderer";

export class ViewportPanel {
  readonly element: HTMLDivElement;
  private readonly renderer: WebGL2Renderer;
  private readonly toolbar: ControlsToolbar;

  constructor(onErrorLineClick: (line: number) => void) {
    this.element = document.createElement("div");
    this.element.className = "viewport-panel";

    this.renderer = new WebGL2Renderer({
      onCompileError: (errors) => appStore.setState({ compileErrors: errors }),
      onCompileSuccess: () => appStore.setState({ compileErrors: [] }),
      onFrameRateUpdate: (fps) => this.toolbar.setFrameRate(fps),
    });

    this.toolbar = new ControlsToolbar(
      () => this.togglePlay(),
      () => this.resetTime(),
      onErrorLineClick,
    );

    const compileButton = document.createElement("button");
    compileButton.type = "button";
    compileButton.className = "viewport-panel__compile-button";
    compileButton.textContent = "Compile & Run";
    compileButton.addEventListener("click", () => this.compileAndRun());

    this.element.append(this.renderer.canvas, compileButton, this.toolbar.element);

    appStore.subscribe((state) => this.toolbar.setCompileErrors(state.compileErrors));

    this.compileAndRun();
  }

  compileAndRun(): void {
    this.renderer.compile(appStore.getState().monacoContent);
  }

  togglePlay(): void {
    const playing = !this.renderer.isPlaying();
    this.renderer.setPlaying(playing);
    this.toolbar.setPlaying(playing);
    appStore.setState({ viewport: { ...appStore.getState().viewport, playing } });
  }

  resetTime(): void {
    this.renderer.reset();
    appStore.setState({ viewport: { ...appStore.getState().viewport, time: 0 } });
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
