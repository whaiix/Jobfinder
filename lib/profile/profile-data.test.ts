import { describe, expect, it } from "vitest";
import { inferContactDetails, parseStoredProfile } from "./profile-data";

describe("profile data", () => {
  it("extracts editable contact details from a CV", () => {
    const result = inferContactDetails("Hugo Georges\nhugo@example.com\n06 12 34 56 78\nCompétences");
    expect(result).toEqual({ firstName: "Hugo", lastName: "Georges", email: "hugo@example.com", phone: "06 12 34 56 78" });
  });

  it("supports the legacy plain-text profile", () => {
    expect(parseStoredProfile("WordPress SEO").cvText).toBe("WordPress SEO");
  });
});
