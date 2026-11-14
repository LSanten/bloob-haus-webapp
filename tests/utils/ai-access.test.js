/**
 * What AIs may do with a site (SET7, scripts/utils/ai-access.js): three switches, read from the
 * one-line or the nested form, written to every site's robots.txt by user agent.
 */
import { describe, it, expect, vi } from "vitest";
import {
  AI_DEFAULTS,
  parseAiSwitches,
  resolveAiAccess,
  repairAiLine,
  buildRobotsTxt,
  loadAiAgents,
} from "../../scripts/utils/ai-access.js";
import { parseSettingsText, mergeBloobSettings } from "../../scripts/utils/bloob-settings-reader.js";

/** The robots.txt group that names `agent`: its User-agent lines and its rule. */
function groupOf(robots, agent) {
  const groups = robots.split(/\n\s*\n/);
  return groups.find((g) => g.split("\n").includes(`User-agent: ${agent}`));
}
const ruleFor = (robots, agent) => groupOf(robots, agent)?.match(/^(Allow|Disallow): \/$/m)?.[0];

describe("parseAiSwitches: Leon's one-line form", () => {
  it("reads all three, any order", () => {
    expect(parseAiSwitches("read_links:yes, search:yes, train:no").switches).toEqual({
      read_links: true,
      search: true,
      train: false,
    });
    expect(parseAiSwitches("train:no, read_links:yes").switches).toEqual({ train: false, read_links: true });
  });

  it("reads only what is written (the rest stays default)", () => {
    expect(parseAiSwitches("search:no").switches).toEqual({ search: false });
  });

  it("takes true/false, on/off, any case, and spaces or dashes", () => {
    expect(parseAiSwitches("Read-Links:NO search:Off train:true").switches).toEqual({
      read_links: false,
      search: false,
      train: true,
    });
  });

  it("warns about a switch it doesn't know, and keeps the rest", () => {
    const { switches, warnings } = parseAiSwitches("train:no, meta:no");
    expect(switches).toEqual({ train: false });
    expect(warnings.join()).toMatch(/"meta" is not a switch/);
  });

  it("warns about a value it can't read and keeps the default", () => {
    const { switches, warnings } = parseAiSwitches("train:maybe");
    expect(switches).toEqual({});
    expect(warnings.join()).toMatch(/train should be yes or no/);
  });

  it("warns about leftover text", () => {
    expect(parseAiSwitches("train:no please").warnings.join()).toMatch(/could not read "please"/);
  });
});

describe("parseAiSwitches: the nested form", () => {
  it("reads yes/no strings (YAML 1.2) and booleans (YAML 1.1)", () => {
    expect(parseAiSwitches({ train: "no", search: "yes" }).switches).toEqual({ train: false, search: true });
    expect(parseAiSwitches({ read_links: false }).switches).toEqual({ read_links: false });
  });
});

describe("parseAiSwitches: all at once", () => {
  it("`ai: no` turns all three off, `ai: yes` all three on", () => {
    expect(parseAiSwitches("no").switches).toEqual({ read_links: false, search: false, train: false });
    expect(parseAiSwitches(true).switches).toEqual({ read_links: true, search: true, train: true });
  });

  it("nothing written is nothing", () => {
    for (const raw of [undefined, null, ""]) expect(parseAiSwitches(raw)).toEqual({ switches: {}, warnings: [] });
  });
});

describe("resolveAiAccess: defaults, then sites/*.yaml, then the vault", () => {
  it("defaults to reading by link on, AI search on, training off", () => {
    expect(AI_DEFAULTS).toEqual({ read_links: true, search: true, train: false });
    expect(resolveAiAccess(undefined, undefined)).toEqual({ ...AI_DEFAULTS, warnings: [] });
  });

  it("lets the vault override sites/*.yaml switch by switch", () => {
    const ai = resolveAiAccess({ search: "no", train: "yes" }, "train:no");
    expect(ai).toMatchObject({ read_links: true, search: false, train: false });
  });
});

