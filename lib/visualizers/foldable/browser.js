/**
 * Foldable: browser behavior only (no markup).
 *
 * Folds are native <details>, so opening and closing needs no script. This only
 * covers a link that points INTO a closed fold (a heading anchor, a footnote
 * back-reference): open every fold around the target, then scroll to it.
 * Chrome does this on its own for fragment navigation; Safari and Firefox
 * do not.
 */
function openFoldsAroundHash() {
  var id = "";
  try {
    id = decodeURIComponent(window.location.hash.slice(1));
  } catch (e) {
    id = window.location.hash.slice(1);
  }
  if (!id) return;
  var target = document.getElementById(id);
  if (!target) return;

  var opened = false;
  var fold = target.closest("details.bloob-fold");
  while (fold) {
    if (!fold.open) {
      fold.open = true;
      opened = true;
    }
    fold = fold.parentElement ? fold.parentElement.closest("details.bloob-fold") : null;
  }
  if (opened) target.scrollIntoView();
}

window.addEventListener("hashchange", openFoldsAroundHash);
// "load", not DOMContentLoaded: heading ids are assigned by a DOMContentLoaded
// script in some themes (share-bar.njk), and must exist before we look.
window.addEventListener("load", openFoldsAroundHash);
