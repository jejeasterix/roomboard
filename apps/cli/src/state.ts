/**
 * État `roomboard-cli/1` (cadrage cli, DA4) : enveloppe fixe, vues du cœur sans transformation. `version`, `canUndo`,
 * `canRedo` décrivent la session en mémoire (repartent de zéro à chaque ouverture) ; seuls `pages` et `assets` décrivent
 * le contenu, toute comparaison d'états porte sur eux. `points` : traits seulement, sous `--points`.
 */
import type { AssetInfo, CoreDocument, ElementView, PageView } from "../../web/src/core/api";
import { CliError, SCHEMA } from "./contract";

export type ElementState = ElementView & { readonly points?: readonly number[] };
export interface PageState {
  readonly index: number;
  readonly page: PageView;
  readonly elements: readonly ElementState[];
}
export interface CliState {
  readonly schema: typeof SCHEMA;
  readonly file: string | null;
  readonly version: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly pages: readonly PageState[];
  readonly assets: readonly AssetInfo[];
}

export function stateOf(doc: CoreDocument, file: string | null, opts: { readonly page?: string | undefined; readonly points?: boolean } = {}): CliState {
  const ids = doc.pageIds();
  if (opts.page !== undefined && !ids.includes(opts.page)) throw new CliError("command", `page inconnue : ${opts.page}`);
  const pages = ids.flatMap((id, index): PageState[] => {
    if (opts.page !== undefined && id !== opts.page) return [];
    const page = doc.page(id);
    if (page === null) return [];
    const elements = doc.elementIds(id).flatMap((e): ElementState[] => {
      const view = doc.element(e);
      if (view === null) return [];
      return opts.points === true && view.kind === "stroke" ? [{ ...view, points: Array.from(doc.points(e) ?? []) }] : [view];
    });
    return [{ index, page, elements }];
  });
  return { schema: SCHEMA, file, version: doc.version(), canUndo: doc.canUndo(), canRedo: doc.canRedo(), pages, assets: doc.citedAssets() };
}
