// An absolute instant: January 9, 2026, 00:01 in Colombia (UTC-05:00).
// Recompute from the clock so reloads, sleep and server restarts never reset it.
export const RELATIONSHIP_START = "2026-01-09T00:01:00-05:00";
export const RELATIONSHIP_START_MS = Date.parse(RELATIONSHIP_START);

export function timeTogether(now = Date.now()) {
  const totalSeconds = Math.max(
    0,
    Math.floor((now - RELATIONSHIP_START_MS) / 1000),
  );

  return {
    totalSeconds,
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor(totalSeconds / 3600) % 24,
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
  };
}
