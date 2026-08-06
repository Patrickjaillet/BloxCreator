import { invoke } from "@tauri-apps/api/core";

async function bootstrap(): Promise<void> {
  const appVersion = await invoke<string>("get_app_version");
  const root = document.querySelector<HTMLDivElement>("#app");
  if (root) {
    root.textContent = `Blox Creator v${appVersion}`;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  void bootstrap();
});
