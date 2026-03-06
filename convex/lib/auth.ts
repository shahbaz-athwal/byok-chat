import { ConvexError } from "convex/values";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";

export async function requireAuth(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const user = await authComponent.getAuthUser(ctx);
  if (!user) {
    throw new ConvexError("Not authenticated");
  }
  return { userId: String(user._id), user };
}
