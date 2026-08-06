import { callCommand } from "../../api/ipc";
import { detectFunctionConflicts } from "../../assembler/conflictDetector";
import { assembleCode, injectIntoEditor } from "../../assembler/injector";
import { createSortableList, moveInArray } from "../../assembler/ordering";
import { groupBlocksByGenre } from "../../state/blockTree";
import { appStore } from "../../state/store";
import type { BlockDto, FunctionConflict, GenreTreeDto } from "../../types/dto";

function truncateCodePreview(code: string, maxLines = 4): string {
  const withoutComments = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const lines = withoutComments
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const truncated = lines.slice(0, maxLines).join("\n");
  return lines.length > maxLines ? `${truncated}\n...` : truncated;
}

export class AssemblerTab {
  readonly element: HTMLDivElement;

  private readonly paletteContainer: HTMLDivElement;
  private readonly headContainer: HTMLDivElement;
  private readonly middleContainer: HTMLDivElement;
  private readonly footContainer: HTMLDivElement;
  private readonly previewElement: HTMLPreElement;

  private genres: GenreTreeDto[] = [];
  private allBlocks: BlockDto[] = [];
  private blocksById = new Map<number, BlockDto>();

  private includedIds = new Set<number>();
  private middleOrder: number[] = [];
  private codeOverrides = new Map<number, string>();
  private lastConflicts: FunctionConflict[] = [];
  private lastAssembledCode = "";

  constructor(private readonly onInject: () => void) {
    this.element = document.createElement("div");
    this.element.className = "assembler-tab";

    this.paletteContainer = document.createElement("div");
    this.paletteContainer.className = "assembler-tab__palette";

    const orderColumn = document.createElement("div");
    orderColumn.className = "assembler-tab__order";

    this.headContainer = document.createElement("div");
    this.headContainer.className = "assembler-tab__head";

    this.middleContainer = document.createElement("div");
    this.middleContainer.className = "assembler-tab__middle";

    this.footContainer = document.createElement("div");
    this.footContainer.className = "assembler-tab__foot";

    this.previewElement = document.createElement("pre");
    this.previewElement.className = "assembler-tab__preview";

    const injectButton = document.createElement("button");
    injectButton.type = "button";
    injectButton.className = "assembler-tab__inject-button";
    injectButton.textContent = "Send to editor";
    injectButton.addEventListener("click", () => {
      injectIntoEditor(this.lastAssembledCode);
      this.onInject();
    });

    orderColumn.append(
      this.headContainer,
      this.middleContainer,
      this.footContainer,
      this.previewElement,
      injectButton,
    );

    this.element.append(this.paletteContainer, orderColumn);

    createSortableList(this.middleContainer, (orderedBlockIds) => {
      this.middleOrder = orderedBlockIds;
      this.recompute();
    });

    void this.refreshPalette();
  }

  async refreshPalette(): Promise<void> {
    const [genres, blocks] = await Promise.all([
      callCommand("get_genres_and_categories", {}),
      callCommand("get_blocks", { filter: {} }),
    ]);
    this.genres = genres;
    this.allBlocks = blocks;
    this.blocksById = new Map(blocks.map((block) => [block.id, block]));

    this.includedIds = new Set([...this.includedIds].filter((id) => this.blocksById.has(id)));
    this.middleOrder = this.middleOrder.filter((id) => this.includedIds.has(id));

    this.renderPalette();
    this.recompute();
  }

  private toggleInclude(blockId: number, included: boolean): void {
    if (included) {
      this.includedIds.add(blockId);
      const block = this.blocksById.get(blockId);
      if (
        block &&
        block.blockKind !== "global_declaration" &&
        block.blockKind !== "main_body" &&
        !this.middleOrder.includes(blockId)
      ) {
        this.middleOrder.push(blockId);
      }
    } else {
      this.includedIds.delete(blockId);
      this.middleOrder = this.middleOrder.filter((id) => id !== blockId);
      this.codeOverrides.delete(blockId);
    }
    this.renderPalette();
    this.recompute();
  }

  private moveMiddleBlock(blockId: number, direction: -1 | 1): void {
    const index = this.middleOrder.indexOf(blockId);
    if (index === -1) {
      return;
    }
    this.middleOrder = moveInArray(this.middleOrder, index, direction);
    this.recompute();
  }

  private recompute(): void {
    const headIds = [...this.includedIds]
      .filter((id) => this.blocksById.get(id)?.blockKind === "global_declaration")
      .sort((a, b) => a - b);
    const footIds = [...this.includedIds]
      .filter((id) => this.blocksById.get(id)?.blockKind === "main_body")
      .sort((a, b) => a - b);
    const footId = footIds[0] ?? null;

    const fullOrder = [...headIds, ...this.middleOrder, ...(footId !== null ? [footId] : [])];

    const entries = fullOrder
      .map((id) => this.blocksById.get(id))
      .filter((block): block is BlockDto => block !== undefined)
      .map((block) => ({
        blockId: block.id,
        code: this.codeOverrides.get(block.id) ?? block.codeRaw,
      }));

    this.lastConflicts = detectFunctionConflicts(entries);
    this.lastAssembledCode = assembleCode(entries);
    this.previewElement.textContent = this.lastAssembledCode;

    appStore.setState({
      assemblerSelection: fullOrder.map((id) => ({
        blockId: id,
        locked: id === footId || headIds.includes(id),
      })),
      functionConflicts: this.lastConflicts,
    });

    this.renderOrder(headIds, footId);
  }

