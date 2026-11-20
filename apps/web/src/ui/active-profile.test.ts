// @vitest-environment happy-dom
import { createComputed, createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { createProfileStore } from "../profile-store";
import { parseProfile, resolveStartMode, visibleItems, type RuntimeCapabilities } from "../toolbar";
import { BUILTIN_PROFILES, DEFAULT_PROFILE_JSON } from "../toolbar-profiles";
import { createActiveProfile } from "./active-profile";

const NO_CAPS: RuntimeCapabilities = { desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false };

function profileWithDrop() {
  const json = JSON.parse(JSON.stringify(DEFAULT_PROFILE_JSON)) as Record<string, any>;
  json.id = "depot";
  json.behavior = { startMode: "desktop-annotation" };
  json.toolbars[0].groups[0].items.push({ id: "depot-1", kind: "dropzone", label: "Déposer", requires: ["dropPaths"] });
  const r = parseProfile(json);
  if ("errors" in r) throw new Error(r.errors.join(";"));
  return r.profile;
}

describe("profil actif (T89)", () => {
  it("capacité absente : élément masqué, startMode rabattu", () => {
    const p = profileWithDrop();
    const store = createProfileStore(null, [...BUILTIN_PROFILES, p]);
    store.setActive("depot");
    createRoot((dispose) => {
      const a = createActiveProfile(store, NO_CAPS);
      const seen: boolean[] = [];
      createComputed(() => {
        seen.push(visibleItems(a.profile().toolbars[0]!, a.capabilities()).some((i) => i.id === "depot-1"));
      });
      expect(a.profile().id).toBe("depot");
      expect(resolveStartMode(a.profile(), a.capabilities()).mode).toBe("board");
      expect(resolveStartMode(a.profile(), a.capabilities()).fellBack).toBe(true);
      a.setCapabilities({ ...NO_CAPS, dropPaths: true });
      expect(seen).toEqual([false, true]);
      dispose();
    });
  });

  it("choose change le signal et le magasin", () => {
    const store = createProfileStore(null, BUILTIN_PROFILES);
    createRoot((dispose) => {
      const a = createActiveProfile(store, NO_CAPS);
      expect(a.profile().id).toBe("defaut");
      a.choose("simple");
      expect(a.profile().id).toBe("simple");
      expect(store.activeId()).toBe("simple");
      dispose();
    });
  });

  it("choose d'un id inconnu : erreur avalée, profil inchangé", () => {
    const store = createProfileStore(null, BUILTIN_PROFILES);
    createRoot((dispose) => {
      const a = createActiveProfile(store, NO_CAPS);
      a.choose("inconnu");
      expect(a.profile().id).toBe("defaut");
      dispose();
    });
  });
});
