import { getCurrentWebview } from "@tauri-apps/api/webview";

import { callCommand } from "../../api/ipc";
import type { ImportReport } from "../../types/dto";

export class ImportDropzone {
  readonly element: HTMLDivElement;
  private readonly textarea: HTMLTextAreaElement;
  private unlisten: (() => void) | undefined;

  constructor(private readonly onImportComplete: (report: ImportReport) => void) {
    this.element = document.createElement("div");
    this.element.className = "import-dropzone";

    const hint = document.createElement("p");
    hint.className = "import-dropzone__hint";
    hint.textContent = "Drop a .md library file here";
    this.element.appendChild(hint);

    this.textarea = document.createElement("textarea");
    this.textarea.className = "import-dropzone__paste";
    this.textarea.placeholder = "...or paste Markdown content directly";
    this.element.appendChild(this.textarea);

    const importButton = document.createElement("button");
    importButton.type = "button";
    importButton.textContent = "Import pasted content";
    importButton.addEventListener("click", () => void this.importPastedContent());
    this.element.appendChild(importButton);

    void this.registerDropHandler();
  }

  private async registerDropHandler(): Promise<void> {
    this.unlisten = await getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type !== "drop") {
        return;
      }
      const markdownPaths = event.payload.paths.filter((path) =>
        path.toLowerCase().endsWith(".md"),
      );
      for (const path of markdownPaths) {
        void this.importFile(path);
      }
    });
  }

  private async importFile(path: string): Promise<void> {
    const report = await callCommand("import_markdown_file", { path });
    this.onImportComplete(report);
  }

  private async importPastedContent(): Promise<void> {
    const content = this.textarea.value.trim();
    if (!content) {
      return;
    }
    const report = await callCommand("import_markdown_content", {
      content,
      sourceLabel: "pasted-content",
    });
    this.textarea.value = "";
    this.onImportComplete(report);
  }

  dispose(): void {
    this.unlisten?.();
  }
}
