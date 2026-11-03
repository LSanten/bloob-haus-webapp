/**
 * The few lines that go into <head>, before any stylesheet that draws objects. They mark the page
 * as having script (html.bh-js) and decide how the page's own object starts (data-bh-initial), so
 * a remembered note never flashes shut and a closed marble never flashes open.
 *
 * Built from the same functions the tests run (state.js), so the rules can't drift.
 */
import { decideInitialState, rememberKey, arrivedFromSite } from "./state.js";

/** @param {{ pageId: string }} page */
export function headInitScript({ pageId }) {
  const id = JSON.stringify(String(pageId)).replace(/</g, "\\u003c");
  const body = `(function(){try{
var decide=${decideInitialState.toString()};var key=${rememberKey.toString()};var fromSite=${arrivedFromSite.toString()};
var h=document.documentElement;h.classList.add("bh-js");
var flag=sessionStorage.getItem("bh-arrive");sessionStorage.removeItem("bh-arrive");
var ref="";try{ref=document.referrer?new URL(document.referrer).origin:"";}catch(e){}
h.setAttribute("data-bh-initial",decide({remembered:!!localStorage.getItem(key(${id})),arrivedFromSite:fromSite({flagPath:flag,currentPath:location.pathname,referrerOrigin:ref,siteOrigin:location.origin}),opensOnArrival:true,hash:location.hash}));
}catch(e){}})();`;
  return `<script>${body}</script>`;
}
