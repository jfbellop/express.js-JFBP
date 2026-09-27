import 'dotenv/config';

// ============================================================================
// PRUEBA AUTOMÁTICA — Ejercicio 02: Refresh Tokens con Rotación
// ============================================================================
// Uso:  Terminal A → pnpm dev     |     Terminal B → pnpm test:flow
// ============================================================================

const BASE_URL = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}/api/v1`;

const jar = new Map<string, string>();

function cookieHeader(): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function absorb(setCookies: string[]): void {
  for (const raw of setCookies) {
    const pair = raw.split(';')[0] ?? '';
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1);
    if (!value) jar.delete(name);
    else jar.set(name, value);
  }
}

async function call(
  method: string,
  path: string,
  opts: { body?: unknown; withCookies?: boolean; rawCookie?: string } = {},
): Promise<{ status: number; body: any; setCookies: string[] }> {
  const { body, withCookies = true, rawCookie } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (rawCookie) headers['Cookie'] = rawCookie;
  else if (withCookies && jar.size > 0) headers['Cookie'] = cookieHeader();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const setCookies = res.headers.getSetCookie();
  if (withCookies && !rawCookie) absorb(setCookies);

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed, setCookies };
}

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main(): Promise<void> {
  const stamp = Date.now();
  const email = `qa.${stamp}@test.com`;
  const password = 'Test1234!';

  console.log('═'.repeat(70));
  console.log(`  Ejercicio 02 — Refresh Tokens con rotación  (${BASE_URL})`);
  console.log('═'.repeat(70));

  console.log('\n1. Registro y login');
  const reg = await call('POST', '/auth/register', {
    body: { email, password, name: 'Test User' },
  });
  check('POST /auth/register → 201', reg.status === 201, `status=${reg.status}`);
  check(
    'La respuesta no expone password ni refreshToken',
    !JSON.stringify(reg.body).includes('password') &&
      !JSON.stringify(reg.body).includes('refreshToken'),
  );

  const login = await call('POST', '/auth/login', { body: { email, password } });
  check('POST /auth/login → 200', login.status === 200, `status=${login.status}`);

  const accessCookie = login.setCookies.find((c) => c.startsWith('accessToken='));
  const refreshCookie = login.setCookies.find((c) => c.startsWith('refreshToken='));
  check('Set-Cookie accessToken + refreshToken', Boolean(accessCookie && refreshCookie));
  check('accessToken es HttpOnly', /HttpOnly/i.test(accessCookie ?? ''));
  check('refreshToken es HttpOnly', /HttpOnly/i.test(refreshCookie ?? ''));
  check(
    'refreshToken limitado a Path=/api/v1/auth',
    /Path=\/api\/v1\/auth/i.test(refreshCookie ?? ''),
  );
  check(
    'Max-Age del access ≈ 15 min y del refresh ≈ 7 días',
    /Max-Age=900\b/.test(accessCookie ?? '') && /Max-Age=604800\b/.test(refreshCookie ?? ''),
    `${(accessCookie ?? '').match(/Max-Age=\d+/)?.[0]} / ${(refreshCookie ?? '').match(/Max-Age=\d+/)?.[0]}`,
  );

  console.log('\n2. Rotación de refresh token');
  const oldRefresh = jar.get('refreshToken') ?? '';
  const oldAccess = jar.get('accessToken') ?? '';
  const refreshed = await call('POST', '/auth/refresh');
  check('POST /auth/refresh → 200', refreshed.status === 200, `status=${refreshed.status}`);
  const newRefresh = jar.get('refreshToken') ?? '';
  const newAccess = jar.get('accessToken') ?? '';
  check('Se emitió un refresh token NUEVO', Boolean(newRefresh) && newRefresh !== oldRefresh);
  check('Se emitió un access token NUEVO', Boolean(newAccess) && newAccess !== oldAccess);
  check(
    'Los dos tokens usan secretos distintos (firmas distintas)',
    newAccess.split('.')[2] !== newRefresh.split('.')[2],
  );

  const meAfter = await call('GET', '/auth/me');
  check('El nuevo access token funciona en /auth/me → 200', meAfter.status === 200);

  const replay = await call('POST', '/auth/refresh', {
    rawCookie: `refreshToken=${oldRefresh}`,
  });
  check(
    'Reutilizar el refresh token viejo → 401',
    replay.status === 401,
    `status=${replay.status}`,
  );

  const sinCookie = await call('POST', '/auth/refresh', { withCookies: false });
  check('Refresh sin cookie → 401', sinCookie.status === 401, `status=${sinCookie.status}`);

  console.log('\n3. Logout');
  const refreshBeforeLogout = jar.get('refreshToken') ?? '';
  const logout = await call('POST', '/auth/logout');
  check('POST /auth/logout → 200', logout.status === 200, `status=${logout.status}`);
  check(
    'La respuesta limpia ambas cookies',
    logout.setCookies.filter((c) => /^(accessToken|refreshToken)=;/.test(c)).length === 2,
    logout.setCookies.join(' | '),
  );
  check('El cookie jar quedó vacío', jar.size === 0, `cookies=${jar.size}`);

  const refreshAfterLogout = await call('POST', '/auth/refresh', {
    rawCookie: `refreshToken=${refreshBeforeLogout}`,
  });
  check(
    'Refresh después del logout → 401 (hash borrado en DB)',
    refreshAfterLogout.status === 401,
    `status=${refreshAfterLogout.status}`,
  );

  const meAfterLogout = await call('GET', '/auth/me', { withCookies: false });
  check('GET /auth/me sin cookies → 401', meAfterLogout.status === 401);

  console.log('\n' + '═'.repeat(70));
  console.log(`  RESULTADO: ${passed} OK, ${failed} fallidas`);
  console.log('═'.repeat(70) + '\n');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error('\n❌ Error ejecutando la prueba:', err);
  console.error('   ¿Está corriendo el servidor? → pnpm dev\n');
  process.exit(1);
});
