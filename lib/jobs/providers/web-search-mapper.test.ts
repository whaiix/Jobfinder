import { describe, expect, it } from "vitest";
import { mapWebSearchResult, parseWebDate } from "./web-search-mapper";

describe("web search mapper", () => {
  it("parses a relative French date", () => {
    expect(parseWebDate("Il y a 2 jours", new Date("2026-09-22T12:00:00Z"))).toBe("2026-09-20T12:00:00.000Z");
  });

  it("rejects a result without a verifiable publication date", () => {
    expect(mapWebSearchResult({ title: "Webmaster", link: "https://example.com/job" })).toBeNull();
  });
});