  private renderPalette(): void {
    this.paletteContainer.replaceChildren();

    for (const group of groupBlocksByGenre(this.genres, this.allBlocks)) {
      const genreEl = document.createElement("details");
      genreEl.className = "assembler-palette__genre";
      genreEl.open = true;

      const summary = document.createElement("summary");
      summary.textContent = group.genre.name;
      genreEl.appendChild(summary);

      const rows = [
        ...group.uncategorizedBlocks,
        ...group.categories.flatMap((category) => category.blocks),
      ];
      for (const block of rows) {
        genreEl.appendChild(this.buildPaletteRow(block));
      }

      this.paletteContainer.appendChild(genreEl);
    }
  }

  private buildPaletteRow(block: BlockDto): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "assembler-palette-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = this.includedIds.has(block.id);
    checkbox.addEventListener("change", () => this.toggleInclude(block.id, checkbox.checked));

    const name = document.createElement("span");
    name.className = "assembler-palette-row__name";
    name.textContent = block.name;

    const kind = document.createElement("span");
    kind.className = `assembler-palette-row__kind assembler-palette-row__kind--${block.blockKind}`;
    kind.textContent = block.blockKind;

    const preview = document.createElement("pre");
    preview.className = "assembler-palette-row__preview";
    preview.textContent = truncateCodePreview(block.codeRaw);

    row.append(checkbox, name, kind, preview);
    return row;
  }

  private renderOrder(headIds: number[], footId: number | null): void {
    this.headContainer.replaceChildren();
    for (const id of headIds) {
      const block = this.blocksById.get(id);
      if (block) {
        this.headContainer.appendChild(this.buildOrderRow(block, true));
      }
    }

    this.middleContainer.replaceChildren();
    for (const id of this.middleOrder) {
      const block = this.blocksById.get(id);
      if (block) {
        this.middleContainer.appendChild(this.buildOrderRow(block, false));
      }
    }

    this.footContainer.replaceChildren();
    if (footId !== null) {
      const block = this.blocksById.get(footId);
      if (block) {
        this.footContainer.appendChild(this.buildOrderRow(block, true));
      }
    }
  }

  private buildOrderRow(block: BlockDto, locked: boolean): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "assembler-row" + (locked ? " assembler-row--locked" : "");
    row.dataset.blockId = String(block.id);

    if (!locked) {
      const handle = document.createElement("span");
      handle.className = "assembler-row__handle";
      handle.textContent = "⠿";
      row.appendChild(handle);
    }

    const name = document.createElement("span");
    name.className = "assembler-row__name";
    name.textContent = block.name;
    row.appendChild(name);

    const hasConflict = this.lastConflicts.some(
      (conflict) => conflict.blockA === block.id || conflict.blockB === block.id,
    );
    if (hasConflict) {
      const badge = document.createElement("button");
      badge.type = "button";
      badge.className = "assembler-row__conflict-badge";
      badge.textContent = "⚠";
      badge.addEventListener("click", (event) => this.showConflictPopover(block, event));
      row.appendChild(badge);
    }

    if (!locked) {
      const upButton = document.createElement("button");
      upButton.type = "button";
      upButton.textContent = "↑";
      upButton.addEventListener("click", () => this.moveMiddleBlock(block.id, -1));

      const downButton = document.createElement("button");
      downButton.type = "button";
      downButton.textContent = "↓";
      downButton.addEventListener("click", () => this.moveMiddleBlock(block.id, 1));

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "✕";
      removeButton.addEventListener("click", () => this.toggleInclude(block.id, false));

      row.append(upButton, downButton, removeButton);
    }

    return row;
  }

  private showConflictPopover(block: BlockDto, event: MouseEvent): void {
    document.querySelectorAll(".assembler-conflict-popover").forEach((el) => el.remove());

    const conflict = this.lastConflicts.find(
      (c) => c.blockA === block.id || c.blockB === block.id,
    );
    if (!conflict) {
      return;
    }

    const popover = document.createElement("div");
    popover.className = "assembler-conflict-popover";

    const label = document.createElement("p");
    label.textContent = `Function "${conflict.name}" is defined in multiple blocks.`;
    popover.appendChild(label);

    const renameInput = document.createElement("input");
    renameInput.type = "text";
    renameInput.value = `${conflict.name}_${block.id}`;

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.textContent = "Rename";
    renameButton.addEventListener("click", () => {
      void this.renameConflict(block.id, conflict.name, renameInput.value.trim());
      popover.remove();
    });

    const disableButton = document.createElement("button");
    disableButton.type = "button";
    disableButton.textContent = "Disable this block";
    disableButton.addEventListener("click", () => {
      this.toggleInclude(block.id, false);
      popover.remove();
    });

    popover.append(renameInput, renameButton, disableButton);

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    popover.style.position = "fixed";
    popover.style.left = `${rect.left}px`;
    popover.style.top = `${rect.bottom}px`;

    document.body.appendChild(popover);
  }

  private async renameConflict(blockId: number, oldName: string, newName: string): Promise<void> {
    if (!newName) {
      return;
    }
    const renamedCode = await callCommand("rename_function_in_block", {
      blockId,
      oldName,
      newName,
    });
    this.codeOverrides.set(blockId, renamedCode);
    this.recompute();
  }
}
