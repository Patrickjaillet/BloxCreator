import { callCommand } from "../api/ipc";

const COPYRIGHT_HOLDER = "Patrick JAILLET";
const CONTACT_EMAIL = "sandefjord.development@proton.me";
const WEBSITE_URL = "https://patrickjaillet.github.io/sandefjord-software";

export class AboutTab {
  readonly element: HTMLButtonElement;

  constructor() {
    this.element = document.createElement("button");
    this.element.type = "button";
    this.element.className = "about-tab__trigger";
    this.element.textContent = "About";
    this.element.addEventListener("click", () => void this.openModal());
  }

  private async openModal(): Promise<void> {
    const version = await callCommand("get_app_version", {});

    const overlay = document.createElement("div");
    overlay.className = "about-modal__overlay";
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        overlay.remove();
      }
    });

    const modal = document.createElement("div");
    modal.className = "about-modal";

    const title = document.createElement("h2");
    title.textContent = "Blox Creator";
    modal.appendChild(title);

    const versionLine = document.createElement("p");
    versionLine.textContent = `Version ${version}`;
    modal.appendChild(versionLine);

    const copyrightLine = document.createElement("p");
    copyrightLine.textContent = `Copyright © 2026 ${COPYRIGHT_HOLDER} — Tous droits réservés`;
    modal.appendChild(copyrightLine);

    const emailLine = document.createElement("p");
    const emailLink = document.createElement("a");
    emailLink.href = `mailto:${CONTACT_EMAIL}`;
    emailLink.textContent = CONTACT_EMAIL;
    emailLine.append("E-mail : ", emailLink);
    modal.appendChild(emailLine);

    const websiteLine = document.createElement("p");
    const websiteLink = document.createElement("a");
    websiteLink.href = WEBSITE_URL;
    websiteLink.target = "_blank";
    websiteLink.rel = "noopener noreferrer";
    websiteLink.textContent = WEBSITE_URL;
    websiteLine.append("Site web : ", websiteLink);
    modal.appendChild(websiteLine);

    const licenseLine = document.createElement("p");
    licenseLine.textContent = "Distributed under the MIT license.";
    modal.appendChild(licenseLine);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "about-modal__close-button";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", () => overlay.remove());
    modal.appendChild(closeButton);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }
}
