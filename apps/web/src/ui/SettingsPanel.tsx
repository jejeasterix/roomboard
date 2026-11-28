import { createSignal, For, onCleanup, Show, type Accessor, type JSX } from "solid-js";
import type { DeviceSettings } from "../device-settings";
import type { RendererDiagnostics } from "../engine/render/select";
import {
  cycleSetting,
  needsReload,
  settingLabel,
  settingsSearch,
  type EffectiveEchelons,
  type SettingKey,
  type SettingsStore,
} from "../engine/settings";
import { Icon } from "./IconButton";
import "./settings.css";

export const RELOAD_DIRTY_MESSAGE = "Recharger : les onglets non enregistrés seront perdus. Continuer ?";

/** design-l4 (L4-14) : libellés du bouton du cadre de l'annotation. */
export const FRAME_LABELS = Object.freeze({ on: "Cadre de l'annotation : affiché", off: "Cadre de l'annotation : masqué" });

/** OG25 (déc. 26, 27) : libellés du bouton de la gomme automatique à la paume, repris par l'avis de Ctrl+Maj+H. */
export const PALM_ERASER_LABELS = Object.freeze({
  on: "Gomme automatique à la paume : active",
  off: "Gomme automatique à la paume : coupée",
});

export interface SettingsPanelProps {
  readonly store: SettingsStore;
  readonly effective: Accessor<EffectiveEchelons>;
  readonly notes: readonly string[];
  readonly diagnostics: Accessor<RendererDiagnostics>;
  search(): string;
  navigate(search: string): void;
  anyDirty(): boolean;
  confirm(message: string): Promise<boolean>;
  /** design-l4 (L4-14) : réglages de l'appareil ; donnés seulement avec la capacité d'annotation (H10) ; absents : aucun
   *  bouton du cadre. */
  readonly device?: DeviceSettings;
  /** OG25 (déc. 26) : réglage de la gomme automatique à la paume, sur toutes les plateformes ; absent : aucun bouton. */
  readonly palmEraser?: DeviceSettings;
}

const WEBGL_WORDS = { on: "actif", off: "coupé", repli: "repli Canvas 2D" } as const;

/** Texte du `title` et de la note visible des réglages qui rechargent la page (É3, É4). */
const RELOAD_HINT = "Recharge la page : le dessin en cours est perdu";

/** OG39 : sections du panneau, dans l'ordre ; chaque clé de `SETTING_KEYS` dans l'une d'elles, dans
 *  le même ordre (le test « un bouton par réglage » le vérifie). */
const SAISIE: readonly SettingKey[] = ["finger", "palm"];
const RENDU: readonly SettingKey[] = ["prediction", "inkTrail", "webgl"];

/** « Doigt : vue » → nom « Doigt », valeur « vue » ; le texte complet du bouton reste celui des essais. */
function splitLabel(text: string): readonly [string, string] {
  const at = text.indexOf(" : ");
  return at < 0 ? [text, ""] : [text.slice(0, at), text.slice(at + 3)];
}

/** Nom, séparateur (lu, pas montré) et valeur d'une rangée : `textContent` = libellé complet. */
function RowText(props: { text: string; hideValue?: boolean }): JSX.Element {
  const parts = () => splitLabel(props.text);
  return (
    <>
      <span class="rb-set-name">{parts()[0]}</span>
      <span class="rb-set-sep"> : </span>
      <span class="rb-set-val" classList={{ "rb-set-sr": props.hideValue === true }}>{parts()[1]}</span>
    </>
  );
}

/** Section titrée du panneau (OG39) : icône Lucide et titre comme l'en-tête du panneau d'options, sans accordéon. */
function Section(props: { id: string; icon: string; title: string; children: JSX.Element }): JSX.Element {
  return (
    <section class="rb-set-sec" data-section={props.id} aria-labelledby={`reglages-h-${props.id}`}>
      <h3 class="rb-set-h" id={`reglages-h-${props.id}`}>
        <Icon name={props.icon} />
        <span>{props.title}</span>
      </h3>
      {props.children}
    </section>
  );
}

