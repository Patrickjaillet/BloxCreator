import { callCommand } from "../api/ipc";
import type { BlockDto } from "../types/dto";
import { insertBeforeMainImage } from "./editorContent";
import { appStore } from "./store";

export async function refreshLibrary(): Promise<void> {
  const filter = appStore.getState().activeFilter;
  const [genres, blocks] = await Promise.all([
    callCommand("get_genres_and_categories", {}),
    callCommand("get_blocks", { filter }),
  ]);
  appStore.setState({ genres, blocks });
}

export function integrateBlockIntoEditor(block: BlockDto): void {
  const current = appStore.getState().monacoContent;
  const next =
    block.blockKind === "main_body"
      ? block.codeRaw
      : insertBeforeMainImage(current, block.codeRaw);
  appStore.setState({ monacoContent: next });
}
