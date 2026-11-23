/**
 * Gestionnaires 3D du registre (C15, X6, X7, X12-X18, X26, X39) : modèle seul ou avec ses fichiers liés, ZIP de modèles,
 * fichier lié déposé seul. Le modèle est lu par le rendu partagé (validation, même sans WebGL), son instantané pris à la
 * vue par défaut, puis `AddModel3d` en une commande, placé comme une image (80 % du visible, cascade de 24). À l'inverse
 * d'`addMedia`, aucune autre écriture : principal, liés et instantané partent dans la même commande (X7), jamais en
 * `AddImage`.
 */
import { DEFAULT_MODEL3D_PITCH, DEFAULT_MODEL3D_YAW, SNAPSHOT_MIME, type AssetRef, type Command, type Model3dFormat } from "../core/api";
import { DEFAULT_CAMERA } from "../engine/render/model-frames";
import { messageOf } from "./controller";
import type { DroppedFile } from "./files";
import { anchorOf, HEAD_BYTES, placement, visibleOf } from "./image-import";
import { hasZipMagic, type ImportContext, type ImportHandler, type ImportOutcome } from "./import";
import {
  baseName, COMPANION_ALONE_MESSAGE, COMPRESSED_MESSAGE, extensionOf, gatherFiles, glbJsonText, gltfCompression,
  isCompanionName, missingFilesMessage, resolveReference, MODEL3D_MAX_BYTES, MODEL3D_MIME, MODEL3D_TOO_BIG_MESSAGE, MTL_MISSING_MESSAGE,
  NO_WEBGL_MESSAGE, sniffModel3d, ZIP_EMPTY_MESSAGE, ZIP_MAX_MODELS, ZIP_TOO_BIG_MESSAGE, type Sibling,
} from "./model3d-import";
import { snapshotSize, type ModelView } from "./model-view";
import type { ZipEntry } from "./zip-read";

export interface Model3dDeps {
  /** Rendu partagé, chargé au premier besoin (X20). */
  view(): Promise<ModelView>;
  /** Entrées gardées d'un ZIP (Worker jetable, X16). */
  readZip(blob: Blob): Promise<ZipEntry[]>;
}

/** X6 : boîte 4:3 avant placement (HX2-2). */
export const MODEL_BOX = { w: 640, h: 480 } as const;
export const MODEL3D_UNREADABLE = "modèle 3D illisible";
export const MODEL3D_TAB_CLOSED = "onglet fermé pendant l'import, objet 3D non inséré";

const IMAGE_MIME: Readonly<Record<string, string>> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
};

/** Type d'un fichier lié, par son extension (X11). */
export function linkedMime(path: string): string {
  const ext = extensionOf(path);
  if (ext === "mtl") return MODEL3D_MIME.mtl;
  return IMAGE_MIME[ext] ?? MODEL3D_MIME.bin;
}

const bytesOf = async (b: Blob): Promise<Uint8Array<ArrayBuffer>> => new Uint8Array(await b.arrayBuffer());
const siblingOf = (f: DroppedFile): Sibling => ({ path: f.name, bytes: async () => bytesOf(await f.blob()) });
/** X17 : pour la réclamation, un fichier au-delà de `MODEL3D_MAX_BYTES` est cité sans être lu (contenu vide) ; `importFiles`
 *  le retire ensuite des fichiers passés au modèle et le dit trop gros. */
const claimSiblingOf = (f: DroppedFile): Sibling =>
  f.size > MODEL3D_MAX_BYTES ? { path: f.name, bytes: async () => new Uint8Array(0) } : siblingOf(f);

interface Model {
  readonly name: string;
  /** Chemin du principal (nom seul pour un dépôt, chemin dans le ZIP). */
  readonly path: string;
  readonly format: Model3dFormat;
  readonly main: Uint8Array<ArrayBuffer>;
  readonly siblings: readonly Sibling[];
  /** Mineur C15 : fichiers liés écartés car trop gros, déjà dits : ni « absents », ni « sans son .mtl ». */
  readonly tooBig: readonly string[];
}

/** État d'un importeur, partagé par ses gestionnaires 3D : « 3D indisponible » n'est dit qu'une fois (X26). */
export interface Model3dShared {
  warnedNoWebgl: boolean;
}

