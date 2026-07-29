// main.js
const { Plugin, Notice } = require("obsidian");

class LinkEncoderPlugin extends Plugin {
  async onload() {
    console.log("Loading LinkEncoder Plugin");

    this.registerEvent(
      this.app.workspace.on("editor-paste", (evt, editor, view) => {
        const clipboardText = evt.clipboardData.getData("text/plain");
        if (this.isFilePath(clipboardText) || this.isWebUrl(clipboardText)) {
          const cursor = editor.getCursor();
          const line = editor.getLine(cursor.line);
          const lineSlice = line.substring(0, cursor.ch);

          // Regex to check if we are inside the URL part of a markdown link
          const inMarkdownLink = /\[[^\]]*\]\([^)]*$/.test(lineSlice);

          if (!inMarkdownLink) {
            evt.preventDefault();
            const formattedLink = this.formatAsMarkdownLink(clipboardText);
            editor.replaceSelection(formattedLink);
          }
        }
      }),
    );

    this.addCommand({
      id: "update-links-current-note",
      name: "Update file/folder links in current note",
      editorCallback: (editor, view) => this.updateLinksInEditor(editor),
    });
  }

  updateLinksInEditor(editor) {
    const originalContent = editor.getValue();
    console.log("LinkEncoder: Starting update process.");

    try {
      const updatedContent = this.processAllLinks(originalContent, true);

      if (originalContent !== updatedContent) {
        editor.setValue(updatedContent);
        new Notice("Links updated successfully!");
        console.log("LinkEncoder: Update complete.");
      } else {
        new Notice("No links needed updating.");
        console.log("LinkEncoder: No changes were necessary.");
      }
    } catch (error) {
      console.error("LinkEncoder Error:", error);
      new Notice(`Error updating links: ${error.message}`);
    }
  }

  processAllLinks(content, debug = false) {
    // This single, combined pattern finds either a full markdown link OR a raw path we care about.
    // It processes the text in a single pass, preventing nested replacement bugs.
    const combinedPattern =
      /(\[([^\]]+?)\]\(([^)]+?)\))|(\b(?:file:\/\/\/[^\[\]()\s<>"]+|[a-zA-Z]:[\\\/][^\[\]()\s<>"]+|https?:\/\/[^\[\]()\s<>"]+|www\.[^\[\]()\s<>"]+)\b)/gi;

    return content.replace(
      combinedPattern,
      (match, mdLinkFull, mdLinkText, mdLinkUrl, rawPath) => {
        // --- Case 1: A markdown link was matched ---
        if (mdLinkFull) {
          // It's a file path link, let's clean it up.
          if (this.isFilePath(mdLinkUrl)) {
            const newDisplayName = this.getDisplayNameWithIcon(mdLinkUrl);
            const newEncodedUrl = this.encodeExistingUrl(mdLinkUrl);
            const result = `[${newDisplayName}](${newEncodedUrl})`;

            if (result !== match) {
              if (debug)
                console.log(`Updating file link: "${match}" → "${result}"`);
              return result;
            }
            return match; // Return original if no change
          }

          // It's a web link, let's add an icon if missing.
          const hasIcon = mdLinkText.includes("🌐");
          if (this.isWebUrl(mdLinkUrl) && !hasIcon) {
            const result = `[${mdLinkText.trim()} 🌐](${mdLinkUrl})`;
            if (debug)
              console.log(`Updating web link: "${match}" → "${result}"`);
            return result;
          }

          // Otherwise, it's a link we don't need to touch (e.g., an Obsidian [[link]]).
          return match;
        }

        // --- Case 2: A raw path was matched ---
        if (rawPath) {
          const result = this.formatAsMarkdownLink(rawPath);
          if (debug)
            console.log(`Converting raw path: "${rawPath}" → "${result}"`);
          return result;
        }

        // Fallback, should not be reached
        return match;
      },
    );
  }

  isWebUrl(text) {
    return /^(https?:\/\/|www\.)/i.test(text.trim());
  }

  isFilePath(text) {
    let cleanText = text.trim();

    // Remove surrounding quotes if present (same logic as formatAsMarkdownLink)
    if (cleanText.startsWith('"') && cleanText.endsWith('"')) {
      cleanText = cleanText.substring(1, cleanText.length - 1);
    }

    return (
      /^[a-zA-Z]:[\\\/]/.test(cleanText) ||
      /^\\\\/.test(cleanText) ||
      /^file:\/\//.test(cleanText)
    );
  }

  isFile(decodedPath) {
    // This function expects a clean, decoded path string.
    const cleanPath = decodedPath.trim().replace(/[\\\/]+$/, "");

    // Get the last segment (filename/foldername)
    const lastSegmentMatch = cleanPath.match(/([^\\\/]+)$/);
    if (!lastSegmentMatch) return false;

    const lastSegment = lastSegmentMatch[1];

    // Known file extensions - if it matches these, it's definitely a file
    const knownFileExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".txt",
      ".rtf",
      ".xls",
      ".xlsx",
      ".csv",
      ".ppt",
      ".pptx",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".svg",
      ".bmp",
      ".tiff",
      ".mp4",
      ".mov",
      ".avi",
      ".mkv",
      ".mp3",
      ".wav",
      ".flac",
      ".zip",
      ".rar",
      ".7z",
      ".tar",
      ".gz",
      ".dwg",
      ".rvt",
      ".ifc",
      ".skp",
      ".3dm",
      ".md",
      ".html",
      ".css",
      ".js",
      ".py",
      ".java",
      ".cpp",
      ".c",
      ".h",
      ".json",
      ".xml",
      ".yaml",
      ".yml",
      ".ini",
      ".cfg",
      ".log",
      ".exe",
      ".msi",
      ".dmg",
      ".app",
      ".deb",
      ".rpm",
    ];

    const lowerPath = cleanPath.toLowerCase();
    const hasKnownExtension = knownFileExtensions.some((ext) =>
      lowerPath.endsWith(ext),
    );

    if (hasKnownExtension) {
      return true;
    }

    // Heuristic detection for unknown extensions
    const lastDotIndex = lastSegment.lastIndexOf(".");

    // No dot = likely a folder (unless it's a known file without extension)
    if (lastDotIndex === -1) {
      return false;
    }

    // Dot at the beginning = hidden file/folder, use additional logic
    if (lastDotIndex === 0) {
      // For hidden files like .gitignore, .env, etc.
      // If it has another dot after the first one, it's likely a file
      const secondDotIndex = lastSegment.indexOf(".", 1);
      if (secondDotIndex > 0) {
        const possibleExt = lastSegment.substring(secondDotIndex);
        return (
          possibleExt.length >= 2 &&
          possibleExt.length <= 10 &&
          /^[a-zA-Z0-9]+$/.test(possibleExt.substring(1))
        );
      }
      // Single dot at start - could be either, default to file for common cases
      return [
        ".gitignore",
        ".env",
        ".htaccess",
        ".gitattributes",
        ".editorconfig",
      ].includes(lastSegment.toLowerCase());
    }

    // Get the potential extension (everything after the last dot)
    const potentialExtension = lastSegment.substring(lastDotIndex + 1);

    // Heuristics for file vs folder:
    // 1. Extension length should be reasonable (1-10 chars)
    // 2. Extension should only contain alphanumeric characters (and maybe numbers)
    // 3. The part before the extension should exist
    const extensionLength = potentialExtension.length;
    const hasReasonableExtLength =
      extensionLength >= 1 && extensionLength <= 10;
    const extensionIsAlphanumeric = /^[a-zA-Z0-9]+$/.test(potentialExtension);
    const hasFilenameBeforeExt = lastDotIndex > 0;

    // Additional check: if the "extension" is all numbers and long, it's probably not a file
    // (e.g., "backup.20240115" is likely a folder)
    const extensionIsOnlyNumbers = /^\d+$/.test(potentialExtension);
    const extensionTooLongForNumbers =
      extensionIsOnlyNumbers && extensionLength > 4;

    // It's likely a file if:
    // - Has reasonable extension length
    // - Extension contains only alphanumeric chars
    // - There's a filename before the extension
    // - Extension isn't suspiciously long numbers
    return (
      hasReasonableExtLength &&
      extensionIsAlphanumeric &&
      hasFilenameBeforeExt &&
      !extensionTooLongForNumbers
    );
  }

  encodeExistingUrl(url) {
    if (this.isWebUrl(url)) return url;

    // Convert to a file:// URL if it's a raw path
    let fileUrl = url;
    if (!fileUrl.startsWith("file://")) {
      fileUrl = `file:///${fileUrl.replace(/\\/g, "/")}`;
    }

    const match = fileUrl.match(/^(file:\/\/\/?)(.*)/);
    if (!match) return fileUrl; // Should not happen

    const [, protocol, pathPortion] = match;
    // Decode before re-encoding to prevent errors like %20 becoming %2520
    const decodedPortion = decodeURIComponent(pathPortion);
    const encodedPortion = decodedPortion
      .split("/")
      .map(encodeURIComponent)
      .join("/");

    return protocol + encodedPortion;
  }

  getDisplayNameWithIcon(path) {
    let cleanPath = path.trim();

    // Prepare a path that is safe to decode by removing the protocol.
    let decodablePath = cleanPath;
    if (decodablePath.startsWith("file:///")) {
      decodablePath = decodablePath.substring(8); // Remove 'file:///'
    }

    // Now it's safe to decode the path without URIErrors.
    const decodedPath = decodeURIComponent(decodablePath);

    const isFile = this.isFile(decodedPath);
    const icon = isFile ? "📄" : "📁";

    // Extract filename from the end of the decoded path.
    const lastSegmentMatch = decodedPath.match(/([^\\\/]+)[\\\/]?$/);
    let displayName = lastSegmentMatch
      ? lastSegmentMatch[1]
      : isFile
        ? "File"
        : "Folder";

    return `${displayName.trim()} ${icon}`;
  }

  formatAsMarkdownLink(path) {
    if (this.isWebUrl(path)) {
      let url = path.trim();
      if (url.toLowerCase().startsWith("www.")) {
        url = "https://" + url;
      }
      let displayName = "Web Link 🌐";
      try {
        displayName = `${new URL(url).hostname.replace("www.", "")} 🌐`;
      } catch (e) {
        /* use default */
      }
      return `[${displayName}](${url})`;
    }

    // Handle file paths
    let cleanPath = path.trim();
    if (cleanPath.startsWith('"') && cleanPath.endsWith('"')) {
      cleanPath = cleanPath.substring(1, cleanPath.length - 1);
    }

    const displayName = this.getDisplayNameWithIcon(cleanPath);
    const encodedUrl = this.encodeExistingUrl(cleanPath);

    return `[${displayName}](${encodedUrl})`;
  }

  onunload() {
    console.log("Unloading LinkEncoder Plugin");
  }
}

module.exports = LinkEncoderPlugin;
