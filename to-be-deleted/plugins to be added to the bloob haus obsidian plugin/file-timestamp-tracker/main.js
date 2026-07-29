const {
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  Notice,
} = require("obsidian");

const DEFAULT_SETTINGS = {
  enableCreatedTracking: true,
  enableUpdateTracking: true,
  minCharacterChange: 20,
  excludedFolders: ["_media", "templates"],
  // How many seconds old a file can be to still be considered "just created"
  creationTimeThreshold: 30,
};

module.exports = class FileTimestampTrackerPlugin extends Plugin {
  constructor() {
    super(...arguments);
    this.fileSnapshots = new Map();
    this.isReady = false;
  }

  async onload() {
    await this.loadSettings();

    // IMPORTANT: Delay plugin initialization to avoid interfering with other plugins
    // and to ensure Obsidian has finished its startup indexing
    this.app.workspace.onLayoutReady(() => {
      // Additional delay to let other plugins initialize first
      setTimeout(() => {
        this.isReady = true;
        console.log("File Timestamp Tracker: Ready and listening for events");
      }, 2000); // 2 second delay after layout is ready
    });

    // Register event for file creation
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (!this.isReady) {
          // Ignore create events during startup - these are usually indexing events
          console.log(
            `File Timestamp Tracker: Ignoring create event during startup for ${file.path}`,
          );
          return;
        }
        if (file instanceof TFile && file.extension === "md") {
          this.handleFileCreation(file);
        }
      }),
    );

    // Register event for file modification (on save)
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (!this.isReady) {
          // Ignore modify events during startup
          return;
        }
        if (file instanceof TFile && file.extension === "md") {
          this.handleFileModification(file);
        }
      }),
    );

    // Add settings tab
    this.addSettingTab(new FileTimestampTrackerSettingTab(this.app, this));

    console.log(
      "File Timestamp Tracker plugin loaded (waiting for layout ready)",
    );
  }

  onunload() {
    console.log("File Timestamp Tracker plugin unloaded");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  shouldExcludeFile(file) {
    for (const folder of this.settings.excludedFolders) {
      if (file.path.startsWith(folder)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if the file was actually just created (not just indexed)
   * by comparing the file's creation time to the current time
   */
  isFileActuallyNew(file) {
    const now = Date.now();
    const fileCreationTime = file.stat.ctime;
    const ageInSeconds = (now - fileCreationTime) / 1000;

    // Only consider a file "new" if it was created within the threshold
    const isNew = ageInSeconds <= this.settings.creationTimeThreshold;

    if (!isNew) {
      console.log(
        `File Timestamp Tracker: File ${file.path} is ${ageInSeconds.toFixed(1)}s old, not considered new`,
      );
    }

    return isNew;
  }

  async handleFileCreation(file) {
    if (!this.settings.enableCreatedTracking || this.shouldExcludeFile(file)) {
      return;
    }

    // CRITICAL: Verify the file was actually just created
    if (!this.isFileActuallyNew(file)) {
      console.log(
        `File Timestamp Tracker: Skipping created date for ${file.path} - file is not actually new`,
      );
      return;
    }

    // Small delay to ensure file is fully created
    setTimeout(async () => {
      try {
        const today = this.getTodayDateString();

        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
          // Only add 'created' if it doesn't already exist
          if (!frontmatter.created) {
            frontmatter.created = today;
            console.log(
              `File Timestamp Tracker: Added created date to ${file.path}`,
            );
          }

          // Initialize last_updated as empty array if it doesn't exist
          if (!frontmatter.last_updated) {
            frontmatter.last_updated = [];
          }
        });

        // Take initial snapshot
        const content = await this.app.vault.read(file);
        this.fileSnapshots.set(file.path, {
          content: content,
          lastDateAdded: today,
        });
      } catch (error) {
        console.error("Error adding created timestamp:", error);
      }
    }, 100);
  }

  async handleFileModification(file) {
    if (!this.settings.enableUpdateTracking || this.shouldExcludeFile(file)) {
      return;
    }

    try {
      const today = this.getTodayDateString();
      const currentContent = await this.app.vault.read(file);

      // Get or initialize snapshot
      let snapshot = this.fileSnapshots.get(file.path);
      if (!snapshot) {
        // First time seeing this file, initialize snapshot
        snapshot = {
          content: currentContent,
          lastDateAdded: today,
        };
        this.fileSnapshots.set(file.path, snapshot);
        return; // Don't process on first snapshot, just record it
      }

      // Calculate character difference
      const charDifference = this.calculateCharacterDifference(
        snapshot.content,
        currentContent,
      );

      // Check if we should add today's date
      if (charDifference >= this.settings.minCharacterChange) {
        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
          // Ensure last_updated exists and is an array
          if (!frontmatter.last_updated) {
            frontmatter.last_updated = [];
          } else if (!Array.isArray(frontmatter.last_updated)) {
            // Convert to array if it's a single value
            frontmatter.last_updated = [frontmatter.last_updated];
          }

          // Add today's date if not already present
          if (!frontmatter.last_updated.includes(today)) {
            frontmatter.last_updated.push(today);

            // Update snapshot
            snapshot.content = currentContent;
            snapshot.lastDateAdded = today;
          }
        });
      }
    } catch (error) {
      console.error("Error updating last_updated timestamp:", error);
    }
  }

  calculateCharacterDifference(oldContent, newContent) {
    // Remove frontmatter from both for comparison (only compare body content)
    const oldBody = this.removeFrontmatter(oldContent);
    const newBody = this.removeFrontmatter(newContent);

    // Simple character difference
    const lengthDiff = Math.abs(newBody.length - oldBody.length);

    // If length is the same, check how many characters actually changed
    if (lengthDiff === 0) {
      let changedChars = 0;
      const minLength = Math.min(oldBody.length, newBody.length);
      for (let i = 0; i < minLength; i++) {
        if (oldBody[i] !== newBody[i]) {
          changedChars++;
        }
      }
      return changedChars;
    }

    return lengthDiff;
  }

  removeFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
    return content.replace(frontmatterRegex, "");
  }

  getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Remove created dates matching a specific date from all markdown files
   * @param {string} targetDate - The date to match (in YYYY-MM-DD format) or "all" to remove all
   */
  async removeCreatedDates(targetDate) {
    const files = this.app.vault.getMarkdownFiles();
    let removedCount = 0;
    let errorCount = 0;

    for (const file of files) {
      if (this.shouldExcludeFile(file)) continue;

      try {
        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
          if (frontmatter.created) {
            if (targetDate === "all" || frontmatter.created === targetDate) {
              delete frontmatter.created;
              removedCount++;
            }
          }
        });
      } catch (error) {
        console.error(`Error removing created date from ${file.path}:`, error);
        errorCount++;
      }
    }

    return { removedCount, errorCount, totalFiles: files.length };
  }

  /**
   * Remove last_updated entries matching a specific date from all markdown files
   * @param {string} targetDate - The date to match (in YYYY-MM-DD format) or "all" to remove all
   */
  async removeLastUpdatedDates(targetDate) {
    const files = this.app.vault.getMarkdownFiles();
    let removedCount = 0;
    let errorCount = 0;

    for (const file of files) {
      if (this.shouldExcludeFile(file)) continue;

      try {
        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
          if (frontmatter.last_updated) {
            if (targetDate === "all") {
              delete frontmatter.last_updated;
              removedCount++;
            } else if (Array.isArray(frontmatter.last_updated)) {
              const originalLength = frontmatter.last_updated.length;
              frontmatter.last_updated = frontmatter.last_updated.filter(
                (date) => date !== targetDate,
              );
              if (frontmatter.last_updated.length < originalLength) {
                removedCount++;
              }
              // Clean up empty arrays
              if (frontmatter.last_updated.length === 0) {
                delete frontmatter.last_updated;
              }
            } else if (frontmatter.last_updated === targetDate) {
              delete frontmatter.last_updated;
              removedCount++;
            }
          }
        });
      } catch (error) {
        console.error(
          `Error removing last_updated date from ${file.path}:`,
          error,
        );
        errorCount++;
      }
    }

    return { removedCount, errorCount, totalFiles: files.length };
  }
};

class FileTimestampTrackerSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.customDate = plugin.getTodayDateString();
  }

  display() {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "File Timestamp Tracker Settings" });

    // === Basic Settings ===
    new Setting(containerEl)
      .setName("Enable created date tracking")
      .setDesc('Automatically add "created" date to new files')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableCreatedTracking)
          .onChange(async (value) => {
            this.plugin.settings.enableCreatedTracking = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Enable update tracking")
      .setDesc(
        'Automatically track "last_updated" dates when files are modified',
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableUpdateTracking)
          .onChange(async (value) => {
            this.plugin.settings.enableUpdateTracking = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Minimum character change")
      .setDesc(
        "Minimum number of characters changed to trigger an update entry (default: 20)",
      )
      .addText((text) =>
        text
          .setPlaceholder("20")
          .setValue(String(this.plugin.settings.minCharacterChange))
          .onChange(async (value) => {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue > 0) {
              this.plugin.settings.minCharacterChange = numValue;
              await this.plugin.saveSettings();
            }
          }),
      );

    new Setting(containerEl)
      .setName("Creation time threshold (seconds)")
      .setDesc(
        "Only add 'created' date if file was created within this many seconds. Prevents false positives from file indexing. (default: 30)",
      )
      .addText((text) =>
        text
          .setPlaceholder("30")
          .setValue(String(this.plugin.settings.creationTimeThreshold))
          .onChange(async (value) => {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue > 0) {
              this.plugin.settings.creationTimeThreshold = numValue;
              await this.plugin.saveSettings();
            }
          }),
      );

    new Setting(containerEl)
      .setName("Excluded folders")
      .setDesc(
        "Comma-separated list of folders to exclude from tracking (e.g., _media,templates)",
      )
      .addText((text) =>
        text
          .setPlaceholder("_media,templates")
          .setValue(this.plugin.settings.excludedFolders.join(","))
          .onChange(async (value) => {
            this.plugin.settings.excludedFolders = value
              .split(",")
              .map((f) => f.trim())
              .filter((f) => f.length > 0);
            await this.plugin.saveSettings();
          }),
      );

    // === Bug Bandaid Section ===
    containerEl.createEl("h3", {
      text: "🩹 Bug Bandaid - Remove Incorrect Dates",
    });

    containerEl.createEl("p", {
      text: "Use these tools to remove incorrectly added dates from your files.",
      cls: "setting-item-description",
    });

    // Remove created dates for today
    new Setting(containerEl)
      .setName("Remove today's created dates")
      .setDesc(
        `Remove 'created' field from all files where it equals today (${this.plugin.getTodayDateString()}). Use this if the plugin incorrectly added today as the creation date.`,
      )
      .addButton((button) =>
        button
          .setButtonText("Remove Today's Created Dates")
          .setWarning()
          .onClick(async () => {
            const today = this.plugin.getTodayDateString();
            const result = await this.plugin.removeCreatedDates(today);
            new Notice(
              `Removed 'created: ${today}' from ${result.removedCount} files. ${result.errorCount > 0 ? `${result.errorCount} errors.` : ""}`,
            );
          }),
      );

    // Custom date removal for created
    new Setting(containerEl)
      .setName("Remove created dates for specific date")
      .setDesc(
        "Enter a date (YYYY-MM-DD) to remove all matching 'created' fields",
      )
      .addText((text) =>
        text
          .setPlaceholder("YYYY-MM-DD")
          .setValue(this.customDate)
          .onChange((value) => {
            this.customDate = value;
          }),
      )
      .addButton((button) =>
        button
          .setButtonText("Remove")
          .setWarning()
          .onClick(async () => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(this.customDate)) {
              new Notice("Invalid date format. Please use YYYY-MM-DD");
              return;
            }
            const result = await this.plugin.removeCreatedDates(
              this.customDate,
            );
            new Notice(
              `Removed 'created: ${this.customDate}' from ${result.removedCount} files. ${result.errorCount > 0 ? `${result.errorCount} errors.` : ""}`,
            );
          }),
      );

    // Remove all created dates
    new Setting(containerEl)
      .setName("Remove ALL created dates")
      .setDesc(
        "⚠️ DANGER: Remove 'created' field from ALL markdown files. This cannot be undone!",
      )
      .addButton((button) =>
        button
          .setButtonText("Remove All Created Dates")
          .setWarning()
          .onClick(async () => {
            // Confirm with user
            const confirmed = confirm(
              "Are you sure you want to remove ALL 'created' dates from all markdown files? This cannot be undone!",
            );
            if (confirmed) {
              const result = await this.plugin.removeCreatedDates("all");
              new Notice(
                `Removed 'created' from ${result.removedCount} files. ${result.errorCount > 0 ? `${result.errorCount} errors.` : ""}`,
              );
            }
          }),
      );

    // Separator
    containerEl.createEl("hr");

    // Remove last_updated dates for today
    new Setting(containerEl)
      .setName("Remove today's last_updated entries")
      .setDesc(
        `Remove today's date (${this.plugin.getTodayDateString()}) from 'last_updated' arrays in all files.`,
      )
      .addButton((button) =>
        button
          .setButtonText("Remove Today's Updates")
          .setWarning()
          .onClick(async () => {
            const today = this.plugin.getTodayDateString();
            const result = await this.plugin.removeLastUpdatedDates(today);
            new Notice(
              `Removed '${today}' from last_updated in ${result.removedCount} files. ${result.errorCount > 0 ? `${result.errorCount} errors.` : ""}`,
            );
          }),
      );

    // Remove all last_updated dates
    new Setting(containerEl)
      .setName("Remove ALL last_updated fields")
      .setDesc(
        "⚠️ DANGER: Remove entire 'last_updated' field from ALL markdown files. This cannot be undone!",
      )
      .addButton((button) =>
        button
          .setButtonText("Remove All Updates")
          .setWarning()
          .onClick(async () => {
            const confirmed = confirm(
              "Are you sure you want to remove ALL 'last_updated' fields from all markdown files? This cannot be undone!",
            );
            if (confirmed) {
              const result = await this.plugin.removeLastUpdatedDates("all");
              new Notice(
                `Removed 'last_updated' from ${result.removedCount} files. ${result.errorCount > 0 ? `${result.errorCount} errors.` : ""}`,
              );
            }
          }),
      );

    // Info section
    containerEl.createEl("hr");
    containerEl.createEl("p", {
      text: "Note: This plugin only tracks changes to markdown files (.md). Frontmatter is excluded from character change calculations.",
      cls: "setting-item-description",
    });
  }
}
