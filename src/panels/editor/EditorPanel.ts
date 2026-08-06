import { callCommand } from "../../api/ipc";
import { refreshLibrary } from "../../state/libraryActions";
import { appStore } from "../../state/store";
import type { BlockKind, DecomposedFragmentDto, NewBlockRequest } from "../../types/dto";
import { AssemblerTab } from "./AssemblerTab";
import { MonacoHost } from "./MonacoHost";

type EditorTab = "editor" | "assembler";

const BLOCK_KIND_OPTIONS: BlockKind[] = [
  "function",
  "struct",
  "main_body",
  "global_declaration",
  "snippet",
];

interface FragmentRowRefs {
  fragment: DecomposedFragmentDto;
  rowElement: HTMLDivElement;
  include: HTMLInputElement;
  genreSelect: HTMLSelectElement;
  kindSelect: HTMLSelectElement;
  nameInput: HTMLInputElement;
  roleInput: HTMLInputElement;
  adaptationInput: HTMLInputElement;
  summaryInput: HTMLInputElement;
}

export class EditorPanel {
  readonly element: HTMLDivElement;
  private readonly editorTabButton: HTMLButtonElement;
  private readonly assemblerTabButton: HTMLButtonElement;
  private readonly editorTabContent: HTMLDivElement;
  private readonly assemblerTabContent: HTMLDivElement;
  private readonly monacoHost: MonacoHost;
  private readonly assemblerTab: AssemblerTab;

  constructor(onAssemblerInject: () => void) {
    this.element = document.createElement("div");
    this.element.className = "editor-panel";

    const tabBar = document.createElement("div");
    tabBar.className = "editor-panel__tabs";

    this.editorTabButton = document.createElement("button");
    this.editorTabButton.type = "button";
    this.editorTabButton.textContent = "Editor";
    this.editorTabButton.addEventListener("click", () => this.switchTab("editor"));

    this.assemblerTabButton = document.createElement("button");
    this.assemblerTabButton.type = "button";
    this.assemblerTabButton.textContent = "Assembler";
    this.assemblerTabButton.addEventListener("click", () => this.switchTab("assembler"));

    tabBar.append(this.editorTabButton, this.assemblerTabButton);

    this.editorTabContent = document.createElement("div");
    this.editorTabContent.className = "editor-panel__editor-tab";

    this.assemblerTabContent = document.createElement("div");
    this.assemblerTabContent.className = "editor-panel__assembler-tab";

    this.assemblerTab = new AssemblerTab(onAssemblerInject);
    this.assemblerTabContent.appendChild(this.assemblerTab.element);

    this.monacoHost = new MonacoHost(appStore.getState().monacoContent, (value) => {
      appStore.setState({ monacoContent: value });
    });

    const decomposeButton = document.createElement("button");
    decomposeButton.type = "button";
    decomposeButton.className = "editor-panel__decompose-button";
    decomposeButton.textContent = "Decompose";
    decomposeButton.addEventListener("click", () => void this.handleDecompose());

    this.editorTabContent.append(this.monacoHost.element, decomposeButton);

    this.element.append(tabBar, this.editorTabContent, this.assemblerTabContent);

    appStore.subscribe((state) => {
      this.monacoHost.setValue(state.monacoContent);
      this.monacoHost.setCompileErrors(state.compileErrors);
    });

    this.switchTab("editor");
  }

  revealLine(line: number): void {
    this.switchTab("editor");
    this.monacoHost.revealLine(line);
  }

  private switchTab(tab: EditorTab): void {
    this.editorTabContent.style.display = tab === "editor" ? "" : "none";
    this.assemblerTabContent.style.display = tab === "assembler" ? "" : "none";
    this.editorTabButton.classList.toggle("editor-panel__tab--active", tab === "editor");
    this.assemblerTabButton.classList.toggle("editor-panel__tab--active", tab === "assembler");
    if (tab === "assembler") {
      void this.assemblerTab.refreshPalette();
    }
  }

