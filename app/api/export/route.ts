import { exportBoard, handle } from "@/lib/task-store";

export const dynamic = "force-dynamic";

/** Downloads the whole board file (team, tasks and full activity log). */
export async function GET() {
  try {
    const board = await exportBoard();
    const day = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(board, null, 2) + "\n", {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="cinemaip-board-${day}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return handle(() => Promise.reject(e));
  }
}
