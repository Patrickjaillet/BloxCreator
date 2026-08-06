import { callCommand } from "./api/ipc";

async function bootstrap(): Promise<void> {
  const appVersion = await callCommand("get_app_version", {});
  const root = document.querySelector<HTMLDivElement>("#app");
  if (root) {
    root.textContent = `Blox Creator v${appVersion}`;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  void bootstrap();
});
