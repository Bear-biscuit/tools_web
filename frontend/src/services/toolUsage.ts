import type { ToolId } from "../components/toolCatalog";
import { getApiUrl, getStoredSession, type AuthSession } from "./auth";

export async function reportToolUsage(
  toolId: ToolId,
  session: AuthSession | null = getStoredSession(),
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  try {
    await fetch(getApiUrl("/api/tools/usage"), {
      method: "POST",
      headers,
      body: JSON.stringify({ toolId }),
      keepalive: true,
    });
  } catch {
    // Usage reporting must never interrupt the tool operation.
  }
}
