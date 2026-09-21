import { describe, expect, it } from "vitest";
import { analyzeProfile } from "./analyze-profile";

describe("profile recommendations", () => {
  it("surfaces webmaster and digital communication from transferable skills", () => {
    const result = analyzeProfile("WordPress, SEO, HTML, CSS, Google Analytics, communication et réseaux sociaux");
    expect(result.recommendations[0]?.title).toBe("Webmaster & Chargé de Communication Digitale");
  });
});