  private async handleDecompose(): Promise<void> {
    const code = this.monacoHost.getValue();
    if (!code.trim()) {
      return;
    }
    const fragments = await callCommand("decompose_monaco_content", { code });
    this.showFragmentReviewModal(fragments);
  }

  private showFragmentReviewModal(fragments: DecomposedFragmentDto[]): void {
    const genres = appStore.getState().genres;

    const overlay = document.createElement("div");
    overlay.className = "fragment-review-modal__overlay";

    const modal = document.createElement("div");
    modal.className = "fragment-review-modal";

    const title = document.createElement("h2");
    title.textContent = `${fragments.length} fragment(s) detected — review before import`;
    modal.appendChild(title);

    const rows: FragmentRowRefs[] = fragments.map((fragment) =>
      this.buildFragmentRow(fragment, genres),
    );
    for (const row of rows) {
      modal.appendChild(row.rowElement);
    }

    const actions = document.createElement("div");
    actions.className = "fragment-review-modal__actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => overlay.remove());

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.textContent = "Confirm import";
    confirmButton.addEventListener("click", () => void this.confirmFragments(rows, overlay));

    actions.append(cancelButton, confirmButton);
    modal.appendChild(actions);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  private buildFragmentRow(
    fragment: DecomposedFragmentDto,
    genres: { id: number; name: string }[],
  ): FragmentRowRefs {
    const row = document.createElement("div");
    row.className = "fragment-review-modal__row";

    const include = document.createElement("input");
    include.type = "checkbox";
    include.checked = fragment.kind !== "snippet";

    const preview = document.createElement("pre");
    preview.className = "fragment-review-modal__code";
    preview.textContent = fragment.codeRaw;

    const kindSelect = document.createElement("select");
    for (const kind of BLOCK_KIND_OPTIONS) {
      const option = document.createElement("option");
      option.value = kind;
      option.textContent = kind;
      option.selected = kind === fragment.kind;
      kindSelect.appendChild(option);
    }

    const genreSelect = document.createElement("select");
    for (const genre of genres) {
      const option = document.createElement("option");
      option.value = String(genre.id);
      option.textContent = genre.name;
      genreSelect.appendChild(option);
    }

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Name";
    nameInput.value = fragment.name ?? "";

    const roleInput = document.createElement("input");
    roleInput.type = "text";
    roleInput.placeholder = "Role";

    const adaptationInput = document.createElement("input");
    adaptationInput.type = "text";
    adaptationInput.placeholder = "Adaptation";

    const summaryInput = document.createElement("input");
    summaryInput.type = "text";
    summaryInput.placeholder = "Summary";

    row.append(
      include,
      kindSelect,
      genreSelect,
      nameInput,
      roleInput,
      adaptationInput,
      summaryInput,
      preview,
    );

    return {
      fragment,
      rowElement: row,
      include,
      genreSelect,
      kindSelect,
      nameInput,
      roleInput,
      adaptationInput,
      summaryInput,
    };
  }

  private async confirmFragments(rows: FragmentRowRefs[], overlay: HTMLDivElement): Promise<void> {
    const requests: NewBlockRequest[] = rows
      .filter((row) => row.include.checked && row.genreSelect.value !== "")
      .map((row) => ({
        name: row.nameInput.value.trim() || "Untitled block",
        genreId: Number(row.genreSelect.value),
        role: row.roleInput.value.trim(),
        adaptation: row.adaptationInput.value.trim(),
        summary: row.summaryInput.value.trim(),
        codeRaw: row.fragment.codeRaw,
        blockKind: row.kindSelect.value as BlockKind,
        sourceOrigin: "monaco_decomposition",
      }));

    if (requests.length === 0) {
      overlay.remove();
      return;
    }

    await callCommand("confirm_fragment_import", { fragments: requests });
    await refreshLibrary();
    await this.assemblerTab.refreshPalette();
    overlay.remove();
  }
}
