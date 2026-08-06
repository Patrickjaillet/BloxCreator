import { callCommand } from "../../api/ipc";
import { appStore } from "../../state/store";
import type { BlockDto, BlockFilter, GenreTreeDto, ImportReport } from "../../types/dto";
import { BlockCard } from "./BlockCard";
import { ImportDropzone } from "./ImportDropzone";
import { SearchBar } from "./SearchBar";

const TOAST_DURATION_MS = 6000;

export class LibraryPanel {
  readonly element: HTMLDivElement;
  private readonly chipsContainer: HTMLDivElement;
  private readonly treeContainer: HTMLDivElement;
  private readonly toastContainer: HTMLDivElement;
  private readonly blockCardsById = new Map<number, BlockCard>();

  constructor(private readonly onSelectBlock: (block: BlockDto) => void) {
    this.element = document.createElement("div");
    this.element.className = "library-panel";

    const searchBar = new SearchBar((query) => void this.handleSearch(query));
    const importDropzone = new ImportDropzone((report) => this.handleImportReport(report));

    this.chipsContainer = document.createElement("div");
    this.chipsContainer.className = "library-panel__chips";

    this.treeContainer = document.createElement("div");
    this.treeContainer.className = "library-panel__tree";

    this.toastContainer = document.createElement("div");
    this.toastContainer.className = "library-panel__toast-container";

    this.element.append(
      searchBar.element,
      importDropzone.element,
      this.chipsContainer,
      this.treeContainer,
      this.toastContainer,
    );

    appStore.subscribe((state) => {
      this.renderChips(state.blocks, state.activeFilter);
      this.renderTree(state.genres, state.blocks);
    });

    void this.loadLibrary();
  }

  private async loadLibrary(): Promise<void> {
    const filter = appStore.getState().activeFilter;
    const [genres, blocks] = await Promise.all([
      callCommand("get_genres_and_categories", {}),
      callCommand("get_blocks", { filter }),
    ]);
    appStore.setState({ genres, blocks });
  }

  private async handleSearch(query: string): Promise<void> {
    appStore.setState({ searchQuery: query });
    const blocks = query.trim()
      ? await callCommand("search_blocks", { query })
      : await callCommand("get_blocks", { filter: appStore.getState().activeFilter });
    appStore.setState({ blocks });
  }

  private async toggleTagFilter(tag: string): Promise<void> {
    const current = appStore.getState().activeFilter;
    const nextFilter: BlockFilter =
      current.tag === tag ? { ...current, tag: undefined } : { ...current, tag };
    appStore.setState({ activeFilter: nextFilter });
    const blocks = await callCommand("get_blocks", { filter: nextFilter });
    appStore.setState({ blocks });
  }

  private handleImportReport(report: ImportReport): void {
    void this.loadLibrary();
    this.showImportToast(report);
  }

  private showImportToast(report: ImportReport): void {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = `${report.inserted.length} blocs importés, ${report.duplicates.length} doublons ignorés grâce au hachage SQLite`;

    if (report.duplicates.length > 0) {
      const list = document.createElement("ul");
      list.className = "toast__duplicates";
      for (const duplicate of report.duplicates) {
        const item = document.createElement("li");
        const link = document.createElement("button");
        link.type = "button";
        link.className = "toast__duplicate-link";
        link.textContent = duplicate.attemptedName;
        link.addEventListener("click", () => {
          this.blockCardsById.get(duplicate.existingBlockId)?.highlight();
        });
        item.appendChild(link);
        list.appendChild(item);
      }
      toast.appendChild(list);
    }

    this.toastContainer.appendChild(toast);
    window.setTimeout(() => toast.remove(), TOAST_DURATION_MS);
  }

  private renderChips(blocks: BlockDto[], activeFilter: BlockFilter): void {
    this.chipsContainer.replaceChildren();

    const tags = new Set<string>();
    for (const block of blocks) {
      for (const tag of (block.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean)) {
        tags.add(tag);
      }
    }

    for (const tag of tags) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (activeFilter.tag === tag ? " chip--active" : "");
      chip.textContent = tag;
      chip.addEventListener("click", () => void this.toggleTagFilter(tag));
      this.chipsContainer.appendChild(chip);
    }
  }

  private renderTree(genres: GenreTreeDto[], blocks: BlockDto[]): void {
    this.treeContainer.replaceChildren();
    this.blockCardsById.clear();

    const sortedGenres = [...genres].sort((a, b) => a.displayOrder - b.displayOrder);

    for (const genre of sortedGenres) {
      const genreEl = document.createElement("details");
      genreEl.className = "library-panel__genre";
      genreEl.open = true;

      const summary = document.createElement("summary");
      summary.textContent = genre.name;
      genreEl.appendChild(summary);

      const uncategorizedBlocks = blocks.filter(
        (block) => block.genreId === genre.id && block.categoryId === null,
      );
      for (const block of uncategorizedBlocks) {
        genreEl.appendChild(this.createBlockCard(block));
      }

      const sortedCategories = [...genre.categories].sort(
        (a, b) => a.displayOrder - b.displayOrder,
      );
      for (const category of sortedCategories) {
        const categoryEl = document.createElement("details");
        categoryEl.className = "library-panel__category";
        categoryEl.open = true;

        const categorySummary = document.createElement("summary");
        categorySummary.textContent = category.name;
        categoryEl.appendChild(categorySummary);

        const categoryBlocks = blocks.filter((block) => block.categoryId === category.id);
        for (const block of categoryBlocks) {
          categoryEl.appendChild(this.createBlockCard(block));
        }

        genreEl.appendChild(categoryEl);
      }

      this.treeContainer.appendChild(genreEl);
    }
  }

  private createBlockCard(block: BlockDto): HTMLDivElement {
    const card = new BlockCard(block, this.onSelectBlock);
    this.blockCardsById.set(block.id, card);
    return card.element;
  }
}
