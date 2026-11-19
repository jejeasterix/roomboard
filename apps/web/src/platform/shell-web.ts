/**
 * Coquille du navigateur (D26) : question et message par la fenêtre, fermeture gardée par `beforeunload` (le navigateur
 * affiche son propre texte), titre de la page.
 */
import type { ShellPort } from "./files";

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
}

export function createWebShell(w: WebShellWindow): ShellPort {
  return {
    confirm: async (message) => w.confirm(message),
    notify: async (message) => {
      w.alert(message);
    },
    guardClose(isDirty) {
      const onBeforeUnload = (e: BeforeUnloadEventLike): void => {
        if (!isDirty()) return;
        e.preventDefault();
        e.returnValue = "";
      };
      w.addEventListener("beforeunload", onBeforeUnload);
      return () => w.removeEventListener("beforeunload", onBeforeUnload);
    },
    setTitle(title) {
      w.document.title = title;
    },
  };
}
