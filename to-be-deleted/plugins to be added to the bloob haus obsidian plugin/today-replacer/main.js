"use strict";

var obsidian = require("obsidian");

const DEFAULT_SETTINGS = {
  replacements: [
    { trigger: "TODAY", format: "YYYY-MM-DD" },
    { trigger: "DATE", format: "YYYY-MM-DD" },
    { trigger: "TIME", format: "HH:mm:ss A" },
    { trigger: "WDATE", format: "YYYY-MM-DD, dddd" },
    { trigger: "TDATE", format: "# YYYY-MM-DD" },
    { trigger: "TTDATE", format: "## YYYY-MM-DD" },
  ],
};

class TodayReplacerPlugin extends obsidian.Plugin {
  async onload() {
    console.log("Loading TODAY Replacer Plugin");

    await this.loadSettings();

    // Add settings tab
    this.addSettingTab(new TodayReplacerSettingTab(this.app, this));

    // Register event for typing in editor
    this.registerEvent(
      this.app.workspace.on("editor-change", (editor, view) => {
        this.replaceToday(editor);
        // Also check if we're editing the first line (which affects filename)
        this.checkFirstLineForRename(editor, view);
      }),
    );

    // Register event for file creation to handle filename replacement
    this.registerEvent(
      this.app.vault.on("create", async (file) => {
        await this.processFilename(file);
      }),
    );

    // Register event for file rename to handle filename replacement
    this.registerEvent(
      this.app.vault.on("rename", async (file, oldPath) => {
        await this.processFilename(file);
      }),
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  replaceToday(editor) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    let newLine = line;

    // Sort replacements by length (longest first) to avoid partial matches
    const sortedReplacements = [...this.settings.replacements].sort(
      (a, b) => (b.trigger || "").length - (a.trigger || "").length,
    );

    // Apply all configured replacements
    for (const replacement of sortedReplacements) {
      if (replacement.trigger && newLine.contains(replacement.trigger)) {
        try {
          const regex = new RegExp(replacement.trigger, "g");
          const value = window.moment().format(replacement.format);
          newLine = newLine.replace(regex, value);
        } catch (e) {
          console.error("Invalid regex/format in replacement:", replacement);
        }
      }
    }

    // Only update if something changed
    if (newLine !== line) {
      editor.setLine(cursor.line, newLine);
    }
  }

  async processFilename(file) {
    // Skip if not a file we can rename
    if (!(file instanceof obsidian.TFile)) return;

    let newName = file.name;
    const now = window.moment();
    let changed = false;

    // Sort replacements by length (longest first) to avoid partial matches
    const sortedReplacements = [...this.settings.replacements].sort(
      (a, b) => (b.trigger || "").length - (a.trigger || "").length,
    );

    for (const replacement of sortedReplacements) {
      if (replacement.trigger && newName.contains(replacement.trigger)) {
        try {
          const regex = new RegExp(replacement.trigger, "g");
          newName = newName.replace(regex, now.format(replacement.format));
          changed = true;
        } catch (e) {
          console.error("Error processing filename replacement:", replacement);
        }
      }
    }

    if (changed && newName !== file.name) {
      // Simple sanitization for filename: replace invalid chars with dash
      // Note: This prevents creating files with # or : in the name if the format includes them
      newName = newName.replace(/[\\/:*?"<>|]/g, "-");

      const newPath = file.path.replace(file.name, newName);
      try {
        await this.app.fileManager.renameFile(file, newPath);
      } catch (error) {
        console.error("Error renaming file:", error);
      }
    }
  }

  checkFirstLineForRename(editor, view) {
    // Check if we're on the first line
    const cursor = editor.getCursor();
    if (cursor.line === 0) {
      const firstLine = editor.getLine(0);
      const file = view.file;

      // Check if first line contains any trigger
      const hasTrigger = this.settings.replacements.some(
        (r) => r.trigger && firstLine.contains(r.trigger),
      );

      if (file && hasTrigger) {
        // Use a debounce to avoid renaming too frequently while typing
        if (this.renameTimeout) {
          clearTimeout(this.renameTimeout);
        }

        this.renameTimeout = setTimeout(async () => {
          let updatedFirstLine = editor.getLine(0);

          // Apply all replacements to the first line logic first
          const now = window.moment();
          // Sort replacements by length (longest first) to avoid partial matches
          const sortedReplacements = [...this.settings.replacements].sort(
            (a, b) => (b.trigger || "").length - (a.trigger || "").length,
          );

          for (const replacement of sortedReplacements) {
            if (
              replacement.trigger &&
              updatedFirstLine.contains(replacement.trigger)
            ) {
              const regex = new RegExp(replacement.trigger, "g");
              updatedFirstLine = updatedFirstLine.replace(
                regex,
                now.format(replacement.format),
              );
            }
          }

          // Create filename from first line (remove markdown formatting)
          let newFileName = updatedFirstLine
            .replace(/^#+\s*/, "") // Remove heading markers
            .replace(/[\\/:*?"<>|]/g, "") // Remove invalid filename chars
            .trim();

          if (newFileName && file.basename !== newFileName) {
            // Sanitize again after replacements (e.g. if time format had colons)
            newFileName = newFileName.replace(/[\\/:*?"<>|]/g, "-");

            const newPath = file.path.replace(
              file.name,
              newFileName + "." + file.extension,
            );
            try {
              await this.app.fileManager.renameFile(file, newPath);
            } catch (error) {
              console.error("Error renaming file from first line:", error);
            }
          }
        }, 1000); // Wait 1 second after typing stops
      }
    }
  }

  onunload() {
    console.log("Unloading TODAY Replacer Plugin");
    if (this.renameTimeout) {
      clearTimeout(this.renameTimeout);
    }
  }
}

class TodayReplacerSettingTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.createEl("h2", { text: "Today Replacer Settings" });

    containerEl.createEl("p", {
      text: "Configure custom keywords (triggers) and their corresponding date/time formats.",
    });

    // --- Custom Replacements Section ---
    containerEl.createEl("h3", { text: "Custom Replacements" });

    this.plugin.settings.replacements.forEach((replacement, index) => {
      const setting = new obsidian.Setting(containerEl);

      setting.addText((text) =>
        text
          .setPlaceholder("Trigger (e.g., TODAY)")
          .setValue(replacement.trigger)
          .onChange(async (value) => {
            this.plugin.settings.replacements[index].trigger = value;
            await this.plugin.saveSettings();
          }),
      );

      setting.addText((text) =>
        text
          .setPlaceholder("Format (e.g., YYYY-MM-DD)")
          .setValue(replacement.format)
          .onChange(async (value) => {
            this.plugin.settings.replacements[index].format = value;
            await this.plugin.saveSettings();
          }),
      );

      setting.addExtraButton((button) => {
        button
          .setIcon("trash")
          .setTooltip("Delete Replacement")
          .onClick(async () => {
            this.plugin.settings.replacements.splice(index, 1);
            await this.plugin.saveSettings();
            // Refresh the display to show removal
            this.display();
          });
      });
    });

    // Add New Button
    new obsidian.Setting(containerEl).addButton((button) => {
      button
        .setButtonText("Add New Replacement")
        .setCta()
        .onClick(async () => {
          this.plugin.settings.replacements.push({
            trigger: "",
            format: "",
          });
          await this.plugin.saveSettings();
          this.display();
        });
    });

    // --- Format Cheat Sheet ---
    containerEl.createEl("hr");
    containerEl.createEl("h3", { text: "Format Cheat Sheet" });

    const details = containerEl.createEl("details");
    details.createEl("summary", { text: "Click to view Date/Time codes" });

    const table = details.createEl("table", { cls: "settings-format-table" });
    table.style.width = "100%";
    table.style.textAlign = "left";

    const addRow = (code, desc, example) => {
      const row = table.createEl("tr");
      row.createEl("td", { text: code }).style.fontWeight = "bold";
      row.createEl("td", { text: desc });
      row.createEl("td", { text: example }).style.color = "var(--text-muted)";
    };

    // Header
    const header = table.createEl("tr");
    header.createEl("th", { text: "Code" });
    header.createEl("th", { text: "Description" });
    header.createEl("th", { text: "Example" });

    // Rows
    addRow("YYYY", "4-digit Year", "2023");
    addRow("YY", "2-digit Year", "23");
    addRow("MMMM", "Full Month", "October");
    addRow("MMM", "Short Month", "Oct");
    addRow("MM", "Month Number", "10");
    addRow("DD", "Day of Month", "27");
    addRow("dddd", "Full Weekday", "Friday");
    addRow("ddd", "Short Weekday", "Fri");
    addRow("HH", "24-hour", "13");
    addRow("hh", "12-hour", "01");
    addRow("mm", "Minute", "05");
    addRow("ss", "Second", "59");
    addRow("A", "AM/PM", "PM");
    addRow("[text]", "Escaped Text", "[Today is] dddd");

    containerEl
      .createEl("p", {
        text: "For full documentation, visit Moment.js.",
        cls: "setting-item-description",
      })
      .createEl("a", {
        text: "Documentation",
        href: "https://momentjs.com/docs/#/displaying/format/",
      });
  }
}

module.exports = TodayReplacerPlugin;
