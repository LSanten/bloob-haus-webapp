// Where a marble's baked picture lives: one file per page address, smaller sizes beside it.
export function closedPicturePath(url, size) {
  const name = String(url).replace(/^\/+|\/+$/g, "").replace(/\//g, "--") || "home";
  return `/og/marble/${name}${size ? `-${size}` : ""}.png`;
}
