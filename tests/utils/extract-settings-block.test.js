import { describe, it, expect } from "vitest";
import { extractSettingsBlock } from "../../scripts/utils/extract-settings-block.js";

describe("extractSettingsBlock", () => {
  describe("basic extraction", () => {
    it("extracts YAML settings and removes the block from body", () => {
      const md = `::: settings
rss: https://example.com/feed
:::

Some body text.`;
      const { settings, body } = extractSettingsBlock(md);
      expect(settings.rss).toBe("https://example.com/feed");
      expect(body).toBe("Some body text.");
    });

    it("returns empty settings and original body when no settings block present", () => {
      const md = "Just a normal page.";
      const { settings, body } = extractSettingsBlock(md);
      expect(settings).toEqual({});
      expect(body).toBe("Just a normal page.");
    });

    it("preserves body content before the settings block", () => {
      const md = `# Heading

::: settings
key: value
:::

Body after.`;
      const { settings, body } = extractSettingsBlock(md);
      expect(settings.key).toBe("value");
      expect(body).toContain("# Heading");
      expect(body).toContain("Body after.");
      expect(body).not.toContain("key: value");
    });

    it("preserves body content after the settings block", () => {
      const md = `::: settings
key: value
:::

Body after settings.`;
      const { settings, body } = extractSettingsBlock(md);
      expect(body.trim()).toBe("Body after settings.");
    });

    it("handles ::: settings with no closing :::", () => {
      const md = `::: settings
key: value`;
      const { settings } = extractSettingsBlock(md);
      expect(settings.key).toBe("value");
    });

    it("handles multi-key settings", () => {
      const md = `::: settings
rss: https://feed.com/rss
spotify: https://open.spotify.com/show/abc
limit: 10
:::`;
      const { settings } = extractSettingsBlock(md);
      expect(settings.rss).toBe("https://feed.com/rss");
      expect(settings.spotify).toBe("https://open.spotify.com/show/abc");
      expect(settings.limit).toBe(10);
    });
  });

  describe("markdown link value quoting", () => {
    it("parses markdown link value without YAML error", () => {
      const md = `::: settings
rss: https://feed.com/rss
apple: [https://podcasts.apple.com/](https://podcasts.apple.com/de/podcast/foo/id123)
:::`;
      const { settings } = extractSettingsBlock(md);
      // Should not throw and should parse the URL correctly
      // The value is stored as the quoted string — parseUrlValue in rss-feed extracts the URL
      expect(settings.apple).toBeDefined();
      expect(settings.apple).toContain("podcasts.apple.com");
    });

    it("parses markdown link alongside plain URL values", () => {
      const md = `::: settings
rss: https://feed.com/rss
spotify: https://open.spotify.com/show/abc
apple: [Podcast Name](https://podcasts.apple.com/de/podcast/foo/id123)
:::`;
      const { settings } = extractSettingsBlock(md);
      expect(settings.spotify).toBe("https://open.spotify.com/show/abc");
      expect(settings.apple).toContain("podcasts.apple.com");
    });
  });

  describe("depth handling", () => {
    it("stops at the correct closing ::: and leaves subsequent ::: blocks in body", () => {
      const md = `::: settings
key: value
:::

::: other-block
content
:::`;
      const { settings, body } = extractSettingsBlock(md);
      expect(settings.key).toBe("value");
      expect(body).toContain("::: other-block");
      expect(body).toContain("content");
    });
  });

  describe("spacing variants", () => {
    it("closes the block when the closer has trailing whitespace", () => {
      // Regression: "::: " previously failed the closer equality AND counted
      // as a nested opener, swallowing the rest of the body into the block.
      const md = "::: settings\nkey: value\n:::  \n\nBody after.";
      const { settings, body } = extractSettingsBlock(md);
      expect(settings.key).toBe("value");
      expect(body.trim()).toBe("Body after.");
    });

    it("matches :::settings without space", () => {
      const md = `:::settings
key: value
:::`;
      const { settings } = extractSettingsBlock(md);
      expect(settings.key).toBe("value");
    });

    it("matches ::: settings with extra spaces", () => {
      const md = `:::  settings
key: value
:::`;
      const { settings } = extractSettingsBlock(md);
      expect(settings.key).toBe("value");
    });
  });
});
