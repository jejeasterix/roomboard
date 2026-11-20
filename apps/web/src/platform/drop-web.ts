/** Dépôt de fichiers sur la fenêtre web (HTML5, côté cible seulement : aucun `draggable`, point 13). */
import type { DroppedFile, DropHandler } from "./files";

export interface DragEventLike {
  readonly clientX: number;
  readonly clientY: number;
  readonly dataTransfer: { readonly files: ArrayLike<File>; dropEffect: string } | null;
  preventDefault(): void;
}

export interface DropTargetLike {
  addEventListener(type: "dragover" | "drop", cb: (e: DragEventLike) => void): void;
  removeEventListener(type: "dragover" | "drop", cb: (e: DragEventLike) => void): void;
}

export function droppedFromFile(f: File): DroppedFile {
  return { name: f.name, size: f.size, mime: f.type, blob: async () => f };
}

export function listenWebDrop(target: DropTargetLike | null, handler: DropHandler): () => void {
  if (target === null) return () => undefined;
  const over = (e: DragEventLike): void => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };
  const drop = (e: DragEventLike): void => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files ?? [], droppedFromFile);
    if (files.length > 0) handler(files, { x: e.clientX, y: e.clientY });
  };
  target.addEventListener("dragover", over);
  target.addEventListener("drop", drop);
  return () => {
    target.removeEventListener("dragover", over);
    target.removeEventListener("drop", drop);
  };
}
