import type { NextRequest } from "next/server";
import { actorOf, deleteTaskForever, handle, jsonBody, removeTask, updateTask } from "@/lib/task-store";

/** Updates any of: title, summary, description, assigneeId, status, priority, due, notes, pillar (custom tasks). */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/tasks/[id]">) {
  const { id } = await ctx.params;
  return handle(async () => updateTask(decodeURIComponent(id), await jsonBody(req), actorOf(req)));
}

/**
 * Removes a task from the board (restorable).
 * With ?permanent=1, permanently deletes a custom task.
 */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/tasks/[id]">) {
  const { id } = await ctx.params;
  const taskId = decodeURIComponent(id);
  const permanent = req.nextUrl.searchParams.get("permanent") === "1";
  return handle(() => (permanent ? deleteTaskForever(taskId, actorOf(req)) : removeTask(taskId, actorOf(req))));
}
