/**
 * What AIs may do with a site (SET7): three switches, written to the site's robots.txt.
 *
 *   read_links  an AI opens a page because someone asked it about that page   default yes
 *   search      AI search indexes pages so its answers can find and cite them  default yes
 *   train       pages may be collected to train AI models                     default no
 *
 * Written in `_bloob-settings.md` (or `sites/*.yaml`; the vault wins, switch by switch) on one
 * line, any order, only what differs from the default:
 *
 *   ai: read_links:yes, search:yes, train:no
 *
 * No space after the colons: YAML reads `ai: train: no` as broken and fails the whole file. So
 * the nested form works too, and the settings reader repairs that one broken line (repairAiLine)
 * rather than lose every setting in the file:
 *
 *   ai:
 *     train: no
 *
 * `ai: no` turns all three off, `ai: yes` all three on.
 *
 * Which crawler belongs to which switch lives in ai-agents.yaml (one data file, sourced from each
 * company's docs). robots.txt is a request the big companies honour, not a lock.
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_FILE = path.join(__dirname, "ai-agents.yaml");

export const AI_SWITCHES = ["read_links", "search", "train"];
export const AI_DEFAULTS = Object.freeze({ read_links: true, search: true, train: false });

const YES = new Set(["yes", "true", "on", "allow"]);
const NO = new Set(["no", "false", "off", "block"]);

/** yes/no (any case), true/false, on/off → boolean; anything else → undefined. */
function toBool(value) {
  if (typeof value === "boolean") return value;
  const v = String(value ?? "").trim().toLowerCase();
  if (YES.has(v)) return true;
  if (NO.has(v)) return false;
  return undefined;
}

const switchName = (key) => String(key).trim().toLowerCase().replace(/-/g, "_");

/**
 * Read what one door says, without filling in defaults.
 *
 * @param {unknown} raw - the `ai:` value: a one-line string, a nested object, yes/no, or nothing
 * @returns {{switches: Object<string, boolean>, warnings: string[]}} only the switches written
 */
export function parseAiSwitches(raw) {
  const switches = {};
  const warnings = [];
  if (raw === undefined || raw === null || raw === "") return { switches, warnings };

  const set = (key, value) => {
    const name = switchName(key);
    if (!AI_SWITCHES.includes(name)) {
      warnings.push(`ai: "${key}" is not a switch (read_links, search, train); ignored`);
      return;
    }
    const bool = toBool(value);
    if (bool === undefined) {
      warnings.push(`ai: ${name} should be yes or no, not "${value}"; kept the default`);
      return;
    }
    switches[name] = bool;
  };

  // `ai: yes` / `ai: no`: all three at once.
  const whole = typeof raw === "object" ? undefined : toBool(raw);
  if (whole !== undefined) {
    for (const name of AI_SWITCHES) switches[name] = whole;
    return { switches, warnings };
  }

  if (typeof raw === "object" && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw)) set(key, value);
    return { switches, warnings };
  }

  if (typeof raw !== "string") {
    warnings.push(`ai: could not read ${JSON.stringify(raw)}; kept the defaults`);
    return { switches, warnings };
  }

  // One line: `read_links:yes, search:yes, train:no`, any order, commas or spaces between.
  const pair = /([a-z_-]+)\s*[:=]\s*([a-z]+)/gi;
  let leftover = raw;
  for (const m of raw.matchAll(pair)) {
    set(m[1], m[2]);
    leftover = leftover.replace(m[0], "");
  }
  leftover = leftover.replace(/[\s,;]+/g, " ").trim();
  if (leftover) warnings.push(`ai: could not read "${leftover}"; write it like read_links:yes, search:yes, train:no`);
  return { switches, warnings };
}

