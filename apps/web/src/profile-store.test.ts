import { describe, expect, it } from "vitest";
import { MAX_JSON_DEPTH } from "./json-depth";
import { ACTIVE_KEY, PROFILES_KEY, browserKeyValue, createProfileStore, type KeyValue } from "./profile-store";
import { parseProfile, serializeProfile } from "./toolbar";
import { BUILTIN_PROFILES, DEFAULT_PROFILE_JSON } from "./toolbar-profiles";

function fakeKv(): KeyValue & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const userJson = (id: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  ...DEFAULT_PROFILE_JSON,
  id,
  label: `Profil ${id}`,
  ...extra,
});

function userProfile(id: string, extra: Record<string, unknown> = {}) {
  const store = createProfileStore(null, BUILTIN_PROFILES);
  const kv = fakeKv();
  kv.setItem(PROFILES_KEY, JSON.stringify([userJson(id, extra)]));
  void store;
  return { kv, p: createProfileStore(kv, BUILTIN_PROFILES).get(id)! };
}

describe("ProfileStore (T89)", () => {
  it("copie de defaut lue au démarrage", () => {
    const kv = fakeKv();
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    const d = s.get("defaut")!;
    s.save({ ...d, interface: { ...d.interface, buttonSize: "s" } });
    expect(s.list().map((p) => p.id)).toEqual(["defaut", "simple", "annotation"]);
    expect(s.list()[0]!.interface.buttonSize).toBe("s");
    expect(s.get("defaut")!.label).toBe("Par défaut");
    expect(s.hasOverride("defaut")).toBe(true);
    expect(s.isBuiltin("defaut")).toBe(true);
    const again = createProfileStore(kv, BUILTIN_PROFILES);
    expect(again.get("defaut")!.interface.buttonSize).toBe("s");
    expect(again.warnings()).toEqual([]);
  });

  it("revenir à l'origine rend le livré", () => {
    const kv = fakeKv();
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    const d = s.get("defaut")!;
    s.save({ ...d, interface: { ...d.interface, buttonSize: "s" } });
    expect(() => s.remove("defaut")).toThrow("profil livré : defaut");
    s.revert("defaut");
    expect(s.get("defaut")).toBe(BUILTIN_PROFILES[0]);
    expect(s.hasOverride("defaut")).toBe(false);
    expect(JSON.parse(kv.map.get(PROFILES_KEY)!)).toEqual([]);
    s.revert("defaut"); // sans copie : rien
    expect(s.get("defaut")).toBe(BUILTIN_PROFILES[0]);
  });

  it("copie de simple : revert la retire, simple revient", () => {
    const s = createProfileStore(fakeKv(), BUILTIN_PROFILES);
    s.save({ ...s.get("simple")!, label: "Ma copie" });
    expect(s.get("simple")!.label).toBe("Ma copie");
    s.revert("simple");
    expect(s.get("simple")).toBe(BUILTIN_PROFILES[1]);
  });

  it("copie de simple enregistrée après un profil perso : à la place de simple, avant perso", () => {
    const kv = fakeKv();
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    s.save({ ...s.get("defaut")!, id: "perso", label: "Perso" });
    s.save({ ...s.get("simple")!, label: "Ma copie" });
    const order = ["defaut", "simple", "annotation", "perso"];
    expect(s.list().map((p) => p.id)).toEqual(order);
    expect(s.list()[1]!.label).toBe("Ma copie");
    expect(createProfileStore(kv, BUILTIN_PROFILES).list().map((p) => p.id)).toEqual(order);
  });

  it("revert d'un id non livré : lève ; isBuiltin faux", () => {
    const s = createProfileStore(fakeKv(), BUILTIN_PROFILES);
    s.save({ ...s.get("defaut")!, id: "perso", label: "Perso" });
    expect(s.isBuiltin("perso")).toBe(false);
    expect(s.hasOverride("perso")).toBe(false);
    expect(() => s.revert("perso")).toThrow("profil non livré : perso");
  });

  it("tout remettre à zéro : profils, copies et actif effacés", () => {
    const kv = fakeKv();
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    s.save({ ...s.get("defaut")!, id: "perso", label: "Perso" });
    s.save({ ...s.get("simple")!, label: "Ma copie" });
    s.setActive("perso");
    s.resetAll();
    expect(s.list()).toEqual(BUILTIN_PROFILES);
    expect(s.activeId()).toBe("defaut");
    expect(kv.map.has(PROFILES_KEY)).toBe(false);
    expect(kv.map.has(ACTIVE_KEY)).toBe(false);
    expect(createProfileStore(kv, BUILTIN_PROFILES).get("perso")).toBeNull();
  });

  it("tout remettre à zéro, stockage qui lève : mémoire vidée, avertissement, aucune exception", () => {
    const kv: KeyValue = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => {
        throw new Error("SecurityError");
      },
    };
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    s.save({ ...s.get("defaut")!, id: "perso", label: "Perso" });
    expect(() => s.resetAll()).not.toThrow();
    expect(s.get("perso")).toBeNull();
    expect(s.warnings().some((w) => w.startsWith("stockage non effacé"))).toBe(true);
  });

  it("sans stockage : defaut actif, utilisable", () => {
    const s = createProfileStore(null, BUILTIN_PROFILES);
    expect(s.activeId()).toBe("defaut");
    expect(s.list().length).toBe(BUILTIN_PROFILES.length);
  });

  it("choix gardé", () => {
    const kv = fakeKv();
    createProfileStore(kv, BUILTIN_PROFILES).setActive("simple");
    expect(kv.map.get(ACTIVE_KEY)).toBe("simple");
    expect(createProfileStore(kv, BUILTIN_PROFILES).activeId()).toBe("simple");
  });

  it("profil utilisateur : enregistré, relu, clés inconnues gardées", () => {
    const { p } = userProfile("perso", { futur: { a: 1 } });
    const kv = fakeKv();
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    s.save(p);
    expect(s.isBuiltin("perso")).toBe(false);
    const again = createProfileStore(kv, BUILTIN_PROFILES);
    expect(again.get("perso")).toEqual(p);
    expect(again.list().map((x) => x.id)).toEqual(["defaut", "simple", "annotation", "perso"]);
    expect(kv.map.get(PROFILES_KEY)).toContain('"futur"');
    expect(JSON.parse(kv.map.get(PROFILES_KEY)!)).toEqual([serializeProfile(p)]);
    again.remove("perso");
    expect(createProfileStore(kv, BUILTIN_PROFILES).get("perso")).toBeNull();
  });

  it("stockage illisible", () => {
    const kv = fakeKv();
    kv.setItem(PROFILES_KEY, "{pas du json");
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    expect(s.list()).toEqual(BUILTIN_PROFILES);
    expect(s.warnings().length).toBeGreaterThan(0);
  });

  it("profil stocké d'une majeure supérieure : écarté avec avertissement, les autres gardés", () => {
    const kv = fakeKv();
    kv.setItem(PROFILES_KEY, JSON.stringify([userJson("futur", { schema: 99 }), userJson("ok")]));
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    expect(s.get("futur")).toBeNull();
    expect(s.get("ok")).not.toBeNull();
    expect(s.warnings().length).toBeGreaterThan(0);
  });

  it("profil livré présent dans le stockage : copie lue, à la place du livré", () => {
    const kv = fakeKv();
    kv.setItem(PROFILES_KEY, JSON.stringify([userJson("defaut", { label: "Pirate" })]));
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    expect(s.get("defaut")!.label).toBe("Pirate");
    expect(s.list()[0]!.label).toBe("Pirate");
    expect(s.list()).toHaveLength(BUILTIN_PROFILES.length);
    expect(s.warnings()).toEqual([]);
  });

  it("actif inconnu", () => {
    const kv = fakeKv();
    kv.setItem(ACTIVE_KEY, "disparu");
    expect(createProfileStore(kv, BUILTIN_PROFILES).activeId()).toBe("defaut");
  });

  it("stockage qui lève : le choix reste en mémoire, avertissement", () => {
    const kv: KeyValue = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
    };
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    s.setActive("simple");
    expect(s.activeId()).toBe("simple");
    expect(s.warnings().length).toBeGreaterThan(0);
  });

  it("setActive rend faux quand l'écriture échoue, vrai sinon", () => {
    const kv: KeyValue = { getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); }, removeItem: () => {} };
    expect(createProfileStore(kv, BUILTIN_PROFILES).setActive("simple")).toBe(false);
    expect(createProfileStore(fakeKv(), BUILTIN_PROFILES).setActive("simple")).toBe(true);
  });

  it("resetAll rend faux quand l'effacement échoue, vrai sinon", () => {
    const kv: KeyValue = { getItem: () => null, setItem: () => undefined, removeItem: () => { throw new Error("SecurityError"); } };
    expect(createProfileStore(kv, BUILTIN_PROFILES).resetAll()).toBe(false);
    expect(createProfileStore(fakeKv(), BUILTIN_PROFILES).resetAll()).toBe(true);
  });

  it("setActive inconnu lève", () => {
    expect(() => createProfileStore(null, BUILTIN_PROFILES).setActive("inconnu")).toThrow("profil inconnu : inconnu");
  });

  it("browserKeyValue : null si l'accès lève ou si absent", () => {
    const kv = fakeKv();
    expect(browserKeyValue({ localStorage: kv as unknown as Storage })).toBe(kv);
    expect(browserKeyValue({})).toBeNull();
    const w = {
      get localStorage(): Storage {
        throw new Error("SecurityError");
      },
    };
    expect(browserKeyValue(w)).toBeNull();
  });
});

