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

  // EditorPanel and ViewportPanel each need a callback into the other
  // (inject-and-run, click-error-to-reveal-line); both closures resolve once
  // both panels are constructed below.
  let viewportPanel: ViewportPanel | undefined;
  let editorPanel: EditorPanel | undefined;

  editorPanel = new EditorPanel(() => viewportPanel?.compileAndRun());
  viewportPanel = new ViewportPanel((line) => editorPanel?.revealLine(line));

  root.append(libraryPanel.element, editorPanel.element, viewportPanel.element);
}

window.addEventListener("DOMContentLoaded", () => {
  void bootstrap();
});
