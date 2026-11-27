// OG23 (DA-2) : dispositions de `Command::Arrange`, mêmes noms que `ArrangeHow` du cœur (crates/roomboard-core/src/arrange.rs).
export const ARRANGE_HOWS = [
  "align-left", "align-center", "align-right", "align-top", "align-middle", "align-bottom",
  "distribute-h", "distribute-v", "flip-h", "flip-v", "rotate-cw", "rotate-ccw",
] as const;
export type ArrangeHow = (typeof ARRANGE_HOWS)[number];
export const isArrangeHow = (v: unknown): v is ArrangeHow => typeof v === "string" && (ARRANGE_HOWS as readonly string[]).includes(v);
/** Message du pont et du faux cœur pour une disposition inconnue. */
export const arrangeUnknown = (how: string): string => `disposition inconnue : ${how}`;
