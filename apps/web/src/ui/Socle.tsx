import { createSignal, type JSX } from "solid-js";

/** Témoin SolidJS (T82) : un bouton à compteur, gardé comme test de fumée. */
export function Socle(props: { readonly label: string }): JSX.Element {
  const [n, setN] = createSignal(0);
  return (
    <button data-socle type="button" onClick={() => setN(n() + 1)}>
      {props.label} {n()}
    </button>
  );
}
