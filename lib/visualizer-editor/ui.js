/**
 * ui.js — the live visualizer editor's page (catalog + editor).
 *
 * This is the HOST, not a shape, so it builds DOM freely. All visualizer markup
 * comes from the shapes' own transforms through createPageRenderer(), which
 * draws the note inside the article page, the way a marble's inside is drawn.
 *
 * The preview is a sandboxed iframe (allow-scripts, no same-origin): a note may
 * hold raw HTML and every shape's browser.js runs there, and none of it may
 * reach this page, its cookies, or a future signed-in workbench.
 *
 * Product copy: no em dashes.
 */
import { createPageRenderer, createObjectPageRenderer } from "./render-note.js";
import { aiCard } from "./ai-card.js";

const SWIPER = "https://cdn.jsdelivr.net/npm/swiper@11";
// The sandboxed preview has no storage of its own (no same-origin), and a shape's
// browser.js may use it (checkbox-tracker remembers ticks). Give it an in-memory
// stand-in, so the shape runs unchanged; nothing is kept between redraws.
const MEMORY_STORAGE = `<script>try{window.localStorage}catch(e){const m=new Map();const s={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>void m.set(k,String(v)),removeItem:k=>void m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}};for(const n of["localStorage","sessionStorage"])Object.defineProperty(window,n,{value:s,configurable:true})}</script>`;
const SHELVES = [
  { shelf: "objects", title: "Objects", lead: "A whole note becomes an object. Name it at the top of the note, for example bloob-shape: marble." },
  { shelf: "always-on", title: "Always on", lead: "Writing rules. They work in every note, with nothing to switch on." },
  { shelf: "placed", title: "You place it", lead: "Ask for one with a block in your note. Each one sits inside a normal page." },
];

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "on") for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
  }
  node.append(...children);
  return node;
};

/** The full document drawn inside the preview frame. */
function previewDocument({ html, root, modules }) {
  const css = modules.filter((m) => m.hasCss).map((m) => `<link rel="stylesheet" href="assets/${m.name}.css">`);
  const js = modules.filter((m) => m.hasBrowser).map((m) => `<script src="assets/${m.name}.js"></script>`);
  // Objects (note, marble) start closed in the preview, so clicking them plays the opening.
  const object = html.includes('class="bloob-object');
  const engineHead = object ? `<link rel="stylesheet" href="engine/stable/bloob-engine.css">` : "";
  const engineScript = object ? `<script src="engine/stable/bloob-engine.js"></script>` : "";
  return `<!doctype html><html${object ? ' class="bh-js" data-bh-initial="closed"' : ""}><head><meta charset="utf-8">
${MEMORY_STORAGE}
<base href="${root}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${SWIPER}/swiper-bundle.min.css">
<link rel="stylesheet" href="themes/base.css">
<link rel="stylesheet" href="themes/base-tokens.css">
<link rel="stylesheet" href="assets/article.css">
${engineHead}
${css.join("\n")}
</head><body>${html}
<script src="${SWIPER}/swiper-bundle.min.js"></script>
${engineScript}
${js.join("\n")}
</body></html>`;
}

function mountCatalog(app, { pages, renderFor, root, modules }) {
  const wrap = el("div", { class: "wrap" },
    el("header", { class: "top" },
      el("h1", {}, "Visualizers"),
      el("p", {}, "Each one turns a markdown note into something you can see. Open one to write with it live."),
      el("p", { class: "quiet" }, "Every visualizer has an AI card: give it to any AI chat and it can write notes for that visualizer. ",
        el("a", { href: "llms.txt" }, "All AI cards"), ". Making your own? ",
        el("a", { href: "making-a-visualizer.md" }, "Start here")),
    ),
  );
  for (const { shelf, title, lead } of SHELVES) {
    const items = pages.filter((x) => x.shelf === shelf);
    if (!items.length) continue; // a shelf with nothing listed is not shown
    const picker = el("div", { class: "picker" });
    for (const p of items) {
      const mini = el("iframe", { class: "mini", sandbox: "allow-scripts", tabindex: "-1", "aria-hidden": "true", loading: "lazy" });
      mini.srcdoc = previewDocument({ html: renderFor(p.name)(p.example), root, modules });
      picker.append(
        el("a", { class: "card", href: `${p.name}/` },
          el("div", { class: "thumb" }, mini),
          el("span", { class: "nm" }, p.title),
          el("div", { class: "tags" }, ...p.labels.map((l) => el("span", { class: "tag" }, l))),
          el("span", { class: "ct" }, p.blurb || p.description),
        ),
      );
    }
    wrap.append(el("section", {}, el("h2", { class: "sec" }, title), el("p", { class: "sec-lead" }, lead), picker));
  }
  app.append(wrap);
}