describe("the broken-YAML case: a space after the colons on one line", () => {
  const BROKEN = [
    "---",
    "name: Leon's Bloob Haus",
    "ai: read_links: yes, search: no, train: no",
    "blocklist_tag: private-marble-keep-from-public",
    "---",
    "",
    "Write it like `ai: read_links: yes` and YAML breaks.",
  ].join("\n");

  it("really is broken YAML", async () => {
    const matter = (await import("gray-matter")).default;
    expect(() => matter(BROKEN)).toThrow();
  });

  it("is repaired on that one line, inside the frontmatter only", () => {
    const repaired = repairAiLine(BROKEN);
    expect(repaired).toContain("ai: read_links:yes, search:no, train:no");
    expect(repaired).toContain("Write it like `ai: read_links: yes` and YAML breaks.");
  });

  it("keeps every other setting in the file (the blocklist tag above all)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { data } = parseSettingsText(BROKEN);
    expect(data.blocklist_tag).toBe("private-marble-keep-from-public");
    // and again: gray-matter's cache must not hand back an empty result the second time
    expect(parseSettingsText(BROKEN).data.blocklist_tag).toBe("private-marble-keep-from-public");
    expect(resolveAiAccess(undefined, data.ai)).toMatchObject({ read_links: true, search: false, train: false });
    expect(warn.mock.calls.join()).toMatch(/space after a colon/);
    warn.mockRestore();
  });

  it("leaves a file broken for another reason as it was", () => {
    expect(repairAiLine("---\nname: [unclosed\n---\n")).toBeNull();
    expect(() => parseSettingsText("---\nname: [unclosed\nai: train: no\n---\n")).toThrow();
  });

  it("leaves the correct forms alone", () => {
    expect(repairAiLine("---\nai: read_links:yes, train:no\n---\n")).toBeNull();
    expect(repairAiLine("---\nai:\n  train: no\n---\n")).toBeNull();
    expect(repairAiLine('---\nai: "train: no"\n---\n')).toBeNull();
  });
});

describe("mergeBloobSettings: one setting, two doors", () => {
  it("vault switches win over sites/*.yaml, switch by switch", () => {
    const merged = mergeBloobSettings({ ai: "search:no, train:yes" }, { ai: { train: "no" } });
    expect(merged.ai).toEqual({ search: false, train: false });
  });

  it("keeps sites/*.yaml's ai when the vault says nothing", () => {
    expect(mergeBloobSettings({ ai: "train:yes" }, { name: "x" }).ai).toBe("train:yes");
  });

  it("license: the vault wins, `none` included", () => {
    expect(mergeBloobSettings({ site: { license: "CC BY 4.0" } }, { license: "CC0" }).site.license).toBe("CC0");
    expect(mergeBloobSettings({ site: { license: "CC BY 4.0" } }, { license: "none" }).site.license).toBe("none");
    expect(mergeBloobSettings({ site: { license: "CC BY 4.0" } }, { name: "x" }).site.license).toBe("CC BY 4.0");
  });
});

