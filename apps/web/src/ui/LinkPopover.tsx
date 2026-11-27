/**
 * Éditeur de lien d'un élément (T18, H5, déc. 38) : un champ dans un îlot. Entrée (ou Valider) écrit le lien par un
 * seul `submit` (une étape) ; un champ vide retire le lien (`submit(null)`) ; Échap ou un appui hors de l'îlot ferme
 * sans écrire ; le focus revient à l'élément qui l'avait. Schéma hors `http://`, `https://`, `mailto:` refusé ici, par
 * la règle du cœur (`validLink`), et de nouveau par le cœur. Visuel RoomBoard : îlot, jetons `--rf-*`, icône Lucide
 * `link`, cibles de 44 px. Comportement d'Excalidraw (actions/actionLink.tsx, MIT) : un seul élément, Ctrl+K ; aucun
 * code repris.
 */
import { Show, createSignal, onCleanup, onMount, type JSX } from "solid-js";
import { LINK_MAX_CHARS, validLink } from "../core/look";
import { Icon, IconButton } from "./IconButton";

export interface LinkPopoverProps {
  /** Lien actuel de l'élément ; null : aucun. */
  readonly value: string | null;
  /** Lien validé ; null : lien retiré. */
  submit(url: string | null): void;
  close(): void;
  readonly style?: JSX.CSSProperties;
}

export const LINK_REFUSED = "Lien refusé : il doit commencer par https://, http:// ou mailto:.";
export const LINK_TOO_LONG = "Lien trop long : 2 048 caractères au plus.";

/** Saisie lue : bords retirés ; vide = retrait ; sinon le lien, ou le message du refus. */
export function checkLink(raw: string): { readonly ok: true; readonly url: string | null } | { readonly ok: false; readonly message: string } {
  const url = raw.trim();
  if (url === "") return { ok: true, url: null };
  if ([...url].length > LINK_MAX_CHARS) return { ok: false, message: LINK_TOO_LONG };
  if (!validLink(url)) return { ok: false, message: LINK_REFUSED };
  return { ok: true, url };
}

let seq = 0;

export function LinkPopover(props: LinkPopoverProps): JSX.Element {
  const errId = `rb-link-err-${++seq}`;
  const [text, setText] = createSignal(props.value ?? "");
  const [error, setError] = createSignal<string | null>(null);
  let root: HTMLDivElement | undefined;
  let input: HTMLInputElement | undefined;
  let back: HTMLElement | null = null;
  const validate = (): void => {
    const r = checkLink(input?.value ?? text());
    if (!r.ok) {
      setError(r.message);
      input?.focus();
      return;
    }
    setError(null);
    props.submit(r.url);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      validate();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      props.close();
    }
  };
  const outside = (e: Event): void => {
    if (root !== undefined && e.target instanceof Node && root.contains(e.target)) return;
    props.close();
  };
  onMount(() => {
    const active = document.activeElement;
    back = active instanceof HTMLElement && active !== document.body ? active : null;
    input?.focus();
    input?.select();
    document.addEventListener("pointerdown", outside, true);
  });
  onCleanup(() => {
    document.removeEventListener("pointerdown", outside, true);
    if (back !== null && back.isConnected) back.focus();
  });
  return (
    <div ref={root} class="rb-island rb-link-pop" data-link-popover role="dialog" aria-label="Lien de l'élément" style={props.style}>
      <div class="rb-link-row">
        <span class="rb-link-ic" aria-hidden="true">
          <Icon name="link" />
        </span>
        <input
          ref={input}
          type="url"
          inputmode="url"
          enterkeyhint="done"
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          placeholder="https://…"
          aria-label="Adresse du lien"
          aria-invalid={error() !== null}
          aria-describedby={error() !== null ? errId : undefined}
          value={text()}
          onInput={(e) => {
            setText(e.currentTarget.value);
            setError(null);
          }}
          onKeyDown={onKey}
        />
        <IconButton icon="check" label="Valider le lien (Entrée)" attrs={{ class: "rb-opt-btn", "data-link-ok": "" }} onPress={validate} />
      </div>
      <Show when={error()}>
        {(m) => (
          <p id={errId} class="rb-link-err" role="alert">
            {m()}
          </p>
        )}
      </Show>
    </div>
  );
}
