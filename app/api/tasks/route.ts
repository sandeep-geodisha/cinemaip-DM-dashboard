import { createTask, handle, jsonBody, readBoard } from "@/lib/task-store";

export const dynamic = "force-dynamic";

/** The whole board: members, task state and custom tasks. */
export async function GET() {
  return handle(readBoard);
}

/** Creates a custom task. */
export async function POST(req: Request) {
  return handle(async () => createTask(await jsonBody(req)));
}
