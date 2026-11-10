import type { NextRequest } from "next/server";
import { handle, restoreTask } from "@/lib/task-store";

/** Puts a removed task back on the board. */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/tasks/[id]/restore">) {
  const { id } = await ctx.params;
  return handle(() => restoreTask(decodeURIComponent(id)));
}
