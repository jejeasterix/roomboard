/**
 * Coquille du navigateur (D26) : question et message par la fenêtre, fermeture gardée par `beforeunload` (le navigateur
 * affiche son propre texte), titre de la page.
 */
import { validLink } from "../core/look";
import { LINK_OPEN_FAILED, type ShellPort } from "./files";

export interface BeforeUnloadEventLike {
  preventDefault(): void;
  returnValue: unknown;
}

export interface WebShellWindow {
  confirm(message: string): boolean;
  alert(message: string): void;
  addEventListener(type: "beforeunload", cb: (e: BeforeUnloadEventLike) => void): void;
  removeEventListener(type: "beforeunload", cb: (e: BeforeUnloadEventLike) => void): void;
  readonly document: { title: string };
  /** T18 : `window.open` ; absent : aucun lien ouvert. */
  open?(url: string, target: string, features: string): unknown;
}

export function createWebShell(w: WebShellWindow): ShellPort {
  return {
    confirm: async (message) => w.confirm(message),
    notify: async (message) => {
      w.alert(message);
    },
    guardClose(isDirty, _message, divert) {
      const onBeforeUnload = (e: BeforeUnloadEventLike): void => {
        if (divert?.() !== true && !isDirty()) return;
        e.preventDefault();
        e.returnValue = "";
      };
      w.addEventListener("beforeunload", onBeforeUnload);
      return () => w.removeEventListener("beforeunload", onBeforeUnload);
    },
    setTitle(title) {
      w.document.title = title;
    },
    // T18 (déc. 38) : jamais `window.open(url)` nu : schéma contrôlé, onglet neuf sans `opener`.
    openLink(url) {
      if (!validLink(url) || w.open === undefined) return;
      // T41 : avec `noopener`, `window.open` rend toujours null (norme HTML) : le retour ne dit rien ; seule une exception est un échec.
      try {
        w.open(url, "_blank", "noopener");
      } catch {
        w.alert(LINK_OPEN_FAILED);
      }
    },
  };
}
