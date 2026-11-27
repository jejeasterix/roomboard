/**
 * Sélecteur de couleur complet (OG11, T16) : popover open-color (15 teintes × 5 nuances) et champ hexadécimal.
 * Comportement copié d'Excalidraw (packages/excalidraw/components/ColorPicker/, Copyright (c) 2020 Excalidraw, licence MIT) :
 * flèches dans la grille, Entrée choisit, Échap ferme et rend le focus au bouton d'origine, saisie hexadécimale validée.
 * Visuel RoomBoard (îlot, jetons `--rf-*`, cases = taille du profil). Pas de lettres q-w-e (H8).
 * OG23 (T8) : pipette de scène (`pick`) ; armée, le toucher extérieur ne ferme pas (il va lire la scène).
 */
import { For, Show, createSignal, onCleanup, onMount, type JSX } from "solid-js";
import { tryParseColor } from "../engine/render/webgl2";
import { IconButton } from "./IconButton";
import { OPEN_COLOR } from "./open-color";
import { buttonShortcut } from "./shortcuts";

export interface ColorPickerProps {
  readonly value: string | null;
  /** `null` : la case Transparent (seulement si `transparent`). */
  choose(c: string | null): void;
  /** Montre la case Transparent au-dessus de la grille. */
  readonly transparent?: boolean;
  close(): void;
  /** OG23 (T8) : arme la pipette de scène ; résout la couleur lue (`#rrggbb`) ou null (annulée, transparent). Absent : pas de bouton. */
  readonly pick?: () => Promise<string | null>;
  /** Bouton qui a ouvert le sélecteur : il reprend le focus à la fermeture. */
  readonly anchor: HTMLElement;
}

const COLS = 5;
const STEP: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0],
};

/** `#rgb`, `#rrggbb`… avec ou sans dièse : la couleur normalisée en minuscules, ou null. */
export function parseHex(text: string): string | null {
  const t = text.trim().toLowerCase();
  const withHash = /^[0-9a-f]+$/.test(t) ? `#${t}` : t;
  return /^#[0-9a-f]+$/.test(withHash) && tryParseColor(withHash) !== null ? withHash : null;
}

export function ColorPicker(props: ColorPickerProps): JSX.Element {
  let root: HTMLDivElement | undefined;
  const [invalid, setInvalid] = createSignal(false);
  // Pipette armée : le toucher extérieur ne ferme pas, Échap est laissé au moteur (qui désarme).
  let armed = false;
  const arm = (): void => {
    if (armed || props.pick === undefined) return;
    armed = true;
    void props.pick().then((c) => {
      armed = false;
      if (c !== null) props.choose(c);
    });
  };
  const current = (): string | null => props.value?.toLowerCase() ?? null;
  const cells = (): HTMLElement[] => [...(root?.querySelectorAll<HTMLElement>("[role=gridcell]") ?? [])];
  const shut = (): void => {
    props.close();
    props.anchor.focus();
  };
  const startIndex = (): number => {
    const at = cells().findIndex((c) => c.getAttribute("aria-selected") === "true");
    return at < 0 ? 0 : at;
  };
  onMount(() => {
    cells()[startIndex()]?.focus();
    // Un geste hors du sélecteur et hors du bouton d'origine le ferme (le bouton d'origine bascule lui-même).
    const away = (e: PointerEvent): void => {
      const t = e.target as Node | null;
      if (armed) return;
      if (t !== null && !root?.contains(t) && !props.anchor.contains(t)) props.close();
    };
    document.addEventListener("pointerdown", away, true);
    onCleanup(() => document.removeEventListener("pointerdown", away, true));
  });
  const onKey = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (e.key.toLowerCase() === "i" && !e.ctrlKey && !e.altKey && !e.metaKey && tag !== "INPUT" && props.pick !== undefined) {
      e.preventDefault();
      arm();
      return;
    }
    if (e.key === "Escape" && !armed) {
      // Le moteur écoute Échap sur la fenêtre (désélection) : le sélecteur le garde.
      e.stopPropagation();
      e.preventDefault();
      shut();
    }
  };
  const onGridKey = (e: KeyboardEvent, i: number): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      props.choose(OPEN_COLOR[Math.floor(i / COLS)]![i % COLS]!);
      return;
    }
    if (!Object.hasOwn(STEP, e.key)) return;
    e.preventDefault();
    const [dr, dc] = STEP[e.key]!;
    const r = Math.min(OPEN_COLOR.length - 1, Math.max(0, Math.floor(i / COLS) + dr));
    const c = Math.min(COLS - 1, Math.max(0, (i % COLS) + dc));
    cells()[r * COLS + c]?.focus();
  };
  const commit = (input: HTMLInputElement): void => {
    const hex = parseHex(input.value);
    setInvalid(hex === null);
    if (hex !== null) props.choose(hex);
  };
  return (
    <div ref={root} class="rb-color-picker" data-color-picker role="dialog" aria-label="Autres couleurs" onKeyDown={onKey}>
      <Show when={props.transparent === true || props.pick !== undefined}>
        <div class="rb-color-tools">
          <Show when={props.transparent === true}>
            <button type="button" class="rb-color-transparent" data-transparent data-color-transparent aria-label="Transparent" title="Transparent" onClick={() => props.choose(null)}>
              <span class="rb-pick-dot" />
            </button>
          </Show>
          <Show when={props.pick !== undefined}>
            <IconButton keepFocus icon="pipette" label="Pipette" shortcut={buttonShortcut("pipette")} attrs={{ "data-color-pipette": "", class: "rb-color-pipette" }} onPress={arm} />
          </Show>
        </div>
      </Show>
      <div class="rb-color-grid" role="grid" aria-label="Palette">
        <For each={OPEN_COLOR}>
          {(row, r) => (
            <div class="rb-color-row" role="row">
              <For each={row}>
                {(color, c) => (
                  <button
                    type="button"
                    role="gridcell"
                    class="rb-color-cell"
                    aria-label={color}
                    aria-selected={current() === color}
                    tabindex={r() * COLS + c() === 0 ? 0 : -1}
                    onFocus={(e) => cells().forEach((x) => x.setAttribute("tabindex", x === e.currentTarget ? "0" : "-1"))}
                    onKeyDown={(e) => onGridKey(e, r() * COLS + c())}
                    onClick={() => props.choose(color)}
                  >
                    <span class="rb-pick-dot" style={{ background: color }} />
                  </button>
                )}
              </For>
            </div>
          )}
        </For>
      </div>
      <label class="rb-color-hex">
        <span>Hexadécimal</span>
        <input
          type="text"
          data-color-hex
          maxlength="9"
          spellcheck={false}
          autocomplete="off"
          placeholder="#1e1e1e"
          aria-label="Couleur hexadécimale"
          aria-invalid={invalid()}
          value={props.value ?? ""}
          onInput={() => setInvalid(false)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(e.currentTarget); } }}
          // Comme Excalidraw (ColorInput.tsx) : la perte du focus ne valide rien, elle rétablit la couleur courante.
          onBlur={(e) => { setInvalid(false); e.currentTarget.value = props.value ?? ""; }}
        />
      </label>
    </div>
  );
}
