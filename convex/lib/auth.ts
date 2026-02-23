import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.getAuthUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return { userId: String(user._id), user };
}
