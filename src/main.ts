import { callCommand } from "./api/ipc";
import { EditorPanel } from "./panels/editor/EditorPanel";
import { LibraryPanel } from "./panels/library/LibraryPanel";
import { ViewportPanel } from "./panels/viewport/ViewportPanel";
import { appStore } from "./state/store";

async function bootstrap(): Promise<void> {
  const appVersion = await callCommand("get_app_version", {});
  document.title = `Blox Creator v${appVersion}`;

  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) {
    return;
  }
  root.replaceChildren();

  const libraryPanel = new LibraryPanel((block) => {
    appStore.setState({ monacoContent: block.codeRaw });
  });
  const editorPanel = new EditorPanel();
  const viewportPanel = new ViewportPanel((line) => editorPanel.revealLine(line));

  root.append(libraryPanel.element, editorPanel.element, viewportPanel.element);
}

window.addEventListener("DOMContentLoaded", () => {
  void bootstrap();
});
