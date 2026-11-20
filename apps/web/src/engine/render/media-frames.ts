/**
 * Image courante des lecteurs de média, par élément (C14, DAM3, M20, M21) : le rendu est synchrone et ne voit jamais
 * d'octets ; il demande l'image du lecteur d'un élément et retombe sur le poster quand il n'y en a pas. Rangé par id
 * d'élément, jamais par empreinte : deux éléments d'une même vidéo ont chacun leur lecteur. Le port ne crée rien :
 * seul un geste (plateforme, `platform/media-players.ts`) lance un lecteur.
 */
export interface MediaFrames {
  /** Image courante du lecteur (readyState ≥ 2, lancé ou positionné dans la session) ; null : poster (M21). */
  frame(elementId: string): CanvasImageSource | null;
  /** Position (s) et lecture en cours ; null sans lecteur. */
  progress(elementId: string): { readonly time: number; readonly playing: boolean } | null;
}
