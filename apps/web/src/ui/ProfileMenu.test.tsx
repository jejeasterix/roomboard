// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "../toolbar";
import { ProfileMenu } from "./ProfileMenu";

afterEach(cleanup);

const prof = (id: string, label: string) => ({ id, label }) as unknown as Profile;
const LIST = [prof("a", "Alpha"), prof("b", "Beta")];

describe("ProfileMenu (T92)", () => {
  it("menu avec un menuitemradio par profil", () => {
    const { container } = render(() => <ProfileMenu profiles={() => LIST} activeId={() => "a"} choose={() => {}} />);
    expect(container.querySelector("[data-profiles]")?.getAttribute("role")).toBe("menu");
    const items = container.querySelectorAll("button[role=menuitemradio]");
    expect(items.length).toBe(2);
    expect(items[1]?.textContent).toBe("Beta");
  });

  it("aria-checked sur le profil actif seulement", () => {
    const [id, setId] = createSignal("a");
    const { container } = render(() => <ProfileMenu profiles={() => LIST} activeId={id} choose={() => {}} />);
    const chk = (i: string) => container.querySelector(`[data-profile=${i}]`)?.getAttribute("aria-checked");
    expect(chk("a")).toBe("true");
    expect(chk("b")).toBe("false");
    setId("b");
    expect(chk("a")).toBe("false");
    expect(chk("b")).toBe("true");
  });

  it("un clic choisit le profil", () => {
    const choose = vi.fn();
    const { container } = render(() => <ProfileMenu profiles={() => LIST} activeId={() => "a"} choose={choose} />);
    fireEvent.click(container.querySelector("[data-profile=b]")!);
    expect(choose).toHaveBeenCalledWith("b");
  });
});
