/**
 * Cloudflare Pages Function — verifies admin credentials server-side.
 * Required secrets in Cloudflare Pages > Settings > Environment variables:
 *   ADMIN_PASSWORD — the admin password
 *   ADMIN_EMAIL    — the admin email (defaults to franck@recorp.co if not set)
 */

interface Env {
  ADMIN_PASSWORD: string;
  ADMIN_EMAIL?: string;
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
    const expectedPassword = context.env.ADMIN_PASSWORD;
    const expectedEmail = context.env.ADMIN_EMAIL || 'franck@recorp.co';

    if (!expectedPassword) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Server misconfigured — ADMIN_PASSWORD not set.' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const ok = body.email === expectedEmail && body.password === expectedPassword;

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
