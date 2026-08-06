import { callCommand } from "../api/ipc";
import { appStore } from "./store";

export async function refreshLibrary(): Promise<void> {
  const filter = appStore.getState().activeFilter;
  const [genres, blocks] = await Promise.all([
    callCommand("get_genres_and_categories", {}),
    callCommand("get_blocks", { filter }),
  ]);
  appStore.setState({ genres, blocks });
}
