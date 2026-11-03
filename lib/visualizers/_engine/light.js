/**
 * The room's one light, as numbers, for anything that draws itself (a canvas, a 3D scene). The
 * theme sets --light-x, --light-y (0 to 1 across the screen) and --light-warmth (0 daylight, 1
 * lamp); see docs/architecture/tokens.md. Browser only.
 */
export function readLight(el = document.documentElement) {
  const style = getComputedStyle(el);
  const num = (name, fallback) => {
    const value = parseFloat(style.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };
  return { x: num("--light-x", 1), y: num("--light-y", 0), warmth: num("--light-warmth", 0) };
}
