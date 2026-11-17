/** Prise en charge des API d'entrée et d'affichage (D30), lue dans le navigateur courant. Banc du lot 1 et application. */
import type { Support } from "./stats";

export function detectSupport(): Support {
  const proto = typeof PointerEvent === "undefined" ? null : PointerEvent.prototype;
  const probe = document.createElement("canvas").getContext("2d", { desynchronized: true });
  return {
    coalesced: proto !== null && "getCoalescedEvents" in proto,
    predicted: proto !== null && "getPredictedEvents" in proto,
    desynchronized: probe?.getContextAttributes().desynchronized === true,
    inkPresenter: "ink" in navigator,
    pointerRawUpdate: "onpointerrawupdate" in window,
    secureContext: window.isSecureContext,
  };
}
