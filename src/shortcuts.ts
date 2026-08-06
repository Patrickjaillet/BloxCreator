export interface ShortcutHandlers {
  compileAndRun: () => void;
  saveShader: () => void;
  sendAssemblyToEditor: () => void;
  focusLibrarySearch: () => void;
  toggleViewportPlay: () => void;
  resetViewportTime: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function registerShortcuts(handlers: ShortcutHandlers): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    const ctrl = event.ctrlKey || event.metaKey;

    if (ctrl && event.shiftKey && event.key.toLowerCase() === "a") {
      event.preventDefault();
      handlers.sendAssemblyToEditor();
      return;
    }
    if (ctrl && !event.shiftKey && event.key === "Enter") {
      event.preventDefault();
      handlers.compileAndRun();
      return;
    }
    if (ctrl && !event.shiftKey && event.key.toLowerCase() === "s") {
      event.preventDefault();
      handlers.saveShader();
      return;
    }
    if (ctrl && !event.shiftKey && event.key.toLowerCase() === "f") {
      event.preventDefault();
      handlers.focusLibrarySearch();
      return;
    }
    if (ctrl && !event.shiftKey && event.key.toLowerCase() === "r") {
      event.preventDefault();
      handlers.resetViewportTime();
      return;
    }
    if (!ctrl && event.key === " " && !isEditableTarget(event.target)) {
      event.preventDefault();
      handlers.toggleViewportPlay();
    }
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}
