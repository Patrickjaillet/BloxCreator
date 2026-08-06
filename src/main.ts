import { AboutTab } from "./about/AboutTab";
import { callCommand } from "./api/ipc";
import { EditorPanel } from "./panels/editor/EditorPanel";
import { LibraryPanel } from "./panels/library/LibraryPanel";
import { ViewportPanel } from "./panels/viewport/ViewportPanel";
import { registerShortcuts } from "./shortcuts";
import { saveCurrentShader } from "./state/shaderActions";
import { appStore } from "./state/store";

async function bootstrap(): Promise<void> {
  const appVersion = await callCommand("get_app_version", {});
  document.title = `Blox Creator v${appVersion}`;

  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) {
    return;
  }
  root.replaceChildren();

  const topBar = document.createElement("div");
  topBar.className = "app-top-bar";
  const aboutTab = new AboutTab();
  topBar.appendChild(aboutTab.element);

  const panelsRow = document.createElement("div");
  panelsRow.className = "app-panels-row";

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

  panelsRow.append(libraryPanel.element, editorPanel.element, viewportPanel.element);
  root.append(topBar, panelsRow);

  registerShortcuts({
    compileAndRun: () => viewportPanel?.compileAndRun(),
    saveShader: () => void saveCurrentShader(),
    sendAssemblyToEditor: () => editorPanel?.injectAssemblerOutput(),
    focusLibrarySearch: () => libraryPanel.focusSearch(),
    toggleViewportPlay: () => viewportPanel?.togglePlay(),
    resetViewportTime: () => viewportPanel?.resetTime(),
  });
}

window.addEventListener("DOMContentLoaded", () => {
  void bootstrap();
});
