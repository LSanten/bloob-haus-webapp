const { Plugin, Notice } = require("obsidian");

module.exports = class CopyLinkButtonPlugin extends Plugin {
  async onload() {
    // Add the button to the ribbon (left sidebar)
    this.addRibbonIcon("link", "Copy Page Link", async () => {
      await this.copyLinkToClipboard();
    });

    // Add a command that can be triggered via command palette
    this.addCommand({
      id: "copy-page-link",
      name: "Copy page link",
      callback: async () => {
        await this.copyLinkToClipboard();
      },
    });

    // Add button to editor view
    this.registerMarkdownPostProcessor((element, context) => {
      // This runs for each markdown view
    });

    // Add button to the title bar of each note
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.addButtonToTitleBar();
      }),
    );

    // Initial button addition
    this.addButtonToTitleBar();
  }

  addButtonToTitleBar() {
    // Remove any existing buttons first
    const existingButtons = document.querySelectorAll(".copy-link-button");
    existingButtons.forEach((btn) => btn.remove());

    // Get the active file
    const file = this.app.workspace.getActiveFile();
    if (!file) return;

    // Find the title bar container
    const titleContainers = document.querySelectorAll(
      ".view-header-title-container",
    );

    titleContainers.forEach((container) => {
      // Create the button
      const button = document.createElement("button");
      button.className = "copy-link-button clickable-icon";
      button.setAttribute("aria-label", "Copy page link");
      button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
            `;

      button.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await this.copyLinkToClipboard();
      });

      // Insert the button
      container.appendChild(button);
    });
  }

  async copyLinkToClipboard() {
    const file = this.app.workspace.getActiveFile();

    if (!file) {
      new Notice("No active file");
      return;
    }

    // Get filename without extension
    const filename = file.basename;

    // Get the folder path (e.g., "recipes" from "recipes/Challah.md")
    const folderPath = file.parent?.path || "";

    // Slugify the filename using Hugo's convention:
    // - lowercase
    // - remove special characters (keep a-z, 0-9, spaces, hyphens)
    // - replace spaces with hyphens
    // - collapse multiple hyphens
    // - remove leading/trailing hyphens
    const slug = filename
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Build URL with folder prefix if in a subfolder
    const urlPath = folderPath ? `/${folderPath}/${slug}/` : `/${slug}/`;
    const url = `https://buffbaby.bloob.haus${urlPath}`;

    // Copy to clipboard
    await navigator.clipboard.writeText(url);

    new Notice(`Copied: ${url}`);
  }

  onunload() {
    // Clean up buttons
    const existingButtons = document.querySelectorAll(".copy-link-button");
    existingButtons.forEach((btn) => btn.remove());
  }
};
