export const CONSULTANT_FREE_ACCESS_END_AT = new Date("2026-07-01T00:00:00.000Z");
export const CONSULTANT_FREE_ACCESS_END_LABEL = "June 30, 2026";

export function isConsultantFreeAccessActive(now: Date = new Date()): boolean {
  return now.getTime() < CONSULTANT_FREE_ACCESS_END_AT.getTime();
}
