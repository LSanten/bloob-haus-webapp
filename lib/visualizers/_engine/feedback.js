/**
 * Feedback from a haus to its maker, into the same pile as the post office's ("Something broke,
 * or an idea?", POST /api/feedback on post-office.bloob.haus). From the visitor's tool belt: a
 * note, optionally pointing at something on the page (like commenting on an artifact: hover
 * outlines it, a click picks it). And any [data-bloob-ask="question"] on a page becomes a small
 * one-line answer field, e.g. "Which bloob object would you make?".
 *
 * describePicked, feedbackBody and wishBody are pure; startFeedback is the browser part.
 */

const squash = (s) => String(s || "").replace(/\s+/g, " ").trim();

/** A picked element in one line (at most 120 characters): where it is, and a bit of its text. */
export function describePicked({ text, path }) {
  const words = squash(text);
  if (!words) return String(path).slice(0, 120);
  const room = 120 - path.length - 4;
  const bit = room > 12 ? (words.length > room ? `${words.slice(0, room - 1)}…` : words) : "";
  return bit ? `${path} “${bit}”` : String(path).slice(0, 120);
}

/** What the tool belt sends: the note, the page, and what was pointed at. */
export function feedbackBody({ kind, text, pageUrl, picked, email, now = new Date().toISOString() }) {
  const body = { kind, text: squash(text) ? String(text).trim() : "", route: String(pageUrl).slice(0, 300) };
  if (picked) {
    const where = describePicked(picked);
    body.text += `\n\nPointing at: ${where}`;
    body.log = [{ t: now, kind: "picked", label: where }];
  }
  if (email && email.trim()) body.email = email.trim();
  return body;
}

/** An answer to a question on a page, marked as such, in the same pile. */
export function wishBody({ text, question, pageUrl }) {
  return { kind: "idea", text: `Bloob object wish (${squash(question)}): ${String(text).trim()}`, route: String(pageUrl).slice(0, 300) };
}

const DEFAULT_URL = "https://post-office.bloob.haus/api/feedback";

function send(url, body) {
  return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) =>
    r.ok ? r : Promise.reject(new Error(r.status === 429 ? "Too many notes for now. Try again in a while." : "That didn't go through.")),
  );
}

// Where an element sits, short: up to four steps, each a tag with its id or first class.
function elementPath(el) {
  const steps = [];
  for (let n = el; n && n.nodeType === 1 && n !== document.body && steps.length < 4; n = n.parentElement) {
    const cls = [...n.classList].find((c) => !c.startsWith("is-") && !c.startsWith("bh-"));
    steps.unshift(n.id ? `${n.localName}#${n.id}` : cls ? `${n.localName}.${cls}` : n.localName);
  }
  return steps.join(" > ");
}

/** Browser: the tool belt's feedback form, its pointer, and every [data-bloob-ask]. */
export function startFeedback(root = document) {
  const form = root.querySelector(".bloob-feedback");
  const url = form?.dataset.feedbackUrl || DEFAULT_URL;
  if (form) wireForm(form, url);
  root.querySelectorAll("[data-bloob-ask]").forEach((el) => wireAsk(el, url));
}

function wireForm(form, url) {
  const status = form.querySelector(".bloob-feedback__status");
  const pickedRow = form.querySelector(".bloob-feedback__picked");
  const panel = form.closest(".toolbelt__panel");
  let picked = null;

  const showPicked = () => {
    pickedRow.hidden = !picked;
    if (picked) pickedRow.querySelector("span").textContent = describePicked(picked);
  };

  form.querySelector("[data-feedback-point]").addEventListener("click", () => {
    if (panel) panel.hidden = true;
    point((el) => {
      if (el) picked = { tag: el.localName, id: el.id, classes: [...el.classList], text: el.innerText || el.getAttribute("alt") || "", path: elementPath(el) };
      if (panel) panel.hidden = false;
      showPicked();
      form.querySelector("textarea").focus();
    });
  });
  form.querySelector("[data-feedback-unpick]").addEventListener("click", () => { picked = null; showPicked(); });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    if (!String(data.get("text") || "").trim()) return;
    status.textContent = "Sending…";
    send(url, feedbackBody({ kind: data.get("kind") || "idea", text: data.get("text"), email: data.get("email"), pageUrl: location.href, picked }))
      .then(() => { form.reset(); picked = null; showPicked(); status.textContent = "Thank you. It's on its way."; })
      .catch((err) => { status.textContent = err.message; });
  });
}

// Pointing mode: an outline follows the element under the pointer; a click picks it, Esc stops.
function point(done) {
  const outline = document.createElement("div");
  outline.className = "bloob-pick-outline";
  const hint = document.createElement("div");
  hint.className = "bloob-pick-hint";
  hint.textContent = "Click what your note is about. Esc to stop.";
  document.body.append(outline, hint);
  document.documentElement.classList.add("bh-pointing");
  const target = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    return el && !el.closest(".toolbelt, .bloob-pick-hint, .bloob-pick-outline") ? el : null;
  };
  const move = (e) => {
    const el = target(e);
    outline.hidden = !el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    Object.assign(outline.style, { top: `${r.top - 3}px`, left: `${r.left - 3}px`, width: `${r.width + 6}px`, height: `${r.height + 6}px` });
  };
  const finish = (el) => {
    removeEventListener("pointermove", move, true);
    removeEventListener("click", click, true);
    removeEventListener("keydown", key, true);
    outline.remove();
    hint.remove();
    document.documentElement.classList.remove("bh-pointing");
    done(el);
  };
  const click = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    finish(target(e));
  };
  const key = (e) => { if (e.key === "Escape") { e.preventDefault(); finish(null); } };
  addEventListener("pointermove", move, true);
  addEventListener("click", click, true);
  addEventListener("keydown", key, true);
}

function wireAsk(el, url) {
  const question = el.dataset.bloobAsk;
  el.classList.add("bloob-ask");
  el.innerHTML = "";
  const form = document.createElement("form");
  const label = document.createElement("label");
  label.textContent = question;
  const row = document.createElement("div");
  row.className = "bloob-ask__row";
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 300;
  input.required = true;
  input.placeholder = el.dataset.placeholder || "A record, a recipe card, a map…";
  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Send";
  const status = document.createElement("p");
  status.className = "bloob-ask__status";
  status.setAttribute("aria-live", "polite");
  label.append(row);
  row.append(input, button);
  form.append(label, status);
  el.append(form);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!input.value.trim()) return;
    status.textContent = "Sending…";
    send(url, wishBody({ text: input.value, question, pageUrl: location.href }))
      .then(() => { input.value = ""; status.textContent = "Thank you! Noted."; })
      .catch((err) => { status.textContent = err.message; });
  });
}
