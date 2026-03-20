/**
 * Image Grid Visualizer — Build-time Transform
 *
 * Transforms ::: image-grid ... ::: container sections into a styled
 * team member grid. The container must contain a markdown table with
 * three columns: Photo, Name, Title.
 *
 * Container settings (optional):
 *   title="Our Team"   — section heading (default: "Our Team")
 *   id=team            — section id attribute (default: "team")
 *
 * Example source (index.md):
 *   ::: image-grid title="Our Team" id=team
 *   | Photo               | Name            | Title                    |
 *   | ------------------- | --------------- | ------------------------ |
 *   | ![[865A2882.jpg]]   | Shannon Allison | Principal, Mech. Design  |
 *   :::
 *
 * Output matches .team / .team__member layout from theme.min.css.
 */

export const type = "build-time";
export const name = "image-grid";

/**
 * Extracts the src attribute from the first <img> tag in an HTML string.
 */
function extractImgSrc(html) {
  const match = html.match(/<img[^>]+src="([^"]+)"/i);
  return match ? match[1] : null;
}

/**
 * Extracts the alt attribute from the first <img> tag in an HTML string.
 */
function extractImgAlt(html) {
  const match = html.match(/<img[^>]+alt="([^"]*)"/i);
  return match ? match[1] : "";
}

/**
 * Strips all HTML tags from a string, returning plain text.
 */
function stripTags(html) {
  return html.replace(/<[^>]+>/g, "").trim();
}

/**
 * Parse data-vis-settings JSON attribute if present.
 */
function parseSettings(sectionHtml) {
  const match = sectionHtml.match(/data-vis-settings='([^']+)'/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

export function transform(html) {
  // Match <section class="image-grid"...>...</section>
  // The class may include data-vis-settings attribute.
  const sectionPattern =
    /<section class="image-grid"([^>]*)>([\s\S]*?)<\/section>/gi;

  return html.replace(sectionPattern, (match, attrs, innerHtml) => {
    const settings = parseSettings(match);
    const title = settings.title || "Our Team";
    const sectionId = settings.id || "team";

    // Extract table rows from the rendered HTML table.
    // We skip the header row (<thead>) and parse only <tbody> rows.
    const tbodyMatch = innerHtml.match(/<tbody>([\s\S]*?)<\/tbody>/i);
    if (!tbodyMatch) {
      console.warn("[image-grid] No table body found — skipping transform.");
      return match;
    }

    const rowPattern = /<tr>([\s\S]*?)<\/tr>/gi;
    const rows = [];
    let rowMatch;
    while ((rowMatch = rowPattern.exec(tbodyMatch[1])) !== null) {
      rows.push(rowMatch[1]);
    }

    if (rows.length === 0) {
      console.warn("[image-grid] No table rows found — skipping transform.");
      return match;
    }

    // Parse each row into { src, alt, name, title }
    const members = rows.map((rowHtml) => {
      const cellPattern = /<td>([\s\S]*?)<\/td>/gi;
      const cells = [];
      let cellMatch;
      while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
        cells.push(cellMatch[1].trim());
      }
      const [photoCell = "", nameCell = "", titleCell = ""] = cells;
      return {
        src: extractImgSrc(photoCell) || "",
        alt: extractImgAlt(photoCell),
        name: stripTags(nameCell),
        role: stripTags(titleCell),
      };
    });

    // Build member card HTML
    const memberCards = members
      .map(
        ({ src, alt, name, role }) => `
        <div class="team__member">
            <img decoding="async" loading="lazy" class="team__member-image" src="${src}" alt="${alt}">
            <div class="team-member-info">
                <h3 class="team__member-name">${name}</h3>
                <p class="team__member-position">${role}</p>
            </div>
        </div>`,
      )
      .join("\n");

    return `<section class="team" id="${sectionId}">
    <div class="team__wrapper maxwidth">
        <h1 class="h1-medium team__title">${title}</h1>
        <div class="team__members">
${memberCards}
        </div>
    </div>
</section>`;
  });
}
