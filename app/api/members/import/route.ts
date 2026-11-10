import { actorOf, anyJson, handle, importMembers } from "@/lib/task-store";

/**
 * Adds people from JSON: [{ "name", "role", "email" }], or { "team": [...] }.
 * Existing people (matched by email, then name) get a missing role or email filled in.
 */
export async function POST(req: Request) {
  return handle(async () => importMembers(await anyJson(req), actorOf(req)));
}
