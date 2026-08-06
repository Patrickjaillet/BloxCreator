import type { BlockDto } from "../../types/dto";

const HIGHLIGHT_DURATION_MS = 2000;

export class BlockCard {
  readonly element: HTMLDivElement;

  constructor(
    private readonly block: BlockDto,
    onSelect: (block: BlockDto) => void,
  ) {
    this.element = document.createElement("div");
    this.element.className = "block-card";
    this.element.dataset.blockId = String(block.id);
    this.element.tabIndex = 0;

    const title = document.createElement("div");
    title.className = "block-card__title";
    title.textContent = block.name;

    const kind = document.createElement("span");
    kind.className = `block-card__kind block-card__kind--${block.blockKind}`;
    kind.textContent = block.blockKind;

    this.element.append(title, kind);

    const tags = (block.tags ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    if (tags.length > 0) {
      const tagsRow = document.createElement("div");
      tagsRow.className = "block-card__tags";
      for (const tag of tags) {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = tag;
        tagsRow.appendChild(chip);
      }
      this.element.appendChild(tagsRow);
    }

    this.element.addEventListener("click", () => onSelect(this.block));
  }

  highlight(): void {
    this.element.classList.add("block-card--highlight");
    this.element.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      this.element.classList.remove("block-card--highlight");
    }, HIGHLIGHT_DURATION_MS);
  }
}
