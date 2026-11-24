import { describe, expect, it } from "vitest";
import { OfficeConvertError, officeErrorCode } from "./office-import";

describe("officeErrorCode (OF13, D8)", () => {
  it("code d'un OfficeConvertError, sinon failed", () => {
    expect(officeErrorCode(new OfficeConvertError("no-program"))).toBe("no-program");
    expect(officeErrorCode(new OfficeConvertError("timeout"))).toBe("timeout");
    expect(officeErrorCode(new Error("no-program"))).toBe("failed");
    expect(officeErrorCode("no-program")).toBe("failed");
    expect(officeErrorCode(undefined)).toBe("failed");
  });
});
