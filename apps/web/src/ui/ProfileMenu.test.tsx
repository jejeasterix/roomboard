// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "../toolbar";
import { ProfileMenu, type ProfileMenuProps } from "./ProfileMenu";

afterEach(cleanup);

const prof = (id: string, label: string) => ({ id, label }) as unknown as Profile;
const LIST = [prof("a", "Alpha"), prof("b", "Beta")];

function menu(over: Partial<ProfileMenuProps> = {}) {
  const props: ProfileMenuProps = {
    profiles: () => LIST,
    activeId: () => "a",
    canResetCurrent: () => true,
    canRemove: () => true,
    choose: vi.fn(),
    edit: vi.fn(),
    importFile: vi.fn(),
    exportActive: vi.fn(),
    resetCurrent: vi.fn(),
    remove: vi.fn(),
    resetAll: vi.fn(),
    ...over,
  };
  return { ...render(() => <ProfileMenu {...props} />), props };
}

describe("ProfileMenu (T92)", () => {
  it("menu avec un menuitemradio par profil", () => {
    const { container } = menu();
    expect(container.querySelector("[data-profiles]")?.getAttribute("role")).toBe("menu");
    const items = container.querySelectorAll("button[role=menuitemradio]");
    expect(items.length).toBe(2);
    expect(items[1]?.textContent).toBe("Beta");
  });

  it("aria-checked sur le profil actif seulement", () => {
    const [id, setId] = createSignal("a");
    const { container } = menu({ activeId: id });
    const chk = (i: string) => container.querySelector(`[data-profile=${i}]`)?.getAttribute("aria-checked");
    expect(chk("a")).toBe("true");
    expect(chk("b")).toBe("false");
    setId("b");
    expect(chk("a")).toBe("false");
    expect(chk("b")).toBe("true");
  });

  it("un clic choisit le profil", () => {
    const { container, props } = menu();
    fireEvent.click(container.querySelector("[data-profile=b]")!);
    expect(props.choose).toHaveBeenCalledWith("b");
  });
});

describe("ProfileMenu — commandes (C1, P22)", () => {
  it("commandes sous les profils, dans l'ordre", () => {
    const { container } = menu();
    const cmds = [...container.querySelectorAll<HTMLButtonElement>("button[data-profile-cmd]")];
    expect(cmds.map((b) => [b.dataset["profileCmd"], b.textContent])).toEqual([
      ["edit", "Modifier…"],
      ["import", "Importer…"],
      ["export", "Exporter…"],
      ["reset", "Remettre à zéro ce profil"],
      ["remove", "Supprimer"],
      ["reset-all", "Tout remettre à zéro"],
    ]);
    expect(cmds.every((b) => b.getAttribute("role") === "menuitem")).toBe(true);
    const lastRadio = container.querySelector("[data-profile=b]")!;
    expect(lastRadio.compareDocumentPosition(cmds[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('[role="separator"]')).not.toBeNull();
  });

  it("livré sans copie : « Remettre à zéro ce profil » grisé ; profil livré : « Supprimer » absent", () => {
    const [can, setCan] = createSignal(false);
    const { container } = menu({ canResetCurrent: can, canRemove: () => false });
    const reset = container.querySelector<HTMLButtonElement>('[data-profile-cmd="reset"]')!;
    expect(reset.disabled).toBe(true);
    setCan(true);
    expect(reset.disabled).toBe(false);
    expect(container.querySelector('[data-profile-cmd="remove"]')).toBeNull();
  });

  it("chaque commande appelle son geste", () => {
    const { container, props } = menu();
    const press = (cmd: string) => fireEvent.click(container.querySelector(`[data-profile-cmd="${cmd}"]`)!);
    press("edit");
    press("import");
    press("export");
    press("reset");
    press("remove");
    press("reset-all");
    for (const f of [props.edit, props.importFile, props.exportActive, props.resetCurrent, props.remove, props.resetAll]) {
      expect(f).toHaveBeenCalledTimes(1);
    }
    expect(props.choose).not.toHaveBeenCalled();
  });
});
