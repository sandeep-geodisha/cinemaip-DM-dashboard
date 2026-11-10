import type { NextRequest } from "next/server";
import { actorOf, handle, jsonBody, removeMember, updateMember } from "@/lib/task-store";

/** Edits a team member: any of { name, role, email }. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/members/[id]">) {
  const { id } = await ctx.params;
  return handle(async () => updateMember(id, await jsonBody(req), actorOf(req)));
}

/** Removes a team member; their tasks become unassigned. */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/members/[id]">) {
  const { id } = await ctx.params;
  return handle(() => removeMember(id, actorOf(req)));
}