function mountEditor(app, { pages, renderFor, root, modules, current }) {
  const p = pages.find((x) => x.name === current) || pages[0];
  const render = renderFor(p.name);
  const draftKey = `bloob-visualizer-draft:${p.name}`;

  const text = el("textarea", { class: "code", spellcheck: "false", "aria-label": "Markdown note" });
  text.value = localStorage.getItem(draftKey) ?? p.example;
  const frame = el("iframe", { class: "frame", sandbox: "allow-scripts", title: "Preview" });

  const draw = () => {
    frame.srcdoc = previewDocument({ html: render(text.value), root, modules });
  };
  let timer;
  text.addEventListener("input", () => {
    localStorage.setItem(draftKey, text.value);
    clearTimeout(timer);
    timer = setTimeout(draw, 200);
  });

  const picker = el("select", { class: "sel", "aria-label": "Visualizer", on: { change: (e) => (location.href = `../${e.target.value}/`) } },
    ...SHELVES.filter(({ shelf }) => pages.some((x) => x.shelf === shelf)).map(({ shelf, title }) => el("optgroup", { label: title },
      ...pages.filter((x) => x.shelf === shelf).map((x) => el("option", { value: x.name, selected: x.name === p.name }, x.title)))));
  const copy = el("button", { class: "btn primary", type: "button", on: { click: async () => {
    const card = await fetch("ai.md").then((r) => (r.ok ? r.text() : aiCard(p))).catch(() => aiCard(p));
    await navigator.clipboard.writeText(`${card}\n## My note so far\n\n\`\`\`\`markdown\n${text.value.trimEnd()}\n\`\`\`\`\n`);
    copy.textContent = "Copied";
    setTimeout(() => (copy.textContent = "Copy for AI"), 1500);
  } } }, "Copy for AI");
  const reset = el("button", { class: "btn", type: "button", on: { click: () => {
    text.value = p.example;
    localStorage.removeItem(draftKey);
    draw();
  } } }, "Start over");

  app.append(
    el("div", { class: "wrap" },
      el("header", { class: "top" },
        el("h1", {}, p.title),
        el("p", { class: "quiet" }, p.blurb || p.description),
      ),
      el("div", { class: "bar" },
        el("a", { class: "btn", href: "../" }, "All visualizers"),
        picker,
        el("span", { class: "grow" }),
        el("a", { class: "btn", href: "ai.md" }, "AI card"),
        copy, reset,
      ),
      el("main", { class: "bench" },
        el("section", { class: "pane" },
          el("div", { class: "pane-head" }, el("div", { class: "step" }, el("span", { class: "n" }, "1"), "Write a note")),
          el("p", { class: "pane-hint" }, "Markdown, like in Obsidian. Your draft stays in this browser."),
          text,
        ),
        el("section", { class: "pane" },
          el("div", { class: "pane-head" }, el("div", { class: "step" }, el("span", { class: "n" }, "2"), "See it")),
          el("p", { class: "pane-hint" }, "Drawn by the same code that builds the sites, inside a normal page."),
          el("div", { class: "surface" }, frame),
        ),
      ),
    ),
  );
  draw();
}

/** Entry point, called by the generated bundle. */
export function start({ modules, pages }) {
  const app = document.getElementById("app");
  const page = document.body.dataset;
  const root = new URL(page.root, location.href).href;
  const visualizers = modules.filter((m) => !m.object).map((m) => ({ name: m.name, ...m.module }));
  const pageRender = createPageRenderer({ visualizers });
  // A note or marble page draws its starter note as that object; every other page as an article.
  const objects = new Map(modules.filter((m) => m.object).map((m) => [m.name, createObjectPageRenderer({ visualizers, shape: m.object })]));
  const renderFor = (name) => objects.get(name) || pageRender;
  const ctx = { pages, render: pageRender, renderFor, root, modules, current: page.visualizer };
  if (page.view === "editor") mountEditor(app, ctx);
  else mountCatalog(app, ctx);
}