/** Interrupteur d'un réglage oui / non (OG39) : `role="switch"`, poignée à droite, valeur lue par le lecteur d'écran. */
function SwitchRow(props: { reglage: string; on: boolean; label: string; toggle(): void }): JSX.Element {
  return (
    <button type="button" class="rb-set-row" role="switch" aria-checked={props.on} data-reglage={props.reglage} onClick={() => props.toggle()}>
      <RowText text={props.label} hideValue />
      <span class="rb-set-knob" aria-hidden="true" />
    </button>
  );
}

export function SettingsPanel(props: SettingsPanelProps): JSX.Element {
  const [settings, setSettings] = createSignal(props.store.get());
  onCleanup(props.store.onChange(setSettings));
  const device = props.device;
  const [frame, setFrameShown] = createSignal(device?.frame() ?? true);
  if (device !== undefined) onCleanup(device.onChange(() => setFrameShown(device.frame())));
  const palmDevice = props.palmEraser;
  const [palmOn, setPalmOn] = createSignal(palmDevice?.palmEraser() ?? true);
  if (palmDevice !== undefined) onCleanup(palmDevice.onChange(() => setPalmOn(palmDevice.palmEraser())));

  const click = async (key: SettingKey): Promise<void> => {
    const next = cycleSetting(props.store.get(), key);
    if (!needsReload(key)) {
      props.store.set(next);
      return;
    }
    if (props.anyDirty() && !(await props.confirm(RELOAD_DIRTY_MESSAGE))) return;
    props.navigate(settingsSearch(next, props.search()));
  };

  const diagnostic = (): string => {
    const d = props.diagnostics();
    let text = `WebGL2 : ${WEBGL_WORDS[d.webgl]}`;
    if (d.lost) text += " · contexte perdu";
    if (d.badColors.length > 0) text += ` · couleurs refusées : ${d.badColors.join(", ")}`;
    return text;
  };

  /** Rangée d'un réglage du moteur : un appui passe à la valeur suivante (`cycleSetting`), comme avant OG39. */
  const engineRow = (key: SettingKey): JSX.Element => (
    <button
      type="button"
      class="rb-set-row"
      data-reglage={key}
      title={needsReload(key) ? RELOAD_HINT : undefined}
      aria-describedby={needsReload(key) ? "reglages-recharge" : undefined}
      onClick={() => void click(key)}
    >
      <RowText text={settingLabel(key, settings(), props.effective())} />
      <Show when={needsReload(key)}>
        <Icon name="reset" />
      </Show>
    </button>
  );

  return (
    <div id="reglages" class="rb-settings" role="group" aria-label="Réglages du moteur">
      <Section id="saisie" icon="hand" title="Stylet et doigt">
        <For each={SAISIE}>{engineRow}</For>
        <Show when={palmDevice}>
          {(dev) => <SwitchRow reglage="gomme-paume" on={palmOn()} label={palmOn() ? PALM_ERASER_LABELS.on : PALM_ERASER_LABELS.off} toggle={() => void dev().setPalmEraser(!dev().palmEraser())} />}
        </Show>
      </Section>
      <Section id="rendu" icon="pen-line" title="Rendu de l'encre">
        <For each={RENDU}>{engineRow}</For>
        <p id="reglages-recharge" class="rb-set-hint">{RELOAD_HINT}</p>
      </Section>
      <Show when={device}>
        {(dev) => (
          <Section id="annotation" icon="annotate" title="Annotation">
            <SwitchRow reglage="cadre" on={frame()} label={frame() ? FRAME_LABELS.on : FRAME_LABELS.off} toggle={() => void dev().setFrame(!dev().frame())} />
          </Section>
        )}
      </Show>
      <footer class="rb-set-foot">
        <span id="echelons-notes" hidden={props.notes.length === 0}>{props.notes.join(" · ")}</span>
        <p id="webgl-diagnostic">{diagnostic()}</p>
      </footer>
    </div>
  );
}
