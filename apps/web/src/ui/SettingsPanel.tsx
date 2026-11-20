import { createSignal, For, onCleanup, type Accessor, type JSX } from "solid-js";
import type { RendererDiagnostics } from "../engine/render/select";
import {
  cycleSetting,
  needsReload,
  SETTING_KEYS,
  settingLabel,
  settingsSearch,
  type EffectiveEchelons,
  type SettingKey,
  type SettingsStore,
} from "../engine/settings";

export const RELOAD_DIRTY_MESSAGE = "Recharger : les onglets non enregistrés seront perdus. Continuer ?";

export interface SettingsPanelProps {
  readonly store: SettingsStore;
  readonly effective: Accessor<EffectiveEchelons>;
  readonly notes: readonly string[];
  readonly diagnostics: Accessor<RendererDiagnostics>;
  search(): string;
  navigate(search: string): void;
  anyDirty(): boolean;
  confirm(message: string): Promise<boolean>;
}

const WEBGL_WORDS = { on: "actif", off: "coupé", repli: "repli Canvas 2D" } as const;

export function SettingsPanel(props: SettingsPanelProps): JSX.Element {
  const [settings, setSettings] = createSignal(props.store.get());
  onCleanup(props.store.onChange(setSettings));

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

  return (
    <div id="reglages" role="group" aria-label="Réglages du moteur">
      <For each={SETTING_KEYS}>
        {(key) => (
          <button
            type="button"
            data-reglage={key}
            title={needsReload(key) ? "Recharge la page : le dessin en cours est perdu" : undefined}
            onClick={() => void click(key)}
          >
            {settingLabel(key, settings(), props.effective())}
          </button>
        )}
      </For>
      <span id="echelons-notes">{props.notes.join(" · ")}</span>
      <p id="webgl-diagnostic">{diagnostic()}</p>
    </div>
  );
}
