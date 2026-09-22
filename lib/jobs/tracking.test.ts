import { describe, expect, it } from "vitest";
import { parseTrackedOffers } from "./tracking";

describe("tracked offers storage", () => {
  it("ignores malformed browser data", () => {
    expect(parseTrackedOffers("not-json")).toEqual([]);
    expect(parseTrackedOffers(JSON.stringify([{ status: "favorite" }]))).toEqual([]);
  });

  it("keeps valid favorites and applications", () => {
    const value = [{
      status: "applied",
      savedAt: "2026-09-22T10:00:00.000Z",
      offer: { id: "offer-1", title: "Webmaster" },
    }];
    expect(parseTrackedOffers(JSON.stringify(value))).toEqual(value);
  });
});
