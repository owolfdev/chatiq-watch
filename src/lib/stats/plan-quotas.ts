export type PlanId = "free" | "pro" | "team" | "enterprise" | "admin";

/** Mirrors chatiq plan limits — messages = OpenAI API calls / month. */
export const PLAN_MESSAGE_LIMITS: Record<PlanId, number | null> = {
  free: 200,
  pro: 5000,
  team: 20000,
  enterprise: null,
  admin: 100000,
};

export const PLAN_WARNING_RATIO = 0.8;

export function percentUsed(used: number, limit: number | null): number | null {
  if (limit === null || limit <= 0) return null;
  return Math.round((used / limit) * 1000) / 10;
}
