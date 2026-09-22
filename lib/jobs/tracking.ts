import type { JobOffer } from "./types";

export const TRACKING_KEY = "jobpilot-tracked-offers-v1";

export type TrackingStatus = "favorite" | "applied";

export type TrackedOffer = {
  offer: JobOffer;
  status: TrackingStatus;
  savedAt: string;
};

export function parseTrackedOffers(raw: string | null): TrackedOffer[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is TrackedOffer => {
      if (!item || typeof item !== "object") return false;
      const tracked = item as Partial<TrackedOffer>;
      return Boolean(
        tracked.offer?.id &&
        (tracked.status === "favorite" || tracked.status === "applied") &&
        typeof tracked.savedAt === "string",
      );
    });
  } catch {
    return [];
  }
}

