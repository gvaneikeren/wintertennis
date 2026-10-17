import fs from "node:fs";
import path from "node:path";
import type { APIRequestContext } from "@playwright/test";

type ActionRef = { id: string; route: string };

/** Turns a Next app-router worker key into a URL path. */
function appRouteToUrl(key: string, params: { fixtureId: string }): string {
  if (key === "app/page") return "/";
  let p = key.replace(/^app\//, "").replace(/\/page$/, "");
  p = p.replace("[id]", params.fixtureId).replace("[token]", "x");
  return "/" + p;
}

/**
 * Reads Next's server-reference manifest and maps each action's exported name to its
 * action id and a URL that hosts it. The manifest on disk matches the running server,
 * so this stays correct across rebuilds without hard-coding ids.
 */
export function loadActions(params: { fixtureId: string }): Record<string, ActionRef> {
  const file = path.join(process.cwd(), ".next/server/server-reference-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  const out: Record<string, ActionRef> = {};
  for (const [id, v] of Object.entries<Record<string, unknown>>(manifest.node ?? {})) {
    const name = v.exportedName as string | undefined;
    const filename = (v.filename as string | undefined) ?? "";
    const workers = Object.keys((v.workers as Record<string, unknown>) ?? {}).filter((w) => !w.includes("_not-found"));
    if (!name || workers.length === 0) continue;
    // Pick a route that hosts the action and resolves to a real page, by the action's source file.
    const hint = filename.includes("team")
      ? "team"
      : filename.includes("admin")
        ? "admin"
        : filename.includes("score")
          ? "fixtures"
          : "page";
    const own = workers.find((w) => w.includes(hint)) ?? workers[0];
    out[name] = { id, route: appRouteToUrl(own, params) };
  }
  return out;
}

export type CallResult = { ok: boolean; error?: string; raw: string };

/** Invokes a server action over HTTP using the browser context's cookies. */
export async function callAction(
  request: APIRequestContext,
  actions: Record<string, ActionRef>,
  name: string,
  args: unknown[],
): Promise<CallResult> {
  const a = actions[name];
  if (!a) throw new Error(`Unknown action ${name}; rebuild may have changed the manifest`);
  const res = await request.post(a.route, {
    headers: { "content-type": "application/json", "next-action": a.id },
    data: JSON.stringify(args),
  });
  const raw = await res.text();
  const m = raw.match(/"ok":(true|false)(?:,"error":"([^"]*)")?/);
  if (!m) return { ok: false, raw: raw.slice(0, 200) };
  return { ok: m[1] === "true", error: m[2], raw: raw.slice(0, 200) };
}
