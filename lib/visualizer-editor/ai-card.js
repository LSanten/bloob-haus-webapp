/**
 * ai-card.js — the markdown card an AI is given to write for one visualizer.
 *
 * Served at bloob.haus/visualizers/<name>/ai.md, next to the live editor, and
 * copied by the editor's "Copy for AI" button. Pure: built from the shape's
 * manifest description, its schema.md (when it has one) and its starter note.
 * Product copy: no em dashes.
 */
export const HOME = "https://bloob.haus/visualizers";

/** "heading-and-paragraph" → "Heading and paragraph" */
export function displayName(name) {
  const words = name.split("-").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** schema.md without its first "# Title" line (the card has its own title). */
function guideBody(schema) {
  return schema.replace(/^#\s+[^\n]*\n+/, "").trim();
}

/**
 * @param {{ name: string, title?: string, description?: string, schema?: string, example: string }} v
 */
export function aiCard({ name, title, description = "", schema, example }) {
  const guide = schema
    ? guideBody(schema)
    : "No full guide yet. Copy the working example below and change its content; keep the lines that start with `:::` or a code fence as they are.";
  return `# ${title || displayName(name)}: a Bloob Haus visualizer

${description}

Write a normal markdown note. The block below is what this visualizer reads; everything outside it stays a normal page. Anything code can read reliably is fine, but follow the example's line shapes.

## How to write for it

${guide}

## A working example

\`\`\`\`markdown
${example.trimEnd()}
\`\`\`\`

Try it live: ${HOME}/${name}/
`;
}

/** One line per visualizer, for bloob.haus/visualizers/llms.txt. */
export function aiIndex(visualizers) {
  const lines = visualizers.map(
    (v) => `- [${v.title || displayName(v.name)}](${HOME}/${v.name}/ai.md): ${v.description || ""}`.trimEnd(),
  );
  return `# Bloob Haus visualizers

Each visualizer turns a markdown note into an object you can see and place. Every card below says how to write a note for one of them.

Making a new visualizer? Read [Making a Bloob Haus visualizer](${HOME}/making-a-visualizer.md) first.

${lines.join("\n")}
`;
}
