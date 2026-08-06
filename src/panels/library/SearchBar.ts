const DEBOUNCE_MS = 150;

export class SearchBar {
  readonly element: HTMLDivElement;
  private readonly input: HTMLInputElement;
  private debounceHandle: number | undefined;

  constructor(private readonly onQueryChange: (query: string) => void) {
    this.element = document.createElement("div");
    this.element.className = "search-bar";

    this.input = document.createElement("input");
    this.input.type = "search";
    this.input.className = "search-bar__input";
    this.input.placeholder = "Search blocks...";
    this.input.addEventListener("input", () => this.handleInput());

    this.element.appendChild(this.input);
  }

  private handleInput(): void {
    window.clearTimeout(this.debounceHandle);
    const value = this.input.value;
    this.debounceHandle = window.setTimeout(() => this.onQueryChange(value), DEBOUNCE_MS);
  }

  focus(): void {
    this.input.focus();
  }
}
