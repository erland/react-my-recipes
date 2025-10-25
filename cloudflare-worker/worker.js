/**
 * Cloudflare Worker: Google OAuth token bridge
 *
 * Routes:
 *   POST /oauth/exchange
 *     body: { code: string, redirect_uri: string }
 *
 *   POST /oauth/refresh
 *     body: { refresh_token: string }
 *
 * Env bindings configured in wrangler:
 *   GOOGLE_CLIENT_ID       (not secret, but still added in config)
 *   GOOGLE_CLIENT_SECRET   (sensitive)
 */

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

async function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function handleExchange(env, req) {
  const { code, redirect_uri } = await req.json();

  if (!code || !redirect_uri) {
    return jsonResponse(400, { error: "missing code or redirect_uri" });
  }

  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    grant_type: "authorization_code",
    redirect_uri,
  });

  const googleResp = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await googleResp.json();
  return jsonResponse(googleResp.status, data);
}

async function handleRefresh(env, req) {
  const { refresh_token } = await req.json();

  if (!refresh_token) {
    return jsonResponse(400, { error: "missing refresh_token" });
  }

  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token,
  });

  const googleResp = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await googleResp.json();
  return jsonResponse(googleResp.status, data);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // POST /oauth/exchange
    if (req.method === "POST" && url.pathname === "/oauth/exchange") {
      const resp = await handleExchange(env, req);
      return new Response(resp.body, {
        status: resp.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    // POST /oauth/refresh
    if (req.method === "POST" && url.pathname === "/oauth/refresh") {
      const resp = await handleRefresh(env, req);
      return new Response(resp.body, {
        status: resp.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    return jsonResponse(404, { error: "not found" });
  },
};