async function insertModel(
  deps: Model3dDeps,
  shared: Model3dShared,
  m: Model,
  ctx: Omit<ImportContext, "blob">,
  index: number,
): Promise<ImportOutcome> {
  const target = ctx.target;
  if (target === null) return "failed";
  if (m.format === "glb" || m.format === "gltf") {
    const json = m.format === "gltf" ? new TextDecoder().decode(m.main) : glbJsonText(m.main);
    if (json !== null && gltfCompression(json) !== null) {
      await ctx.notify(`${m.name} : ${COMPRESSED_MESSAGE}`);
      return "failed";
    }
  }
  let view: ModelView;
  let snapshot: Blob | null;
  let missing: string[];
  let mtl: boolean | null;
  const mainBlob = new Blob([m.main], { type: MODEL3D_MIME[m.format] });
  const files: Array<{ readonly path: string; readonly blob: Blob }> = [];
  try {
    const g = await gatherFiles(m.format, m.path, m.main, m.siblings, m.tooBig);
    for (const f of g.files) files.push({ path: f.path, blob: new Blob([(await f.sibling.bytes()) as Uint8Array<ArrayBuffer>], { type: linkedMime(f.path) }) });
    view = await deps.view();
    const loaded = await view.load({ format: m.format, name: m.name, main: mainBlob, files: new Map(files.map((f) => [f.path, f.blob])) });
    try {
      snapshot = await view.snapshot(loaded, DEFAULT_CAMERA, snapshotSize(MODEL_BOX.w, MODEL_BOX.h));
    } finally {
      view.release(loaded);
    }
    // Un fichier cité écarté car trop gros (déjà dit) n'est pas redit absent par le rendu (mineur C15).
    const unsaid = (x: string): boolean => !g.missing.includes(x) && resolveReference(x, m.path, g.skipped) === null;
    missing = [...g.missing, ...loaded.missing.filter(unsaid)];
    mtl = g.mtl;
  } catch (e) {
    await ctx.notify(`Import impossible (${m.name}) : ${MODEL3D_UNREADABLE} (${messageOf(e)})`);
    return "failed";
  }
  const ref = async (blob: Blob, name: string): Promise<AssetRef> => ({ id: await target.assets.put(blob), name, mime: blob.type, size: blob.size });
  const asset = await ref(mainBlob, m.name);
  const linked: Array<{ readonly path: string; readonly asset: AssetRef }> = [];
  for (const f of files) linked.push({ path: f.path, asset: await ref(f.blob, baseName(f.path)) });
  const snap = snapshot === null ? null : await ref(new Blob([snapshot], { type: SNAPSHOT_MIME }), `${m.name}.png`);
  // Vérifié après la dernière attente, juste avant le premier appel au moteur (patron de `addMedia`).
  if (target.alive?.() === false) {
    await ctx.notify(`${m.name} : ${MODEL3D_TAB_CLOSED}`);
    return "failed";
  }
  const rect = target.stageRect();
  const camera = target.camera();
  const cmd: Command = {
    type: "AddModel3d",
    page: target.page(),
    asset,
    format: m.format,
    files: linked,
    w: MODEL_BOX.w,
    h: MODEL_BOX.h,
    yaw: DEFAULT_MODEL3D_YAW,
    pitch: DEFAULT_MODEL3D_PITCH,
    snapshot: snap,
    matrix: placement(MODEL_BOX.w, MODEL_BOX.h, anchorOf(rect, camera, ctx.at), visibleOf(rect, camera), index),
  };
  if (target.run(cmd) === null) return "failed";
  if (mtl === false) await ctx.notify(`${m.name} : ${MTL_MISSING_MESSAGE}`);
  else if (missing.length > 0) await ctx.notify(missingFilesMessage(m.name, missing));
  if (!view.available() && !shared.warnedNoWebgl) {
    shared.warnedNoWebgl = true;
    await ctx.notify(NO_WEBGL_MESSAGE);
  }
  return "inserted";
}

