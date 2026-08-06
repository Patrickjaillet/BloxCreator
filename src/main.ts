import { callCommand } from "./api/ipc";
import { LibraryPanel } from "./panels/library/LibraryPanel";
import type { BlockDto } from "./types/dto";

async function bootstrap(): Promise<void> {
  const appVersion = await callCommand("get_app_version", {});
  document.title = `Blox Creator v${appVersion}`;

  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) {
    return;
  }
  root.replaceChildren();

  // Wired to the editor/assembler selection in a later phase.
  const libraryPanel = new LibraryPanel((block: BlockDto) => {
    console.log("selected block", block.id, block.name);
  });
  root.appendChild(libraryPanel.element);
}

window.addEventListener("DOMContentLoaded", () => {
  void bootstrap();
});
