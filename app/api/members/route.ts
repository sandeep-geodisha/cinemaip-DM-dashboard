import { actorOf, addMember, handle, jsonBody } from "@/lib/task-store";

/** Adds a team member: { name, role?, email? }. */
export async function POST(req: Request) {
  return handle(async () => addMember(await jsonBody(req), actorOf(req)));
}
