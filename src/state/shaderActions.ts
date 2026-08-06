import { callCommand } from "../api/ipc";
import { appStore } from "./store";

/** Ctrl+S (spec 9): persist the current Monaco content as a shader. */
export async function saveCurrentShader(): Promise<void> {
  const name = window.prompt("Shader name?");
  if (!name || !name.trim()) {
    return;
  }

  const state = appStore.getState();
  const blockIdsOrdered = state.assemblerSelection.map((entry) => entry.blockId);

  await callCommand("save_shader", {
    name: name.trim(),
    code: state.monacoContent,
    blockIdsOrdered,
  });
}
