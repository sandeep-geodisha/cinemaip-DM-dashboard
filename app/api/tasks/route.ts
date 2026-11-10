import type { NextRequest } from "next/server";
import { actorOf, createTask, handle, jsonBody, readBoard } from "@/lib/task-store";

export const dynamic = "force-dynamic";

/**
 * The whole board: team, tasks and recent activity.
 * Pass ?etag=<etag from the last response> to get 204 when nothing changed.
 */
export async function GET(req: NextRequest) {
  const etag = req.nextUrl.searchParams.get("etag");
  try {
    const board = await readBoard(etag);
    if (!board) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    return Response.json(board, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return handle(() => Promise.reject(e));
  }
}

/** Creates a custom task. */
export async function POST(req: Request) {
  return handle(async () => createTask(await jsonBody(req), actorOf(req)));
}