/** Entrée `model3d` (X11, X13, X17) : après `image` dans le registre. */
export function model3dHandler(deps: Model3dDeps, shared: Model3dShared = { warnedNoWebgl: false }): ImportHandler {
  return {
    id: "model3d",
    nature: "objet",
    detect: (head, name) => sniffModel3d(head, name) !== null,
    limit: { maxBytes: MODEL3D_MAX_BYTES, message: MODEL3D_TOO_BIG_MESSAGE },
    async companions(file, blob, head, siblings) {
      const format = sniffModel3d(head, file.name);
      if (format === null) return [];
      const g = await gatherFiles(format, file.name, await bytesOf(blob), siblings.map(claimSiblingOf));
      const names = new Set(g.files.map((f) => f.sibling.path));
      return siblings.filter((s) => names.has(s.name));
    },
    async run(file, ctx) {
      const format = sniffModel3d(ctx.head, file.name);
      if (format === null) return "failed";
      const main = await bytesOf(ctx.blob);
      const model = { name: file.name, path: file.name, format, main, siblings: ctx.companions.map(siblingOf), tooBig: ctx.tooBig ?? [] };
      return insertModel(deps, shared, model, ctx, ctx.inserted);
    },
  };
}

/** Entrée `zip3d` (X16) : nom `.zip` ET en-tête ZIP ; après `sheet` (un `.xlsx` ou un `.rbitem` est pris avant). */
export function zip3dHandler(deps: Model3dDeps, shared: Model3dShared = { warnedNoWebgl: false }): ImportHandler {
  return {
    id: "zip3d",
    nature: "objet",
    detect: (head, name) => extensionOf(name) === "zip" && hasZipMagic(head),
    limit: { maxBytes: MODEL3D_MAX_BYTES, message: MODEL3D_TOO_BIG_MESSAGE },
    async run(file, ctx) {
      let all: ZipEntry[];
      try {
        all = await deps.readZip(ctx.blob);
      } catch (e) {
        const msg = messageOf(e);
        await ctx.notify(msg === ZIP_TOO_BIG_MESSAGE ? `${file.name} : ${msg}` : `Import impossible (${file.name}) : ${msg}`);
        return "failed";
      }
      // X17, ZIP compris : une entrée au-delà de `MODEL3D_MAX_BYTES` n'est ni lue ni rangée, et dite trop grosse.
      const entries: ZipEntry[] = [];
      const tooBig: string[] = [];
      for (const e of all) {
        if (e.blob.size <= MODEL3D_MAX_BYTES) entries.push(e);
        else {
          tooBig.push(e.path);
          await ctx.notify(`${e.path} (${file.name}) : ${MODEL3D_TOO_BIG_MESSAGE}`);
        }
      }
      const siblings: Sibling[] = entries.map((e) => ({ path: e.path, bytes: () => bytesOf(e.blob) }));
      const mains: Array<{ readonly entry: ZipEntry; readonly format: Model3dFormat }> = [];
      for (const entry of entries) {
        const format = sniffModel3d(await bytesOf(entry.blob.slice(0, HEAD_BYTES)), entry.path);
        if (format !== null) mains.push({ entry, format });
        if (mains.length === ZIP_MAX_MODELS) break;
      }
      if (mains.length === 0) {
        await ctx.notify(`${file.name} : ${ZIP_EMPTY_MESSAGE}`);
        return "failed";
      }
      let any = false;
      for (const [i, { entry, format }] of mains.entries()) {
        const model: Model = {
          name: baseName(entry.path),
          path: entry.path,
          format,
          main: await bytesOf(entry.blob),
          siblings: siblings.filter((s) => s.path !== entry.path),
          tooBig,
        };
        if ((await insertModel(deps, shared, model, ctx, ctx.inserted + i)) === "inserted") any = true;
      }
      return any ? "inserted" : "failed";
    },
  };
}

/** X12 : `.mtl` ou `.bin` sans modèle : message, en échec. */
export function companionHandler(): ImportHandler {
  return {
    id: "model3d-companion",
    nature: "objet",
    detect: (_head, name) => isCompanionName(name),
    async run(file, ctx) {
      await ctx.notify(`${file.name} : ${COMPANION_ALONE_MESSAGE}`);
      return "failed";
    },
  };
}