describe("buildRobotsTxt", () => {
  const SITEMAP = "https://leons.bloob.haus/sitemap.xml";

  it("allows everyone else", () => {
    expect(buildRobotsTxt({})).toMatch(/^User-agent: \*\nAllow: \/$/m);
  });

  it("with the defaults: reading by link and AI search allowed, training refused", () => {
    const robots = buildRobotsTxt({ ai: AI_DEFAULTS });
    expect(ruleFor(robots, "ChatGPT-User")).toBe("Allow: /");
    expect(ruleFor(robots, "OAI-SearchBot")).toBe("Allow: /");
    expect(ruleFor(robots, "GPTBot")).toBe("Disallow: /");
    expect(robots).toContain("(read_links: yes)");
    expect(robots).toContain("(search: yes)");
    expect(robots).toContain("(train: no)");
  });

  for (const name of ["read_links", "search", "train"]) {
    for (const on of [true, false]) {
      it(`${name}: ${on ? "yes" : "no"} writes ${on ? "Allow" : "Disallow"} for every agent in the group, and only there`, () => {
        const ai = { ...AI_DEFAULTS, [name]: on };
        const robots = buildRobotsTxt({ ai });
        for (const { agent } of loadAiAgents()[name]) {
          expect(ruleFor(robots, agent), agent).toBe(on ? "Allow: /" : "Disallow: /");
        }
        for (const other of ["read_links", "search", "train"].filter((n) => n !== name)) {
          const expected = AI_DEFAULTS[other] ? "Allow: /" : "Disallow: /";
          expect(ruleFor(robots, loadAiAgents()[other][0].agent)).toBe(expected);
        }
      });
    }
  }

  it("reads the nested and the one-line form the same", () => {
    const nested = resolveAiAccess(undefined, { train: "no", search: "no" });
    const line = resolveAiAccess(undefined, "search:no, train:no");
    const strip = ({ warnings, ...ai }) => ai;
    expect(buildRobotsTxt({ ai: strip(nested) })).toBe(buildRobotsTxt({ ai: strip(line) }));
  });

  it("names the sitemap only when there is one", () => {
    expect(buildRobotsTxt({ sitemapUrl: SITEMAP })).toMatch(/\nSitemap: https:\/\/leons\.bloob\.haus\/sitemap\.xml\n$/);
    expect(buildRobotsTxt({ sitemapUrl: "" })).not.toContain("Sitemap:");
  });

  it("never blocks link previews (facebookexternalhit) or search engines", () => {
    const robots = buildRobotsTxt({ ai: { read_links: false, search: false, train: false } });
    const named = robots.split("\n").filter((l) => l.startsWith("User-agent: ")).map((l) => l.slice(12).toLowerCase());
    for (const { agent } of loadAiAgents().left_alone) {
      expect(named, agent).not.toContain(agent.toLowerCase());
    }
  });
});

describe("ai-agents.yaml", () => {
  const agents = loadAiAgents();
  const all = ["read_links", "search", "train"].flatMap((g) => agents[g].map((e) => ({ ...e, group: g })));

  it("every entry names its company and the doc it comes from", () => {
    for (const e of [...all, ...agents.left_alone]) {
      expect(e.agent, JSON.stringify(e)).toMatch(/^[A-Za-z][\w-]*$/);
      expect(e.company, e.agent).toBeTruthy();
      expect(e.source, e.agent).toMatch(/^https:\/\//);
    }
  });

  it("lists each agent once", () => {
    const names = all.map((e) => e.agent.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps the left-alone agents out of every group", () => {
    const names = new Set(all.map((e) => e.agent.toLowerCase()));
    for (const { agent } of agents.left_alone) expect(names.has(agent.toLowerCase()), agent).toBe(false);
  });

  it("puts the agents in the groups their companies' docs give", () => {
    const groupOfAgent = Object.fromEntries(all.map((e) => [e.agent, e.group]));
    expect(groupOfAgent).toMatchObject({
      "ChatGPT-User": "read_links",
      "Claude-User": "read_links",
      "Perplexity-User": "read_links",
      "Meta-ExternalFetcher": "read_links",
      "OAI-SearchBot": "search",
      "Claude-SearchBot": "search",
      PerplexityBot: "search",
      ExaSearchBot: "search",
      GPTBot: "train",
      ClaudeBot: "train",
      "Google-Extended": "train",
      CCBot: "train",
      "Applebot-Extended": "train",
      "Meta-ExternalAgent": "train",
      Bytespider: "train",
      Amazonbot: "train",
      ElevenlabsCrawler: "train",
      Reflectionbot: "train",
    });
  });
});
