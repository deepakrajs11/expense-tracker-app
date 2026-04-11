import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  return Response.json({ user });
}

