/**
 * Cloudflare Pages Function — verifies admin password server-side.
 * The secret ADMIN_PASSWORD must be set in Cloudflare Pages > Settings > Environment variables (Secret type).
 */

interface Env {
  ADMIN_PASSWORD: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as { email?: string; password?: string };
    const expected = context.env.ADMIN_PASSWORD;

    if (!expected) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Server misconfigured — ADMIN_PASSWORD not set.' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const ok = body.email === 'franck@recorp.co' && body.password === expected;

    return new Response(
      JSON.stringify({ ok }),
      { status: ok ? 200 : 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid request' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
};