describe("magasin : écriture refusée (T11)", () => {
  const quotaKv = (): KeyValue => ({
    getItem: () => null,
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: () => {},
  });
  const user = (id: string) => {
    const r = parseProfile(userJson(id));
    if ("errors" in r) throw new Error(r.errors.join());
    return r.profile;
  };

  it("save : lève et la mémoire reste inchangée", () => {
    const s = createProfileStore(quotaKv(), BUILTIN_PROFILES);
    expect(() => s.save(user("neuf"))).toThrow("QuotaExceededError");
    expect(s.get("neuf")).toBeNull();
  });

  it("remove et revert : lèvent et gardent le profil", () => {
    const kv = quotaKv();
    kv.getItem = (k) => (k === PROFILES_KEY ? JSON.stringify([userJson("ancien"), userJson("simple")]) : null);
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    expect(() => s.remove("ancien")).toThrow("QuotaExceededError");
    expect(s.get("ancien")).not.toBeNull();
    expect(() => s.revert("simple")).toThrow("QuotaExceededError");
    expect(s.hasOverride("simple")).toBe(true);
  });

  it("OG45 : un profil d'exactement MAX_JSON_DEPTH niveaux s'enregistre et se recharge", () => {
    const kv = fakeKv();
    let deep: unknown = 1;
    for (let i = 0; i < MAX_JSON_DEPTH - 1; i++) deep = [deep];
    createProfileStore(kv, BUILTIN_PROFILES).save({ ...user("limite"), rest: { x: deep } });
    expect(createProfileStore(kv, BUILTIN_PROFILES).get("limite")).not.toBeNull();
  });

  it("chargement : profil stocké au-delà de MAX_JSON_DEPTH (OG45) écarté avec un avertissement, les autres gardés", () => {
    const kv = fakeKv();
    let deep: unknown = 1;
    for (let i = 0; i < MAX_JSON_DEPTH; i++) deep = [deep];
    kv.setItem(PROFILES_KEY, JSON.stringify([userJson("profond", { x: deep }), userJson("ok")]));
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    expect(s.get("profond")).toBeNull();
    expect(s.get("ok")).not.toBeNull();
    expect(s.warnings()).toContain(`profil stocké écarté : profil : plus de ${MAX_JSON_DEPTH} niveaux d'imbrication`);
  });

  it("save : imbrication au-delà de MAX_JSON_DEPTH (OG45) : lève avant JSON.stringify, magasin utilisable ensuite", () => {
    const kv = fakeKv();
    const s = createProfileStore(kv, BUILTIN_PROFILES);
    let deep: unknown = 1;
    for (let i = 0; i < 50000; i++) deep = [deep];
    const hostile = { ...user("hostile"), rest: { x: deep } };
    expect(() => s.save(hostile)).toThrow(new RangeError(`profil hostile trop imbriqué (plus de ${MAX_JSON_DEPTH} niveaux)`));
    expect(s.get("hostile")).toBeNull();
    expect(kv.map.has(PROFILES_KEY)).toBe(false);
    s.save(user("sain"));
    expect(s.get("sain")).not.toBeNull();
  });
});
