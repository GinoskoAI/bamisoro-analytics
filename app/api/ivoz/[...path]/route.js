// Bamisoro → IvozProvider API bridge.
// Google Apps Script cannot talk to the IvozProvider box (self-signed TLS),
// so this tiny Vercel function proxies /api/* with TLS verification disabled.
// Apps Script sets IVOZ_BASE_URL to this deployment's root.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UPSTREAM = 'https://62.84.182.233';

async function proxy(req, ctx) {
  // Next 15+ passes params as a Promise — handle both shapes
  const p = ctx.params instanceof Promise ? await ctx.params : ctx.params;
  const path = (p && p.path ? p.path : []).join('/');
  const qs = req.nextUrl.search;
  // path arrives as e.g. "api/brand/admin_login" (script base = /api/ivoz)
  const upstreamUrl = `${UPSTREAM}/${path}${qs}`;

  const headers = {};
  const auth = req.headers.get('authorization');
  if (auth) headers.authorization = auth;
  const ct = req.headers.get('content-type');
  if (ct && (ct.startsWith('application/json') || ct.startsWith('application/x-www-form-urlencoded'))) {
    headers['content-type'] = ct;
  }

  let body;
  if (!['GET', 'HEAD'].includes(req.method)) {
    body = Buffer.from(await req.arrayBuffer());
  }

  const upstream = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body,
    redirect: 'manual',
  });

  const data = Buffer.from(await upstream.arrayBuffer());
  const respHeaders = {
    'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
    'access-control-allow-origin': '*',
    'x-debug-path': path || '(empty)',
    'x-upstream-url': upstreamUrl,
  };
  const total = upstream.headers.get('x-total-items');
  if (total) respHeaders['x-total-items'] = total;
  return new Response(data, { status: upstream.status, headers: respHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