/**
 * The site's three switches, from both doors. Defaults, then `sites/*.yaml`, then the vault: each
 * door only overrides the switches it writes.
 *
 * @param {unknown} configRaw - `ai:` from sites/*.yaml
 * @param {unknown} vaultRaw - `ai:` from _bloob-settings.md
 * @returns {{read_links: boolean, search: boolean, train: boolean, warnings: string[]}}
 */
export function resolveAiAccess(configRaw, vaultRaw) {
  const fromConfig = parseAiSwitches(configRaw);
  const fromVault = parseAiSwitches(vaultRaw);
  return {
    ...AI_DEFAULTS,
    ...fromConfig.switches,
    ...fromVault.switches,
    warnings: [...fromConfig.warnings, ...fromVault.warnings],
  };
}

/**
 * The broken-YAML case: `ai: read_links: yes, search: yes` (a space after the inner colons) makes
 * the whole frontmatter unreadable, and a settings file that doesn't parse loses every setting in
 * it, the blocklist tag included. Returns the file with that one line's inner spaces removed, or
 * null when there is no such line to repair. Only ever used after a parse has already failed.
 *
 * @param {string} text - the whole _bloob-settings.md
 * @returns {string|null}
 */
export function repairAiLine(text) {
  const source = String(text);
  // Only inside the frontmatter: the body may quote the broken form on purpose.
  const end = source.startsWith("---") ? source.indexOf("\n---", 3) : -1;
  if (end === -1) return null;
  let changed = false;
  const head = source.slice(0, end).replace(/^(ai:[ \t]+)([^\n"'{[][^\n]*)$/m, (line, key, value) => {
    if (!/[a-z_-]+:[ \t]+\S/i.test(value)) return line;
    changed = true;
    return key + value.replace(/:[ \t]+/g, ":");
  });
  return changed ? head + source.slice(end) : null;
}

let agentsCache = null;

/** ai-agents.yaml: `{ read_links: [...], search: [...], train: [...], left_alone: [...] }`. */
export function loadAiAgents(file = AGENTS_FILE) {
  if (file === AGENTS_FILE && agentsCache) return agentsCache;
  const data = yaml.load(fs.readFileSync(file, "utf-8"));
  if (file === AGENTS_FILE) agentsCache = data;
  return data;
}

const GROUP_HEADINGS = {
  read_links: "AI that opens a page because someone asked it about the page",
  search: "AI search: indexes pages so AI answers can find and cite them",
  train: "AI training: collects pages to train AI models",
};

/**
 * The whole robots.txt for one site.
 *
 * Every crawler not named follows `User-agent: *` (allowed). Each switch gets its own group naming
 * its crawlers, allowed or not, so the file says the site's choice even for the switches left on
 * (some crawlers follow other crawlers' rules when they aren't named).
 *
 * @param {object} opts
 * @param {{read_links: boolean, search: boolean, train: boolean}} opts.ai - resolved switches
 * @param {string} [opts.sitemapUrl] - only for sites with show_in_search: yes
 * @param {object} [opts.agents] - ai-agents.yaml content (loaded when omitted)
 * @returns {string}
 */
export function buildRobotsTxt({ ai = AI_DEFAULTS, sitemapUrl = "", agents = loadAiAgents() } = {}) {
  const lines = [
    "# Who may crawl this site. A request the big AI companies honour, not a lock.",
    "",
    "User-agent: *",
    "Allow: /",
  ];
  for (const name of AI_SWITCHES) {
    const list = agents?.[name] || [];
    if (!list.length) continue;
    const allowed = typeof ai[name] === "boolean" ? ai[name] : AI_DEFAULTS[name];
    lines.push("", `# ${GROUP_HEADINGS[name]} (${name}: ${allowed ? "yes" : "no"})`);
    for (const entry of list) lines.push(`User-agent: ${entry.agent}`);
    lines.push(allowed ? "Allow: /" : "Disallow: /");
  }
  if (sitemapUrl) lines.push("", `Sitemap: ${sitemapUrl}`);
  return `${lines.join("\n")}\n`;
}
