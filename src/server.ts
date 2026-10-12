import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// As fotos e o logo iniciais sao assets do Lovable (/__l5e/assets-v1/...), que so
// existem nos dominios do Lovable. Fora dele (Vercel), buscamos no preview do projeto
// e deixamos o CDN guardar em cache. LOVABLE_ASSETS_ORIGIN troca o endereco se preciso.
const LOVABLE_PROJECT_ID = "6f5208d0-4d08-4f67-af2c-0e6223864c2c";
const LOVABLE_ASSETS_PREFIX = "/__l5e/assets-v1/";

async function proxyLovableAsset(request: Request, url: URL): Promise<Response> {
  const origin =
    process.env["LOVABLE_ASSETS_ORIGIN"]?.trim() ||
    `https://id-preview--${LOVABLE_PROJECT_ID}.lovable.app`;
  const upstream = await fetch(new URL(url.pathname, origin), {
    method: request.method,
    headers: { accept: request.headers.get("accept") ?? "*/*" },
  });
  const headers = new Headers();
  for (const name of ["content-type", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (upstream.ok)
    headers.set("cache-control", "public, max-age=86400, s-maxage=31536000, immutable");
  return new Response(upstream.body, { status: upstream.status, headers });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    if (
      url.pathname.startsWith(LOVABLE_ASSETS_PREFIX) &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      try {
        return await proxyLovableAsset(request, url);
      } catch (error) {
        console.error(error);
        return new Response(null, { status: 502 });
      }
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
