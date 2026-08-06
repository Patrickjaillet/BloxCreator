import type { CompileError } from "../../state/store";

export class ControlsToolbar {
  readonly element: HTMLDivElement;
  private readonly playPauseButton: HTMLButtonElement;
  private readonly fpsLabel: HTMLSpanElement;
  private readonly errorsList: HTMLUListElement;

  constructor(
    onTogglePlay: () => void,
    onReset: () => void,
    private readonly onErrorClick: (line: number) => void,
  ) {
    this.element = document.createElement("div");
    this.element.className = "controls-toolbar";

    this.playPauseButton = document.createElement("button");
    this.playPauseButton.type = "button";
    this.playPauseButton.textContent = "Pause";
    this.playPauseButton.addEventListener("click", onTogglePlay);

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.textContent = "Reset";
    resetButton.addEventListener("click", onReset);

    this.fpsLabel = document.createElement("span");
    this.fpsLabel.className = "controls-toolbar__fps";
    this.fpsLabel.textContent = "0 FPS";

    const row = document.createElement("div");
    row.className = "controls-toolbar__row";
    row.append(this.playPauseButton, resetButton, this.fpsLabel);

    this.errorsList = document.createElement("ul");
    this.errorsList.className = "controls-toolbar__errors";

    this.element.append(row, this.errorsList);
  }

  setPlaying(playing: boolean): void {
    this.playPauseButton.textContent = playing ? "Pause" : "Play";
  }

  setFrameRate(fps: number): void {
    this.fpsLabel.textContent = `${Math.round(fps)} FPS`;
  }

  setCompileErrors(errors: CompileError[]): void {
    this.errorsList.replaceChildren();
    for (const error of errors) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "controls-toolbar__error-link";
      button.textContent = `Line ${error.line}: ${error.message}`;
      button.addEventListener("click", () => this.onErrorClick(error.line));
      item.appendChild(button);
      this.errorsList.appendChild(item);
    }
  }
}
