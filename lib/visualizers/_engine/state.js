/**
 * How an object starts when a page loads. Pure, so the same rules run in the head script
 * (before the first paint, no flash) and in tests.
 *
 *   "open"   already open from the first paint: a #heading link, or this visitor left it open
 *   "play"   starts closed and opens by itself: the visitor clicked a link to it inside the site
 *   "closed" everything else: a shared link, another site, a typed address
 */
export function decideInitialState({ remembered, arrivedFromSite, opensOnArrival, hash }) {
  if (hash && hash.length > 1) return "open";
  if (remembered) return "open";
  if (arrivedFromSite && opensOnArrival) return "play";
  return "closed";
}

/**
 * How long the opening takes. An object that paces by length (a note unrolling) takes longer the
 * more there is to unroll; everything else takes 900 ms.
 */
export function openDuration({ height, pace }) {
  if (pace !== "length") return 900;
  return Math.round(Math.min(2200, Math.max(650, (height - 172) * 0.9)));
}

export function rememberKey(pageId) {
  return "bh-open:" + pageId;
}

/** A click inside the site leaves a flag naming the target; a same-site referrer also counts. */
export function arrivedFromSite({ flagPath, currentPath, referrerOrigin, siteOrigin }) {
  if (flagPath && flagPath === currentPath) return true;
  return !!referrerOrigin && referrerOrigin === siteOrigin;
}
